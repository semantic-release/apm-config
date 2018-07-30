import path from 'path';
import test from 'ava';
import {writeJson, readJson, ensureSymlink} from 'fs-extra';
import {stub} from 'sinon';
import execa from 'execa';
import tempy from 'tempy';
import which from 'which';
import stripAnsi from 'strip-ansi';
import semanticRelease from 'semantic-release';
import {gitCommitedFiles, gitGetCommit} from './helpers/git-utils';
import mockServer from './helpers/mockserver';
import gitbox from './helpers/gitbox';

/* eslint camelcase: ["error", {properties: "never"}] */

// Save the current process.env
const envBackup = Object.assign({}, process.env);
// Save the current working diretory
const cwd = process.cwd();

const apmConfig = require.resolve('..');

test.before(async () => {
  // Start the local Git server
  await gitbox.start();
  // Start Mock Server
  await mockServer.start();
});

test.beforeEach(t => {
  t.context.logs = '';
  t.context.stdout = stub(process.stdout, 'write').callsFake(val => {
    t.context.logs += stripAnsi(val.toString());
  });
  t.context.sdterr = stub(process.stderr, 'write').callsFake(val => {
    t.context.error += stripAnsi(val.toString());
  });

  process.env.TRAVIS = 'true';
  process.env.CI = 'true';
  process.env.TRAVIS_BRANCH = 'master';
  process.env.TRAVIS_PULL_REQUEST = 'false';
});

test.afterEach.always(t => {
  // Restore process.env
  process.env = envBackup;
  // Restore the current working directory
  process.chdir(cwd);
  t.context.stdout.restore();
  t.context.sdterr.restore();
});

test.after.always(async () => {
  // Stop the local Git server
  await gitbox.stop();
  // Stop Mock Server
  await mockServer.stop();
});

test.serial('Initial and minor releases', async t => {
  const packageName = 'test-release';
  const owner = 'git';
  const branch = 'master';
  const failTitle = 'The automated release is failing 🚨';
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl} = await gitbox.createRepo(packageName, branch);
  process.env.GH_TOKEN = gitbox.gitCredential;
  process.env.GITHUB_URL = mockServer.url;
  process.env.ATOM_ACCESS_TOKEN = 'ATOM_TOKEN';
  process.env.ATOM_HOME = tempy.directory();
  process.env.ATOM_API_URL = mockServer.url;
  process.env.ATOM_RESOURCE_PATH = tempy.directory();
  await writeJson('./package.json', {
    name: packageName,
    version: '0.0.0-dev',
    repository: {url: repositoryUrl},
    release: {failTitle},
  });

  /* Initial release */
  let version = '1.0.0';
  let verifyGitHubMock = await mockServer.mock(
    `/repos/${owner}/${packageName}`,
    {},
    {body: {permissions: {push: true}}, method: 'GET'}
  );
  let verifyApmMock = await mockServer.mock('/packages', {}, {body: {}, method: 'POST', statusCode: 201});
  let getApmVersionMock = await mockServer.mock(
    `/packages/${packageName}/versions`,
    {},
    {body: {}, method: 'POST', statusCode: 201}
  );
  let createReleaseMock = await mockServer.mock(
    `/repos/${owner}/${packageName}/releases`,
    {body: {tag_name: `v${version}`, target_commitish: 'master', name: `v${version}`}},
    {body: {html_url: `release-url/${version}`}}
  );
  let searchPRsMock = await mockServer.mock(
    '/search/issues',
    {queryStringParameters: {q: `${escape(`repo:${owner}/${packageName}`)}+${escape('type:pr')}`}},
    {body: {items: []}, method: 'GET'}
  );
  let searchIssuesMock = await mockServer.mock(
    '/search/issues',
    {
      queryStringParameters: {
        q: `${escape('in:title')}+${escape(`repo:${owner}/${packageName}`)}+${escape('type:issue')}+${escape(
          'state:open'
        )}+${escape(failTitle)}`,
      },
    },
    {body: {items: []}, method: 'GET'}
  );

  t.log('Commit a feature');
  await execa('git', ['commit', '-m', 'feat: new feature', '--allow-empty', '--no-gpg-sign']);

  t.log('Initial release');
  await semanticRelease({extends: apmConfig});

  await mockServer.verify(verifyGitHubMock);
  await mockServer.verify(verifyApmMock);
  await mockServer.verify(getApmVersionMock);
  await mockServer.verify(createReleaseMock);
  await mockServer.verify(searchIssuesMock);
  t.regex(t.context.error, /Registering test-release/);
  t.regex(t.context.error, new RegExp(`Publishing test-release@v${version}`));
  t.regex(t.context.logs, new RegExp(`Published GitHub release: release-url/${version}`));
  t.is((await readJson('./package.json')).version, version);
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'package.json']);
  let [commit] = await gitGetCommit();
  t.is(commit.subject, `chore(release): ${version} [skip ci]`);
  t.is(commit.gitTags, `(HEAD -> master, tag: v${version})`);

  /* Minor release */
  t.log('Commit a feature');
  await execa('git', ['commit', '-m', 'feat: other feature', '--allow-empty', '--no-gpg-sign']);
  [commit] = await gitGetCommit();
  version = '1.1.0';
  verifyGitHubMock = await mockServer.mock(
    `/repos/${owner}/${packageName}`,
    {},
    {body: {permissions: {push: true}}, method: 'GET'}
  );
  verifyApmMock = await mockServer.mock('/packages', {}, {body: {}, method: 'POST', statusCode: 201});
  getApmVersionMock = await mockServer.mock(
    `/packages/${packageName}/versions`,
    {},
    {body: {}, method: 'POST', statusCode: 201}
  );
  createReleaseMock = await mockServer.mock(
    `/repos/${owner}/${packageName}/releases`,
    {body: {tag_name: `v${version}`, target_commitish: 'master', name: `v${version}`}},
    {body: {html_url: `release-url/${version}`}}
  );
  searchPRsMock = await mockServer.mock(
    '/search/issues',
    {queryStringParameters: {q: `${escape(`repo:${owner}/${packageName}`)}+${escape('type:pr')}+${commit.hash}`}},
    {body: {items: [{number: 1, pull_request: {}, state: 'closed'}]}, method: 'GET'}
  );
  const getPRsMock = await mockServer.mock(
    `/repos/${owner}/${packageName}/pulls/1/commits`,
    {},
    {body: [{sha: commit.hash}], method: 'GET'}
  );
  const addCommentMock = await mockServer.mock(
    `/repos/${owner}/${packageName}/issues/1/comments`,
    {},
    {body: {items: [{number: 1, pull_request: {}}]}}
  );
  searchIssuesMock = await mockServer.mock(
    '/search/issues',
    {
      queryStringParameters: {
        q: `${escape('in:title')}+${escape(`repo:${owner}/${packageName}`)}+${escape('type:issue')}+${escape(
          'state:open'
        )}+${escape(failTitle)}`,
      },
    },
    {body: {items: []}, method: 'GET'}
  );

  t.log('Minor release');
  await semanticRelease({extends: apmConfig});

  await mockServer.verify(verifyGitHubMock);
  await mockServer.verify(verifyApmMock);
  await mockServer.verify(getApmVersionMock);
  await mockServer.verify(createReleaseMock);
  await mockServer.verify(searchPRsMock);
  await mockServer.verify(getPRsMock);
  await mockServer.verify(addCommentMock);
  await mockServer.verify(searchIssuesMock);

  t.regex(t.context.error, /Registering test-release/);
  t.regex(t.context.error, new RegExp(`Publishing test-release@v${version}`));
  t.regex(t.context.logs, new RegExp(`Published GitHub release: release-url/${version}`));
  t.is((await readJson('./package.json')).version, version);
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'package.json']);
  [commit] = await gitGetCommit();
  t.is(commit.subject, `chore(release): ${version} [skip ci]`);
  t.is(commit.gitTags, `(HEAD -> master, tag: v${version})`);
});

test.serial('Throw error if "ATOM_ACCESS_TOKEN" is not set', async t => {
  const packageName = 'missing-token';
  const branch = 'master';
  const {repositoryUrl} = await gitbox.createRepo(packageName, branch);
  process.env.GH_TOKEN = gitbox.gitCredential;
  process.env.GITHUB_URL = mockServer.url;
  process.env.ATOM_HOME = tempy.directory();
  process.env.ATOM_API_URL = mockServer.url;
  process.env.ATOM_RESOURCE_PATH = tempy.directory();
  process.env.GIT_TERMINAL_PROMPT = 0;
  delete process.env.ATOM_ACCESS_TOKEN;
  await writeJson('./package.json', {
    name: packageName,
    version: '0.0.0-dev',
    repository: {url: repositoryUrl},
  });

  const error = await t.throws(semanticRelease({extends: apmConfig}));

  t.regex(error.message.trim(), /The environment variable ATOM_ACCESS_TOKEN is required./);
});

test.serial('Throw error if "apm" is not installed', async t => {
  const packageName = 'missing-apm';
  const branch = 'master';
  const {repositoryUrl} = await gitbox.createRepo(packageName, branch);
  process.env.GH_TOKEN = gitbox.gitCredential;
  process.env.GITHUB_URL = mockServer.url;
  process.env.ATOM_HOME = tempy.directory();
  process.env.ATOM_API_URL = mockServer.url;
  process.env.ATOM_RESOURCE_PATH = tempy.directory();
  process.env.GIT_TERMINAL_PROMPT = 0;
  // Fake PATH with only git available to make sure apm is not in the PATH
  const PATH = tempy.directory();
  await ensureSymlink(which.sync('git'), path.join(PATH, 'git'));
  process.env.PATH = PATH;
  delete process.env.ATOM_ACCESS_TOKEN;
  await writeJson('./package.json', {
    name: packageName,
    version: '0.0.0-dev',
    repository: {url: repositoryUrl},
  });

  const error = await t.throws(semanticRelease({extends: apmConfig}));

  t.regex(error.message.trim(), /The apm CLI must be installed./);
});

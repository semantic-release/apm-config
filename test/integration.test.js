import test from 'ava';
import {writeJson, readJson} from 'fs-extra';
import {stub} from 'sinon';
import execa from 'execa';
import tempy from 'tempy';
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
});

test.afterEach.always(t => {
  // Restore process.env
  process.env = envBackup;
  // Restore the current working directory
  process.chdir(cwd);
  t.context.stdout.restore();
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
  // Create a remote repo, initialize it, create a local shallow clone and set the cwd to the clone
  const {repositoryUrl} = await gitbox.createRepo(packageName, branch);
  process.env.GIT_CREDENTIALS = gitbox.gitCredential;
  process.env.GH_TOKEN = 'github_token';
  process.env.GITHUB_URL = mockServer.url;
  process.env.ATOM_ACCESS_TOKEN = 'ATOM_TOKEN';
  process.env.ATOM_HOME = tempy.directory();
  process.env.ATOM_API_URL = mockServer.url;
  process.env.ATOM_RESOURCE_PATH = tempy.directory();
  await writeJson('./package.json', {
    name: packageName,
    version: '0.0.0-dev',
    repository: {url: repositoryUrl},
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
  let getRefMock = await mockServer.mock(
    `/repos/${owner}/${packageName}/git/refs/tags/v${version}`,
    {},
    {body: {}, statusCode: 200, method: 'GET'}
  );
  let createReleaseMock = await mockServer.mock(
    `/repos/${owner}/${packageName}/releases`,
    {body: {tag_name: `v${version}`, target_commitish: 'master', name: `v${version}`}},
    {body: {html_url: `release-url/${version}`}}
  );
  t.log('Commit a feature');
  await execa('git', ['commit', '-m', 'feat: new feature', '--allow-empty', '--no-gpg-sign']);

  t.log('Initial release');
  await semanticRelease({extends: apmConfig});

  await mockServer.verify(verifyGitHubMock);
  await mockServer.verify(verifyApmMock);
  await mockServer.verify(getApmVersionMock);
  await mockServer.verify(getRefMock);
  await mockServer.verify(createReleaseMock);
  t.regex(t.context.logs, /Registering test-release/);
  t.regex(t.context.logs, new RegExp(`Publishing test-release@v${version}`));
  t.regex(t.context.logs, new RegExp(`Published release: 1.0.0`));
  t.is((await readJson('./package.json')).version, version);
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'package.json']);
  let commit = (await gitGetCommit())[0];
  t.is(commit.subject, `chore(release): ${version} [skip ci]`);
  t.is(commit.gitTags, `(HEAD -> master, tag: v${version})`);

  /* Minor release */
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
  getRefMock = await mockServer.mock(
    `/repos/${owner}/${packageName}/git/refs/tags/v${version}`,
    {},
    {body: {}, statusCode: 200, method: 'GET'}
  );
  createReleaseMock = await mockServer.mock(
    `/repos/${owner}/${packageName}/releases`,
    {body: {tag_name: `v${version}`, target_commitish: 'master', name: `v${version}`}},
    {body: {html_url: `release-url/${version}`}}
  );
  t.log('Commit a feature');
  await execa('git', ['commit', '-m', 'feat: other feature', '--allow-empty', '--no-gpg-sign']);

  t.log('Minor release');
  await semanticRelease({extends: apmConfig});

  await mockServer.verify(verifyGitHubMock);
  await mockServer.verify(verifyApmMock);
  await mockServer.verify(getApmVersionMock);
  await mockServer.verify(getRefMock);
  await mockServer.verify(createReleaseMock);
  t.regex(t.context.logs, /Registering test-release/);
  t.regex(t.context.logs, new RegExp(`Publishing test-release@v${version}`));
  t.regex(t.context.logs, new RegExp(`Published release: 1.0.0`));
  t.is((await readJson('./package.json')).version, version);
  t.deepEqual(await gitCommitedFiles(), ['CHANGELOG.md', 'package.json']);
  commit = (await gitGetCommit())[0];
  t.is(commit.subject, `chore(release): ${version} [skip ci]`);
  t.is(commit.gitTags, `(HEAD -> master, tag: v${version})`);
});

test.serial('Throw error if "ATOM_ACCESS_TOKEN" is not set', async t => {
  const packageName = 'missing-token';
  const branch = 'master';
  const {repositoryUrl} = await gitbox.createRepo(packageName, branch);
  process.env.GIT_CREDENTIALS = gitbox.gitCredential;
  process.env.GH_TOKEN = 'github_token';
  process.env.GITHUB_URL = mockServer.url;
  process.env.ATOM_HOME = tempy.directory();
  process.env.ATOM_API_URL = mockServer.url;
  process.env.ATOM_RESOURCE_PATH = tempy.directory();
  delete process.env.ATOM_ACCESS_TOKEN;
  await writeJson('./package.json', {
    name: packageName,
    version: '0.0.0-dev',
    repository: {url: repositoryUrl},
  });

  const error = await t.throws(semanticRelease({extends: apmConfig}));

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.message.trim(), 'The environment variable ATOM_ACCESS_TOKEN is required.');
});

const execa = require('execa');
const SemanticReleaseError = require('@semantic-release/error');

module.exports = {
  verifyConditions: [
    async () => {
      if ((await execa('apm', ['-v'], {reject: false})).code !== 0) {
        throw new SemanticReleaseError('The apm CLI must be installed.', 'ENOAPMCLI');
      }
    },
    () => {
      if (!process.env.ATOM_ACCESS_TOKEN) {
        throw new SemanticReleaseError('The environment variable ATOM_ACCESS_TOKEN is required.', 'ENOAPMTOKEN');
      }
    },
    {path: '@semantic-release/npm', npmPublish: false},
    '@semantic-release/changelog',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
  publish: [
    '@semantic-release/changelog',
    {path: '@semantic-release/npm', npmPublish: false},
    {path: '@semantic-release/git', message: `chore(release): \${nextRelease.version} [skip ci]`},
    {path: '@semantic-release/exec', cmd: `apm publish --tag \${nextRelease.gitTag}`},
    '@semantic-release/github',
  ],
};

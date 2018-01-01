module.exports = {
  verifyConditions: [
    {
      path: '@semantic-release/exec',
      cmd: 'if ! [ -x "$(command -v apm)" ]; then echo "The apm CLI must be installed."; exit 1; fi',
    },
    {
      path: '@semantic-release/exec',
      cmd:
        'if [ -z "$ATOM_ACCESS_TOKEN" ]; then echo "The environment variable ATOM_ACCESS_TOKEN is required."; exit 1; fi',
    },
    {path: '@semantic-release/npm', npmPublish: false},
    '@semantic-release/changelog',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
  getLastRelease: '@semantic-release/git',
  publish: [
    '@semantic-release/changelog',
    {path: '@semantic-release/npm', npmPublish: false},
    {
      path: '@semantic-release/git',
      assets: ['package.json'],
    },
    {path: '@semantic-release/exec', cmd: `apm publish --tag \${nextRelease.gitTag}`},
    '@semantic-release/github',
  ],
};

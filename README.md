# @semantic-release/apm-config

[Semantic-release](https://github.com/semantic-release/semantic-release) shareable config for releasing atom packages with [`apm`](https://github.com/atom/apm).

[![Travis](https://img.shields.io/travis/semantic-release/apm-config.svg)](https://travis-ci.org/semantic-release/apm-config)
[![Codecov](https://img.shields.io/codecov/c/github/semantic-release/apm-config.svg)](https://codecov.io/gh/semantic-release/apm-config)
[![Greenkeeper badge](https://badges.greenkeeper.io/semantic-release/apm-config.svg)](https://greenkeeper.io/)

## Usage

### Local installation

```bash
$ npm install --save-dev semantic-release @semantic-release/apm-config
```

In `package.json`:

```json
{
  "release": {
    "extends": "@semantic-release/apm-config"  
  }
}
```

### Global installation

```bash
$ npm install -g semantic-release @semantic-release/apm-config
$ semantic-release -e @semantic-release/apm-config
```

## Configuration

### Atom installation

The `apm` command line has to be installed in your CI environment and available in the `PATH`.

See the [Atom Package CI Scripts](https://github.com/atom/ci#atom-package-ci-scripts) documentation.

### GitHub authentication

The GitHub authentication configuration is **required** and can be set via [environment variables](#environment-variables).

Follow the [Creating a personal access token for the command line](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line) to obtain an authentication token. The token has to be made available in your CI environment via the `ATOM_ACCESS_TOKEN` environment variable.

### Atom authentication

The Atom authentication configuration is **required** and can be set via [environment variables](#environment-variables).

Visit your account page on [Atom.io](https://atom.io/account) to obtain your authentication token. The token has to be made available in your CI environment via the `ATOM_ACCESS_TOKEN` environment variable.

### Environment variables

| Variable                     | Description                                                          |
|------------------------------|----------------------------------------------------------------------|
| `GH_TOKEN` or `GITHUB_TOKEN` | **Required.** The token used to authenticate with GitHub repository. |
| `ATOM_ACCESS_TOKEN`          | **Required.** The token used to authenticate with Atom registry.     |

### Additional options

This shareable config uses the [`git`](https://github.com/semantic-release/git), [`npm`](https://github.com/semantic-release/npm), [`exec`](https://github.com/semantic-release/exec), [`changelog`](https://github.com/semantic-release/changelog) and [`github`](https://github.com/semantic-release/github) plugins. See the documentation of each plugins for additional options.
Options can be set in the `semantic-release` configuration.

For example to change the commit message:

```json
{
  "release": {
    "extends": "@semantic-release/apm-config",
    "message": "chore: prepare %s release ${nextRelease.version} [skip ci]"
  }
}
```

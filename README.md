# @semantic-release/apm-config

[**semantic-release**](https://github.com/semantic-release/semantic-release) shareable config to publish [Atom](https://www.atom.io) packages with [apm](https://github.com/atom/apm).

[![Build Status](https://github.com/semantic-release/apm-config/workflows/Test/badge.svg)](https://github.com/semantic-release/apm-config/actions?query=workflow%3ATest+branch%3Amaster) [![npm latest version](https://img.shields.io/npm/v/@semantic-release/apm-config/latest.svg)](https://www.npmjs.com/package/@semantic-release/apm-config)
[![npm next version](https://img.shields.io/npm/v/@semantic-release/apm-config/next.svg)](https://www.npmjs.com/package/@semantic-release/apm-config)

## Plugins

This shareable configuration use the following plugins:

- [`@semantic-release/commit-analyzer`](https://github.com/semantic-release/commit-analyzer)
- [`@semantic-release/release-notes-generator`](https://github.com/semantic-release/release-notes-generator)
- [`@semantic-release/github`](https://github.com/semantic-release/github)
- [`@semantic-release/changelog`](https://github.com/semantic-release/changelog)
- [`@semantic-release/apm`](https://github.com/semantic-release/apm)
- [`@semantic-release/git`](https://github.com/semantic-release/git)

## Install

```bash
$ npm install --save-dev semantic-release @semantic-release/apm-config
```

## Usage

The shareable config can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

```json
{
  "extends": "@semantic-release/apm-config"
}
```

## Configuration

See each [plugin](#plugins) documentation for required installation and configuration steps.

### Overwritten options

This following options are set by this shareable config:

| Option                                                       | Value                                             |
| ------------------------------------------------------------ | ------------------------------------------------- |
| [`message`](https://github.com/semantic-release/git#message) | chore(release): \${nextRelease.version} [skip ci] |

Other options use their default values. See each [plugin](#plugins) documentation for available options.

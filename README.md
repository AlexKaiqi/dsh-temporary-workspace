# dsh-temporary-session

English | [中文](README.zh.md)

A DeepSeek Harness plugin that makes the sidebar's existing **New Session** action open an isolated scratch Session without asking for a working directory. Project-bound work continues to use the page's existing Workspace controls.

The installable package lives in [`packages/plugin`](packages/plugin). Its README documents behavior, retention semantics, compatibility, configuration, and installation.

## Development

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
```

The generated tarball is written to `artifacts/`.

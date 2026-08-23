# dsh-temporary-session

English | [中文](README.zh.md)

A DeepSeek Harness plugin that keeps one fixed **Temporary Session** Workspace at the bottom of the Workspace list. Use that group's native New Session control to open scratch Sessions without choosing a working directory, while project-bound work continues to use ordinary Workspace controls.

The installable package lives in [`packages/plugin`](packages/plugin). Its README documents behavior, retention semantics, compatibility, configuration, and installation.

## Development

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
```

The generated tarball is written to `artifacts/`.

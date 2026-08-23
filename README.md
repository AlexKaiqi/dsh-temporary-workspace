# dsh-temporary-session

English | [中文](README.zh.md)

A DeepSeek Harness plugin that keeps one configurable **Temporary Workspace** at the bottom of the Workspace list. It isolates scratch and plugin-owned background Sessions from project directories and collects them under one UI group. The default directory is `$DSH_HOME/temporary-sessions` (normally `~/.dsh/temporary-sessions`) and can be changed in Settings.

The installable package lives in [`packages/plugin`](packages/plugin). Its README documents behavior, retention semantics, compatibility, configuration, and installation.

## Development

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
```

The generated tarball is written to `artifacts/`.

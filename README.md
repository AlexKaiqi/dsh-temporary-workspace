# dsh-temporary-workspace

English | [中文](README.zh.md)

A DeepSeek Harness **Temporary Workspace** plugin. It keeps one isolated scratch directory per temporary Session while folding all of them into one configurable sidebar group.

The installable package lives in [packages/plugin](packages/plugin). Its README documents behavior, retention, configuration, and installation.

## Development

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
```

The generated tarball is written to `artifacts/`.

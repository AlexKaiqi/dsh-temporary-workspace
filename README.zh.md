# dsh-temporary-workspace

[English](README.md) | 中文

这是一个 DeepSeek Harness **临时工作区**插件。每个临时 Session 保留独立 scratch 目录，但侧栏会把它们统一折叠在一个可配置分组中。

可安装包位于 [packages/plugin](packages/plugin)。详细行为、保留语义、配置和安装方式见包内 README。

## 开发

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
```

生成的 tarball 位于 `artifacts/`。

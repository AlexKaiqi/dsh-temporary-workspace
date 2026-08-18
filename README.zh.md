# dsh-temporary-session

[English](README.md) | 中文

这是一个 DeepSeek Harness 插件：点击侧栏原有的 **New Session** 时，直接用隔离的临时工作目录打开 Session，不再要求选择工作目录。属于具体项目的任务仍使用页面已有的 Workspace 入口。

可安装的插件包位于 [`packages/plugin`](packages/plugin)。其 README 详细说明了行为、文件保留语义、兼容条件、配置和安装方式。

## 开发

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
```

生成的 tarball 位于 `artifacts/`。

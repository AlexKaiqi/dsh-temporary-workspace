# dsh-temporary-session

[English](README.md) | 中文

这是一个 DeepSeek Harness 插件：它会在工作区列表最下面准备一个可配置的 **临时工作区**，把临时会话和插件后台会话与项目目录隔离，并统一收纳到一个 UI 分组。默认目录是 `$DSH_HOME/temporary-sessions`（通常为 `~/.dsh/temporary-sessions`），可在设置中修改。

可安装的插件包位于 [`packages/plugin`](packages/plugin)。其 README 详细说明了行为、文件保留语义、兼容条件、配置和安装方式。

## 开发

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
```

生成的 tarball 位于 `artifacts/`。

# dsh-temporary-workspace

[English](README.md) | 中文

DeepSeek Harness 的可配置**临时工作区**。每个临时 Session 保留独立 scratch 目录，侧栏则把所有匹配 Session 折叠到一个贡献分组中。

## 行为

1. 每次创建时，Host 都会在配置的 `root` 下预留唯一 `workspace-*` 子目录。
2. Client 为该子目录创建短暂的 Host Workspace，并调用 `sessions.create({ workspaceId })`；这保证创建全新 Session，不复用已有空白 Session。
3. 采用完成后只移除短暂 Workspace 注册，不删除 Session 日志、目录或文件。
4. Workspace 浏览器把规范 `cwd` 为规范 root 直接 `workspace-*` 子目录的 Session 收入一个“临时工作区”分组。匹配的短暂 Workspace 行仅在展示层隐藏，因此旧注册残留也不会产生重复分组。
5. 分组行上的 `+` 是唯一专用创建入口。插件不再注册侧栏底部按钮。

“临时”表示不绑定既有项目，不表示关闭时删除。已采用目录和 Session 日志会跨重启保留。

## 配置

`root` 是独立临时 Session 目录的父目录：

```yaml
- insert:
    - id: temporary-workspace
      name: dsh-temporary-workspace
      config:
        root: !!js dshHomePath('temporary-workspaces')
        reservationRetentionMs: 3600000
```

默认值是 `$DSH_HOME/temporary-workspaces`，通常为 `~/.dsh/temporary-workspaces`。也可在 **设置 → 插件 → 临时工作区** 中实时修改。新 root 只影响后续创建与贡献分组匹配；既有 Session、Workspace 和文件不会迁移或删除。

Settings namespace 为 `temporary-workspace`。`reservationRetentionMs` 是崩溃窗口内未采用 reservation 的保留期，默认一小时，最小一分钟。

## 插件对接

后台产品使用同一套 `reserve` / create / `adopt` 事务。清理只接受不透明 reservation id，调用者不能提交任意删除路径。`prepareGroup()` 返回 Client 投影使用的规范配置 root。

## 安装

此版本要求 DSH 提供 `uiWorkspace.registerSessionGroup()` Client API。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
dsh plugin --profile web add "$PWD/artifacts/dsh-temporary-workspace-0.1.0-rc.6.tgz"
```

预发布版本使用 npm `next` tag。安装或升级后重启 DSH Web process。

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。

# dsh-temporary-workspace

[English](README.md) | 中文

DeepSeek Harness 的可配置**临时工作区**。适合临时分析、一次性任务和插件后台工作：每次创建都会获得独立目录，不会与项目目录或其他临时任务共享文件。

## 行为

每次点击侧栏的“临时工作区”后，插件执行一笔带回滚的创建流程：

1. Host 在配置的父目录下用 `mkdtemp` 创建唯一的 `workspace-*` 子目录。
2. Client 将该子目录注册为普通 Workspace，并放到工作区列表末尾。
3. 插件为 Workspace 创建并打开首个 Session。这个 Session 的 `cwd` 就是该唯一子目录。
4. 创建成功后清除待采用标记；注册或 Session 创建失败时回滚 Workspace 和子目录。
5. 每次点击都会从新的子目录开始，所以空白 Session 复用不会跨临时任务发生。

生成的 Workspace 会保留，并显示为“临时工作区 · workspace-…”；用户之后可以正常改名。这里的“临时”表示不绑定已有项目，并不表示关闭后立即删除。已采用目录必须保留，否则历史 Session 的 `cwd` 会失效。

Host 会清理创建过程中因进程崩溃遗留、且超过宽限期的未采用目录；已被 Workspace 采用的目录没有待处理标记，不会被这项清理误删。

## 配置

`root` 是生成临时 Workspace 的**父目录**，不是多个会话共用的 Workspace：

```yaml
- insert:
    - id: temporary-workspace
      name: dsh-temporary-workspace
      config:
        root: !!js dshHomePath('temporary-workspaces')
        reservationRetentionMs: 3600000
```

默认值是 `$DSH_HOME/temporary-workspaces`，通常为 `~/.dsh/temporary-workspaces`。也可在 **设置 → 插件 → 临时工作区** 中实时修改；保存后只影响后续创建，既有 Workspace、Session 和文件不会迁移或删除。

Settings namespace 为 `temporary-workspace`。`reservationRetentionMs` 是未采用目录的回收宽限期，默认一小时，最小一分钟。

## 插件对接

需要创建后台 Session 的插件应注入 `temporaryWorkspaces`，并遵循同一套所有权事务：

1. 调用 `reserve()`，把返回的 `path` 作为新 Session 的 `cwd`。
2. Session 创建后调用 `adopt({ reservationId, sessionId })`，将目录注册为独立 Workspace 并绑定 Session。
3. 如果 Session 创建前失败，调用 `discard({ reservationId })`；如果 Session 已存在但采用流程未能完成，调用 `retain({ reservationId })`，避免崩溃回收误删仍在使用的 `cwd`。

Reservation ID 是不透明能力标识；清理接口不接受调用方提供的路径。

## 安装

目标版本为 DeepSeek Harness `0.1.1-rc.2`：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
dsh plugin --profile web add "$PWD/artifacts/dsh-temporary-workspace-0.1.0-rc.5.tgz"
```

发布 npm 后可安装：

```sh
dsh plugin --profile web add 'dsh-temporary-workspace@0.1.0-rc.5'
```

预发布版本使用 npm `next` tag。

安装或升级后重启 DSH Web process。

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。

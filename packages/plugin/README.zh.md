# dsh-temporary-session

[English](README.md) | 中文

DeepSeek Harness 的临时会话插件。适合临时分析文本、写一次性脚本、下载并检查文件等不属于现有项目的任务：插件会在工作区列表最下面准备一个固定的“临时会话” Workspace，直接使用该分组自带的新建入口即可，无需先选择工作目录。所有临时会话固定收纳在同一个标签下，不会散落到 Ungrouped 或生成一串临时 Workspace。需要进入具体项目时，继续使用页面已有的 New Session 与 Workspace 入口。

当侧栏额外提供 `sidebar/new-session` 扩展事件时，插件仍兼容该旧入口；当前侧栏不再添加重复的底部按钮。

## 行为

插件启动后会完成一笔幂等的准备流程：

1. Host 创建并检查固定目录 `$DSH_HOME/temporary-sessions`（可配置）。
2. Client 用 Harness 原生 Workspace API 幂等注册这个目录。首次注册时把默认目录名改为当前语言的“临时会话”，用户之后手动改过的标题不会被覆盖。
3. Client 把该特殊 Workspace 固定移动到普通工作区之后；它使用宿主工作区行自带的新建入口，不再额外注册侧栏底部按钮。
4. 通过该分组新建时，宿主会复用已有空白 Session，或在上一条已有内容后创建新 Session；这些 Session 的 `cwd` 都是该固定目录，因此自然归在同一个 Workspace 标签下。
5. Workspace、目录和 Session 日志持续保留，因此历史会话可以恢复，普通会话列表也不会再被临时会话冲散。

“临时”指任务不绑定已有项目，不代表 Workspace、Session 或文件在关闭后自动销毁。Harness 当前没有与 Session 删除绑定的目录生命周期；自动删除会让历史会话的 `cwd` 失效，因此插件有意保留这个固定 Workspace 及其中的文件。

固定分组有一个明确取舍：Harness 只允许 `cwd` 与 Workspace 规范路径完全相同的 Session 归入该 Workspace，所以同组临时会话共用一个文件目录，不能同时拥有各自独立的 `task-*` cwd。需要目录隔离的项目任务应继续使用普通 Workspace 入口。

为兼容旧版本并清理其崩溃遗留，Host 暂时保留 reservation 协议和带标记目录的安全 sweep；当前 Client 不再为新会话创建这些子目录。已被旧 Session 采用的目录没有标记，仍然永远不会被回收。

## 配置

组合补丁默认使用：

```yaml
- insert:
    - id: temporary-session
      name: dsh-temporary-session
      config:
        root: !!js dshHomePath('temporary-sessions')
        reservationRetentionMs: 3600000
```

可以把 `root` 改为其他 Host 本地绝对路径。这个路径就是临时会话共用的固定 Workspace，而不是每个任务的父目录。

同一个值可在 **设置 → 插件 → 临时会话** 中实时编辑。页面支持输入绝对路径；Host 使用原生目录选择后端时，还会显示 **选择目录** 按钮。保存时会创建并检查目录权限，下一次新建临时会话会注册并使用新 Workspace；旧 Workspace、既有 Session 和文件不会迁移或删除。点击 **使用默认地址** 会恢复上面组合层的值；profile 未覆盖 `root` 时就是 `$DSH_HOME/temporary-sessions`。

`reservationRetentionMs` 是*尚未采用*的预留被判定为废弃前的宽限期，默认一小时。宽限期是必要的：并发 Host 正在进行中的预留对本进程不可见，因此更年轻的目录一律不动。小于一分钟的取值会被抬升到该下界。

## 安装

目标版本为 DeepSeek Harness `0.1.0-rc.6`：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
dsh plugin --profile web add "$PWD/artifacts/dsh-temporary-session-0.1.0-rc.2.tgz"
```

发布 npm 后可安装：

```sh
dsh plugin --profile web add 'dsh-temporary-session@0.1.0-rc.2'
```

安装或升级后重启 DSH Web process。

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。

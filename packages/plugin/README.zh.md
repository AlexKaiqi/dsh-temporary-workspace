# dsh-temporary-session

[English](README.md) | 中文

DeepSeek Harness 的一键临时会话插件。适合临时分析文本、写一次性脚本、下载并检查文件等不属于现有项目的任务：点击侧栏底部的“临时会话”，无需先选择工作目录。需要进入具体项目时，继续使用页面已有的 New Session 与 Workspace 入口。

当侧栏额外提供 `sidebar/new-session` 扩展事件时，插件仍兼容该事件；当前 rc.7 侧栏直接使用插件自己的独立入口，不需要修改或降级核心包。

## 行为

插件会处理自己的“临时会话”操作。每次点击完成一笔受控事务：

1. Host 在 `$DSH_HOME/temporary-sessions` 下创建独立目录。
2. Client 用 Harness 原生 Workspace API 临时接管该目录并创建 Session。
3. Session 空白阶段保留临时 Workspace 注册，使新会话直接获得默认工作区、输入框立即可用；第一条消息被接受后再自动删除注册。之后 Session 会出现在 Ungrouped，不会在侧栏长期堆积临时 Workspace。Workspace 页面中的显式操作不被认领。
4. 目录和 Session 日志继续保留，因此历史会话可以恢复，生成的文件也不会被系统临时目录清理掉。

“临时”指无需绑定已有项目且 Workspace 注册是短暂的，不代表关闭会话后自动销毁文件。Harness 当前没有与 Session 删除绑定的目录生命周期；自动删除会让历史会话的 `cwd` 失效，因此本插件有意保留成功会话的目录。

创建 Workspace 之前发生失败时，尚未采用的空目录会通过 Host 颁发的不透明 reservation id 回收。浏览器不能提交任意路径给清理接口。

如果 Host 进程在"预留目录"和"采用目录"之间崩溃，reservation id 随进程一起消失，该目录将永远无法回收。因此每个尚未采用的预留都会在磁盘上留下标记，采用成功时清除标记。服务启动时以及每次新建预留时各扫一次，只回收仍带标记且超过 `reservationRetentionMs` 的目录。已被 Session 采用的目录没有标记，永远不会被回收，可恢复的历史会话不会丢失工作目录。

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

可以把 `root` 改为其他 Host 本地绝对路径。每个临时任务仍会获得单独的 `task-*` 子目录。

同一个值可在 **设置 → 插件 → 临时会话** 中实时编辑。页面支持输入绝对路径；Host 使用原生目录选择后端时，还会显示 **选择目录** 按钮。保存时会创建并检查父目录权限，下一次新建临时会话立即使用新位置；已经创建或正在创建的会话仍留在原目录，不会迁移。点击 **使用默认地址** 会恢复上面组合层的值；profile 未覆盖 `root` 时就是 `$DSH_HOME/temporary-sessions`。

`reservationRetentionMs` 是*尚未采用*的预留被判定为废弃前的宽限期，默认一小时。宽限期是必要的：并发 Host 正在进行中的预留对本进程不可见，因此更年轻的目录一律不动。小于一分钟的取值会被抬升到该下界。

## 安装

目标版本为 DeepSeek Harness `0.1.0-rc.6`：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
dsh plugin --profile web add "$PWD/artifacts/dsh-temporary-session-0.1.0-rc.1.tgz"
```

发布 npm 后可安装：

```sh
dsh plugin --profile web add 'dsh-temporary-session@0.1.0-rc.1'
```

安装或升级后重启 DSH Web process。

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。

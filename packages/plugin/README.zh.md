# dsh-temporary-session

[English](README.md) | 中文

DeepSeek Harness 的一键临时会话插件。适合临时分析文本、写一次性脚本、下载并检查文件等不属于现有项目的任务：点击侧栏原有的 “New Session”，无需先选择工作目录。需要进入具体项目时，继续使用页面已有的 Workspace 添加或选择入口。

本版本需要带有 `sidebar/new-session` 扩展事件的 ui-sidebar。仓库 `deepseek-harness` 目录已经包含这项最小兼容补丁；未带该事件的原始 `0.1.0-rc.6` 侧栏不会触发插件。

## 行为

插件会认领未指定 Workspace 的 New Session 操作。每次点击完成一笔受控事务：

1. Host 在 `$DSH_HOME/temporary-sessions` 下创建独立目录。
2. Client 用 Harness 原生 Workspace API 临时接管该目录并创建 Session。
3. Session 打开后，插件立即删除临时 Workspace 注册；Session 会出现在 Ungrouped，不会在侧栏堆积临时 Workspace。Workspace 页面中的显式操作不被认领。
4. 目录和 Session 日志继续保留，因此历史会话可以恢复，生成的文件也不会被系统临时目录清理掉。

“临时”指无需绑定已有项目且 Workspace 注册是短暂的，不代表关闭会话后自动销毁文件。Harness 当前没有与 Session 删除绑定的目录生命周期；自动删除会让历史会话的 `cwd` 失效，因此本插件有意保留成功会话的目录。

创建 Workspace 之前发生失败时，尚未采用的空目录会通过 Host 颁发的不透明 reservation id 回收。浏览器不能提交任意路径给清理接口。

## 配置

组合补丁默认使用：

```yaml
- insert:
    - id: temporary-session
      name: dsh-temporary-session
      config:
        root: !!js dshHomePath('temporary-sessions')
```

可以把 `root` 改为其他 Host 本地绝对路径。每个临时任务仍会获得单独的 `task-*` 子目录。

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

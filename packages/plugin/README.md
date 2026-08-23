# dsh-temporary-session

English | [中文](README.zh.md)

A scratch Session plugin for DeepSeek Harness. It is intended for one-off analysis, small scripts, downloads, and other tasks that do not belong to an existing project. The plugin keeps one fixed **Temporary Session** Workspace at the bottom of the Workspace list; use that group's native New Session control without choosing a working directory. Every temporary Session remains in that group instead of spilling into Ungrouped or creating a trail of Workspace rows. Use ordinary Workspace controls when a task belongs to a project.

The plugin still supports the optional legacy `sidebar/new-session` extension event on patched shells. Current shells no longer receive a duplicate footer action.

## Behavior

On startup the plugin runs one idempotent preparation flow:

1. The Host creates and permission-checks the fixed `$DSH_HOME/temporary-sessions` directory (configurable).
2. The Client registers that directory through the native Harness Workspace API. On first registration it replaces the directory-basename default with the localized Temporary Sessions label; a later user-customized title is preserved.
3. The Client keeps this special Workspace after ordinary Workspaces. It uses the Host Workspace row's native New Session control instead of registering another sidebar-footer action.
4. Creating from that group uses the Host's standard connection flow: it reuses an existing blank Session, or creates a new one after the previous Session has content. Every temporary Session has the fixed directory as its `cwd`, so all of them remain in one Workspace group.
5. The Workspace, directory, and Session logs stay durable, so history can resume without scattering scratch Sessions through the ordinary list.

“Temporary” means that the task is not bound to an existing project. It does not mean that closing the Session destroys its Workspace, log, or files. Harness currently has no directory lifecycle tied to Session deletion; deleting the directory would invalidate historical Session `cwd` values, so the fixed scratch Workspace is deliberately retained.

This fixed grouping has an explicit tradeoff: Harness only groups a Session under a Workspace when its canonical `cwd` exactly equals the Workspace path. Temporary Sessions in this group therefore share one filesystem root; per-Session `task-*` cwd isolation and a single Workspace group cannot both be represented by the current Host contract. Use an ordinary project Workspace when filesystem isolation matters.

For upgrade compatibility and cleanup of old crash leftovers, the Host temporarily retains the reservation protocol and its marker-based sweep. The current Client no longer creates those per-Session child directories. Directories adopted by older Sessions remain unmarked and are never reclaimed.

## Configuration

The bundled composition patch uses:

```yaml
- insert:
    - id: temporary-session
      name: dsh-temporary-session
      config:
        root: !!js dshHomePath('temporary-sessions')
        reservationRetentionMs: 3600000
```

`root` may be changed to another absolute Host-local path. That path is the one fixed Workspace shared by temporary Sessions, not a parent for per-task children.

The same value is editable live under **Settings → Plugins → Temporary Sessions**. The card accepts an absolute path and, when the Host uses the native directory-picker backend, provides a **Choose directory** button. Saving creates and permission-checks the directory; the next temporary Session registers and uses the new Workspace. Existing Workspaces, Sessions, and files are neither migrated nor deleted. **Use default** restores the composition value above, which is `$DSH_HOME/temporary-sessions` unless the profile overrides `root`.

`reservationRetentionMs` is the grace period before an *unadopted* reservation is treated as abandoned; it defaults to one hour. The grace period matters because a concurrent Host's in-flight reservations are not visible to this process, so anything younger is left alone. Values below one minute are raised to that floor.

## Install

This release targets DeepSeek Harness `0.1.0-rc.6`:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
dsh plugin --profile web add "$PWD/artifacts/dsh-temporary-session-0.1.0-rc.2.tgz"
```

After npm publication:

```sh
dsh plugin --profile web add 'dsh-temporary-session@0.1.0-rc.2'
```

Restart the DSH Web process after installation or upgrade.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

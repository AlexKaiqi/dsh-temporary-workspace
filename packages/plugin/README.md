# dsh-temporary-session

English | [中文](README.zh.md)

A one-click scratch Session plugin for DeepSeek Harness. It is intended for one-off analysis, small scripts, downloads, and other tasks that do not belong to an existing project. Select the sidebar's existing **New Session** action; no working-directory picker is involved. Use the page's existing Workspace add or selection controls when a task belongs to a project.

This release requires ui-sidebar to expose the `sidebar/new-session` extension event. The sibling `deepseek-harness` checkout contains that minimal compatibility patch; the unmodified `0.1.0-rc.6` sidebar does not emit the event and therefore cannot activate this plugin.

## Behavior

The plugin claims unscoped New Session actions. Each click runs one controlled transaction:

1. The Host creates a unique directory under `$DSH_HOME/temporary-sessions`.
2. The Client adopts it through the native Harness Workspace API and materializes a Session.
3. After opening the Session, the plugin removes the short-lived Workspace registration. The Session remains available under Ungrouped instead of leaving temporary Workspace groups in the sidebar. Explicit Workspace actions are never claimed.
4. The directory and Session log remain durable, so history can resume and operating-system temp cleanup cannot silently remove generated files.

“Temporary” means that the task is not bound to an existing project and its Workspace registration is transient. It does not mean that closing the Session destroys its files. Harness currently has no directory lifecycle tied to Session deletion; deleting the directory would invalidate the historical Session's `cwd`, so successful scratch directories are deliberately retained.

Failures before Workspace adoption discard the unused directory through an opaque Host-issued reservation id. The browser cannot submit an arbitrary path to the cleanup method.

If the Host process dies between reserving a directory and adopting it, the reservation id dies with it and that directory would otherwise be unreachable forever. Each reservation is therefore marked on disk while it is still unadopted; adoption clears the mark. A sweep runs when the service starts and again on each new reservation, reclaiming only marked directories older than `reservationRetentionMs`. Adopted directories carry no mark and are never reclaimed, so a resumable Session cannot lose its working directory.

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

`root` may be changed to another absolute Host-local path. Every task still receives a separate `task-*` child directory.

`reservationRetentionMs` is the grace period before an *unadopted* reservation is treated as abandoned; it defaults to one hour. The grace period matters because a concurrent Host's in-flight reservations are not visible to this process, so anything younger is left alone. Values below one minute are raised to that floor.

## Install

This release targets DeepSeek Harness `0.1.0-rc.6`:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
dsh plugin --profile web add "$PWD/artifacts/dsh-temporary-session-0.1.0-rc.1.tgz"
```

After npm publication:

```sh
dsh plugin --profile web add 'dsh-temporary-session@0.1.0-rc.1'
```

Restart the DSH Web process after installation or upgrade.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

# dsh-temporary-workspace

English | [中文](README.zh.md)

A configurable **Temporary Workspace** for DeepSeek Harness. Every creation receives its own directory, keeping scratch work isolated from projects and from other temporary tasks.

## Behavior

Each click on the Temporary Workspace sidebar action runs one rollback-safe transaction:

1. The Host uses `mkdtemp` to create a unique `workspace-*` child below the configured parent.
2. The Client registers that child as an ordinary Workspace and moves it to the end of the Workspace list.
3. The plugin creates and opens the Workspace's first Session. Its `cwd` is the unique child.
4. Success clears the pending-adoption marker; registration or Session creation failure rolls back the Workspace and child.
5. Every click starts from a new child, so blank Session reuse cannot cross temporary-task boundaries.

Generated Workspaces remain registered and are titled “Temporary Workspace · workspace-…”. Users can rename them normally. “Temporary” means not tied to an existing project; it does not mean immediate deletion on close. Adopted directories must remain so historical Session `cwd` values stay valid.

The Host reclaims only unadopted, crash-orphaned reservations older than the grace period. Adopted directories carry no pending marker and are never removed by this sweep.

## Configuration

`root` is the **parent** for generated Workspaces, not one Workspace shared by Sessions:

```yaml
- insert:
    - id: temporary-workspace
      name: dsh-temporary-workspace
      config:
        root: !!js dshHomePath('temporary-workspaces')
        reservationRetentionMs: 3600000
```

The default is `$DSH_HOME/temporary-workspaces`, normally `~/.dsh/temporary-workspaces`. It can also be edited live under **Settings → Plugins → Temporary Workspace**. Changes affect future creations only; existing Workspaces, Sessions, and files are not migrated or deleted.

The Settings namespace is `temporary-workspace`. `reservationRetentionMs` is the unadopted-directory grace period: one hour by default, with a one-minute minimum.

## Plugin integration

Plugins that create background Sessions should inject `temporaryWorkspaces` and use the same ownership transaction:

1. Call `reserve()` and use the returned `path` as the new Session's `cwd`.
2. After Session creation, call `adopt({ reservationId, sessionId })` to register the directory as its Workspace and attach the Session.
3. If creation fails before a Session exists, call `discard({ reservationId })`. If a Session exists but adoption cannot complete, call `retain({ reservationId })` so crash recovery cannot delete its live `cwd`.

Reservation IDs are opaque capabilities. Cleanup methods never accept caller-supplied paths.

## Installation

Target DeepSeek Harness version: `0.1.1-rc.2`.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
dsh plugin --profile web add "$PWD/artifacts/dsh-temporary-workspace-0.1.0-rc.5.tgz"
```

After npm publication:

```sh
dsh plugin --profile web add 'dsh-temporary-workspace@0.1.0-rc.5'
```

Prerelease versions are published under the npm `next` tag.

Restart the DSH Web process after installation or upgrade.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

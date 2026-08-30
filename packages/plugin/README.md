# dsh-temporary-workspace

English | [中文](README.zh.md)

A configurable **Temporary Workspace** for DeepSeek Harness. Each temporary Session keeps an isolated scratch directory while the sidebar folds every matching Session into one contributed group.

## Behavior

1. The Host reserves a unique `workspace-*` child below the configured `root` for every creation.
2. The Client creates a transient Host Workspace for that child and calls `sessions.create({ workspaceId })`, which guarantees a fresh Session instead of reusing an existing blank.
3. After adoption, the transient Workspace registration is removed without deleting the Session log, its directory, or files.
4. The Workspace browser groups Sessions whose canonical `cwd` is one immediate `workspace-*` child of the canonical root. Matching transient Workspace rows are presentation-suppressed, so retained old registrations do not create duplicate sidebar groups.
5. The group row's `+` is the only dedicated creation action. The plugin does not register a sidebar footer button.

“Temporary” means not tied to an existing project; it does not mean delete-on-close. Adopted directories and Session logs remain available across restarts.

## Configuration

`root` is the parent for isolated temporary Session directories:

```yaml
- insert:
    - id: temporary-workspace
      name: dsh-temporary-workspace
      config:
        root: !!js dshHomePath('temporary-workspaces')
        reservationRetentionMs: 3600000
```

The default is `$DSH_HOME/temporary-workspaces`, normally `~/.dsh/temporary-workspaces`. It can be edited live under **Settings → Plugins → Temporary Workspace**. A new root affects future creation and the contributed group matcher; existing Sessions, Workspaces, and files are not migrated or deleted.

The Settings namespace is `temporary-workspace`. `reservationRetentionMs` is the grace for an unadopted crash-window reservation: one hour by default, with a one-minute minimum.

## Plugin integration

Background products use the same `reserve` / create / `adopt` transaction. Cleanup accepts only the opaque reservation id; callers cannot submit an arbitrary deletion path. `prepareGroup()` returns the canonical configured root for the Client projection.

## Installation

This release requires a DSH build that provides the `uiWorkspace.registerSessionGroup()` Client API.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack:plugin
dsh plugin --profile web add "$PWD/artifacts/dsh-temporary-workspace-0.1.0-rc.6.tgz"
```

Prerelease versions are published under the npm `next` tag. Restart the DSH Web process after installation or upgrade.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

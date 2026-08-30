/** Browser half: contribute one fold for isolated temporary Sessions. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import temporaryWorkspaceRemote from 'dsh-temporary-workspace/remote'
import { registerTemporaryWorkspaceSettingsCard, type TemporaryWorkspaceSettingsPort } from './settings-card.tsx'
import { startTemporaryWorkspace } from './workflow.ts'
import type {
  RemoteResult,
  TemporaryWorkspaceNavigationPort,
  TemporaryWorkspaceRegistryPort,
} from './workflow.ts'
import { dictionaries, NS } from './locales.ts'

export { startTemporaryWorkspace } from './workflow.ts'
export type {
  TemporaryWorkspaceDiagnostics,
  TemporaryWorkspaceNavigationPort,
  TemporaryWorkspaceRegistryPort,
  TemporaryWorkspaceRemotePort,
  TemporaryWorkspaceStartResult,
} from './workflow.ts'

interface TemporarySessionGroupUiPort<SessionId> {
  registerSessionGroup(spec: {
    id: string
    label: string
    cwd: { parent: string; immediateChildPrefix: string }
    createSession: () => Promise<SessionId>
  }): () => void
}

interface TemporaryWorkspaceGroupRemote {
  prepareGroup(): Promise<RemoteResult<{ root: string }>>
}

/** Runtime services used by the group, settings card, and generated Remote. */
export const inject = ['remote', 'workspaces', 'sessions', 'uiWorkspace', 'slots', 'locale']

/** Mount the Remote descriptor and contribute exactly one sidebar Session group. */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'temporary-workspace: locale dictionaries')
  const t = ctx.locale.bind(NS)
  const disposeRemote = await ctx.remote.$mount(temporaryWorkspaceRemote)
  const featureFiber = ctx.inject(['remote.temporaryWorkspaces', 'uiWorkspace'], (remoteCtx) => {
    const remote = remoteCtx.remote.temporaryWorkspaces
    const groupRemote = remote as unknown as TemporaryWorkspaceGroupRemote
    const uiWorkspace = (remoteCtx as typeof remoteCtx & {
      uiWorkspace: TemporarySessionGroupUiPort<string>
    }).uiWorkspace
    let unregisterGroup: (() => void) | undefined
    let registrationRevision = 0

    const registerGroup = async (): Promise<void> => {
      const revision = ++registrationRevision
      const prepared = await groupRemote.prepareGroup()
      if (!prepared.ok) {
        throw new Error(
          `temporary Workspace group preparation failed: ${prepared.error.code}: ${prepared.error.message}`,
        )
      }
      if (revision !== registrationRevision) return
      unregisterGroup?.()
      unregisterGroup = undefined
      const nextDispose = uiWorkspace.registerSessionGroup({
        id: 'temporary-workspace',
        label: t('title'),
        cwd: { parent: prepared.value.root, immediateChildPrefix: 'workspace-' },
        createSession: async () => {
          const result = await startTemporaryWorkspace<string, string>({
            remote,
            // The running DSH API includes these methods; this plugin still
            // supports the older RC declarations used by its publish build.
            workspaces: remoteCtx.workspaces as unknown as TemporaryWorkspaceRegistryPort<string>,
            sessions: remoteCtx.sessions as unknown as TemporaryWorkspaceNavigationPort<string, string>,
          })
          return String(result.sessionId)
        },
      })
      unregisterGroup = nextDispose
    }

    const settingsPort: TemporaryWorkspaceSettingsPort = {
      describeSettings: () => remote.describeSettings(),
      pickRoot: () => remote.pickRoot(),
      saveSettings: async (request) => {
        const result = await remote.saveSettings(request)
        if (result.ok) {
          try {
            await registerGroup()
          } catch (error) {
            console.error('[temporary-workspace] Session group refresh failed:', error)
          }
        }
        return result
      },
    }
    registerTemporaryWorkspaceSettingsCard(remoteCtx, settingsPort, t)
    void registerGroup().catch((error: unknown) => {
      console.error('[temporary-workspace] Session group registration failed:', error)
    })
    remoteCtx.effect(
      () => () => {
        registrationRevision += 1
        unregisterGroup?.()
        unregisterGroup = undefined
      },
      'temporary-workspace: contributed Session group',
    )
  })
  await featureFiber

  return disposeRemote
}

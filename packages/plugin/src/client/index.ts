/** Browser half: create isolated temporary Workspaces and expose their settings UI. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import temporaryWorkspaceRemote from 'dsh-temporary-workspace/remote'
import { registerTemporaryWorkspaceSettingsCard, type TemporaryWorkspaceSettingsPort } from './settings-card.tsx'
import { registerTemporaryWorkspaceSidebarAction } from './sidebar-action.tsx'
import { startTemporaryWorkspace } from './workflow.ts'
import { dictionaries, NS } from './locales.ts'

export { startTemporaryWorkspace } from './workflow.ts'
export type {
  TemporaryWorkspaceDiagnostics,
  TemporaryWorkspaceNavigationPort,
  TemporaryWorkspaceRegistryPort,
  TemporaryWorkspaceRemotePort,
  TemporaryWorkspaceStartResult,
} from './workflow.ts'

/** Runtime services used by the action and generated Remote contribution. */
export const inject = ['remote', 'workspaces', 'sessions', 'slots', 'locale']

/**
 * Mount the Remote descriptor and register the dedicated creation action.
 * @param ctx - Client Cordis root carrying Remote, Workspace, and Session services.
 * @returns disposer for the generated Remote contribution.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'temporary-workspace: locale dictionaries')
  const t = ctx.locale.bind(NS)
  const disposeRemote = await ctx.remote.$mount(temporaryWorkspaceRemote)
  const featureFiber = ctx.inject(['remote.temporaryWorkspaces'], (remoteCtx) => {
    const remote = remoteCtx.remote.temporaryWorkspaces
    registerTemporaryWorkspaceSettingsCard(
      remoteCtx,
      remote as unknown as TemporaryWorkspaceSettingsPort,
      t,
    )

    let pending: Promise<void> | undefined
    const start = (): Promise<void> => {
      pending ??= startTemporaryWorkspace({
        remote,
        workspaces: remoteCtx.workspaces,
        sessions: remoteCtx.sessions,
        title: t('title'),
      }).then(() => undefined).catch((error: unknown) => {
        console.error('[temporary-workspace] creation failed:', error)
      }).finally(() => { pending = undefined })
      return pending
    }

    registerTemporaryWorkspaceSidebarAction(remoteCtx, start, t)
  })
  await featureFiber

  return disposeRemote
}

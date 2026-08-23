/** Browser half: prepare the fixed temporary Workspace and its settings UI. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import temporarySessionRemote from 'dsh-temporary-session/remote'
import { registerTemporarySessionSettingsCard, type TemporarySessionSettingsPort } from './settings-card.tsx'
import { ensureTemporaryWorkspace, startTemporarySession } from './workflow.ts'
import { dictionaries, LEGACY_TEMPORARY_WORKSPACE_TITLES, NS } from './locales.ts'

export { ensureTemporaryWorkspace, startTemporarySession } from './workflow.ts'
export type {
  TemporarySessionNavigationPort,
  TemporarySessionRemotePort,
  TemporarySessionStartResult,
  TemporarySessionWorkspacePort,
  TemporarySessionWorkspaceResult,
} from './workflow.ts'

// Kept here as well as in the compatible ui-sidebar contract so the plugin
// can be built against the rc.6 public packages while targeting the patched
// shell that emits this event.
declare module '@deepseek-ai/cordis' {
  interface Events {
    /** @mode bail */
    'sidebar/new-session'(): true | void
  }
}

/** Runtime services used by the action and generated Remote contribution. */
export const inject = ['remote', 'workspaces', 'sessions', 'slots', 'locale']

/**
 * Mount the Remote descriptor, prepare the Workspace row, and retain the
 * optional legacy unscoped New Session seam.
 * @param ctx - Client Cordis root carrying Remote, Workspace, and Session services.
 * @returns disposer for the generated Remote contribution.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'temporary-session: locale dictionaries')
  const t = ctx.locale.bind(NS)
  const disposeRemote = await ctx.remote.$mount(temporarySessionRemote)
  const featureFiber = ctx.inject(['remote.temporarySessions'], (remoteCtx) => {
    const remote = remoteCtx.remote.temporarySessions
    registerTemporarySessionSettingsCard(
      remoteCtx,
      remote as unknown as TemporarySessionSettingsPort,
      t,
    )

    // The standard Workspace row already owns its New Session control. Ensure
    // that row exists on startup and keep this special-purpose group last.
    void ensureTemporaryWorkspace({
      remote,
      workspaces: remoteCtx.workspaces,
      title: t('title'),
      legacyTitles: LEGACY_TEMPORARY_WORKSPACE_TITLES,
    }).catch((error: unknown) => {
      console.error('[temporary-session] Workspace preparation failed:', error)
    })

    let pending: Promise<void> | undefined
    const start = (): Promise<void> => {
      pending ??= startTemporarySession({
        remote,
        workspaces: remoteCtx.workspaces,
        sessions: remoteCtx.sessions,
        title: t('title'),
        legacyTitles: LEGACY_TEMPORARY_WORKSPACE_TITLES,
      }).then(() => undefined).catch((error: unknown) => {
        console.error('[temporary-session] creation failed:', error)
      }).finally(() => { pending = undefined })
      return pending
    }

    // Older patched shells may also offer the original unscoped New Session
    // interception seam. Current shells use the fixed Workspace row above.
    remoteCtx.on('sidebar/new-session', () => {
      void start()
      return true
    })
  })
  await featureFiber

  return disposeRemote
}

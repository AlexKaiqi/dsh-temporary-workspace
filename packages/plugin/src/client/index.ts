/** Browser half: claim the shell's existing New Session action. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import temporarySessionRemote from 'dsh-temporary-session/remote'
import { startTemporarySession } from './workflow.ts'

export { startTemporarySession } from './workflow.ts'
export type {
  TemporarySessionDiagnostics,
  TemporarySessionNavigationPort,
  TemporarySessionRemotePort,
  TemporarySessionStartResult,
  TemporarySessionWorkspacePort,
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
export const inject = ['remote', 'workspaces', 'sessions']

/**
 * Mount the Remote descriptor and claim every unscoped New Session click.
 * @param ctx - Client Cordis root carrying Remote, Workspace, and Session services.
 * @returns disposer for the generated Remote contribution.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(temporarySessionRemote)

  let pending: Promise<void> | undefined
  ctx.on('sidebar/new-session', () => {
    pending ??= startTemporarySession({
      remote: ctx.remote.temporarySessions,
      workspaces: ctx.workspaces,
      sessions: ctx.sessions,
    }).then(() => undefined).catch((error: unknown) => {
      console.error('[temporary-session] creation failed:', error)
    }).finally(() => { pending = undefined })
    return true
  })

  return disposeRemote
}

/** Sidebar action that creates one isolated temporary Workspace. */

import { useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { TemporaryWorkspaceTranslate } from './locales.ts'

interface TemporaryWorkspaceActionFace {
  start: () => Promise<void>
  t: TemporaryWorkspaceTranslate
}

type TemporaryWorkspaceActionProps = PropsRuntime<'sidebar.footer.action'> & InjectFace<TemporaryWorkspaceActionFace>

function TemporaryWorkspaceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path d="M8 2.25v2.1M8 11.65v2.1M2.25 8h2.1M11.65 8h2.1M3.94 3.94l1.48 1.48M10.58 10.58l1.48 1.48M12.06 3.94l-1.48 1.48M5.42 10.58l-1.48 1.48" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2.15" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  )
}

export function TemporaryWorkspaceSidebarAction({ wide, start, t }: TemporaryWorkspaceActionProps) {
  const [busy, setBusy] = useState(false)
  const label = t('title')
  return (
    <button
      type="button"
      className="temporary-workspace-sidebar-action"
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={() => {
        if (busy) return
        setBusy(true)
        void start().catch((error: unknown) => {
          console.error('[temporary-workspace] creation failed:', error)
        }).finally(() => { setBusy(false) })
      }}
    >
      <TemporaryWorkspaceIcon />
      {wide && <span>{busy ? `${label}…` : label}</span>}
    </button>
  )
}

const CSS = `
.temporary-workspace-sidebar-action{width:100%;min-height:34px;display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:7px 10px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
.temporary-workspace-sidebar-action:hover{background:var(--sidebar-hover,rgba(127,127,127,.12))}.temporary-workspace-sidebar-action:disabled{opacity:.55;cursor:default}.temporary-workspace-sidebar-action svg{flex:0 0 auto}
`

/** Register the dedicated creation action into the current Sidebar footer. */
export function registerTemporaryWorkspaceSidebarAction(
  ctx: ClientContext,
  start: () => Promise<void>,
  t: TemporaryWorkspaceTranslate,
): void {
  if (typeof document !== 'undefined') {
    ctx.effect(() => {
      const style = document.createElement('style')
      style.dataset.plugin = 'temporary-workspace-sidebar-action'
      style.textContent = CSS
      document.head.append(style)
      return () => style.remove()
    }, 'temporary-workspace: sidebar action styles')
  }
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'temporary-workspace',
    order: 0,
    locale: 'temporaryWorkspace',
    inject: () => ({ start, t }),
  }, TemporaryWorkspaceSidebarAction))
}

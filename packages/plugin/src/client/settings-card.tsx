/** Settings-page card for choosing the configurable temporary Workspace directory. */

import type { ClientContext, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {
  TemporaryWorkspaceRootPickResult,
  TemporaryWorkspaceSettingsSaveRequest,
  TemporaryWorkspaceSettingsView,
} from '../types.ts'
import type { RemoteResult } from './workflow.ts'
import type { TemporaryWorkspaceTranslate } from './locales.ts'

export interface TemporaryWorkspaceSettingsPort {
  describeSettings: () => Promise<RemoteResult<TemporaryWorkspaceSettingsView>>
  saveSettings: (request: TemporaryWorkspaceSettingsSaveRequest) => Promise<RemoteResult<TemporaryWorkspaceSettingsView>>
  pickRoot: () => Promise<RemoteResult<TemporaryWorkspaceRootPickResult>>
}

interface SettingsCardState {
  readonly status: 'loading' | 'ready' | 'error'
  readonly revision: number
  readonly writable: boolean
  readonly pickerSupported: boolean
  readonly defaultRoot: string
  readonly draftRoot: string
  readonly persistedRoot: string
  readonly saving: boolean
  readonly picking: boolean
  readonly error: string | undefined
}

interface SettingsCardFace {
  hooks: { temporaryWorkspaceSettings: SnapshotStore<SettingsCardState> }
  t: TemporaryWorkspaceTranslate
  edit: (root: string) => void
  save: () => void
  reload: () => void
  pick: () => void
  useDefault: () => void
}

type SettingsCardProps = PropsRuntime<'settings.plugin.item'> & InjectFace<SettingsCardFace>

const INITIAL_STATE: SettingsCardState = {
  status: 'loading',
  revision: 0,
  writable: false,
  pickerSupported: false,
  defaultRoot: '',
  draftRoot: '',
  persistedRoot: '',
  saving: false,
  picking: false,
  error: undefined,
}

/** Small root-scope store; avoids loading the browser runtime in source-level Node tests. */
function createSettingsStore<T>(initial: T): SnapshotStore<T> {
  let value = initial
  const listeners = new Set<() => void>()
  const publish = () => { for (const listener of listeners) listener() }
  return {
    getSnapshot: () => value,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: (next) => {
      value = next
      publish()
    },
    update: (mutator) => {
      const next = structuredClone(value)
      mutator(next)
      value = next
      publish()
    },
  }
}

export class TemporaryWorkspaceSettingsController {
  private state = INITIAL_STATE
  private readonly store = createSettingsStore(this.state)

  constructor(
    private readonly remote: TemporaryWorkspaceSettingsPort,
    private readonly t: TemporaryWorkspaceTranslate,
  ) {
    void this.reload()
  }

  inject(): SettingsCardFace {
    return {
      hooks: { temporaryWorkspaceSettings: this.store },
      t: this.t,
      edit: root => this.publish({ draftRoot: root, error: undefined }),
      save: () => { void this.save() },
      reload: () => { void this.reload() },
      pick: () => { void this.pick() },
      useDefault: () => this.publish({ draftRoot: this.state.defaultRoot, error: undefined }),
    }
  }

  private publish(patch: Partial<SettingsCardState>): void {
    this.state = { ...this.state, ...patch }
    this.store.set(this.state)
  }

  private accept(view: TemporaryWorkspaceSettingsView): void {
    this.publish({
      status: 'ready',
      revision: view.revision,
      writable: view.writable,
      pickerSupported: view.pickerSupported,
      defaultRoot: view.defaultRoot,
      draftRoot: view.root,
      persistedRoot: view.root,
      saving: false,
      picking: false,
      error: undefined,
    })
  }

  private async reload(): Promise<void> {
    this.publish({ status: 'loading', error: undefined })
    const result = await this.remote.describeSettings()
    if (result.ok) this.accept(result.value)
    else this.publish({ status: 'error', saving: false, picking: false, error: result.error.message })
  }

  private async save(): Promise<void> {
    if (this.state.saving || !this.state.writable || this.state.draftRoot === this.state.persistedRoot) return
    this.publish({ saving: true, error: undefined })
    const result = await this.remote.saveSettings({
      expectedRevision: this.state.revision,
      root: this.state.draftRoot,
    })
    if (result.ok) this.accept(result.value)
    else this.publish({ saving: false, error: result.error.message })
  }

  private async pick(): Promise<void> {
    if (this.state.picking || !this.state.pickerSupported) return
    this.publish({ picking: true, error: undefined })
    const result = await this.remote.pickRoot()
    if (!result.ok) {
      this.publish({ picking: false, error: result.error.message })
      return
    }
    this.publish({
      pickerSupported: result.value.supported,
      picking: false,
      ...(result.value.path === null ? {} : { draftRoot: result.value.path }),
    })
  }
}

function TemporaryWorkspaceSettingsCard(props: SettingsCardProps) {
  const state = props.useTemporaryWorkspaceSettings(snapshot => snapshot)
  if (state.status === 'loading') return <li className="temporary-workspace-settings"><p>{props.t('loading')}</p></li>
  if (state.status === 'error') {
    return <li className="temporary-workspace-settings"><p className="temporary-workspace-error">{state.error}</p><button onClick={props.reload}>{props.t('retry')}</button></li>
  }
  const dirty = state.draftRoot !== state.persistedRoot
  const disabled = !state.writable || state.saving
  return (
    <li className="temporary-workspace-settings">
      <div className="temporary-workspace-heading">
        <div><h3>{props.t('title')}</h3><p>{props.t('description')}</p></div>
      </div>
      <label className="temporary-workspace-field">
        <span>{props.t('root')}</span>
        <div className="temporary-workspace-path-row">
          <input type="text" value={state.draftRoot} disabled={disabled} onChange={event => props.edit(event.target.value)} placeholder={state.defaultRoot} />
          {state.pickerSupported && <button type="button" disabled={disabled || state.picking} onClick={props.pick}>{state.picking ? props.t('picking') : props.t('choose')}</button>}
        </div>
        <small>{props.t('rootHint')} <code>{state.defaultRoot}</code></small>
      </label>
      {state.error !== undefined && <p className="temporary-workspace-error">{state.error}</p>}
      <div className="temporary-workspace-actions">
        <button type="button" disabled={disabled || state.draftRoot === state.defaultRoot} onClick={props.useDefault}>{props.t('default')}</button>
        <button type="button" disabled={!dirty || state.saving} onClick={props.reload}>{props.t('discard')}</button>
        <button type="button" className="temporary-workspace-primary" disabled={!dirty || disabled} onClick={props.save}>{state.saving ? props.t('saving') : props.t('save')}</button>
      </div>
    </li>
  )
}

const CSS = `
.temporary-workspace-settings{list-style:none;border:1px solid var(--border-color,#d9d9d9);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:16px;background:var(--card-background,transparent)}
.temporary-workspace-heading h3{margin:0 0 4px;font-size:16px}.temporary-workspace-heading p{margin:0;color:var(--text-secondary,#666);font-size:13px}
.temporary-workspace-field{display:flex;flex-direction:column;gap:6px;font-size:13px}.temporary-workspace-field>span{font-weight:600}.temporary-workspace-field small{color:var(--text-secondary,#666);line-height:1.45}.temporary-workspace-field code{overflow-wrap:anywhere}
.temporary-workspace-path-row{display:flex;gap:8px}.temporary-workspace-path-row input{min-width:0;flex:1;font:inherit;color:inherit;background:var(--input-background,transparent);border:1px solid var(--border-color,#ccc);border-radius:8px;padding:8px 10px}
.temporary-workspace-path-row button,.temporary-workspace-actions button,.temporary-workspace-settings>button{border-radius:8px;padding:8px 14px;border:1px solid var(--border-color,#ccc);background:transparent;color:inherit;font:inherit;cursor:pointer;white-space:nowrap}.temporary-workspace-actions{display:flex;justify-content:flex-end;gap:8px}.temporary-workspace-primary{background:var(--accent-color,#1677ff)!important;color:#fff!important;border-color:transparent!important}.temporary-workspace-settings button:disabled{opacity:.5;cursor:default}.temporary-workspace-error{color:#c62828;margin:0;font-size:13px}@media(max-width:700px){.temporary-workspace-path-row{align-items:stretch;flex-direction:column}.temporary-workspace-actions{flex-wrap:wrap}}
`

/** Register the card under Settings → Plugins. */
export function registerTemporaryWorkspaceSettingsCard(
  ctx: ClientContext,
  remote: TemporaryWorkspaceSettingsPort,
  t: TemporaryWorkspaceTranslate,
): void {
  if (typeof document !== 'undefined') {
    ctx.effect(() => {
      const style = document.createElement('style')
      style.dataset.plugin = 'temporary-workspace'
      style.textContent = CSS
      document.head.append(style)
      return () => style.remove()
    }, 'temporary-workspace: settings styles')
  }
  const controller = new TemporaryWorkspaceSettingsController(remote, t)
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: 'temporary-workspace',
    priority: 35,
    locale: 'temporaryWorkspace',
    inject: () => controller.inject(),
  }, TemporaryWorkspaceSettingsCard))
}

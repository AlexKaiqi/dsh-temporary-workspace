/** Settings-page card for choosing the temporary Session parent directory. */

import type { ClientContext, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {
  TemporarySessionRootPickResult,
  TemporarySessionSettingsSaveRequest,
  TemporarySessionSettingsView,
} from '../types.ts'
import type { RemoteResult } from './workflow.ts'
import type { TemporarySessionTranslate } from './locales.ts'

export interface TemporarySessionSettingsPort {
  describeSettings: () => Promise<RemoteResult<TemporarySessionSettingsView>>
  saveSettings: (request: TemporarySessionSettingsSaveRequest) => Promise<RemoteResult<TemporarySessionSettingsView>>
  pickRoot: () => Promise<RemoteResult<TemporarySessionRootPickResult>>
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
  hooks: { temporarySessionSettings: SnapshotStore<SettingsCardState> }
  t: TemporarySessionTranslate
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

export class TemporarySessionSettingsController {
  private state = INITIAL_STATE
  private readonly store = createSettingsStore(this.state)

  constructor(
    private readonly remote: TemporarySessionSettingsPort,
    private readonly t: TemporarySessionTranslate,
  ) {
    void this.reload()
  }

  inject(): SettingsCardFace {
    return {
      hooks: { temporarySessionSettings: this.store },
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

  private accept(view: TemporarySessionSettingsView): void {
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

function TemporarySessionSettingsCard(props: SettingsCardProps) {
  const state = props.useTemporarySessionSettings(snapshot => snapshot)
  if (state.status === 'loading') return <li className="temporary-session-settings"><p>{props.t('loading')}</p></li>
  if (state.status === 'error') {
    return <li className="temporary-session-settings"><p className="temporary-session-error">{state.error}</p><button onClick={props.reload}>{props.t('retry')}</button></li>
  }
  const dirty = state.draftRoot !== state.persistedRoot
  const disabled = !state.writable || state.saving
  return (
    <li className="temporary-session-settings">
      <div className="temporary-session-heading">
        <div><h3>{props.t('title')}</h3><p>{props.t('description')}</p></div>
      </div>
      <label className="temporary-session-field">
        <span>{props.t('root')}</span>
        <div className="temporary-session-path-row">
          <input type="text" value={state.draftRoot} disabled={disabled} onChange={event => props.edit(event.target.value)} placeholder={state.defaultRoot} />
          {state.pickerSupported && <button type="button" disabled={disabled || state.picking} onClick={props.pick}>{state.picking ? props.t('picking') : props.t('choose')}</button>}
        </div>
        <small>{props.t('rootHint')} <code>{state.defaultRoot}</code></small>
      </label>
      {state.error !== undefined && <p className="temporary-session-error">{state.error}</p>}
      <div className="temporary-session-actions">
        <button type="button" disabled={disabled || state.draftRoot === state.defaultRoot} onClick={props.useDefault}>{props.t('default')}</button>
        <button type="button" disabled={!dirty || state.saving} onClick={props.reload}>{props.t('discard')}</button>
        <button type="button" className="temporary-session-primary" disabled={!dirty || disabled} onClick={props.save}>{state.saving ? props.t('saving') : props.t('save')}</button>
      </div>
    </li>
  )
}

const CSS = `
.temporary-session-settings{list-style:none;border:1px solid var(--border-color,#d9d9d9);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:16px;background:var(--card-background,transparent)}
.temporary-session-heading h3{margin:0 0 4px;font-size:16px}.temporary-session-heading p{margin:0;color:var(--text-secondary,#666);font-size:13px}
.temporary-session-field{display:flex;flex-direction:column;gap:6px;font-size:13px}.temporary-session-field>span{font-weight:600}.temporary-session-field small{color:var(--text-secondary,#666);line-height:1.45}.temporary-session-field code{overflow-wrap:anywhere}
.temporary-session-path-row{display:flex;gap:8px}.temporary-session-path-row input{min-width:0;flex:1;font:inherit;color:inherit;background:var(--input-background,transparent);border:1px solid var(--border-color,#ccc);border-radius:8px;padding:8px 10px}
.temporary-session-path-row button,.temporary-session-actions button,.temporary-session-settings>button{border-radius:8px;padding:8px 14px;border:1px solid var(--border-color,#ccc);background:transparent;color:inherit;font:inherit;cursor:pointer;white-space:nowrap}.temporary-session-actions{display:flex;justify-content:flex-end;gap:8px}.temporary-session-primary{background:var(--accent-color,#1677ff)!important;color:#fff!important;border-color:transparent!important}.temporary-session-settings button:disabled{opacity:.5;cursor:default}.temporary-session-error{color:#c62828;margin:0;font-size:13px}@media(max-width:700px){.temporary-session-path-row{align-items:stretch;flex-direction:column}.temporary-session-actions{flex-wrap:wrap}}
`

/** Register the card under Settings → Plugins. */
export function registerTemporarySessionSettingsCard(
  ctx: ClientContext,
  remote: TemporarySessionSettingsPort,
  t: TemporarySessionTranslate,
): void {
  if (typeof document !== 'undefined') {
    ctx.effect(() => {
      const style = document.createElement('style')
      style.dataset.plugin = 'temporary-session'
      style.textContent = CSS
      document.head.append(style)
      return () => style.remove()
    }, 'temporary-session: settings styles')
  }
  const controller = new TemporarySessionSettingsController(remote, t)
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: 'temporary-session',
    priority: 35,
    locale: 'temporarySession',
    inject: () => controller.inject(),
  }, TemporarySessionSettingsCard))
}

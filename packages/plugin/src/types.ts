/** A Host-owned directory not yet adopted by a temporary Workspace. */
export interface TemporaryWorkspaceReservation {
  /** Opaque capability used only to adopt, retain, or discard this reservation. */
  readonly reservationId: string
  /** Absolute Host path that the ordinary Workspace API can adopt. */
  readonly path: string
}

/** Reference to one outstanding temporary-Workspace reservation. */
export interface TemporaryWorkspaceReservationRef {
  readonly reservationId: string
}

/** A created Session adopting the reserved directory as its Workspace. */
export interface TemporaryWorkspaceAdoptionRef extends TemporaryWorkspaceReservationRef {
  readonly sessionId: string
}

/** Result of registering and attaching an adopted temporary Workspace. */
export interface TemporaryWorkspaceAdoptionResult {
  readonly found: boolean
  readonly workspaceId?: string
}

/** Result of retiring one outstanding reservation. */
export interface TemporaryWorkspaceReservationResult {
  readonly found: boolean
}

/** Result of reclaiming reservations abandoned by a crashed Host process. */
export interface TemporaryWorkspaceSweepResult {
  /** How many abandoned reservations were reclaimed. */
  readonly reclaimed: number
}

/** Revision-fenced settings view consumed by the Web plugin card. */
export interface TemporaryWorkspaceSettingsView {
  readonly revision: number
  readonly writable: boolean
  readonly pickerSupported: boolean
  readonly defaultRoot: string
  readonly root: string
}

/** One full settings save from the Web card. */
export interface TemporaryWorkspaceSettingsSaveRequest {
  readonly expectedRevision: number
  readonly root: string
}

/** Native directory-picker outcome; null means the operator cancelled. */
export interface TemporaryWorkspaceRootPickResult {
  readonly supported: boolean
  readonly path: string | null
}

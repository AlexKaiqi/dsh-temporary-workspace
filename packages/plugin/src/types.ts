/** A Host-owned scratch directory that has not yet been adopted by a Session. */
export interface TemporarySessionReservation {
  /** Opaque capability used only to keep or discard this reservation. */
  readonly reservationId: string
  /** Absolute Host path that the ordinary Workspace API can adopt. */
  readonly path: string
}

/** Reference to one outstanding scratch-directory reservation. */
export interface TemporarySessionReservationRef {
  readonly reservationId: string
}

/** Result of retiring one outstanding reservation. */
export interface TemporarySessionReservationResult {
  readonly found: boolean
}

/** Result of reclaiming reservations abandoned by a crashed Host process. */
export interface TemporarySessionSweepResult {
  /** How many abandoned reservation directories were removed. */
  readonly reclaimed: number
}

/** Revision-fenced settings view consumed by the Web plugin card. */
export interface TemporarySessionSettingsView {
  readonly revision: number
  readonly writable: boolean
  readonly pickerSupported: boolean
  readonly defaultRoot: string
  readonly root: string
}

/** One full settings save from the Web card. */
export interface TemporarySessionSettingsSaveRequest {
  readonly expectedRevision: number
  readonly root: string
}

/** Native directory-picker outcome; null means the operator cancelled. */
export interface TemporarySessionRootPickResult {
  readonly supported: boolean
  readonly path: string | null
}

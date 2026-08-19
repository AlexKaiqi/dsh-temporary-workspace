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

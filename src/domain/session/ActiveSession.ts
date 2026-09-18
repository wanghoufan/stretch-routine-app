import type { RunnerState } from './RunnerState';

/**
 * The authoritative state required to continue a running routine (PLAN §5).
 *
 * Binding rules:
 * 1. Remaining time is computed from timestamps, never from a counter.
 * 2. UI tick frequency is presentation only.
 * 3. TTS callbacks never advance time.
 * 4. Pause freezes effective elapsed time via `accumulatedPauseMs`.
 * 5. Resume extends `accumulatedPauseMs`; `phaseStartedAtEpochMs` never moves.
 * 6. Background/foreground reconstruction reads this record only.
 */
export interface ActiveSession {
  sessionId: string;
  routineId: string;
  state: RunnerState;
  /**
   * Index into the routine's ordered steps.
   *
   * During a transition this is the index of the *upcoming* step, so the
   * runner can show "下一个" while the transition counts down.
   */
  currentStepIndex: number;

  /** When the current phase (step or transition) started. `null` when idle. */
  phaseStartedAtEpochMs: number | null;
  /** Set while paused; cleared on resume. */
  pausedAtEpochMs: number | null;
  /** Total completed pause time earlier in this routine. */
  accumulatedPauseMs: number;

  effectiveStepDurationMs: number;
  effectiveTransitionDurationMs: number;

  /** Runtime-only extension (e.g. +10s). Never written back to the routine. */
  runtimeExtensionMs: number;

  /** Routine time already finished before the current phase. */
  completedPhaseMs: number;

  updatedAtEpochMs: number;
}

export interface ActiveSessionInput {
  sessionId: string;
  routineId: string;
  state: RunnerState;
  currentStepIndex: number;
  phaseStartedAtEpochMs: number | null;
  pausedAtEpochMs: number | null;
  accumulatedPauseMs: number;
  effectiveStepDurationMs: number;
  effectiveTransitionDurationMs: number;
  runtimeExtensionMs: number;
  completedPhaseMs: number;
  updatedAtEpochMs: number;
}

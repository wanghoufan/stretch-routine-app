/** Validation bounds shared by the editor, the parser and the repositories. */

export const DURATION_MIN_SEC = 1;
export const DURATION_MAX_SEC = 3600;

/** Transition may be zero (SPEC edge cases). */
export const TRANSITION_MIN_SEC = 0;
export const TRANSITION_MAX_SEC = 600;

export const ROUTINE_NAME_MAX_LENGTH = 60;
export const STEP_NAME_MAX_LENGTH = 80;
export const SPEAK_TEXT_MAX_LENGTH = 200;

export const DEFAULT_STEP_DURATION_SEC = 30;
export const DEFAULT_TRANSITION_SEC = 5;

/** Runtime extension applied by the "+10 秒" control (PLAN §7). */
export const ADD_TIME_MS = 10_000;

/** Clamp a duration into the supported range. */
export function clampDuration(seconds: number): number {
  return clamp(seconds, DURATION_MIN_SEC, DURATION_MAX_SEC);
}

export function clampTransition(seconds: number): number {
  return clamp(seconds, TRANSITION_MIN_SEC, TRANSITION_MAX_SEC);
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

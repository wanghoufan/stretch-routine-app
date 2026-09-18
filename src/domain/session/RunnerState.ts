/**
 * Explicit runner state machine (Constitution §3.2, PLAN §5).
 *
 * A reduced set of states is allowed only when behaviour stays explicit and
 * testable — these are the states used by V1.
 */
export type RunnerState =
  | 'IDLE'
  | 'PREPARING'
  | 'RUNNING_STEP'
  | 'RUNNING_TRANSITION'
  | 'PAUSED_STEP'
  | 'PAUSED_TRANSITION'
  | 'COMPLETED'
  | 'STOPPED'
  | 'ERROR';

export const RUNNING_STATES: readonly RunnerState[] = ['RUNNING_STEP', 'RUNNING_TRANSITION'];

export const PAUSED_STATES: readonly RunnerState[] = ['PAUSED_STEP', 'PAUSED_TRANSITION'];

export const ACTIVE_STATES: readonly RunnerState[] = [
  'PREPARING',
  'RUNNING_STEP',
  'RUNNING_TRANSITION',
  'PAUSED_STEP',
  'PAUSED_TRANSITION',
];

export const TERMINAL_STATES: readonly RunnerState[] = ['COMPLETED', 'STOPPED', 'ERROR'];

export function isRunning(state: RunnerState): boolean {
  return RUNNING_STATES.includes(state);
}

export function isPaused(state: RunnerState): boolean {
  return PAUSED_STATES.includes(state);
}

export function isActive(state: RunnerState): boolean {
  return ACTIVE_STATES.includes(state);
}

export function isTerminal(state: RunnerState): boolean {
  return TERMINAL_STATES.includes(state);
}

/** The paused counterpart of a running phase, and vice versa. */
export function togglePauseState(state: RunnerState): RunnerState {
  switch (state) {
    case 'RUNNING_STEP':
      return 'PAUSED_STEP';
    case 'RUNNING_TRANSITION':
      return 'PAUSED_TRANSITION';
    case 'PAUSED_STEP':
      return 'RUNNING_STEP';
    case 'PAUSED_TRANSITION':
      return 'RUNNING_TRANSITION';
    default:
      return state;
  }
}

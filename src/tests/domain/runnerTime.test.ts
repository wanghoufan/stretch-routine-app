import { startRunner } from '../../features/runner/domain/runnerMachine';
import {
  currentStep,
  phaseElapsedMs,
  plannedCompletedMsBefore,
  remainingMs,
  routineElapsedMs,
  routineTotalMs,
  routineProgress,
  upcomingStep,
} from '../../features/runner/domain/runnerTime';
import { makeSteps } from '../support/fixtures';

const steps = makeSteps([
  ['A', 10, 5],
  ['B', 20, 0],
  ['C', 30, 0],
]);

function start(nowElapsedMs = 0) {
  return startRunner({
    sessionId: 's1',
    routineId: 'r1',
    routineName: '测试流程',
    steps,
    nowElapsedMs,
    wallMs: 0,
    bootCount: 1,
  }).session;
}

describe('runner timing math (T038)', () => {
  it('derives elapsed time from timestamps', () => {
    const session = start(1_000);
    expect(phaseElapsedMs(session, 1_000)).toBe(0);
    expect(phaseElapsedMs(session, 4_000)).toBe(3_000);
    expect(remainingMs(session, 4_000)).toBe(7_000);
  });

  it('never reports negative elapsed or remaining time', () => {
    const session = start(1_000);
    expect(phaseElapsedMs(session, 0)).toBe(0);
    expect(remainingMs(session, 999_999)).toBe(0);
  });

  it('freezes elapsed time while paused regardless of real time passing', () => {
    const session = { ...start(0), state: 'PAUSED_STEP' as const, pausedAtElapsedMs: 3_000 };
    expect(phaseElapsedMs(session, 3_000)).toBe(3_000);
    expect(phaseElapsedMs(session, 303_000)).toBe(3_000);
    expect(remainingMs(session, 303_000)).toBe(7_000);
  });

  it('subtracts accumulated pause time after a resume', () => {
    const session = start(0);
    const resumed = { ...session, accumulatedPauseMs: 60_000 };
    expect(phaseElapsedMs(resumed, 63_000)).toBe(3_000);
  });

  it('counts the elapsed part of the current phase into routine time', () => {
    const session = start(0);
    expect(routineElapsedMs(session, 4_000)).toBe(4_000);
    const mid = { ...session, completedPhaseMs: 15_000, currentStepIndex: 1 };
    expect(routineElapsedMs(mid, 4_000)).toBe(19_000);
  });

  it('reports planned total duration and progress', () => {
    const session = start(0);
    expect(routineTotalMs(steps)).toBe(65_000);
    expect(routineProgress(session, steps, 32_500)).toBeCloseTo(0.5, 5);
    expect(routineProgress(session, steps, 65_000)).toBe(1);
    expect(routineProgress(session, steps, 999_999)).toBe(1);
  });

  it('exposes current and upcoming steps, including during a transition', () => {
    const session = start(0);
    expect(currentStep(steps, session)?.displayName).toBe('A');
    expect(upcomingStep(steps, session)?.displayName).toBe('B');

    const inTransition = { ...session, state: 'RUNNING_TRANSITION' as const, currentStepIndex: 1 };
    expect(currentStep(steps, inTransition)?.displayName).toBe('B');
    expect(upcomingStep(steps, inTransition)?.displayName).toBe('B');
  });

  it('computes planned time before an index for Previous semantics', () => {
    expect(plannedCompletedMsBefore(steps, 0)).toBe(0);
    expect(plannedCompletedMsBefore(steps, 1)).toBe(15_000);
    expect(plannedCompletedMsBefore(steps, 2)).toBe(35_000);
  });
});

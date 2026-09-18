import {
  buildPhasePlan,
  totalDurationSec,
  totalStepDurationSec,
  totalTransitionDurationSec,
} from '../../domain/routine/duration';
import { makeSteps } from '../support/fixtures';

describe('routine duration (T023)', () => {
  it('counts transitions between steps but not after the final step', () => {
    const steps = makeSteps([
      ['A', 30, 5],
      ['B', 30, 5],
      ['C', 30, 5],
    ]);

    // 30 + 5 + 30 + 5 + 30 = 100 (no trailing transition)
    expect(totalDurationSec(steps)).toBe(100);
    expect(totalStepDurationSec(steps)).toBe(90);
    expect(totalTransitionDurationSec(steps)).toBe(10);
  });

  it('treats a zero transition as no transition', () => {
    const steps = makeSteps([
      ['A', 30, 0],
      ['B', 30],
    ]);
    expect(totalDurationSec(steps)).toBe(60);
    expect(buildPhasePlan(steps).map((phase) => phase.kind)).toEqual(['step', 'step']);
  });

  it('returns zero for an empty routine', () => {
    expect(totalDurationSec([])).toBe(0);
    expect(buildPhasePlan([])).toEqual([]);
  });

  it('reports a single step as just its duration', () => {
    const steps = makeSteps([['A', 45, 10]]);
    expect(totalDurationSec(steps)).toBe(45);
    expect(buildPhasePlan(steps)).toEqual([{ kind: 'step', stepIndex: 0, durationSec: 45 }]);
  });

  it('expands an ordered phase plan matching playback order', () => {
    const steps = makeSteps([
      ['A', 10, 5],
      ['B', 20, 0],
      ['C', 30, 5],
    ]);

    expect(buildPhasePlan(steps)).toEqual([
      { kind: 'step', stepIndex: 0, durationSec: 10 },
      { kind: 'transition', stepIndex: 0, durationSec: 5 },
      { kind: 'step', stepIndex: 1, durationSec: 20 },
      { kind: 'step', stepIndex: 2, durationSec: 30 },
    ]);
    expect(totalDurationSec(steps)).toBe(65);
  });
});

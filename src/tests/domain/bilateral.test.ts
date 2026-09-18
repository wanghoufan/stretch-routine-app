import type { Action } from '../../domain/action/Action';
import {
  buildBilateralNames,
  createBilateralStepDrafts,
  findPairMate,
  isPairedStep,
  isPairSymmetric,
  updatePairValues,
  updateSingleSide,
} from '../../domain/routine/bilateral';
import { createSequentialIdGenerator } from '../../shared/utils/id';

const trapezius: Pick<Action, 'id' | 'name' | 'defaultDurationSec' | 'defaultSpeakText'> = {
  id: 'act-1',
  name: '斜方肌拉伸',
  defaultDurationSec: 45,
};

function makePair() {
  const generateId = createSequentialIdGenerator('x');
  const drafts = createBilateralStepDrafts(trapezius, {
    transitionSec: 5,
    fallbackDurationSec: 30,
    generateId,
  });
  return drafts.map((draft) => ({ ...draft, routineId: 'routine-1', orderIndex: 0 }));
}

describe('bilateral step generation (T021)', () => {
  it('creates a predictable left/right name pair', () => {
    expect(buildBilateralNames('斜方肌拉伸')).toEqual({
      leftDisplayName: '斜方肌拉伸（左）',
      rightDisplayName: '斜方肌拉伸（右）',
      leftSpeakText: '左侧斜方肌拉伸',
      rightSpeakText: '右侧斜方肌拉伸',
    });
  });

  it('produces two ordered steps sharing one pairGroupId', () => {
    const [left, right] = makePair();

    expect(left?.side).toBe('left');
    expect(right?.side).toBe('right');
    expect(left?.pairGroupId).toBeTruthy();
    expect(left?.pairGroupId).toBe(right?.pairGroupId);
    expect(left?.id).not.toBe(right?.id);
  });

  it('snapshots the action duration and transition symmetrically', () => {
    const [left, right] = makePair();
    expect(left?.durationSec).toBe(45);
    expect(right?.durationSec).toBe(45);
    expect(left?.transitionSec).toBe(5);
    expect(right?.transitionSec).toBe(5);
  });

  it('uses the fallback duration when the action has none', () => {
    const drafts = createBilateralStepDrafts(
      { ...trapezius, defaultDurationSec: 0 },
      { transitionSec: 0, fallbackDurationSec: 30, generateId: createSequentialIdGenerator() },
    );
    expect(drafts[0]?.durationSec).toBe(30);
  });

  it('keeps sourceActionId as a snapshot reference, not a live link', () => {
    const [left] = makePair();
    expect(left?.sourceActionId).toBe('act-1');
  });

  it('finds the pair mate and reports symmetry', () => {
    const [left, right] = makePair();
    const steps = [left!, right!];

    expect(isPairedStep(left!)).toBe(true);
    expect(findPairMate(steps, left!)?.id).toBe(right!.id);
    expect(isPairSymmetric(steps, left!.pairGroupId!)).toBe(true);
  });

  it('updates both sides when the user chooses "edit both sides"', () => {
    const [left, right] = makePair();
    const steps = [left!, right!];
    const updated = updatePairValues(steps, left!.pairGroupId!, { durationSec: 60 });

    expect(updated.map((step) => step.durationSec)).toEqual([60, 60]);
    expect(isPairSymmetric(updated, left!.pairGroupId!)).toBe(true);
    // Names stay side-specific so left/right remain distinguishable.
    expect(updated.map((step) => step.displayName)).toEqual(
      steps.map((step) => step.displayName),
    );
  });

  it('preserves an intentional one-side override without breaking pair metadata', () => {
    const [left, right] = makePair();
    const steps = [left!, right!];
    const updated = updateSingleSide(steps, left!.id, { durationSec: 20, speakText: '左侧慢一点' });

    expect(updated[0]?.durationSec).toBe(20);
    expect(updated[1]?.durationSec).toBe(45);
    expect(updated[0]?.pairGroupId).toBe(left!.pairGroupId);
    expect(updated[1]?.pairGroupId).toBe(left!.pairGroupId);
    expect(isPairSymmetric(updated, left!.pairGroupId!)).toBe(false);
    expect(findPairMate(updated, updated[0]!)?.id).toBe(right!.id);
  });
});

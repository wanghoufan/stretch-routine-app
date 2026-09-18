import {
  BATCH_MAX_LINES,
  buildDraftsFromBatch,
  parseBatchActions,
  parseBatchActionsDetailed,
} from '../../features/routines/services/parseBatchActions';

describe('parseBatchActions (T019)', () => {
  it('turns each non-empty line into one step, in user order', () => {
    expect(parseBatchActions('肩部拉伸\n颈部拉伸\n胸部打开')).toEqual([
      '肩部拉伸',
      '颈部拉伸',
      '胸部打开',
    ]);
  });

  it('ignores blank-only lines and reports how many were dropped', () => {
    const result = parseBatchActionsDetailed('肩部拉伸\n\n   \n颈部拉伸\n');
    expect(result.names).toEqual(['肩部拉伸', '颈部拉伸']);
    expect(result.ignoredBlankLines).toBe(3);
  });

  it('handles CRLF and CR line endings', () => {
    expect(parseBatchActions('A\r\nB\rC')).toEqual(['A', 'B', 'C']);
  });

  it('trims surrounding whitespace but keeps inner spaces', () => {
    expect(parseBatchActions('  肩 部 拉伸  ')).toEqual(['肩 部 拉伸']);
  });

  it('allows duplicate names', () => {
    expect(parseBatchActions('拉伸\n拉伸')).toEqual(['拉伸', '拉伸']);
  });

  it('returns an empty list for empty input', () => {
    expect(parseBatchActions('')).toEqual([]);
    expect(parseBatchActions('  \n\n ')).toEqual([]);
  });

  it('caps an oversized paste and flags truncation', () => {
    const lines = Array.from({ length: BATCH_MAX_LINES + 5 }, (_, index) => `动作 ${index + 1}`);
    const result = parseBatchActionsDetailed(lines.join('\n'));
    expect(result.names).toHaveLength(BATCH_MAX_LINES);
    expect(result.truncated).toBe(true);
  });

  it('builds ordered drafts that snapshot the routine defaults', () => {
    const drafts = buildDraftsFromBatch(parseBatchActions('A\nB'), {
      defaultDurationSec: 45,
      defaultTransitionSec: 5,
    });

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ displayName: 'A', speakText: 'A', durationSec: 45, transitionSec: 5 });
    expect(drafts[1]).toMatchObject({ displayName: 'B', durationSec: 45 });
    expect(drafts[0]?.id).not.toBe(drafts[1]?.id);
    expect(drafts.every((draft) => draft.side === 'none')).toBe(true);
  });

  it('clamps an out-of-range default duration', () => {
    const drafts = buildDraftsFromBatch(['A'], {
      defaultDurationSec: 0,
      defaultTransitionSec: -5,
    });
    expect(drafts[0]?.durationSec).toBe(1);
    expect(drafts[0]?.transitionSec).toBe(0);
  });
});

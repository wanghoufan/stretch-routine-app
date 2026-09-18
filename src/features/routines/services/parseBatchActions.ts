import type { RoutineStepDraft } from '../../../domain/routine/RoutineStep';
import { clampDuration, clampTransition, STEP_NAME_MAX_LENGTH } from '../../../domain/routine/constants';
import { generateId, type IdGenerator } from '../../../shared/utils/id';

/**
 * Batch ("快速输入") parser — SPEC FR-004, US2 scenario 1.
 *
 * Rules:
 * - one non-empty line becomes one step;
 * - blank-only lines are ignored;
 * - user order is preserved;
 * - duplicate names are allowed (SPEC edge cases).
 */

/** Guard against a single paste turning into an unbounded routine. */
export const BATCH_MAX_LINES = 100;

export interface BatchParseResult {
  /** Trimmed, non-empty names in the order the user typed them. */
  names: string[];
  /** How many blank-only lines were dropped. */
  ignoredBlankLines: number;
  /** True when input exceeded {@link BATCH_MAX_LINES} and was truncated. */
  truncated: boolean;
}

export function parseBatchActionsDetailed(input: string): BatchParseResult {
  const rawLines = input.split(/\r\n|\r|\n/);
  const names: string[] = [];
  let ignoredBlankLines = 0;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      ignoredBlankLines += 1;
      continue;
    }
    names.push(trimmed);
  }

  const truncated = names.length > BATCH_MAX_LINES;
  return {
    names: truncated ? names.slice(0, BATCH_MAX_LINES) : names,
    ignoredBlankLines,
    truncated,
  };
}

/** Convenience wrapper returning just the ordered names. */
export function parseBatchActions(input: string): string[] {
  return parseBatchActionsDetailed(input).names;
}

export interface DraftDefaults {
  defaultDurationSec: number;
  defaultTransitionSec: number;
  generateId?: IdGenerator;
  /** Optional reusable-Action id when the names came from the library. */
  sourceActionId?: string;
}

/**
 * Turn parsed names into ordered draft steps. A new step snapshots the routine's
 * current default duration/transition and can be overridden individually later
 * (SPEC US2 scenarios 2 and 3).
 */
export function buildDraftsFromBatch(
  names: readonly string[],
  defaults: DraftDefaults,
): RoutineStepDraft[] {
  const nextId = defaults.generateId ?? generateId;
  const durationSec = clampDuration(defaults.defaultDurationSec);
  const transitionSec = clampTransition(defaults.defaultTransitionSec);

  return names.map((name) => ({
    id: nextId('step'),
    sourceActionId: defaults.sourceActionId,
    displayName: name.slice(0, STEP_NAME_MAX_LENGTH),
    speakText: name.slice(0, STEP_NAME_MAX_LENGTH),
    durationSec,
    transitionSec,
    side: 'none' as const,
  }));
}

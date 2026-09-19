/**
 * Action library grouping + dynamic body-part filtering (TASK-014 B-3, TASK-018 B-4).
 *
 * Pure functions only, so the mapping/filter rules are unit-testable without a
 * screen. The screen owns the active scene, collapse state and filter inputs.
 *
 * Scene rule (unchanged from B-3):
 *   category 含「热身」  -> 热身
 *   category 含「核心」  -> 核心训练
 *   其余（含无标签）    -> 拉伸
 *
 * HD-1=A: the body-part chips are single-choice and results are de-duplicated.
 * An Action matches a canonical part when its `bodypart` intersects that part,
 * so a multi-part Action appears under either part but only once per screen.
 */

import type { Action } from '../../../domain/action/Action';

export const ACTION_SCENES = ['拉伸', '热身', '核心训练'] as const;
export type ActionScene = (typeof ACTION_SCENES)[number];

export const BODY_PART_GROUPS = [
  '颈',
  '肩',
  '胸',
  '背',
  '腰腹',
  '髋臀',
  '腿',
  '小腿',
  '全身',
] as const;
export type CanonicalBodyPart = (typeof BODY_PART_GROUPS)[number];

export const ALL_BODY_PART = '全部' as const;
export const OTHER_BODY_PART = '其他' as const;

/** Single-select body-part filter: 全部 | a canonical part | 其他. */
export type BodyPartFilter = typeof ALL_BODY_PART | CanonicalBodyPart | typeof OTHER_BODY_PART;

/** Chip display order: 全部 → 颈…全身 → 其他. */
export const BODY_PART_FILTER_ORDER: readonly BodyPartFilter[] = [
  ALL_BODY_PART,
  ...BODY_PART_GROUPS,
  OTHER_BODY_PART,
];

export interface ActionFilters {
  /** Case-insensitive name substring; blank disables that leg. */
  query: string;
  /** Single-choice body part; only applied to the active scene. */
  bodyPart: BodyPartFilter;
}

export const DEFAULT_ACTION_FILTERS: ActionFilters = { query: '', bodyPart: ALL_BODY_PART };

export interface BodyPartChip {
  key: BodyPartFilter;
  /** Actions in the scene that this option would show. */
  count: number;
}

export interface ActionSceneGroup {
  scene: ActionScene;
  /** Stable testID / key, e.g. `library-group-拉伸`. */
  key: string;
  /** Unique Action cards currently shown in this scene. */
  count: number;
  actions: Action[];
}

export function sceneOfAction(action: Action): ActionScene {
  const categories = action.category ?? [];
  if (categories.includes('热身')) {
    return '热身';
  }
  if (categories.includes('核心')) {
    return '核心训练';
  }
  return '拉伸';
}

/** Canonical body-part groups this Action carries, in canonical order. */
export function bodyPartsOfAction(action: Action): CanonicalBodyPart[] {
  const bodyParts = action.bodypart ?? [];
  return BODY_PART_GROUPS.filter((group) => bodyParts.includes(group));
}

/** True when the Action has no canonical body part (untagged / unknown-only). */
export function isOtherBodyPartAction(action: Action): boolean {
  return bodyPartsOfAction(action).length === 0;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesActionQuery(action: Action, query: string): boolean {
  const normalized = normalizeQuery(query);
  return normalized.length === 0 || action.name.toLowerCase().includes(normalized);
}

/** Single-select match: 全部 always, 其他 = no canonical part, else intersection. */
export function matchesBodyPartFilter(action: Action, bodyPart: BodyPartFilter): boolean {
  if (bodyPart === ALL_BODY_PART) {
    return true;
  }
  if (bodyPart === OTHER_BODY_PART) {
    return isOtherBodyPartAction(action);
  }
  return (action.bodypart ?? []).includes(bodyPart);
}

export function actionsInScene(actions: readonly Action[], scene: ActionScene): Action[] {
  return actions.filter((action) => sceneOfAction(action) === scene);
}

/**
 * Dynamic chips for a scene, built from its complete Action set so the search
 * text or the current pick can never shrink the option list. 全部 is always
 * present; 其他 is appended only when the scene actually has such Actions.
 */
export function bodyPartChipsForScene(
  actions: readonly Action[],
  scene: ActionScene,
): BodyPartChip[] {
  const sceneActions = actionsInScene(actions, scene);
  const chips: BodyPartChip[] = [{ key: ALL_BODY_PART, count: sceneActions.length }];

  for (const part of BODY_PART_GROUPS) {
    const count = sceneActions.filter((action) => action.bodypart?.includes(part)).length;
    if (count > 0) {
      chips.push({ key: part, count });
    }
  }

  const otherCount = sceneActions.filter(isOtherBodyPartAction).length;
  if (otherCount > 0) {
    chips.push({ key: OTHER_BODY_PART, count: otherCount });
  }

  return chips;
}

/** Keep the current pick while its chip exists; otherwise reset to 全部. */
export function resolveBodyPartFilter(
  bodyPart: BodyPartFilter,
  chips: readonly BodyPartChip[],
): BodyPartFilter {
  return chips.some((chip) => chip.key === bodyPart) ? bodyPart : ALL_BODY_PART;
}

/**
 * Group the library for display. Search applies to every scene; the body-part
 * pick only applies to `activeScene`. Empty scenes are dropped, so an active
 * filter shows only the scenes that actually have hits.
 */
export function groupActions(
  actions: readonly Action[],
  filters: ActionFilters = DEFAULT_ACTION_FILTERS,
  activeScene: ActionScene = ACTION_SCENES[0],
): ActionSceneGroup[] {
  const groups: ActionSceneGroup[] = [];

  for (const scene of ACTION_SCENES) {
    const displayed = actionsInScene(actions, scene).filter((action) => {
      if (!matchesActionQuery(action, filters.query)) {
        return false;
      }
      if (scene === activeScene && !matchesBodyPartFilter(action, filters.bodyPart)) {
        return false;
      }
      return true;
    });

    if (displayed.length === 0) {
      continue;
    }

    groups.push({
      scene,
      key: `library-group-${scene}`,
      count: displayed.length,
      actions: displayed,
    });
  }

  return groups;
}

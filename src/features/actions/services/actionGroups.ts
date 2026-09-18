/**
 * Action library grouping + filtering (TASK-014, B-3).
 *
 * Pure functions only, so the mapping rules are unit-testable without a screen.
 * The screen owns the collapse state; this module owns which group an Action
 * belongs to and which Actions survive the top filter bar.
 *
 * Scene rule (literal B-3 order):
 *   category 含「热身」  -> 热身
 *   category 含「核心」  -> 核心训练
 *   其余（含无标签）    -> 拉伸
 *
 * Multi-bodypart Actions are placed in the first group of the canonical order
 * so every Action appears exactly once (counts stay honest); untagged Actions
 * fall into「其他」.
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
export type BodyPartGroup = (typeof BODY_PART_GROUPS)[number] | '其他';

/** 拉伸 二级分组展示顺序：颈肩胸背腰腹髋臀腿小腿全身，最后是无标签的「其他」。 */
export const BODY_PART_GROUP_ORDER: readonly BodyPartGroup[] = [...BODY_PART_GROUPS, '其他'];

export const DIFFICULTY_FILTERS = ['全部', '低', '中', '高'] as const;
export type DifficultyFilter = (typeof DIFFICULTY_FILTERS)[number];

export interface ActionFilters {
  /** Single-choice difficulty; 全部 disables that leg of the filter. */
  difficulty: DifficultyFilter;
  /** Case-insensitive name substring; blank disables that leg. */
  query: string;
}

export const DEFAULT_ACTION_FILTERS: ActionFilters = { difficulty: '全部', query: '' };

export interface ActionBodyPartGroup {
  key: BodyPartGroup;
  count: number;
  actions: Action[];
}

export interface ActionSceneGroup {
  scene: ActionScene;
  /** Stable testID / key, e.g. `library-group-拉伸`. */
  key: string;
  count: number;
  /** Direct children for 热身 / 核心训练. */
  actions: Action[];
  /** Secondary body-part groups for 拉伸 only; empty for the other scenes. */
  bodyParts: ActionBodyPartGroup[];
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

export function bodyPartOfAction(action: Action): BodyPartGroup {
  const bodyParts = action.bodypart ?? [];
  for (const group of BODY_PART_GROUPS) {
    if (bodyParts.includes(group)) {
      return group;
    }
  }
  return '其他';
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** True when an Action passes both the difficulty chip and the search box. */
export function matchesActionFilters(action: Action, filters: ActionFilters): boolean {
  if (filters.difficulty !== '全部' && action.difficulty !== filters.difficulty) {
    return false;
  }
  const query = normalizeQuery(filters.query);
  if (query.length > 0 && !action.name.toLowerCase().includes(query)) {
    return false;
  }
  return true;
}

export function filterActions(actions: readonly Action[], filters: ActionFilters): Action[] {
  return actions.filter((action) => matchesActionFilters(action, filters));
}

/**
 * Group the library for display. Groups with no match are dropped entirely, so
 * an active filter shows only the scenes/body-parts that actually have hits.
 */
export function groupActions(
  actions: readonly Action[],
  filters: ActionFilters = DEFAULT_ACTION_FILTERS,
): ActionSceneGroup[] {
  const matched = filterActions(actions, filters);
  const groups: ActionSceneGroup[] = [];

  for (const scene of ACTION_SCENES) {
    const inScene = matched.filter((action) => sceneOfAction(action) === scene);
    if (inScene.length === 0) {
      continue;
    }

    if (scene === '拉伸') {
      const bodyParts: ActionBodyPartGroup[] = [];
      for (const part of BODY_PART_GROUP_ORDER) {
        const inPart = inScene.filter((action) => bodyPartOfAction(action) === part);
        if (inPart.length === 0) {
          continue;
        }
        bodyParts.push({ key: part, count: inPart.length, actions: inPart });
      }
      groups.push({
        scene,
        key: `library-group-${scene}`,
        count: inScene.length,
        actions: [],
        bodyParts,
      });
    } else {
      groups.push({
        scene,
        key: `library-group-${scene}`,
        count: inScene.length,
        actions: inScene,
        bodyParts: [],
      });
    }
  }

  return groups;
}

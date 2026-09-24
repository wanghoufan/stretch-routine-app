/**
 * Routine template grouping for Home (TASK-014, B-3).
 *
 * The shipped templates map onto four scenes; user routines that carry no
 * recognised 场景 tag land in「其他」so nothing silently disappears from Home.
 *
 * Scene rule (literal B-3 order, first match wins):
 *   日常拉伸  <- category 含 晨起 / 睡前
 *   健身前后  <- category 含 跑后 / 办公 / 胸 / 背 / 腿
 *   热身      <- category 含 热身
 *   核心      <- category 含 核心
 *   其他      <- 以上都不是
 */

import type { RoutineSummary } from '../../../domain/routine/Routine';

export const ROUTINE_SCENES = ['日常拉伸', '健身前后', '热身', '核心', '其他'] as const;
export type RoutineScene = (typeof ROUTINE_SCENES)[number];

/** Fixed scenes the editor offers; 「其他」 is the fallback, never a choice. */
export const ROUTINE_GROUP_CHOICES = ['日常拉伸', '健身前后', '热身', '核心'] as const;
export type RoutineGroupChoice = (typeof ROUTINE_GROUP_CHOICES)[number];

/**
 * Editor choice -> stored category tag. Fixed choices map onto tags that
 * {@link sceneOfRoutine} already recognises, so saved routines land in the
 * chosen Home group. Anything else is kept verbatim as a custom group name.
 */
export function categoryForGroupChoice(choice: RoutineGroupChoice): string {
  switch (choice) {
    case '日常拉伸':
      return '晨起';
    case '健身前后':
      return '跑后';
    case '热身':
      return '热身';
    case '核心':
      return '核心';
  }
}

/** Stored category -> editor choice, or null when it is a custom group name. */
export function groupChoiceForCategory(category: readonly string[]): RoutineGroupChoice | null {
  if (category.includes('热身')) {
    return '热身';
  }
  if (category.includes('核心')) {
    return '核心';
  }
  if (category.some((tag) => DAILY_CATEGORIES.includes(tag))) {
    return '日常拉伸';
  }
  if (category.some((tag) => GYM_CATEGORIES.includes(tag))) {
    return '健身前后';
  }
  return null;
}

export interface RoutineSceneGroup {
  scene: string;
  /** Stable testID / key, e.g. `routine-group-核心`. */
  key: string;
  count: number;
  routines: RoutineSummary[];
}

const DAILY_CATEGORIES = ['晨起', '睡前'];
const GYM_CATEGORIES = ['跑后', '办公', '胸', '背', '腿'];

export function sceneOfRoutine(routine: { category?: string[] }): RoutineScene {
  const categories = routine.category ?? [];
  if (categories.some((category) => DAILY_CATEGORIES.includes(category))) {
    return '日常拉伸';
  }
  if (categories.some((category) => GYM_CATEGORIES.includes(category))) {
    return '健身前后';
  }
  if (categories.includes('热身')) {
    return '热身';
  }
  if (categories.includes('核心')) {
    return '核心';
  }
  return '其他';
}

/** Group templates in scene order, dropping empty groups.
 *
 * Routines whose scene is「其他」but carry a custom (unrecognised) category tag
 * form their own groups named after that tag, ahead of the「其他」fallback, so
 * user-created groups actually show up on Home instead of vanishing into 其他.
 */
export function groupRoutines(routines: readonly RoutineSummary[]): RoutineSceneGroup[] {
  const groups: RoutineSceneGroup[] = [];

  for (const scene of ROUTINE_SCENES) {
    if (scene === '其他') {
      continue;
    }
    const inScene = routines.filter((routine) => sceneOfRoutine(routine) === scene);
    if (inScene.length === 0) {
      continue;
    }
    groups.push({
      scene,
      key: `routine-group-${scene}`,
      count: inScene.length,
      routines: inScene,
    });
  }

  const fallback = routines.filter((routine) => sceneOfRoutine(routine) === '其他');
  const customOrder: string[] = [];
  const customBuckets = new Map<string, RoutineSummary[]>();
  for (const routine of fallback) {
    const name = (routine.category ?? []).find((tag) => tag.trim().length > 0)?.trim();
    if (!name) {
      continue;
    }
    const bucket = customBuckets.get(name);
    if (bucket) {
      bucket.push(routine);
    } else {
      customBuckets.set(name, [routine]);
      customOrder.push(name);
    }
  }
  for (const name of customOrder) {
    const bucket = customBuckets.get(name) ?? [];
    groups.push({ scene: name, key: `routine-group-${name}`, count: bucket.length, routines: bucket });
  }

  const untagged = fallback.filter((routine) => {
    const name = (routine.category ?? []).find((tag) => tag.trim().length > 0)?.trim();
    return !name;
  });
  if (untagged.length > 0) {
    groups.push({ scene: '其他', key: 'routine-group-其他', count: untagged.length, routines: untagged });
  }

  return groups;
}

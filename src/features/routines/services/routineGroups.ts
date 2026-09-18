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

export interface RoutineSceneGroup {
  scene: RoutineScene;
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

/** Group templates in scene order, dropping empty groups. */
export function groupRoutines(routines: readonly RoutineSummary[]): RoutineSceneGroup[] {
  const groups: RoutineSceneGroup[] = [];

  for (const scene of ROUTINE_SCENES) {
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

  return groups;
}

import type { ImageSourcePropType } from 'react-native';

/**
 * Motion Core action icons (V1 pure-UI reskin, display only).
 *
 * The 50 PNGs under `assets/icons/motion-core/` are a static visual asset
 * library. This module maps an action/routine display name to one of them by
 * keyword only — no database field, no persistence, no new product behaviour
 * (INTERACTION_FREEZE.md). Filenames are ASCII (`001.png` …) so Metro and git
 * stay safe on every platform.
 */

const ICONS: Record<number, ImageSourcePropType> = {
  1: require('../../../assets/icons/motion-core/001.png'),
  2: require('../../../assets/icons/motion-core/002.png'),
  3: require('../../../assets/icons/motion-core/003.png'),
  4: require('../../../assets/icons/motion-core/004.png'),
  5: require('../../../assets/icons/motion-core/005.png'),
  6: require('../../../assets/icons/motion-core/006.png'),
  7: require('../../../assets/icons/motion-core/007.png'),
  8: require('../../../assets/icons/motion-core/008.png'),
  9: require('../../../assets/icons/motion-core/009.png'),
  10: require('../../../assets/icons/motion-core/010.png'),
  11: require('../../../assets/icons/motion-core/011.png'),
  12: require('../../../assets/icons/motion-core/012.png'),
  13: require('../../../assets/icons/motion-core/013.png'),
  14: require('../../../assets/icons/motion-core/014.png'),
  15: require('../../../assets/icons/motion-core/015.png'),
  16: require('../../../assets/icons/motion-core/016.png'),
  17: require('../../../assets/icons/motion-core/017.png'),
  18: require('../../../assets/icons/motion-core/018.png'),
  19: require('../../../assets/icons/motion-core/019.png'),
  20: require('../../../assets/icons/motion-core/020.png'),
  21: require('../../../assets/icons/motion-core/021.png'),
  22: require('../../../assets/icons/motion-core/022.png'),
  23: require('../../../assets/icons/motion-core/023.png'),
  24: require('../../../assets/icons/motion-core/024.png'),
  25: require('../../../assets/icons/motion-core/025.png'),
  26: require('../../../assets/icons/motion-core/026.png'),
  27: require('../../../assets/icons/motion-core/027.png'),
  28: require('../../../assets/icons/motion-core/028.png'),
  29: require('../../../assets/icons/motion-core/029.png'),
  30: require('../../../assets/icons/motion-core/030.png'),
  31: require('../../../assets/icons/motion-core/031.png'),
  32: require('../../../assets/icons/motion-core/032.png'),
  33: require('../../../assets/icons/motion-core/033.png'),
  34: require('../../../assets/icons/motion-core/034.png'),
  35: require('../../../assets/icons/motion-core/035.png'),
  36: require('../../../assets/icons/motion-core/036.png'),
  37: require('../../../assets/icons/motion-core/037.png'),
  38: require('../../../assets/icons/motion-core/038.png'),
  39: require('../../../assets/icons/motion-core/039.png'),
  40: require('../../../assets/icons/motion-core/040.png'),
  41: require('../../../assets/icons/motion-core/041.png'),
  42: require('../../../assets/icons/motion-core/042.png'),
  43: require('../../../assets/icons/motion-core/043.png'),
  44: require('../../../assets/icons/motion-core/044.png'),
  45: require('../../../assets/icons/motion-core/045.png'),
  46: require('../../../assets/icons/motion-core/046.png'),
  47: require('../../../assets/icons/motion-core/047.png'),
  48: require('../../../assets/icons/motion-core/048.png'),
  49: require('../../../assets/icons/motion-core/049.png'),
  50: require('../../../assets/icons/motion-core/050.png'),
};

/**
 * Keyword → icon id, most specific first. The first keyword contained in the
 * display name wins; names that match nothing fall back to 全身拉伸 (1).
 */
const KEYWORDS: ReadonlyArray<readonly [string, number]> = [
  ['膝抱胸', 38],
  ['脊柱扭转', 37],
  ['胸椎打开', 28],
  ['肩颈放松', 27],
  ['侧屈拉伸', 30],
  ['髋部打开', 29],
  ['久坐恢复', 24],
  ['晨间唤醒', 26],
  ['呼吸冥想', 40],
  ['全身激活', 46],
  ['下肢激活', 47],
  ['上肢激活', 48],
  ['核心激活', 49],
  ['放松拉伸', 45],
  ['运动后', 22],
  ['办公室', 23],
  ['自定义', 50],
  ['模板', 50],
  ['下犬式', 32],
  ['猫牛式', 33],
  ['蝴蝶式', 34],
  ['眼镜蛇', 35],
  ['婴儿式', 36],
  ['腿后侧', 8],
  ['腿前侧', 9],
  ['后侧链', 31],
  ['深蹲', 15],
  ['弓步', 16],
  ['平板', 17],
  ['坐姿', 18],
  ['站姿', 19],
  ['睡前', 25],
  ['热身', 21],
  ['全身拉伸', 1],
  ['全身', 1],
  ['颈', 2],
  ['肩', 3],
  ['胸', 4],
  ['背', 5],
  ['腰腹', 6],
  ['腰', 6],
  ['腹', 13],
  ['髋', 7],
  ['臀', 14],
  ['股四', 9],
  ['大腿前', 9],
  ['腘绳', 8],
  ['大腿后', 8],
  ['腿', 8],
  ['小腿', 10],
  ['腓肠', 10],
  ['脚踝', 10],
  ['手腕', 12],
  ['手臂', 11],
  ['肱', 11],
  ['前臂', 11],
  ['核心', 13],
  ['卷腹', 13],
  ['抬腿', 39],
  ['平衡', 42],
  ['协调', 43],
  ['灵活性', 41],
  ['恢复', 44],
  ['放松', 20],
  ['拉伸', 1],
];

/** Display-only icon for an action/routine display name. Never persisted. */
export function actionIconFor(displayName: string): ImageSourcePropType {
  const name = displayName ?? '';
  for (const [keyword, id] of KEYWORDS) {
    if (name.includes(keyword)) {
      return ICONS[id];
    }
  }
  return ICONS[1];
}

/** Display-only icon for a routine scene group (拉伸/热身/核心…). */
export function sceneIconFor(scene: string): ImageSourcePropType {
  if (scene.includes('热身')) {
    return ICONS[21];
  }
  if (scene.includes('核心')) {
    return ICONS[13];
  }
  return ICONS[1];
}

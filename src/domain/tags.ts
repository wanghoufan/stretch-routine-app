/**
 * Shared tag vocabulary + (de)serialization for Actions and Routines (TASK-012).
 *
 * Each row may carry three optional tag fields:
 *  - `category`  场景  — multi-valued, stored comma-separated;
 *  - `difficulty` 难度 — single 低/中/高;
 *  - `bodypart`   部位 — multi-valued, stored comma-separated.
 *
 * Multi-value fields are stored as plain comma-separated TEXT (one convention
 * for both tables) and exposed to the domain as `string[]`; empty stays
 * `undefined` so an untagged row never grows a phantom `[]`.
 */

export const TAG_CATEGORY_VALUES = [
  '晨起',
  '睡前',
  '跑后',
  '办公',
  '热身',
  '核心',
  '胸',
  '背',
  '腿',
] as const;

export const TAG_BODY_PART_VALUES = [
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

export const TAG_DIFFICULTY_VALUES = ['低', '中', '高'] as const;

export type TagDifficulty = (typeof TAG_DIFFICULTY_VALUES)[number];

/** Optional tag fields shared by `Action` and `Routine`. */
export interface TagFields {
  category?: string[];
  difficulty?: string;
  bodypart?: string[];
}

/** `'胸,背'` -> `['胸', '背']`; blank/whitespace -> `undefined`. */
export function splitTagList(value: string | null | undefined): string[] | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts : undefined;
}

/** `['胸', '背']` -> `'胸,背'`; empty/undefined -> `null` (SQL NULL). */
export function joinTagList(values: readonly string[] | undefined): string | null {
  if (!values || values.length === 0) {
    return null;
  }
  const cleaned = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return cleaned.length > 0 ? cleaned.join(',') : null;
}

/** Trim a single difficulty value; blank -> `undefined`. */
export function normalizeDifficulty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

/** Copy the tag fields off any source carrying them, skipping empty values. */
export function pickTagFields(source: TagFields): TagFields {
  return {
    category: source.category && source.category.length > 0 ? [...source.category] : undefined,
    difficulty: normalizeDifficulty(source.difficulty),
    bodypart: source.bodypart && source.bodypart.length > 0 ? [...source.bodypart] : undefined,
  };
}

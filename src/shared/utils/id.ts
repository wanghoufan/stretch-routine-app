/**
 * Local-only identifier generation.
 *
 * V1 is offline-first and has no backend, so ids only need to be unique on the
 * device. A counter + random suffix keeps them collision-resistant without
 * pulling in a UUID dependency.
 */

export type IdGenerator = (prefix?: string) => string;

let counter = 0;

export function generateId(prefix = 'id'): string {
  counter += 1;
  const time = Date.now().toString(36);
  const seq = counter.toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${seq}_${rand}`;
}

/**
 * Deterministic generator for tests: `id_1`, `id_2`, ...
 */
export function createSequentialIdGenerator(prefix = 'id'): IdGenerator {
  let seq = 0;
  return (requested?: string) => {
    seq += 1;
    return `${requested ?? prefix}_${seq}`;
  };
}

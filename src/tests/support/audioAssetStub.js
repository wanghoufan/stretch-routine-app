/**
 * Jest stub for bundled audio assets (TASK-011).
 *
 * Metro turns `require('./tick.wav')` into an asset module; under Jest there is
 * no asset pipeline, so this stands in for it. Mirrors what
 * `jest-expo`'s asset transformer returns for media files.
 */
module.exports = 1;

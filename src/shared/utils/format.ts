/** Human-readable duration formatting for the Chinese-only V1 UI. */

/** `95` -> `1分35秒`; `45` -> `45秒`; `120` -> `2分` */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  if (minutes === 0) {
    return `${rest}秒`;
  }
  if (rest === 0) {
    return `${minutes}分`;
  }
  return `${minutes}分${rest}秒`;
}

/** Milliseconds -> `m:ss` countdown label. */
export function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Seconds -> whole minutes, rounded up, never below 1 for a non-empty routine. */
export function estimateMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

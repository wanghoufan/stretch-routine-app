import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isPaused } from '../../../domain/session/RunnerState';
import type { RoutineStep } from '../../../domain/routine/RoutineStep';
import type { Cue } from '../../../services/tts/ttsService';
import type { AppSettings } from '../../settings/settingsModel';
import type { RunnerEvent } from '../domain/runnerMachine';
import { remainingMs, remainingSec } from '../domain/runnerTime';
import { stepDurationMs } from '../domain/runnerTransitions';

/**
 * Turns runner events + authoritative timing into speech cues (T044, T085).
 *
 * The coordinator is pure: it decides *what should be said*. De-duplication and
 * queueing belong to `TtsService`, so a re-render cannot repeat a cue.
 */

export interface CuePlanInput {
  session: ActiveSession;
  steps: readonly RoutineStep[];
  events: readonly RunnerEvent[];
  settings: AppSettings;
  nowMs: number;
}

/**
 * e.g. `左肩拉伸，45秒`.
 *
 * The spoken form uses `speakText` (what the user chose to hear) while the
 * screen shows `displayName`, so a step can read differently from how it sounds.
 */
export function describeStepStart(step: RoutineStep): string {
  const seconds = Math.round(stepDurationMs(step) / 1000);
  const spokenName = step.speakText.trim() || step.displayName;
  return `${spokenName}，${seconds}秒`;
}

export function buildCues(input: CuePlanInput): Cue[] {
  const { session, steps, events, settings } = input;
  const cues: Cue[] = [];
  const sessionId = session.sessionId;

  for (const event of events) {
    switch (event.type) {
      case 'STEP_STARTED': {
        if (event.suppressed) {
          // Recovery after a gap: never replay cues for steps already passed.
          continue;
        }
        const step = steps[event.stepIndex];
        if (!step) {
          continue;
        }
        cues.push({
          key: `step:${sessionId}:${event.stepIndex}:start`,
          text: describeStepStart(step),
          interrupt: true,
        });
        break;
      }
      case 'TRANSITION_STARTED': {
        if (event.suppressed) {
          continue;
        }
        const next = steps[event.toStepIndex];
        if (!next) {
          continue;
        }
        cues.push({
          key: `transition:${sessionId}:${event.toStepIndex}:next`,
          text: `下一个，${next.speakText}`,
        });
        break;
      }
      case 'COMPLETED':
        cues.push({ key: `complete:${sessionId}`, text: '流程完成', interrupt: true });
        break;
      case 'STOPPED':
        cues.push({ key: `stopped:${sessionId}`, text: '已结束当前流程', interrupt: true });
        break;
      default:
        break;
    }
  }

  const warning = buildCountdownWarningCue(input);
  if (warning) {
    cues.push(warning);
  }

  return cues;
}

/**
 * Optional "5 秒后" warning (SPEC US7, T085).
 *
 * The key embeds the effective step duration so that a +10s extension arms the
 * warning again for the new, longer step instead of staying silent.
 */
function buildCountdownWarningCue(input: CuePlanInput): Cue | null {
  const { session, steps, settings, events, nowMs } = input;

  if (!settings.countdownWarningEnabled) {
    return null;
  }
  if (session.state !== 'RUNNING_STEP' || isPaused(session.state)) {
    return null;
  }
  // Never warn in the same breath as announcing a step: a jump that lands inside
  // the warning window would otherwise say "C，10秒" and "5秒后结束" together.
  if (events.some((event) => event.type === 'STEP_STARTED' && !event.suppressed)) {
    return null;
  }

  const step = steps[session.currentStepIndex];
  if (!step) {
    return null;
  }

  const warningMs = settings.countdownWarningSec * 1000;
  // A step shorter than the warning window would fire immediately; skip it.
  if (session.effectiveStepDurationMs <= warningMs) {
    return null;
  }

  const left = remainingMs(session, nowMs);
  if (left <= 0 || left > warningMs) {
    return null;
  }

  return {
    key: `warn:${session.sessionId}:${session.currentStepIndex}:${session.effectiveStepDurationMs}`,
    text: `${remainingSec(session, nowMs)}秒后结束`,
  };
}

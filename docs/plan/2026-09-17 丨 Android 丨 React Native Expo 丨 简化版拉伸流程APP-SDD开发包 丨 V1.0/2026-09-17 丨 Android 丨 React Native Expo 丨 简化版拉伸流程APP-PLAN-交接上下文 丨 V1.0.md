# PLAN — Stretch Routine V1

**Plan Version:** V1.0  
**Date:** 2026-09-17  
**Target:** Android first  
**Stack:** React Native + Expo  
**Architecture Style:** Local-first single mobile application

---

# 1. Technical Context

## Language and Runtime

- TypeScript
- React Native
- Expo

## Target Platform

- Android first.
- iOS is explicitly out of V1 release scope.
- Web/PWA is explicitly out of V1 release scope.

## Persistence

Preferred V1 direction:

- local SQLite-backed persistence;
- repository layer hides persistence details from screens and runner domain logic;
- migrations are versioned.

Async key-value storage MAY be used only for small app preferences, not as the primary structured routine store if it makes migrations and querying harder.

## Voice

Use device/native TTS through an Expo-compatible approach.

TTS is an output channel only. Speech callbacks MUST NOT control authoritative runner timing.

## Background Execution

A V1 spike MUST validate the exact Expo/Android approach required for:

- active timing while backgrounded;
- lock-screen continuity;
- ongoing notification / foreground service if required;
- TTS while backgrounded;
- recovery on foregrounding.

If managed Expo APIs are insufficient, use an Expo development build/config plugin/native module strategy rather than weakening the product requirement.

---

# 2. Constitution Check

| Gate | Status | Plan response |
|---|---|---|
| Hands-free primary path | PASS | Runner and TTS are first-class |
| Local/offline | PASS | SQLite/local settings only |
| No AI | PASS | No model SDKs/API |
| Routine player only | PASS | No fitness platform modules |
| Deterministic timing | PASS | Timestamp/state-machine design |
| Background core | PASS WITH SPIKE | Validate Android mechanism before feature completion |
| Voice + visual | PASS | Both channels implemented |
| Bilateral actions | PASS | Domain concept and grouped edit |
| User controls | PASS | Pause/previous/skip/+10/end |
| Scope freeze | PASS | Explicit excluded-feature gate |

No constitutional exception is approved.

---

# 3. Proposed Project Structure

```text
src/
├── app/
│   ├── navigation/
│   └── providers/
├── features/
│   ├── routines/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── actions/
│   │   ├── screens/
│   │   └── components/
│   ├── runner/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── domain/
│   │   └── services/
│   └── settings/
├── domain/
│   ├── action/
│   ├── routine/
│   └── session/
├── data/
│   ├── db/
│   ├── migrations/
│   ├── repositories/
│   └── mappers/
├── services/
│   ├── tts/
│   ├── background/
│   └── clock/
├── shared/
│   ├── components/
│   ├── utils/
│   └── types/
└── tests/
    ├── domain/
    ├── repositories/
    └── integration/
```

Keep the structure practical. Do not create layers with no V1 responsibility.

---

# 4. Domain Model

## Action

```ts
type ActionSideMode = "single" | "bilateral";

interface Action {
  id: string;
  name: string;
  defaultDurationSec: number;
  sideMode: ActionSideMode;
  defaultSpeakText?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Routine

```ts
interface Routine {
  id: string;
  name: string;
  defaultDurationSec: number;
  defaultTransitionSec: number;
  createdAt: string;
  updatedAt: string;
}
```

## RoutineStep

```ts
type StepSide = "none" | "left" | "right";

interface RoutineStep {
  id: string;
  routineId: string;
  sourceActionId?: string;
  orderIndex: number;

  // Snapshot values used by this routine.
  displayName: string;
  speakText: string;
  durationSec: number;
  transitionSec: number;

  pairGroupId?: string;
  side: StepSide;
}
```

### Snapshot Rule

`RoutineStep` owns playback values.

Changing an `Action` does not automatically mutate already-saved `RoutineStep` snapshots.

This avoids surprising changes to old routines.

---

# 5. Runner State Machine

The runner is the highest-risk technical area and MUST be modeled independently of the screen.

## States

```text
IDLE
PREPARING
RUNNING_STEP
RUNNING_TRANSITION
PAUSED_STEP
PAUSED_TRANSITION
COMPLETED
STOPPED
ERROR
```

A reduced implementation is allowed only if equivalent behavior remains explicit and testable.

## Authoritative Session Data

Suggested concepts:

```ts
interface ActiveSession {
  routineId: string;
  sessionId: string;
  state: RunnerState;
  currentStepIndex: number;

  phaseStartedAtEpochMs: number | null;
  pausedAtEpochMs: number | null;
  accumulatedPauseMs: number;

  effectiveStepDurationMs: number;
  effectiveTransitionDurationMs: number;

  runtimeExtensionMs: number; // e.g. +10s
  updatedAtEpochMs: number;
}
```

Exact fields MAY evolve during implementation, but the following rules are binding:

1. Authoritative remaining time is computed from timestamps.
2. UI interval/tick frequency is presentation only.
3. TTS completion/callbacks do not advance time.
4. Pause freezes effective elapsed time.
5. Resume creates a new timing reference or adjusts accumulated pause.
6. Background/foreground reconstruction uses authoritative session data.

---

# 6. Clock Abstraction

Introduce a tiny injectable clock interface so timer logic is testable:

```ts
interface Clock {
  nowMs(): number;
}
```

Production uses system time.

Tests use a fake clock.

This avoids slow or flaky timer tests.

---

# 7. Runner Transition Rules

## Start

- Validate at least one step.
- Snapshot/load ordered routine steps.
- Initialize session.
- Announce first step.
- Enter `RUNNING_STEP`.

## Step Boundary

When elapsed step time >= effective duration:

- if transition duration > 0 and another step exists:
  - enter `RUNNING_TRANSITION`;
  - announce next action according to cue policy;
- otherwise:
  - advance directly to next step;
- if final step is complete:
  - enter `COMPLETED`.

## Pause

- Store paused timestamp/state.
- Do not allow effective elapsed time to increase.

## Resume

- Recalculate timing reference/paused accumulation.
- Resume the exact prior phase.

## +10 Seconds

- Increase only current step's runtime effective duration by 10 seconds.
- Do not mutate the saved routine unless a future explicit “save adjustment” feature is added.

## Previous

Recommended V1 semantics:

- move to previous routine step;
- restart that previous step at full saved duration;
- reset runtime-only +10 extension;
- announce the previous step.

If currently on first step, Previous is disabled/no-op.

## Skip/Next

Recommended V1 semantics:

- immediately end current phase;
- advance to next routine step;
- skip pending transition for the skipped step;
- reset runtime-only extension.

If called on final step, finish the routine.

---

# 8. TTS Strategy

## Required Cues

At minimum:

- routine start/current action;
- next action at transition;
- completion.

Optional V1 setting:

- 5-second warning.

Example:

- “Left trapezius stretch, 45 seconds.”
- “Next, right trapezius stretch.”
- “Five seconds remaining.”
- “Routine complete.”

## Reliability Rules

- De-duplicate speech by session/step/cue identity.
- UI rerenders MUST NOT repeat cues.
- Foreground recovery MUST NOT blindly replay old cues.
- TTS errors are reported but MUST NOT stop timer progression.
- Avoid queue flooding during rapid skip/previous interactions.

---

# 9. Android Background Strategy

This must be proven early.

## Technical Spike Acceptance

On a real Android device:

1. Start a multi-step routine.
2. Lock the screen.
3. Leave it locked across at least two boundaries.
4. Confirm timing remains correct.
5. Confirm required TTS cues occur or document exact supported limitations.
6. Unlock/foreground.
7. Confirm screen state matches authoritative session time.

Also test:

- app moved to background;
- screen lock;
- switching to another app;
- Bluetooth audio if available;
- interruption by other audio;
- process/activity recreation where feasible.

## Decision Gate

Do NOT postpone this spike until “polish.”

If Expo managed capabilities cannot meet the requirement, decide early between:

- Expo development build plus native/background module;
- supported foreground service/ongoing notification implementation;
- carefully documented Android platform limitation if truly unavoidable.

Do not silently convert the requirement into “works only while screen is on.”

---

# 10. Persistence Plan

## Tables

Conceptual schema:

```text
actions
- id
- name
- default_duration_sec
- side_mode
- default_speak_text
- created_at
- updated_at

routines
- id
- name
- default_duration_sec
- default_transition_sec
- created_at
- updated_at

routine_steps
- id
- routine_id
- source_action_id nullable
- order_index
- display_name
- speak_text
- duration_sec
- transition_sec
- pair_group_id nullable
- side

app_settings
- key
- value

active_session
- singleton/session row or equivalent recoverable state
```

Optional completion history SHOULD be omitted unless required for the completion screen.

## Migration Rule

Every schema change gets a migration.

Do not rely on destructive database reset for production upgrades.

---

# 11. Screen Plan

## A. Home / My Routines

Shows:

- routine cards/list;
- action count;
- approximate total duration;
- Start;
- New Routine;
- navigation to Action Library and Settings.

Empty state offers New Routine and optional non-persistent sample preview.

## B. Routine Detail

Shows:

- name;
- ordered steps;
- durations;
- total duration;
- Start;
- Edit;
- Duplicate/Delete menu.

## C. Create/Edit Routine

Supports:

- routine name;
- quick batch input;
- add from Action Library;
- default duration;
- default transition;
- reorder;
- edit step;
- duplicate step;
- delete step;
- save.

## D. Action Library

Supports:

- list;
- create;
- edit;
- delete;
- single/bilateral type.

## E. Runner

Shows:

- routine name;
- current index/total;
- current action;
- remaining time;
- progress;
- next action;
- Previous;
- Pause/Resume;
- Skip;
- +10 seconds;
- End.

## F. Completion

Minimal:

- completed;
- routine name;
- number of actions;
- elapsed/expected duration if useful;
- Done.

## G. Settings

Only essential playback/default settings.

---

# 12. Bilateral Design

## Creation

An Action with `sideMode = bilateral` can produce two routine steps sharing a `pairGroupId`.

Naming strategy MUST be predictable and editable.

Default example:

- Left {Action Name}
- Right {Action Name}

Language/localization is not a V1 expansion requirement; V1 may use the current app language only.

## Paired Editing

The routine editor should expose:

- Edit this side only
- Edit both sides

Where “both sides” applies compatible values such as duration.

---

# 13. Validation Rules

- Routine name: non-empty after trim.
- Step display name: non-empty after trim.
- Duration: integer seconds, > 0, bounded by a documented maximum.
- Transition: integer seconds, >= 0, bounded.
- Batch parser: ignore blank-only lines; preserve user order.
- Duplicate names: allowed.
- Delete routine/action: confirmation where destructive.
- Action deletion: existing routine snapshots remain valid.

---

# 14. Testing Strategy

## Unit Tests

Mandatory for:

- timer math;
- pause/resume;
- transition math;
- +10 extension;
- previous/skip semantics;
- state-machine transitions;
- batch parsing;
- bilateral generation;
- paired duration update;
- total-duration calculation.

## Repository/Persistence Tests

Cover:

- CRUD;
- ordering;
- snapshots;
- migrations;
- active-session persistence.

## Component/Integration Tests

Cover high-value flows where practical:

- create routine;
- edit/reorder;
- runner controls;
- completion.

## Manual Real-Device QA

Mandatory for:

- TTS;
- background;
- lock screen;
- audio interruption;
- app foreground recovery;
- cold/warm restart behavior;
- Android permission/notification paths.

---

# 15. Error Handling

## TTS unavailable

- show non-blocking error;
- continue visual runner;
- allow retry where useful.

## Persistence failure

- do not claim save succeeded;
- preserve editable user input if possible;
- provide clear retry/error state.

## Invalid active session

- fail safely to a non-running state;
- never start an ambiguous duplicate timer;
- retain diagnostic logs in development builds.

---

# 16. Performance / UX Constraints

The application is small and local.

Targets:

- Home should render promptly from local data.
- Start action should feel immediate.
- Timer display should be smooth but MUST NOT trade correctness for refresh rate.
- No routine execution should wait on network.
- Avoid heavyweight state frameworks unless demonstrated necessary.

---

# 17. Implementation Phases

## Phase 0 — Risk Spike

- Expo Android project skeleton.
- Verify local persistence candidate.
- Verify TTS.
- Prove background/lock-screen timing strategy on real Android device.

**Exit gate:** background architecture selected with evidence.

## Phase 1 — Domain Foundation

- models;
- repositories;
- migrations;
- fake/system clock;
- runner state machine;
- unit tests.

## Phase 2 — Routine Creation and Editing

- Home;
- create/edit routine;
- quick batch input;
- reordering;
- routine detail;
- persistence.

## Phase 3 — Runner

- runner UI;
- TTS cue service;
- controls;
- completion;
- background integration.

## Phase 4 — Action Library + Bilateral

- action CRUD;
- add-from-library;
- paired step generation/editing.

## Phase 5 — Settings, Hardening, QA

- playback settings;
- accessibility;
- migration/recovery hardening;
- real-device matrix;
- scope audit;
- release acceptance.

---

# 18. Definition of Done

The implementation is done only when:

- all P1 SPEC acceptance scenarios pass;
- required tests pass;
- real-device Android background/lock-screen evidence is recorded;
- offline creation/edit/playback is verified;
- no AI/backend/auth/payment/social dependency exists;
- data survives app restart and supported schema migration;
- no unresolved constitutional violation remains.

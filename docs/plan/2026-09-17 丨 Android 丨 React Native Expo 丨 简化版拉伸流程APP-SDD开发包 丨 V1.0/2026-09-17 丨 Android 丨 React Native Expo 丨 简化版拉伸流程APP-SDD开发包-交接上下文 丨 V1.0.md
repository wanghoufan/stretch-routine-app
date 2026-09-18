# Stretch Routine V1 — SDD Development Package

**Date:** 2026-09-17  
**Target:** Android  
**Stack:** React Native + Expo  
**Package Version:** V1.0

This combined document contains the complete V1 SDD handoff package in the following order:

1. Project Constitution
2. SPEC
3. PLAN
4. TASKS

For Spec Kit-style repository placement, split the corresponding sections into:

- `.specify/memory/constitution.md`
- `specs/001-routine-runner/spec.md`
- `specs/001-routine-runner/plan.md`
- `specs/001-routine-runner/tasks.md`

---

# PART 1 — CONSTITUTION

# Project Constitution — Stretch Routine V1

**Version:** 1.0.0  
**Ratified:** 2026-09-17  
**Status:** Frozen for V1 development  
**Primary Platform:** Android  
**Implementation Stack:** React Native + Expo  
**Development Method:** Spec-Driven Development (SDD)

---

## 1. Mission

Stretch Routine V1 is a lightweight, local-first, hands-free routine player for stretching, warm-up, cooldown, mobility, massage-gun routines, HIIT-style sequences, and other fixed-order physical routines.

The product removes two recurring sources of friction:

1. remembering what comes next;
2. watching a timer to know when to switch.

The user defines a routine once. The app then preserves the sequence, keeps time, speaks cues, and advances automatically.

The product SHALL optimize for **execution simplicity**, not breadth of fitness features.

---

## 2. Binding Product Principles

### I. Hands-Free First

The primary product path is:

> Open app → choose routine → start → put phone down → follow voice cues → finish.

Any feature that makes this path slower, noisier, or more attention-demanding MUST be rejected, simplified, or deferred.

The active routine MUST remain understandable without continuous visual attention.

### II. Local First and Offline by Default

V1 MUST work without registration, login, cloud synchronization, or network access.

User-created actions, routines, routine steps, app settings, and runner state MUST be stored locally on the device.

Network availability MUST NOT be required for:

- creating or editing actions;
- creating or editing routines;
- starting a routine;
- timer progression;
- TTS guidance using device-supported speech;
- background or lock-screen execution where Android permits it;
- completing a routine.

Cloud sync MAY be added after V1, but MUST NOT become an implicit V1 dependency.

### III. No AI in V1

V1 MUST NOT contain:

- LLM calls;
- AI-generated routines;
- automatic workout recommendations;
- video understanding;
- automatic exercise recognition;
- AI coaching;
- cloud inference;
- model-provider SDKs;
- prompt management infrastructure.

Natural-language routine generation and video-to-routine import are explicitly post-V1 features.

AI MUST NOT be introduced as a shortcut for deterministic V1 behavior.

### IV. Routine Player, Not Fitness Platform

V1 is a routine execution tool.

V1 MUST NOT include:

- social feeds;
- followers;
- leaderboards;
- badges;
- calorie estimation;
- nutrition tracking;
- body measurements;
- training-plan marketplace;
- course marketplace;
- subscriptions;
- account profiles;
- wearable integrations;
- community features.

The core domain SHALL remain:

> Action → Routine → Routine Step → Runner.

### V. Deterministic Timing

Timer correctness MUST be derived from timestamps and elapsed time, not by decrementing an integer every second.

Conceptually:

`remaining = duration - effectiveElapsedTime`

The timer MUST remain correct when:

- the JavaScript/UI thread is delayed;
- Android throttles callbacks;
- the app is backgrounded;
- the screen is locked;
- the user pauses and resumes;
- the UI is recreated after interruption.

Timer accuracy MUST NOT depend on the number of interval callbacks delivered.

### VI. Background Execution Is Core Functionality

Background and lock-screen continuity are acceptance requirements, not polish.

For V1:

- the active routine MUST continue under supported Android background conditions;
- runner state MUST remain correct after screen lock and unlock;
- spoken cues MUST continue where Android permissions and platform rules allow;
- returning to foreground MUST restore the correct current step and remaining time.

If Android requires a foreground service, ongoing notification, media session, or equivalent supported mechanism, the implementation MUST use that platform pattern instead of silently degrading.

### VII. Voice + Visual Dual Channel

The runner MUST provide:

1. visible current-step and timing information;
2. spoken guidance.

Voice is required because the product promise is “do not keep watching the phone.”

TTS failure MUST NOT corrupt runner state. The app MUST continue visually and expose a recoverable error state.

### VIII. Fast Routine Creation

Routine creation MUST minimize repetitive input.

V1 MUST support:

- batch entry with one action per line;
- a default duration applied to newly added steps;
- a default transition duration;
- individual step overrides;
- drag-and-drop or equivalent reordering;
- duplicate, edit, and delete operations.

Creating a routine MUST NOT require opening a separate edit screen for every action.

### IX. Bilateral Actions Are a First-Class Concept

V1 MUST support left/right paired actions.

A bilateral action MUST be able to create or manage two ordered steps such as:

- Left trapezius stretch
- Right trapezius stretch

The UI SHOULD make it easy to keep durations symmetrical while still permitting a user to override one side intentionally.

### X. User Control During Playback

The user MUST be able to recover from real-world interruptions without abandoning the routine.

The runner MUST support:

- pause;
- resume;
- previous step;
- skip/next step;
- add 10 seconds to the current step;
- end routine.

Controls MUST update the deterministic runner state, not merely visual counters.

### XI. Minimal Persistence, Safe Evolution

V1 MUST persist only data that supports the core experience.

The data model MUST distinguish:

- reusable Action;
- Routine;
- RoutineStep;
- AppSettings;
- optional lightweight completion record if included.

RoutineStep MUST store a snapshot of user-facing step values needed for stable playback, so later edits to a reusable Action do not unexpectedly rewrite existing routines.

Database schema changes MUST be migration-safe.

### XII. Accessibility and Safety

The app MUST remain usable with large text, screen readers for primary controls, and clear touch targets.

The app MUST NOT present itself as medical diagnosis, rehabilitation prescription, or professional medical advice.

The user owns routine content. V1 guides execution; it does not validate medical suitability.

---

## 3. Engineering Principles

### 3.1 Simplicity Before Abstraction

Do not introduce architecture, libraries, services, state layers, or generic frameworks unless they solve a current V1 requirement.

Every new dependency MUST have a concrete V1 reason.

### 3.2 Explicit Runner State Machine

Runner behavior MUST be modeled explicitly. At minimum, states SHALL cover:

- idle;
- preparing;
- running;
- transitioning;
- paused;
- completed;
- stopped/error where required.

Transitions MUST be deterministic and testable.

### 3.3 Separation of Domain Time From Rendering

UI rendering MUST consume runner state.

UI components MUST NOT own authoritative timing logic.

### 3.4 Test the Risk, Not Just the Screen

Automated tests SHOULD prioritize:

- elapsed-time calculation;
- pause/resume;
- previous/skip;
- transition timing;
- bilateral step generation;
- persistence serialization/migration;
- recovery after background/foreground transitions.

Manual Android-device QA MUST cover background and lock-screen behavior because simulator-only validation is insufficient.

### 3.5 No Hidden Scope Expansion

A developer or agent MUST NOT add a feature simply because it is easy, common, or aesthetically desirable.

If a requirement is not in `SPEC`, it MUST be treated as out of scope unless the specification is amended first.

---

## 4. V1 Scope Freeze

### IN SCOPE

- Android-first app using React Native + Expo.
- Local-only storage.
- Routine list/home.
- Create/edit/delete/duplicate routine.
- Batch action input.
- Reusable action library.
- Bilateral/left-right action support.
- Per-step duration.
- Transition duration.
- TTS voice prompts.
- Runner with pause/resume/previous/skip/+10s/end.
- Background/lock-screen continuity under supported Android behavior.
- Settings required for speech/timing experience.
- Basic completion screen.
- Essential accessibility.
- Error recovery for local persistence/TTS/runner.

### OUT OF SCOPE

- AI of any kind.
- Video import or video analysis.
- Natural-language routine generation.
- Cloud sync.
- Accounts/authentication.
- iOS release.
- Web/PWA release.
- Social/community.
- Payments/subscriptions.
- Coaching recommendations.
- Calorie/health tracking.
- Wearables.
- Advanced analytics/gamification.
- Remote backend/Supabase requirement.
- User-generated public content.

---

## 5. Definition of Done — Constitutional Gate

V1 MUST NOT be considered complete unless all of the following are true:

1. A new user can create a routine locally without an account.
2. A user can batch-add multiple actions and save the routine.
3. A saved routine can be reopened, edited, reordered, duplicated, and deleted.
4. Bilateral actions can produce left/right steps and support symmetrical timing.
5. Starting a routine executes every step in deterministic order.
6. TTS announces the routine sufficiently for hands-free use.
7. Pause/resume/previous/skip/+10s operate correctly.
8. Background and lock-screen behavior has been tested on a real Android device.
9. Returning to foreground restores correct runner state.
10. Core use works offline.
11. No AI, cloud backend, login, payment, or social system is required.
12. The implementation passes the specification acceptance scenarios and project tests.
13. A scope audit confirms no post-V1 feature has been silently introduced.

---

## 6. Governance

This Constitution is the highest project-level authority for V1.

When artifacts conflict, precedence is:

1. Constitution
2. SPEC
3. PLAN
4. TASKS
5. implementation details

A conflict MUST be resolved by changing the lower-authority artifact or by explicitly amending the Constitution/SPEC before implementation.

### Amendment Rules

- **MAJOR:** removes or reverses a binding principle.
- **MINOR:** adds a new binding principle or materially expands governance.
- **PATCH:** clarification without changing scope or intent.

Any amendment MUST include:

- rationale;
- affected SPEC/PLAN/TASKS sections;
- version bump;
- explicit review before implementation continues.

---

**Constitution Version:** 1.0.0  
**V1 Product Freeze:** Active  


---

# PART 2 — SPEC

# SPEC — Stretch Routine V1

**Specification Version:** V1.0  
**Date:** 2026-09-17  
**Status:** Ready for planning / implementation review  
**Product:** Stretch Routine V1

> This document defines **what** the product must do and **why**. Implementation technology belongs in PLAN.

---

## 1. Product Summary

Stretch Routine V1 helps a user execute a self-defined sequence of physical actions without remembering the order or continuously watching a timer.

The user creates routines such as:

- shoulder and neck stretching;
- post-run stretching;
- warm-up;
- mobility;
- massage-gun sequence;
- HIIT-style timed sequence.

The app then guides the user through the sequence using visible text, timing, and spoken cues.

### Core Promise

> Define once. Press start. Put the phone down. Follow the voice until the routine is complete.

---

## 2. Problem Statement

Users often know they should stretch, warm up, cool down, or complete a fixed physical routine, but execution breaks down because:

1. the sequence contains many actions and is annoying to remember;
2. bilateral actions are easy to perform asymmetrically or partially;
3. starting and watching a timer adds friction;
4. users frequently stop after only part of a longer routine;
5. fixed-video products are harder to customize than a personal action sequence.

V1 solves the execution problem, not exercise education.

---

## 3. V1 Product Goals

### G1 — Remove sequence memory

The user can save a reusable routine once and later execute it without remembering the next action.

### G2 — Remove timer watching

The user can rely on automatic timing and spoken cues instead of continuously looking at the screen.

### G3 — Make routine creation fast

A user can enter multiple actions in one batch instead of creating every action through a long form.

### G4 — Preserve bilateral completeness

The product supports explicit left/right actions and helps keep paired durations consistent.

### G5 — Remain usable offline

The core product works without an account or network connection.

---

## 4. Non-Goals for V1

V1 does NOT attempt to:

- recommend which exercises a person should do;
- evaluate technique or form;
- generate routines with AI;
- understand videos;
- replace a coach or medical professional;
- synchronize across devices;
- build a social fitness community;
- track calories, weight, nutrition, or detailed health metrics.

---

# 5. User Stories

## US1 — Start an Existing Routine

**Priority:** P1  
**Why:** This is the primary repeat-use behavior and the main product value.

As a user, I want to open the app, choose a saved routine, and start it immediately so that I can follow the routine without remembering the order or watching the timer.

### Acceptance Scenarios

**Scenario 1 — Start from Home**

Given at least one saved routine exists,  
When the user opens the app and taps Start on a routine,  
Then the runner begins at the first step.

**Scenario 2 — Voice-guided progression**

Given a routine is running,  
When a step starts or the workflow moves to the next step,  
Then the user receives an appropriate spoken cue and visible current-step information.

**Scenario 3 — Automatic completion**

Given a routine contains multiple steps,  
When each step and configured transition finishes,  
Then the runner advances in order until the final step completes.

**Scenario 4 — Hands-free execution**

Given the routine has started,  
When the user stops interacting with the screen,  
Then the routine continues progressing and provides spoken cues under supported Android background conditions.

**Scenario 5 — Completion**

Given the final step finishes,  
When no more steps remain,  
Then the app marks the session complete and shows a completion screen.

---

## US2 — Create a Routine Quickly

**Priority:** P1

As a user, I want to create a routine by entering multiple action names at once and setting common timing values so that setup does not feel more tedious than doing the routine.

### Acceptance Scenarios

**Scenario 1 — Batch input**

Given the user is creating a routine,  
When the user enters multiple non-empty lines of action names,  
Then each line becomes an ordered routine step.

**Scenario 2 — Default duration**

Given multiple steps were created from batch input,  
When a default action duration is set,  
Then the new steps receive that duration unless individually overridden.

**Scenario 3 — Default transition**

Given a routine transition duration is set,  
When steps are added,  
Then the configured transition applies between steps unless overridden where supported.

**Scenario 4 — Save**

Given the routine has a valid name and at least one valid step,  
When the user saves,  
Then the routine appears on Home and remains available after app restart.

---

## US3 — Edit and Reuse a Routine

**Priority:** P1

As a user, I want to change a routine after creating it so that the app remains useful as my preferred sequence evolves.

### Acceptance Scenarios

**Scenario 1 — Reorder**

Given a routine has multiple steps,  
When the user reorders them,  
Then future playback uses the new order.

**Scenario 2 — Edit one step**

Given a routine exists,  
When the user changes a step name, duration, spoken text, or transition setting,  
Then the saved routine uses the updated step values.

**Scenario 3 — Delete step**

Given a routine contains more than one step,  
When the user deletes a step and saves,  
Then the step no longer appears or plays.

**Scenario 4 — Duplicate routine**

Given a saved routine exists,  
When the user duplicates it,  
Then a separate editable copy is created without changing the original.

**Scenario 5 — Delete routine**

Given a saved routine exists,  
When the user confirms deletion,  
Then the routine is removed from the routine list.

---

## US4 — Use Bilateral Actions

**Priority:** P1

As a user, I want a left/right action to be represented as a pair so that I am less likely to forget one side or use inconsistent timing.

### Acceptance Scenarios

**Scenario 1 — Create paired steps**

Given an action is marked bilateral,  
When it is added to a routine,  
Then the product can create a left and right step in sequence.

**Scenario 2 — Symmetrical timing**

Given a bilateral pair has the same duration,  
When the user changes the pair duration using the paired edit action,  
Then both sides receive the new duration.

**Scenario 3 — Intentional override**

Given a bilateral pair exists,  
When the user explicitly edits only one side,  
Then the app preserves that intentional difference.

---

## US5 — Control an Active Routine

**Priority:** P1

As a user, I want to pause, recover, skip, or extend a step so that normal interruptions do not force me to abandon the entire routine.

### Acceptance Scenarios

**Scenario 1 — Pause/resume**

Given a step is running,  
When the user pauses,  
Then elapsed routine time stops advancing until resume.

**Scenario 2 — Add time**

Given a step is running or paused,  
When the user taps +10 seconds,  
Then the current step duration increases by 10 seconds without changing other steps.

**Scenario 3 — Skip**

Given a non-final step is active,  
When the user taps Skip/Next,  
Then the runner advances according to the defined skip behavior without corrupting subsequent timing.

**Scenario 4 — Previous**

Given the runner is beyond the first step,  
When the user taps Previous,  
Then the previous step becomes active with a well-defined restarted timing state.

**Scenario 5 — End**

Given a routine is active,  
When the user chooses End and confirms,  
Then the runner stops and returns to a stable non-running state.

---

## US6 — Manage Reusable Actions

**Priority:** P2

As a user, I want to keep frequently used actions in an action library so that I can reuse them in multiple routines.

### Acceptance Scenarios

- Create a reusable action with name and default duration.
- Mark an action as single-sided or bilateral.
- Edit a reusable action.
- Delete a reusable action with safe handling when existing routines reference its prior snapshot.
- Add one or more library actions to a routine.

Existing routines MUST NOT be unexpectedly rewritten merely because a reusable action is later renamed or edited.

---

## US7 — Configure Essential Playback Preferences

**Priority:** P2

As a user, I want a small set of app preferences so that spoken guidance works comfortably for me.

### Candidate V1 Settings

- TTS enabled/disabled;
- speech rate if device support is reliable;
- countdown cue enabled/disabled (for example, 5-second warning);
- default step duration;
- default transition duration.

Settings MUST remain minimal. Cosmetic personalization is not a V1 requirement.

---

# 6. Functional Requirements

### Routine Management

- **FR-001** The app MUST display locally saved routines on Home.
- **FR-002** The user MUST be able to create a routine with a name.
- **FR-003** A routine MUST contain at least one valid step before final save.
- **FR-004** The user MUST be able to batch-create steps using one non-empty line per step.
- **FR-005** The app MUST support a default step duration during creation.
- **FR-006** The app MUST support a default transition duration.
- **FR-007** The user MUST be able to edit individual step values.
- **FR-008** The user MUST be able to reorder steps.
- **FR-009** The user MUST be able to duplicate a routine.
- **FR-010** The user MUST be able to delete a routine after confirmation.

### Action Library

- **FR-011** The user MUST be able to create reusable actions.
- **FR-012** Reusable actions MUST support a default duration.
- **FR-013** Reusable actions MUST support single or bilateral semantics.
- **FR-014** Multiple selected library actions SHOULD be addable to a routine in one operation.
- **FR-015** Existing RoutineStep playback data MUST remain stable after later Action edits.

### Runner

- **FR-016** The runner MUST execute routine steps in saved order.
- **FR-017** Each step MUST have a positive duration.
- **FR-018** The runner MUST support transition time between steps.
- **FR-019** The runner MUST show current step name, current position, remaining time, and next step when available.
- **FR-020** The runner MUST provide TTS cues.
- **FR-021** The runner MUST support pause and resume.
- **FR-022** The runner MUST support Previous.
- **FR-023** The runner MUST support Skip/Next.
- **FR-024** The runner MUST support adding 10 seconds to the current step.
- **FR-025** The user MUST be able to end a running routine.
- **FR-026** The runner MUST deterministically complete after the final step.
- **FR-027** Timer state MUST remain based on elapsed time rather than callback count.

### Background / Recovery

- **FR-028** An active session MUST continue correctly under supported Android background behavior.
- **FR-029** Locking and unlocking the screen MUST NOT reset a routine.
- **FR-030** Returning to foreground MUST reconstruct the correct current runner state from authoritative timing/session data.
- **FR-031** If TTS cannot speak, runner timing MUST continue and the UI MUST remain operable.
- **FR-032** The app MUST safely recover from process/UI recreation to the extent supported by the chosen Android implementation strategy.

### Storage

- **FR-033** Core data MUST be stored locally.
- **FR-034** Core functions MUST work offline.
- **FR-035** V1 MUST NOT require user authentication.
- **FR-036** Local schema evolution MUST support controlled migration.

### Accessibility

- **FR-037** Primary controls MUST have accessible labels.
- **FR-038** Primary touch targets MUST be usable without precise tapping.
- **FR-039** Essential information MUST not depend on color alone.
- **FR-040** Text scaling SHOULD remain usable on primary screens.

---

# 7. Data Concepts

These are product concepts, not implementation schema.

### Action

A reusable action template.

Key concepts:

- name;
- default duration;
- single/bilateral type;
- optional default spoken text.

### Routine

A named saved sequence.

Key concepts:

- name;
- ordered steps;
- default timing preferences;
- created/updated timestamps.

### Routine Step

A concrete playback step inside one routine.

Key concepts:

- display name;
- spoken text;
- order;
- duration;
- transition duration;
- optional bilateral grouping/side;
- snapshot values independent of future Action changes.

### Active Session

The authoritative state required to continue a running routine.

---

# 8. Primary User Flows

## Flow A — First Routine

Open App  
→ New Routine  
→ Name routine  
→ Quick Input  
→ Enter one action per line  
→ Set default duration  
→ Set transition  
→ Add  
→ Review/reorder/edit  
→ Save  
→ Start  
→ Follow voice  
→ Complete

## Flow B — Daily Use

Open App  
→ Tap Start on an existing routine  
→ Runner begins  
→ User puts phone down  
→ Automatic voice/timing progression  
→ Complete

## Flow C — Edit

Home  
→ Routine detail  
→ Edit  
→ Change/reorder/duplicate/delete steps  
→ Save

## Flow D — Bilateral

Create/select Action  
→ Mark Bilateral  
→ Add to Routine  
→ Generate left/right sequence  
→ Keep symmetric duration by default  
→ Allow deliberate per-side override

---

# 9. Edge Cases

- Blank lines in batch input are ignored.
- Duplicate action names are allowed unless the user chooses to remove them.
- A routine cannot save with zero valid steps.
- Duration must stay within a safe supported numeric range.
- Transition duration may be zero.
- Previous on the first step MUST have defined no-op behavior.
- Skip on the final step MUST finish or request confirmation according to final UX decision.
- Adding +10 seconds near a boundary MUST not create race conditions.
- Pause during transition MUST preserve the transition state correctly.
- App backgrounding exactly at a step boundary MUST resolve to one authoritative step.
- TTS callbacks MUST NOT be authoritative timing signals.
- Editing/deleting an Action MUST NOT invalidate existing routine snapshots.
- App termination during an active routine MUST have a defined recovery behavior in PLAN.

---

# 10. Success Criteria

- **SC-001** A user can create and save a five-step routine without creating each step through five separate full-screen forms.
- **SC-002** A saved routine remains available after app restart.
- **SC-003** A routine can run from first step to completion without continuous screen interaction.
- **SC-004** On a real supported Android device, background/lock-screen testing demonstrates correct session timing and state restoration.
- **SC-005** Pause/resume/previous/skip/+10s pass defined acceptance tests.
- **SC-006** Bilateral actions can produce complete left/right playback with symmetric timing by default.
- **SC-007** Core creation/editing/playback works with network disabled.
- **SC-008** Scope audit confirms no AI, account, cloud backend, payment, or social dependency is required for V1.

---

# 11. Release Acceptance

V1 is releasable only when all P1 user stories are independently testable and pass their acceptance scenarios, all binding constitutional gates pass, and real-device Android background/lock-screen QA is complete.


---

# PART 3 — PLAN

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


---

# PART 4 — TASKS

# TASKS — Stretch Routine V1

**Tasks Version:** V1.0  
**Date:** 2026-09-17  
**Input:** Constitution + SPEC + PLAN  
**Ordering:** Dependency-first, then user-story increments

> Required format: `- [ ] [Txxx] [P?] [US?] Description with file path`

---

# Phase 1 — Setup and Risk Proof

- [ ] T001 Initialize Expo React Native TypeScript Android project and baseline scripts in `package.json`, `app.json/app.config.ts`, and project root.
- [ ] T002 Add code-quality baseline (TypeScript strictness, lint/format commands as selected) in `tsconfig.json` and tooling config.
- [ ] T003 Create source directories from PLAN under `src/` without adding unused abstraction layers.
- [ ] T004 [P] Create test harness and fake-clock testing support under `src/tests/` and `src/services/clock/`.
- [ ] T005 Perform Android TTS technical spike in `src/services/tts/` and record supported behavior in `docs/qa/android-tts-spike.md`.
- [ ] T006 Perform Android background/lock-screen technical spike in `src/services/background/` and record real-device evidence in `docs/qa/android-background-spike.md`.
- [ ] T007 Select and document the final background mechanism after T006 in `docs/architecture/background-decision.md`.
- [ ] T008 Select local SQLite approach and prove create/read/update/migration behavior in `src/data/db/` and `docs/architecture/persistence-decision.md`.

**Phase exit gate:** T005–T008 complete; no implementation proceeds under an unproven “screen must stay on” assumption.

---

# Phase 2 — Foundational Domain and Persistence

- [ ] T009 Define Action domain types in `src/domain/action/`.
- [ ] T010 Define Routine and RoutineStep domain types in `src/domain/routine/`.
- [ ] T011 Define ActiveSession and RunnerState types in `src/domain/session/`.
- [ ] T012 [P] Implement SystemClock and FakeClock in `src/services/clock/`.
- [ ] T013 Create initial SQLite schema and migration runner in `src/data/db/` and `src/data/migrations/`.
- [ ] T014 Implement Action repository interfaces/adapters in `src/data/repositories/actionRepository.ts`.
- [ ] T015 Implement Routine/RoutineStep repository interfaces/adapters in `src/data/repositories/routineRepository.ts`.
- [ ] T016 Implement active-session persistence/recovery repository in `src/data/repositories/sessionRepository.ts`.
- [ ] T017 [P] Add repository CRUD/migration tests in `src/tests/repositories/`.
- [ ] T018 Implement batch-line parser utility in `src/features/routines/services/parseBatchActions.ts`.
- [ ] T019 [P] Add batch parser tests including blank lines/order preservation in `src/tests/domain/parseBatchActions.test.ts`.
- [ ] T020 Implement bilateral step generator and pair-group rules in `src/domain/routine/bilateral.ts`.
- [ ] T021 [P] Add bilateral generation/update tests in `src/tests/domain/bilateral.test.ts`.
- [ ] T022 Implement total routine duration calculation in `src/domain/routine/duration.ts`.
- [ ] T023 [P] Add duration calculation tests including transitions in `src/tests/domain/duration.test.ts`.

---

# Phase 3 — User Story 2: Create a Routine Quickly (P1)

**Goal:** A user can create and save a multi-step routine without repetitive per-step forms.  
**Independent test:** With an empty database, create a five-step routine from five lines, save it, restart the app, and confirm it appears correctly.

- [ ] T024 [US2] Build New Routine screen shell in `src/features/routines/screens/RoutineEditorScreen.tsx`.
- [ ] T025 [US2] Add routine name/default duration/default transition fields in `src/features/routines/components/RoutineFormHeader.tsx`.
- [ ] T026 [US2] Build Quick Input batch-entry UI in `src/features/routines/components/BatchActionInput.tsx`.
- [ ] T027 [US2] Connect batch input to parser and append ordered draft steps in `src/features/routines/hooks/useRoutineDraft.ts`.
- [ ] T028 [US2] Build editable draft-step list in `src/features/routines/components/RoutineStepList.tsx`.
- [ ] T029 [US2] Add per-step edit UI for display name, speak text, duration, and transition in `src/features/routines/components/StepEditor.tsx`.
- [ ] T030 [US2] Add reorder interaction in `src/features/routines/components/RoutineStepList.tsx`.
- [ ] T031 [US2] Add duplicate/delete step actions in `src/features/routines/components/StepActions.tsx`.
- [ ] T032 [US2] Validate save rules and persist routine/step snapshots in `src/features/routines/services/saveRoutine.ts`.
- [ ] T033 [US2] Add routine-creation integration test in `src/tests/integration/createRoutine.test.tsx`.

---

# Phase 4 — User Story 1: Start an Existing Routine (P1)

**Goal:** The primary hands-free flow works from Home to completion.  
**Independent test:** Seed one routine, tap Start, make the fake clock cross all boundaries, and verify ordered completion.

- [ ] T034 [US1] Build Home/My Routines screen in `src/features/routines/screens/HomeScreen.tsx`.
- [ ] T035 [US1] Load and render saved routine cards with step count/estimated duration in `src/features/routines/hooks/useRoutines.ts`.
- [ ] T036 [US1] Add Start action from routine card/detail in `src/features/routines/components/RoutineCard.tsx`.
- [ ] T037 [US1] Implement pure runner state machine in `src/features/runner/domain/runnerMachine.ts`.
- [ ] T038 [US1] Implement elapsed-time/remaining-time calculations using Clock in `src/features/runner/domain/runnerTime.ts`.
- [ ] T039 [US1] Implement current/next-step transition logic in `src/features/runner/domain/runnerTransitions.ts`.
- [ ] T040 [US1] Add state-machine timing tests for normal multi-step completion in `src/tests/domain/runnerMachine.test.ts`.
- [ ] T041 [US1] Build Runner screen in `src/features/runner/screens/RunnerScreen.tsx`.
- [ ] T042 [US1] Bind Runner screen to authoritative session state, keeping UI ticks presentation-only in `src/features/runner/hooks/useRunner.ts`.
- [ ] T043 [US1] Implement TTS cue service with deduplication in `src/services/tts/ttsService.ts`.
- [ ] T044 [US1] Trigger step/transition/completion cues from runner events in `src/features/runner/services/runnerCueCoordinator.ts`.
- [ ] T045 [US1] Build minimal Completion screen in `src/features/runner/screens/CompletionScreen.tsx`.
- [ ] T046 [US1] Add end-to-end-ish runner integration test with fake clock in `src/tests/integration/runRoutine.test.tsx`.

---

# Phase 5 — User Story 5: Control an Active Routine (P1)

**Goal:** Real-world interruptions can be handled without abandoning the routine.  
**Independent test:** During a seeded routine, pause, advance fake time, resume, +10, previous, and skip; verify final state and timing.

- [ ] T047 [US5] Implement pause transition in `src/features/runner/domain/runnerMachine.ts`.
- [ ] T048 [US5] Implement resume timing math in `src/features/runner/domain/runnerTime.ts`.
- [ ] T049 [US5] Implement +10-second runtime extension in `src/features/runner/domain/runnerMachine.ts`.
- [ ] T050 [US5] Implement Previous semantics (restart prior step at full duration) in `src/features/runner/domain/runnerMachine.ts`.
- [ ] T051 [US5] Implement Skip/Next semantics in `src/features/runner/domain/runnerMachine.ts`.
- [ ] T052 [US5] Implement End/confirm-stop semantics in `src/features/runner/domain/runnerMachine.ts`.
- [ ] T053 [US5] Build Previous/Pause/Resume/Skip/+10/End controls in `src/features/runner/components/RunnerControls.tsx`.
- [ ] T054 [US5] Ensure cue queue is cancelled/deduplicated correctly during rapid controls in `src/services/tts/ttsService.ts`.
- [ ] T055 [US5] Add pause/resume/+10/previous/skip/end tests in `src/tests/domain/runnerControls.test.ts`.

---

# Phase 6 — Background and Recovery (Cross-Cutting P1)

- [ ] T056 Integrate selected Android background mechanism from T007 in `src/services/background/`.
- [ ] T057 Persist authoritative active session at required state transitions in `src/features/runner/services/sessionPersistence.ts`.
- [ ] T058 Reconstruct current step/phase from timestamps when foregrounded in `src/features/runner/services/sessionRecovery.ts`.
- [ ] T059 Handle screen lock/unlock without restarting the active routine in `src/features/runner/hooks/useRunnerLifecycle.ts`.
- [ ] T060 Handle TTS failure as non-fatal runner state in `src/services/tts/ttsService.ts`.
- [ ] T061 Add recoverability tests for simulated time gaps/background transitions in `src/tests/domain/sessionRecovery.test.ts`.
- [ ] T062 Execute real-device background/lock-screen QA and record evidence in `docs/qa/android-v1-background.md`.

---

# Phase 7 — User Story 3: Edit and Reuse a Routine (P1)

**Goal:** Existing routines remain easy to adapt.  
**Independent test:** Edit, reorder, duplicate, and delete a routine while proving the original/copy independence.

- [ ] T063 [US3] Build Routine Detail screen in `src/features/routines/screens/RoutineDetailScreen.tsx`.
- [ ] T064 [US3] Load saved routine into RoutineEditor draft mode in `src/features/routines/hooks/useRoutineDraft.ts`.
- [ ] T065 [US3] Persist edited step snapshots and ordering in `src/features/routines/services/saveRoutine.ts`.
- [ ] T066 [US3] Implement Duplicate Routine in `src/features/routines/services/duplicateRoutine.ts`.
- [ ] T067 [US3] Implement confirmed Delete Routine in `src/features/routines/services/deleteRoutine.ts`.
- [ ] T068 [US3] Add edit/reorder/duplicate/delete integration tests in `src/tests/integration/editRoutine.test.tsx`.

---

# Phase 8 — User Story 4: Bilateral Actions (P1)

**Goal:** Left/right completeness and symmetric timing are easy to maintain.  
**Independent test:** Add one bilateral action, generate two paired steps, edit both durations together, then override one side.

- [ ] T069 [US4] Add bilateral/single selector to relevant action creation UI in `src/features/actions/components/ActionEditor.tsx`.
- [ ] T070 [US4] Generate left/right RoutineStep drafts with shared pairGroupId in `src/features/routines/services/addActionToRoutine.ts`.
- [ ] T071 [US4] Add “edit this side / edit both sides” behavior in `src/features/routines/components/StepEditor.tsx`.
- [ ] T072 [US4] Preserve intentional one-side override without breaking pair metadata in `src/domain/routine/bilateral.ts`.
- [ ] T073 [US4] Add bilateral UI/integration tests in `src/tests/integration/bilateralRoutine.test.tsx`.

---

# Phase 9 — User Story 6: Reusable Action Library (P2)

**Goal:** Frequently used actions can be reused across routines without coupling old routines to future edits.  
**Independent test:** Create an action, use it in a routine, rename the Action, and verify the existing routine keeps its snapshot.

- [ ] T074 [US6] Build Action Library screen in `src/features/actions/screens/ActionLibraryScreen.tsx`.
- [ ] T075 [US6] Build create/edit Action UI in `src/features/actions/components/ActionEditor.tsx`.
- [ ] T076 [US6] Implement Action CRUD through repository in `src/features/actions/services/`.
- [ ] T077 [US6] Build multi-select “add from library” UI in `src/features/routines/components/ActionLibraryPicker.tsx`.
- [ ] T078 [US6] Ensure RoutineStep snapshot values are copied on add in `src/features/routines/services/addActionToRoutine.ts`.
- [ ] T079 [US6] Implement safe Action deletion while preserving existing routine snapshots in `src/features/actions/services/deleteAction.ts`.
- [ ] T080 [US6] Add snapshot-independence tests in `src/tests/integration/actionSnapshot.test.tsx`.

---

# Phase 10 — User Story 7: Essential Settings (P2)

**Goal:** Only essential speech/timing preferences are configurable.  
**Independent test:** Change a supported setting, restart the app, and confirm it persists and affects new playback/defaults.

- [ ] T081 [US7] Define minimal settings model/defaults in `src/features/settings/settingsModel.ts`.
- [ ] T082 [US7] Implement settings persistence in `src/features/settings/settingsRepository.ts`.
- [ ] T083 [US7] Build Settings screen in `src/features/settings/screens/SettingsScreen.tsx`.
- [ ] T084 [US7] Apply TTS enabled/rate settings in `src/services/tts/ttsService.ts`.
- [ ] T085 [US7] Apply countdown warning setting in `src/features/runner/services/runnerCueCoordinator.ts`.
- [ ] T086 [US7] Apply default duration/transition to new routine drafts in `src/features/routines/hooks/useRoutineDraft.ts`.

---

# Phase 11 — Accessibility, Error Handling, and Release Hardening

- [ ] T087 [P] Add accessibility labels/roles to primary controls in `src/features/**/components/`.
- [ ] T088 [P] Verify touch-target sizing and large-text behavior on Home, Routine Editor, and Runner.
- [ ] T089 Add local persistence error states and retry-safe save behavior in `src/features/routines/` and `src/features/actions/`.
- [ ] T090 Add invalid/corrupt active-session safe recovery in `src/features/runner/services/sessionRecovery.ts`.
- [ ] T091 Add destructive-action confirmations for routine/action deletion and active-session end.
- [ ] T092 Add migration upgrade test from initial schema to current schema in `src/tests/repositories/migrations.test.ts`.
- [ ] T093 Run full automated test suite and fix failures.
- [ ] T094 Run offline-mode acceptance pass with network disabled and record in `docs/qa/android-v1-offline.md`.
- [ ] T095 Run Android real-device TTS/audio-interruption QA and record in `docs/qa/android-v1-audio.md`.
- [ ] T096 Run accessibility smoke test and record in `docs/qa/android-v1-accessibility.md`.
- [ ] T097 Perform Constitution/SPEC scope audit and record in `docs/qa/v1-scope-audit.md`.
- [ ] T098 Confirm V1 contains no AI SDK/API, auth, backend dependency, payment, social, calorie, wearable, or video-analysis code.
- [ ] T099 Validate all P1 acceptance scenarios and record release matrix in `docs/qa/v1-acceptance-matrix.md`.
- [ ] T100 Produce V1 release candidate only after T062, T093–T099 pass.

---

# Dependency Summary

```text
Setup/Risk Proof
    ↓
Domain + Persistence
    ↓
US2 Create Routine
    ↓
US1 Run Routine
    ↓
US5 Runner Controls
    ↓
Background/Recovery
    ↓
US3 Edit/Reuse
    ↓
US4 Bilateral

Action Library (US6) can begin after Domain + Persistence,
but final integration depends on Routine Editor.

Settings (US7) can begin after foundational persistence/TTS,
but final verification depends on Runner.
```

---

# Parallelization Guidance

Safe examples:

- T009/T010/T011 can be developed in parallel after project setup if their contracts are coordinated.
- T018 and T020 can be developed in parallel.
- Repository tests can proceed beside independent domain tests.
- Accessibility review can proceed screen-by-screen once each screen stabilizes.

Do NOT parallelize edits to the same runner state-machine file without a single owner/reviewer.

---

# MVP / Implementation Strategy

The earliest meaningful executable slice is:

1. local schema;
2. create routine via batch input;
3. save/reopen;
4. deterministic runner;
5. TTS;
6. real Android background proof.

Do not build the full Action Library before proving the Runner.

The highest-risk feature is background/lock-screen execution. Prove it early, not at the end.

---

# Task Completion Rule

A task is not complete merely because code exists.

Mark complete only when:

- required code is integrated;
- tests/QA required by that task pass;
- no constitutional scope violation was introduced;
- the described file/path responsibility is satisfied;
- downstream tasks can rely on the result.


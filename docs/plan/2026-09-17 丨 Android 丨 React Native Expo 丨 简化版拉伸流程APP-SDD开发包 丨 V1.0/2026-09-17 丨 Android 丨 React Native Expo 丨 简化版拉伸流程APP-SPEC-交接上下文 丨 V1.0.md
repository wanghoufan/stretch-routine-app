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

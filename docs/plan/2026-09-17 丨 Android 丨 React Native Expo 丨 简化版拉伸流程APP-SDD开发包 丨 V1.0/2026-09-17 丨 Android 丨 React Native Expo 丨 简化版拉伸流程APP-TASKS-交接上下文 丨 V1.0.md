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

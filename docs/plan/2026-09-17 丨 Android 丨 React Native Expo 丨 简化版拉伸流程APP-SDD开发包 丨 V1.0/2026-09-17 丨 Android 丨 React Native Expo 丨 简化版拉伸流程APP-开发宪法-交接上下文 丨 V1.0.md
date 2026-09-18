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

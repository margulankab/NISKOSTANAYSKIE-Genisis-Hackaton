# Memory Worlds — current progress (amended 2026-11-20)

## 2026-11-21 — Developer A · MW-002 playable fixture loop

Local viewer acceptance passed on `A_development` (USR-01 and AT-10). Both manifest artifacts reveal their own source content. Opening the same artifact twice leaves the ending locked. The closing card is available after both reveals and sends one completion event per opening. Switching fixtures resets the loop, pauses audio and revokes the old media URLs. The labeled static preview preserves the loop if WebGL fails at startup or during play.

- `npm run typecheck` and `npm test` passed. All 32 contract tests passed.
- `$env:PLAYWRIGHT_CHANNEL = 'msedge'; npm run test:browser -- --repeat-each=3` passed all 21 runs of seven scenarios. Coverage includes all three fixtures, each reveal order, mouse and keyboard reveals, emulated mobile tap/orbit/pinch, ending gating, camera reset, context loss, corrupt photo handling, and media cleanup. The first pass exposed an intermittent missing marker and a brittle pixel comparison. The repeat run passed after projecting both markers into one DOM overlay and checking their camera-relative positions.
- `npm run build` and `git diff --check` passed. The static build contains the 3D license file. Vite emitted two Zod annotation warnings and a JavaScript chunk-size warning (371 kB gzip).
- `npm exec -- vite preview --host 127.0.0.1 --port 4191 --strictPort`: Edge smoke and screenshot review covered direct 3D object selection, a projected marker, the closing card, the device-pixel-ratio cap, and zero external requests. A narrow-screen overflow found during review was fixed. The production build then fit both 320 px and 390 px touch-emulated viewports.
- Physical-device touch/audio and public deployment are pending. Next for Developer A is MW-005, followed by MW-006.

## 2026-11-21 — Developer A · MW-001 diorama foundation

The fixture library mounts the same original 3D platform for all three days. Saved palette, lightness, warmth and artifact spacing drive the static composition. Bounded orbit/zoom, camera reset and a labeled WebGL fallback are available. The desktop Edge browser suite passed four tests covering mouse orbit/zoom/reset, emulated mobile touch drag/pinch, no-WebGL fallback, and the three fixture media flows.

`npm run typecheck`, `npm test` (32 checks), `npm run build`, `git diff --check`, and `$env:PLAYWRIGHT_CHANNEL = 'msedge'; npm run test:browser` passed. Fixed initial test typing and trailing whitespace, then reran their checks. Vite emitted Zod annotation and large bundle warnings. Physical touch-device and deploy verification are pending.

## 2026-11-21 — Developer A · MW-000 handoff accepted

Reviewed the Developer B handoff at `a76eaeb` on `A_development`. The viewer accepts the validated manifest, original entry, async Blob resolver, and completion callback through the existing `MemoryViewerProps` interface. Excerpts are half-open JavaScript string ranges. Assets resolve by ID and missing IDs reject. The three fixtures supply bounded palette, lightness, warmth, spacing and music parameters and three source-linked rule records. The viewer uses saved values and owns temporary URLs and completion for each opening.

On this Windows worktree, `npm ci`, `npm run typecheck`, `npm test` (32 checks), and `PLAYWRIGHT_CHANNEL=msedge npm run test:browser` (one test covering all three fixtures) passed. The browser verified decoded original illustrations, original excerpts, and gesture-started playback advancing and pausing. Fixture media is fictional. Public deployment and physical-device audio remain pending.

**Verified:** the user confirms two developers. Initial Git inspection found seven modified root Markdown files and no application code, manifests, tests or deployment configuration. Requirements and the portable case source now exist. External deployments have not been inspected. This session implements documentation, not the game.

**Assumed / active:** this amendment supersedes old staffing, Pydantic/Supabase dependencies and fixture-substitution behavior. Deadline: November 22, 2026, 23:59 Astana. Current hour allocation: [development plan](docs/game_development_plan.md). Traceability: [requirements](docs/00_case_requirements.md), especially USR-03/05/06 and MIN-01–08.

## Research findings

- **Verified [S1/S2]:** Pages Free allows 500 builds/month and assets up to 25 MiB each. Workers Free includes 100,000 requests/day and 10 ms CPU/invocation; CPU time differs from elapsed network wait. Account availability is unverified.
- **Assumed comparison:** local archive plus one function minimizes setup; Supabase provides cloud persistence but adds auth/RLS/media orchestration; memory-only storage fails reopening. Select local storage with portable export/import.
- **Assumed feasibility:** 26 focused hours each is tight but plausible for one diorama system and five content variants. Three independently modeled worlds, custom shaders, streaming integration, cloud sync and narration together are unrealistic.

## Costs

- **Verified [S2/S3]:** Workers is $0 within free limits; paid starts at $5/month. Supabase Free includes 500 MB database, 1 GB files, 5 GB egress plus 5 GB cached egress; inactive projects pause after one week. Pro starts at $25/month. Supabase is deferred.
- **Assumed:** budget and $10 reserve are itemized in the final plan. **Unverified [S4]:** actual Gemini RPM/TPM/RPD and billing activation; do not promise fixed free quotas.

## Implementation notes

All game rows are **Unverified / not started here**. Tests AT-01–16 are defined in the final plan.

| Task | Priority / owner | Acceptance |
|---|---|---|
| MW-000 | P0 / B, A reviews | Shared schema, API/viewer/storage contracts and three mocks; AT-02/16 |
| MW-001 | P0 / A; B scaffolds | Controllable 3D scene and deployed shell; AT-10/13 |
| MW-002 | P0 / A | Two reveals unlock ending; AT-10 |
| MW-003 | P0 / B | Validated text/photo/authorized audio; AT-01 |
| MW-004 | P0 / B | AI manifest/title and honest input-preserving fallback; AT-02/05/11 |
| MW-005 | P0 / A | Shared park/room/city grammar and explanations; AT-03/08/09 |
| MW-006 | P0 / A | Gesture-started playback and measured musical influence; AT-04 |
| MW-007 | P0 / B | Local archive, ZIP export/import, reopen without AI; AT-06/07 |
| MW-008 | P0 / A+B | Five saved examples, three moods, rights-cleared inputs; AT-08/12 |
| MW-009 | P0 / B release; A viewer QA | Deployment, privacy, errors and browser checks; AT-01/02/10/11/13/15 |
| MW-010 | P0 / B package; A video | Seven submission materials and ≤180-second video; AT-12/14 |
| MW-011 | Cut-if-late / A | Optional narration after every P0 passes; AT-12 |
| MW-012 | Deferred / B | Clarifying prompts excluded from deadline scope |

**Next:** MW-000 and MW-001. A develops with mocks while B builds intake/generation/storage. Agreement on this audit's acceptance was supplied in the user's implementation request; no further question is required.

## Risks

- **Unverified release blockers:** paid Gemini eligibility/access, hosting, repository URL, favorite-day consent/media rights, and organizer submission destination.
- **Assumed mitigation:** check services in the first hour, keep saved examples independent of AI, export backups, submit November 22 at 20:00.
- **Assumed cut gate:** if three saved scenes do not reopen by November 21 at 18:00, freeze optional effects. Finish archive, audio, five-example evidence and submission; do not silently drop requirements.
- **Not applicable:** asset/voice procurement comparisons here; docs/planning/IDEAS.md covers those. Frame rate and artistic quality require an actual build.

## Sources

Accessed **2026-11-20**:

- S1: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).
- S2: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- S3: [Supabase pricing](https://supabase.com/pricing).
- S4: [Gemini rate limits](https://aistudio.google.com/docs/rate-limits).
- Repository evidence: `git status --short --branch`, `rg --files`, and complete brief read, 2026-11-20. No game commands exist.

## 2026-11-20 — Repository organization and milestone testing

- Grouped the supporting plans in `docs/planning/`; root working documents, `docs/` requirements and changelog, and `reference/` source remain in place. Historical prose retains original paths.
- Added a milestone testing gate to AGENTS.md. No application or runnable test commands exist in this checkout.
- At organization time, `docs/game_development_plan.md` was absent. **Resolved by this audit:** the delivery plan now exists with schedule and acceptance-test definitions.
- Next priority: MW-000 and MW-001 against the delivery plan's recorded acceptance criteria.

## Current session record

**Verified — 2026-11-20 documentation milestone complete:** requirements extracted first; all seven original files individually read, researched, amended and logged; final plan written after review seven. Added 44 traceable requirement IDs, 16 acceptance-test definitions, two 26-hour tracks, a 55h44 schedule, budget/rights/risks, three-day script and submission checklist. Preserved concurrent moves to `docs/planning/` and the milestone-testing gate. No game code or assets were added.

**Checks actually run:** `git diff --check` passed. A read-only Python document checker passed: seven retained historical blocks with original openings/endings; exact byte equality of copied case source; five required research sections and dates in each amended original; all 27 active local Markdown links across 10 documentation files resolve; 44 requirements map to defined tests; all 16 test IDs exist; allocations sum to A=26h/B=26h; deadline arithmetic is 55h44; seven sequential review entries exist. Official source pages were accessed during each file's review; Google Fonts FAQ content was unavailable and an obsolete Playwright URL returned 404, both recorded honestly with usable alternatives where available.

**Preservation-check limitation:** the initial temporary backup did not survive across sandbox shell calls, so the first automated check failed to locate it. The successful later check verifies structural retention and source-copy bytes, not byte equality of all pre-edit root files. This audit prepended amendments and retained the original bodies. No full pre-edit byte comparison is claimed.

**Not run:** application build, automated runtime tests, browser/gameplay, live model, audio/mobile performance, deployment and submission verification—there is no application or package script yet. Those criteria remain incomplete. **Remaining release blockers:** account eligibility/access, favorite-day media/rights, working prototype and output artifacts, jury repository access and submission channel. **Next priority:** B freezes MW-000's schema/mocks and deployment seam; A begins MW-001's controllable fixture scene. This documentation session purchased nothing and submitted nothing.

## Historical content — preserved verbatim; conflicting decisions superseded above

# Memory Worlds — Progress

## Current State

- Planning date: November 19, 2026.
- Target deadline: November 22, 2026, 23:59 Astana time.
- Implementation status: **planning documents only in this checkout**, verified November 20, 2026. The repository contains seven Markdown documents; no application code, dependency manifests, test scripts, or deployment configuration are present. External deployments have not been checked.
- Working MVP priority: one complete flow from text/photo/song to an interactive scene, saving, and reopening.
- Team: size and names are unconfirmed. Roles A/B/C/D are proposals.

## Now / Next / Blocked

- **Now:** repository inventory checked and planning documents translated into English; assign owners and establish the development environment, local commands, and an early deployment approach.
- **Next:** MW-001 and MW-002 — a scene with controls and two interactive artifacts from a fixture.
- **Blocked:** no application implementation is present in this checkout. Check Gemini/Supabase access, a legal music example, and hosting before expanding the scene.

## Definition of Done

- [ ] The form accepts a story, at least one photo, and a song/audio file.
- [ ] A validated manifest connects text, photos, and music to the visual result.
- [ ] The interactive 3D scene contains at least two artifacts and a clear ending.
- [ ] Park, room, and city share a consistent style.
- [ ] Music plays/opens officially and visibly changes the scene.
- [ ] The title contains 3–7 words.
- [ ] The scene saves and reopens without the LLM.
- [ ] Three demo fixtures are available with AI disabled.
- [ ] Archive, loading/error/fallback states, and an explanation of applied rules are available.
- [ ] An accessible link/instructions, a video of up to 3 minutes, 3–7 examples, a description, and credits are ready.

## Roadmap

- [ ] MW-001 [P0] Web + 3D foundation. Owner: A. Dependencies: none. Acceptance: a controllable scene opens locally.
- [ ] MW-002 [P0] Fixture-driven scene. Owner: A. Dependency: MW-001. Acceptance: two objects reveal different photos/excerpts, and an ending is present.
- [ ] MW-003 [P0] Text, photo, and song intake. Owner: C. Dependency: draft schema. Acceptance: fields are validated and sent to the API.
- [ ] MW-004 [P0] Gemini → Pydantic MemoryScene. Owner: B. Dependency: MW-003 and schema. Acceptance: valid JSON; invalid output is normalized or falls back to a fixture.
- [ ] MW-005 [P0] Consistent style and three templates. Owner: A. Dependency: MW-002. Acceptance: park/room/city are recognizable as one product.
- [ ] MW-006 [P0] Playback and musical influence. Owner: D/A. Dependency: available, authorized audio. Acceptance: audio is audible/opens officially; variants differ noticeably.
- [ ] MW-007 [P0] Saving, archive, reopening. Owner: C/B. Dependency: MW-004/005. Acceptance: the archive opens the saved manifest without generation.
- [ ] MW-008 [P0] Three golden fixtures. Owner: A/B. Dependency: MW-005. Acceptance: three examples work without an external LLM.
- [ ] MW-009 [P0] Reliability and deployment. Owner: C. Dependency: vertical flow. Acceptance: real URLs and fallback are verified.
- [ ] MW-010 [P0] Submission package. Owner: C/D. Dependency: three finished examples. Acceptance: video, description, credits, and instructions are ready.
- [ ] MW-011 [P1] TTS narration. Owner: D. Revisit priority only after P0.
- [ ] MW-012 [P1] One clarifying question. Owner: B/C. Does not block the MVP.

## Scope Cutoff

If three scenes cannot be saved and reopened by 18:00 on November 21, freeze new effects and finish the archive, reliability work, and submission.

## Decisions, Risks, and Evidence

| Topic | Status |
|---|---|
| Participant names and count | Not assigned |
| Gemini/Supabase credentials | Access not checked |
| Hosting and CORS | Not checked |
| Demo track/license | Not selected |
| Repository and commands | Inspected November 20: seven planning documents; no application commands or dependency manifests |
| Deploy URL, screenshots, commit | Not yet recorded |

## Session Log

### 2026-11-19 — Document Preparation
- Completed: reviewed the attached master plan; created the planning document package.
- Code changes: none.
- Code checks: not run.
- Blockers: the future repository's state had not yet been checked.
- Next action: inspect the repository, assign owners, and complete MW-001.

### 2026-11-20 — English Translation
- Completed: translated all seven repository documents into English, preserving task IDs, proposed paths, technical identifiers, requirements, and Markdown structure.
- Repository evidence: Git tracks seven Markdown files; the working tree was clean before translation. No game code, assets, dependency manifests, or test/build scripts were found.
- Code changes: none; documentation only.
- Checks: scanned project documents for remaining Cyrillic text, checked Markdown structure and preserved identifiers against the original files, and ran `git diff --check`.
- Code tests: not run because this checkout contains no application code or test commands.
- Blockers: none for translation; implementation and service access remain outstanding.
- Next priority: MW-001 — agree on acceptance, establish the web/3D foundation, and verify that a controllable scene opens locally.

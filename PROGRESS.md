# Memory Worlds — current progress (amended 2026-11-20)

## 2026-11-21 — MW-007 local archive and ZIP portability

**Status:** MW-007 passed on `B_development`. `/create` saves or exports the generated bundle. `/archive` lists and imports local memories, and `/memory/:id` reopens the saved v1 bundle through the preview. The [archive and ZIP format](ARCHITECTURE.md#mw-007-local-archive-and-zip-portability--2026-11-21) use IndexedDB and fflate 0.8.3 (MIT).

**AT-05/06:** Edge saved two different memories with the same generated title, reloaded the archive, and reopened each by UUID. The exported ZIP used the exact generated title as its root folder. The original and reopened exports contained identical manifest, journal, media, and credits bytes.

**AT-07/11:** A fresh Edge context imported and played a deflated ZIP with an optional PNG preview. Identical reimport left one archive entry. Conflicting text or photo bytes, traversal paths, missing or unreadable media, and unsupported versions were rejected with the existing record intact. Unit checks also covered duplicate paths, checksums, streaming ZIP descriptors, member count, and expanded-size limits. A simulated quota failure during the media write rolled back the day record, preserved the preview, and still allowed ZIP export.

**Checks:** `npm run typecheck`, `npm test` (43 tests), `npm run build`, and `git diff --check` passed. `$env:PLAYWRIGHT_CHANNEL = 'msedge'` followed by `npm run test:browser` passed all 10 scenarios, including the previous intake, offline-generation, and fixture flows. The build retains the two existing Zod annotation warnings.

**Next:** Integrate Developer A's renderer with the archive flow and prepare the five rights-cleared examples for MW-008. Public deployment and physical-device verification remain release work.

## 2026-11-21 — MW-004 local generation

**Status:** MW-004 passed on `B_development` for the browser-local generation and preview milestone. A validated draft generates a v1 bundle with a path-safe title, original-text excerpt, photo and audio measurements, allowed props, and rule provenance. The [implemented flow](ARCHITECTURE.md#mw-004-browser-local-generation--2026-11-21) keeps the draft available on failure and hands the bundle to the preview through `createViewerProps`.

**Checks:** `npm run typecheck`, `npm test` (37 tests), `npm run build`, and `git diff --check` passed. `$env:PLAYWRIGHT_CHANNEL = 'msedge'` followed by `npm run test:browser` passed all seven scenarios. The sandbox initially denied loopback connections. The suite passed with loopback access. The build retains the two existing Zod annotation warnings.

**Evidence:** AT-02 checks v1 validation and malformed bundles. The generation portions of AT-05 and AT-11 cover stable manifests, source-grounded Unicode titles, safe paths, measured audio including silence and a partial window, zero HTTP requests while generating offline, media playback and cleanup, and failure recovery without losing the entry or other selections. The existing AT-01 and three-fixture playback scenarios passed again. Developer A's photo analyzer matches the source on `A_development` byte for byte.

**Next:** MW-007 adds the local archive, reopening, and ZIP export/import. Exported folder names, duplicate titles, and storage failure checks remain pending there. The preview on this branch uses the existing 2D layout. The 3D renderer and physical-device checks remain integration and release work.

## 2026-11-21 — MW-003 local intake

**Status:** MW-003 and AT-01 passed on `B_development`. Developer A accepted the MW-000 shared contract in `6841a07` on `A_development`. The pending review below records the earlier handoff state.

**Delivered:** [Create route and validated draft contract](ARCHITECTURE.md#mw-003-browser-local-intake--2026-11-21) for a dated journal entry, one to three photos, one authorized audio excerpt, and per-asset rights records. File validation runs in the browser and retains the journal and selected files when a correction is needed. The accepted draft lives in the open page.

**Checks:** `npm run typecheck`, `npm test` (32 contract tests), `npm run build`, and `git diff --check` passed. In PowerShell, setting `$env:PLAYWRIGHT_CHANNEL = 'msedge'` and running `npm run test:browser` passed five browser tests. AT-01 coverage includes offline success with PNG/JPEG/WebP and WAV/MP3, missing fields or rights, file count and size bounds, MIME mismatch, corrupt media, decoded dimensions and duration, and a corrected retry with the original journal text and valid photo still selected. Existing fixture decoding and playback passed again. The first retry test used a Playwright payload that filled an empty MIME with a generic value. It now selects a genuinely untyped File with DataTransfer. Vite still reports the two existing non-blocking Zod annotation warnings.

**Test media provenance:** The browser tests reuse the original fixture PNG and locally generated PCM tone, create JPEG and WebP test images with canvas, and use an original three-second sine tone encoded as MP3 with FFmpeg and libmp3lame. The MP3 is test-only. Running the suite uses the checked-in file and does not require FFmpeg.

**Next:** MW-004 consumes the validated draft for deterministic local generation. Production hosting and physical-device checks remain with release verification.

## 2026-11-21 — MW-000 Developer B handoff

**Status:** Implementation and local verification complete on `B_development`. Developer A's contract review is pending (USR-03 and the MW-000 handoff referenced by AT-16). **Developer A, please review** the [implemented contract](ARCHITECTURE.md#mw-000-implemented-contract--2026-11-21), especially the original-text offsets, asset resolver, visual parameters, and rule records, then confirm the handoff before MW-001 integration.

**Delivered:** A runnable Vite/React fixture library, strict v1 scene and bundle schemas, viewer props, async repository interface and in-memory adapter, and nostalgic park, tense room, and calm city test bundles. All three days are fictional. Illustrations and audio are original fixture assets with per-asset provenance. The audio envelope is measured from its generated PCM.

**Verification:** `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` passed on Windows with Node.js 24.17.0. Vitest passed 32 checks including the AT-02 cases for malformed versions, IDs, titles, artifacts, rules, and source references. Build emitted static `dist/` output. Rollup reported two non-blocking pure-annotation warnings inside Zod. The sandboxed npm install failed and succeeded with registry access.

**Browser:** `$env:PLAYWRIGHT_CHANNEL = 'msedge'` followed by `npm run test:browser` passed in desktop headless Edge after using an explicit IPv4 loopback address and running with permission to launch the browser. All three images decoded at 480 px, all three source excerpts rendered, and every four-second WAV advanced after a user gesture and paused through the same control. This check measures browser playback state. Device-level audibility and mobile playback belong to MW-006/009.

**Tools and licenses:** React, React DOM, Zod, Vite, Vite React plugin, Vitest, and the TypeScript declaration packages declare MIT. TypeScript and Playwright Test declare Apache-2.0. Versions are pinned in the npm lockfile. The build uses bundled fixture images and browser-created audio. Static hosting, user intake/generation, durable storage, ZIP I/O, and 3D remain later milestones.

**Next:** MW-003 validated local intake after the MW-000 review.

## 2026-11-21 — zero-cost billing decision

**Decision:** P0 now has an expected cash cost of **$0**. Replace paid Gemini and the Pages Function with deterministic in-browser TypeScript generation. Keep Cloudflare Pages Free for static hosting, IndexedDB/ZIP for storage, local photo/audio analysis, original or open-licensed resources, local tests, and OBS. The existing $5 Gemini prepayment and optional $5 Workers allowance below are historical estimates, not approved purchases or current dependencies.

**Requirement effect:** USR-02's earlier AI-title choice is superseded by the user's zero-cost direction. MIN-04, SUB-03, and VIS-04 remain satisfied by input-dependent 3–7-word titles produced by the prototype; VIS-09 verifies that AI is optional. MW-004 now means local rules, validation, provenance, and input-preserving failure behavior. No application code exists yet, so this is a documentation decision, not implementation evidence.

**Checks required during implementation:** prove deterministic titles vary with relevant input, contain only permitted/source-grounded words, meet length/path-safety rules, survive export/import, and require no network request. Verify the deployed static app remains within Cloudflare Free limits. Any future external AI experiment must use fictional non-personal data unless separately approved under suitable paid/privacy terms.

**Documentation milestone checks — 2026-11-21:** `git diff --check` passed (Git reported only prospective LF→CRLF working-copy notices for two Markdown files). A read-only PowerShell audit scanned all 11 Markdown files: every local Markdown link resolved; MIN-04, SUB-03, VIS-04, VIS-09, USR-02, AT-05, and AT-11 references were present; the active plan contained the $0 total and local no-model generation decision; and the earlier paid-option research remained preserved. No application build, runtime test, browser test, deployment, account check, or purchase was performed because this checkout still contains no application code or package scripts. Implementation acceptance remains incomplete.

**Sources checked — 2026-11-21:** [Gemini API pricing and data-use comparison](https://ai.google.dev/gemini-api/docs/pricing), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/), and [Pages Functions/static asset pricing](https://developers.cloudflare.com/pages/functions/pricing/). Published availability does not verify that the team's accounts or deployment work.

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

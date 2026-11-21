# Documentation changelog

## 2026-11-21 — zero-cost billing review

| Order | Files | Change | Requirement trace |
|---|---|---|---|
| 09 | AGENTS.md, ARCHITECTURE.md, PROGRESS.md, README.md, docs/00_case_requirements.md, docs/game_development_plan.md, docs/planning/PROJECT_PLAN.md, docs/planning/TASKS_BY_FILE.md | Preserved the prior paid-service research and added superseding zero-cost amendments. Replaced paid Gemini/Pages Function P0 with deterministic browser-local generation and static Cloudflare Pages Free hosting; revised USR-02, budget, task ownership, paths, acceptance checks, privacy constraints, and blockers. No purchase, account, deployment, or application implementation occurred. | MIN-02/04/05/07, SUB-03/07, VIS-04/09, ETH-01/06, USR-02/03/06 |

**Verified — 2026-11-20:** starting inventory was seven root Markdown files: AGENTS.md, PROGRESS.md, ARCHITECTURE.md, IDEAS.md, PROJECT_PLAN.md, TASKS_BY_FILE.md, README.md. All already had uncommitted edits. No docs directory, application manifests, code, tests, or deployment configuration existed. Reviews below are sequential; generated checklist, source copy, changelog and final plan are deliverables, not additional items in the original inventory.

| Date / sequence | File | Change / key decision | Requirement trace |
|---|---|---|---|
| 2026-11-20 / 00 | docs/00_case_requirements.md; reference/document_en.md | Extracted complete requirements and evidence map first; retained an exact portable copy of supplied brief. No independent organizer authentication claimed. | MIN-01–08, SUB-01–07, EVAL-01–05, ETH-01–07, VIS-01–11, USR-01–06 |
| 2026-11-20 / 01 | AGENTS.md | Full read → official-source research → active amendment → this log entry. Preserved original text. Chose shared Zod validation, input-dependent composition, honest failure provenance and two roles. Approved audit acceptance recorded. | MIN-02/07, ETH-01–06, USR-03/05 |
| 2026-11-20 / 02 | PROGRESS.md | Full read → separate hosting/quota/storage research → active roadmap → log. Confirmed two roles, no implemented game, local persistence, five examples and release blockers; preserved old progress. | MIN-01–08, VIS-05, USR-03/06 |
| 2026-11-20 / 03 | ARCHITECTURE.md | Full read → engine/model/storage/ZIP research → active contract → log. Selected Vite/R3F/Zod, one function and IndexedDB; defined generation, viewer, repository, bundle, limits and failure behavior. Historical Python/Supabase/API proposals retained, superseded. | MIN-01–05, VIS-06–09, ETH-01/02/05, USR-01–04 |
| 2026-11-20 / 04 | IDEAS.md | Full read → audio/assets/font/voice research → scope amendment → log. Selected original primitives, optional Kenney, licensed file audio, Inter with OFL; defined measurable music experiment; cut narration and extra systems. Google Fonts FAQ marked unverified; original backlog retained. | MIN-03/06, VIS-01–07, ETH-01–05, EVAL-01/02 |
| 2026-11-20 / 05 | PROJECT_PLAN.md | Full read → separate deployment/billing/region research → feasibility amendment → log. Original plan preserved and superseded; 52 person-hours, five examples. Newly verified $5 Gemini minimum prepayment distinguishes $1.11 usage from $5–10 cash need. | SUB-01–07, EVAL-01–05, USR-03/06 |
| 2026-11-20 / 06 | TASKS_BY_FILE.md | Full read → routing/testing/helper-license research → compact path/owner map → log. Defined three mock profiles and independent seams; selected targeted Vitest/Playwright plus real-device QA. Old Playwright URL failed; current official source verified. Historical tree retained. | MIN-01–08, USR-03, SUB-06/07 |
| 2026-11-20 / 07 | README.md | Full read → recording/repository/AI-rights research → active entry point → log. Selected OBS, distinguished actual audit tools from planned game tools, documented absent runtime commands and local-archive limitations. Original README retained. All seven initial files now processed. | MIN-07/08, SUB-01–07, ETH-06, USR-05/06 |
| 2026-11-20 / 08 | docs/game_development_plan.md | Written only after all seven reviews. Defined contracts, visual/music rules, 26h per developer, recalculated 16:15 start and 55h44 window, rights/budget/risks, seven submission outputs, three-day video and AT-01–16. Configured Git remote identified; public access unverified. | All checklist IDs |

**Preservation policy:** active amendments precede each original, which remains verbatim under a historical marker. No original project text is deleted. Supersession is explicit; historical API/stack/role proposals are not current instructions. Checks and later corrective entries are recorded at the end of this log.

## 2026-11-20 — Repository organization

Moved IDEAS.md, PROJECT_PLAN.md, and TASKS_BY_FILE.md to `docs/planning/` to group supporting plans. Updated active relative links; historical prose and the audit log retain their original paths. Added the milestone testing gate to root AGENTS.md. The referenced `docs/game_development_plan.md` was already absent and remains a blocker.

## 2026-11-20 — Concurrent-change reconciliation

**Verified:** the organization above occurred while the sequential audit was in progress. Preserved its three moves, updated links and milestone-testing rule. The new delivery plan resolves the previously recorded missing-plan blocker; README.md and PROGRESS.md now say so. The audit's original file names and review order remain historical evidence. No supporting document was deleted by this audit.

**Check limitation:** the first automated preservation attempt could not read its initial temporary backup because the sandbox gives later shell calls a different temporary directory. That attempt failed; no byte-for-byte pre-edit comparison is claimed. The final pass checks retained historical blocks, original opening/closing text, source-copy byte equality, active links, requirement/test mapping, research sections and schedule arithmetic. Original documents were amended by prepending material, not replacing their bodies.

## 2026-11-20 — Final audit checks

**Verified:** read-only Python checks passed for all seven historical blocks/openings/endings, exact copied-source bytes, required research sections/dates, 27 active local links across 10 docs, 44 requirement IDs mapped to 16 defined acceptance tests, seven ordered review log entries, 26 hours per developer and 55h44 remaining-window arithmetic. `git diff --check` passed. Synchronized ARCHITECTURE.md with the later verified $5 Gemini prepayment finding; preserved actual account eligibility as unverified. Updated PROGRESS.md with completion evidence, limitations, blockers and next priority.

**Not run:** application tests/build/browser checks, live provider calls, deployment or submission. No runnable application exists, no paid service was activated, and no personal material was published. Runtime acceptance remains pending. Documentation audit tools used are disclosed in README.md and the final plan.

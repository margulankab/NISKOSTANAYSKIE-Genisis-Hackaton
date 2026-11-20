# Memory Worlds — active working rules (amended 2026-11-20)

**Verified:** the user approved the documentation audit and two-developer plan. No further acceptance confirmation is needed for that audit. Its acceptance is complete per-file research, preserved originals, traceable requirements, a feasible schedule, and recorded checks. [Requirements](docs/00_case_requirements.md): USR-03/05/06, MIN-01–08, ETH-01–07.

**Assumed / active decisions:** this amendment supersedes conflicting technical, staffing, and fixture-fallback statements in the historical text below. Read this amendment, PROGRESS.md, and relevant ARCHITECTURE.md sections before work. The source of case requirements is `reference/document_en.md`; the current delivery plan is `docs/game_development_plan.md`. All application work remains planned until evidenced.

## Research findings

- **Verified [S1/S2]:** Zod provides runtime validation and TypeScript inference; Gemini can return schema-constrained JSON. Shape validation does not establish factual correctness or authorization.
- **Assumed choice:** shared TypeScript/Zod over duplicate TypeScript/Pydantic models or handwritten checks: one contract reduces two-person integration work. Pydantic remains suitable for a Python backend, which this sprint does not need. No new graph/index pipeline is needed for this seven-document audit; honor the user's sequential workflow.
- **Verified [S3/S4]:** provider terms affect admissible personal data and music use. Avoid Spotify Platform content in this game; use authorized local audio. Paid Gemini is the selected processing mode; permission to upload personal content is still required.

## Costs

- **Assumed:** validation has $0 marginal service cost; no model requests are needed to audit documentation. Runtime AI budget and hosting limits belong in the development plan; do not imply an account or credits have been provisioned.
- **Unverified:** credentials, billing, quotas, media rights, and actual application performance.

## Implementation notes

- **Assumed / required practice:** build memories from input-dependent rules and reusable geometry, never pick a finished memory template. Fixed code/catalogs are allowed; free-form AI code, arbitrary URLs, shaders, and coordinates are forbidden.
- Validate bounded enums/numbers, asset references, original-text excerpt ranges, and 3–7-word titles. Keep schema, seed, and rules version with each saved manifest. Preserve input on failure; a labeled rule-based draft may replace generation, but an unrelated fixture may not replace the user's memory.
- Retain park/room/city as small variants of one visual system. Use five saved examples for the feed test, three for the detailed mood demonstration. Two developers only: A scene/audio/presentation; B schema/intake/API/archive/release.
- Preserve existing work. When replacing prose, retain the original as historical material and log the decision. Keep new requirements linked to their IDs. Verify actual package scripts before publishing run commands.
- Maintain a rights/tool ledger: photo consent, track license including demo video/export, asset and font licenses, voice provenance, and AI disclosures. No voice cloning or diagnostic claims. Do not publish private entries by default.

## Focused code inspection

- Before creating or editing code, read the relevant sections of ARCHITECTURE.md and any applicable architecture documents, then identify the likely files and code areas to change.
- Inspect those files and their relevant interfaces, callers, dependencies, and tests using targeted searches and reads. Expand the scope when the evidence or task requires it; do not read every project file by default.
- Treat architecture as a guide, not proof of implementation: verify the actual code and applicable local instructions before making changes.

## Milestone testing

- At the end of every milestone or new phase, test the integrated system against that milestone’s acceptance criteria and relevant previously completed flows before starting the next phase. Include appropriate automated and manual checks, including failure paths where applicable.
- Record the milestone, checks or exact commands, results, and unresolved failures in PROGRESS.md. Fix failures and rerun the affected checks before marking the milestone complete; if a check cannot run, record the reason and leave the affected acceptance criteria incomplete.
- For documentation-only milestones, verify the changed documents and links; do not report application tests as passed when no runnable application exists.

## Risks

- **Assumed:** the largest process risk is treating proposed documentation as implementation evidence. Keep checked tasks separate from untested acceptance criteria.
- **Assumed:** duplicated historical text can mislead readers. Only the active amendment and current plan govern the sprint where old decisions conflict; the historical text is retained for auditability.
- **Not applicable:** asset-pack, rendering-engine and voice-service procurement comparisons in this working-rules document; their decisions are reviewed in ARCHITECTURE.md and docs/planning/IDEAS.md.

## Sources

All accessed **2026-11-20**. External facts above are verified from these pages; recommendations remain assumed.

- S1: [Zod](https://zod.dev/) — validation, inference, JSON Schema conversion.
- S2: [Gemini structured output](https://aistudio.google.com/docs/structured-output) — data-only schema response support.
- S3: [Gemini terms](https://aistudio.google.com/docs/terms) — data handling, age/region and output responsibilities.
- S4: [Spotify developer policy](https://developer.spotify.com/policy) — game/synchronization restrictions.

## Historical content — preserved verbatim; conflicting decisions superseded above

# Memory Worlds — Working Rules

This file is intended for the future repository root. It currently belongs to the planning package; first check and adapt it to the actual project structure.

## Project and Source of Truth

Memory Worlds turns a day's text, photographs, and music into a short interactive 3D memory. The implementation is built from validated data and fixed templates, not executable AI-generated code.

Before each task:
1. Read this file and PROGRESS.md.
2. Check the code, Git state, and actual project commands.
3. Open the relevant sections of ARCHITECTURE.md.
4. Choose the highest available P0 task and agree on its acceptance criterion before making changes.

## Product Invariants

- Text preserves meaning; photos add authentic artifacts; music influences pacing and atmosphere.
- Style, camera, and interactions remain consistent across all three environments.
- Gemini returns structured data only. Do not execute, evaluate, or render free-form code from its response.
- Rendering is deterministic for the saved manifest, seed, schema version, and rules.
- Personal text excerpts must come from the user's entry, not be invented and presented as real memories.
- The folder name contains 3–7 words. The archive reopens the saved manifest without generating it again.

## Engineering Work

- Start with a minimal vertical slice using a fixture, then expand.
- Verify actual dependencies and scripts before adding commands to documentation.
- Keep changes narrow; do not add major abstractions or P1 ideas without revisiting the schedule.
- Run an appropriate check after changes and record the result. Do not claim that tests passed if they were not run.
- If a schema, endpoint, file, or storage approach changes, synchronize ARCHITECTURE.md.
- At the end of each session, update PROGRESS.md with status, evidence, blockers, and the next task.

## Security, Rights, and Privacy

- Do not put API keys or Supabase service-role secrets in client code, the repository, or examples.
- Upload only photos and audio authorized by the user; do not download streams from third-party music services.
- Validate MIME type, size, and authorized media access; do not make personal entries public by default.
- Treat text, metadata, images, and LLM responses as untrusted input.
- Allow only listed presets/props/enums; bound strings and numbers; reject arbitrary URLs and coordinates from the LLM.
- Emotional interpretation is an artistic treatment, not a psychological diagnosis.
- Use models, music, and textures with clear usage rights, and provide credits.

## Completion Protocol

Briefly state what changed, where, which checks passed or were not run, remaining blockers, and the next priority task. Mark a task complete only after its acceptance criterion is met.

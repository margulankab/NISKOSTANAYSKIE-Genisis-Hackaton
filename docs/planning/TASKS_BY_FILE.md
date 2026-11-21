# Memory Worlds — active task/file map (amended 2026-11-20)

## Zero-cost file-map amendment — 2026-11-21

Replace the planned `functions/api/memories/generate.ts` path with `src/generation/generate-memory.ts` and focused tests under `tests/generation/`. The module performs bounded, deterministic, source-grounded title/context selection locally and returns the same validated `MemoryScene` contract with `generation.mode: rules`. No server secret, Pages Function, Gemini adapter, provider retry, or billing configuration belongs in P0. Static Cloudflare Pages Free deployment remains the selected hosting target.

**Verified:** application paths below do not yet exist. **Assumed:** this compact single-app target supersedes the historical monorepo and A/B/C/D assignments. Keep original content below for audit history. Requirements: USR-03, MIN-01–08, SUB-01–07; contracts are authoritative in [ARCHITECTURE.md](../../ARCHITECTURE.md), hours in [the final plan](../game_development_plan.md).

## Research findings

- **Verified [S1/S2]:** Vite supports React/TypeScript setup; Pages Functions use filesystem routing. **Assumed:** one repository-root web app avoids unused monorepo scaffolding and separate API deployment.
- **Assumed test comparison:** manual-only checks miss repeatable validation regressions; Vitest tests pure schema/rule functions [S3]; Playwright checks actual browser persistence/navigation [S4]. Select a small Vitest contract suite plus one browser end-to-end suite and manual audio/mobile checks, not exhaustive screenshot tests.
- **Verified [S5/S6/S7]:** Drei supplies R3F helpers; Three.js and Drei publish MIT licenses. **Assumed:** use OrbitControls and DOM overlays to save camera/label work, preserving notices. Verify exact installed package licenses and versions before disclosure.

## Costs

- **Assumed:** no paid test service or purchased library; run checks locally. Hosted CI, package installation success and runtime versions are **Unverified**. Media/font/voice rights and costs are recorded in IDEAS.md; AI/hosting in the final plan.
- **Assumed:** all implementation/check work fits the 26-hour-per-person allocations; installing a full CI platform or separate backend is not an additional hidden task.

## Implementation notes

All rows are **Assumed proposed paths**. No file presence implies acceptance.

| Path/group | Owner | Tasks | Handoff / acceptance |
|---|---|---|---|
| `package.json`, lockfile, Vite/TS/Wrangler config | B | MW-000/001/009 | One install/build/dev process; deployed shell; only verified scripts enter README |
| `src/shared/memory-schema.ts` | B; A reviews | MW-000/004 | One schema/type source, bounded fields, source checks; AT-02 |
| `src/fixtures/` | B initial mocks; A examples | MW-000/008 | Three schema-valid mocks immediately, five real saved examples by feed gate |
| `src/App.tsx`, `src/ui/` | B | MW-003/007 | Intake/archive/routes/loading/errors; viewer mounted through shared contract |
| `src/scene/MemoryViewer.tsx`, `src/scene/rules.ts` | A | MW-001/002/005 | Controls, two reveals, ending, deterministic layout, actual-rule explanations |
| `src/media/` | A | MW-005/006 | Photo palette/lightness and audio envelope; B starts with mocked features |
| `src/data/repository.ts`, `src/data/bundle.ts` | B | MW-007 | Transactional IndexedDB and bounded ZIP export/import; AT-06/07 |
| `functions/api/memories/generate.ts` | B | MW-004/009 | Same-origin POST and typed errors; server secret; no original media upload |
| `public/examples/`, `public/assets/` | A content; B loading | MW-008 | Only rights-cleared public media and five manifests; stable example routes |
| `tests/`, `e2e/` | B contracts/storage; A rules/viewer | MW-009 | Negative validation, deterministic rules, save/reload and API-off checks |
| `docs/sources-and-credits.md`, `docs/submission.md` | B; A art/video | MW-010 | Actual resources, tools, licenses, output links, rendered description and submission receipt |

**Assumed mock specification:** B supplies three complete JSON objects conforming to ARCHITECTURE.md v1: `nostalgic-park` (warmth .8, energy .25, tension .1, valence .7), `tense-room` (.25, .8, .85, .35), `calm-city` (.5, .2, .1, .6). Each has the same required groups, unique IDs, one local test photo/audio reference, two artifacts and valid source offsets. Mock provenance is `rules`; mock titles never count as AI evidence. A uses generated placeholder textures/test tones only in development; final examples require real authorized assets and successful generated titles.

**Assumed synchronization:** B owns schemas/function/storage; A owns renderer/rules/analysis. B first creates the scaffold and contract so A can start immediately; form uses mock feature results until A's analyzer arrives. Each integration checks JSON against the shared schema before art review. Contract changes update both sides and all mocks together. Do not create historical `services/api`, `supabase/migrations`, or Next.js route trees.

## Risks

- **Assumed:** same-file edits and implicit schema changes create avoidable blocking. A provides renderer props/events; B provides IDs/asset resolver; neither module reaches into the other's persistence/network code.
- **Unverified:** exact browser support, package compatibility, tests, build commands and deployment. Real mobile playback/performance must be checked; browser emulation alone is not hardware evidence.
- **Unverified source:** the old Playwright `/docs/test-intro` URL returned 404; current `/docs/intro` was read successfully. Do not copy obsolete commands or assume pages exist from memory.
- **Not applicable:** new engine or paid asset comparisons here; those decisions are resolved in ARCHITECTURE.md/IDEAS.md.

## Sources

Accessed **2026-11-20**:

- S1: [Vite guide](https://vite.dev/guide/).
- S2: [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/).
- S3: [Vitest guide](https://vitest.dev/guide/).
- S4: [Playwright current introduction](https://playwright.dev/docs/intro).
- S5: [Drei helpers](https://github.com/pmndrs/drei).
- S6: [Three.js MIT license](https://raw.githubusercontent.com/mrdoob/three.js/dev/LICENSE).
- S7: [Drei MIT license](https://raw.githubusercontent.com/pmndrs/drei/master/LICENSE).
- Failed source: `https://playwright.dev/docs/test-intro` — **unverified**, HTTP 404; replaced by S4.

## Historical content — preserved verbatim; conflicting decisions superseded above

# Plan by File and Task

This is a target tree, not a list of existing files. Check the actual repository first; combine small modules if that speeds up the vertical slice. Do not create architectural scaffolding that is not yet used.

## Roles

- **A:** interface and 3D.
- **B:** AI, backend, and data schema.
- **C:** product flow, archive, integration, and release.
- **D:** audio and QA, if there is a fourth team member.

## Target Repository

| Path | Task/Deliverable | Owner | ID | Acceptance |
|---|---|---:|---|---|
| README.md | Installation, startup, demo, limitations, credits | C | MW-009/010 | Commands verified against the actual project; instructions match the build |
| .env.example | Variable names and explanations only, no secrets | B/C | MW-004/007 | No secret keys/values |
| apps/web/app/page.tsx | Landing page/entry to creation | C | MW-003 | The user can find the day creation flow |
| apps/web/app/create/page.tsx | Text, photo, and song form; loading/error states | C | MW-003/009 | Input is validated; errors are clear |
| apps/web/app/archive/page.tsx | Grid of saved memories | C | MW-007 | List displays the owner's saved days |
| apps/web/app/memory/[id]/page.tsx | Reopen a scene from its manifest | A/C | MW-007 | Scene opens without calling Gemini |
| apps/web/components/memory/DayForm.tsx | Fields and local preliminary validation | C | MW-003 | Text, photos, and audio/link reach the API |
| apps/web/components/memory/MemoryCard.tsx | Archive card and 3–7-word title | C | MW-007 | Opens the correct id without regenerating |
| apps/web/components/memory/SceneExplanation.tsx | Show the rules actually applied | A/C | MW-005 | Explanation matches the manifest and rendering |
| apps/web/components/scene/MemoryCanvas.tsx | R3F Canvas and scene lifecycle | A | MW-001 | Canvas starts reliably; WebGL fallback exists |
| apps/web/components/scene/SceneBuilder.tsx | Manifest → deterministic composition | A | MW-002/005 | The same manifest + seed produces a repeatable scene |
| apps/web/components/scene/Environment.tsx | park, room, city templates | A | MW-005 | All three templates look like one product |
| apps/web/components/scene/MemoryArtifact.tsx | Interactive object catalog | A | MW-002 | Two different objects reveal their own details |
| apps/web/components/scene/PlayerController.tsx | Camera, walking/clicking, desktop fallback | A | MW-001 | The path to the artifacts is traversable |
| apps/web/components/scene/PhotoSurface.tsx | Photograph as a texture/artifact | A | MW-002/005 | Photo is readable and linked to its source |
| apps/web/components/scene/MusicReactivity.tsx | Authorized audio → smoothed effects | D/A | MW-006 | Available audio signal visibly changes the scene |
| apps/web/components/scene/NarrativeDirector.tsx | Arrival → explore → reveal → finish | A | MW-002 | Ending is driven by interaction, not a timer |
| apps/web/lib/scene-schema.ts | TypeScript types and client validation | A/B | MW-003/004 | Client and Pydantic agree on enums/ranges |
| apps/web/lib/scene-rules.ts | Deterministic visualization rules | A | MW-005 | Manifest changes light, pacing, and objects in explainable ways |
| apps/web/lib/photo-analysis.ts | Image palette/brightness | A | MW-005 | Color is analyzed without psychological diagnosis |
| apps/web/lib/audio-analysis.ts | Properties of available/authorized audio only | D/B | MW-006 | Unavailable fields honestly remain unknown/null |
| apps/web/lib/api.ts | Typed API calls | C/B | MW-003/007 | Shared errors/responses are typed |
| services/api/main.py | FastAPI, CORS, readiness | B | MW-004 | GET /health does not expose secrets |
| services/api/routers/memories.py | Generation, saving, listing, and reading | B/C | MW-004/007 | Contracts are documented; rereading does not call the LLM |
| services/api/routers/uploads.py | Media validation/storage or signed upload | B | MW-003/007 | Type/size/access are controlled |
| services/api/schemas/memory.py | Pydantic request and MemoryScene models | B | MW-004 | Invalid enums/ranges/media refs are rejected |
| services/api/services/gemini.py | Gemini request with constrained structure | B | MW-004 | Output is data only; invalid responses are not executed |
| services/api/services/normalize.py | Enum mapping, limits, fallback, provenance | B | MW-004 | Every response becomes a valid manifest or fixture |
| services/api/services/storage.py | Supabase operations and media references | B/C | MW-007 | Scene and media refs are isolated by owner |
| services/api/tests/ | Contract and endpoint tests | B/C | MW-004/007/009 | Valid, invalid, and repeatable requests are tested |
| supabase/migrations/ | Tables, relationships, and RLS | B/C | MW-007 | Access matches the demo/auth model |
| fixtures/nostalgic-park.json | Golden park example | A/B | MW-008 | Works without network access or AI |
| fixtures/tense-room.json | Golden tense-room example | A/B | MW-008 | Different atmosphere, same design language |
| fixtures/calm-evening.json | Golden calm example | A/B | MW-008 | Third scene opens from the archive |
| apps/web/public/assets/ | Licensed models/textures/demo audio | A/D | MW-005/006 | Source and license recorded for every file |
| docs/sources-and-credits.md | Sources, licenses, AI and human contributions | C/D | MW-010 | No unknown/unverified credits in the list |
| docs/demo-script.md | Video script and examples | C | MW-010 | Script fits within 3 minutes |

## Stages and Dependencies

1. **MW-001:** set up the web app and scene; first identify the actual package manager and commands.
2. **MW-002:** build a fixture scene with two artifacts and an ending. This is the early demo flow.
3. **MW-003:** add text/photo/song intake. A draft form can be built alongside MW-002, but agree on the request contract.
4. **MW-004:** connect Gemini, Pydantic, and normalization after agreeing on the schema.
5. **MW-005:** add three environments and consistent style rules.
6. **MW-006:** audio playback/official link and noticeable effects; verify rights.
7. **MW-007:** persistence, archive, and reopening from the saved manifest.
8. **MW-008:** three golden fixtures independent of external AI.
9. **MW-009:** upload errors, WebGL, CORS, storage, and deployment.
10. **MW-010:** instructions, credits, three examples, and video.
11. **MW-011/012:** only after P0 is complete; voice and a clarifying question do not block release.

## Parallel Work

- A starts MW-001/MW-002 using a fixture manifest.
- B defines the Pydantic schema and stabilizes MW-004 while A works without waiting for AI.
- C prepares the form and tables/archive cards after the manifest fields are fixed.
- D checks the audio license and A/B experiment without blocking the scene.
- Assign an integration owner at each handoff: manifest JSON, media upload/reference, generate/save response.

## Status Rule

All paths in the table are **proposed**. Implement them only after checking the actual structure. “Done” means the criterion has actually been met and verified; the presence of a file alone does not complete a task.

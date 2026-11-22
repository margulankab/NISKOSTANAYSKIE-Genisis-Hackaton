# Memory Worlds — current progress (amended 2026-11-20)

## 2026-11-22 — Combined site, memory library, shift lock and the one-file release

The site was minimised: the header is now the wordmark (home), Library, New game and Settings, and the status bar, ticker, cassette aside and World preview link were removed. The title screen shows a fanned memory showcase. The new `/library` page holds saved worlds and days and the five example days, plus Archive and Create a memory. Animations: title letters rise, library cards rise in sequence, and pages use view transitions. In the game, a tap of Shift toggles shift lock, holding Shift runs, and Space interacts without scrolling. In full screen the world is fixed and only the side panel scrolls. Settings gained Customize (field of view, look sensitivity, ink weight, text size). `npm run build:single` writes the whole game as one file, committed as `release/memory-worlds.html`. The claude.ai page (https://claude.ai/artifact/D1tFJaQ9gxwUxkErVw2a4v) was republished with this build. [Architecture](ARCHITECTURE.md#site-memory-library-shift-lock-and-the-single-file-release--2026-11-22).

**Checks run (Linux container, Chromium headless with SwiftShader):**

- `npm run typecheck` passed, and `npm test` passed **168** unit tests.
- Full browser suite, `--workers=2`, **56 tests**: 47 passed on the first run.
  - The 9 failures shared one cause: the walk helper clicked `link "New Game"`, which now also matched the header's "New game". With `exact: true`, all 9 passed on rerun (`--last-failed`).
  - Four specs were updated for the new navigation: Library instead of the Archive header link, and a direct `/world-preview` visit.
- New tests in `e2e/first-person.spec.ts`:
  - shift lock toggles on a Shift tap, the mouse turns without dragging, and holding Shift while walking keeps the lock;
  - Space leaves the scroll position unchanged;
  - the library lists a saved world with the five examples, filters to Examples and opens one.
- The one-file build opened from `file://`: library, New game → prompt → Enter world, the Russian night prompt, all four fonts loaded, and the soundtrack played. A first test of it exposed hash-mode view transitions timing out, because their callback waited for an animation frame. Fixed and rechecked.
- Screenshots at 1366 px (title, library, the locked full-screen game), and the library at 390 px with no horizontal overflow.

**Not verified here:** pointer lock and shift lock with a real mouse, phones in full screen, and the claude.ai page's frame permissions for pointer lock.

## 2026-11-22 — First-person worlds, ink look, merged branches and a playable web build

Merged `main` (PR #5) and `B_development` (B's titles, empty states and pause hint) into `claude/keen-bell-fkqitv`. Where both branches changed the same screen, the GENESIS interface was kept. `claude/practical-carson-k6sox5` holds the superseded 2026-11-20 prototype and was not merged. Worlds now open in first person, with drag or ←/→ to look and V for third person. A toon-and-ink look is drawn over every 3D view. Render resolution adapts to the device. A static web build runs from any host. The fictional-days example library is unchanged. [Architecture](ARCHITECTURE.md#first-person-worlds-ink-look-and-the-web-build--2026-11-22).

**Online:** the web build (`npm run build:web`, hash routes) is published as a private claude.ai artifact for the team: https://claude.ai/artifact/D1tFJaQ9gxwUxkErVw2a4v. The owner shares it from the page's Share menu. Inside that page, ZIP export downloads are blocked by the host. Use the local app to export. `.github/workflows/pages.yml` deploys the same build to GitHub Pages after a merge to `main`, once Pages → Source is set to GitHub Actions. That deployment has not run yet.

**Checks run (Linux container, Chromium headless with SwiftShader):**

- `npm run typecheck` passed. `npm test` passed **168** unit tests, including the new `tests/route.test.ts` (route names round-trip and use plain `[A-Za-z0-9-]` hash names).
- The web build was served from a sub-folder (`python3 -m http.server`, `/dist-web/index.html`). Title → New Game → From a prompt → Build world → Enter world → walk → Pause → Save → Main menu → Continue restored the position. `#options` opened Settings and `#examples` rendered a 3D example. There were no page errors and no failed requests.
- Full browser suite, `--workers=2`: **51 of 52** passed. `soundtrack.spec.ts:63` failed once while waiting for the clip to end and then passed 2 of 2 when run alone. The new `e2e/first-person.spec.ts` (2) and the entry and song specs (6) passed together, 8 of 8.
- Fixed during this milestone:
  - **Adaptive resolution:** the `<Canvas dpr>` prop reset the adaptive scale on every stage re-render. AT-25 took 2.8 min against 40 s before; after the fix, 39 s.
  - **Paper grain:** per-pixel grain made frames incompressible, so screenshots took twice as long. Removed.
  - **Favicon:** B's favicon data URI had unescaped quotes, and the dev server reported malformed HTML. Rewritten.

**Not verified here:** real-GPU frame rates and the first-person feel on phones and laptops. Fullscreen and pointer behaviour inside the claude.ai artifact frame on mobile are also untested, as is the GitHub Pages deployment itself.

## 2026-11-21 — Music apps, GENESIS atmospheres, language, music on entry and full-screen worlds

Branch `claude/keen-bell-fkqitv`. This covers commit `b72d30c` and the follow-up commit. `b72d30c` added the song of the day with music-app links, larger outdoor worlds with run and compass, and the GENESIS-style interface with four atmospheres and the pixel filter. The follow-up adds an EN/RU interface language, the typed-words-to-world transition with full screen, the soundtrack starting on Enter world, a sky dome and walker detail, Russian time and weather cues, and an examples sidebar. [Architecture](ARCHITECTURE.md#language-entering-a-world-music-on-entry-and-sky-detail--2026-11-21) · [Design](docs/design_system.md).

**Checks run (Linux container, Chromium 1.65 headless with SwiftShader, so rendering is software-only):**

- `npm run typecheck` passed. `npm test` passed **159** unit tests, including new `tests/i18n.test.ts` (8), `tests/song.test.ts` and `tests/extend-world.test.ts`. The i18n test requires a Russian entry for every `t('…')` phrase in `src/`.
- `npm run build` passed with the existing bundle-size warning.
- `npx playwright test --workers=2` with a scratch config pointing at the container's Chromium: **51 of 52** passed in each of the last two full runs.
  - The single failures were walking tests that hit their 60 s limit: the covered market, then the private memory story. Each passed alone (market 2/2; memory story 4/4 with autoplay on, 3/4 with autoplay off). Their limits are now 120 s, because the larger outdoor worlds lengthen the walk.
  - Earlier failures were caused by this work and fixed:
    - the soundtrack test's canvas fell below the fold on Examples (now a sidebar);
    - the preview test measured the drawing-buffer height that the pixel filter halves (now the on-screen height);
    - the "no external requests" check counted local `blob:` audio;
    - hiding the main navigation in full screen broke the unsaved-exit confirmation (now compacted, not hidden).
- New browser specs:
  - `e2e/song-and-atmosphere.spec.ts` (3): song link, cues and soundtrack, save and load, no external requests, settings persistence and the View panel syncing with Settings.
  - `e2e/immersive.spec.ts` (3): Russian switch and persistence, a Russian night prompt, the transition, full screen, autoplay, pause stopping and resuming music, leaving full screen, and autoplay/full screen turned off.

**Not verified here:** real-device full screen and autoplay on iOS Safari and Android Chrome, though the code falls back to starting music on the first step. Microsoft Edge runs, frame-time measurements and a Russian-language review by a native speaker are also still to do. The Russian prompt reader covers time and weather only; objects are still matched from the existing catalog words.

## 2026-11-21 — Held-out gameplay and atmosphere review

Created four new fictional prompt worlds and one journal day in fresh Edge profiles. All four worlds passed the sampled AT-17–20 and AT-23 walking, discovery, and ending flows. The cavern completed in reverse discovery order. AT-24 gesture-started playback advanced for every tested track. AT-25 Continue restored the completed prompt visits and their positions. For AT-06/07, the journal reopened and refreshed from the saved URL, and a fresh-profile ZIP import started at spawn. The export preserved both input media files byte for byte. The unsupported planetarium preserved the prompt and offered revision. Private runs recorded zero external HTTP requests and zero page errors. The [playtest report](docs/playtests/2026-11-21/PLAYTEST.md) includes 51 browser screenshots, a contact sheet, and the importable fictional diary.

- `npm.cmd test` passed 113 tests. `npm.cmd run build` passed with the existing annotation and bundle-size warnings. In Edge 158.0.4370.33, `PLAYWRIGHT_CHANNEL=msedge` and `PLAYWRIGHT_PORT=4335` with `npm.cmd run test:browser -- --workers=1 --reporter=dot --output=test-results/playtest-regression-edge` passed 46 browser tests.
- The local playtest runner used `npm.cmd run test:browser -- --config=.vite/playtest.config.ts --reporter=list`, with filtered reruns for the diary and alternate camera captures. The first diary run exposed a misleading “Leave without saving?” prompt after `Save to archive`. The rerun verified that dismissing the warning via `Leave without saving` still opens the saved day and that the saved URL survives refresh. The navigation wording issue remains open.
- **Open art and narrative findings.** The local sample supports the cohesive low-poly style but falls short on the brief’s emotional specificity. The farewell and joyful harvest both selected Lantern Market. Dialogue repeats across stories, the diary’s reveal and end omit the folded ticket, several settings rely on isolated props, and decorative models exceed requested counts. Prioritize source-specific discoveries and endings, then mood and soundtrack matching and stronger setting silhouettes. One reviewer assessed fictional inputs. AT-21 physical device checks and the live and independent-review portions of AT-27/29 remain open.

## 2026-11-21 — Composed prompt worlds and local case candidate

Implemented the [new implementation plan](docs/memory_worlds_implementation_plan.md) over baseline `798ea7f`. Both prompt buttons use a strict intent and template contract. The browser-private path composes locally. The optional fictional loopback gateway uses two structured Gemini stages with a shared 20-second limit and one template correction. Preview reports coverage and lets the player explicitly retry or switch to private mode. Version 3 saves include the accepted template, seed, placements, approaches, and rendered coverage. Earlier prompt checkpoints and v1 diary ZIPs remain readable. [Architecture](ARCHITECTURE.md#composed-scene-layouts-and-catalog).

- **AT-27:** Tested the provider adapter with structured fixture responses, validation errors and bounded repair. The browser mock covers both prompt actions, quota failure, explicit private fallback, and rejection of stale responses. The live Gemini acceptance run and hosted provider decision remain open.
- **AT-28:** The gallery renders all 108 new original authored models through the same instancing renderer used by play. Family counts are landscape 15, civic 12, recreation 14, passage 10, urban 15, interior 16, coastal 9, and fantasy/science fiction 17. The 19 existing builder IDs remain available. Checks cover distinct geometry, finite dimensions, credit, metadata, and a five-page gallery. The production build currently bundles the geometry definitions together and instantiates models as needed. Per-family loading and individual support-socket review remain open. [Resource ledger](docs/resource_ledger.md).
- **AT-29:** The two bare prompts produce contextual entrances, routes, two discoveries, and endings with visible defining models. The variant with two slides and no splash pad keeps both slides and excludes the pad. The unit matrix covers 32 playable prompts and additional validation cases. Checked the park on desktop and the water park at 390 CSS px, including reversed reveal order, ending, and saved replay. Independent recognition review, live held-out prompts, and the full capture matrix remain open.
- **AT-06/07/11/20/25 and SUB-01–07:** The final static build generated and exported five fictional journal days. All five ZIPs imported in a fresh Edge profile, with byte-exact image and audio files and zero external requests from the diary. The archived demo day reopened completed, and a fresh import started at spawn. The extracted portable build opened a nested example route and composed a private water park. The 29.6-second H.264/AAC demo, contact sheet, one-page description, technique sheet, original source and rights ledger are in the [local case package](docs/submission.md).

`npm.cmd test` passed 113 tests. `npm.cmd run build` passed TypeScript and production bundling. Vite reports the existing annotation notices and a 1.54 MB main JavaScript bundle (464 KB gzip). The case command `node scripts/package-case.mjs` passed on final production output. FFprobe verified the demo duration and video/audio tracks. No new paid service was used.

Edge 158.0.4370.33 passed all 46 browser tests with `PLAYWRIGHT_CHANNEL=msedge`, `PLAYWRIGHT_PORT=4324`, and `npm.cmd run test:browser -- --workers=1 --reporter=dot --output=submission-output/verification/final`. The run includes simulated quota and stale-save paths, v1 import, a saved and restored story reply, WebGL context loss, canceled touch, and both reveal orders. The final candidate captures include four viewpoints for each park, three additional generated settings, and all five model gallery pages. Earlier runs caught archive expectations for the new thumbnail member and mobile overflow in the five-card example layout. Both passed their final rerun.

**Remaining release gates.** Complete live fictional planning after the provider and billing approval, independent scene reviews and physical phone/laptop playtests and frame-time measurements. The case video uses fictional cleared material. A contributor’s favorite day and consent, publication and organizer confirmation are still pending.

## 2026-11-21 — Prompt-world quality and catalog plan revision

The user reported that park and water-park prompts produce empty-looking scenes. Source inspection confirmed 19 recipe IDs, a park term that selects grass, a 10-character prompt minimum, and an optional Gemini path that reparses model-written scene text. The revised [implementation plan](docs/memory_worlds_implementation_plan.md) adds a shared structured LLM planner, scoped case and private paths, a 100-model release floor, and recognizable scene tests using both short prompts and unseen mixed settings. The product estimate is 110–146 focused person-hours. The first implementation gate is W1 with both park routes.

**Documentation checks:** `git diff --check` and the plan audit passed. The audit covered 26 local links and anchors, 19 Markdown tables, USR-11/12 and AT-27–29, the 120-model inventory target, gate arithmetic, and both mandatory short prompts. Runtime checks, asset imports, and provider deployment remain open for the implementation phase.

## 2026-11-21 — Game-specific implementation plan

Added the [Memory Worlds implementation plan](docs/memory_worlds_implementation_plan.md) against the integrated prototype at `798ea7f`. It specifies both player journeys, seeded world composition, cove/market/kitchen art profiles, local story and audio, persistence compatibility, device checks, and all seven case deliverables. The plan estimates 46 focused person-hours across A/B/C and separates the case release from later catalog and story expansion.

**Documentation checks:** `git diff --check` and a read-only Markdown and traceability audit passed. The audit checked links and anchors, table shapes, requirement and acceptance IDs, gate arithmetic, actual package scripts, the case deadline, and the supplied reference hash. Application code was unchanged. Runtime tests and device checks were outside this documentation milestone. The next implementation gate is G0, followed by the cove slice.

## 2026-11-21 — Short prompt memory experience

**Build memory** composes a short visit with two discoveries, one low-poly character, two conversation replies, a camera transition, and a closing fade. Save and Continue restore an open conversation or its chosen reply. Prompt world and day-memory entry points retain their original flows and media. The scene and music draw from bundled assets. [Architecture](ARCHITECTURE.md#short-prompt-memory-experience) · [Demo setup](README.md#play-a-short-memory)

`npm.cmd run typecheck`, `npm.cmd test` (75 tests), `npm.cmd run build`, and `git diff --check` passed. The build retained the existing dependency annotation and size warnings. The local gateway smoke check accepted a valid mocked Gemini response and rejected malformed output, missing fictional consent, and a foreign origin. A live request using an invented lighthouse scene returned a validated story. The static bundle contains neither the provider URL nor the key variable name.

Edge passed all 40 browser tests on the final run with `PLAYWRIGHT_CHANNEL=msedge` and `npm.cmd run test:browser -- --config=.vite/memory-story-check.config.ts --workers=2 --retries=1 --reporter=list`. The temporary config uses an alternate loopback port. The new tests verify private 3D play with no Gemini request, both discoveries, a saved conversation, a persisted reply, replay, structured Gemini output, and recovery from malformed output with WebGL unavailable. The full run also covers the existing AT-17–20 and AT-23–25 browser flows, including v1 archive reopen and the original day media.

**Open:** Hosted Gemini access and sending real client journals require the project’s separate privacy and billing decision. The automated playthrough confirms the story can be completed. Human playthrough duration around five minutes remains unmeasured.

## 2026-11-21 — A/B/C gameplay integration from `4b045e0`

Prompt worlds now render C's reusable scenery and use A's movement, collision, discoveries, and ending. The title and pause menus save and restore prompt and day checkpoints. Prompt tracks are selected locally and can be previewed, changed, or muted. New day layouts use the journal and preserve its original photo and song. The [architecture](ARCHITECTURE.md#integrated-gameplay-scenery-and-local-saves) documents the versions, IndexedDB records, and ZIP extension.

- **AT-17–20:** Edge exercised keyboard walking, touch emulation and cancellation, collisions, reset, discovery gating, completion, replay, WebGL fallback, original media, and offline day generation. All three earlier fixtures and new day creation, save, export, and import passed. Reviewed generated cove, market, and mixed-scene captures for geometry and legible prompts.
- **AT-21:** Browser checks covered keyboard focus, touch emulation, audio, reduced motion, and fallback. Physical touch and audible playback on hardware and the sustained 30 FPS measurement remain open.
- **AT-22:** The existing ownership and delivery plan remains the scope reference. The architecture and this record identify the implemented storage and rendering boundaries and the remaining device gate.
- **AT-23:** The foggy cove, covered night market, and combined kitchen and garden each completed both discoveries and the ending in Edge. Unit checks verified deterministic geometry, object counts, color and relationship edits, collisions and pier support, and route rejection. Failed prompts remained available to revise.
- **AT-24:** Edge verified contrasting automatic music choices, original credits, gesture-started playback, visible motion, pause and mute, saved overrides, missing audio, and replacement. The original authorized case audio played after saving or importing a day.
- **AT-25:** Continue and Load Game restored position and discovery state for prompt and day saves. Checks covered Save & Quit, switching between both kinds of saves, old prompt saves, v1 database upgrade and ZIP import, exporting a composed layout, invalid and stale checkpoints, and rollback under simulated quota errors. ZIP import in a fresh profile restored the layout and original media from spawn.

`npm.cmd run typecheck` passed. `npm.cmd test` passed 75 tests. `npm.cmd run build` passed with the existing dependency annotation and bundle-size warnings. With `PLAYWRIGHT_CHANNEL=msedge`, `npm.cmd run test:browser -- --config=.vite/c-preview-polish.config.ts --workers=2 --reporter=list` passed all 38 tests on the alternate local port. During integration the browser route helper needed extra clearance at corners, and the animation check needed a settled baseline capture. The affected checks passed on the full rerun.

## 2026-11-21 — Developer B: prompt worlds, menus and saves (MW-017/019, AT-23/25)

**Delivered on `B_development` (built on A's walk work, then merged with `main` after A's PR #1 and C's PR #2):** Gate 1 and the B part of Gate 2 for the expanded plan.

- **Contracts.** `src/world/world-schema.ts` is the versioned prompt-world format (schema 2, parser/layout/catalog versions, seed, interpretation with source spans, resolved layout, discoveries with prompt excerpts, landmark, nullable soundtrack slot for C). Validation rejects broken references and any layout where spawn, either discovery or the ready ending cannot be reached with A's collision rules (`src/world/route.ts`). `toWalkLayout` adapts a world to A's `WalkLayout`. `src/world/checkpoint.ts` is the checkpoint format (world ID, layout key, position, revealed IDs, ending) with restore checks for stale layout, foreign world, out-of-bounds or blocked position, unknown discoveries and an inconsistent ending.
- **Prompt composition.** `parse-prompt.ts` resolves places, objects, counts, colors, time, weather, indoor/outdoor zones and `beside/beyond/above/under/in front of` to the recipe catalog (`recipes.ts`, the B↔C seam), and reports approximated and unsupported words. `compose-world.ts` places the landmark first, applies relations, scatters the rest with a prompt-derived seed, picks two discoveries, builds colliders (water with a walkable pier, room walls with a door) and retries with less clutter before failing with the prompt kept.
- **Rendering.** `WorldStage.tsx` renders any world with starter low-poly builders (`builders.tsx`, for C to replace) and uses A's `stepPlayer`/`targetAt` for movement and interaction. It mirrors A's keyboard, touch, blur and WebGL-fallback handling and stops input while paused.
- **Menus and saves.** Title menu at `/` (New Game, Continue, Load Game, Examples, Settings); New Game offers **From a prompt** and **Create a day memory**; the fixture library moved to `/examples`. Pause menu (Esc or Pause): Resume, Save Game, Save & Quit, Return to Main Menu with a leave-without-saving confirmation. IndexedDB moves to version 2 with `worlds` and `checkpoints` stores; v1 `days`/`media` are untouched. The first save writes world and checkpoint in one transaction; later saves replace the checkpoint. Errors keep the session open. Settings stores volume and a reduced-motion override in `localStorage`.

**Checks (macOS, Google Chrome via `PLAYWRIGHT_CHANNEL=chrome`):** `npm run typecheck` passed. `npm test` passed 67 tests, including 10 new tests in `tests/prompt-world.test.ts`: lighthouse/cove, night market and mixed kitchen/garden worlds walked end to end with A's controller, determinism, edits that change output, unsupported/approximated reporting, route rejection and checkpoint checks. `npm run build` passed. The full Playwright suite ran 29 tests: 28 passed, including 6 new tests in `e2e/prompt-world.spec.ts` (title menu → prompt game → reveal → save → reload → Continue at the saved position → finish → Save & Quit → Load Game; simulated quota failure; unsaved-leave confirmation; invalid checkpoint restart; v1 database upgrade; unsupported details and retained prompt). `e2e/soundtrack.spec.ts:62` fails at its `atRest` poll on line 101. It fails the same way on A's branch without these changes.

**Open:** C's handoff on `main` now provides `world-recipes.ts`, `WorldScenery`, the soundtrack catalog and `WorldSoundtrack`. B's prompt worlds still use B's own starter `recipes.ts`/`builders.tsx` and an empty soundtrack slot, so they show a labeled silent state. Next B step: map the parser onto C's recipe IDs and footprints, render with `WorldScenery`, and save the catalog track chosen from the prompt's mood/setting/energy tags. Day memories appear in Load Game and open at spawn; day checkpoints need A's restore hook in `WalkStage` (MW-019, A). `WorldStage` duplicates A's input handling rather than sharing a hook. Prompt-world ZIP export is not implemented (checkpoints stay local by design). No touch-device, FPS or AT-26 audit was run. B's Gate 3 work (deploy, release evidence, MW-009/010) has not started.

## 2026-11-21 — PR #2 conflict resolution

Merged `main` at `b8085b3` into the Developer C branch. The day-memory viewer uses the walk stage, with the shared audio player and reduced-motion preference. The curated world preview retains its orbit and landmark views. Fixed the browser soundtrack comparison to measure the canvas interior so viewport borders do not affect the motion assertion.

- `npm.cmd run typecheck`, `npm.cmd test` (64 tests), and `npm.cmd run build` passed. With `$env:PLAYWRIGHT_CHANNEL = 'msedge'`, `npm.cmd run test:browser -- --config=.vite/c-preview-polish.config.ts --workers=2 --reporter=list` passed all 27 tests, including walking, soundtrack, curated worlds, and archive regression checks.
- AT-23 and AT-24 remain open for prompt-generated gameplay and saved soundtrack restoration. Physical-device checks remain pending.

## 2026-11-21 — Developer C expanded world previews

The curated cove spans 24 units across a longer shore approach with dunes, rocks, and coastal grass. The night market spans 30 units across side courts, two more bridge spans, extra stalls, and shopfronts. The wider preview stage keeps the key landmarks in frame. Route checks now use the exact preview placements.

- `npm.cmd test` passed 55 tests, and `npm.cmd run build` passed typechecking and bundling with the existing warnings. With `$env:PLAYWRIGHT_CHANNEL = 'msedge'`, `npm.cmd run test:browser -- --config=.vite/c-preview-polish.config.ts --workers=2 --reporter=list` passed all 26 tests. Reviewed desktop and 390-pixel-wide screenshots of each world.
- AT-23 and AT-24 remain open for walking, prompt composition, and soundtrack restoration in the integrated game. Physical-device testing remains pending.

## 2026-11-21 — Developer C preview polish

The curated cove and market use responsive framing, keyboard-accessible landmark views in route order, and an Overview reset. The cove keeps the shore landmarks visible through the fog, and warm lanterns light the stalls beneath the market bridge. Route text and audio remain usable after renderer loss. Each world's soundtrack override lasts for the preview visit, mute carries between worlds, and changing worlds stops playback until the next user gesture.

- `npm.cmd run typecheck`, `npm.cmd test` (54 tests), and `npm.cmd run build` passed. The build retained the dependency annotation and chunk-size warnings.
- With `$env:PLAYWRIGHT_CHANNEL = 'msedge'`, `npm.cmd run test:browser -- --config=.vite/c-preview-polish.config.ts --workers=2 --reporter=list` passed all 26 tests. The ignored config used port 46272 after the default port was unavailable. Coverage included landmark views, camera reset, renderer loss, audio and light-pulse rest states, soundtrack switches, reduced motion, upload and missing media, and the original day-memory and archive flows. Reviewed desktop and 390-pixel touch-emulated captures of both worlds.
- AT-23 and AT-24 remain open for integration with generated layouts, walking, and saved soundtrack restoration. Physical-device audibility and sustained performance still need verification.

## 2026-11-21 — Future soundtrack behavior clarified

The player enters the prompt in the game. The future soundtrack system uses it to compose music at runtime or retrieve suitable cleared music online. The current local catalog covers the preview. [Updated delivery plan](docs/game_development_plan.md#prompt-generated-worlds-soundtrack-selection-and-game-menus).

## 2026-11-21 — World preview available from navigation

The main app now links to `/world-preview` in development and production builds. The page shows the foggy cove and covered night market, orbit controls, and the local soundtrack controls. It reports when the browser cannot render 3D.

`npm.cmd run typecheck`, `npm.cmd test` (54 tests), and `npm.cmd run build` passed. Headless Edge passed all 24 browser tests with `npm.cmd run test:browser -- --config=.vite/c-playwright.config.ts --workers=2`, including navigation from the library to the preview. A separate Edge smoke check of the production build at `http://127.0.0.1:4317/world-preview` verified both canvases and gesture-started audio.

## 2026-11-21 — Developer C world content and soundtrack

MW-016 supplies cove and covered-market recipes, ground support, collision footprints, discovery approaches, and scenery rendering from resolved placements. Geometry checks cover routes through cove, market, and a connected market-to-shore example. MW-018 supplies three original tracks, local cue matching with stable ties, measured audio, saved-record inputs, and preview, override, mute, and authorized upload controls. The browser preview exercises the cove render, audio-driven lighting, reduced motion, switching tracks during playback, silence, missing media, and corrupt and authorized uploads. The v1 day, original song, and archive regression checks passed. [Integration handoff](ARCHITECTURE.md#developer-c-integration-handoff).

- `npm.cmd run typecheck` passed. `npm.cmd test` passed 54 tests. `npm.cmd run build` passed with dependency annotation and chunk-size warnings.
- `$env:PLAYWRIGHT_CHANNEL = 'msedge'` and `npm.cmd run test:browser -- --config=.vite/c-playwright.config.ts --workers=2` passed all 24 tests. The default port 4173 was unavailable, so the ignored config ran the same browser suite on port 4237. Visually inspected the foggy-cove capture and verified the corrected shore surface.
- Integrated AT-23 and AT-24 remain open. A and B still need to wire walking, prompt composition and feedback, and saved soundtrack restoration into the generated game. Physical-device playback and performance checks remain pending.

## 2026-11-21 — Developer C cove geometry checkpoint

Cove recipes supply render geometry, rotated solid footprints, and approach offsets. A simulated ground-level route reaches both discovery anchors and the pier ending with collision clearance. The world recipes reproduce geometry and approaches from serialized placements.

`npm.cmd run typecheck` and `npm.cmd test` passed (50 tests). This verifies C's cove geometry and route. The Gate 1 prompt-generated player visit remains open pending A's movement and B's composition.
## 2026-11-21 — Developer A: walkable world (MW-013/014, AT-17/18)

**Delivered on `claude/keen-bell-fkqitv`:** the orbit viewer is replaced by a walkable low-poly world for every v1 memory. `src/gameplay/layout.ts` is the A↔C contract (spawn, bounds, solid footprints, two artifact anchors, closing gate, reach). `src/gameplay/controller.ts` holds pure movement with bounds and sliding collision plus proximity targets. `src/scene/WalkStage.tsx` adds the player, follow camera, WASD/arrow keys, `E`, a touch pad and Interact button, Reset position, and input release on blur, visibility change and pointer cancel. Reveals require reach. The ending gate stays locked until both unique reveals, completion fires once, and Replay resets position and progress. Without WebGL, or after context loss, the labeled static preview keeps reveal progress and uses the card buttons plus Finish.

**Checks (headless Chromium with software WebGL, Linux):** `npm run typecheck`, `npm test` (57 tests, 9 new in `tests/gameplay.test.ts`, including approach lanes across spacings), `npm run build`, and the full Playwright suite (23 passed, including new `e2e/walk.spec.ts` for AT-17/18 and the existing fixture, archive, intake, soundtrack and static-fallback flows converted to walk). The preinstalled Chromium was used through a temporary config outside the repo, because the pinned Playwright expects a different browser build.

**Open:** no physical touch-device or ≥30 FPS measurement (AT-21); the layout is one deterministic default that C should tune per setting; `MemoryStage.tsx` still exports shared helpers and its orbit stage is now unused; reduced-motion camera snapping was implemented but is not covered by a dedicated test. The 3D scenes still reuse the existing backdrops scaled up.

## 2026-11-21 — Prompt worlds, soundtrack selection and game menus

The user expanded scope to prompt-built worlds, automatic music choice, and a menu system with saving. The [expanded plan](docs/game_development_plan.md#prompt-generated-worlds-soundtrack-selection-and-game-menus) keeps the brief's journal/photo/song and titled day archive flow alongside a prompt-only game. The existing generator still selects one v1 setting and fixed artifact types. The current archive saves intact day bundles. Menus, checkpoint saves and composable worlds are planned.

MW-017–019 and AT-23–25 are open. The estimate is 50 focused person-hours across A/B/C, above the earlier 30-hour schedule. The fixed case deadline remains November 22 at 23:59 Astana. The next gate is one complete visit in a prompt-generated world outside the previous three settings, with a shared world and checkpoint contract.

**AT-26 documentation check passed:** `git diff --check` and a read-only Python audit verified 56 local links and anchors, mappings from USR-08–10 to MW-017–019 and AT-23–25, and the three tracks totaling 50 hours. The brief and application files are untouched. Gameplay and device tests were not run for this documentation revision.

## 2026-11-21 — Exploration plan and third developer

The user approved the low-poly visual direction and expanded the game scope to walking, nearby object interaction, and atmospheric exploration. Updated the [delivery plan](docs/game_development_plan.md#active-delivery-plan--2026-11-21), [architecture](ARCHITECTURE.md#planned-exploration-architecture--2026-11-21), and [requirements](docs/00_case_requirements.md#active-exploration-requirements--2026-11-21) for A (gameplay), B (integration and release), and C (levels and atmosphere). The estimate assumes 10 focused hours per person before the existing November 22 deadline.

**Baseline:** inspected merged `main` at `e36d9df`. Its shared viewer still uses orbit/zoom and direct artifact selection. The earlier fixture, creation and archive checks below apply to that baseline. MW-013–016 and AT-17–21 are pending. No application code or assets changed during this revision. The final five-day set, public release and physical-device checks also remain open.

**AT-22 documentation check passed:** `git diff --check` reported no whitespace errors. A read-only Python check verified 38 changed local links and anchors, the new requirements and task/test IDs, three 10-hour tracks, the order and deadline of the five gates, and retention of the earlier plan and audit bodies. Application and device tests were outside this documentation milestone.

**Next:** A and C agree the layout contract while B selects the existing v1 bundles for compatibility checks. Integrate one complete park visit before expanding the other two settings.

## 2026-11-21 — A/B integration on main

The fixture library, creation preview, and archive reopens share the 3D viewer. Intake uses the same offline audio decoder and mono RMS calculation as Developer A's analyzer. Archive and ZIP tests exercise the integrated renderer and verify that saved and imported bundles preserve the original media and scene data.

A clean `npm ci --offline` passed in an isolated directory using the merged lockfile. The initial install in the workspace hit a Windows lock on esbuild. The merged `npm run typecheck`, `npm test` (48 tests), and `npm run build` passed. The first integration checks exposed a mismatched stereo test expectation and browser failures during edits. After resolving the analyzer contract, the full Edge suite passed all 22 cases with `$env:PLAYWRIGHT_CHANNEL = 'msedge'` and `npm run test:browser -- --config=test-results/merge.config.ts --workers=2` using a temporary config on port 4195. `git diff --cached --check` passed before committing.

The owner approved committing the Egypt demo story. A separate Edge smoke check exercised its playback, two reveals, ending, and mobile touch emulation. A search of `dist/` confirmed that the production build excludes the demo. The reference attachment was used only to guide the original illustration. Vite still reports Zod annotation and main-chunk size warnings. The final MW-008 example set and physical-device verification remain pending.

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
## 2026-11-21 — Developer A · MW-006 soundtrack analysis and motion

The browser-local audio analyzer is ready for MW-004. The fixture viewer now plays its saved soundtrack on demand and uses the saved energy envelope to drive the artifacts' motion. **Why this scene?** shows the relationship between the soundtrack and the composition.

With journal, photo, context and seed held fixed, Edge measured the following from two original tones at 220 Hz and a silent control.

| Clip | Mean energy | Motion speed (cycles/s) | Mount spacing (scene units) |
|---|---:|---:|---:|
| Lower energy | 0.162 | 0.371 | 2.592 |
| Higher energy | 0.862 | 0.897 | 2.381 |
| Silence | 0.000 | 0.250 | 2.640 |

- `npm run typecheck`, `npm test` (37 checks), `npm run build`, and `git diff --check` passed. Vitest verifies mono RMS, the partial window, silence, duration and PCM errors, exact pulse interpolation at known timestamps, and speed-dependent lift. Vite still reports two Zod annotation warnings and a main-chunk size warning (374 kB gzip).
- With `$env:PLAYWRIGHT_CHANNEL = 'msedge'`, `npm run test:browser -- --reporter=list,json` passed all 13 cases in headless Edge 158 on Windows. The browser check validated WAV and MP3 results against the v1 schema, rejected corrupt audio, compared soundtrack-only changes to spacing, and verified playback through buffering, pause, end, reduced motion, and static fallback. The reveal loop, camera, media cleanup and three-environment checks passed again. Compared the resting and playing stage screenshots. The test MP3 is the original three-second intake tone encoded with FFmpeg and libmp3lame. It is test-only and requires no FFmpeg installation to run.
- The repeat run initially could not bind port 4173. On port 4184, `npm run test:browser -- --config=test-results/playwright-repeat.config.ts e2e/soundtrack.spec.ts --repeat-each=3` passed all nine runs with a temporary Git-ignored Playwright config using the same suite.

AT-03's controlled soundtrack comparison passed. The browser portion of AT-04 passed, including gesture-started playback. Physical-device audibility and mobile performance remain unverified. MW-004 still needs to call the analyzer in the creation flow. Next for A is MW-008.

## 2026-11-21 — Developer A · MW-005 visual rules and photo analysis

Park, room and city now share one stage and interaction layout. Saved context and seed drive backdrop geometry. Photo accents and brightness, warmth and spacing drive the presentation. **Why this scene?** explains those values and the mood treatment, including in the static preview.

- `npm run typecheck`, `npm test` (33 checks), `npm run build`, and `git diff --check` passed. The build still reports Zod annotation and chunk-size warnings (373 kB gzip).
- `$env:PLAYWRIGHT_CHANNEL = 'msedge'; npm run test:browser` passed all 10 scenarios. Controlled substitutions changed only context or photo features and produced visibly different renders. The suite checks photo brightness, palette ties, transparent/corrupt input, explanations, the reveal loop, camera and touch emulation, audio/media cleanup and WebGL fallback. Fixed a white-image rounding discrepancy and reran the full suite.
- Compared the three Edge screenshots side by side. Trees and path, window, and skyline distinguish the settings. The artifact positions remain readable with the same initial framing.
- [Photo analysis](src/media/photo-analysis.ts) is ready for Developer B's intake. Call `analyzePhoto(blob)` and combine its returned features with the assigned asset ID and optional caption. Saved fixtures still use their authored metadata. The viewer handles decode errors independently on reopening.

AT-03 context and photo checks and the local AT-09 explanation checks passed. AT-03's song comparison and playback motion remain MW-006. The three-fixture visual portion of AT-08 passed. The five-day feed and favorite-day author review remain MW-008. Physical-device and deployment checks remain pending. Next for A is MW-006.

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

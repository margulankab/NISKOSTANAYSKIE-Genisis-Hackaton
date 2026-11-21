# Memory Worlds — active architecture (amended 2026-11-20)

## Planned procedural worlds and game saves — 2026-11-21

The [expanded plan](docs/game_development_plan.md#prompt-generated-worlds-soundtrack-selection-and-game-menus) replaces environment-specific layout selection for new worlds. B owns prompt parsing and manifest validation, C owns low-poly geometry and soundtrack catalogs, and A owns gameplay and checkpoint fields. The current renderer, seed-based variation, media analysis, and archive provide the baseline.

- Parse the original prompt locally into a bounded scene description with surface and structure recipes, world zones, object IDs and counts, place relationships, lighting and mood cues, and source spans for interpretation feedback. Resolve known terms and combinations to approved builders. Record approximations and unresolved terms. Derive coordinates from trusted layout rules and a seed. Keep input text out of code paths, shader sources, and asset URLs.
- Compose a connected layout. Reserve spawn, interaction approaches and the closing destination before placing decorative objects. Validate world bounds, collider footprints, and paths to both discoveries and the ending. Make a bounded placement retry with reduced clutter if necessary. Show a correction message with the prompt intact if the route remains invalid. A consumes the resolved layout without parsing text.
- Introduce a versioned, validated world format that records the seed, builder and catalog versions, resolved layout and stable object IDs, resolved soundtrack and rights metadata, and provenance for source-backed discoveries. A prompt-only world can use its own excerpt and generated props as discoveries. Photos and user-supplied audio remain part of the case bundle. The renderer resolves geometry through known builders. Reopen from saved world data without rerunning prompt parsing or track selection. Retain the v1 reader and importer through a legacy layout adapter.
- Select catalog music locally by mood, setting and energy tags. Store the selected or overridden track's stable ID and version with measured features. Include authorized media in the portable world/day bundle under its recorded rights. Keep the original associated audio in the case workflow. Use the existing playback gesture and media lifecycle.
- Keep the versioned checkpoint keyed by world ID and layout version in IndexedDB. Save the first bundle and checkpoint in one transaction. Subsequent saves update the checkpoint using the existing repository boundary. Restore validated position, discovered object IDs and ending state. Validate positions against bounds and collision and reject stale layout associations. If a usable world has an invalid checkpoint, offer a clearly labeled restart from spawn. Replay starts a new visit. Menus pause movement and audio, manage focus, and keep the open session intact on save errors. Portable ZIPs preserve the world and its authorized assets. Restorable gameplay checkpoints stay in the local browser.

AT-23–25 cover these additions. The earlier planned viewer boundary below still applies to input, camera, and legacy playback. Its fixed-setting assumption and checkpoint deferral are superseded.

### Developer C integration handoff

- [World recipes](src/scene/world-recipes.ts) expose recipe version 1, ID-to-term vocabulary, three size variants, four accents, and quarter-turn headings. Each placement has a stable object ID and an X/Z position. Rendering and footprint transforms use the same source geometry. B saves the resolved placements and anchors in the versioned world manifest, checks supported IDs and versions, and validates ground support and clearance against `getWorldWalkableSurfaces` and `getWorldFootprints`. Walkable surfaces are level at Y=0. Water provides scenery without ground support.
- A uses the same `WorldLayout` for spawn, two discoveries and the exit. Mount [WorldScenery](src/scene/WorldScenery.tsx) inside the generated-world canvas with the resolved layout, atmosphere, active audio, and measured features. Its emissive motion follows playback and respects both the system preference and any reduced-motion setting A or B passes.
- B passes normalized mood, setting, and energy tags to [the soundtrack catalog](src/media/world-soundtrack.ts) for prompt-only generation. Each distinct matching tag in a dimension contributes one point, with equal totals resolved by stable track ID. Persist the resolved record and its playable blob together. On reopen, pass that pair to [WorldSoundtrack](src/scene/WorldSoundtrack.tsx) and wire its change callback to the current draft. Pass the active player and current measured features through to scenery. The control handles silent and missing audio and can pause playback when the game is paused. The case-day viewer uses the same playback component with the user's associated audio.
- Catalog version 1 includes **Coastal Light**, **Lantern Market**, and **Still Rooms**. All three are synthesized from original note patterns in the repository without external recordings. Their records credit Memory Worlds and cover game playback, portable export, and demo use. Player uploads require confirmed permission and the existing local MP3/WAV validation. Selection, synthesis, and playback run locally.
- The curated preview uses the resolved discovery and ending object IDs for direct camera views. Night scenery casts warm light from up to two lamp placements. The preview holds soundtrack overrides per world and shares mute across worlds through the optional controlled mute input on `WorldSoundtrack`. Switching worlds disposes the current player and the next player waits for a playback gesture.

## Planned exploration architecture — 2026-11-21

The [three-person plan](docs/game_development_plan.md#active-delivery-plan--2026-11-21) adds a walkable game to the integrated v1 viewer described below. Keep the current Three.js/R3F stack, original low-poly models and input-derived palette, brightness, warmth, spacing, and soundtrack response. The sections below record the implemented baseline and earlier design decisions.

| Owner | Boundary |
|---|---|
| A · Gameplay | Build the movement controller in the shared [stage](src/scene/MemoryStage.tsx). Use a bounded floor, simple solid footprints, delta-based horizontal movement, and a follow camera. A exposes a shared interaction path for keyboard, touch and accessible controls. |
| B · Integration and data | Keep [viewer props](src/shared/memory-viewer.ts), the v1 schema, original text and media resolver, and the existing IndexedDB and ZIP formats. Verify fixture, creation preview, and archived/imported memory entry points. B owns deploy and acceptance recording. |
| C · Environment and sound | Extend [environment geometry](src/scene/EnvironmentBackdrop.tsx) and [scene styling](src/scene/scene-style.ts). Supply each layout's walkable bounds, solid footprints, safe spawn, two artifact anchors and closing landmark. Tune sightlines, lighting, landmark contrast and [soundtrack response](src/scene/music-motion.ts) using existing measured parameters. |

Derive the layout from checked-in geometry rules and saved environment, seed, versions and styling parameters. Keep colliders and visible geometry aligned and validate that spawn, both artifact interaction areas, and the ending are reachable without crossing solids. Resolve layout locally at open. The v1 saved content and export bytes remain compatible. Reopening an existing v1 bundle adopts the walkable presentation and preserves its original media, props, palette and rule values. A later incompatible layout-rule change needs explicit version handling. Persistent player position and progression are outside this phase. Each opening or replay starts at spawn.

The [viewer](src/scene/MemoryViewer.tsx) owns the set of revealed IDs, closing state, and media lifecycle. The 3D stage derives the current target from player position and uses the shared activation path only for a reachable artifact or an unlocked closing landmark. Keep photo and excerpt rendering in the accessible DOM. Formalize completion as one notification per completed visit, with replay starting a new visit. Ignore movement while interacting with unrelated form controls or reading a reveal. Clear held input on focus loss, touch cancellation and unmount. Invalidate frames while moving or animating, and settle to demand rendering while idle. Preserve the existing DPR cap, gesture-started audio and reduced-motion behavior. If WebGL becomes unavailable, keep reveal state and enable the labeled static preview controls for both artifacts and the ending.

Acceptance and ownership are tracked in AT-17–21 and [MW-013–016](docs/planning/TASKS_BY_FILE.md#exploration-work--2026-11-21). The integrated baseline below is historical evidence for the previous controls. The exploration controller, layouts and game progression are pending.

## Integrated application on main

The fixture library, generation preview, and reopened archive entries use the same [3D viewer](src/scene/MemoryViewer.tsx). IndexedDB and ZIP store and restore the validated bundle, so reopening uses the saved presentation values. Intake and demo analysis share the 16 kHz offline decoder and measure 100 ms RMS after averaging channels to mono. The existing v1 manifest format stays compatible.

The [Egypt development demo](egypt-demo.local/README.md) is a separate Vite page. A standard production build uses the root entry point and excludes that page and its assets.

## MW-007 local archive and ZIP portability — 2026-11-21

`/create` can save the generated bundle or export it directly. `/archive` lists local memories by date and imports a ZIP. `/memory/:id` loads the saved bundle and opens it through `createViewerProps`, with the original media and resolved scene parameters. A memory URL resolves only in a browser profile and origin that holds that ID.

The [IndexedDB repository](src/data/indexed-memory-repository.ts) implements the existing `MemoryRepository` interface. Database `memory-worlds` version 1 uses `days` and `media` stores keyed by the manifest UUID. A successful write commits both records in one transaction. A SHA-256 fingerprint over the validated metadata and media bytes makes a repeated save or import idempotent and rejects different content with the same UUID. A storage error leaves the generated preview and ZIP export available.

The [ZIP codec](src/data/day-zip.ts) writes a standard ZIP rooted at the exact manifest title. `manifest.json` contains the v1 scene, `entry.txt` contains the original UTF-8 journal, and `credits.json` contains `formatVersion: 1`, photo and audio asset IDs, original filenames, MIME types, and per-asset rights. Media uses `photos/<asset-id>.<ext>` and `audio/<asset-id>.<ext>` with lowercase IDs. An optional PNG is stored as `preview.png`. Exports use stored ZIP members. The importer also accepts deflated members, verifies ZIP paths and checksums, and enforces a 41 MiB packed limit, 40 MiB expanded limit, and 20-member limit. It validates the v1 bundle and checks media signatures and decodability before writing either store. fflate 0.8.3 (MIT) supplies encoding and DEFLATE decoding. (MIN-04/05, VIS-08, AT-05/06/07/11)

## MW-004 browser-local generation — 2026-11-21

After intake succeeds, **Generate memory** calls [`generateMemory(draft)`](src/intake/generate-memory.ts) and validates the result with the strict v1 bundle schema. The scene ID is the draft's entry UUID. Two distinct artifact UUIDs derive from it, and the seed derives from the date and original text. Bounded English keywords choose mood, setting, and time. Unmatched categories use mixed, room, or unknown. A draft with no matches records `no-keyword-match` and displays its local fallback status. Titles use words from the entry, or its date when it contains no usable words. The note's UTF-16 offsets point into the original journal text.

[Developer A's photo analyzer](src/media/photo-analysis.ts) measures palette and lightness from each authorized photo. Intake now retains measured music features from its existing offline PCM decode. [Audio analysis](src/media/audio-analysis.ts) takes RMS across channels in 100 ms windows, including the final partial window, and scales it like the fixture tones. The first photo supplies the photo prop and accent palette. `resolvePresentation` combines the source measurements with mood and produces the existing rule records.

`createViewerProps` passes the validated manifest, original text, and local Blob resolver to the preview. Generation needs no service or network call. A failed attempt retains the validated draft and form inputs for retry or replacement. MW-007 consumes the same bundle for durable storage and ZIP portability. The 3D renderer integration remains a separate handoff. (MIN-02/04, USR-02, VIS-04/09, AT-02/05/11)

## MW-003 browser-local intake — 2026-11-21

The fixture library links to `/create`. The form holds the date, original journal text, selected files, and rights confirmation in the current page. The initial date comes from the browser's local calendar. A failed submit keeps the input available for correction.

[`validateDayDraft`](src/intake/validate-day-draft.ts) returns either field errors or a `ValidatedDayDraft` containing `entryId`, `entryText`, `date`, `photos`, `audio`, and `rights`. Photo records have the bundle-compatible Blob, canonical MIME, filename and ID, plus decoded width and height. The audio record has the same base fields with its decoded duration in seconds. The validator assigns IDs for the lifetime of the accepted draft. Each rights record carries the creator's confirmation for its asset.

The validator checks date, original text, counts, file sizes and rights before decoding. Recognized signatures identify canonical MIME for files the browser leaves untyped. Declared types must agree with the signature, with common WAV and MP3 aliases normalized. Photo decoding verifies the 16-megapixel limit. Audio metadata gates an offline decode, which confirms that the audio can be decoded and falls within 1–90 seconds. Temporary image handles and audio object URLs are released after use.

The local draft is the MW-004 generation input (MIN-01, ETH-01/02, VIS-10, AT-01). A's analyzers supply the presentation features and MW-007 handles persistence and ZIP portability.

## MW-000 implemented contract — 2026-11-21

The root Vite/React application serves a development fixture library. B owns the shell, shared contract, fixtures, and future intake and archive. A owns the 3D viewer, scene rules, and media analysis. Where earlier sections describe a server generation path, the November 21 zero-cost amendment governs.

- [Shared contract](src/shared/memory-schema.ts) exports `memorySceneSchema`, `dayBundleSchema`, and the inferred types. The manifest is strict v1 JSON with rules provenance, bounded source measurements, and two distinct artifacts. A bundle includes the original entry, photo/audio Blobs, and per-asset rights records. Validation checks that referenced assets exist and excerpt offsets index the original JavaScript string. Media byte signatures and decoding belong to intake and ZIP import.
- `presentation.parameters` contains `accentPalette`, `photoLightness`, `lightWarmth`, `motionSpeed`, `pulseGain`, and `artifactSpacing`. `appliedRules` holds `photo-palette`, `music-motion`, and `mood-composition` in that order, with source values, results, and an explanation. `resolvePresentation` applies the documented motion and spacing formulas. The viewer applies `1 + pulseGain * e(t)` at playback time and owns the interpolation and reduced-motion behavior.
- [Viewer handoff](src/shared/memory-viewer.ts) exports `MemoryViewerProps` and `createViewerProps(bundle, onComplete)`. `MemoryViewer` receives `manifest`, `entryText`, `resolveAsset(id): Promise<Blob>`, and `onComplete(): void`. The resolver rejects missing assets. The consuming view creates and revokes temporary object URLs. Excerpts render with `entryText.slice(start, end)`.
- [Repository contract](src/data/repository.ts) exposes async `save(bundle): void`, `list(): DaySummary[]`, `load(id): DayBundle | undefined`, `delete(id): void`, `exportDay(id): Blob`, and `importDay(zip): string` as promise results. The fixture adapter implements save/list/load/delete in memory. IndexedDB and ZIP I/O are MW-007.
- [Fixtures](src/fixtures/memories.ts) are three independently selectable fictional days with original procedural PNGs and four-second PCM tones. Each tone's 100 ms energy envelope is measured from the generated PCM. Fixture palettes use authored image colors. Fixture text and titles are authored examples. They provide integration inputs for USR-03 and AT-02.

## Zero-cost architecture amendment — 2026-11-21

**Selected P0:** a static Vite/React/TypeScript application on Cloudflare Pages Free. All input processing stays in the browser: Zod validation, bounded keyword/context classification, deterministic title construction, photo palette/lightness analysis, audio-energy analysis, scene-rule resolution, IndexedDB persistence, and ZIP export/import. The same input + seed + schema/rules versions produces the same manifest. The title generator selects and sanitizes source-grounded words into the established 3–7-word tone; it never calls an external model.

**Removed from P0:** `POST /api/memories/generate`, `GEMINI_API_KEY`, Pages Functions, Gemini calls, provider retries/quotas, and the $5–$10 cash contingency. No server is required for the submitted prototype. Cloudflare Workers Free remains an optional later seam only if a measured need appears; adding it does not authorize a paid plan. The prior paid-Gemini and function design below is retained as historical planning material and is superseded where it conflicts.

**Cost and privacy result:** expected new service spend is **$0**. Gemini's Free tier is not used for real journal entries because its [published pricing](https://ai.google.dev/gemini-api/docs/pricing) states that free-tier content is used to improve Google products; the paid tier avoids that use but would require billing. Since the case explicitly makes AI optional and requires system-generated rather than AI-generated titles, local rules meet the active requirements without that privacy/cost tradeoff. Free-tier AI may be evaluated only with clearly fictional, non-personal test text in a separate experiment and may not be represented as the P0 path. Cloudflare documents the [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/) and [Pages static asset behavior](https://developers.cloudflare.com/pages/functions/pricing/); account availability and the actual deployment remain unverified.
## Developer A audio analysis and playback motion (MW-006)

- [Audio analysis](src/media/audio-analysis.ts) exports browser-only `analyzeAudio(blob): Promise<MemoryScene['music']>` (MIN-03, AT-03/04). Call it from MW-004 with the WAV or MP3 Blob returned by validated intake. An offline decoder produces 16 kHz PCM. The analyzer averages channels to mono and measures `min(1, 4 × RMS)` in each 100 ms window, including the final partial window. The mean is the arithmetic average of the envelope. Duration is bounded to 1–90 seconds. Decode and analysis failures reject so the caller can preserve the draft and report the failing audio. BPM and key remain null. [Web Audio API](https://www.w3.org/TR/webaudio-1.0/)
- The viewer replays the saved measurements using the gesture-started media element's current time. The models use linear envelope interpolation, `scale = 1 + pulseGain × energy`, and a vertical displacement of `0.10 × energy × sin(2π × motionSpeed × time)` scene units. Mount positions and reveal markers stay fixed. The demand-rendered scene stops requesting playback frames and resets the models at rest on pause, buffering, seek, end, error, or reduced motion. The static fallback keeps the player and both reveals available. Existing v1 manifests and viewer props work with this path.

## Developer A visual rules and photo analysis — 2026-11-21

- MW-005 uses one platform, camera and artifact layout. Saved environment and seed select and vary the decorative park, room or city geometry. Saved palette, image brightness, warmth and artifact spacing drive accents, lighting and placement. Mood selects angular mounts, layered photo mounts or softer lighting.
- [Photo analysis](src/media/photo-analysis.ts) exports browser-only `analyzePhoto(blob): Promise<PhotoFeatures>`. Intake assigns the asset ID and optional caption and combines them with the returned palette, mean lightness and decoded dimensions. The analyzer downsamples the image with its aspect ratio intact to at most 64 × 64, weights RGB bins and brightness by alpha, and closes its bitmap. Decode or analysis errors reject so intake can keep the original draft and report the failing photo. Byte-signature checks belong to intake.
- The viewer replays saved features, including the authored fixture values. It does not analyze the asset again on open. **Why this scene?** reads the verified rule sources and results and describes the applied visual treatment. Audible playback remains independent of the current still composition. Runtime audio-driven motion is MW-006.

## Developer A viewer handoff — 2026-11-21

The root Vite app opens three fictional fixture memories from Developer B's committed MW-000 scaffold. The active zero-cost direction is deterministic browser-local processing and static hosting. Retained sections below describe the original planning baseline.

- [Shared schema](src/shared/memory-schema.ts) owns bounded v1 manifests, source references, presentation formulas, and rule provenance. [Viewer props](src/shared/memory-viewer.ts) pass the validated manifest, original entry text, local Blob resolver, and completion callback. The viewer consumes saved parameters through this existing interface.
- [MemoryViewer](src/scene/MemoryViewer.tsx) owns one opening per manifest ID. It uses original geometry and saved colors/lightness/warmth/spacing. Both the in-scene targets and their accessible buttons reveal by artifact ID. The photo uses the corresponding Blob and the excerpt uses the original string's half-open range. Reveal state survives renderer loss. Finishing after both reveals calls the provided completion callback once.
- The renderer uses on-demand WebGL frames, bounded orbit and zoom, a 1.5 DPR cap, and a labeled static fallback. The DOM handles the reveal cards and gesture-started audio independently. The viewer pauses on unmount, revokes Blob URLs on cleanup, and reports individual media failures inline.
- Pinned 3D libraries and their MIT notices appear in [3D dependency licenses](public/3d-licenses.txt). Fixture illustrations and tones are original project test assets with per-asset provenance in the bundles. Full visual variants, playback interpolation and measured music-driven motion are MW-005/006.

**Verified:** no application is implemented in this checkout. **Assumed:** every interface, limit, path and design below is the approved target, not an existing API. This amendment supersedes the historical Next.js/FastAPI/Pydantic/Supabase design. Trace: MIN-01–05/07, VIS-01–10, ETH-01/02/05/06, USR-01–04; [requirements](docs/00_case_requirements.md).

## Research findings

| Option | Verified capability / source | Assumed sprint tradeoff |
|---|---|---|
| **R3F + Three.js + Drei — selected** | React renderer for Three.js; React 19 pairs with R3F 9 [S1] | One TypeScript app for form, archive and scene; reuse controls and HTML overlays |
| Babylon.js | Scene graph, audio, picking, GUI and physics [S2] | Strong game tooling, but no established Babylon code here; unnecessary engine switch |
| Godot | Web export needs WebAssembly/WebGL2; single-thread export avoids isolation setup [S3] | Excellent editor, but introduces an export pipeline alongside browser intake/storage |

**Assumed stack:** Vite + React 19 + compatible stable R3F 9/Drei/Three + TypeScript strict mode; Zod; native IndexedDB; fflate for ZIP; Cloudflare Pages/Functions; paid Gemini 3.5 Flash-Lite. Pin compatible exact versions and their licenses when scaffolding; no lockfile exists today. Use stable WebGL rendering, not R3F 10 alpha/WebGPU. Compare native IndexedDB (selected for two stores) with an extra database wrapper (convenient but another dependency) and Supabase (cloud auth/sync work deferred). fflate supplies ZIP APIs [S8]; it is not an application import validator.

## Costs

- **Verified [S5/S6]:** model ID `gemini-3.5-flash-lite`; standard pricing $0.30/M input and $2.50/M billed output tokens. **Assumed:** 300 calls × (4,000 input + 1,000 output) = $1.11, including retries in the call count; no grounding, image generation or TTS calls.
- **Assumed:** local storage/analysis $0 service spend; Cloudflare free hosting planned, $5 upgrade contingency. Published hosting numbers are recorded in PROGRESS.md. **Verified — later billing review:** Gemini publishes a $5 minimum credit purchase ([billing](https://aistudio.google.com/docs/billing), accessed 2026-11-20); this includes, rather than adds to, estimated token consumption. **Unverified:** actual account prepay/postpay eligibility, project access/quotas, latency, framework versions and runtime CPU fit.

## Implementation notes

### Ownership and flow

**Assumed:** A owns scene/rules/photo+audio analysis; B owns shared schemas, form, function, IndexedDB, ZIP and release. Both review the contract in MW-000. Shared code changes require updating fixtures and this document in the same change.

Browser text/photo/audio → local validation and feature extraction → same-origin JSON generation request → server validation → Gemini structured data → server validation/source checks → client resolves input asset IDs → preview → atomic local save → archive. Raw photo/audio bytes never go to the model or application server. No upload/list/save REST endpoints, Python service, Supabase tables or RLS are required for this MVP. Avoid logging entry bodies, model responses or full song metadata.

Routes: `/`, `/create`, `/archive`, `/memory/:id`, and `/examples/:slug`. Personal IDs resolve only in the local browser; example routes resolve five deliberately published, rights-cleared bundled examples. Configure SPA fallback while preserving `/api/*` routes. No private local entry becomes public via its URL.

### Shared v1 data contract

**Assumed:** `MemoryScene` is validated with one shared Zod schema and exported TypeScript types; JSON Schema is supplied to Gemini for its narrower semantic response. Server, not model, owns IDs/version/seed/source links. All JSON rejects unknown keys and non-finite numbers.

| Group | Required contents / constraints |
|---|---|
| Identity | `id` UUID; `schemaVersion: 1`; `rulesVersion: 1`; uint32 `seed`; `date` YYYY-MM-DD; `title` 3–7 whitespace-delimited words, max 80 characters, one reflective tone |
| Provenance | `generation.mode: ai | rules`; `model` string/null; fallback reason/null; no claim a rule title was AI-generated |
| Source | `entryId`; 1–3 unique local `photoIds`; one local `audioId`; original text stays in DayBundle |
| Mood/context | `primary: calm | nostalgic | tense | joyful | mixed`; warmth/energy/tension/valence in [0,1]; `environment: park | room | city`; `timeOfDay: day | dusk | night | unknown`; optional source-grounded context only |
| Photos | Per-ID three RGB colors, mean lightness [0,1], width/height, optional user-supplied caption ≤200 characters; no inferred face identity |
| Music | `durationSec` 1–90; `sampleStepSec: 0.1`; RMS energy envelope of ceil(duration/0.1) values in [0,1]; mean energy [0,1]; `bpm: null`, `key: null`; provenance `measured` |
| Artifacts | Exactly two interactive records: ID, `kind: frame | note | cup | bench | lamp | desk`, nullable photo ID, nullable excerpt start/end offsets into original JS string; at least one photo and one valid excerpt across both |
| Presentation | Resolved bounded visual parameters and engine-generated `appliedRules[]` records: rule ID, source features, resulting parameters, concise explanation; no arbitrary HTML, code, URL, shader or coordinates |

`DayBundle` = manifest + original text + local media records (Blob, MIME, asset ID, display filename) + rights/consent notes + optional thumbnail. Fixed model/catalog IDs resolve through checked-in code. Titles are display labels; UUIDs isolate identical titles. Sanitization must retain 3–7 words and remove path separators/control characters; invalid AI titles get the one allowed repair retry, then a labeled rule title using source words.

### Boundaries

**Assumed API:** `POST /api/memories/generate` takes `{requestId, date, text, photos, music, assetIds}` with derived features only, ≤256 KiB JSON and 20–6,000 text characters. Return `200 {manifest}` after semantic validation; errors `{error:{code,message,retryable}}`: 400 validation, 413 oversized, 429 quota/rate limit, 502 invalid/upstream failure, 504 deadline. Never echo sensitive upstream diagnostics.

Call Gemini's `models/gemini-3.5-flash-lite:generateContent` using server secret `GEMINI_API_KEY`, JSON response MIME and schema [S9]. Disable tools/grounding; cap output at 2,048 tokens. Total 20-second deadline covers both attempts; permit one retry only for transient failure or schema repair when time remains. Do not retry auth errors or a quota response whose Retry-After exceeds remaining time. Client makes an input-preserving deterministic draft on failure; a demo fixture is available only through an explicit separate example action.

**Assumed viewer:** `MemoryViewer({manifest, resolveAsset, onComplete})`; `resolveAsset(id): Promise<Blob>`. Viewer creates/revokes temporary object URLs and never generates/saves. Store no blob URL in the manifest. Explain rules actually applied, not a separate model-written justification.

**Assumed repository:** `save(bundle)`, `list()`, `load(id)`, `delete(id)`, `exportDay(id): Blob`, `importDay(zip): id`, all asynchronous. IndexedDB stores day and media records in one transaction. Save failure leaves the draft available and offers export; request persistent storage where supported without promising it [S4/S7].

**Assumed file format:** ZIP `<3–7 word title>/manifest.json`, `entry.txt`, `credits.json`, `photos/<asset-id>.<ext>`, `audio/<asset-id>.<ext>`, optional `preview.png`. Credits carry rights scope and provenance. The manifest plus v1 renderer is the finished interactive memory, not a new render request. Include format/version notes in the export. Import validates schema, MIME/decodability, IDs, unique paths and total expanded size ≤40 MiB; reject absolute/traversal paths, unexpected executables, >20 members and unsupported versions. Repeated identical bundle ID/content is idempotent; conflicting content with the same ID is rejected, not overwritten.

**Assumed intake limits:** JPEG/PNG/WebP, 1–3 files, ≤5 MiB and 16 megapixels each; resize working textures to ≤1024 pixels on longest edge. One MP3/WAV audio file ≤10 MiB, duration 1–90 seconds. Check MIME plus signature/decode; no SVG/HTML. Use authorized excerpts or freely licensed recordings, never arbitrary stream URLs. Exact media limits are product choices, not browser guarantees.

### Determinism and fallbacks

**Assumed:** composition comes from seeded bounded rules. Persist resolved parameters and energy envelope; animate against audio playback time so seeking/reopening gives the same state at the same timestamp. Do not promise bit-identical GPU pixels across devices. Precompute layout, cap pixel ratio at 1.5, ≤100 draw calls/100k triangles, no real-time shadows or postprocessing in P0; target ≥30 FPS on the recorded mobile test device. Reduce motion option disables pulses without disabling audio or exploration.

No WebGL: useful static preview and explanation, explicitly not the 3D experience. No audio decode: retain input, show replacement-file action. No photo: validation error. Missing imported asset or unsupported version: explicit error, never regenerate. No browser storage: show draft/export and state archive persistence unavailable. Network-off generation: labeled local draft; existing loaded examples and saved bundles need no model, but a cold offline application launch is not promised.

## Risks

- **Assumed:** API spend abuse, provider eligibility and 10 ms function CPU need an early deployed check. Enforce body/output caps, platform rate limiting, a server generation-off switch and provider budget alerts; browser disabling alone is not a security control. Rate/account configuration remains unverified until tested.
- **Verified [S7]:** browser storage may be evicted. **Assumed mitigation:** export/import is P0; disclose same-browser storage and no encrypted-at-rest guarantee. Shared-device users can delete local data.
- **Assumed:** ZIP handling and image/audio decode can exhaust memory; enforce bounds before processing and cap decoded duration/dimensions. Asset and media rights are checked per file, not inferred from a hosting site's name.

## Sources

Accessed **2026-11-20**; estimates/choices above remain assumed:

- S1: [R3F introduction and compatibility](https://r3f.docs.pmnd.rs/getting-started/introduction).
- S2: [Babylon.js specifications](https://www.babylonjs.com/specifications/).
- S3: [Godot web exports](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
- S4: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).
- S5: [Gemini model](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite).
- S6: [Gemini pricing](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite).
- S7: [Storage quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- S8: [fflate repository and license](https://github.com/101arrowz/fflate).
- S9: [Structured output API examples](https://aistudio.google.com/docs/structured-output).

## Historical content — preserved verbatim; conflicting decisions superseded above

# Memory Worlds — Architecture

> **Status: proposed architecture.** The codebase has not been reviewed. The paths, routes, endpoints, and tables below are a target design, not a claim that they already exist. After initialization, replace descriptions with verified implementation details.

## 1. System and Data Flow

The user's browser (Next.js/TypeScript) accepts journal text, photos, and an authorized song/audio file. The client can extract photo palette/brightness and available audio signals. FastAPI validates input, sends a constrained multimodal request to Gemini, normalizes the result into MemoryScene, and saves media references and the manifest through Supabase. React Three Fiber reads only the validated manifest and builds the scene from fixed templates and a catalog. The archive opens the saved entry without calling the model again.

Direction: Browser → FastAPI → Gemini → normalization/Pydantic → Supabase → R3F renderer.\
Trust boundary: everything from the user and LLM is untrusted data; executable instructions are never passed to the engine.

## 2. Planned Stack and Responsibilities

| Layer | Proposed Technology | Responsibility |
|---|---|---|
| UI and routing | Next.js + TypeScript | Form, states, archive, viewer |
| 3D | Three.js through React Three Fiber + Drei | Deterministic scene and interactions |
| API | FastAPI + Pydantic | Input validation, Gemini, normalization, storage orchestration |
| AI | Google Gemini | Semantic analysis, object candidates, short phrases, and title |
| Data | Supabase Postgres + Storage | Manifest, archive, and private media references |
| Audio | Web Audio API when the signal is available/authorized | Subtle scene reactions; fallback: an official link |

Confirm commands, versions, deployment, and environment variable names against the actual repository. Keep secrets on the server only.

## 3. Planned Pages and Tree

- / — product entry point.
- /create — day entry form.
- /archive — saved scenes.
- /memory/{id} — open an existing manifest.

The proposed structure is in TASKS_BY_FILE.md. Do not create paths in advance without a specific task; adapt the tree to the scaffold.

## 4. Scene Schema

The canonical structure is a versioned MemoryScene, semantically shared between TypeScript and Pydantic.

| Field Group | Contents |
|---|---|
| schemaVersion, seed, title, date | Version, reproducibility, 3–7-word title, date |
| source | entryId, photoIds, song reference/audio id |
| mood | primary, warmth, energy, tension, valence in the 0–1 range |
| environment | preset park/room/city, season, timeOfDay, weather |
| photos | palette, lightness, textureMood |
| music | Source, measured profile, or unknown/null |
| artifacts | id, catalog type, interaction, photoId, verified excerpt |
| narrative | Short arrival and ending |
| explanation | Actual rules applied by the engine |

The generator must not output Three.js code, arbitrary URLs, shader source, uncontrolled coordinates, or unrestricted object types. Limit enums, lengths, artifact counts, and numbers; use a fixture/fallback on error. Do not present psychological assumptions as facts.

## 5. Proposed API

| Method and Path | Purpose | Planned Contract |
|---|---|---|
| GET /health | Service check | Readiness without secrets |
| POST /api/assets/upload | Media | Validate type/size/access; return an opaque media ID |
| POST /api/memories/generate | Draft generation | Text + media refs + song → validated draft manifest and explanations |
| POST /api/memories | Save | Save the final manifest; return an ID |
| GET /api/memories | Archive | Only entries belonging to the current owner/demo session |
| GET /api/memories/{id} | Reopen | Return the saved manifest and media refs; do not call Gemini |

A draft-then-save flow has been provisionally selected. If the actual project requires atomic generation/persistence, switch to a single route and update all documents.

## 6. Proposed Storage Model

- memories: id, owner/session ref, date, title, original_text, song reference/description, manifest_json, schema_version, rules_version, seed, timestamps, optional preview.
- memory_assets: id, memory_id, kind, storage_path, content_type, permission/license note, created_at.
- Storage is private by default; access is signed or authorized.
- Use Auth/RLS for personal data. If the demo is anonymous, explicitly restrict it and label it demo-only; do not enable unrestricted public write/read access.
- Uploads must be verifiable and, where possible, idempotent.

## 7. Scene and Reopening

The engine resolves the preset, palette, lighting, catalog props, photo textures, pacing, interactions, and final beat. Emotional values are combined with context from text, photos, and available music: one color does not define a mood. The three templates use a shared compositional grammar, differing in parameters and objects. The scene stores its seed and schema/rules versions.

User states: arrival → explore → reveal artifacts → emotional ending → archive. Completion is primarily triggered by interaction; a timer is acceptable only as a gentle demo fallback.

## 8. Fallbacks and Security

- Gemini unavailable/invalid JSON: normalization with limited retries, then a known fixture.
- No audio signal: official song link, description, or null profile; do not claim a measured BPM.
- No photo: clear error/fixture path; do not invent a user's photograph.
- No WebGL: explanatory message and, where possible, a static preview.
- Expired media URL: controlled error and an option to retry retrieval.
- Old schemaVersion: deliberate migration or explicit error, not silent reinterpretation.
- Escape HTML text; keep API keys, private entries, and the Supabase service-role on the server only.

## 9. Decision Log

| Decision | Reason | Reconsider If |
|---|---|---|
| R3F instead of Godot | Fits into React/Next and reduces sprint integration risk | The team already has a ready Godot pipeline |
| park/room/city environments | Enough variety without arbitrary world generation | Three scenarios are ready ahead of schedule |
| Schema and templates instead of executable AI-generated code | Safety, reproducibility, explainability | Not reconsidered during this sprint |
| Fixture flow does not depend on the LLM | Demo remains functional if the network/model fails | Not reconsidered during this sprint |

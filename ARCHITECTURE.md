# Memory Worlds — active architecture (amended 2026-11-20)

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

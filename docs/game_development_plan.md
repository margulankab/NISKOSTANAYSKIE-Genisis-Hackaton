# Memory Worlds — two-developer development plan

## 1. Decision and evidence baseline

**Verified — 2026-11-20:** the complete [case brief](../reference/document_en.md) and all seven original documents were read. Each original document was separately researched, amended and logged before this plan was written; see [CHANGELOG.md](CHANGELOG.md). The checkout has documentation only, no runnable game. The configured Git remote is `https://github.com/margulankab/NISKOSTANAYSKIE-Genisis-Hackaton.git`; public/jury access is **Unverified**. No deployment, account credentials, paid purchases, licensed demo assets, generated results or video have been verified.

**Verified:** the user confirms two developers and deadline **November 22, 2026, 23:59 Astana (UTC+05:00)**. Clock checked November 20 at 15:59 Astana. **Assumed planning start:** November 20 at **16:15**, giving **55 h 44 min** to the deadline. Allocate **26 focused hours each, 52 person-hours total**, plus explicit rest and protected release contingency. This assumes both developers know React/TypeScript; it is not a delivery guarantee.

**Evidence convention:** Verified claims cite primary sources or repository observations. All specifications, formulas, hours, targets and selections below are **Assumed / proposed implementation** unless explicitly marked Verified. Unknown facts are **Unverified**, not guessed. Requirement IDs refer to [00_case_requirements.md](00_case_requirements.md); every requirement there has an owner, task and acceptance-test mapping. Passing a documentation check does not mark a game requirement complete.

**Product:** a browser 3D diary game for adults who want to revisit the atmosphere of a day. Enter text, 1–3 photos and an authorized audio excerpt; explore a small diorama, reveal two artifacts to unlock an ending, save a titled day folder and return through the archive. Aim for 60–90 seconds, without forcing a timer. No combat, physics, NPC dialogue or open world. Trace: MIN-01–08, USR-01–04.

## 2. Implementation and visual system

### Stack and alternatives

| Layer | Selected approach and reason | Alternatives considered |
|---|---|---|
| 3D/UI | Vite + React 19 + stable R3F 9/Three/Drei + TypeScript; reuse React forms and controls | Babylon.js adds rich game tooling but requires a new scene integration; Godot adds a separate editor/export workflow |
| Validation/API | Shared Zod types, same-origin Cloudflare Pages Function, Gemini REST structured output | Separate FastAPI/Pydantic duplicates contracts and deployment; client-only model call exposes secrets |
| Archive | IndexedDB plus portable ZIP folders using fflate | Supabase adds auth/RLS/sync work; memory-only storage fails reload |
| Assets/audio | Original primitives, optional individually checked Kenney CC0 props; local Web Audio | Heavy scanned assets/textures add payload; streaming SDKs add rights and availability constraints |
| Video | OBS recording of actual prototype | Product-integrated recording adds scope; OS recorder only if audio capture is verified |

**Verified:** R3F pairs major versions with React; Babylon includes scene/audio/picking tools; Godot web export requires WebAssembly/WebGL2 [S1–S3]. Cloudflare documents React hosting and Functions routing [S4/S5]. **Assumed:** pin compatible exact package versions during MW-001; no versions are installed yet. Detailed interfaces, limits and failure handling are in [ARCHITECTURE.md](../ARCHITECTURE.md). Source licenses must be retained, including MIT notices for Three/Drei and OFL for Inter [S16/S17/S18].

### Independent developer interfaces — freeze at H+1

- **B owns the schema:** versioned `MemoryScene` with ID/date, 3–7-word title, schema/rules versions, seed, provenance, source asset IDs, bounded mood/context, measured photo/audio features, exactly two artifact records and resolved visual parameters/applied rules. Excerpts reference ranges in the original entry; reject invented quotations. Allow six prop types only: frame, note, cup, bench, lamp, desk.
- **Generation:** `POST /api/memories/generate({requestId,date,text,photos,music,assetIds})` returns `{manifest}` or typed validation/quota/upstream/timeout error. It receives features, not original media. B supplies `GEMINI_API_KEY` as a server secret. Use `models/gemini-3.5-flash-lite:generateContent`, JSON schema, no tools, max 2,048 output tokens, one retry within a 20-second total deadline. These timing/size limits are targets, not measured latency.
- **A owns rendering:** `MemoryViewer({manifest,resolveAsset,onComplete})`; asynchronous asset resolver returns local Blobs. Viewer neither generates nor persists. It opens two artifacts, then permits the final composition; archive navigation remains available.
- **B owns storage:** asynchronous save/list/load/delete/export/import methods. Atomic IndexedDB transaction contains original text, manifest, photos/audio and rights records. ZIP has an actual 3–7-word titled folder, manifest, entry, credits, media and optional preview. UUIDs distinguish duplicate titles. Reopening uses saved versions/seed/assets, with zero model requests. Regenerate temporary object URLs; never persist them.
- **Mocks unblock both:** B provides three full v1 mock manifests using the profiles in TASKS_BY_FILE.md, with one local test photo/audio and two source-grounded artifacts each. A renders mocks while B's form/API/archive use a mock adapter. Mock titles have `rules` provenance; five submission titles must come from successful AI generation.

**Verified:** Gemini supports schema-constrained output [S6]. **Assumed:** still validate semantics, enums, source ranges, counts and asset membership. Unsupported version/import, invalid MIME, decode failure, ZIP traversal or oversized expanded content yields a useful error, not regeneration. The architecture specifies input/ZIP bounds. No schema migration is needed before v1 exists; reject unsupported future/old formats deliberately.

### Input-driven art, not finished-template selection

**Constant system:** one orbit camera and bounded zoom, same ground footprint, Inter typography, photo frames, date/caption position, six-prop vocabulary, two-reveal interaction, and closing card. Park/room/city change background primitives and prop context using the same builder. No independent bespoke levels.

| Source / trigger | Technique and reference | Concrete rule / reason |
|---|---|---|
| Text mentions a place/event/object | Contextual assemblage | AI selects allowed environment/props tied to the entry; frame/note are neutral defaults, not invented autobiographical facts |
| Calm, low tension | Soft light inspired by Impressionist light studies | Warmth controls light color; spacing grows as tension falls, supporting a slower, open composition |
| Tense | Geometric abstraction associated with Kandinsky | Higher tension tightens spacing and increases bounded angular ordering; no copying a specific composition |
| Nostalgic/mixed | Photographic collage | Subtle translucent layers around authentic photo surfaces; readable source excerpt provides specificity |
| Photographs | Original photographic artifacts | Downsample locally to 64×64 for palette/lightness; quantize RGB and keep three dominant bins. Use actual photo accents, brightness and count; never fabricate a person's identity |
| Audio mean energy and time envelope | Rhythmic motion | Measured features change movement speed and pulse at playback time, not merely the soundtrack attached afterward |

**Assumed v1 formulas:** normalize audio PCM to mono; RMS per 100 ms; `e(t)=clamp(4*RMS,0,1)`, `meanEnergy=mean(e)`. Use `motionSpeed=0.25+0.75*meanEnergy`, `pulseScale(t)=1+0.04*e(t)`, and artifact spacing `2.4-0.6*tension+0.3*(1-meanEnergy)` scene units. Save features and resolved parameters; interpolate envelope using audio currentTime. RMS measures signal energy, not emotion. BPM/key remain null; do not call this tempo/key detection. Silent audio maps to zero energy. Reduced-motion mode disables pulses while retaining playback and artifacts. Trace: MIN-02/03, VIS-01–07, EVAL-01/02/04.

Explanations are assembled from executed rule records: e.g., “This recording's lower measured energy slowed motion; the photograph supplied the amber accents; the entry's park reference selected the bench.” Avoid a standalone model explanation that can disagree with the renderer. Styles are references, not permission to reproduce specific contemporary works (ETH-04/05).

### Privacy, rights, failure and performance

- **Verified:** unpaid Gemini terms restrict submitting personal information; paid processing and account/region/age conditions must be respected [S7]. **Assumed:** adult-facing demo, consent notice before transmitting journal text/features, no raw media transmission, no request-body logging. Do not claim zero retention or encryption beyond verified behavior. Account eligibility remains unverified.
- **Verified:** Spotify Platform policy prohibits games and synchronization with visual media [S8]. **Assumed:** P0 accepts licensed audio files, satisfying “link or file”; no Spotify SDK/previews, stream downloading or music-link fetcher. A future external link is separate from P0 playback evidence. A short excerpt is not automatically licensed: record rights to composition, recording, playback, export and demo video. Preserve photo/voice consent and all asset notices.
- **Assumed:** failed generation yields a clearly labeled rule-based draft derived from the submitted input, using original photos/text and measured music. It cannot count toward USR-02. Explicit examples are a separate action. Five saved AI-produced examples remain viewable with generation disabled.
- **Verified:** browser storage is subject to quotas/eviction [S9]. **Assumed:** local-first means same browser/origin, not cloud sync or guaranteed year-long retention. ZIP backups/import are P0. Storage failure preserves the draft and offers export; no silent “saved” status. Only consented example bundles are public.
- **Assumed targets:** ≤100 draw calls, ≤100k triangles, device pixel ratio ≤1.5, ≤1024px working photo textures, no real-time shadows/postprocessing. Target ≥30 FPS over a 60-second mobile session; record actual device/browser. Use touch orbit/tap and keyboard-accessible artifact buttons, visible audio start/mute, reduced motion, and a static fallback when WebGL is unavailable. Do not claim mobile success from desktop emulation.
- **Assumed latency/spend controls:** disable repeated submits, bound request/output size, platform rate limiting, provider budget/spend controls and server generation-off switch. Verify deployed CPU use in the first integration; network waiting and CPU consumption are different. Alerts alone are not a guaranteed hard cap.

## 3. Tasks, allocation and timeline

All hours are **Assumed focused person-hours**, include the named handoffs, and do not double-count joint checkpoints. A and B work simultaneously.

| Track A task | Hours | Dependencies | Acceptance / requirement trace |
|---|---:|---|---|
| MW-000: review schema, viewer seam and mocks | 1 | None | Shared fixture loads; AT-02/16; USR-03 |
| MW-001/002: controllable diorama and game loop | 5 | Contract; B scaffold | Two unique reveals unlock ending; AT-10; USR-01 |
| MW-005: three environments, photo analysis and visual rules | 5 | Fixture viewer | Three variants of one grammar; source-driven changes/explanations; AT-03/08/09 |
| MW-006: audio analysis, playback and comparison | 3 | Analyzer contract, authorized audio | Stored energy changes two parameters, playback works; AT-04 |
| MW-008: five examples and contact sheet | 2 | Core rules and B persistence | Three moods plus two distinct variants; AT-08/12 |
| MW-009: integration/performance/accessibility | 5 | Integrated flow | Actual browser/device evidence, failure and reduced-motion checks; AT-10/11/15 |
| MW-010: video, artistic explanation, release fixes | 5 | Frozen build | ≤180 seconds, accurate demonstrations and rights; AT-12/14 |
| **A total** | **26** | | |

| Track B task | Hours | Dependencies | Acceptance / requirement trace |
|---|---:|---|---|
| MW-000: schema, mocks and scaffold seam | 1 | None | Complete shared contracts and mock adapter; AT-02/16 |
| MW-001/003/009: scaffold, intake and early deployment | 4 | Contract | Public shell, validation and generation-function connectivity; AT-01/13 |
| MW-004: Gemini, validation, retry and provenance | 4 | Contract; paid access | AI title/manifest or honest fallback; AT-02/05/11 |
| MW-007: archive and portable folders | 5 | Mocks; no art dependency | Save/reload, duplicate titles, ZIP export/import; AT-06/07 |
| MW-009: privacy, limits and errors | 3 | Endpoint/storage | No exposed key/private media; bounds and controlled failures; AT-01/02/11/12 |
| MW-009: integration and jury walkthrough | 4 | Integrated build | Fresh-browser public examples plus private flow; AT-13/15 |
| MW-010: submission materials and release | 5 | Frozen examples | All seven materials accessible and verified; AT-12/14 |
| **B total** | **26** | | |

### Hour-by-hour blocks from November 20, 16:15 Astana

| Elapsed | Local interval | Developer A | Developer B |
|---|---|---|---|
| H+00:00–01:00 | Nov 20 16:15–17:15 | Contract and fixture review | Schema, mocks, minimal scaffold; check service access |
| H+01:00–06:00 | Nov 20 17:15–22:15 | Playable fixture, controls, two reveals/ending | 4h intake/deployment; 1h generation connectivity |
| H+06:00–15:45 | Nov 20 22:15–Nov 21 08:00 | Rest; no planned coding | Rest; no planned coding |
| H+15:45–19:45 | Nov 21 08:00–12:00 | 4h visual grammar/photo analysis | 4h archive/export/import with mocks |
| H+19:45–20:45 | Nov 21 12:00–13:00 | Meal/break | Meal/break |
| H+20:45–25:45 | Nov 21 13:00–18:00 | 1h visuals, 3h music, 1h examples | 1h archive integration, 3h generation, 1h safeguards |
| H+25:45–26:45 | Nov 21 18:00–19:00 | Meal/break | Meal/break |
| H+26:45–28:45 | Nov 21 19:00–21:00 | 1h examples; 1h integration QA | 2h safeguards/error behavior |
| H+28:45–39:45 | Nov 21 21:00–Nov 22 08:00 | Rest | Rest |
| H+39:45–43:45 | Nov 22 08:00–12:00 | 4h performance/browser/accessibility QA | 4h integrated acceptance/jury QA |
| H+43:45–44:45 | Nov 22 12:00–13:00 | Meal/break | Meal/break |
| H+44:45–49:45 | Nov 22 13:00–18:00 | Record/review video, techniques, release fixes | Description, licenses/tools, links, package/release |
| H+49:45–51:45 | Nov 22 18:00–20:00 | Protected upload/review reserve | Submit and verify receipt; release reserve |
| H+51:45–55:44 | Nov 22 20:00–23:59 | Submission contingency only | Submission contingency only |

**Assumed integration gates, B records evidence:** Nov 20 17:15 contract frozen; 22:15 deployed fixture and first live generation attempt. Nov 21 14:00 mock-backed save/reopen; 18:00 three complete generated mood scenes with audio; 21:00 five examples/feed and music comparison. Nov 22 12:00 acceptance/feature freeze; 18:00 complete package; 20:00 target submission; 23:59 hard deadline. Mock-backed persistence does not count as live-generation evidence.

At every gate, test the integrated milestone and relevant previously completed flows before starting the next phase. B records exact commands/manual checks, failures and evidence in PROGRESS.md; fix and rerun affected checks before marking completion. If a check cannot run, keep its acceptance criterion incomplete. This follows the concurrently added AGENTS.md milestone-testing rule.

**Cut line:** must-have = every minimum, legal constraint, five-example feed, AI-title success, archive/ZIP, playback, provenance and submission material. Should-have = additional grounded prop counts, polished thumbnails, subtle transitions within existing hours. Cut-if-late = voice-over, NPCs, weather, beat/key detection, peak-synchronized ending, generated video, service integrations and cloud sync. If Nov 21 18:00 gate fails, stop visual embellishment immediately; preserve the functional and submission work. An unmet mandatory item stays an explicit blocker.

## 4. Budget and risk register

Prices **Verified from official pages accessed 2026-11-20**; workloads/spend are **Assumed**. USD before tax. Do not activate purchases from this document alone.

| Item | Free option / published limit | Paid option / unit price | Expected consumption or cash |
|---|---|---|---|
| Cloudflare Pages/Functions | 500 builds/month, 25 MiB/asset; Workers 100k requests/day, 10 ms CPU/invocation [S10/S11] | Workers starts $5/month [S11] | $0 expected; $5 contingency if measured CPU requires upgrade |
| Gemini 3.5 Flash-Lite | Free availability exists, account quota unverified; not selected for personal entries | $0.30/M input, $2.50/M billed output [S12] | 300 calls × (4k input, 1k output) = **$1.11 usage** |
| Gemini activation | Existing eligible paid balance may suffice | Published minimum prepayment $5; account plan unverified [S13] | **$5 expected new-account cash**, includes the $1.11 consumption |
| IndexedDB, original primitives, Inter, licensed owned/CC0 audio | No service/storage subscription; license conditions apply | No purchases selected | $0 assumed |
| OBS recording | Free software [S14] | None selected | $0 |
| Deferred Supabase | Free: 500 MB DB, 1 GB files, 5 GB egress + 5 GB cached egress; pauses after inactivity [S15] | Pro from $25/month | $0; not used |
| Optional voice-over | Omitted | Preview TTS pricing researched in IDEAS.md | $0 |

**Assumed total:** $1.11 expected usage; $6.11 including optional Workers month. **Cash:** budget $5 for a new prepaid model account, or $10 with Workers upgrade. Keep a $10 pre-tax cash allowance; taxes, existing AI subscriptions, internet/hardware and account-specific terms are not priced. Do not add prepaid credit and consumed tokens as separate expenses. The 300-call estimate already includes retries; every extra 100 calls at the assumed size adds $0.37. Exact quotas, account limits, prepaid eligibility and production latency remain unverified. Model output tokens include billable thinking; measure actual usage metadata.

| Risk / state | Owner | Mitigation and trigger |
|---|---|---|
| No implemented code; 52-hour labor estimate is tight (Verified state / Assumed estimate) | A+B | Fixture first; one visual grammar; scope freeze at Nov 21 18:00 |
| Paid model/hosting account unavailable (Unverified) | B | First-hour check; save examples early; fail honestly; AI-title requirement remains blocked if no successful call |
| New account CPU/quota or spend abuse (Unverified) | B | Early deployed request, caps/rate limiting, budget controls and generation-off switch; consider $5 Workers upgrade only when evidenced |
| Personal-data transmission (Assumed risk) | B | Paid mode, clear consent, no raw media upload/logs, adult/region eligibility, local delete; do not overclaim privacy |
| Missing favorite-day consent/license (Unverified) | A+B | Gather before first demo generation; use labeled fictional test data meanwhile; never represent it as favorite-day evidence |
| Storage cleared or exported media missing (Assumed risk) | B | Atomic save, ZIP backups, import negative tests; disclose same-browser archive |
| Audio autoplay/decode and mobile GPU failure (Assumed risk) | A | Explicit start button, bounded files/textures, tested fallback, real-device check |
| Similar-looking days or random-template impression (Assumed risk) | A | Five-card feed plus controlled text/photo/music substitutions and visible rule explanations |
| Submission channel/upload unknown (Unverified) | B | Locate organizer channel by Nov 21; verify all URLs in fresh browser; target 20:00 submission and retain receipt |

## 5. Demonstration, submission and verification

### Five-day evidence set

**Assumed scenarios, not actual memories:** (1) authentic favorite-day park/cocoa recollection, pending team input; (2) tense room/project deadline; (3) calm city evening; (4) joyful reunion; (5) mixed reflective rainy day represented without implementing weather particles. The last four may use explicitly fictional entries and rights-cleared photos/audio. Three environments share one renderer. Do not assign final folder titles manually: generate all five through the prototype, validate 3–7 words, then record actual titles and provenance. The first scenario must reflect the team's real permitted source, not this illustrative description. Trace: MIN-06, VIS-05/11, SUB-02/03, ETH-01/06.

### Three-day demo video — maximum 180 seconds

| Time | On-screen action | Evidence |
|---|---|---|
| 00:00–00:15 | State premise; show favorite-day entry, photo and authorized song | MIN-01; identify real vs fictional data |
| 00:15–00:35 | Generate; show actual loading and AI title | USR-02; if edited for time, visibly label elapsed wait |
| 00:35–01:15 | Start audio, explore, reveal photo and exact excerpt, ending and save folder | USR-01/04; MIN-02–04 |
| 01:15–02:00 | Open tense and calm days; show one applied rule for each | VIS-01–04; EVAL-01/02/05 |
| 02:00–02:25 | Same text/photos/seed, two audio variants; show energy and motion values | MIN-03; AT-04 |
| 02:25–02:50 | Five-day feed; reopen favorite-day bundle with generation disabled | MIN-05; VIS-05; AT-06 |
| 02:50–03:00 | Working link, limitations, repository and credits | SUB-01/06/07; ETH-06 |

The two-track music comparison is a diagnostic variation, not a replacement for five different day entries. A records actual behavior with OBS; B verifies audio and the final file duration. Background music rights must cover the exported video. Narrator may be a consenting team member; no cloned voice.

### Submission manifest — B owns completion

Create `docs/submission.md` during MW-010 with actual artifact paths/URLs, checker, timestamp and result. All currently **Unverified / not produced**.

| Material | Required output and acceptance |
|---|---|
| Prototype | Stable public Pages URL; `/examples/:slug` works without preloaded private browser state; actual install/run instructions as fallback |
| Video | MP4 or accessible hosted video, ≤180 seconds; clear scenario and audible licensed audio |
| Examples | Five accessible results/contact-sheet images, actual generated titles, corresponding portable bundles |
| Description | Rendered PDF ≤1 page, idea/audience/rules/input contributions/limitations; verify rendered page count |
| Techniques | Actual rule/reference/mood table, matching renderer and explanation panel |
| Technical evidence | Accessible repository URL or source archive, own contribution described, no secrets/private inputs |
| Tools/resources | Exact used dependencies/versions/licenses, assets/fonts/music provenance, APIs and every AI assistant/model actually used; distinguish proposals from actual use |

**Assumed description draft to revise against actual build:** “Memory Worlds is a browser-based 3D diary for adults who want to revisit how a day felt. A short entry, photographs and an authorized audio excerpt become an explorable diorama. Two personal artifacts reveal an original photo and an exact passage from the entry. Shared camera, typography and photo frames keep the diary coherent; text context changes objects and composition, photograph colors shape accents, and measured audio energy changes movement. Every result explains the rules applied. Each titled day stores its manifest and media locally and exports as a portable folder. Past days reopen without another model request. The prototype demonstrates five days across three moods. Storage is browser-local; cloud synchronization and voice-over are outside this version.” Remove or label any claim that fails implementation acceptance.

**Actual audit tools, Verified:** OpenAI Codex assistant, web research, PowerShell, Git inspection and file patching. Exact underlying assistant model is unverified. **Planned game tools:** Vite, React, TypeScript, Three.js, R3F, Drei, Zod, fflate, Web Audio, IndexedDB, Cloudflare, Gemini 3.5 Flash-Lite, Inter, Vitest, Playwright and OBS; add Kenney only if imported. No ready-made model/track is yet selected. Google does not claim generated-content ownership, but no uniqueness or blanket copyright clearance is implied [S7].

### Acceptance tests and jury checklist

Each test begins **Unverified / not run** except AT-16's documentation portion, whose actual result is recorded in PROGRESS.md/CHANGELOG.md. B records evidence; A records rendering/audio/performance measurements. Use focused automated contract/rule tests and an end-to-end save/reload flow; supplement with manual sensory/device checks.

| ID | Scenario and passing criterion | Owner |
|---|---|---|
| AT-01 | Valid text/photo/audio accepted; missing fields, mismatched MIME, oversized/undecodable media rejected before processing; submitted text retained on errors | B |
| AT-02 | Reject unknown fields/enums, NaN/range violations, arbitrary URLs/code, unrelated asset IDs, invented excerpts and invalid model responses; three mocks validate | B |
| AT-03 | With seed and other sources fixed, change text then photo then song; record expected prop/context, color and music parameter differences; no randomly selected finished scene | A+B |
| AT-04 | Tap Start and hear the authorized track. For low/high-energy files with identical text/photos, log meanEnergy and computed motionSpeed; verify exact formulas, visible pulse at selected timestamps, null BPM/key and zero-energy silence | A |
| AT-05 | Successful AI response yields title 3–7 words, source-grounded and in consistent tone; provenance stored; ZIP folder contains title; malicious separators removed; duplicate display titles do not collide | B |
| AT-06 | Save two days; reload app; open first; original text/media/title/manifest unchanged; network inspection shows no generation call; same version/seed/time produces same scene parameters | B |
| AT-07 | Export and import into clean browser, media resolves and rules replay; reject traversal, duplicate ZIP paths, oversized expansion, absent assets, unsupported version and conflicting ID; identical reimport idempotent | B |
| AT-08 | Five different day cards share constant style, three mood scenes visibly differ; author reviews favorite-day atmosphere; record actual feedback without fabricated scoring | A |
| AT-09 | Every explanation matches applied-rule IDs/values; each technique has a mood/context reason; no diagnostic or unsupported tempo/key claims | A |
| AT-10 | Mouse/touch/keyboard can reach both distinct artifacts; repeating one does not unlock ending; both reveals do; no-WebGL state provides labeled preview | A |
| AT-11 | Simulate timeout/429/invalid JSON/offline; one bounded retry at most, useful error or labeled input-preserving draft; no secret leak/fixture substitution. Saved examples open with generation blocked. Storage quota failure never claims successful save | B |
| AT-12 | Inspect photo/music/asset/font/voice rights and consent; no unlicensed full songs or copied works; notices included; raw media absent from generation request; code bundle contains no API key; actual tools disclosed | A+B |
| AT-13 | Fresh desktop browser reaches prototype and five public examples; create/save/reload own entry; private local ID is not falsely shared; README commands run successfully after scaffold exists | B |
| AT-14 | Seven submission materials exist and open; video ≤180 seconds, rendered description ≤1 page, 3–7 actual results (five selected), favorite-day provenance, accurate limitations; record submission receipt | B; A video |
| AT-15 | Record device/browser and ≥30 FPS target over 60 seconds, 1024px textures/DPR cap, mobile audio/controls, reduced motion and memory cleanup across five openings; failures stated explicitly | A+B |
| AT-16 | Documentation: all seven files have five research sections, sources/dates and changelog entries; original text preserved; requirement IDs resolve; hours sum to 26 per track; schedule before deadline; no false test claims | B / audit |

**Jury quick path (Assumed instructions for the implemented build):** open submitted prototype → choose favorite-day example → tap Start Audio → reveal both artifacts → inspect “Why this scene?” → return to five-day archive → reopen a different day → create a short permitted entry with one photo and licensed audio → save and reload → export/import if verifying portability. Use submitted video if a browser lacks WebGL; do not claim static fallback is the 3D game. Five public samples must not require a personal account or prior local storage.

## Sources

All accessed **2026-11-20**. Detailed file-specific comparisons and failed-source notes remain in the seven amended documents.

- S1: [R3F introduction/compatibility](https://r3f.docs.pmnd.rs/getting-started/introduction).
- S2: [Babylon.js specifications](https://www.babylonjs.com/specifications/).
- S3: [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
- S4: [Cloudflare React hosting](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).
- S5: [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/).
- S6: [Gemini structured output](https://aistudio.google.com/docs/structured-output).
- S7: [Gemini terms, data and generated content](https://aistudio.google.com/docs/terms).
- S8: [Spotify developer policy](https://developer.spotify.com/policy).
- S9: [Browser storage quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- S10: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).
- S11: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- S12: [Gemini pricing](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite).
- S13: [Gemini billing/prepayment](https://aistudio.google.com/docs/billing).
- S14: [OBS licensing/use](https://obsproject.com/help/).
- S15: [Supabase pricing](https://supabase.com/pricing).
- S16: [Three.js license](https://raw.githubusercontent.com/mrdoob/three.js/dev/LICENSE).
- S17: [Drei license](https://raw.githubusercontent.com/pmndrs/drei/master/LICENSE).
- S18: [Inter font license](https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt).
- Additional consulted sources: [Gemini account quotas](https://aistudio.google.com/docs/rate-limits), [model ID](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite), [Kenney license](https://kenney.nl/support), [CC0](https://creativecommons.org/publicdomain/zero/1.0/), [fflate](https://github.com/101arrowz/fflate), [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

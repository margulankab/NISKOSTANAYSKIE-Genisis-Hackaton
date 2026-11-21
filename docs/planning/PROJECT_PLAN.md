# Memory Worlds — project-plan review (amended 2026-11-20)

## Zero-cost amendment — 2026-11-21

The active delivery plan now selects browser-local deterministic generation and static Cloudflare Pages Free hosting. Paid Gemini, Gemini prepayment, and a Workers subscription are no longer P0 dependencies or budget items. Expected new service cash is **$0**. The organizer brief makes AI optional; input-dependent local rules still generate the required meaningful 3–7-word folder titles. The prior $5–$10 comparison below is retained as historical research, not the current selection.

Do not send real journal content to Gemini's Free tier: Google's [published pricing](https://ai.google.dev/gemini-api/docs/pricing) identifies free-tier content as usable to improve its products. Any later AI experiment is isolated to fictional/non-personal data unless the team separately approves suitable privacy terms and billing. No purchase or billing activation is authorized by this plan.

**Verified:** the source brief and all historical content below were read in full. **Assumed / active:** [docs/game_development_plan.md](../game_development_plan.md) replaces the historical plan as the delivery schedule after this audit. Original content is preserved, including the old November 19 preparation stage and four-role proposal; those are not current commitments. Trace: all [case requirements](../00_case_requirements.md), particularly EVAL-01–05 and USR-03/06.

## Research findings

- **Assumed feasibility correction:** use 26 focused hours per developer, one shared scene system, six prop types, five generated saved days, and two interactions. Independent park/room/city productions, 10–15 bespoke props, full-stack Python/cloud storage and optional features together exceed the safe scope.
- **Verified [S1]:** Cloudflare documents React deployment. **Assumed hosting comparison:** select Pages plus a small same-origin function; Vercel offers a viable React/function alternative [S2] but changing adapters late buys little; local-only instructions are an allowed case fallback but weaker than the requested working jury link.
- **Verified [S3/S4]:** paid Gemini requires billing setup; Kazakhstan is on the availability list. **Unverified:** team account eligibility, project model access and actual deployment region behavior. Public availability is not proof of access.
- **Assumed requirement interpretation:** five examples satisfy the 3–7 submission range and 5–7 feed test; three receive detailed video coverage. “AI optional” in the case does not remove the user's stronger normal-flow AI-title requirement. A fallback must be disclosed, never presented as successful AI generation.

## Costs

- **Verified [S3]:** published Gemini minimum credit purchase is $5; account-specific prepay/postpay eligibility is unverified. **Assumed:** $1.11 expected token consumption can therefore require $5 upfront for a new prepaid account, not $1.11 cash.
- **Verified [S2]:** Vercel Hobby lists free usage including 100 GB fast data transfer and one million function invocations; account/use eligibility unverified. It is not selected and adds $0 planned spend.
- **Assumed:** selected Cloudflare free hosting + $5 Gemini prepayment = $5 expected new-account cash; optional $5 Workers subscription makes $10 cash before tax. Credits are not an extra $5 usage charge. No purchases are made by this documentation task.

## Implementation notes

- **Assumed sequence:** contract/mocks and deployment first; fixture interaction and intake in parallel; save/reopen integrated before visual expansion; three mood variants then five feed examples; freeze features before recording. B is integration/release owner; A is scene/audio/video owner.
- P0 includes private local media, ZIP day folders, AI-generated 3–7-word titles, measured audio response, explanatory rules, five examples and every submission material. Cloud sync, voice, NPCs, physics, weather, custom shaders and streaming integrations are excluded from committed hours.
- A completes the game loop from a mock without waiting for B's API. B completes archive/import/export against the same mocks without waiting for art. The only planned shared-edit seam is the versioned contract; B owns it.
- **Assumed checkpoints:** use the final plan's recalculated timeline, not elapsed November 19 work. Protect nightly rest, testing/video allocation, and November 22 20:00–23:59 submission contingency. Any slipped gate cuts optional polish, not mandatory criteria.
- **Assumed rights/privacy:** obtain favorite-day media with permission; only publish explicitly cleared examples. Store full originals locally; send journal text and derived features to paid AI only after disclosure/consent. No font/voice/music provider is assumed licensed merely because it appears in the backlog.

## Risks

- **Unverified:** no favorite-day source, licensed song, live build, generated result, or video exists here. Synthetic examples may exercise code but cannot be misrepresented as the team's authentic favorite day.
- **Assumed:** 52 person-hours presumes both developers already know TypeScript/React basics. If not, finish the same simple game grammar and cut polish; a new engine learning track is not affordable.
- **Assumed:** model/schema latency and local storage reliability require actual tests. Prebuilt saved days protect viewing, not proof of live generation. Missing platform access must be reported as a release blocker, not hidden by a mocked API.
- **Not applicable:** this file does not independently select another engine/assets stack; see the fully researched ARCHITECTURE.md and IDEAS.md decisions.

## Sources

Accessed **2026-11-20**:

- S1: [Cloudflare React deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).
- S2: [Vercel Hobby pricing/limits](https://vercel.com/docs/plans/hobby).
- S3: [Gemini billing and minimum prepayment](https://aistudio.google.com/docs/billing).
- S4: [Gemini available regions](https://aistudio.google.com/docs/available-regions).
- Local authority: [case brief](../../reference/document_en.md), §§02–12; [requirements](../00_case_requirements.md).

## Historical content — preserved verbatim; conflicting decisions superseded above

# Memory Worlds — Project Plan

## 1. Goal

Create a browser prototype that turns a story about a real day, photographs, and music into a short explorable 3D memory. The main result is a recognizable diorama with a consistent artistic language, an explainable connection to the input, and a way to revisit the saved day, rather than a random AI world.

**Pitch:** “A day's text, photos, and music become a place you can briefly return to.”

**Planned submission deadline:** November 22, 2026, 23:59 Astana time.\
**Planned prototype:** 60–90 seconds per scene, with the option to extend exploration to 1–3 minutes.

## 2. What the MVP Must Demonstrate

### Required User Flow

1. The user writes free-form text about their day.
2. Adds at least one photograph and a song: an authorized audio file or a link/description.
3. The system interprets the input and produces a verifiable scene manifest.
4. A deterministic 3D engine builds the scene from the manifest and a catalog of ready-made objects.
5. The user explores the scene, opens two memory artifacts, and sees the final composition.
6. The day receives a meaningful 3–7-word title, is saved to the archive, and reopens without an LLM call.

### Acceptance Criteria

- Text, photos, and music affect the result; the interface can explain their influence.
- Three base environments are available: park, room, city.
- A single style supports at least three distinct demo memories: nostalgia, tension, and calm.
- At least two interactive objects show an original photo or an excerpt from the user's text.
- Music plays or opens through an official method; available audio has a demonstrable influence on the scene's rhythm.
- The saved manifest, schema version, and seed allow the same scene to reopen.
- Three prepared examples work when the LLM is unavailable.
- Secrets, private photos, and journals are not unintentionally made public.
- A link/run instructions, a video of up to 3 minutes, 3–7 examples, a short description, and a list of sources/licenses are ready.

## 3. Scope

### P0 — Included in the MVP

- One complete flow from the form to an interactive scene and archive.
- A MemoryScene schema with server validation and defensive client constraints.
- Park, room, and city built from reusable templates.
- A catalog of approximately 10–15 allowed object types.
- Photographs as actual surfaces/artifacts inside the scene.
- Two meaningful interactions and a controlled climax.
- Playback of authorized audio or official opening of the song; music influences the visuals.
- Manifest persistence and reopening without AI.
- Three working fixture scenes, generation error handling, and clear loading states.
- An interactive explanation: “Why does the world look this way?”

### P1 — Only After P0 Works

Weather, one clarifying prompt for ambiguous text, voice narration, an NPC silhouette, and smoothly aligning a musical peak with the ending.

### Out of Scope for This Sprint

- LLM generation of executable Three.js code or arbitrary models.
- An endless open world, multiplayer, physics, and complex pathfinding.
- OAuth and deep Spotify synchronization.
- Full video generation.
- Large-scale asset generation or a standalone level editor.

## 4. Scene and Visual Language

One scene lasts approximately 60–90 seconds:

| Stage | What Happens |
|---|---|
| Arrival | Mood, location, weather, and a short opening line are immediately clear. |
| Recollection | The player explores the space and opens two objects linked to the input. |
| Emotional ending | Photo, phrase, composition, light, and music converge in a single climax. |
| Closing | The folder name and a transition to the archive appear. |

The low-poly style, camera, typography, photo frames, interaction prompt, and three-part rhythm stay consistent. Palette, light, object density, particles, camera, pacing, and musical response vary. Do not reduce emotion to a rule such as “sadness = blue.”

## 5. Stages and Checkpoint Gates

### November 19 — Preparation

- Inspect the actual repository state and assign roles.
- Check local startup and the simplest web and API deployment options.
- Prepare one agreed demo day, an authorized photo, and a track.
- Create and maintain the documents in this package from the start.
- Agree on the manifest structure, media upload boundary, and generation response.

### November 20 — One Vertical Slice

- Set up Next.js and an R3F scene with controls.
- Render one fixture scene, two objects, photo/text, and an ending.
- Create the form and a draft schema.
- Connect Gemini through a validated backend, without making it a prerequisite for running the fixture.

**Gate:** a teammate can complete form/fixture → scene → interactions → ending.

### November 21 — Prove It Is a System

- Add park, room, and city in a consistent style.
- Connect music and noticeable music-dependent effects.
- Add persistence, the archive, and reopening from the manifest.
- Prepare three distinct demo days and test a comparison of two musical profiles.

**Scope cutoff:** if three scenes cannot yet be saved and reopened by 18:00 on November 21, stop adding effects and focus on persistence, reliability, and the demo.

### November 22 — Verification and Submission

- Check the main flow, AI-offline fixtures, and error behavior.
- Check the actual public URL on a separate device/browser.
- Record a video of up to 3 minutes; prepare examples, a description, and licenses.
- Leave time for fixes and submit before 23:59.

## 6. Work Allocation

Names have not been assigned. An owner is a role, not an actual participant.

| Role | Main Area | Main Deliverables |
|---|---|---|
| A — Frontend/3D | Next.js, R3F, controls, environments, artifacts | MW-001, MW-002, MW-005 |
| B — AI/API | FastAPI, Gemini, Pydantic, normalization, contracts | MW-003, MW-004 |
| C — Product/Data/Integration | Form, archive, Supabase, UX, build, and demo | MW-007, MW-009, MW-010 |
| D — Audio/QA, if available | Legal audio, reactivity, manual checks, video | MW-006, contributions to MW-009/010 |

For a two-person team, A combines 3D and UX; B combines API, data, and integration checks. For three people, use A/B/C. A fourth person addresses audio risks and expands QA. Owners can change, but the contract between components must remain consistent.

## 7. Priority Management

A fixture-based vertical slice matters more than complex generation. Every task must have an acceptance criterion before work begins. A new idea does not become P0 without revisiting the schedule and scope table. If the LLM, audio, or host is unavailable, the main flow and an explainable fallback must continue to work.

## 8. Main Risks

- **No vertical slice:** build the fixture scene first, then richer generation.
- **LLM returns an unexpected structure:** strict schema, allowlists, clamping, and fixture fallback.
- **Music is unavailable or blocked:** authorized demo audio file, official song link as fallback; do not download streams.
- **Privacy breach:** restricted media storage, authorization/RLS, or an explicitly labeled demo dataset.
- **Different interpretations of the contract:** first lock down the manifest, upload ownership, and API response shape.
- **Late integration:** check CORS, upload limits, environment configuration, and deployment at the start.

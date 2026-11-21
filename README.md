# Memory Worlds

## Exploration game plan

Memory Worlds is a walkable low-poly diary and prompt game. Each visit has two discoveries, a closing landmark, a soundtrack and local saves. Start with `park` or `water park` to see generated scenery, or create a day from a journal entry, original photos and its associated song. [Current implementation plan](docs/memory_worlds_implementation_plan.md).

## Run the prototype

Use Node.js 20.19+ on the 20.x line or Node.js 22.12 or later. This project was verified with Node.js 24.17.0.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite to reach the title menu. **New Game → From a prompt** builds a walkable world from a description; press Esc to pause, save, or quit, and use **Continue** or **Load Game** to resume. Choose **Examples** for the fictional memory library. Walk with WASD, the arrow keys, or the touch controls. Approach both objects and press **E** or **Interact** to reveal the illustration and entry excerpt, then interact with the closing landmark. **Play soundtrack** starts the audio and its scene motion. The viewer respects reduced motion. If WebGL is unavailable, the static preview provides artifact, ending, and audio controls.

Choose **World preview** to orbit the foggy cove or covered night market and try the local soundtracks. Use the landmark buttons to inspect the route and **Overview** to reset the camera. Track choices and mute carry through world switches until you leave the page. These curated examples preview content for the planned prompt-generated game.

Choose **Create a memory** to validate a date, journal entry, photos, and an authorized audio excerpt. Select **Generate memory** to open the generated scene. Generation runs in the browser and works offline after the app loads. Use **Save to archive** to keep the memory in this browser. Use **Export ZIP** and **Import ZIP** to move a copy to another browser.

### Play a short memory

Open **New Game → From a prompt → Build memory**. Describe a person, a place, and a few details. Try “At dusk I met Mira near a lighthouse above a foggy cove with a red rowboat beside a pier.” Walk to the two marked objects, then approach Mira and choose a reply. You can save before choosing and return to the conversation later. Use **Build world** for the original exploration mode.

Gemini is optional for a local developer demo. Put `GEMINI_API_KEY` in the ignored `.env.local` file at the repository root, then restart `npm run dev`. The default is `gemini-3.1-flash-lite`. Set `GEMINI_MODEL` in the same file if your project uses another compatible Gemini model. In a loopback browser tab, enter a wholly fictional description, select **Send this fictional prompt to Google Gemini**, and choose **Build memory** or **Build world**. The preview shows **Planned with Gemini** after a validated result. [Gemini structured outputs](https://aistudio.google.com/docs/structured-output) · [Gemini API keys](https://aistudio.google.com/docs/api-key) · [Gemini data terms](https://aistudio.google.com/docs/terms#data-use-unpaid)

Both modes compose scenes from the same catalog and validated template. Static builds use private generation. Journal entries, photos, associated songs and saved games are processed on-device. If the optional planner fails, choose **Try again** or **Build privately** with the description intact.

```powershell
npm run typecheck
npm test
npm run build
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:browser
```

The build writes static output to `dist/`. The browser tests use an installed Microsoft Edge. See the [architecture](ARCHITECTURE.md), [milestone checks](PROGRESS.md), and [3D dependency licenses](public/3d-licenses.txt).

Build the local case artifacts with `node scripts/package-case.mjs` after `npm run build`. The script uses Microsoft Edge and FFmpeg and writes into the ignored `submission-output/` folder. [Case package and verification](docs/submission.md).

The [Egypt demo](egypt-demo.local/README.md) runs as a separate development preview. The production build uses the main application entry point.

## Zero-cost decision — 2026-11-21

The active P0 plan now expects **$0 in new service spend**: static Cloudflare Pages Free hosting, deterministic browser-local generation, IndexedDB/ZIP storage, local media analysis, open-source libraries/tests, authorized free or owned media, and OBS. Paid Gemini, Gemini prepayment, Pages Functions, Workers Paid, Supabase Pro, paid TTS, and purchased assets are not P0 dependencies. The older paid-model estimates below are retained as historical research and are superseded where they conflict.

Real journal content will not be sent to Gemini's Free tier because its [published pricing](https://ai.google.dev/gemini-api/docs/pricing) states that free-tier content may be used to improve Google products. The organizer brief makes AI optional, so local input-dependent rules produce the required 3–7-word system titles without a privacy or billing tradeoff.

## November 20 documentation audit

**Verified — 2026-11-20:** this checkout contains project documentation, not a playable game. The initial seven files all had existing edits; the audit preserves their full original content below active amendments. No application build, tests, deployed prototype or generated day examples are claimed. The source of case requirements is the supplied [case brief](reference/document_en.md); its independent organizer authenticity is unverified.

**Verified — audit reconciliation:** `docs/game_development_plan.md` now exists with the schedule and AT-01–16 definitions. Concurrent organization moved three supporting documents into `docs/planning/`; those moves and the milestone-testing gate are preserved. Historical text below retains its original paths.

## Start here

1. [Case checklist and traceability](docs/00_case_requirements.md).
2. [Three-developer development plan, schedule, demo and acceptance checks](docs/game_development_plan.md#active-delivery-plan--2026-11-21).
3. [Architecture and contracts](ARCHITECTURE.md), [file/owner map](docs/planning/TASKS_BY_FILE.md).
4. [Current progress](PROGRESS.md), [scope cuts and resource research](docs/planning/IDEAS.md), [working rules](AGENTS.md).
5. [Sequential audit changelog](docs/CHANGELOG.md). The [older project plan](docs/planning/PROJECT_PLAN.md) is retained with an explicit supersession notice.

**Original proposal (historical):** a web 3D diary game, 60–90 seconds per day: text/photo/authorized audio → input-driven diorama → two reveals → ending → named saved folder → archive. One system supports park/room/city and five example days. Vite/React/TypeScript/R3F, a constrained Gemini function, and private browser storage with ZIP backups are the selected target. See MIN-01–08 and USR-01–06 in the checklist.

## Research findings

- **Assumed capture comparison:** select OBS for recording the actual app; browser MediaRecorder [S2] would add capture/mixing/export work to the product; an existing OS recorder is a fallback only if its captured audio is tested. **Verified [S1]:** OBS is free/open-source recording software. Recording-tool licensing does not grant music or photo rights.
- **Verified [S3]:** publishing source without a license does not grant general open-source reuse rights. **Assumed:** disclose dependencies' licenses and make the repository accessible to judges; do not silently assign a license to the team's existing work. Repository publication permissions and final source URL remain unverified.
- **Verified [S4]:** Google does not claim ownership of generated content, but output may not be unique and users remain responsible for use. **Assumed:** retain provenance and review output; no claim that AI content is automatically copyright-cleared.

## Costs

- **Verified [S1]:** OBS costs $0. **Assumed:** expected model usage $1.11; new prepaid Gemini account cash budget $5, or $10 including optional Workers upgrade, before tax. See sourced calculation in the current plan; subscriptions already owned by the team are excluded and unverified.
- **Assumed:** no extra software purchase for docs, video or assets. Exact installed library versions and their notices will be added when implementation exists.

## Implementation notes

- **Verified:** there are no runnable application commands yet. Do not copy proposed scaffold commands as tested project instructions. After MW-001, record the actual install/dev/build/test commands and versions in this active README section.
- **Assumed limitations to disclose:** same-browser archive, no cloud sync/encryption guarantee; backups required for portability; adult/eligible-region model use; text and derived features sent to paid AI with consent; media retained locally except explicitly public examples. A rule-based fallback is labeled and is not AI-title evidence.
- **Assumed submission:** working link, ≤3-minute video, five titled results, ≤1-page description, techniques table, source repository and complete tools/resources list. The final plan contains the three-day script and jury verification steps. Record real artifacts/URLs in `docs/submission.md` during MW-010; do not manufacture links.
- **Verified tools used for this documentation audit:** OpenAI Codex assistant, web research, PowerShell, Git inspection, and patch/file editing. **Unverified:** exact underlying model name and subscription cost. **Planned, not yet used by the game:** Gemini, Vite/React/TypeScript/R3F/Three/Drei/Zod/fflate, Cloudflare, Inter, Vitest/Playwright and OBS. Distinguish this list from actual dependencies at submission.

## Risks

- **Unverified:** favorite-day photos/music, account access, submission channel, public prototype/video/repository URLs and all runtime checks. These are release tasks, not evidence of documentation incompleteness.
- **Assumed:** a local memory URL cannot be opened from another browser unless its bundle is imported; the five public example routes must work in a fresh browser. Preserve this distinction in the video and instructions.
- **Not applicable:** selecting another engine, database or voice provider here; see the dedicated reviewed documents.

## Sources

Accessed **2026-11-20**:

- S1: [OBS help and licensing](https://obsproject.com/help/).
- S2: [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder).
- S3: [GitHub repository licensing](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).
- S4: [Gemini generated-content terms](https://aistudio.google.com/docs/terms).
- Local: complete root-file inventory and Git status inspected on 2026-11-20; [case brief](reference/document_en.md).

## Historical content — preserved verbatim; conflicting decisions superseded above

# Memory Worlds — Planning Package

This directory is a **development plan for Memory Worlds**, not a game implementation. It was compiled from MEMORY_WORLDS_MASTER_PLAN.md. The game prototype and the state of the future repository were not checked; all paths, APIs, roles, and architectural decisions here are marked as planned.

## Getting Started

1. Read PROJECT_PLAN.md for the goal, MVP, schedule, and role allocation.
2. Open TASKS_BY_FILE.md to see what to create at each stage and in which files.
3. Use PROGRESS.md as the working task list and session log.
4. Before coding, adapt ARCHITECTURE.md to the actual repository.
5. AGENTS.md defines the project's working rules.
6. IDEAS.md holds ideas that must not be silently added to the MVP.

## Package Files

- PROJECT_PLAN.md — product, required deliverables, stages for November 19–22, 2026, roles, and risks.
- TASKS_BY_FILE.md — target repository tree, tasks by file, and completion criteria.
- PROGRESS.md — initial status and roadmap MW-001–MW-012.
- ARCHITECTURE.md — proposed system, data, API, and trust boundaries.
- AGENTS.md — working agreement for contributors and AI coding agents.
- IDEAS.md — ideas with priorities, complexity estimates, and reasons for deferral.

## Core Idea

Memory Worlds turns the text, photographs, and music of a real day into a short interactive 3D diorama. The LLM interprets meaning and returns constrained data; a deterministic engine builds the scene from preapproved environments and objects. The saved scene opens from the archive without regeneration.

## Decisions Adopted from the Original Plan

- Web application: Next.js, TypeScript, React Three Fiber, and Drei.
- Server: FastAPI and Pydantic; multimodal analysis: Gemini.
- Data and media: Supabase Postgres and Storage.
- MVP environments: park, room, city.
- MVP interaction: explore the scene, open two memory artifacts, see an ending.
- Priority: a complete vertical flow and a reliable archive, rather than an endless world generator.

## Status and Scope

At the time this package was created, only planning documents had been prepared. This **does not confirm** that project code, a database, APIs, tests, or a deployment already exist. Before marking any item complete, check the relevant code and acceptance criterion.

Source: MEMORY_WORLDS_MASTER_PLAN.md, supplied by the user. The original document distinguishes official competition requirements from recommended technical decisions; the plans preserve that distinction.

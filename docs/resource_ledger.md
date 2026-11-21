# Memory Worlds tools and resource ledger

## Application and verification

| Source | Use and attribution |
|---|---|
| Vite 7.3.8 and TypeScript 5.9.3 | Build and typed application contracts. Both are used through the checked-in lockfile. |
| React and React DOM 19.3.1, React Three Fiber 9.8.2, Drei 10.7.9, Three.js 0.187.0 | Interface, rendering, camera and geometry. The existing 3D notices ship with the build. |
| Zod 4.6.7 and fflate 0.8.3 | Scene, memory and archive validation and ZIP generation. |
| Vitest 4.1.12 and Playwright 1.65.1 with Microsoft Edge | Automated testing, isolated fresh profiles, gallery renders, and application capture. |
| Web Audio, IndexedDB, Canvas and browser file APIs | Local analysis, thumbnail and texture generation, persistence, playback and transfer. |
| FFmpeg and PyMuPDF | Local encoding and audio mux for the captioned demo, and the rendered one-page description. |
| OpenAI Codex | Assisted code, testing, original model authoring and documentation. |
| Claude Code | Assisted the song-of-the-day integration, larger outdoor worlds, atmosphere themes, tests and documentation (2026-11-21). |
| UI/UX Pro Max skill data (nextlevelbuilder/ui-ux-pro-max-skill) | Design-reference search for style, typography and three.js guidance. Used as reading material only; no code or assets copied. |
| GENESIS.EXE website (genesis-exe.com) | Visual reference requested by the team: terminal/pixel language and its theme set. Colors and layout ideas were reimplemented in our own CSS. No images, mascot, logo or scripts were copied. |
| Google Gemini API | Optional two-stage scene planning for wholly fictional loopback development prompts. Provider mocks exercise this contract. The static case build uses private local rules. |

[Dependency lockfile](../package-lock.json) · [3D dependency license notices](../public/3d-licenses.txt)

## Original project resources

- **Low-poly models.** The 108 new authored procedural silhouettes and 19 pre-existing builder IDs use original project geometry. No model packs were imported. Model IDs, builder parts, support metadata and gallery checks are published in the local source package.
- **Five fictional images and entries.** The source illustrations are `nostalgic-park.png`, `tense-room.png`, `calm-city.png`, `joyful-reunion.png` and `rainy-kitchen.png`. The entries and images were created for Memory Worlds. The first three images are pre-existing project fixtures. The two added illustrations use original geometric drawings. The packaged demonstration uses invented details. A contributor’s real favorite day and consent remain pending.
- **Associated songs.** Memory Worlds synthesized Coastal Light, Still Rooms and Lantern Market, and (2026-11-21) Warm Tape and Night Drive. Their catalog rights cover gameplay, portable export and demonstration. The fictional case uploads the corresponding original WAV. The demo mixes the same source WAV at its browser playback time. The example viewer’s original test tones continue to serve its regression fixtures.
- **Fonts.** Since 2026-11-21 the app self-hosts Unbounded, JetBrains Mono, Silkscreen and Pixelify Sans (all SIL Open Font License 1.1) through the Fontsource npm packages pinned in the lockfile. They are bundled by Vite and served from the app's own origin; no font service is contacted. Silkscreen has no Cyrillic, so Russian text falls back to Pixelify Sans. The PDF uses standard PDF typefaces.
- **Songs of the day.** A player may save a link to their own song in a music app plus a short description. The app stores only the link (with sharing codes such as `si=` removed) and the description. It never embeds a third-party player, never downloads the track and makes no request to the service; links open in the player's own app on click. In-game audio remains the cleared catalog or an authorized upload.
- **Personal uploads.** The diary requests permission for local playback and ZIP export. A user upload requires independent publication permission before use in a public example or video.

[Original models](../src/world/original-models.ts) · [Catalog metadata](../src/world/catalog.ts) · [Soundtrack catalog](../src/media/world-soundtrack.ts) · [Example sources](../src/fixtures/memories.ts)

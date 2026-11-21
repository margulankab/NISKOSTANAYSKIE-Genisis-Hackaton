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
| Google Gemini API | Optional two-stage scene planning for wholly fictional loopback development prompts. Provider mocks exercise this contract. The static case build uses private local rules. |

[Dependency lockfile](../package-lock.json) · [3D dependency license notices](../public/3d-licenses.txt)

## Original project resources

- **Low-poly models.** The 108 new authored procedural silhouettes and 19 pre-existing builder IDs use original project geometry. No model packs were imported. Model IDs, builder parts, support metadata and gallery checks are published in the local source package.
- **Five fictional images and entries.** The source illustrations are `nostalgic-park.png`, `tense-room.png`, `calm-city.png`, `joyful-reunion.png` and `rainy-kitchen.png`. The entries and images were created for Memory Worlds. The first three images are pre-existing project fixtures. The two added illustrations use original geometric drawings. The packaged demonstration uses invented details. A contributor’s real favorite day and consent remain pending.
- **Associated songs.** Memory Worlds synthesized Coastal Light, Still Rooms and Lantern Market. Their catalog rights cover gameplay, portable export and demonstration. The fictional case uploads the corresponding original WAV. The demo mixes the same source WAV at its browser playback time. The example viewer’s original test tones continue to serve its regression fixtures.
- **Fonts.** The app uses system UI families and Georgia fallbacks. No external font service or downloaded font is required. The PDF uses standard PDF typefaces.
- **Personal uploads.** The diary requests permission for local playback and ZIP export. A user upload requires independent publication permission before use in a public example or video.

[Original models](../src/world/original-models.ts) · [Catalog metadata](../src/world/catalog.ts) · [Soundtrack catalog](../src/media/world-soundtrack.ts) · [Example sources](../src/fixtures/memories.ts)

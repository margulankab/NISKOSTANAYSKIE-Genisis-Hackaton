# Memory Worlds — scoped ideas (amended 2026-11-20)

**Assumed / active:** retain the historical backlog below, but apply this cutoff first. Trace: EVAL-01/02/04, MIN-02/03/06, VIS-01–07, ETH-01–05. Estimates are planning judgments, not measured delivery times.

## Research findings

| Choice | Verified facts | Assumed decision |
|---|---|---|
| Original primitives / Kenney / Poly Haven | Kenney asset pages and Poly Haven assets use CC0 [S1/S2] | Original geometry first; Kenney only for a missing low-poly prop. Poly Haven textures/HDRIs unnecessary for this flat diorama |
| Owned or CC0 audio / official previews / Spotify SDK | CC0 permits reuse subject to remaining rights [S3]; Spotify policy prohibits games and visual synchronization [S4] | Owned or individually verified CC0 audio excerpt; no Spotify integration or downloaded streams |
| System font / self-hosted Inter / remote font service | Inter is SIL OFL 1.1 [S5]; Google Fonts FAQ unreadable in this research pass [S6] | Self-host one Inter font with license for consistent diary appearance; system sans-serif fallback; no remote dependency |
| No narration / browser speech / paid TTS | Browser synthesis exposes device voices [S8]; Gemini preview TTS has published prices [S9] | No narration in P0. Device voice/export consistency unverified; paid stored TTS only if a later scope review allocates time |

## Costs

- **Assumed:** $0 asset/font/music purchases; no paid pack, texture, or voice required. **Verified [S1/S2/S5]:** the cited asset/font licenses allow applicable reuse with their conditions; preserve bundled notices.
- **Verified [S9]:** Gemini 2.5 Flash Preview TTS lists $0.50/M text input and $10/M audio output tokens. **Unverified:** model access, actual quota and eligibility; no minutes-to-cost estimate asserted. **Assumed spend:** $0 because cut from sprint.
- **Assumed labor:** core photo/artifact/rules work is included in A's 5-hour visual block; audio in 3 hours. Custom assets, beat detection or voice would compete with release buffer.

## Implementation notes

- **Must-have:** IDEA-001–005. Real photo surfaces, source-grounded artifacts, saved audio-envelope response, combined text/photo/music rules, and explanations from the engine's applied-rule records.
- **Should-have only inside existing allocation:** IDEA-006, grounded prop counts; no extra interaction system. Original catalog stays at six types: frame, note, cup, bench, lamp, desk.
- **Cut-if-late:** IDEA-007/008/010/011 (musical climax alignment, voice, NPC, weather); IDEA-009/012–015 deferred. Arbitrary model-generated geometry and streaming-service synchronization are not prerequisites for input-driven procedural composition.
- **Assumed experiment:** fix text/photos/seed; swap two authorized songs. Decode PCM locally, average channels, compute RMS in 100 ms bins; set `e = clamp(4 * RMS, 0, 1)`. Persist envelope and mean. Compare `motionSpeed = 0.25 + 0.75 * meanEnergy` and `pulseScale(t) = 1 + 0.04 * e(t)` at identical playback times. Values and formulas are v1 design choices, not emotion science. Silent audio yields zero energy; BPM/key remain null.
- **Assumed artistic rules:** calm + low tension uses spacious composition and soft light inspired by Impressionist light; tension uses angular ordering inspired by geometric abstraction; nostalgia uses translucent layers inspired by photographic collage. Text context chooses props/environment; actual photo colors shape accents; musical energy adjusts pacing. Do not copy a specific painting or treat these as universal psychological truths.
- **Assumed rights ledger fields:** asset path/hash, creator, source URL, license/version, proof/access date, edits, attribution, consent where relevant, playback/export/video permission. Credit even CC0 resources for competition disclosure. Preserve Inter's license. Obtain rights for composition and recording, not merely a recording downloaded from a site.

## Risks

- **Verified [S3]:** CC0 does not clear every personality/privacy/trademark right. **Assumed mitigation:** no identifiable third-party portraits or voices without consent; fictional samples must be labeled, not claimed as a teammate's favorite day.
- **Verified [S7]:** audio initialization should follow user interaction. **Assumed:** test on touch devices, offer mute/reduced motion, cap decoded files as in ARCHITECTURE.md.
- **Unverified:** favorite-day content, selected track/pack, voice rights, exact device performance. Do not list suggested resources as actually used until imported and inspected.
- **Assumed:** late scope growth threatens the 55-point atmosphere/visual-system work and submission. No optional item may consume the protected submission buffer.

## Sources

Accessed **2026-11-20**:

- S1: [Kenney asset licensing](https://kenney.nl/support).
- S2: [Poly Haven licensing](https://polyhaven.com/license).
- S3: [CC0 deed and remaining rights](https://creativecommons.org/publicdomain/zero/1.0/).
- S4: [Spotify policy](https://developer.spotify.com/policy).
- S5: [Inter license](https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt).
- S6: [Google Fonts FAQ](https://fonts.google.com/faq) — **unverified**, no readable content returned; not used to establish font rights.
- S7: [Web Audio practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
- S8: [Browser speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).
- S9: [Gemini TTS pricing](https://aistudio.google.com/docs/pricing#gemini-2.5-flash-preview-tts).

## Historical content — preserved verbatim; conflicting decisions superseded above

# Memory Worlds — Ideas and Experiments

This list is a backlog, not permission to expand the current task. Do not start P1/P2 work until the P0 gates in PROGRESS.md are met.

## P0 Candidates

| ID | Idea | Value | Complexity | Risk/Dependency | Status |
|---|---|---|---:|---|---|
| IDEA-001 | Real photos as textures in the world | Authentic memories | S–M | Privacy, upload size | MVP |
| IDEA-002 | Objects selected from the text reveal a quote/photo | Meaningful interaction | M | Do not invent personal facts | MVP |
| IDEA-003 | Light/particles react to an available audio signal | Musical influence | M | Rights and signal availability | MVP |
| IDEA-004 | Combined mood + photo + music rules | Different scenes under the same mood label | M | Explainable rules and A/B comparison needed | MVP |
| IDEA-005 | “Why does this scene look this way?” | Explainable results | S | Text must reflect the rules actually applied | MVP |

## After the MVP, Only If Time Allows

| ID | Idea | Value | Complexity | Start Condition |
|---|---|---|---:|---|
| IDEA-006 | Number of cups/chairs based on the people in the story | Personalized composition | S | Only with confident extraction and no invention |
| IDEA-007 | Synchronize the ending with a musical peak | Strong climax | M–L | Only for authorized audio that can be analyzed |
| IDEA-008 | Short TTS narration | Additional atmosphere | M | Check cost, rights, and consent |
| IDEA-009 | One clarifying question | Fewer inaccurate scenes | M | Must not block the main flow |
| IDEA-010 | NPC silhouette without AI dialogue | Sense of presence | M | Reassess after three completed scenes |
| IDEA-011 | Limited weather particles | Greater expressiveness | M | Check performance |

## Deferred for This Sprint

| ID | Idea | Reason |
|---|---|---|
| IDEA-012 | Arbitrary procedural world geometry from text | XL; high risk of an unfinished MVP |
| IDEA-013 | Deep Spotify synchronization/OAuth | L–XL; APIs and rights may block progress |
| IDEA-014 | Multiplayer | XL; unnecessary for a personal memory |
| IDEA-015 | A fully generated video | XL; unpredictable quality and time requirements |

## Experiment Card

- Date and idea ID:
- Hypothesis:
- What was compared:
- Result and evidence:
- Decision: keep / change / defer:
- If moved into implementation: MW-... task and new acceptance criterion:

An idea must not silently become P0. Update the roadmap, deadline, and criteria before implementation begins.

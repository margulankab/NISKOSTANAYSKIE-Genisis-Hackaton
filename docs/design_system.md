# Memory Worlds — interface design system (2026-11-21)

## Active: GENESIS terminal with four atmospheres

**Brief.** The team asked for the game to look like the hackathon site, [genesis-exe.com/classic.html?theme=genesis](https://genesis-exe.com/classic.html?theme=genesis), "but in different atmospheres". The site's own theme switcher already has three views (GENESIS black-green, a violet "simple" view and a light view) plus an animations toggle. The game follows that visual language under its own name, and adds atmospheres that respond to the world being played. No images, mascot, logo or scripts from the site were copied; colors and layout ideas were reimplemented in our CSS ([resource ledger](resource_ledger.md)).

### Language taken from the site

| Site element | In Memory Worlds |
|---|---|
| `● REC CAM_00 · LIVE` strip with a clock | `REC MEMORY_00 · LIVE` status bar with local time (decorative, hidden from assistive tech). |
| `> ./genesis_hackathon --status` and a blinking cursor | `> ./memory_worlds --remember` on the title screen. |
| Unbounded 900 title with a white/lime split fill and a violet offset shadow | Every page title and the world title above the 3D view. |
| Pixel tags (`FIN TECH ART`) | `TEXT PHOTO SONG WALK`, which are the four inputs of a memory. |
| Notched "pixel buttons", solid lime for the main action | All buttons and menu actions. The main action on each screen is solid lime. |
| Windows with a coloured title bar `[ info.exe ]` and three square buttons | Forms and panels: `[ prompt_world.exe ]`, `[ day_memory.exe ]`, `[ archive.exe ]`, `[ settings.exe ]`, `[ pause.exe ]`. |
| Scanlines, pixel grid and a marquee ticker | Global scanlines and grid; CRT vignette on the 3D view; ticker on the title screen. |
| Theme switcher with an animations toggle | **◐ View** panel in the masthead, and the same choices in Settings. |

**Type.** Unbounded (titles), JetBrains Mono (body), and Silkscreen with Pixelify Sans (pixel labels, Cyrillic fallback). All four are self-hosted OFL fonts.

### Atmospheres

| Atmosphere | When Auto picks it | Background / ink / accent |
|---|---|---|
| GENESIS | Night worlds, and everything outside a world | `#070a07` / `#eaf7e0` / lime `#9be14b`, violet `#b794ff`, pink `#d65bb0` |
| Nebula | Dusk and dawn worlds | `#1d1530` / `#f4efff` / lime `#b5f06a`, violet `#cdb4ff` |
| Daylight | Day and morning worlds | `#f6f8f3` / `#10200b` / dark lime `#2f5f0c`, violet `#5a2fc8` |
| Fog | Rain, fog and snow worlds | `#0c1214` / `#e6f1f0` / teal `#7fd6c8` |

**Auto** is the default. While a prompt world or day memory is open, the interface takes the atmosphere of its time of day and weather, then returns to GENESIS on leaving. A fixed choice overrides Auto. The **pixel filter** (on by default) renders the 3D view at half resolution and scales it up crisply, which matches the pixel language and also lightens the GPU load.

### Accessibility checks

Measured WCAG contrast for each atmosphere's text pairs: body text, secondary text and muted hints on both background levels, accent links, alerts, button labels on lime, and title-bar labels. The lowest pair is 4.7:1 (Daylight muted on the second background); all others are 7:1 or higher. Violet surfaces that carry white text use a darker per-theme `--key` color (7.7:1 or better). Focus is a 3 px yellow outline, and notched corners are removed on focus so the outline is never clipped. Animation (cursor, REC light, ticker, window pop) stops when Settings → Reduced motion is on, or when it follows a device that asks for reduced motion.

## Superseded: "mixtape of days" concept (earlier on 2026-11-21)

*Replaced the same day at the team's request to follow the GENESIS.EXE visual language. Kept for the record; the track-list hints, song card and cassette motif carry over.*

**Subject.** A diary that turns one day (or a described place) into a small world you can walk through, then keeps it as something you can come back to. **Audience:** the person journaling, and the case jury seeing it for the first time. **Primary job:** get from "write what happened" to "walk inside it", and make the archive feel like a shelf of keepsakes rather than a file list.

### Concept: the mixtape of days

A day you remember already has a soundtrack, and the brief asks for the day's song. The interface borrows from the object people used for exactly that: the cassette and its folded paper insert (the J-card). Each world is a tape with a handwritten label. The song of the day is its A-side and opens in the player's own music app. The archive is the shelf.

The metaphor is used structurally, not as decoration:

| Cassette vernacular | Where it appears | What it encodes |
|---|---|---|
| Handwritten label | Memory and world titles, the player's quoted words | Words the player wrote are set in handwriting; everything the system says is printed. |
| Printed track listing with leader dots | Title menu, new-game menu, saved games | A list of choices with what each one does on the right. |
| Three-stripe label band | The masthead rule and the game's title label, nowhere else | Brand mark; appears twice so it stays a signature. |
| Deck keys | Buttons | Square-ish, bordered keys with a pressed state; primary actions are cobalt. |

### Tokens

| Name | Hex | Role |
|---|---|---|
| Card stock | `#E6E9E3` | Page background. A cool, grey-green paper, deliberately not warm cream. |
| Label white | `#F7F8F4` | Inputs, labels, panels that sit on the stock. |
| Ink | `#1E2A47` | Text, borders, outlines. Navy print ink, not black (11.6:1 on stock). |
| Pencil | `#5A6378` | Secondary text and hints (4.9:1 on stock, 5.6:1 on label white). |
| Cobalt | `#2D5BA8` | Primary actions and links (6.6:1 with white text). |
| Signal orange | `#E8742B` | Stripe band and progress only. |
| Marker yellow | `#F1C83C` | Stripe band, highlight behind matched words, focus halo. |
| Tape teal | `#2A8A80` | Stripe band only. White on teal is 4.2:1, so teal never carries small text. |

**Type.** Three self-hosted OFL families with Cyrillic, so Russian entries render correctly:

- *Unbounded* (wide geometric) — wordmark and page titles only, like printed tape branding.
- *Onest* — all interface text. Body 1rem/1.55, hints 0.875rem.
- *Caveat* — anything the player authored: memory titles, quoted excerpts, the song label.

Sentence case throughout. No all-caps eyebrows, no monospace labels, no arrows appended to buttons.

### Layout

```
┌ Memory Worlds (Unbounded) ─────────────── Main menu  Examples  … ┐
├──────── orange ── yellow ── teal stripe rule ───────────────────┤
│                                                                  │
│  Walk inside a day                     New game ········· start  │
│  you remember. (Unbounded, large)      Continue ··· “title” hand │
│                                        Load game ········ saves  │
│  short line of plain copy              Examples ····· five days  │
│                                        Settings ········ sound   │
└──────────────────────────────────────────────────────────────────┘
```

Forms are a single left-aligned column of at most 68 characters. The game uses a wide stage (up to 1180 px) with its handwritten label above the canvas, and plain controls below it.

### Principles

1. **One bold element:** the handwritten label. Everything around it stays printed, quiet and aligned.
2. **The player's words look written, the system's words look printed.** That split is information, not ornament.
3. **No decorative motion.** Buttons respond to presses, and the 3D world provides all of the movement on screen.
4. **Accessible by construction:** 4.5:1 text contrast, visible focus (yellow halo with an ink outline), 44 px touch targets, and `prefers-reduced-motion` respected.

### Review against generic defaults

| Default it could have become | What was chosen instead, and why |
|---|---|
| Warm cream background, serif display and a terracotta accent | A cool stock, a wide sans display and a cobalt action colour, taken from cassette inserts rather than editorial print. |
| Near-black background with one acid accent | A light paper interface; darkness belongs to the 3D night scenes, not the chrome. |
| Identical rounded cards with soft grey shadows | Track listings and hard-edged labels. Saved days appear as rows on a list, and examples as photo prints. |
| Template chrome (eyebrows, middle-dot meta strings, mono labels, `→` buttons) | Removed from all new and restyled copy. |

The UI/UX Pro Max catalog's first automatic suggestion for this product ("3D & Hyperrealism", neon purple and rose, esports fonts) was rejected as off-brief. Its narrower *Vintage Analog / Retro Film* and *Editorial* results informed the paper texture and type pairing. Its three.js rules (instancing repeated meshes, fog as far culling) guided the larger worlds.

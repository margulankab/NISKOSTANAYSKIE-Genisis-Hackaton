# Memory Worlds local case package

## Run the prototype

Extract `memory-worlds-build.zip`, open its folder in a terminal and run `node serve.mjs` with Node.js 20.19+ or 22.12+. Then open `http://127.0.0.1:4173/`. Use the same browser and URL for later visits. `node serve.mjs 4180` selects a different port.

Choose **New Game → Create a day memory** to enter a date, write about a day, select an authorized image and song, validate the files and generate. Use **Play soundtrack** to hear the associated song. Move with WASD, the arrow keys or the touch pad. Reveal the two objects with E or **Interact**, reach the ending, save from Pause and reopen through **Continue**. The Archive accepts the five supplied example ZIPs.

## Package contents

| Item | Local file or location |
|---|---|
| Prototype | `memory-worlds-build.zip`, containing the static site and a local server. |
| Demonstration | `memory-worlds-demo.mp4`, a captioned walkthrough with the associated song. It uses fictional test material. |
| Day results | `day-results/`, with five actual diary exports, and `five-day-contact-sheet.png`. |
| Description | `output/pdf/Memory Worlds - Case Description.pdf`, one page. |
| Techniques | [Visual techniques](visual_techniques.md), with game captures in the package. |
| Source | `memory-worlds-source.zip`, with app, test and packaging code. The project implements the scene rules, geometry, story, movement, audio analysis, interface and persistence. The resource ledger identifies third-party runtime libraries and tools. |
| Tools and rights | [Resource ledger](resource_ledger.md). |
| Verification | `verified-results.json` records the on-device build, actual generated titles, exact media results and independent-profile imports. |

The supplied ZIP titles are **Remembering last light**, **Remembering room before the call**, **Remembering city by the river**, **Remembering laughed by the gazebo**, and **Remembering quiet kitchen as rain**.

The video shows the source fields, generation, sound playback, walking, both reveals, ending, saving, archive list and reopening. The soundtrack was synchronized to the browser’s playback position using the authorized original WAV. The source and build are local artifacts for the organizer’s build and instructions option.

## Verification boundaries

Five packages were created through `/create` on the production build and exported through the browser. Each contained the exact original image and associated song. All five imported into a fresh Edge profile. Imported days start at spawn. The local archive reopened the completed demonstration with its original media and stored state. The diary packaging run made zero external web requests.

A real team member’s favorite day, their consent and reaction, physical-device signoff, a public hosting URL and the organizer receipt are pending. The fictional demo can be reviewed now. The product’s live model acceptance, moderated playtests and wider hardware signoff are tracked in [PROGRESS.md](../PROGRESS.md).

# Memory Worlds — case requirements

**Verified — 2026-11-20:** extracted from the complete user-supplied `document_en.md`, sections 01–12. Source: [case brief](../reference/document_en.md). The source is the supplied brief, not an independently authenticated organizer publication. The user made its requirements binding.

**Evidence convention:** **Verified** = cited source or inspected repository fact; **Assumed** = chosen design, estimate, or target; **Unverified** = unavailable evidence or behavior not tested. All implementation evidence below is **Unverified / pending**: this checkout contains documentation only. A checked requirement requires actual evidence, not this plan. A/B denote the two developers confirmed by the user.

## Minimum requirements — section 07

| ID | Required outcome (Verified: §07) | Owner / task | Verification / evidence to collect |
|---|---|---|---|
| MIN-01 | Text about the day, at least one photo, and a song supplied by link or file | B / MW-003 | AT-01: valid input accepted; each missing required input rejected |
| MIN-02 | A designed memory built from input, not randomly selected from finished templates | A+B / MW-004/005 | AT-03: change text/photo/music independently and inspect output differences |
| MIN-03 | Music noticeably changes design and plays or opens while viewing | A / MW-006 | AT-04: audible authorized audio and measured visual changes |
| MIN-04 | Separate day folder with a meaningful system-generated short title | B / MW-004/007 | AT-05: inspect saved bundle and actual exported folder |
| MIN-05 | Archive reopens any previous day | B / MW-007 | AT-06: reload, select old entry, verify no generation request |
| MIN-06 | Unified visual system demonstrated on at least three differently mooded days | A / MW-005/008 | AT-08: three contrasting scenes and five-card feed |
| MIN-07 | Original team contribution; disclose libraries, open source, AI tools | A+B / MW-010 | AT-12: repository evidence and complete tools/credits ledger |
| MIN-08 | Jury can verify the prototype using instructions or video | B / MW-009/010 | AT-13: fresh-browser walkthrough from submitted instructions |

**Verified — §07:** atmospheric voice-over is a bonus, not a minimum requirement.

## Submission — section 09

**Verified — §09:** deadline **2026-11-22 23:59 Astana time (UTC+05:00)**; organizers announce the submission form/channel separately. **Unverified:** that destination and all final submission URLs. **Assumed:** target submission at 20:00, preserving 3 h 59 min contingency.

| ID | Required material (Verified: §09) | Owner / task | Verification / evidence to collect |
|---|---|---|---|
| SUB-01 | Working prototype link, build, or clear run instructions | B / MW-009/010 | AT-13: working public link and verified commands once code exists |
| SUB-02 | Video at most three minutes, using the team's favorite day: text/photos/song → memory/folder → archive | A / MW-010 | AT-14: duration ≤180 seconds, scenario visible, favorite-day provenance |
| SUB-03 | 3–7 results for different days with titles produced by prototype | A+B / MW-008/010 | AT-08/14: submit five saved results and their actual titles |
| SUB-04 | Description at most one page: idea, audience, visual rules, contribution of each input | B / MW-010 | AT-14: rendered page count ≤1; all four topics present |
| SUB-05 | Artistic techniques/references and the moods that trigger them | A / MW-005/010 | AT-09: rule table agrees with running renderer |
| SUB-06 | Repository or other technical evidence of team contribution | B / MW-010 | AT-12/14: accessible source and contribution explanation |
| SUB-07 | List of libraries, ready-made resources, APIs, and AI tools | B / MW-010 | AT-12: actual versions, sources, licenses, and human/AI contributions |

## Evaluation — section 10

| ID | Criterion (Verified: §10) | Points | Owner / tasks | Evidence to collect |
|---|---|---:|---|---|
| EVAL-01 | Atmosphere of the day; desire to revisit | 30 | A / MW-002/005/008 | AT-08: compare favorite day to its author's account; report qualitative feedback honestly |
| EVAL-02 | Cohesive, original visual system with variety | 25 | A / MW-005/008 | AT-08/09: five-day contact sheet, constant/variable rules |
| EVAL-03 | Functionality, engineering, own contribution | 20 | A+B / MW-001–009 | AT-02/06/07/10/11/15: working flow and test record |
| EVAL-04 | Meaningful text/photo/music influence and convenient recording/archive UX | 15 | A+B / MW-003/005/006/007 | AT-01/03/04/06: isolated-input comparisons and walkthrough |
| EVAL-05 | Demonstration, explanation, techniques | 10 | A+B / MW-010 | AT-09/12/13/14: concise demo and accurate explanations |

**Verified:** total = 100. The tie-break preference favors deeper input/output relationships than a single mood-to-color mapping; one impressive template without a system is insufficient (§10). **Assumed priority:** spend polish time on atmosphere and visual-system quality (55 points), after the complete required flow works.

## Legal, ethical, and truthfulness constraints — section 12

| ID | Constraint (Verified: §12) | Owner / task | Verification / evidence to collect |
|---|---|---|---|
| ETH-01 | Use own, fictional, or voluntarily provided entries/photos; consent for others' personal material | B / MW-003/008/010 | AT-12: provenance and consent ledger; fictional data labeled |
| ETH-02 | Do not store/distribute others' full copyrighted songs; use service links, official excerpts/APIs, or freely licensed audio | A+B / MW-006/008/010 | AT-12: track-level license permits playback, export and video use; no stream downloading |
| ETH-03 | Synthetic or team-member narration; no copying real voices without consent | A / MW-011 | AT-12: voice provenance if enabled; otherwise disclose not implemented |
| ETH-04 | Styles/movements may inspire; do not copy specific contemporary works without permission | A / MW-005/010 | AT-12: original geometry/materials; source/license for imported works |
| ETH-05 | Emotional guesses are not medical/psychological diagnoses | A+B / MW-003/004/005 | AT-02/09: UI and model output use artistic, non-diagnostic language |
| ETH-06 | Jury assesses implemented work, not future promises | A+B / MW-009/010 | AT-14: disclose fallbacks/limitations; no planned feature represented as complete |
| ETH-07 | Aim for a memory that evokes the original feeling when reopened much later | A+B / MW-005/007/008 | AT-06/07/08: portable saved entry and author feedback; one-year retention is not claimed tested |

## Supporting requirements and permissions — sections 02–06 and 08

| ID | Requirement / interpretation | Source | Owner / task | Verification |
|---|---|---|---|---|
| VIS-01 | Recognizable format; stable grid/fonts/date/caption/photo treatment conventions | §04 | A / MW-005 | AT-08 |
| VIS-02 | Mood-dependent palette, treatment, texture, composition, rhythm and animation within the system | §§02–04 | A / MW-005 | AT-03/09 |
| VIS-03 | Explain which artistic technique/reference is triggered and why | §04 | A / MW-005 | AT-09 |
| VIS-04 | Titles use one tone and 3–7 words; any voice obeys explicit rules | §04 | B / MW-004; A / MW-011 | AT-05/12 |
| VIS-05 | 5–7 days side by side look like one diary but remain distinct | §04 | A+B / MW-008 | AT-08: five examples selected, not merely three |
| VIS-06 | Text supplies mood/events/context; photos supply authentic artifacts, colors/light/subjects/frame count | §05 | A+B / MW-003/004/005 | AT-03: derive rather than invent; optional photo subject caption supplied by user |
| VIS-07 | Music affects design through measured features or at least description; unavailable tempo/key are unknown | §05 | A / MW-006 | AT-04/09 |
| VIS-08 | Day folder contains input text/photos/song, finished memory, and voice-over if implemented | §02 | B / MW-007 | AT-05/07: manifest is the replayable interactive output |
| VIS-09 | Format/platform are free; AI optional under case, but any generation obeys visual system and can be revisited | §06 | A+B / MW-004/005/007 | AT-02/03/06 |
| VIS-10 | Additional weather/geolocation only optionally and with consent | §05 | B / MW-003 | AT-12: no automatic collection in MVP; user chooses entry date |
| VIS-11 | Demonstrate a favorite day; specificity and author's comparison guide atmosphere | §§08–09 | A+B / MW-008/010 | AT-08/14; favorite-day inputs remain unverified until supplied |

## User requirements beyond the case

**Verified — user request and approved plan, 2026-11-20.** These are team choices, not extra rules attributed to the organizer.

| ID | Requirement | Owner / task | Verification |
|---|---|---|---|
| USR-01 | A web-deliverable 3D game with exploration, two reveals, and ending | A / MW-001/002 | AT-10/13 |
| USR-02 | AI-generated titles in normal successful generation | B / MW-004 | AT-05: record AI provenance; rule-based fallback explicitly degraded |
| USR-03 | Two developers, parallel tracks, up-front contracts, estimates and dated integration gates | A+B / MW-000 | AT-16: workload and dependency audit |
| USR-04 | Measurable musical influence and in-view playback in demo | A / MW-006 | AT-04: authorized file is P0; link-only is insufficient for this stronger demo requirement |
| USR-05 | Sequential per-file research, preserve originals, dated sources and changelog | Documentation audit | AT-16: seven-file review log and original-content preservation |
| USR-06 | Budget, risks, cut line, three-day video script, jury checklist and all submission materials in final plan | A+B / MW-010; documentation audit | AT-14/16 |

## Evidence gate

**Assumed implementation policy:** each acceptance-test ID is defined in [the development plan](game_development_plan.md); requirement tables above map every requirement to an owner, task and test. Documentation completion is not prototype completion. All prototype evidence starts **Unverified**. Do not check off MIN/SUB/VIS/ETH/USR requirements until their actual evidence is recorded.

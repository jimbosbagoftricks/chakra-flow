# Tasks

## Active

- [ ] **Select the open-source license posture** - choose code, asset, photo, and documentation licenses before publishing.
  - Decision captured: maximum reuse, no attribution required where possible.
  - Planned posture: 0BSD for code; CC0 for original non-code materials; third-party assets remain CC0 / public domain as credited.
  - Add a root `LICENSE`.
  - Reconcile `README.md` and `CREDITS.md` so they do not imply conflicting project-wide rights.
- [ ] **Map the public offering** - define what this app is, who it is for, what it deliberately does not claim, and what the first public release should contain.
  - Include positioning, caveats, install/use instructions, and a release checklist.
- [ ] **Design a tutorial page** - explain the app's chakra associations, common usage patterns, and alternate ways to work with the deck.
  - Cover that color, mantra, mudra, breath, tone, visualization, body cue, timing, and sequencing can be used together or separately.
  - Keep the tutorial plural and practical: avoid implying there is only one correct lineage, ratio, or ritual form.
- [x] ~~Add breathing-practice help links in the app~~ (2026-06-21)
  - Added per-card breath row help buttons for Kapālabhāti and Nāḍī Śodhana.
  - Kept Kapālabhāti card text less prescriptive and moved technique/safety context into the pop-up.
- [ ] **Fix stale mudra-folder docs** - update `assets/mudras/README.md` so it reflects that real photos are now present.
- [ ] **Explore stronger chant audio cues** - current swell/dip was not obvious enough during real practice.
  - Consider phase-change pulses, inhale/exhale timbre differences, stronger gain shaping, or optional spoken/tonal cues.
  - Keep it low-distraction and usable mostly eyes closed.
- [ ] **Rebuild and verify the standalone file after source changes** - run `node .build/build.cjs` and check `chakra-deck.html` still works offline.
- [ ] **Publish and test the PWA beta** - verify GitHub Pages deploy, Android install, wake lock, offline launch, and prompted updates.
  - Local `file://` cannot verify service-worker behavior; use localhost or HTTPS.
  - Expected public URL: `https://jimbosbagoftricks.github.io/chakra-flow/`.
  - Current deploy path: push `main` to `gh-pages` after release commits.

## Waiting On

- Pixel phone testing of the current bīja counter and the first PWA package.

## Someday

- [ ] **Add named practice presets** - support saved pacing profiles such as slow chant, sauna-short, or instructor-guided.
- [ ] **Extend Options beyond chant timing** - consider yantra motion range, audio swell/fade depth, and accessibility defaults after the basic timing controls settle.
- [ ] **Add a release page** - provide screenshots, supported browser notes, and Android install instructions for public users.

## Done

- [x] ~~Initialize Git for the project~~ (2026-06-19)
  - Local-only repository established for the Chakra project.
  - Mudra photos and `chakra-deck.html` are intentionally tracked; the photos were shot for this purpose.
  - No GitHub remote configured yet.
- [x] ~~Implement global mantra chant timing options~~ (2026-06-19)
  - Defaults set to 4-second inhale, 4-second exhale, and 0-second pause.
  - Inhale/exhale/pause controls apply globally to all chakra mantra chants and save on-device.
  - The shared pause setting applies after inhale and after exhale.
  - Card-specific breathing practice text remains unpaced.
- [x] ~~Confirm maximum-reuse license intent~~ (2026-06-19)
  - User wants the project to be free to reuse and remix without attribution requirements where possible.
  - Implementation still needs license files and README/CREDITS reconciliation.
- [x] ~~Add home page hub~~ (2026-06-19)
  - Home provides Chakra Flow, Settings, and Info buttons before entering the deck.
  - Flow view includes a Home control and preserves the current card when returning to the flow.
- [x] ~~Add 432 tone tuning comparison~~ (2026-06-19)
  - Options can switch the drone between Standard 440 and Soft 432.
  - Tone tuning is saved on-device and framed as preference, not canonical chakra doctrine.
- [x] ~~Add first-pass PWA packaging~~ (2026-06-20)
  - Added manifest, launcher icons, service worker caching, update prompt, local runtime files, and Wake Lock support for the hosted app path.
  - Standalone `chakra-deck.html` remains the no-host fallback artifact.

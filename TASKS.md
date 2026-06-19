# Tasks

## Active

- [ ] **Design the Options tab** - define the entry point, layout, persistence, reset behavior, and which controls belong in v1.
  - Candidate controls: chant inhale seconds, chant exhale seconds, yantra scale range, audio swell/fade depth, reduced-motion behavior, and default-on/off preferences.
  - Decide whether options are global only or can vary by chakra card.
- [ ] **Choose the pacing model** - decide whether the current 3-in / 5-out chant cycle remains the default and what bounds are allowed for user adjustment.
  - Keep the seed-chant pacer separate from each card's named breathing practice unless we intentionally add card-specific breath timers.
- [ ] **Select the open-source license posture** - choose code, asset, photo, and documentation licenses before publishing.
  - Add a root `LICENSE`.
  - Reconcile `README.md` and `CREDITS.md` so they do not imply conflicting project-wide rights.
- [ ] **Map the public offering** - define what this app is, who it is for, what it deliberately does not claim, and what the first public release should contain.
  - Include positioning, caveats, install/use instructions, and a release checklist.
- [ ] **Design a tutorial page** - explain the app's chakra associations, common usage patterns, and alternate ways to work with the deck.
  - Cover that color, mantra, mudra, breath, tone, visualization, body cue, timing, and sequencing can be used together or separately.
  - Keep the tutorial plural and practical: avoid implying there is only one correct lineage, ratio, or ritual form.
- [ ] **Add breathing-practice help links in the app** - decide where Kapalabhati and Nadi Shodhana references should appear in the UI.
  - Candidate locations: info modal, per-card breath row help button, or an Options/References tab.
  - Keep safety language conservative for Kapalabhati.
- [ ] **Fix stale mudra-folder docs** - update `assets/mudras/README.md` so it reflects that real photos are now present.
- [ ] **Rebuild and verify the standalone file after source changes** - run `node .build/build.cjs` and check `chakra-deck.html` still works offline.

## Waiting On

- [ ] **User decision: Options tab scope** - confirm whether v1 should only adjust chant pacing or also expose motion/audio/accessibility controls.
- [ ] **User decision: license intent** - confirm whether the goal is maximum reuse, attribution-required reuse, public-domain dedication, or private-source for now.

## Someday

- [ ] **Add named practice presets** - support saved pacing profiles such as slow chant, sauna-short, or instructor-guided.
- [ ] **Consider PWA packaging** - add manifest/service-worker behavior if the standalone HTML approach stops being enough.
- [ ] **Add a release page** - provide screenshots, supported browser notes, and Android install instructions for public users.

## Done

- [x] ~~Initialize Git for the project~~ (2026-06-19)
  - Local-only repository established for the Chakra project.
  - Mudra photos and `chakra-deck.html` are intentionally tracked; the photos were shot for this purpose.
  - No GitHub remote configured yet.

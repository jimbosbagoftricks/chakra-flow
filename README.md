# Ascending Chakra Practice — Card Deck

A mobile-first, swipeable deck of 9 full-screen cards for a ~62-minute ascending
chakra meditation (Ganesha invocation → Root → … → Crown → Descent & close). Personal
practice reference, built for a phone.

## Current direction

This started as a private meditation aid, but the shape is now closer to a small offline-first
practice app: one source version for iteration, one standalone phone file for actual use, and a
clear asset/license trail. The next product surface under discussion is an **Options** tab for
practice-level settings such as chant pacing, yantra motion, and audio swell depth.

The app should stay honest about its boundaries: it can pace and present a personal practice, link
to technique references, and document provenance; it should not present itself as medical advice,
lineage authority, or a substitute for a qualified pranayama teacher.

## On your phone — use the standalone file (recommended)

**`chakra-deck.html`** is a single, fully self-contained file (~3.5 MB): React, the
pre-compiled component, all artwork, the mudra photos, **and the fonts** are embedded, so it
needs **zero network** — ideal for offline use (e.g. a sauna). Transfer it to the phone (PairDrop / Google
Drive / email), open it in **Chrome**, then **⋮ → Add to Home screen** for a full-screen app
icon. Rebuild it with `node .build/build.cjs` after any source change (see below).

## Run from source (no build step)

Open **`index.html`** in a browser. Unlike the standalone, this loads React from a CDN (first
open needs internet) and reads the artwork from the local `assets/` folder beside it.

Keep the folder structure intact:

```
Chakras/
├── chakra-deck.html      ← standalone, offline (for the phone)
├── index.html            ← runs from source (CDN + local assets)
├── chakra-cards.jsx      ← same component as an importable ES module
├── CREDITS.md
├── README.md
├── TASKS.md              ← working backlog for this project
├── dashboard.html         ← optional local task dashboard
├── .build/               ← bundle pipeline (cached libs, inlined fonts)
└── assets/
    ├── chakras/
    │   ├── Chakra1.svg … Chakra7.svg   (CC0 yantras)
    │   └── Ganesha.svg                  (public-domain, recolored)
    └── mudras/           ← drop your own hand-position photos here
```

To serve locally (avoids any `file://` quirks):

```bash
cd Chakras && python3 -m http.server 8080
# then open http://localhost:8080
```

## Use it in a React project

`chakra-cards.jsx` exports the component as default:

```jsx
import ChakraCards from "./chakra-cards.jsx";
// place assets/chakras/* under your app's public/ dir, or pass a custom base:
<ChakraCards artBase="/assets/chakras" />
```

## Interaction
- **Swipe** left/right, **arrow buttons**, **tappable progress dots**, or **← / →** keys.
- Background tint cross-fades between cards.
- **♪ tone** (top-right) plays a soft drone at the current chakra's pitch to chant the bīja
  against; it follows you from card to card and crossfades. Tap again to mute. The chakra→note
  mapping is the common modern convention (Root C → Crown B, ascending C-major) — a chant-pitch
  aid, not canonical. Generated live with Web Audio (no audio files).
- **▷ pace chant** (under the Mantra, on every chakra) is a silent **seed-chant metronome**: one
  uniform cadence (inhale 3 / chant on the 5-count exhale), the same on every chakra. The yantra
  is the metronome — it expands to prepare and contracts on the chant, with a quiet "CHANT · LAM"
  word on the out-breath. When the ♪ tone is on, the drone **swells and dips with it** (the
  eyes-closed audio cue). No beeps. Honors `prefers-reduced-motion` (the phase word still changes;
  no scaling). The seed chant is paced *independently* of each card's breathing practice
  (Kapālabhāti, Nāḍī Śodhana, etc.), which is named but not paced.
- **⛶ View hand position** (under the Mudra) opens a photo of the hand position in a lightbox.
- The **ⓘ** button (top-right) opens the practice notes / honest caveats.
- Respects `prefers-reduced-motion` (disables the float, fade, and tint transition).

## Practice references

The card text names a few breathing practices but intentionally does not try to teach them in full.
Use external technique references when refining card copy or adding in-app help:

- **Kapālabhāti / Skull-Shining Breath:** [Yoga Journal how-to](https://www.yogajournal.com/practice/energetics/pranayama/skull-shining-breath/) and [Art of Living cautions](https://www.artofliving.org/yoga/breathing-techniques/skull-shining-breath-kapal-bhati). This is a forceful abdominal practice; the app should keep safety language conservative.
- **Nāḍī Śodhana / Alternate-Nostril Breathing:** [Yoga Journal step-by-step](https://www.yogajournal.com/practice/energetics/pranayama/channel-cleaning-breath/). Beginning instructions should avoid retention-heavy ratios unless a qualified source is linked and the user explicitly opts in.

## Rebuilding the standalone

`.build/` holds a tiny pipeline (cached libs + inlined fonts) so rebuilds need no network:

```bash
node .build/build.cjs     # regenerates chakra-deck.html from index.html + assets
# node .build/fonts.cjs   # only to refresh the inlined fonts (needs network)
```

## Design notes
- Each card's **background is its chakra's color** — darkened/desaturated to a deep,
  ceremonial tone rather than a bright wellness look.
- **Contrast** was computed to meet/exceed WCAG AA: cream body text on the colored fields
  ranges from **6.3:1 to 12.2:1**, and the darker text panel pushes it to **~15:1**. The
  yellow Solar Plexus is darkened to a deep amber so light text still passes.
- Serif typography (Cormorant Garamond / EB Garamond, with Georgia fallback).

## Open-source posture

This project is not ready to publish as open source until a root `LICENSE` file is selected. A
public repository without a license is visible but not meaningfully open-source for reuse,
modification, or redistribution. Use [GitHub's licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
and [Choose a License](https://choosealicense.com/) before publishing.

Proposed offering map:

- **Code:** likely a permissive software license if the goal is easy reuse and remixing.
- **Bundled public-domain yantras/Ganeśa:** keep the provenance log in `CREDITS.md`.
- **Author hand photos:** decide whether they remain CC0 in the public release or are replaced,
  excluded, or separately licensed.
- **Practice content:** treat as personal practice notes with caveats, sources, and no medical
  claims.
- **Generated artifact:** decide whether `chakra-deck.html` is committed as a release artifact or
  only rebuilt locally from source.

## Art provenance
Every chakra card uses **real public-domain art** for its yantra (7 CC0 chakra yantras from
Wikimedia Commons + a public-domain Ganesha from the Open Clip Art Library, via freesvg.org) and
**the author's own photograph** for its mudra hand-position. The closing "descent" symbol is an
original schematic. Full license log in [CREDITS.md](CREDITS.md).

### Mudra photos

The seven mudra photos in [`assets/mudras/`](assets/mudras/README.md) are the author's own
hands (CC0). They're used because no accurate, freely-licensed photo of these seven specific
finger-mudras exists online — Wikimedia Commons, Openverse/Flickr, and Pexels/Pixabay all carry
only generic Gyan/prayer hands and deity statues, never Apāna/Rudra/Hakini/etc., and mislabeling
the wrong gesture wasn't acceptable. **Apāna uses palms-up** (the documented standard; the
brief's "palms down" was unsourced). All originals are **EXIF/GPS-stripped**
(`node .build/strip-exif.cjs`); the bundle inlines downscaled, re-stripped copies — no location
data ships. To swap or add a photo, edit the `MUDRA_PHOTOS` map in both `index.html` and
`chakra-cards.jsx`.

> Note: Wikimedia's `File:Ganesha.svg` is mislabeled — it's actually a chemistry diagram, not
> the deity — so a verified CC0 Ganesha from Open Clip Art was used instead. See CREDITS.md.

## Honest caveats (also in-app under ⓘ)
- The practice deliberately blends three traditions — Tantric/yogic (bīja mantras, chakras),
  Shaivite (*Om Namah Shivaya*), and Tibetan Buddhist (*Om Mani Padme Hum*). Intentional.
- Mudra-to-chakra mappings are **not** canonically fixed; they vary by lineage. The bīja
  mantras have firmer textual grounding than the mudra assignments.
- This is the **full ~62-min version, for use *outside* the sauna**. A compressed ~40-min
  sauna variant exists separately.

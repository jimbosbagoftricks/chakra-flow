# Image Credits & Licenses

All bundled artwork was downloaded from **Wikimedia Commons** (the seven yantras and two mantra
symbols) and the **Open Clip Art Library** via freesvg.org (the Ganeśa), and verified
individually. Every image below is **public domain / CC0** — no attribution is legally required —
but each is logged here per good practice. No CC-BY / CC-BY-SA assets were used, so nothing here
carries a mandatory-attribution obligation.

## Chakra yantras (real public-domain art)

| File | Chakra | Commons page | License (verified) |
|------|--------|--------------|--------------------|
| `assets/chakras/Chakra1.svg` | Root · Mūlādhāra | https://commons.wikimedia.org/wiki/File:Chakra1.svg | CC0 1.0 (Public Domain Dedication) |
| `assets/chakras/Chakra2.svg` | Sacral · Svādhiṣṭhāna | https://commons.wikimedia.org/wiki/File:Chakra2.svg | CC0 1.0 (Public Domain Dedication) |
| `assets/chakras/Chakra3.svg` | Solar Plexus · Maṇipūra | https://commons.wikimedia.org/wiki/File:Chakra3.svg | CC0 1.0 (Public Domain Dedication) |
| `assets/chakras/Chakra4.svg` | Heart · Anāhata | https://commons.wikimedia.org/wiki/File:Chakra4.svg | CC0 1.0 (Public Domain Dedication) |
| `assets/chakras/Chakra5.svg` | Throat · Viśuddha | https://commons.wikimedia.org/wiki/File:Chakra5.svg | CC0 1.0 (Public Domain Dedication) |
| `assets/chakras/Chakra6.svg` | Third Eye · Ājñā | https://commons.wikimedia.org/wiki/File:Chakra6.svg | CC0 1.0 (Public Domain Dedication) |
| `assets/chakras/Chakra7.svg` | Crown · Sahasrāra | https://commons.wikimedia.org/wiki/File:Chakra7.svg | CC0 1.0 (Public Domain Dedication) |

Each SVG also carries an embedded license comment ("License: public domain"); the Chakra1
file page reports the CC0 dedication verbatim and credits author *Atarax42*. The files are
unmodified from Commons.

The PWA launcher icon in `assets/icons/` uses the Root / Mūlādhāra yantra
(`assets/chakras/Chakra1.svg`) as its central source image, framed on a dark app-icon
background and exported at the required Android/iOS icon sizes.

## Opening glyph (real public-domain art)

| File | Use | Source page | Download | License (verified) |
|------|-----|-------------|----------|--------------------|
| `assets/chakras/Ganesha.svg` | Ganesha Invocation card | https://freesvg.org/ganesh-vector-art | https://freesvg.org/download/3354 | Public domain (CC0) — Open Clip Art, author *liftarn* (Lars Lundqvist) |

A seated, multi-armed Ganeśa line drawing (original filename `liftarn_Ganesh.svg`). The
embedded metadata carries `creativecommons.org/licenses/publicdomain/` and the title "Ganesh";
freesvg.org publishes it as CC0 / public domain.

**Why not Wikimedia Commons `File:Ganesha.svg`?** That file — despite the name — is **not** the
deity; it is a chemical-structure diagram (a molecule with `O`/`NH₂` labels). It was downloaded,
rendered, recognized as wrong, and discarded. The Commons Ganesha alternatives
(`Noun_Project_Ganesha_icon_744441_cc.svg`, `Ganesha_Swastika.svg`,
`Ganesha_elephant_mouse_om_sanskrit.svg`) are all **CC-BY-SA** (attribution required), so a
clean CC0 source was used instead.

**Modifications:** (1) added `viewBox="0 0 377 377"` (computed from the path bounding box) plus
`width/height="100%"` because the original had a fixed `300pt` canvas with no viewBox, clipping
the art; (2) injected `<style>path{fill:#F0E2B8}</style>` to recolor the default-black silhouette
to warm cream-gold so it reads against the dark gold background. Path geometry is untouched. CC0
imposes no conditions on modification or reuse.

## Additional mantra symbols (real public-domain art)

| File | Use | Commons page | License (verified) |
|------|-----|--------------|--------------------|
| `assets/mantras/Shivalinga_symbol.svg` | Śiva Mantra card | https://commons.wikimedia.org/wiki/File:Shivalinga_symbol.svg | Public domain / CC0 1.0 |
| `assets/mantras/Om-mani-padme-hum-mantra.svg` | Mani Mantra card | https://commons.wikimedia.org/wiki/File:Om-mani-padme-hum-mantra.svg | Public domain / CC0 1.0 |

Both SVGs are unmodified from Commons. The app applies a CSS filter at render time so the dark
source art reads against the dark card background; the source files themselves are unchanged.

## Mudras — hand-position photos (the author's own work)

Each mudra card has a **"View hand position"** button that opens a photo of the hand position.
These are **the author's own photographs** of their own hands — so there is no third-party
licensing to track; they are released here as CC0 / public domain along with the rest of the
project. (This route was chosen because no accurate, freely-licensed photo of these seven
specific finger-mudras exists anywhere — Wikimedia Commons, Openverse/Flickr, and Pexels/Pixabay
were all checked and carry only generic Gyan/prayer hands, dance *hastas*, or deity statues.
Substituting one of those would mislabel a different gesture, so own-photos it is.)

| Card | Mudra | Photo file | Source / License |
|------|-------|-----------|------------------|
| Root | Apāna | `apana_palms_up.jpg` | author's own · CC0 |
| Sacral | Shakti | `shakti.jpg` | author's own · CC0 |
| Solar Plexus | Rudra | `rudra.jpg` | author's own · CC0 |
| Heart | Padma | `padma.jpg` | author's own · CC0 |
| Throat | Granthita | `granthita.jpg` | author's own · CC0 |
| Third Eye | Hakini | `hakini.jpg` | author's own · CC0 |
| Crown | Sahasrāra | `sahasrara_side.jpg` | author's own · CC0 |

**Apāna orientation:** the photo uses **palms up**, the documented standard
([Asivana](https://asivanayoga.com/blogs/hand-mudras/apana-mudra),
[Fitsri](https://www.fitsri.com/yoga-mudras/apana-mudra),
[Siddhi Yoga](https://www.siddhiyoga.com/yoga/practice/mudra/apana-mudra)). The card text was
corrected from the brief's unsourced "palms down." A palms-down variant (`apana_palms_down.jpg`)
is kept in the folder for a one-line swap, since palms-down is a defensible *grounding* emphasis.

**Privacy:** all originals had their **EXIF/GPS metadata stripped** (`node .build/strip-exif.cjs`);
the offline bundle inlines downscaled (≤1100 px), re-stripped copies. No location data ships.

The closing "descent" symbol is an original schematic (seven chakra colours dimming to red),
released here as CC0 / public domain.

## Which cards use real art vs. fallback

| Card | Main symbol | Mudra photo |
|------|-------------|-------------|
| Opening — Ganesha | ✅ real PD art | — |
| Root | ✅ real PD yantra (CC0) | ✅ author's own photo |
| Sacral | ✅ real PD yantra (CC0) | ✅ author's own photo |
| Solar Plexus | ✅ real PD yantra (CC0) | ✅ author's own photo |
| Heart | ✅ real PD yantra (CC0) | ✅ author's own photo |
| Throat | ✅ real PD yantra (CC0) | ✅ author's own photo |
| Śiva Mantra | ✅ real PD symbol (CC0) | — |
| Third Eye | ✅ real PD yantra (CC0) | ✅ author's own photo |
| Crown | ✅ real PD yantra (CC0) | ✅ author's own photo |
| Mani Mantra | ✅ real PD symbol (CC0) | — |
| Descent & Close | ▦ original schematic (no single traditional symbol) | — |

**Summary:** every chakra card uses real public-domain art for its yantra (7 CC0 yantras +
a public-domain Ganeśa), the additional mantra cards use public-domain / CC0 symbols, and the
author's own photographs handle mudra reference. The closing symbol is an original schematic. No
third-party-licensed assets, and no GPS/EXIF metadata, ship anywhere.

# Mudra hand-position photos

Drop photos of each mudra hand position here, then wire them up.

## Why this folder starts empty

No accurate, freely-licensed photograph of these seven *specific* finger-mudras exists on the
open web. This was checked across Wikimedia Commons (direct + API), Openverse (which aggregates
Flickr Creative Commons), and Pexels/Pixabay. They only carry generic **Gyan mudra** /
prayer-hand photos and Buddha/temple statues — none of Apāna, Shakti, Rudra, Padma, Granthita,
Hakini, or Sahasrāra. Substituting a Gyan-mudra or statue image would mislabel a different
gesture, so the slots are left empty rather than filled with the wrong hand.

## How to add photos (recommended: your own hands)

For a personal practice tool, the cleanest, most accurate source is a quick phone photo of your
own hands in each position — consistent, correct, and no licensing to worry about.

1. Save each image in this folder using the mudra id as the filename:

   | Card         | id          | filename             |
   |--------------|-------------|----------------------|
   | Root         | `apana`     | `apana.jpg`          |
   | Sacral       | `shakti`    | `shakti.jpg`         |
   | Solar Plexus | `rudra`     | `rudra.jpg`          |
   | Heart        | `padma`     | `padma.jpg`          |
   | Throat       | `granthita` | `granthita.jpg`      |
   | Third Eye    | `hakini`    | `hakini.jpg`         |
   | Crown        | `sahasrara` | `sahasrara.jpg`      |

   Square-ish images look best (the lightbox frame is 1:1).

2. Register each file in **both** `index.html` and `chakra-cards.jsx`, in the
   `MUDRA_PHOTOS` map:

   ```js
   const MUDRA_PHOTOS = {
     apana: { file: "apana.jpg", credit: null },   // ← set file
     ...
   };
   ```

3. If you use someone else's photo under **CC-BY / CC-BY-SA**, you must attribute it: set
   `credit: "Photo: <author>, <license>, <source URL>"` (it renders under the photo) and also
   log it in `../../CREDITS.md`. Your own photos need no credit.

Until a file is set, the "View hand position" button opens a labeled placeholder.

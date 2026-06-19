/* Fetch the Google Fonts used by the deck and inline the woff2 files as base64
   data URIs, so the bundle needs no network for fonts. Caches to fonts-inlined.css
   (build.cjs reads that cache, so later rebuilds don't need the network). */
const fs = require("fs");
const path = require("path");

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500" +
  "&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap";
// Desktop Chrome UA so Google returns woff2 (not ttf).
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const KEEP = new Set(["latin", "latin-ext"]); // subsets we need (drops cyrillic/greek/vietnamese)

(async () => {
  const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

  // Each @font-face is preceded by a /* subset */ comment.
  const parts = css.split(/\/\*\s*([\w-]+)\s*\*\//).slice(1); // [label, block, label, block, ...]
  let out = "";
  let kept = 0, fetched = 0;
  for (let i = 0; i < parts.length; i += 2) {
    const label = parts[i].trim();
    let block = parts[i + 1] || "";
    if (!KEEP.has(label)) continue;
    const m = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!m) continue;
    const buf = Buffer.from(await (await fetch(m[1], { headers: { "User-Agent": UA } })).arrayBuffer());
    fetched++;
    const dataUri = "data:font/woff2;base64," + buf.toString("base64");
    block = block.replace(m[1], dataUri);
    out += "/* " + label + " */" + block + "\n";
    kept++;
  }

  if (!kept) { console.error("No font-face blocks captured — aborting."); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, "fonts-inlined.css"), out, "utf8");
  console.log(`Inlined ${fetched} woff2 files across ${kept} @font-face blocks`);
  console.log(`fonts-inlined.css: ${(Buffer.byteLength(out) / 1024).toFixed(0)} KB`);
})();

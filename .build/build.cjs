/* Build a single self-contained, offline chakra-deck.html from index.html. */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const Babel = require("./babel.js");

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

// 1. Extract the JSX source from the <script type="text/plain" id="app-src"> block.
const srcTag = '<script type="text/plain" id="app-src">';
const srcStart = html.indexOf(srcTag);
const srcOpenEnd = html.indexOf(">", srcStart) + 1;
const srcEnd = html.indexOf("</script>", srcOpenEnd);
let jsx = html.slice(srcOpenEnd, srcEnd);

// 2. Rewrite `${ART}/Foo.svg` and `${MANTRA_ART}/Foo.svg` template literals
//    to ASSETS["Foo.svg"] lookups.
jsx = jsx.replace(/`\$\{ART\}\/([\w.-]+)`/g, (_m, f) => `ASSETS[${JSON.stringify(f)}]`);
jsx = jsx.replace(/`\$\{MANTRA_ART\}\/([\w.-]+)`/g, (_m, f) => `ASSETS[${JSON.stringify(f)}]`);

// 3. Pre-compile JSX → plain JS (classic runtime so it uses the global React).
let code = Babel.transform(jsx, {
  presets: [["react", { runtime: "classic" }]],
  compact: false,
}).code;

// 3b. Inline mudra photos into MUDRA_DATA — downscaled (sips) and EXIF/GPS-stripped.
const { execFileSync } = require("child_process");
function stripExif(buf) { // remove APP1 (0xFFE1 = EXIF/GPS) segments from a JPEG
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { out.push(buf.subarray(i)); break; }
    const marker = buf[i + 1];
    if (marker === 0xda || marker === 0xd9) { out.push(buf.subarray(i)); break; }
    const len = buf.readUInt16BE(i + 2);
    if (marker !== 0xe1) out.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return Buffer.concat(out);
}
const mudraDir = path.join(ROOT, "assets/mudras");
const mudraData = {};
for (const f of fs.readdirSync(mudraDir).sort()) {
  if (!/\.jpe?g$/i.test(f)) continue;
  const srcPath = path.join(mudraDir, f);
  const tmp = path.join(__dirname, "_m_" + f);
  let buf;
  try {
    execFileSync("sips", ["-Z", "1100", "-s", "format", "jpeg",
      "-s", "formatOptions", "70", srcPath, "--out", tmp], { stdio: "ignore" });
    buf = fs.readFileSync(tmp); fs.unlinkSync(tmp);
  } catch (e) { buf = fs.readFileSync(srcPath); }
  mudraData[f] = "data:image/jpeg;base64," + stripExif(buf).toString("base64");
}
code = code.replace(/MUDRA_DATA\s*=\s*\{\}/, "MUDRA_DATA = " + JSON.stringify(mudraData));
const mudraKB = (Buffer.byteLength(JSON.stringify(mudraData)) / 1024).toFixed(0);

// 4. Inline the SVGs as base64 data URIs.
const assets = {};
for (const f of ["Ganesha.svg", "Chakra1.svg", "Chakra2.svg", "Chakra3.svg",
                 "Chakra4.svg", "Chakra5.svg", "Chakra6.svg", "Chakra7.svg"]) {
  const buf = fs.readFileSync(path.join(ROOT, "assets/chakras", f));
  assets[f] = "data:image/svg+xml;base64," + buf.toString("base64");
}
for (const f of ["Trident_Yantra_of_Parama_Siva.svg", "Om-mani-padme-hum-mantra.svg"]) {
  const buf = fs.readFileSync(path.join(ROOT, "assets/mantras", f));
  assets[f] = "data:image/svg+xml;base64," + buf.toString("base64");
}
const assetsJs = "var ASSETS = " + JSON.stringify(assets) + ";";

// 5. Read the inlined libraries.
const react = fs.readFileSync(path.join(__dirname, "react.js"), "utf8");
const reactDom = fs.readFileSync(path.join(__dirname, "react-dom.js"), "utf8");

// 6. Build the replacement <script> block (libs + assets + compiled component).
const inlined =
  "<script>" + react + "</script>\n" +
  "<script>" + reactDom + "</script>\n" +
  "<script>\n" + assetsJs + "\n" + code + "\n</script>";

// 7. Splice out everything from the first runtime <script> through the boot <script>,
//    replacing it with the inlined block. Keeps <head>, fonts, styles, #root.
const runtimeStarts = [
  html.indexOf('<script src="./vendor/react.js"></script>'),
  html.indexOf('<script crossorigin src="https://unpkg.com/react@18'),
].filter((i) => i !== -1);
if (runtimeStarts.length === 0) throw new Error("Could not find runtime script block");
const runtimeStart = Math.min(...runtimeStarts);
const bootMarker = html.indexOf("Deterministic boot");
const bootScriptStart = html.lastIndexOf("<script>", bootMarker);
const bootScriptEnd = html.indexOf("</script>", bootScriptStart) + "</script>".length;
let out = html.slice(0, runtimeStart) + inlined + html.slice(bootScriptEnd);

// 8. Inline fonts: replace the source stylesheet link with a <style> of base64
//    woff2 (from the fonts.cjs cache). Falls back to the source link if the
//    cache is missing.
const fontsCssPath = path.join(__dirname, "fonts-inlined.css");
let fontsInlined = false;
if (fs.existsSync(fontsCssPath)) {
  const fontsCss = fs.readFileSync(fontsCssPath, "utf8");
  const localFontLink = '<link rel="stylesheet" href="./vendor/fonts-inlined.css" />';
  const localStart = out.indexOf(localFontLink);
  const googleStart = out.indexOf('<link rel="preconnect" href="https://fonts.googleapis.com"');
  if (localStart !== -1) {
    out = out.slice(0, localStart) + "<style>\n" + fontsCss + "</style>" + out.slice(localStart + localFontLink.length);
    fontsInlined = true;
  } else if (googleStart !== -1) {
    const linkMark = 'rel="stylesheet" />';
    const fEnd = out.indexOf(linkMark, googleStart);
    if (fEnd !== -1) {
      out = out.slice(0, googleStart) + "<style>\n" + fontsCss + "</style>" + out.slice(fEnd + linkMark.length);
      fontsInlined = true;
    }
  }
}

// The standalone phone file should remain a true single-file fallback. PWA
// manifest/icon/service-worker registration stays in index.html, the hosted app.
out = out.replace(/\n<link[^>]*\bdata-pwa\b[^>]*>/g, "");
out = out.replace(/\n<script\b[^>]*\bdata-pwa-registration\b[^>]*>[\s\S]*?<\/script>/, "");

fs.writeFileSync(path.join(ROOT, "chakra-deck.html"), out, "utf8");

const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log("Wrote chakra-deck.html (" + kb + " KB)");
console.log("  contains unpkg refs: " + (out.includes("unpkg.com") ? "YES (bad)" : "no"));
console.log("  contains text/babel: " + (out.includes("text/babel") ? "YES (bad)" : "no"));
console.log("  data: URIs embedded: " + (out.match(/data:image\/svg\+xml/g) || []).length);
console.log("  React/ReactDOM inlined: " + out.includes("createRoot"));
console.log("  fonts inlined: " + (fontsInlined ? "yes" : "NO (using CDN link)"));
console.log("  Google Fonts link refs: " + (out.match(/fonts\.googleapis\.com/g) || []).length);
console.log("  chakra tones present: " + out.includes("_droneSet"));
console.log("  mudra photos inlined: " + Object.keys(mudraData).length + " (" + mudraKB + " KB)");
console.log("  GPS strings in bundle: " + (out.includes("GPS-Data") ? "FOUND (bad)" : "none"));

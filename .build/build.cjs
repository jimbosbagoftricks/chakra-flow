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

// 2. Rewrite `${ART}/Foo.svg` template literals to ASSETS["Foo.svg"] lookups.
jsx = jsx.replace(/`\$\{ART\}\/([\w.]+)`/g, (_m, f) => `ASSETS[${JSON.stringify(f)}]`);

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

// 4. Inline the 8 SVGs as base64 data URIs.
const files = ["Ganesha.svg", "Chakra1.svg", "Chakra2.svg", "Chakra3.svg",
               "Chakra4.svg", "Chakra5.svg", "Chakra6.svg", "Chakra7.svg"];
const assets = {};
for (const f of files) {
  const buf = fs.readFileSync(path.join(ROOT, "assets/chakras", f));
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

// 7. Splice out everything from the first CDN <script> through the boot <script>,
//    replacing it with the inlined block. Keeps <head>, fonts, styles, #root.
const cdnStart = html.indexOf('<script crossorigin src="https://unpkg.com/react@18');
const bootMarker = html.indexOf("Deterministic boot");
const bootScriptStart = html.lastIndexOf("<script>", bootMarker);
const bootScriptEnd = html.indexOf("</script>", bootScriptStart) + "</script>".length;
let out = html.slice(0, cdnStart) + inlined + html.slice(bootScriptEnd);

// 8. Inline fonts: replace the Google Fonts preconnects + stylesheet <link> with a
//    <style> of base64 woff2 (from the fonts.cjs cache). Falls back to the CDN link
//    if the cache is missing.
const fontsCssPath = path.join(__dirname, "fonts-inlined.css");
let fontsInlined = false;
if (fs.existsSync(fontsCssPath)) {
  const fontsCss = fs.readFileSync(fontsCssPath, "utf8");
  const fStart = out.indexOf('<link rel="preconnect" href="https://fonts.googleapis.com"');
  const linkMark = 'rel="stylesheet" />';
  const fEnd = out.indexOf(linkMark, fStart);
  if (fStart !== -1 && fEnd !== -1) {
    out = out.slice(0, fStart) + "<style>\n" + fontsCss + "</style>" + out.slice(fEnd + linkMark.length);
    fontsInlined = true;
  }
}

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

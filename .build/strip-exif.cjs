/* Strip EXIF/GPS (APP1 segments) from the original mudra JPEGs, in place.
   Removes metadata only — pixels are untouched, full resolution preserved.
   (All files have EXIF orientation = upper-left/1, so no rotation is lost.) */
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "assets/mudras");

function stripExif(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { out.push(buf.subarray(i)); break; }
    const m = buf[i + 1];
    if (m === 0xda || m === 0xd9) { out.push(buf.subarray(i)); break; }
    const len = buf.readUInt16BE(i + 2);
    if (m !== 0xe1) out.push(buf.subarray(i, i + 2 + len)); // drop APP1 (EXIF/GPS/XMP)
    i += 2 + len;
  }
  return Buffer.concat(out);
}

for (const f of fs.readdirSync(dir).sort()) {
  if (!/\.jpe?g$/i.test(f)) continue;
  const p = path.join(dir, f);
  const before = fs.statSync(p).size;
  const stripped = stripExif(fs.readFileSync(p));
  fs.writeFileSync(p, stripped);
  console.log(`${f}: ${before} -> ${stripped.length} bytes`);
}

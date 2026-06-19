import React, { useState, useRef, useEffect, useCallback } from "react";

/*
  Ascending Chakra Practice — swipeable 9-card deck (62-minute practice).

  Importable ES-module version of the component. The runnable, zero-build
  version lives in index.html (open it directly in a phone browser).

  Art:  seven public-domain (CC0) chakra yantras + a public-domain Ganeśa,
        downloaded from Wikimedia Commons into ./assets/chakras/. See CREDITS.md.
        Mudra glyphs and the closing symbol are schematic line drawings.

  Assets: this component references the SVGs by URL via <img>, so with a bundler
  (Vite/CRA) put the `assets/` folder under `public/` (served at /assets) or
  pass a custom `artBase`. Default assumes they sit at ./assets/chakras.
*/

const DEFAULT_ART = "./assets/chakras";
const CREAM = "#F3ECDD";
const MUTED = "rgba(243,236,221,0.62)";

/* ── Chakra tones ──
   A soft sustained drone per card, giving the pitch to chant the bīja against.
   Chakra→note mapping is the common modern convention (root→crown = ascending
   C-major scale), NOT canonical — a chant-pitch aid only. Web Audio, no files. */
const TONES = {
  open: { hz: 136.10, note: "Om" }, root: { hz: 130.81, note: "C" },
  sacral: { hz: 146.83, note: "D" }, solar: { hz: 164.81, note: "E" },
  heart: { hz: 174.61, note: "F" }, throat: { hz: 196.00, note: "G" },
  thirdeye: { hz: 220.00, note: "A" }, crown: { hz: 246.94, note: "B" },
  close: { hz: 130.81, note: "C" },
};

let _drone = null;
function _droneEnsure() {
  if (_drone) return _drone;
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1200; lp.Q.value = 0.5;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const breath = ctx.createGain();   // pacer-driven swell (1 = steady, <1 = exhale dip)
  breath.gain.value = 1;
  breath.connect(master); master.connect(lp); lp.connect(ctx.destination);
  _drone = { ctx, master, breath, voices: [], lfo: null };
  return _drone;
}
function _droneClear(a, release) {
  const now = a.ctx.currentTime;
  a.voices.forEach((o) => { try { o.stop(now + release + 0.05); } catch (e) {} });
  if (a.lfo) { try { a.lfo.stop(now + release + 0.05); } catch (e) {} a.lfo = null; }
  a.voices = [];
}
function _droneSet(hz) {
  if (hz == null) {
    if (_drone) {
      const a = _drone, now = a.ctx.currentTime;
      a.master.gain.cancelScheduledValues(now);
      a.master.gain.setValueAtTime(Math.max(a.master.gain.value, 0.0001), now);
      a.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      _droneClear(a, 0.5);
    }
    return;
  }
  const a = _droneEnsure();
  if (a.ctx.state === "suspended") a.ctx.resume();
  const now = a.ctx.currentTime;
  a.master.gain.cancelScheduledValues(now);
  a.master.gain.setValueAtTime(Math.max(a.master.gain.value, 0.0001), now);
  a.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  _droneClear(a, 0.18);
  const t0 = now + 0.22;
  const voice = (f, g, det) => {
    const o = a.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t0);
    if (det) o.detune.setValueAtTime(det, t0);
    const og = a.ctx.createGain(); og.gain.value = g;
    o.connect(og); og.connect(a.breath);
    o.start(t0);
    return o;
  };
  a.voices = [voice(hz, 0.5, -3), voice(hz, 0.5, 3), voice(hz * 2, 0.13, 0),
              voice(hz * 1.5, 0.09, 0), voice(hz / 2, 0.22, 0)];
  const lfo = a.ctx.createOscillator();
  lfo.type = "sine"; lfo.frequency.setValueAtTime(0.12, t0);
  const lg = a.ctx.createGain(); lg.gain.value = 0.02;
  lfo.connect(lg); lg.connect(a.master.gain); lfo.start(t0); a.lfo = lfo;
  a.master.gain.setValueAtTime(0.0001, t0);
  a.master.gain.exponentialRampToValueAtTime(0.14, t0 + 0.9);
}

/* ── Seed-chant pacer ──
   One uniform, silent cadence for chanting the bīja — the same on every chakra,
   independent of each card's breathing practice (which is named, not paced). The
   yantra is the metronome: expand to prepare, contract on the chant; when the
   tone is on, the drone swells with it and dips as you chant. Honors
   reduced-motion (no scaling; the phase word still changes). Tune CHANT here. */
const CHANT = [["Inhale", 3], ["Exhale", 5]];
const CHANT_CARDS = { root: 1, sacral: 1, solar: 1, heart: 1, throat: 1, thirdeye: 1, crown: 1 };
const _ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));

/* ── Mudra reference photos ──
   Each mudra opens a photo of the hand position in a lightbox. No accurate,
   freely-licensed photo of these 7 specific finger-mudras exists on the open web
   (Wikimedia Commons, Openverse/Flickr and Pexels all checked — only generic
   Gyan/prayer hands or deity statues). So the slots start empty and show a
   placeholder. Add a photo: drop an image in ./assets/mudras/ and set its
   filename as `file` here. See assets/mudras/README.md. CC-BY/BY-SA photos must
   be credited (`credit`) and logged in CREDITS.md; your own photos need none. */
const MUDRA_DIR = "./assets/mudras";
const TWO_HANDED = { shakti: true, padma: true, granthita: true, hakini: true, sahasrara: true };
const MUDRA_PHOTOS = {
  apana:     { file: "apana_palms_up.jpg", credit: null },
  shakti:    { file: "shakti.jpg",         credit: null },
  rudra:     { file: "rudra.jpg",          credit: null },
  padma:     { file: "padma.jpg",          credit: null },
  granthita: { file: "granthita.jpg",      credit: null },
  hakini:    { file: "hakini.jpg",         credit: null },
  sahasrara: { file: "sahasrara_side.jpg", credit: null },
};
/* Filled at bundle time with inlined (downscaled, EXIF-stripped) data URIs;
   empty in source (the lightbox then loads from MUDRA_DIR). Keyed by filename. */
const MUDRA_DATA = {};

function MudraLightbox({ card, onClose }) {
  const info = MUDRA_PHOTOS[card.mudra] || {};
  const src = info.file ? (MUDRA_DATA[info.file] || `${MUDRA_DIR}/${info.file}`) : null;
  const accent = card.accent;
  return (
    <div role="dialog" aria-modal="true" aria-label={card.mudraName + " hand position"} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(5,3,8,0.93)", backdropFilter: "blur(4px)",
               display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 22px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: accent, marginBottom: 12 }}>
          {card.mudraName}{TWO_HANDED[card.mudra] ? " · both hands" : ""}
        </div>
        <div style={{ position: "relative", width: "100%", maxWidth: 340, margin: "0 auto", aspectRatio: "3 / 4",
                      borderRadius: 18, overflow: "hidden", border: `1px solid ${accent}44`, background: card.panel }}>
          {src
            ? <img src={src} alt={card.mudraName + " hand position"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: 12, padding: 24, border: `1.5px dashed ${accent}40`, borderRadius: 18 }}>
                <div style={{ fontSize: 46, opacity: 0.5, color: accent, lineHeight: 1 }}>✋</div>
                <div style={{ fontSize: 13.5, color: CREAM, opacity: 0.85, lineHeight: 1.5 }}>Hand-position photo not added yet.</div>
                <code style={{ fontSize: 11.5, color: accent, opacity: 0.8, fontFamily: "ui-monospace,Menlo,monospace" }}>
                  assets/mudras/{card.mudra}.jpg
                </code>
              </div>
            )}
        </div>
        <p style={{ fontSize: 15.5, lineHeight: 1.5, color: CREAM, margin: "16px 4px 4px" }}>{card.mudraHow}</p>
        {info.credit ? <p style={{ fontSize: 11.5, color: MUTED, margin: "6px 4px 0" }}>{info.credit}</p> : null}
        <button onClick={onClose} style={{ marginTop: 18, padding: "10px 26px", borderRadius: 30,
          border: `1px solid ${accent}66`, background: "transparent", color: CREAM, fontFamily: "'EB Garamond',serif",
          fontSize: 15, letterSpacing: "0.1em", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

const DESCENT_COLORS = ["#9B6FC9", "#5B5BC0", "#2E8FBF", "#3C9D4E", "#E0B019", "#D2691E", "#B5341F"];
function DescentGlyph() {
  return (
    <svg viewBox="0 0 120 150" width="150" height="188" aria-hidden="true">
      {DESCENT_COLORS.map((c, i) => (
        <g key={i}>
          <circle cx="60" cy={20 + i * 18} r={6.5} fill={c} opacity={0.45 + i * 0.08} />
          {i < 6 && <line x1="60" y1={26 + i * 18} x2="60" y2={32 + i * 18} stroke={c} strokeWidth="1.5" opacity="0.4" />}
        </g>
      ))}
    </svg>
  );
}

/* ── Practice data ── */
function buildCards(art) {
  return [
    { id: "open", art: `${art}/Ganesha.svg`, artAlt: "Ganeśa line drawing", real: true,
      eyebrow: "Opening · Obstacle Clearing", name: "Ganesha Invocation", sanskrit: "Gaṇapati",
      breath: "Natural", mantra: "Om Gam Ganapataye Namaha", mantraCount: "×3",
      visual: "Clear the path before ascending.", body: "Settle. Set the intention to remove obstruction.",
      field: "#635117", panel: "#1e1a0e", accent: "#e6cd7f", ring: "#d1b047" },
    { id: "root", art: `${art}/Chakra1.svg`, artAlt: "Mūlādhāra yantra (4 petals)", real: true,
      eyebrow: "0–7 min · Earth", name: "Root", sanskrit: "Mūlādhāra", petals: 4,
      breath: "4-in / 6-out", mantra: "LAM", mantraCount: "×21",
      visual: "Red, base of spine, downward roots.", body: "Full weight, floor contact.",
      mudra: "apana", mudraName: "Apāna Mudrā",
      mudraHow: "Thumb, middle & ring fingertips together; index & pinky extended. Hands on knees, palms up.",
      field: "#652115", panel: "#1e100d", accent: "#e98c7c", ring: "#d15b47" },
    { id: "sacral", art: `${art}/Chakra2.svg`, artAlt: "Svādhiṣṭhāna yantra (6 petals)", real: true,
      eyebrow: "7–14 min · Water", name: "Sacral", sanskrit: "Svādhiṣṭhāna", petals: 6,
      breath: "Kapālabhāti 2×30, 30s rest", mantra: "VAM", mantraCount: "×21",
      visual: "Orange, lower abdomen, fluid and moving.", body: "Soften hips and lower belly.",
      mudra: "shakti", mudraName: "Shakti Mudrā",
      mudraHow: "Pinky & ring fingers interlaced inward, thumbs tucked into the palms, index & middle extended and joined.",
      field: "#673613", panel: "#1e140d", accent: "#eca979", ring: "#d18147" },
    { id: "solar", art: `${art}/Chakra3.svg`, artAlt: "Maṇipūra yantra (10 petals)", real: true,
      eyebrow: "14–21 min · Fire", name: "Solar Plexus", sanskrit: "Maṇipūra", petals: 10,
      breath: "Kapālabhāti 2×30, 30s rest", mantra: "RAM", mantraCount: "×21",
      visual: "Yellow, solar plexus, a steady flame.", body: "Slight core engagement, then release.",
      mudra: "rudra", mudraName: "Rudra Mudrā",
      mudraHow: "Thumb, index & ring fingertips together; middle & pinky extended.",
      field: "#685312", panel: "#1e1a0d", accent: "#eed177", ring: "#d1b047" },
    { id: "heart", art: `${art}/Chakra4.svg`, artAlt: "Anāhata yantra (12 petals)", real: true,
      eyebrow: "21–34 min · Air", name: "Heart", sanskrit: "Anāhata", petals: 12,
      breath: "Nāḍī Śodhana ×10, then open breath", mantra: "YAM", mantraCount: "×21",
      visual: "Emerald green, expanding on the exhale.", body: "Hands on the sternum if it calls you.",
      mudra: "padma", mudraName: "Padma (Lotus) Mudrā",
      mudraHow: "Heels of the hands together, thumbs & pinkies touching, the remaining fingers spread open like a blooming lotus.",
      field: "#24562d", panel: "#101b12", accent: "#90d59d", ring: "#59c06c" },
    { id: "throat", art: `${art}/Chakra5.svg`, artAlt: "Viśuddha yantra (16 petals)", real: true,
      eyebrow: "34–41 min · Ether", name: "Throat", sanskrit: "Viśuddha", petals: 16,
      breath: "Slow 4-in / 4-out", mantra: "HAM", mantraCount: "×21",
      mantra2: "Om Namah Shivaya", mantra2Count: "×3",
      visual: "Bright blue, throat and jaw releasing.", body: "Chin slightly tucked, throat soft.",
      mudra: "granthita", mudraName: "Granthita Mudrā",
      mudraHow: "Fingers interlaced inside the palms; thumbs & index fingers meet to form two rings.",
      field: "#1b4960", panel: "#0e181d", accent: "#84c2e1", ring: "#47a4d1" },
    { id: "thirdeye", art: `${art}/Chakra6.svg`, artAlt: "Ājñā yantra (2 petals)", real: true,
      eyebrow: "41–48 min · Light", name: "Third Eye", sanskrit: "Ājñā", petals: 2,
      breath: "4-count inhale retention ×5", mantra: "AUM", mantraCount: "×21",
      visual: "Deep indigo, still, between the brows.", body: "Eyes relaxed upward behind closed lids.",
      mudra: "hakini", mudraName: "Hakini Mudrā",
      mudraHow: "All ten fingertips touching their opposite, hands held at chest or brow level.",
      field: "#242456", panel: "#10101b", accent: "#9090d5", ring: "#5959bf" },
    { id: "crown", art: `${art}/Chakra7.svg`, artAlt: "Sahasrāra yantra (thousand petals)", real: true,
      eyebrow: "48–57 min · Consciousness", name: "Crown", sanskrit: "Sahasrāra", petals: "1000",
      breath: "None — silence", mantra: "AH", mantraCount: "×21",
      mantra2: "Om Mani Padme Hum", mantra2Count: "×3",
      visual: "Violet to white, dissolving upward.", body: "No effort, no agenda.",
      mudra: "sahasrara", mudraName: "Sahasrāra Mudrā",
      mudraHow: "Hands in the lap, all fingers interlaced, index fingers extended and pointing upward.",
      field: "#3d2457", panel: "#16101b", accent: "#b290d5", ring: "#8b58c0" },
    { id: "close", descent: true, real: false, artAlt: "Descending chakra colours",
      eyebrow: "57–62 min · Grounding", name: "Descent & Close", sanskrit: "Return",
      breath: "One slow breath per center, descending", mantra: "LAM", mantraCount: "×1",
      mantra2: "Om Shanti Shanti Shanti", mantra2Count: "×3",
      visual: "Each color acknowledged, dimming to red.", body: "Full weight, eyes open slowly.",
      field: "#3d3d3d", panel: "#161616", accent: "#b3b3b3", ring: "#8c8c8c" },
  ];
}

function Row({ label, accent, children }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "11px 0", borderTop: `1px solid ${accent}22`, textAlign: "left" }}>
      <div style={{ flexShrink: 0, width: 58, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, paddingTop: 4 }}>{label}</div>
      <div style={{ flex: 1, color: CREAM, fontSize: 16.5, lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}

function Caveats({ onClose }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Practice notes" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(5,3,8,0.92)", backdropFilter: "blur(3px)",
               overflowY: "auto", padding: "54px 24px 40px", color: CREAM, fontSize: 16, lineHeight: 1.62 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 26, letterSpacing: "0.02em", margin: "0 0 4px" }}>On this practice</h2>
        <p style={{ fontSize: 12.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(243,236,221,0.5)", margin: "0 0 22px" }}>Honest caveats</p>
        <p><b style={{ fontWeight: 600 }}>Three traditions, on purpose.</b> This sequence deliberately blends Tantric/yogic practice (bīja mantras, chakras), Shaivite devotion (<i>Om Namah Shivaya</i>), and Tibetan Buddhist practice (<i>Om Mani Padme Hum</i>). That syncretism is intentional, not accidental.</p>
        <p><b style={{ fontWeight: 600 }}>Mudra mappings are not canonical.</b> The mudra-to-chakra assignments here vary by lineage and are not fixed in the source texts. The bīja mantras (LAM, VAM, RAM, YAM, HAM, AUM/OM) have firmer textual grounding than the mudra assignments do.</p>
        <p><b style={{ fontWeight: 600 }}>This is the full-length version.</b> Built for a complete ~62-minute practice <i>outside</i> the sauna. A compressed ~40-minute sauna variant exists separately — this deck is too long for a single sauna session.</p>
        <hr style={{ border: 0, borderTop: "1px solid rgba(243,236,221,0.16)", margin: "22px 0" }} />
        <p style={{ fontSize: 14.5, color: "rgba(243,236,221,0.8)" }}><b style={{ fontWeight: 600 }}>Traditional notes.</b> Petal counts: Root 4 · Sacral 6 · Solar Plexus 10 · Heart 12 · Throat 16 · Third Eye 2 · Crown 1000 (shown as “many”). <i>AUM</i> is the three-syllable expansion of <i>OM</i> (A–U–M + silence), used at the Third Eye and Crown.</p>
        <p style={{ fontSize: 14.5, color: "rgba(243,236,221,0.8)" }}><b style={{ fontWeight: 600 }}>Chakra tones.</b> The optional ♪ drone gives a pitch to chant the bīja against. It uses the common modern mapping of the chakras to the ascending C-major scale (Root C → Crown B) — a practical chant-pitch aid, not a canonical correspondence. Tap ♪ in the top bar to sound the current center’s tone.</p>
        <p style={{ fontSize: 13.5, color: "rgba(243,236,221,0.6)" }}>Yantra art: seven public-domain (CC0) chakra yantras from Wikimedia Commons; the Ganeśa is public-domain art from the Open Clip Art Library. Each mudra opens a hand-position photo (“View hand position”); no accurate, freely-licensed photo of these seven mudras exists online, so those slots await your own photos. The closing symbol is an original schematic. See CREDITS.md.</p>
        <button onClick={onClose} style={{ marginTop: 18, padding: "11px 22px", borderRadius: 30, border: "1px solid rgba(243,236,221,0.3)", background: "transparent", color: CREAM, fontSize: 15, letterSpacing: "0.1em", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

export default function ChakraCards({ artBase = DEFAULT_ART }) {
  const CARDS = React.useMemo(() => buildCards(artBase), [artBase]);
  const [idx, setIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [photoCard, setPhotoCard] = useState(null);
  const [sound, setSound] = useState(false);
  const [chanting, setChanting] = useState(false); // seed-chant pacer on/off
  const symRef = useRef(null);
  const phaseRef = useRef(null);
  const touch = useRef(null);
  const c = CARDS[idx];

  useEffect(() => { _droneSet(sound ? TONES[c.id].hz : null); }, [sound, idx]);
  useEffect(() => () => _droneSet(null), []);

  useEffect(() => {
    const sym = symRef.current;
    if (!chanting || !CHANT_CARDS[c.id]) {
      if (sym) { sym.style.animation = ""; sym.style.transform = ""; }
      if (_drone && _drone.breath) _drone.breath.gain.value = 1;
      return;
    }
    const cyc = CHANT;
    const total = cyc.reduce((s, p) => s + p[1], 0);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seed = (c.mantra || "").trim().split(" ")[0];
    if (sym) sym.style.animation = "none";
    let raf, start = performance.now(), last = "";
    const frame = (now) => {
      let t = ((now - start) / 1000) % total, acc = 0, phase = cyc[0], prog = 0;
      for (const ph of cyc) { if (t < acc + ph[1]) { phase = ph; prog = (t - acc) / ph[1]; break; } acc += ph[1]; }
      const name = phase[0], e = _ease(prog);
      if (sym && !reduceMotion) {
        const s = name === "Inhale" ? 0.9 + 0.2 * e : name === "Exhale" ? 1.1 - 0.2 * e : 1.1;
        sym.style.transform = "scale(" + s.toFixed(3) + ")";
      }
      if (_drone && _drone.breath) {
        _drone.breath.gain.value = name === "Inhale" ? 0.3 + 0.7 * e
                                 : name === "Exhale" ? 1 - 0.7 * e : 1;
      }
      const label = name === "Exhale" && seed ? "Chant · " + seed : name;
      if (phaseRef.current && label !== last) { last = label; phaseRef.current.textContent = label; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (sym) { sym.style.animation = ""; sym.style.transform = ""; }
      if (_drone && _drone.breath) _drone.breath.gain.value = 1;
    };
  }, [chanting, idx]);

  const go = useCallback((d) => setIdx((p) => Math.min(CARDS.length - 1, Math.max(0, p + d))), [CARDS.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setShowInfo(false); setPhotoCard(null); }
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onStart = (e) => (touch.current = e.touches[0].clientX);
  const onEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touch.current = null;
  };

  return (
    <div onTouchStart={onStart} onTouchEnd={onEnd}
      style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", color: CREAM,
               fontFamily: "'EB Garamond',Georgia,serif",
               background: `radial-gradient(ellipse 120% 80% at 50% 30%, ${c.field} 0%, ${c.panel} 58%, #060409 100%)`,
               transition: "background 0.7s ease",
               paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <style>{`
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fade { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
        .sym{ animation: floaty 7s ease-in-out infinite; }
        .card-anim{ animation: fade 0.5s ease both; }
        .nav:focus-visible{ outline:2px solid ${c.accent}; outline-offset:3px; border-radius:6px; }
        @media (prefers-reduced-motion: reduce){ .sym,.card-anim{ animation:none !important; } *{ transition:none !important; } }
      `}</style>

      {showInfo && <Caveats onClose={() => setShowInfo(false)} />}
      {photoCard && <MudraLightbox card={photoCard} onClose={() => setPhotoCard(null)} />}

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 6px" }}>
        <div style={{ display: "flex", gap: 7, flex: 1, flexWrap: "wrap" }}>
          {CARDS.map((cc, i) => (
            <button key={cc.id} aria-label={cc.name} className="nav" onClick={() => setIdx(i)}
              style={{ width: i === idx ? 22 : 7, height: 7, borderRadius: 4, border: "none", padding: 0, cursor: "pointer",
                       background: i === idx ? c.accent : "rgba(243,236,221,0.25)", transition: "all 0.35s ease" }} />
          ))}
        </div>
        <button className="nav" aria-label={sound ? "Mute chakra tone" : "Play chakra tone"} aria-pressed={sound}
          onClick={() => { try { _droneEnsure(); if (_drone) _drone.ctx.resume(); } catch (e) {} setSound((s) => !s); }}
          style={{ height: 30, flexShrink: 0, borderRadius: 15, padding: "0 11px", display: "inline-flex",
                   alignItems: "center", gap: 5, border: `1px solid ${c.accent}${sound ? "" : "66"}`,
                   background: sound ? `${c.accent}22` : "transparent", color: c.accent, fontSize: 13,
                   cursor: "pointer", fontFamily: "'EB Garamond',serif" }}>
          <span style={{ fontSize: 13 }}>♪</span>
          <span style={{ fontSize: 11, letterSpacing: "0.06em", opacity: sound ? 1 : 0.7 }}>
            {sound ? TONES[c.id].note : "tone"}
          </span>
        </button>
        <button className="nav" aria-label="Practice notes" onClick={() => setShowInfo(true)}
          style={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", border: `1px solid ${c.accent}66`,
                   background: "transparent", color: c.accent, fontSize: 15, cursor: "pointer",
                   fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic" }}>i</button>
      </div>

      <div className="card-anim" key={c.id}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column",
                 alignItems: "center", justifyContent: "center", padding: "6px 26px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.34em", textTransform: "uppercase", color: c.accent, marginBottom: 10 }}>{c.eyebrow}</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 42, lineHeight: 1.0, margin: "0 0 4px", letterSpacing: "0.01em" }}>{c.name}</h1>
        <div style={{ fontStyle: "italic", fontSize: 17, color: c.accent, opacity: 0.92, marginBottom: 2 }}>
          {c.sanskrit}{c.petals ? <span style={{ color: MUTED, fontStyle: "normal", fontSize: 13 }}>{"  ·  "}{c.petals === "1000" ? "1000 petals" : `${c.petals} ${c.petals === 1 ? "petal" : "petals"}`}</span> : null}
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                      width: "min(58vw,236px)", height: "min(58vw,236px)", margin: "14px 0 6px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(243,236,221,0.17) 0%, rgba(243,236,221,0.05) 46%, transparent 70%)",
                        boxShadow: `0 0 0 1px ${c.ring}33, inset 0 0 26px ${c.ring}22` }} />
          <div className="sym" ref={symRef} style={{ position: "relative", width: "74%", height: "74%", display: "flex",
                        alignItems: "center", justifyContent: "center", color: c.accent, filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.45))" }}>
            {c.descent ? <DescentGlyph /> : <img src={c.art} alt={c.artAlt} draggable="false" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
          </div>
        </div>

        {chanting && CHANT_CARDS[c.id] && (
          <div ref={phaseRef} aria-live="polite"
            style={{ fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase",
                     color: c.accent, minHeight: 15, marginBottom: 4 }} />
        )}

        <div style={{ width: "100%", maxWidth: 380, marginTop: 8, background: `${c.panel}d9`,
                      border: `1px solid ${c.accent}26`, borderRadius: 16, padding: "6px 18px 14px",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}>
          <div style={{ padding: "14px 0 12px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: c.accent, marginBottom: 6 }}>Mantra</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 25, lineHeight: 1.2, color: CREAM }}>
              {c.mantra} <span style={{ color: c.accent, fontSize: 18 }}>{c.mantraCount}</span>
            </div>
            {c.mantra2 && (
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 19, color: CREAM, opacity: 0.9, marginTop: 5 }}>
                then {c.mantra2} <span style={{ color: c.accent, fontStyle: "normal", fontSize: 15 }}>{c.mantra2Count}</span>
              </div>
            )}
            {CHANT_CARDS[c.id] && (
              <button className="nav" onClick={() => setChanting((v) => !v)}
                aria-pressed={chanting} aria-label={chanting ? "Stop chant pacer" : "Start chant pacer"}
                style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7,
                         padding: "5px 15px", borderRadius: 22, cursor: "pointer",
                         border: `1px solid ${c.accent}${chanting ? "" : "66"}`,
                         background: chanting ? `${c.accent}22` : "transparent", color: c.accent,
                         fontFamily: "'EB Garamond',serif", fontSize: 13, letterSpacing: "0.05em" }}>
                <span style={{ fontSize: 11 }}>{chanting ? "❚❚" : "▷"}</span>
                {chanting ? "pacing chant" : "pace chant"}
              </button>
            )}
          </div>
          <Row label="Breath" accent={c.accent}>{c.breath}</Row>
          <Row label="Visual" accent={c.accent}>{c.visual}</Row>
          <Row label="Body" accent={c.accent}>{c.body}</Row>
          {c.mudra && (
            <div style={{ textAlign: "left", borderTop: `1px solid ${c.accent}22`, paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: c.accent, marginBottom: 3 }}>
                Mudra{TWO_HANDED[c.mudra] ? <span style={{ opacity: 0.6, fontSize: 8.5 }}> · both hands</span> : null}
              </div>
              <div style={{ fontSize: 16, color: CREAM, marginBottom: 3 }}>{c.mudraName}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.45, color: MUTED }}>{c.mudraHow}</div>
              <button className="nav" onClick={() => setPhotoCard(c)}
                style={{ marginTop: 11, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px",
                         borderRadius: 24, cursor: "pointer", border: `1px solid ${c.accent}66`, background: `${c.accent}14`,
                         color: c.accent, fontFamily: "'EB Garamond',serif", fontSize: 13.5, letterSpacing: "0.04em" }}>
                <span style={{ fontSize: 15 }}>⛶</span> View hand position
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 18px" }}>
        <button className="nav" onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous" style={arrow(idx === 0, c.accent)}>‹</button>
        <div style={{ fontSize: 11, letterSpacing: "0.26em", color: MUTED }}>{c.id === "close" ? "OM SHANTI" : "SWIPE"} · {idx + 1}/{CARDS.length}</div>
        <button className="nav" onClick={() => go(1)} disabled={idx === CARDS.length - 1} aria-label="Next" style={arrow(idx === CARDS.length - 1, c.accent)}>›</button>
      </div>
    </div>
  );
}

function arrow(disabled, accent) {
  return { width: 48, height: 48, borderRadius: "50%",
    border: `1px solid ${disabled ? "rgba(243,236,221,0.12)" : accent + "88"}`,
    background: "transparent", color: disabled ? "rgba(243,236,221,0.2)" : accent,
    fontSize: 26, lineHeight: 1, cursor: disabled ? "default" : "pointer",
    fontFamily: "'Cormorant Garamond',serif" };
}

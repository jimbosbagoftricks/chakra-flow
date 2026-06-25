import React, { useState, useRef, useEffect, useCallback } from "react";

/*
  Ascending Chakra Practice — swipeable 11-card deck.

  Importable ES-module version of the component. The runnable, zero-build
  version lives in index.html (open it directly in a phone browser).

  Art:  seven public-domain (CC0) chakra yantras + a public-domain Ganeśa +
        two public-domain mantra symbols. See CREDITS.md.
        Mudra glyphs and the closing symbol are schematic line drawings.

  Assets: this component references the SVGs by URL via <img>, so with a bundler
  (Vite/CRA) put the `assets/` folder under `public/` (served at /assets) or
  pass a custom `artBase`. Default assumes they sit at ./assets/chakras.
*/

const DEFAULT_ART = "./assets/chakras";
const DEFAULT_MANTRA_ART = "./assets/mantras";
const CREAM = "#F3ECDD";
const MUTED = "rgba(243,236,221,0.62)";

/* ── Chakra tones ──
   A soft sustained drone per card, giving the pitch to chant against.
   Chakra→note mapping is the common modern convention (root→crown = ascending
   C-major scale), NOT canonical — a chant-pitch aid only. Web Audio, no files. */
const TONES = {
  open: { hz: 136.10, note: "Om" }, shiva: { hz: 136.10, note: "Om" },
  root: { hz: 130.81, note: "C" },
  sacral: { hz: 146.83, note: "D" }, solar: { hz: 164.81, note: "E" },
  heart: { hz: 174.61, note: "F" }, throat: { hz: 196.00, note: "G" },
  thirdeye: { hz: 220.00, note: "A" }, crown: { hz: 246.94, note: "B" },
  mani: { hz: 136.10, note: "Om" }, close: { hz: 130.81, note: "C" },
};
const TONE_TUNING_STORAGE = "chakraToneTuning";
const TONE_TUNINGS = {
  standard: { label: "440", name: "Standard 440" },
  soft432: { label: "432", name: "Soft 432" },
};
const TONE_432_RATIO = 432 / 440;

function _readToneTuning() {
  if (typeof window === "undefined") return "soft432";
  try {
    const saved = window.localStorage.getItem(TONE_TUNING_STORAGE);
    return TONE_TUNINGS[saved] ? saved : "soft432";
  } catch (e) {
    return "soft432";
  }
}

function _saveToneTuning(tuning) {
  try {
    window.localStorage.setItem(TONE_TUNING_STORAGE, tuning);
  } catch (e) {}
}

function _toneHz(cardId, tuning) {
  const tone = TONES[cardId];
  if (!tone) return null;
  if (tuning !== "soft432") return tone.hz;
  if (cardId === "open" || cardId === "shiva" || cardId === "mani") return 136.07;
  return tone.hz * TONE_432_RATIO;
}

const CHANT_AUDIO = {
  inhaleGain: 0.1,
  exhaleGain: 1,
  markerGain: 0.5,
  transition: 1.6,
};

let _drone = null;
let _wakeLock = null;
let _wakeLockWanted = false;
let _wakeLockListening = false;

function _wakeLockSupported() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator && window.isSecureContext;
}

function _wakeLockListen() {
  if (_wakeLockListening || typeof document === "undefined") return;
  _wakeLockListening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && _wakeLockWanted) _wakeLockRequest();
  });
}

async function _wakeLockRequest() {
  _wakeLockListen();
  _wakeLockWanted = true;
  if (!_wakeLockSupported() || _wakeLock) return;
  try {
    _wakeLock = await navigator.wakeLock.request("screen");
    _wakeLock.addEventListener("release", () => { _wakeLock = null; });
  } catch (e) {}
}

function _wakeLockRelease() {
  _wakeLockWanted = false;
  if (!_wakeLock) return;
  const lock = _wakeLock;
  _wakeLock = null;
  try { lock.release(); } catch (e) {}
}

function _wakeLockSet(active) {
  if (active) _wakeLockRequest();
  else _wakeLockRelease();
}

function _droneEnsure() {
  if (_drone) return _drone;
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1200; lp.Q.value = 0.5;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const breath = ctx.createGain();   // pacer-driven drone profile
  breath.gain.value = 1;
  const marker = ctx.createGain();
  marker.gain.value = CHANT_AUDIO.markerGain;
  breath.connect(master); master.connect(lp); marker.connect(lp); lp.connect(ctx.destination);
  _drone = { ctx, master, breath, marker, voices: [], markerVoices: [], lfo: null };
  return _drone;
}
function _droneClear(a, release) {
  const now = a.ctx.currentTime;
  a.voices.forEach((o) => { try { o.stop(now + release + 0.05); } catch (e) {} });
  a.markerVoices.forEach((o) => { try { o.stop(now + release + 0.05); } catch (e) {} });
  if (a.lfo) { try { a.lfo.stop(now + release + 0.05); } catch (e) {} a.lfo = null; }
  a.voices = [];
  a.markerVoices = [];
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

/* ── Chant pacer ──
   One uniform, silent cadence for chanting — the same on every paced card,
   independent of each card's breathing practice (which is named, not paced). The
   symbol is the metronome: expand to prepare, hold, contract on the chant,
   then hold again; when the tone is on, the drone swells and dips with it. */
const CHANT_DEFAULTS = { inhale: 4, exhale: 4, pause: 1, reps: 9, advance: false, autoplay: false };
const CHANT_LIMITS = { min: 1, pauseMin: 0, max: 12, repsMin: 1, repsMax: 108 };
const CHANT_STORAGE = "chakraChantSettings";
const BIJA_CHANT_CARDS = { root: 1, sacral: 1, solar: 1, heart: 1, throat: 1, thirdeye: 1, crown: 1 };
const CHANTABLE_CARDS = { open: 1, root: 1, sacral: 1, solar: 1, heart: 1, throat: 1, shiva: 1, thirdeye: 1, crown: 1, mani: 1 };
const _ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));

function _chantMix(from, to, p) {
  return from + (to - from) * _ease(p);
}

function _chantTransition(settings) {
  const span = Math.min(settings.inhale + settings.pause, settings.exhale + settings.pause);
  return Math.min(CHANT_AUDIO.transition, Math.max(0.08, span - 0.05));
}

function _chantDroneLevel(t, settings, total) {
  const low = CHANT_AUDIO.inhaleGain;
  const high = CHANT_AUDIO.exhaleGain;
  const transition = _chantTransition(settings);
  const pause = settings.pause;
  const exhaleStart = settings.inhale + pause;
  const upStart = exhaleStart - Math.min(pause, transition);
  const upEnd = upStart + transition;
  const downStart = total - Math.min(pause, transition);
  const downEnd = downStart + transition;

  if (downEnd > total && t < downEnd - total) {
    return _chantMix(high, low, (t + total - downStart) / transition);
  }
  if (t >= downStart && t < Math.min(downEnd, total)) {
    return _chantMix(high, low, (t - downStart) / transition);
  }
  if (t >= upStart && t < upEnd) {
    return _chantMix(low, high, (t - upStart) / transition);
  }
  if (t >= upEnd && t < downStart) return high;
  return low;
}

function _chantMarkerTone(a, freq, gain, when, dur, attack) {
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), when + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  env.connect(a.marker);
  const o = a.ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, when);
  o.connect(env);
  o.onended = () => { a.markerVoices = a.markerVoices.filter((voice) => voice !== o); };
  a.markerVoices.push(o);
  o.start(when);
  o.stop(when + dur + 0.05);
}

function _chantMarker(baseHz, kind) {
  if (!_drone || !baseHz || !_drone.marker) return;
  const a = _drone;
  if (a.ctx.state === "suspended") a.ctx.resume();
  a.marker.gain.value = CHANT_AUDIO.markerGain;
  const when = a.ctx.currentTime + 0.025;
  if (kind === "inhale") {
    _chantMarkerTone(a, baseHz * 2, 0.105, when, 4, 1.8);
    _chantMarkerTone(a, baseHz * 4, 0.045, when, 4, 1.8);
  }
  if (kind === "exhale") {
    _chantMarkerTone(a, baseHz * 2, 0.13, when, 2.8, 1.1);
  }
}

function _clampChantValue(value, fallback, min = CHANT_LIMITS.min, max = CHANT_LIMITS.max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function _fixedChantReps(card, fallback = 1) {
  const match = String(card.mantraCount || "").match(/\d+/);
  return match ? _clampChantValue(match[0], fallback, 1, CHANT_LIMITS.repsMax) : fallback;
}

function _chantReps(card, settings) {
  return BIJA_CHANT_CARDS[card.id] ? settings.reps : _fixedChantReps(card);
}

function _chantLabel(card) {
  return card.chantLabel || (card.mantra || "").trim().split(" ")[0] || "chant";
}

function _readChantSettings() {
  if (typeof window === "undefined") return { ...CHANT_DEFAULTS };
  try {
    const saved = JSON.parse(window.localStorage.getItem(CHANT_STORAGE) || "{}");
    return {
      inhale: _clampChantValue(saved.inhale, CHANT_DEFAULTS.inhale),
      exhale: _clampChantValue(saved.exhale, CHANT_DEFAULTS.exhale),
      pause: _clampChantValue(saved.pause, CHANT_DEFAULTS.pause, CHANT_LIMITS.pauseMin),
      reps: _clampChantValue(saved.reps, CHANT_DEFAULTS.reps, CHANT_LIMITS.repsMin, CHANT_LIMITS.repsMax),
      advance: !!saved.advance,
      autoplay: !!saved.advance && !!saved.autoplay,
    };
  } catch (e) {
    return { ...CHANT_DEFAULTS };
  }
}

function _saveChantSettings(settings) {
  try {
    window.localStorage.setItem(CHANT_STORAGE, JSON.stringify(settings));
  } catch (e) {}
}

/* ── Mudra reference photos ──
   Each mudra opens a photo of the hand position in a lightbox. No accurate,
   freely-licensed photo of these 7 specific finger-mudras exists on the open web
   (Wikimedia Commons, Openverse/Flickr and Pexels all checked — only generic
   Gyan/prayer hands or deity statues). So the slots start empty and show a
   placeholder. Add a photo: drop an image in ./assets/mudras/ and set its
   filename as `file` here. See assets/mudras/README.md. CC-BY/BY-SA photos must
   be credited (`credit`) and logged in CREDITS.md; your own photos need none. */
const MUDRA_DIR = "./assets/mudras";
const TWO_HANDED = { ganesha: true, shakti: true, padma: true, granthita: true, shivaLinga: true, hakini: true, sahasrara: true, anjali: true };
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
function buildCards(art, mantraArt) {
  return [
    { id: "open", art: `${art}/Ganesha.svg`, artAlt: "Ganeśa line drawing", real: true,
      eyebrow: "Opening · Obstacle Clearing", name: "Ganesha Invocation", sanskrit: "Gaṇapati",
      mantra: "Om Gam Ganapataye Namaha", mantraCount: "×3", chantLabel: "Gam",
      mudra: "ganesha", mudraName: "Ganesha Mudra", mudraLabel: "Mudra / Hand Position",
      mudraHow: "Clasp the hands in front of the heart with elbows out, one palm facing the chest and the other outward; gently draw the hands apart without releasing the grip.",
      homeTradition: "Hindu / Gaṇapatya opening practice.",
      translation: "Om, Gaṃ, salutations to Ganapati.",
      visual: "Clear the path before ascending.", body: "Settle. Set the intention to remove obstruction.",
      field: "#635117", panel: "#1e1a0e", accent: "#e6cd7f", ring: "#d1b047" },
    { id: "root", art: `${art}/Chakra1.svg`, artAlt: "Mūlādhāra yantra (4 petals)", real: true,
      name: "Root", sanskrit: "Mūlādhāra", element: "Earth", petals: 4,
      mantra: "LAM", mantraCount: "×21",
      visual: "Red, base of spine, downward roots.", body: "Full weight, floor contact.",
      mudra: "apana", mudraName: "Apāna Mudrā",
      mudraHow: "Thumb, middle & ring fingertips together; index & pinky extended. Hands on knees, palms up.",
      field: "#652115", panel: "#1e100d", accent: "#e98c7c", ring: "#d15b47" },
    { id: "sacral", art: `${art}/Chakra2.svg`, artAlt: "Svādhiṣṭhāna yantra (6 petals)", real: true,
      name: "Sacral", sanskrit: "Svādhiṣṭhāna", element: "Water", petals: 6,
      breath: "Kapālabhāti breathwork", breathHelp: "kapalabhati", mantra: "VAM", mantraCount: "×21",
      visual: "Orange, lower abdomen, fluid and moving.", body: "Soften hips and lower belly.",
      mudra: "shakti", mudraName: "Shakti Mudrā",
      mudraHow: "Thumbs tucked toward the palms, index and middle fingers joined; ring and pinky fingers point out or down.",
      field: "#673613", panel: "#1e140d", accent: "#eca979", ring: "#d18147" },
    { id: "solar", art: `${art}/Chakra3.svg`, artAlt: "Maṇipūra yantra (10 petals)", real: true,
      name: "Solar Plexus", sanskrit: "Maṇipūra", element: "Fire", petals: 10,
      breath: "Kapālabhāti breathwork", breathHelp: "kapalabhati", mantra: "RAM", mantraCount: "×21",
      visual: "Yellow, solar plexus, a steady flame.", body: "Slight core engagement, then release.",
      mudra: "rudra", mudraName: "Rudra Mudrā",
      mudraHow: "Thumb, index & ring fingertips together; middle & pinky extended.",
      field: "#685312", panel: "#1e1a0d", accent: "#eed177", ring: "#d1b047" },
    { id: "heart", art: `${art}/Chakra4.svg`, artAlt: "Anāhata yantra (12 petals)", real: true,
      name: "Heart", sanskrit: "Anāhata", element: "Air", petals: 12,
      breath: "Nāḍī Śodhana ×10, then open breath", breathHelp: "nadiShodhana", mantra: "YAM", mantraCount: "×21",
      visual: "Emerald green, expanding on the exhale.", body: "Hands on the sternum if it calls you.",
      mudra: "padma", mudraName: "Padma (Lotus) Mudrā",
      mudraHow: "Heels of the hands together, thumbs & pinkies touching, the remaining fingers spread open like a blooming lotus.",
      field: "#24562d", panel: "#101b12", accent: "#90d59d", ring: "#59c06c" },
    { id: "throat", art: `${art}/Chakra5.svg`, artAlt: "Viśuddha yantra (16 petals)", real: true,
      name: "Throat", sanskrit: "Viśuddha", element: "Ether", petals: 16,
      breath: "Gentle Ujjayi breath ×5", breathHelp: "ujjayi", mantra: "HAM", mantraCount: "×21",
      visual: "Bright blue, throat and jaw releasing.", body: "Chin slightly tucked, throat soft.",
      mudra: "granthita", mudraName: "Granthita Mudrā",
      mudraHow: "Interlace the fingers; bring the thumb tips together and the index fingertips together to form interlaced rings.",
      field: "#1b4960", panel: "#0e181d", accent: "#84c2e1", ring: "#47a4d1" },
    { id: "shiva", art: `${mantraArt}/Trident_Yantra_of_Parama_Siva.svg`, artAlt: "Trident yantra of Parama Śiva", real: true,
      artFilter: "brightness(0) saturate(100%) invert(90%) sepia(18%) saturate(458%) hue-rotate(358deg) brightness(104%) contrast(91%)",
      eyebrow: "Additional Mantra", name: "Śiva Mantra", sanskrit: "Om Namah Shivaya",
      mantra: "Om Namah Shivaya", mantraCount: "×3",
      chantLabel: "Namah Shivaya",
      homeTradition: "Śaiva Hindu practice.",
      translation: "Om, I bow to Śiva.",
      mudra: "shivaLinga", mudraName: "Shiva Linga Mudra", mudraLabel: "Mudra / Hand Position",
      mudraHow: "Cup the left hand near the lower belly or heart; place the right fist upright in the palm with the right thumb extended upward.",
      visual: "Pañcākṣara: Na, Ma, Śi, Va, Ya as earth, water, fire, air, and ether.",
      body: "Placed after Viśuddha because the throat's ether field opens the ascent into sound and space.",
      field: "#1b4960", panel: "#0e181d", accent: "#84c2e1", ring: "#47a4d1" },
    { id: "thirdeye", art: `${art}/Chakra6.svg`, artAlt: "Ājñā yantra (2 petals)", real: true,
      name: "Third Eye", sanskrit: "Ājñā", element: "Light", petals: 2,
      breath: "4-count inhale retention ×5", mantra: "AUM", mantraCount: "×21",
      visual: "Deep indigo, still, between the brows.", body: "Eyes relaxed upward behind closed lids.",
      mudra: "hakini", mudraName: "Hakini Mudrā",
      mudraHow: "All ten fingertips touching their opposite, hands held at chest or brow level.",
      field: "#242456", panel: "#10101b", accent: "#9090d5", ring: "#5959bf" },
    { id: "crown", art: `${art}/Chakra7.svg`, artAlt: "Sahasrāra yantra (thousand petals)", real: true,
      name: "Crown", sanskrit: "Sahasrāra", element: "Consciousness", petals: "1000",
      mantra: "AH", mantraCount: "×21",
      visual: "Violet to white, dissolving upward.", body: "No effort, no agenda.",
      mudra: "sahasrara", mudraName: "Sahasrāra Mudrā",
      mudraHow: "Interlace the fingers with the pinky fingers extended.",
      field: "#3d2457", panel: "#16101b", accent: "#b290d5", ring: "#8b58c0" },
    { id: "mani", art: `${mantraArt}/Om-mani-padme-hum-mantra.svg`, artAlt: "Om Mani Padme Hum in Tibetan script", real: true,
      artFilter: "brightness(0) saturate(100%) invert(90%) sepia(18%) saturate(458%) hue-rotate(358deg) brightness(104%) contrast(91%)",
      eyebrow: "Additional Mantra", name: "Mani Mantra", sanskrit: "Om Mani Padme Hum",
      mantra: "Om Mani Padme Hum", mantraCount: "×3",
      chantLabel: "Mani Padme",
      homeTradition: "Mahāyāna and Vajrayāna Buddhist practice, especially Tibetan.",
      translation: "Om, jewel in the lotus, hum.",
      mudra: "anjali", mudraName: "Añjali Mudra", mudraLabel: "Mudra / Hand Position",
      mudraHow: "Bring the palms together at the heart, or hold the hands softly at the heart as a steady, reverent anchor.",
      visual: "Violet-white compassion and spaciousness.", body: "Let the phrase settle rather than pushing for volume.",
      field: "#3d2457", panel: "#16101b", accent: "#b290d5", ring: "#8b58c0" },
    { id: "close", descent: true, real: false, artAlt: "Descending chakra colours",
      eyebrow: "Grounding", name: "Descent & Close", sanskrit: "Return",
      breath: "One slow breath per center, descending", mantra: "LAM", mantraCount: "×1",
      mantra2: "Om Shanti Shanti Shanti", mantra2Count: "×3",
      visual: "Each color acknowledged, dimming to red.", body: "Full weight, eyes open slowly.",
      field: "#3d3d3d", panel: "#161616", accent: "#b3b3b3", ring: "#8c8c8c" },
  ];
}

const BREATH_HELP = {
  kapalabhati: {
    title: "Kapālabhāti",
    subtitle: "Forceful breathwork",
    body: "Use this card text as a reminder, not as instruction. Kapālabhāti uses active abdominal exhales and passive inhales; if you have not learned it, review a technique source first and keep the intensity modest.",
    caution: "Skip it or substitute quiet breathing if it creates dizziness, pressure, strain, nausea, or agitation. Use qualified guidance if you are pregnant, recently postpartum or post-surgery, or if you have heart, blood-pressure, seizure, hernia, eye-pressure, or significant respiratory concerns.",
    links: [
      { label: "Yoga Journal how-to", href: "https://www.yogajournal.com/practice/energetics/pranayama/skull-shining-breath/" },
      { label: "Art of Living cautions", href: "https://www.artofliving.org/yoga/breathing-techniques/skull-shining-breath-kapal-bhati" },
    ],
  },
  nadiShodhana: {
    title: "Nāḍī Śodhana",
    subtitle: "Alternate-nostril breathing",
    body: "Use this for the Heart-card alternate-nostril breath. If you are newer to pranayama, stay with simple inhales and exhales before adding retention, fixed ratios, or mantra counts.",
    caution: "Keep the breath smooth and unforced. Drop the hand position or return to normal breathing if the shoulder, breath, or attention becomes strained.",
    links: [
      { label: "Yoga Journal step-by-step", href: "https://www.yogajournal.com/practice/energetics/pranayama/channel-cleaning-breath/" },
    ],
  },
  ujjayi: {
    title: "Ujjayi",
    subtitle: "Gentle ocean breath",
    body: "Use this as a light throat-centered preparation before chanting HAM. Keep the mouth closed, breathe through the nose, and let a soft ocean-like sound form by gently narrowing the back of the throat.",
    caution: "Keep it smooth and unforced. Do not clamp the throat, chase volume, or add breath holds here unless you already have qualified instruction.",
    links: [
      { label: "Art of Living guide", href: "https://www.artofliving.org/us-en/breathwork/pranayama/ujjayi-breathing" },
    ],
  },
};

function Row({ label, accent, children, action }) {
  const longLabel = label.length > 9;
  return (
    <div style={{ display: "flex", gap: 14, padding: "11px 0", borderTop: `1px solid ${accent}22`, textAlign: "left" }}>
      <div style={{ flexShrink: 0, width: longLabel ? 94 : 58, fontSize: longLabel ? 9 : 10,
                    lineHeight: 1.25, letterSpacing: longLabel ? "0.11em" : "0.16em",
                    textTransform: "uppercase", color: accent, paddingTop: 4 }}>{label}</div>
      <div style={{ flex: 1, color: CREAM, fontSize: 16.5, lineHeight: 1.4, minWidth: 0,
                    display: action ? "flex" : "block", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span>{children}</span>
        {action}
      </div>
    </div>
  );
}

function BreathHelp({ card, onClose }) {
  const help = BREATH_HELP[card.breathHelp];
  if (!help) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={`${help.title} notes`} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(5,3,8,0.9)", backdropFilter: "blur(3px)",
               display: "flex", alignItems: "center", justifyContent: "center", padding: "26px", color: CREAM }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(100%,420px)", border: `1px solid ${card.accent}44`, borderRadius: 18,
                 background: `${card.panel}f2`, boxShadow: "0 18px 60px rgba(0,0,0,0.55)", padding: "22px 22px 20px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: card.accent, marginBottom: 5 }}>{help.subtitle}</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 29, fontWeight: 500, margin: "0 0 12px" }}>{help.title}</h2>
        <p style={{ margin: "0 0 12px", fontSize: 16, lineHeight: 1.5 }}>{help.body}</p>
        <p style={{ margin: "0 0 16px", fontSize: 14.5, lineHeight: 1.5, color: "rgba(243,236,221,0.75)" }}>{help.caution}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {help.links.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
              style={{ border: `1px solid ${card.accent}66`, borderRadius: 22, padding: "8px 12px",
                       color: card.accent, textDecoration: "none", fontSize: 13.5, letterSpacing: "0.04em" }}>
              {link.label}
            </a>
          ))}
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "rgba(243,236,221,0.52)" }}>External links require internet access.</p>
        <button onClick={onClose}
          style={{ marginTop: 16, padding: "9px 18px", borderRadius: 24, border: "1px solid rgba(243,236,221,0.28)",
                   background: "transparent", color: CREAM, fontSize: 14, letterSpacing: "0.08em", cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
}

function AboutSection({ title, children }) {
  return (
    <section style={{ margin: "24px 0 0" }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 22, letterSpacing: "0.02em", margin: "0 0 10px", color: CREAM }}>{title}</h3>
      <div style={{ fontSize: 15.5, lineHeight: 1.58, color: "rgba(243,236,221,0.86)" }}>{children}</div>
    </section>
  );
}

function About({ onClose }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="About Chakra Flow" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(5,3,8,0.92)", backdropFilter: "blur(3px)",
               overflowY: "auto", padding: "54px 24px 40px", color: CREAM, fontSize: 16, lineHeight: 1.62 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 28, letterSpacing: "0.02em", margin: "0 0 4px" }}>About Chakra Flow</h2>
        <p style={{ fontSize: 12.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(243,236,221,0.5)", margin: "0 0 18px" }}>Use · practice · credits</p>

        <AboutSection title="How To Use The App">
          <p>Open <b style={{ fontWeight: 600 }}>Chakra Flow</b>, then move through the cards by swiping, using the arrow buttons, or tapping the progress dots.</p>
          <p>Tap <b style={{ fontWeight: 600 }}>♪</b> for the current card drone. Use <b style={{ fontWeight: 600 }}>Settings</b> to adjust tone tuning, bīja repetitions, chant pacing, pause length, and countdown advancement.</p>
          <p>Tap <b style={{ fontWeight: 600 }}>pace chant</b> to start the chant metronome. The symbol expands for inhale and contracts during the chant. While pacing is active, use the count button beside pace chant to begin, pause, or resume a countdown set.</p>
          <p>Use <b style={{ fontWeight: 600 }}>?</b> beside breath rows for technique references, and <b style={{ fontWeight: 600 }}>View hand position</b> for mudra photos.</p>
        </AboutSection>

        <AboutSection title="About This Practice">
          <p><b style={{ fontWeight: 600 }}>Three traditions, on purpose.</b> This sequence deliberately blends Tantric/yogic practice (bīja mantras, chakras), Shaivite devotion (<i>Om Namah Shivaya</i>), and Tibetan Buddhist practice (<i>Om Mani Padme Hum</i>).</p>
          <p><b style={{ fontWeight: 600 }}>Mudra mappings are not canonical.</b> The mudra-to-chakra assignments vary by lineage. The bīja mantras (LAM, VAM, RAM, YAM, HAM, AUM/OM) have firmer textual grounding than the mudra assignments do.</p>
          <p><b style={{ fontWeight: 600 }}>Practice structure is adjustable.</b> The default 9 repetitions of each bīja reflect the author's current working sequence. To shorten, lengthen, or otherwise reshape the practice, adjust repetition totals, chant pacing, pause length, breath choices, or the cards you include.</p>
          <p><b style={{ fontWeight: 600 }}>Kapālabhāti is forceful.</b> Treat it as active abdominal breathing, not a gentle breath cue. Skip it, slow it down, or substitute quiet breathing if it creates dizziness, pressure, strain, nausea, or agitation; use qualified guidance if you are pregnant, recently postpartum or post-surgery, or if you have heart, blood-pressure, seizure, hernia, eye-pressure, or significant respiratory concerns.</p>
          <p><b style={{ fontWeight: 600 }}>Chakra tones are practical, not canonical.</b> The optional drone uses the common modern ascending C-major mapping (Root C → Crown B), with 432 and 440 tuning options.</p>
          <p><b style={{ fontWeight: 600 }}>Practice responsibility.</b> This deck can hold a sequence, but it cannot read your body. Keep the intensity, timing, and breath choices within what is safe and appropriate for you today.</p>
        </AboutSection>

        <AboutSection title="Media Credits">
          <p>The seven chakra yantras and the Mani mantra symbol are public-domain / CC0 images from Wikimedia Commons. The Śiva mantra card uses a CC BY-SA trident yantra from Wikimedia Commons, credited in the license log. The Ganeśa opening image is public-domain / CC0 art from the Open Clip Art Library via freesvg.org.</p>
          <p>The mudra photos are the author's own hand-position photos, released with the project as CC0 / public domain. EXIF/GPS metadata has been stripped from the bundled images.</p>
          <p>The app icon uses the Root / Mūlādhāra yantra, and the closing descent symbol is an original schematic. Full provenance is logged in <i>CREDITS.md</i>.</p>
        </AboutSection>

        <button onClick={onClose} style={{ marginTop: 18, padding: "11px 22px", borderRadius: 30, border: "1px solid rgba(243,236,221,0.3)", background: "transparent", color: CREAM, fontSize: 15, letterSpacing: "0.1em", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

function Options({ chantSettings, toneTuning, onChange, onToneChange, onReset, onClose, accent }) {
  const [draftValues, setDraftValues] = useState({});
  const clearDraft = (key) => setDraftValues((prev) => {
    if (!(key in prev)) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });
  const control = (key, label) => {
    const isPause = key === "pause";
    const isReps = key === "reps";
    const min = isReps ? CHANT_LIMITS.repsMin : isPause ? CHANT_LIMITS.pauseMin : CHANT_LIMITS.min;
    const max = isReps ? CHANT_LIMITS.repsMax : CHANT_LIMITS.max;
    const unit = isReps ? "count" : "seconds";
    return (
      <div style={{ padding: "14px 0", borderTop: `1px solid ${accent}22` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, marginBottom: 10 }}>
          <label htmlFor={`chant-${key}`} style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: accent }}>{label}</label>
          <input id={`chant-${key}-number`} type="number" min={min}
            max={max} step="1"
            value={draftValues[key] ?? String(chantSettings[key])}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                setDraftValues((prev) => ({ ...prev, [key]: "" }));
                return;
              }
              const next = _clampChantValue(raw, chantSettings[key], min, max);
              setDraftValues((prev) => ({ ...prev, [key]: String(next) }));
              onChange(key, next);
            }}
            onBlur={() => clearDraft(key)}
            aria-label={`${label} ${unit}`}
            style={{ width: 64, borderRadius: 10, border: `1px solid ${accent}55`, background: "rgba(5,3,8,0.4)",
                     color: CREAM, padding: "7px 8px", textAlign: "center", font: "16px 'EB Garamond',serif" }} />
        </div>
        <input id={`chant-${key}`} type="range" min={min}
          max={max} step="1"
          value={chantSettings[key]} onChange={(e) => { clearDraft(key); onChange(key, e.target.value); }}
          aria-label={`${label} ${unit}`}
          style={{ width: "100%", accentColor: accent }} />
      </div>
    );
  };
  const toneControl = (
    <div style={{ padding: "16px 0", borderTop: `1px solid ${accent}22` }}>
      <div id="tone-tuning-label" style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Tone tuning</div>
      <div role="group" aria-labelledby="tone-tuning-label" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Object.entries(TONE_TUNINGS).map(([key, tuning]) => {
          const active = toneTuning === key;
          return (
            <button key={key} className="nav" type="button" aria-pressed={active}
              onClick={() => onToneChange(key)}
              style={{ minHeight: 48, borderRadius: 24, border: `1px solid ${accent}${active ? "" : "55"}`,
                       background: active ? `${accent}22` : "transparent", color: active ? CREAM : accent,
                       cursor: "pointer", font: "15px 'EB Garamond',serif", letterSpacing: "0.06em" }}>
              {tuning.name}
            </button>
          );
        })}
      </div>
    </div>
  );
  const toggleControl = (key, label, description) => {
    const active = !!chantSettings[key];
    return (
      <div style={{ padding: "14px 0", borderTop: `1px solid ${accent}22` }}>
        <button className="nav" type="button" role="switch" aria-checked={active}
          onClick={() => onChange(key, !active)}
          style={{ width: "100%", minHeight: 48, borderRadius: 24, border: `1px solid ${accent}${active ? "" : "55"}`,
                   background: active ? `${accent}22` : "transparent", color: active ? CREAM : accent,
                   cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                   gap: 14, padding: "10px 15px", font: "15px 'EB Garamond',serif", letterSpacing: "0.06em",
                   textAlign: "left" }}>
          <span>{label}</span>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em",
                         opacity: active ? 1 : 0.72 }}>{active ? "On" : "Off"}</span>
        </button>
        <div style={{ color: MUTED, fontSize: 13.2, lineHeight: 1.45, marginTop: 7 }}>{description}</div>
      </div>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Options" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(5,3,8,0.92)", backdropFilter: "blur(3px)",
               overflowY: "auto", padding: "54px 24px 40px", color: CREAM, fontSize: 16, lineHeight: 1.55 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 26, letterSpacing: "0.02em", margin: "0 0 4px" }}>Options</h2>
        <p style={{ fontSize: 12.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(243,236,221,0.5)", margin: "0 0 22px" }}>Practice settings</p>
        {control("inhale", "Inhale")}
        {control("exhale", "Exhale")}
        {control("pause", "Pause")}
        {control("reps", "Bīja repetitions")}
        {toggleControl("advance", "Advance after count", "When a countdown completes, move to the next card and retune the drone without starting the next pacing cycle.")}
        {chantSettings.advance && toggleControl("autoplay", "Autoplay counts", "After advancing, keep pacing active and begin the next card's countdown automatically when that card supports chant pacing.")}
        {toneControl}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          <button className="nav" onClick={onReset}
            style={{ padding: "10px 18px", borderRadius: 24, border: `1px solid ${accent}66`,
                     background: "transparent", color: accent, font: "15px 'EB Garamond',serif",
                     cursor: "pointer" }}>Reset 4 / 4 / 1 / 9</button>
          <button className="nav" onClick={onClose}
            style={{ padding: "10px 22px", borderRadius: 24, border: "1px solid rgba(243,236,221,0.3)",
                     background: "transparent", color: CREAM, font: "15px 'EB Garamond',serif",
                     cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function HomePage({ card, accent, onFlow, onOptions, onInfo }) {
  const button = (primary) => ({
    width: "100%", minHeight: 58, borderRadius: 28, border: `1px solid ${accent}${primary ? "" : "66"}`,
    background: primary ? `${accent}24` : "rgba(5,3,8,0.18)", color: primary ? CREAM : accent,
    fontFamily: "'EB Garamond',serif", fontSize: primary ? 20 : 17, letterSpacing: "0.08em",
    textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10, boxShadow: primary ? `0 10px 32px ${accent}16` : "none"
  });

  return (
    <div className="card-anim"
      style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column",
               alignItems: "center", justifyContent: "center", textAlign: "center", padding: "42px 28px 36px" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.34em", textTransform: "uppercase", color: accent, marginBottom: 14 }}>Practice deck</div>
      <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 48, lineHeight: 0.96, margin: "0 0 7px", letterSpacing: "0.01em" }}>Chakra Flow</h1>
      <div style={{ fontStyle: "italic", fontSize: 18, color: MUTED, marginBottom: 22 }}>{card.sanskrit}</div>

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                    width: "min(54vw,218px)", height: "min(54vw,218px)", margin: "0 0 28px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(243,236,221,0.17) 0%, rgba(243,236,221,0.05) 46%, transparent 70%)",
                      boxShadow: `0 0 0 1px ${accent}33, inset 0 0 28px ${accent}20` }} />
        <div className="sym" style={{ position: "relative", width: "74%", height: "74%", display: "flex",
                    alignItems: "center", justifyContent: "center", color: accent, filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.45))" }}>
          <img src={card.art} alt={card.artAlt} draggable="false" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 360, display: "grid", gap: 12 }}>
        <button className="nav" onClick={onFlow} aria-label="Open chakra flow" style={button(true)}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>▷</span> Chakra Flow
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button className="nav" onClick={onOptions} aria-label="Settings" style={button(false)}>
            <span style={{ fontSize: 21, lineHeight: 1 }}>⚙</span> Settings
          </button>
          <button className="nav" onClick={onInfo} aria-label="About" style={button(false)}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 24, lineHeight: 1 }}>i</span> About
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChakraCards({ artBase = DEFAULT_ART, mantraArtBase = DEFAULT_MANTRA_ART }) {
  const CARDS = React.useMemo(() => buildCards(artBase, mantraArtBase), [artBase, mantraArtBase]);
  const [view, setView] = useState("home");
  const [idx, setIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [photoCard, setPhotoCard] = useState(null);
  const [breathHelpCard, setBreathHelpCard] = useState(null);
  const [sound, setSound] = useState(false);
  const [toneTuning, setToneTuning] = useState(_readToneTuning);
  const [chanting, setChanting] = useState(false); // chant pacer on/off
  const [chantSettings, setChantSettings] = useState(_readChantSettings);
  const [chantCountdown, setChantCountdown] = useState(null);
  const chantCountdownRef = useRef(null);
  const pendingAutoCountdownRef = useRef(false);
  const currentPhaseKindRef = useRef("");
  const symRef = useRef(null);
  const phaseRef = useRef(null);
  const touch = useRef(null);
  const c = CARDS[idx];
  const homeCard = CARDS[0];
  const ui = view === "home" ? homeCard : c;
  const canPaceChant = !!CHANTABLE_CARDS[c.id];
  const chantReps = _chantReps(c, chantSettings);

  useEffect(() => {
    if (view !== "flow") { _droneSet(null); return; }
    _droneSet(sound ? _toneHz(c.id, toneTuning) : null);
  }, [sound, idx, view, toneTuning]);
  useEffect(() => {
    _wakeLockSet(view === "flow");
    return () => _wakeLockRelease();
  }, [view]);
  useEffect(() => () => _droneSet(null), []);

  const updateChantSetting = useCallback((key, value) => {
    setChantSettings((prev) => {
      if (key === "advance" || key === "autoplay") {
        const next = { ...prev, [key]: !!value };
        if (key === "advance" && !next.advance) next.autoplay = false;
        if (key === "autoplay" && next.autoplay) next.advance = true;
        _saveChantSettings(next);
        return next;
      }
      const isReps = key === "reps";
      const min = isReps ? CHANT_LIMITS.repsMin : key === "pause" ? CHANT_LIMITS.pauseMin : CHANT_LIMITS.min;
      const max = isReps ? CHANT_LIMITS.repsMax : CHANT_LIMITS.max;
      const next = { ...prev, [key]: _clampChantValue(value, prev[key], min, max) };
      _saveChantSettings(next);
      return next;
    });
  }, []);

  const resetChantSettings = useCallback(() => {
    const next = { ...CHANT_DEFAULTS };
    _saveChantSettings(next);
    setChantSettings(next);
  }, []);

  const updateToneTuning = useCallback((tuning) => {
    if (!TONE_TUNINGS[tuning]) return;
    _saveToneTuning(tuning);
    setToneTuning(tuning);
  }, []);

  const updateChantCountdown = useCallback((next) => {
    chantCountdownRef.current = next;
    setChantCountdown(next);
  }, []);

  const armChantCountdown = useCallback(() => {
    if (!chanting || !canPaceChant) return;
    updateChantCountdown({
      remaining: chantReps,
      skipCurrentExhale: currentPhaseKindRef.current === "exhale",
      paused: false,
    });
  }, [chanting, canPaceChant, chantReps, updateChantCountdown]);

  const toggleChantCountdown = useCallback(() => {
    if (!chanting || !canPaceChant) return;
    const active = chantCountdownRef.current;
    if (!active) {
      armChantCountdown();
      return;
    }
    updateChantCountdown({ ...active, paused: !active.paused });
  }, [chanting, canPaceChant, armChantCountdown, updateChantCountdown]);

  useEffect(() => {
    if (pendingAutoCountdownRef.current) {
      pendingAutoCountdownRef.current = false;
      if (view === "flow" && chanting && CHANTABLE_CARDS[c.id]) {
        updateChantCountdown({
          remaining: _chantReps(c, chantSettings),
          skipCurrentExhale: false,
          paused: false,
        });
        return;
      }
    }
    updateChantCountdown(null);
  }, [idx, updateChantCountdown]);

  useEffect(() => {
    const sym = symRef.current;
    if (!chanting || !CHANTABLE_CARDS[c.id]) {
      if (sym) { sym.style.animation = ""; sym.style.transform = ""; }
      if (_drone && _drone.breath) _drone.breath.gain.value = 1;
      if (chantCountdownRef.current) updateChantCountdown(null);
      currentPhaseKindRef.current = "";
      return;
    }
    const cyc = [
      ["Inhale", chantSettings.inhale, "inhale"],
      ["Pause", chantSettings.pause, "high"],
      ["Exhale", chantSettings.exhale, "exhale"],
      ["Pause", chantSettings.pause, "low"],
    ].filter((phase) => phase[1] > 0);
    const total = cyc.reduce((s, p) => s + p[1], 0);
    const seed = _chantLabel(c);
    if (sym) sym.style.animation = "none";
    const markerHz = _toneHz(c.id, toneTuning);
    let raf, start = performance.now(), last = "", lastKind = "";
    const frame = (now) => {
      let t = ((now - start) / 1000) % total, acc = 0, phase = cyc[0], prog = 0;
      for (const ph of cyc) { if (t < acc + ph[1]) { phase = ph; prog = (t - acc) / ph[1]; break; } acc += ph[1]; }
      const name = phase[0], kind = phase[2], e = _ease(prog);
      currentPhaseKindRef.current = kind;
      if (sym) {
        const s = kind === "inhale" ? 0.84 + 0.32 * e
                : kind === "exhale" ? 1.16 - 0.32 * e
                : kind === "high" ? 1.16 : 0.84;
        sym.style.transform = "scale(" + s.toFixed(3) + ")";
      }
      if (_drone && _drone.breath) {
        _drone.breath.gain.value = _chantDroneLevel(t, chantSettings, total);
      }
      if (kind !== lastKind) {
        const previousKind = lastKind;
        lastKind = kind;
        if (previousKind === "exhale" && kind !== "exhale" && chantCountdownRef.current) {
          const active = chantCountdownRef.current;
          if (active.paused) {
            updateChantCountdown(active);
          } else if (active.skipCurrentExhale) {
            updateChantCountdown({ ...active, skipCurrentExhale: false });
          } else {
            const remaining = Math.max(0, active.remaining - 1);
            if (remaining <= 0) {
              const nextIdx = idx < CARDS.length - 1 ? idx + 1 : null;
              updateChantCountdown(null);
              if (chantSettings.advance && nextIdx != null) {
                const nextCard = CARDS[nextIdx];
                const autoplayNext = !!(chantSettings.autoplay && CHANTABLE_CARDS[nextCard.id]);
                pendingAutoCountdownRef.current = autoplayNext;
                setIdx(nextIdx);
                setChanting(autoplayNext);
              } else {
                setSound(false);
                _droneSet(null);
                setChanting(false);
              }
              return;
            }
            updateChantCountdown({ ...active, remaining });
          }
        }
        if (sound && (kind === "inhale" || kind === "exhale")) _chantMarker(markerHz, kind);
      }
      const activeCountdown = chantCountdownRef.current;
      const countdown = activeCountdown ? " · " + (activeCountdown.paused ? "paused " : "") + activeCountdown.remaining : "";
      const label = (name === "Exhale" && seed ? "Chant · " + seed : name) + countdown;
      if (phaseRef.current && label !== last) { last = label; phaseRef.current.textContent = label; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (sym) { sym.style.animation = ""; sym.style.transform = ""; }
      if (_drone && _drone.breath) _drone.breath.gain.value = 1;
      currentPhaseKindRef.current = "";
    };
  }, [chanting, idx, sound, toneTuning, chantSettings.inhale, chantSettings.exhale, chantSettings.pause, chantSettings.advance, chantSettings.autoplay, updateChantCountdown]);

  const go = useCallback((d) => {
    pendingAutoCountdownRef.current = false;
    setIdx((p) => Math.min(CARDS.length - 1, Math.max(0, p + d)));
  }, [CARDS.length]);

  const openHome = useCallback(() => {
    pendingAutoCountdownRef.current = false;
    setChanting(false);
    updateChantCountdown(null);
    setSound(false);
    _droneSet(null);
    setView("home");
  }, [updateChantCountdown]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setShowInfo(false); setShowOptions(false); setPhotoCard(null); setBreathHelpCard(null); }
      else if (view === "flow" && e.key === "ArrowRight") go(1);
      else if (view === "flow" && e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, view]);

  useEffect(() => {
    if (view !== "flow" || typeof window === "undefined" || !window.history?.pushState) return;
    const state = { chakraFlowGuard: true };
    try { window.history.pushState(state, "", window.location.href); } catch (e) { return; }
    const onPop = () => {
      try { window.history.pushState(state, "", window.location.href); } catch (e) {}
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [view]);

  const onStart = (e) => (touch.current = e.touches[0].clientX);
  const onEnd = (e) => {
    if (view !== "flow") return;
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touch.current = null;
  };
  const canCountChant = chanting && canPaceChant;

  return (
    <div onTouchStart={onStart} onTouchEnd={onEnd}
      style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", color: CREAM,
               fontFamily: "'EB Garamond',Georgia,serif",
               background: `radial-gradient(ellipse 120% 80% at 50% 30%, ${ui.field} 0%, ${ui.panel} 58%, #060409 100%)`,
               transition: "background 0.7s ease",
               paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <style>{`
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fade { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
        .sym{ animation: floaty 7s ease-in-out infinite; }
        .card-anim{ animation: fade 0.5s ease both; }
        .nav:focus-visible{ outline:2px solid ${ui.accent}; outline-offset:3px; border-radius:6px; }
        @media (prefers-reduced-motion: reduce){ .sym,.card-anim{ animation:none !important; } *{ transition:none !important; } }
      `}</style>

      {showInfo && <About onClose={() => setShowInfo(false)} />}
      {showOptions && <Options
        chantSettings={chantSettings}
        toneTuning={toneTuning}
        onChange={updateChantSetting}
        onToneChange={updateToneTuning}
        onReset={resetChantSettings}
        onClose={() => setShowOptions(false)}
        accent={ui.accent} />}
      {photoCard && <MudraLightbox card={photoCard} onClose={() => setPhotoCard(null)} />}
      {breathHelpCard && <BreathHelp card={breathHelpCard} onClose={() => setBreathHelpCard(null)} />}

      {view === "home" ? (
        <HomePage
          card={homeCard}
          accent={ui.accent}
          onFlow={() => setView("flow")}
          onOptions={() => setShowOptions(true)}
          onInfo={() => setShowInfo(true)}
        />
      ) : (
      <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px 6px" }}>
        <button className="nav" aria-label="Home" onClick={openHome}
          style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", border: `1px solid ${c.accent}66`,
                   background: "transparent", color: c.accent, fontSize: 25, cursor: "pointer",
                   fontFamily: "system-ui,-apple-system,sans-serif", lineHeight: 1 }}>⌂</button>
        <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "nowrap" }}>
          {CARDS.map((cc, i) => (
            <button key={cc.id} aria-label={cc.name} className="nav"
              onClick={() => { pendingAutoCountdownRef.current = false; setIdx(i); }}
              style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, border: "none", padding: 0, cursor: "pointer",
                       background: i === idx ? c.accent : "rgba(243,236,221,0.25)", transition: "all 0.35s ease" }} />
          ))}
        </div>
        <button className="nav" aria-label={sound ? "Mute chakra tone" : "Play chakra tone"} aria-pressed={sound}
          onClick={() => { try { _droneEnsure(); if (_drone) _drone.ctx.resume(); } catch (e) {} setSound((s) => !s); }}
          style={{ height: 48, flexShrink: 0, borderRadius: 24, padding: "0 13px", display: "inline-flex",
                   alignItems: "center", gap: 5, border: `1px solid ${c.accent}${sound ? "" : "66"}`,
                   background: sound ? `${c.accent}22` : "transparent", color: c.accent, fontSize: 13,
                   cursor: "pointer", fontFamily: "'EB Garamond',serif" }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>♪</span>
          <span style={{ fontSize: 13, letterSpacing: "0.06em", opacity: sound ? 1 : 0.7 }}>
            {sound ? `${TONES[c.id].note} · ${TONE_TUNINGS[toneTuning].label}` : "tone"}
          </span>
        </button>
        <button className="nav" aria-label="Options" onClick={() => setShowOptions(true)}
          style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", border: `1px solid ${c.accent}66`,
                   background: "transparent", color: c.accent, fontSize: 28, cursor: "pointer",
                   fontFamily: "system-ui,-apple-system,sans-serif", lineHeight: 1 }}>⚙</button>
        <button className="nav" aria-label="About" onClick={() => setShowInfo(true)}
          style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", border: `1px solid ${c.accent}66`,
                   background: "transparent", color: c.accent, fontSize: 30, cursor: "pointer",
                   fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1 }}>i</button>
      </div>

      <div className="card-anim" key={c.id}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column",
                 alignItems: "center", justifyContent: "flex-start", padding: "16px 26px 14px", textAlign: "center" }}>
        {c.eyebrow && (
          <div style={{ fontSize: 11, letterSpacing: "0.34em", textTransform: "uppercase", color: c.accent, marginBottom: 10 }}>{c.eyebrow}</div>
        )}
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 42, lineHeight: 1.0, margin: "0 0 4px", letterSpacing: "0.01em" }}>{c.name}</h1>
        <div style={{ fontStyle: "italic", fontSize: 17, color: c.accent, opacity: 0.92, marginBottom: 2 }}>
          {c.sanskrit}{(c.element || c.petals) ? <span style={{ color: MUTED, fontStyle: "normal", fontSize: 13 }}>{"  ·  "}{[c.element, c.petals ? (c.petals === "1000" ? "1000 petals" : `${c.petals} ${c.petals === 1 ? "petal" : "petals"}`) : null].filter(Boolean).join("  ·  ")}</span> : null}
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                      width: "min(72vw,300px)", height: "min(72vw,300px)", margin: "14px 0 6px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(243,236,221,0.17) 0%, rgba(243,236,221,0.05) 46%, transparent 70%)",
                        boxShadow: `0 0 0 1px ${c.ring}33, inset 0 0 26px ${c.ring}22` }} />
          <div className="sym" ref={symRef}
                        style={{ position: "relative", width: "90%", height: "90%", display: "flex",
                        alignItems: "center", justifyContent: "center", color: c.accent, filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.45))",
                        cursor: "default" }}>
            {c.descent ? <DescentGlyph /> : <img src={c.art} alt={c.artAlt} draggable="false" style={{ width: "100%", height: "100%", objectFit: "contain", filter: c.artFilter || undefined }} />}
          </div>
        </div>

        {chanting && CHANTABLE_CARDS[c.id] && (
          <div ref={phaseRef} aria-live="polite"
            style={{ fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase",
                     color: c.accent, minHeight: 15, marginBottom: 4 }} />
        )}

        <div style={{ width: "100%", maxWidth: 380, marginTop: 8, background: `${c.panel}d9`,
                      border: `1px solid ${c.accent}26`, borderRadius: 16, padding: "6px 18px 14px",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}>
          {c.breath && (
            <Row label="Optional Preparation" accent={c.accent}
              action={c.breathHelp ? (
                <button className="nav" onClick={() => setBreathHelpCard(c)}
                  aria-label={`About ${c.breath}`} title={`About ${c.breath}`}
                  style={{ width: 26, height: 26, flexShrink: 0, borderRadius: "50%", border: `1px solid ${c.accent}66`,
                           background: `${c.accent}14`, color: c.accent, fontSize: 15, lineHeight: 1,
                           cursor: "pointer", fontFamily: "system-ui,-apple-system,sans-serif" }}>
                  ?
                </button>
              ) : null}>{c.breath}</Row>
          )}
          <div style={{ padding: "14px 0 12px", borderTop: c.breath ? `1px solid ${c.accent}22` : "none" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: c.accent, marginBottom: 6 }}>Mantra</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 25, lineHeight: 1.2, color: CREAM }}>
              {c.mantra} <span style={{ color: c.accent, fontSize: 18 }}>{canPaceChant ? `×${chantReps}` : c.mantraCount}</span>
            </div>
            {c.mantra2 && (
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 19, color: CREAM, opacity: 0.9, marginTop: 5 }}>
                then {c.mantra2} <span style={{ color: c.accent, fontStyle: "normal", fontSize: 15 }}>{c.mantra2Count}</span>
              </div>
            )}
            {CHANTABLE_CARDS[c.id] && (
              <div style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
                <button className="nav" onClick={() => {
                  pendingAutoCountdownRef.current = false;
                  setChanting((v) => {
                    if (v) updateChantCountdown(null);
                    return !v;
                  });
                }}
                  aria-pressed={chanting} aria-label={chanting ? "Stop chant pacer" : "Start chant pacer"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7,
                           padding: "5px 15px", borderRadius: 22, cursor: "pointer",
                           border: `1px solid ${c.accent}${chanting ? "" : "66"}`,
                           background: chanting ? `${c.accent}22` : "transparent", color: c.accent,
                           fontFamily: "'EB Garamond',serif", fontSize: 13, letterSpacing: "0.05em" }}>
                  <span style={{ fontSize: 11 }}>{chanting ? "❚❚" : "▷"}</span>
                  {chanting ? "pacing chant" : "pace chant"}
                </button>
                {canCountChant && (
                  <button className="nav" onClick={toggleChantCountdown}
                    aria-pressed={!!chantCountdown && !chantCountdown.paused}
                    aria-label={chantCountdown ? (chantCountdown.paused ? "Resume chant countdown" : "Pause chant countdown") : `Start ${chantReps} chant countdown`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7,
                             padding: "5px 15px", borderRadius: 22, cursor: "pointer",
                             border: `1px solid ${c.accent}${chantCountdown ? "" : "66"}`,
                             background: chantCountdown ? `${c.accent}22` : "transparent", color: c.accent,
                             fontFamily: "'EB Garamond',serif", fontSize: 13, letterSpacing: "0.05em" }}>
                    <span style={{ fontSize: 11 }}>{chantCountdown && !chantCountdown.paused ? "❚❚" : "▷"}</span>
                    {chantCountdown ? (chantCountdown.paused ? `resume ${chantCountdown.remaining}` : `count ${chantCountdown.remaining}`) : `count ${chantReps}`}
                  </button>
                )}
              </div>
            )}
          </div>
          {c.homeTradition && <Row label="Home Tradition" accent={c.accent}>{c.homeTradition}</Row>}
          {c.translation && <Row label="Translation" accent={c.accent}>{c.translation}</Row>}
          <Row label="Visual" accent={c.accent}>{c.visual}</Row>
          <Row label="Body" accent={c.accent}>{c.body}</Row>
          {c.mudra && (
            <div style={{ textAlign: "left", borderTop: `1px solid ${c.accent}22`, paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: c.accent, marginBottom: 3 }}>
                {c.mudraLabel || "Mudra"}{TWO_HANDED[c.mudra] ? <span style={{ opacity: 0.6, fontSize: 8.5 }}> · both hands</span> : null}
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
      </>
      )}
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

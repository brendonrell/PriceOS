// @ts-nocheck
/*
 * PROVENANCE — production port of the R&D engine s09_redaction.
 *
 * Conceptual DOCUMENT art: bureaucratic paperwork as fine art — ledgers, forms,
 * redaction bars, stamps, price columns, dot-matrix numerals, carbon ghosting,
 * hole-punches, signatures. On Kawara / Hanne Darboven / institutional critique —
 * dry, deadpan, elegant. SURREAL = real-but-off: a ledger that REDACTS its own
 * prices; a column of figures summing to "‰" or "∞"; a valuation record for the
 * unvaluable; contradictory stamps; a price tag with no number. Never a joke.
 *
 * STRAIGHT PORT — nothing changed visually. Body identical to
 * tools/halo/s09_redaction.js; only the harness shell differs: window.KIT →
 * imported _kit helpers, window.FORCE_PAL removed, the production
 * blit()/EngineFn/TraitsFn/TraitSchema contract wired up.
 *
 * Deterministic from tokenId only.
 */
import { rng, pick, clamp, mix, rgba, makeNoise, mottle, hazeSheet, grain, vignette, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const K = { rng, pick, clamp, mix, rgba, makeNoise, mottle, hazeSheet, grain, vignette };

/* Six document worlds — each = paper + ink + accent. Austere office stock. */
const PALS = [
  { name: 'Manila',       paper: '#d8c39a', paper2: '#cdb588', ink: '#241f17', faint: '#6f6450', accent: '#b23a2e', bar: '#1a160f', band: null },
  { name: 'Carbon',       paper: '#f4f2ec', paper2: '#e7e4da', ink: '#2c3e7a', faint: '#8b93b0', accent: '#2c3e7a', bar: '#10193a', band: null, carbon: true },
  { name: 'Telex',        paper: '#e9efe2', paper2: '#dfe8d6', ink: '#20241c', faint: '#5d6a52', accent: '#1f1f1f', bar: '#141711', band: '#cfe0c2' },
  { name: 'Onionskin',    paper: '#f3ecdd', paper2: '#eadfca', ink: '#5b5448', faint: '#9a9080', accent: '#b23a2e', bar: '#2a261d', band: null, thin: true },
  { name: 'Confidential', paper: '#cfcdc6', paper2: '#c2c0b8', ink: '#171717', faint: '#6c6b66', accent: '#b23a2e', bar: '#080808', band: null, heavy: true },
  { name: 'Thermal',      paper: '#efe7d6', paper2: '#e8dfc9', ink: '#7a7163', faint: '#aaa090', accent: '#9a7b5e', bar: '#3a342a', band: null, fade: true },
];

const MODES = ['Ledger', 'Form', 'Redacted', 'Statement', 'Memo', 'Punchcard'];
const FORMATS = [[1000, 1280], [1150, 1150], [1280, 980]]; // portrait / square / landscape

/* Surreal sum tokens — figures never resolve to a real number. */
const SUMS = ['‰', '∞', '——', '$ —', '0.00?', '※', '≠', '$∞', 'TBD', '∴ ∞'];
const STAMPS = ['VOID', 'PAID', 'PRICELESS', 'TBD', 'NULL', 'PROVENANCE', 'NO VALUE', 'CERTIFIED', 'REDACTED', '‰'];
const MARKS = ['$', '‰', '%', '—', '∞', '§', '¶', '·', '#'];
const GLYPHS = '0123456789';

function pickPal(r) {
  return K.pick(PALS, r);
}

function draw(cv, seed) {
  const r = K.rng(seed);
  const noise = K.makeNoise(seed * 7 + 3);
  const pal = pickPal(r);
  r(); // consume one draw (keeps rng order aligned with traits)
  // seed-walks through all 6 modes so any consecutive run shows the full set
  const mode = MODES[(seed * 5) % MODES.length];
  const fmt = K.pick(FORMATS, r);
  const W = fmt[0], H = fmt[1];
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);

  // tiny slant so the page reads as a real photographed/scanned sheet
  const skew = (r() - 0.5) * 0.012;

  /* ── PAPER STOCK ───────────────────────────────────────────────────── */
  const pg = x.createLinearGradient(0, 0, W, H);
  pg.addColorStop(0, K.mix(pal.paper, '#ffffff', 0.06));
  pg.addColorStop(0.5, pal.paper);
  pg.addColorStop(1, K.mix(pal.paper, pal.paper2, 1));
  x.fillStyle = pg; x.fillRect(0, 0, W, H);
  // uneven warm/cool blotching of the stock
  for (let i = 0; i < 26; i++) {
    const bx = r() * W, by = r() * H, br = S * (0.12 + r() * 0.3);
    const dark = r() < 0.5;
    const c = dark ? K.mix(pal.paper, pal.faint, 0.5) : K.mix(pal.paper, '#fff', 0.5);
    const g = x.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, K.rgba(c, 0.05 + r() * 0.05)); g.addColorStop(1, K.rgba(c, 0));
    x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  // green-bar printer bands (Telex) — alternating shaded rows
  if (pal.band) {
    const bh = H * 0.052;
    for (let y = 0, i = 0; y < H; y += bh, i++) {
      if (i % 2 === 0) { x.fillStyle = K.rgba(pal.band, 0.5); x.fillRect(0, y, W, bh); }
    }
  }

  // page margin frame (most stock) — a faint printed border
  const mL = W * 0.10, mR = W * 0.10, mT = H * 0.085, mB = H * 0.085;
  const fL = mL, fR = W - mR, fT = mT, fB = H - mB, fW = fR - fL;

  x.save();
  x.translate(W / 2, H / 2); x.rotate(skew); x.translate(-W / 2, -H / 2);

  // ── helpers ─────────────────────────────────────────────────────────
  const mono = (px, weight) => (weight || '') + px + 'px "Courier New", Courier, monospace';

  // a faded random alphanumeric run (the "typed" texture beneath)
  function gibberish(n, digitBias) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const k = r();
      if (k < (digitBias || 0.55)) s += GLYPHS[(r() * 10) | 0];
      else if (k < 0.72) s += K.pick(MARKS, r);
      else if (k < 0.86) s += ' ';
      else s += String.fromCharCode(65 + ((r() * 26) | 0));
    }
    return s;
  }
  function money() {
    const big = (r() * 9999 | 0).toLocaleString();
    const cents = ('0' + (r() * 100 | 0)).slice(-2);
    return '$' + big + '.' + cents;
  }
  // typed line with carbon offset ghost + slight per-char jitter ("real" typewriter)
  function typeLine(tx, ty, str, px, col, alpha, opts) {
    opts = opts || {};
    x.save();
    x.font = mono(px, opts.bold ? 'bold ' : '');
    x.textBaseline = 'alphabetic';
    // carbon-copy offset ghost (blue carbon palettes lean into this)
    if (pal.carbon || opts.ghost) {
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(pal.carbon ? pal.accent : pal.faint, (alpha || 0.7) * 0.28);
      x.fillText(str, tx + px * 0.10, ty + px * 0.09);
      x.restore();
    }
    let cx = tx;
    const fade = pal.fade ? 0.55 : 1;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const cw = px * 0.6; // monospace advance
      if (ch !== ' ') {
        // each glyph slightly inked unevenly — some strikes faint, some heavy
        let a = (alpha || 0.85) * fade * (0.55 + r() * 0.55);
        if (opts.flat) a = (alpha || 0.85) * fade;
        a = K.clamp(a, 0, 1);
        const jy = opts.flat ? 0 : (r() - 0.5) * px * 0.06;
        x.fillStyle = K.rgba(col || pal.ink, a);
        x.fillText(ch, cx, ty + jy);
      }
      cx += cw;
    }
    x.restore();
    return cx;
  }
  // heavy black redaction bar — the signature gesture, ghost of text beneath
  function redact(bx, by, bw, bh) {
    // faint ghost of "redacted" type below
    x.save();
    x.font = mono(bh * 0.62);
    x.fillStyle = K.rgba(pal.faint, 0.5);
    x.fillText(gibberish((bw / (bh * 0.42)) | 0), bx + 3, by + bh * 0.78);
    x.restore();
    // the bar itself — not perfectly opaque, marker-ink texture
    x.save();
    x.fillStyle = K.rgba(pal.bar, 0.93);
    x.fillRect(bx, by, bw, bh);
    // uneven ink edges / overstrike
    x.fillStyle = K.rgba(pal.bar, 0.5);
    x.fillRect(bx - 2, by + bh * 0.1, bw + 4, bh * 0.2);
    x.fillRect(bx + bw * 0.05, by + bh * 0.6, bw * 0.92, bh * 0.3);
    // crisp marker texture WITHIN the bar — short strokes, no full-height drips
    for (let i = 0; i < bw / 14; i++) {
      x.fillStyle = K.rgba(pal.bar, 0.25 + r() * 0.4);
      const sy = by + r() * bh * 0.6;
      x.fillRect(bx + r() * bw, sy, 2 + r() * 4, bh * (0.25 + r() * 0.35));
    }
    // faint inked over-edge top & bottom (pressed marker), kept tight
    x.fillStyle = K.rgba(pal.bar, 0.3);
    x.fillRect(bx - 1, by - 1, bw + 2, 1.5);
    x.fillRect(bx - 1, by + bh - 0.5, bw + 2, 1.5);
    x.restore();
  }
  // rubber stamp — rotated outlined shape + text, smudged ink
  function stamp(sx, sy, txt, scale, forceRound) {
    const col = pal.accent;
    const ang = (r() - 0.5) * 0.5;
    x.save();
    x.translate(sx, sy); x.rotate(ang);
    x.globalAlpha = 0.62 + r() * 0.22;
    x.strokeStyle = col; x.fillStyle = col;
    const round = forceRound != null ? forceRound : r() < 0.4;
    const fs = 22 * scale;
    x.font = mono(fs, 'bold ');
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const tw = txt.length * fs * 0.62;
    if (round) {
      const rad = Math.max(tw * 0.6, fs * 1.8);
      x.lineWidth = 2.4 * scale;
      x.beginPath(); x.arc(0, 0, rad, 0, 7); x.stroke();
      x.beginPath(); x.arc(0, 0, rad * 0.78, 0, 7); x.globalAlpha *= 0.7; x.stroke(); x.globalAlpha /= 0.7;
      x.fillText(txt, 0, 0);
    } else {
      x.lineWidth = 3 * scale;
      const pw = tw + fs * 1.1, ph = fs * 1.9;
      x.strokeRect(-pw / 2, -ph / 2, pw, ph);
      x.fillText(txt, 0, 0);
    }
    // smudge: scatter ink so it reads as pressed rubber, not vector
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 70 * scale; i++) {
      x.globalAlpha = 0.04 + r() * 0.1;
      const a2 = r() * 7, rr = (forceRound || round) ? (fs * 1.8 + r() * fs) : (r() - 0.5) * tw;
      if (round) x.fillRect(Math.cos(a2) * (fs * 1.9), Math.sin(a2) * (fs * 1.9), 1.5, 1.5);
      else x.fillRect(rr, (r() - 0.5) * fs * 1.6, 1.5, 1.5);
    }
    x.restore();
  }
  // hole punches down the left margin
  function holePunches() {
    const n = 2 + (r() * 2 | 0);
    for (let i = 0; i < n; i++) {
      const hy = fT + (fB - fT) * ((i + 1) / (n + 1));
      const hx = W * 0.045, hr = S * 0.014;
      x.save();
      x.fillStyle = K.rgba('#000', 0.0);
      // punched hole = darker recess ring + paper-coloured centre
      const g = x.createRadialGradient(hx, hy, 0, hx, hy, hr * 1.6);
      g.addColorStop(0, K.rgba(pal.faint, 0.0));
      g.addColorStop(0.7, K.rgba(pal.bar, 0.0));
      g.addColorStop(0.72, K.rgba(pal.bar, 0.35));
      g.addColorStop(1, K.rgba(pal.bar, 0));
      x.fillStyle = g; x.fillRect(hx - hr * 2, hy - hr * 2, hr * 4, hr * 4);
      x.fillStyle = K.mix(pal.paper, '#fff', 0.18);
      x.beginPath(); x.arc(hx, hy, hr, 0, 7); x.fill();
      x.strokeStyle = K.rgba(pal.faint, 0.5); x.lineWidth = 1; x.stroke();
      x.restore();
    }
  }
  // staple mark top-left
  function staple() {
    x.save();
    x.translate(fL + W * 0.02, fT - H * 0.018); x.rotate(-0.7 + (r() - 0.5) * 0.3);
    x.strokeStyle = K.rgba(pal.faint, 0.85); x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(S * 0.03, 0); x.stroke();
    x.fillStyle = K.rgba(pal.faint, 0.4);
    x.fillRect(-1, -1, S * 0.032, 3);
    x.restore();
  }
  // signature scrawl
  function signature(cx, cy, w) {
    x.save();
    x.strokeStyle = K.rgba(pal.carbon ? pal.accent : pal.ink, 0.78);
    x.lineWidth = 1.6 + r() * 1.2; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    let px2 = cx, py2 = cy;
    x.moveTo(px2, py2);
    const loops = 5 + (r() * 4 | 0);
    for (let i = 0; i < loops; i++) {
      const nx = cx + (i / loops) * w + (r() - 0.5) * w * 0.08;
      const ny = cy - Math.sin(i * 1.7 + r()) * (8 + r() * 14);
      const mx = (px2 + nx) / 2 + (r() - 0.5) * 20;
      const my = py2 - 14 - r() * 22;
      x.quadraticCurveTo(mx, my, nx, ny);
      px2 = nx; py2 = ny;
    }
    x.stroke();
    x.restore();
  }
  // a ruled horizontal line
  function rule(y, alpha, col) {
    x.strokeStyle = K.rgba(col || pal.faint, alpha == null ? 0.45 : alpha);
    x.lineWidth = pal.thin ? 0.8 : 1.1;
    x.beginPath(); x.moveTo(fL, y); x.lineTo(fR, y); x.stroke();
  }

  /* ── PRE-PRINTED FORM CHROME (faint border + header rule) ───────────── */
  function pageFrame() {
    x.strokeStyle = K.rgba(pal.faint, 0.55); x.lineWidth = pal.heavy ? 1.6 : 1.1;
    x.strokeRect(fL, fT, fW, fB - fT);
    if (pal.heavy) { x.strokeStyle = K.rgba(pal.faint, 0.3); x.strokeRect(fL - 5, fT - 5, fW + 10, fB - fT + 10); }
  }

  // document header block (institutional letterhead, deadpan)
  function header(title, subtitle) {
    typeLine(fL + 6, fT + H * 0.034, title, S * 0.0235, pal.ink, 0.92, { flat: true, bold: true });
    if (subtitle) typeLine(fL + 6, fT + H * 0.056, subtitle, S * 0.0135, pal.faint, 0.8, { flat: true });
    const refY = fT + H * 0.075;
    typeLine(fR - W * 0.26, fT + H * 0.034, 'REF ' + (r() * 9e5 + 1e5 | 0), S * 0.013, pal.faint, 0.75, { flat: true });
    typeLine(fR - W * 0.26, fT + H * 0.052, '28 JUN 2026', S * 0.013, pal.faint, 0.7, { flat: true });
    rule(refY, 0.6, pal.ink);
    return refY + H * 0.02;
  }

  /* ════════════════ COMPOSE PER MODE ════════════════ */
  let topY = fT + H * 0.02;

  if (mode === 'Ledger') {
    topY = header('PROVENANCE LEDGER', 'acquisitions · valuations · disposals');
    // column headers
    const colX = [fL + 6, fL + fW * 0.46, fL + fW * 0.68, fL + fW * 0.86];
    typeLine(colX[0], topY + H * 0.012, 'ITEM', S * 0.0125, pal.faint, 0.8, { flat: true });
    typeLine(colX[1], topY + H * 0.012, 'PROVENANCE', S * 0.0125, pal.faint, 0.8, { flat: true });
    typeLine(colX[2], topY + H * 0.012, 'VALUE', S * 0.0125, pal.faint, 0.8, { flat: true });
    typeLine(colX[3], topY + H * 0.012, 'NOTE', S * 0.0125, pal.faint, 0.8, { flat: true });
    let y = topY + H * 0.03;
    const rows = 14 + (r() * 6 | 0);
    const rowH = (fB - y - H * 0.06) / rows;
    const fs = K.clamp(rowH * 0.5, 9, S * 0.0135);
    for (let i = 0; i < rows; i++) {
      rule(y + rowH, 0.22);
      const idx = ('00' + (i + 1)).slice(-3);
      typeLine(colX[0], y + rowH * 0.72, idx + '  LOT ' + gibberish(4, 0.7), fs, pal.ink, 0.8);
      typeLine(colX[1], y + rowH * 0.72, gibberish(8, 0.3), fs, pal.ink, 0.7);
      // some VALUE cells redacted, the rest are money
      if (r() < 0.42) redact(colX[2], y + rowH * 0.22, fW * 0.15, rowH * 0.62);
      else typeLine(colX[2], y + rowH * 0.72, money(), fs, pal.ink, 0.85);
      if (r() < 0.3) typeLine(colX[3], y + rowH * 0.72, K.pick(MARKS, r), fs, pal.accent, 0.8);
      y += rowH;
    }
    // impossible sum line
    x.lineWidth = 1.6; rule(y + H * 0.006, 0.7, pal.ink); rule(y + H * 0.01, 0.7, pal.ink);
    typeLine(colX[1], y + H * 0.04, 'TOTAL VALUATION', S * 0.015, pal.ink, 0.9, { flat: true, bold: true });
    typeLine(colX[2], y + H * 0.04, '$  ' + K.pick(SUMS, r), S * 0.022, pal.accent, 0.95, { flat: true, bold: true });
    if (r() < 0.7) stamp(fR - W * 0.16, fB - H * 0.07, K.pick(['PRICELESS', 'NO VALUE', '‰'], r), 1.0);

  } else if (mode === 'Form') {
    topY = header('VALUATION CERTIFICATE', 'to be completed in full · do not leave blank');
    let y = topY + H * 0.02;
    const labels = ['NAME OF WORK', 'MEDIUM', 'DIMENSIONS', 'DATE OF ORIGIN', 'PRIOR OWNER', 'DECLARED VALUE', 'BASIS OF VALUE', 'SIGNATURE'];
    const fieldH = (fB - y - H * 0.04) / labels.length;
    for (let i = 0; i < labels.length; i++) {
      const fy = y + i * fieldH;
      typeLine(fL + 6, fy + fieldH * 0.42, labels[i], S * 0.0125, pal.faint, 0.85, { flat: true });
      const bx = fL + fW * 0.34, bw = fW * 0.64, by = fy + fieldH * 0.16, bh = fieldH * 0.62;
      // field box
      x.strokeStyle = K.rgba(pal.faint, 0.5); x.lineWidth = 1; x.strokeRect(bx, by, bw, bh);
      // fill behaviour
      const fs = K.clamp(bh * 0.5, 10, S * 0.014);
      if (labels[i] === 'DECLARED VALUE') {
        // a price tag with no number — empty, then "$" alone
        typeLine(bx + 8, by + bh * 0.72, '$', fs * 1.3, pal.accent, 0.9, { flat: true, bold: true });
      } else if (labels[i] === 'BASIS OF VALUE') {
        redact(bx + 6, by + bh * 0.2, bw * 0.7, bh * 0.6);
      } else if (labels[i] === 'SIGNATURE') {
        signature(bx + 16, by + bh * 0.75, bw * 0.5);
      } else if (r() < 0.7) {
        typeLine(bx + 8, by + bh * 0.72, gibberish(10 + (r() * 8 | 0), 0.35), fs, pal.ink, 0.78);
      }
      // checkbox column at far edge
      const ckx = fR - W * 0.04;
      x.strokeStyle = K.rgba(pal.faint, 0.6); x.strokeRect(ckx, fy + fieldH * 0.3, S * 0.022, S * 0.022);
      if (r() < 0.5) { typeLine(ckx + 1, fy + fieldH * 0.3 + S * 0.02, '✓', S * 0.02, pal.accent, 0.9, { flat: true, bold: true }); }
    }
    stamp(fR - W * 0.2, fT + H * 0.16, K.pick(['VOID', 'TBD', 'CERTIFIED'], r), 1.05);
    if (r() < 0.6) stamp(fL + W * 0.22, fB - H * 0.1, K.pick(['PAID', 'NULL'], r), 0.9, true);

  } else if (mode === 'Redacted') {
    topY = header('CLASSIFIED ' + K.pick(['VALUATION', 'PROVENANCE', 'APPRAISAL'], r), null);
    let y = topY + H * 0.03;
    const rows = 16 + (r() * 8 | 0);
    const rowH = (fB - y - H * 0.04) / rows;
    for (let i = 0; i < rows; i++) {
      const ly = y + i * rowH;
      const fs = K.clamp(rowH * 0.6, 9, S * 0.014);
      // mostly black bars over faint type — minimal, bold
      if (r() < 0.78) {
        const segs = 1 + (r() * 2 | 0);
        let xc = fL + 6;
        for (let s = 0; s < segs; s++) {
          const bw = fW * (0.18 + r() * 0.5);
          if (xc + bw > fR) break;
          redact(xc, ly + rowH * 0.15, bw, rowH * 0.62);
          xc += bw + fW * (0.03 + r() * 0.06);
        }
      } else {
        // a rare un-redacted line: a single price or mark left visible
        typeLine(fL + 6, ly + rowH * 0.72, (r() < 0.5 ? money() : gibberish(14, 0.4)), fs, pal.ink, 0.7);
      }
    }
    // one stamp punches through the black
    stamp(W * (0.36 + r() * 0.28), H * (0.4 + r() * 0.3), K.pick(['REDACTED', 'PRICELESS', '‰', 'NO VALUE'], r), 1.4);

  } else if (mode === 'Statement') {
    topY = header('STATEMENT OF ACCOUNT', 'amount now due · remit on receipt');
    typeLine(fL + 6, topY + H * 0.02, 'BILL TO:  ' + gibberish(12, 0.2), S * 0.013, pal.ink, 0.8, { flat: true });
    let y = topY + H * 0.05;
    const colX = [fL + 6, fL + fW * 0.58, fL + fW * 0.82];
    typeLine(colX[0], y, 'DESCRIPTION', S * 0.0125, pal.faint, 0.8, { flat: true });
    typeLine(colX[1], y, 'QTY', S * 0.0125, pal.faint, 0.8, { flat: true });
    typeLine(colX[2], y, 'AMOUNT', S * 0.0125, pal.faint, 0.8, { flat: true });
    rule(y + H * 0.008, 0.5, pal.ink);
    y += H * 0.028;
    const items = ['THE UNVALUABLE', 'ONE (1) IDEA', 'PROVENANCE, INTANGIBLE', 'AIR, FRAMED', 'A SINGLE PRICE', 'DISCUSSION, PERPETUAL', 'NOTHING IN PARTICULAR', 'GOODWILL'];
    const rows = 8 + (r() * 2 | 0);
    const rowH = H * 0.042;
    for (let i = 0; i < rows; i++) {
      typeLine(colX[0], y + rowH * 0.7, K.pick(items, r), S * 0.016, pal.ink, 0.95, { flat: true });
      typeLine(colX[1], y + rowH * 0.7, '' + (1 + (r() * 3 | 0)), S * 0.016, pal.ink, 0.9, { flat: true });
      if (r() < 0.5) redact(colX[2], y + rowH * 0.18, fW * 0.16, rowH * 0.5);
      else typeLine(colX[2], y + rowH * 0.7, money(), S * 0.016, pal.ink, 0.92, { flat: true });
      rule(y + rowH, 0.2);
      y += rowH;
    }
    // totals block — subtotal/tax/total, total impossible
    y += H * 0.01;
    x.lineWidth = 1.4; rule(y, 0.6, pal.ink);
    const lab = ['SUBTOTAL', 'ADJUSTMENT', 'AMOUNT DUE'];
    const val = [money(), K.pick(MARKS, r), K.pick(SUMS, r)];
    for (let i = 0; i < 3; i++) {
      const ly = y + H * 0.03 + i * H * 0.034;
      const last = i === 2;
      typeLine(colX[1], ly, lab[i], S * (last ? 0.019 : 0.015), pal.ink, last ? 0.98 : 0.85, { flat: true, bold: last });
      typeLine(colX[2], ly, last ? val[i] : '$ ' + val[i], S * (last ? 0.03 : 0.015), last ? pal.accent : pal.ink, last ? 0.98 : 0.85, { flat: true, bold: last });
    }
    stamp(fL + W * 0.2, fB - H * 0.08, K.pick(['PAID', 'VOID', 'TBD'], r), 1.1, true);

  } else if (mode === 'Memo') {
    topY = header('INTERNAL MEMORANDUM', null);
    let y = topY + H * 0.012;
    const meta = [['TO', gibberish(10, 0.1)], ['FROM', 'OFFICE OF VALUATION'], ['RE', 'THE PRICE OF ' + K.pick(['NOTHING', 'EVERYTHING', 'THIS'], r)], ['DATE', '28 JUN 2026']];
    for (const m of meta) {
      typeLine(fL + 6, y + H * 0.026, m[0] + ':', S * 0.0135, pal.faint, 0.85, { flat: true });
      typeLine(fL + W * 0.12, y + H * 0.026, m[1], S * 0.0135, pal.ink, 0.85, { flat: true });
      y += H * 0.03;
    }
    rule(y, 0.5, pal.ink);
    y += H * 0.03;
    // typed paragraph block, sparse + partly redacted
    const lines = 8 + (r() * 4 | 0);
    const lh = H * 0.034;
    const fs = S * 0.0135;
    for (let i = 0; i < lines; i++) {
      const ly = y + i * lh;
      if (r() < 0.28) {
        redact(fL + 6 + r() * fW * 0.2, ly - fs * 0.8, fW * (0.3 + r() * 0.5), fs * 1.15);
      } else {
        const n = 30 + (r() * 18 | 0);
        typeLine(fL + 6, ly, gibberish(n, 0.22).replace(/[0-9]/g, (d) => r() < 0.7 ? String.fromCharCode(97 + ((r() * 26) | 0)) : d), fs, pal.ink, 0.7);
      }
    }
    // closing: deadpan one-liner + signature + date stamp
    const cy = y + lines * lh + H * 0.02;
    typeLine(fL + 6, cy, K.pick(['VALUE TO BE DETERMINED.', 'PRICE WITHHELD PENDING DISCUSSION.', 'SEE ATTACHED. NOTHING IS ATTACHED.'], r), fs, pal.ink, 0.82, { flat: true });
    signature(fR - W * 0.32, cy + H * 0.06, W * 0.22);
    typeLine(fR - W * 0.32, cy + H * 0.08, '_______________________', fs * 0.9, pal.faint, 0.6, { flat: true });
    stamp(fR - W * 0.18, fT + H * 0.05, K.pick(['CONFIDENTIAL', 'DRAFT', '‰'], r), 0.9);

  } else { // Punchcard
    topY = header('DATA CARD', 'do not fold, spindle, or value');
    let y = topY + H * 0.02;
    // dot-matrix field of punched holes + sparse numeral rows
    const cols = 26 + (r() * 8 | 0);
    const gridRows = 10 + (r() * 4 | 0);
    const gx = fL + 6, gw = fW - 12;
    const gh = (fB - y - H * 0.12);
    const cw = gw / cols, ch = gh / gridRows;
    // numeral header row (dot-matrix digits 0-9 repeated)
    for (let c = 0; c < cols; c++) {
      typeLine(gx + c * cw + cw * 0.18, y - 2, '' + (c % 10), K.clamp(cw * 0.8, 7, 12), pal.faint, 0.6, { flat: true });
    }
    for (let rr = 0; rr < gridRows; rr++) {
      for (let c = 0; c < cols; c++) {
        const hx = gx + c * cw + cw / 2, hy = y + ch * 0.4 + rr * ch + ch / 2;
        const hr = Math.min(cw, ch) * 0.16;
        if (r() < 0.34) {
          // punched (rectangular hole, recessed)
          x.fillStyle = K.rgba(pal.bar, 0.82);
          x.fillRect(hx - hr, hy - hr * 1.6, hr * 2, hr * 3.2);
          x.fillStyle = K.mix(pal.paper, '#fff', 0.2);
          x.fillRect(hx - hr * 0.6, hy - hr * 1.2, hr * 1.2, hr * 2.4);
        } else {
          // unpunched position marker (faint dot)
          x.fillStyle = K.rgba(pal.faint, 0.3);
          x.beginPath(); x.arc(hx, hy, hr * 0.45, 0, 7); x.fill();
        }
      }
    }
    // a row of dot-matrix figures at the foot, ending in an impossible sum
    const fy = y + gh + H * 0.04;
    typeLine(gx, fy, gibberish(cols - 8, 0.85), S * 0.016, pal.ink, 0.78);
    typeLine(fR - W * 0.18, fy, '= ' + K.pick(SUMS, r), S * 0.02, pal.accent, 0.92, { flat: true, bold: true });
    // corner cut (the canonical punchcard clipped corner)
    x.save(); x.fillStyle = pal.paper2;
    x.beginPath(); x.moveTo(fR, fT); x.lineTo(fR - W * 0.05, fT); x.lineTo(fR, fT + H * 0.04); x.closePath();
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.fill();
    x.restore();
    stamp(fL + W * 0.22, fB - H * 0.06, K.pick(['VOID', '‰', 'TBD'], r), 0.95);
  }

  /* ── universal document furniture ────────────────────────────────────── */
  pageFrame();
  if (mode !== 'Punchcard') holePunches();
  if (r() < 0.6) staple();
  // a second faint contradictory stamp (institutional critique: two truths)
  if (r() < 0.45 && mode !== 'Redacted') {
    stamp(W * (0.3 + r() * 0.4), H * (0.55 + r() * 0.3), K.pick(STAMPS, r), 0.85 + r() * 0.4);
  }

  x.restore(); // end skew

  /* ── PAPER TEXTURE / AGE / ATMOSPHERE (minimal haze, real grain) ─────── */
  // fibrous mottle of the stock
  K.mottle(x, 0, 0, W, H, pal.paper, 30, r, 'overlay');
  // carbon-copy whole-page offset ghost (Carbon palette only)
  if (pal.carbon) {
    x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.06;
    x.drawImage(cv, 3, 3); x.restore();
  }
  // thermal fade — top corners vanish like an old receipt
  if (pal.fade) {
    const fg = x.createLinearGradient(0, 0, W * 0.4, H * 0.5);
    fg.addColorStop(0, K.rgba(pal.paper, 0.7)); fg.addColorStop(1, K.rgba(pal.paper, 0));
    x.fillStyle = fg; x.fillRect(0, 0, W, H);
  }
  // very faint warm haze sheet — paper is dry, so keep it low
  const hazeCol = K.mix(pal.paper, '#fff', 0.4);
  K.hazeSheet(x, W, H, noise, hazeCol, 0.10, S * 1.1, 'screen');
  // coffee-ring / foxing stain on some sheets
  if (r() < 0.5) {
    const sx = W * (0.2 + r() * 0.6), sy = H * (0.2 + r() * 0.6), sr = S * (0.07 + r() * 0.08);
    x.save(); x.globalCompositeOperation = 'multiply';
    const g = x.createRadialGradient(sx, sy, sr * 0.7, sx, sy, sr);
    g.addColorStop(0, K.rgba(K.mix(pal.paper, '#6b4a25', 0.5), 0));
    g.addColorStop(0.85, K.rgba(K.mix(pal.paper, '#6b4a25', 0.5), 0.12));
    g.addColorStop(1, K.rgba(K.mix(pal.paper, '#6b4a25', 0.5), 0));
    x.fillStyle = g; x.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    x.restore();
  }
  K.grain(x, W, H, 6, r);
  K.vignette(x, W, H, pal.heavy ? 0.34 : 0.22);
}

export const provenanceTraits: TraitsFn = (seed) => {
  const r = K.rng(seed);
  const pal = K.pick(PALS, r);
  r();
  const mode = MODES[(seed * 5) % MODES.length];
  const fmt = K.pick(FORMATS, r);
  const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
  return { Palette: pal.name, Document: mode, Format: f };
};

export const provenanceSchema: TraitSchema = {
  traits: [
    { name: 'Palette',  values: PALS.map((p) => p.name) },
    { name: 'Document', values: MODES },
    { name: 'Format',   values: ['Portrait', 'Square', 'Landscape'] },
  ],
};

export const renderProvenance: EngineFn = blit(draw, provenanceTraits);

// W/H of portrait / square / landscape (matches FORMATS order).
export const PROVENANCE_ASPECTS = [1000 / 1280, 1, 1280 / 980] as const;

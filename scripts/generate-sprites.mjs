// Procedural sprite atlas generator — every texture in the game is authored
// here, in code. 32px tiles, 3/4 top-down, Pokémon Gen 1/2 palette discipline:
// limited ramps, dark outlines, restrained dithering.
//
// Source of truth for WHAT to draw: packages/shared/dist/assets/asset-catalog.js
// (build @potential/shared first). Output: apps/desktop/public/sprites/atlas.png
// + atlas.json (id -> atlas rect [+ frame metadata for characters]).
//
// Usage: node scripts/generate-sprites.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./png.mjs";
import { ASSET_CATALOG } from "../packages/shared/dist/assets/asset-catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "apps", "desktop", "public", "sprites");
const T = 32; // tile size
const ATLAS_W = 1024;

// ───────────────────────────── surface ─────────────────────────────

class Surface {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }
  px(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c === null) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3] ?? 255;
  }
  rect(x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
  }
  outline(x, y, w, h, c) {
    for (let xx = x; xx < x + w; xx++) {
      this.px(xx, y, c);
      this.px(xx, y + h - 1, c);
    }
    for (let yy = y; yy < y + h; yy++) {
      this.px(x, yy, c);
      this.px(x + w - 1, yy, c);
    }
  }
  hline(x, y, w, c) {
    for (let i = 0; i < w; i++) this.px(x + i, y, c);
  }
  vline(x, y, h, c) {
    for (let i = 0; i < h; i++) this.px(x, y + i, c);
  }
  disc(cx, cy, r, c) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.4) this.px(cx + x, cy + y, c);
  }
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.data[i + 3] > 0) {
          const j = ((dy + y) * this.w + (dx + x)) * 4;
          this.data[j] = src.data[i];
          this.data[j + 1] = src.data[i + 1];
          this.data[j + 2] = src.data[i + 2];
          this.data[j + 3] = src.data[i + 3];
        }
      }
  }
}

// ───────────────────────────── palette ─────────────────────────────

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const shade = (c, f) => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f), c[3] ?? 255];

const OUT = hex("#23213a"); // universal dark outline
const P = {
  wood: hex("#b08148"),
  woodDark: hex("#8a6234"),
  woodLight: hex("#cda36b"),
  woodPale: hex("#e3c391"),
  metal: hex("#9aa3b2"),
  metalDark: hex("#6c7585"),
  steel: hex("#c3cad6"),
  white: hex("#f2f2ee"),
  offwhite: hex("#e0ded2"),
  cream: hex("#efe6c8"),
  gray: hex("#9b9b94"),
  grayDark: hex("#6f6f68"),
  charcoal: hex("#45454d"),
  red: hex("#c54e44"),
  redDark: hex("#93362f"),
  orange: hex("#dd8a3c"),
  yellow: hex("#e3c350"),
  green: hex("#5d9e4c"),
  greenDark: hex("#3f7434"),
  greenPale: hex("#8cc47a"),
  teal: hex("#4a9a8e"),
  blue: hex("#4f74b3"),
  blueDark: hex("#3a5584"),
  bluePale: hex("#9db8dd"),
  navy: hex("#33415e"),
  purple: hex("#8961a8"),
  pink: hex("#d893ad"),
  brown: hex("#7d5639"),
  brownDark: hex("#5b3d27"),
  tan: hex("#d9b98c"),
  sand: hex("#e0cf96"),
  skinLight: hex("#f0c8a0"),
  skinMed: hex("#c89064"),
  skinDark: hex("#8a5c3c"),
  hairBrown: hex("#5e4228"),
  hairBlack: hex("#2d2a33"),
  hairBlonde: hex("#d8b35a"),
  hairGray: hex("#b9b9b9"),
  screen: hex("#3a4a52"),
  screenGlow: hex("#7fd4c1"),
};

// Deterministic per-asset RNG (mulberry32 over a string hash).
function rngFor(id) {
  let h = 1779033703;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────── shared draw helpers ─────────────────────────

function shadow(s, pad = 3) {
  const y = s.h - 3;
  for (let x = pad; x < s.w - pad; x++) {
    s.px(x, y, [20, 20, 35, 70]);
    s.px(x, y + 1, [20, 20, 35, 45]);
  }
}

/** A 3/4-view box: visible top face + front face, outlined. */
function box3q(s, x, y, w, h, depth, face, top) {
  s.rect(x, y, w, depth, top);
  s.rect(x, y + depth, w, h - depth, face);
  s.hline(x, y + depth, w, shade(face, 0.8));
  s.outline(x, y, w, h, OUT);
}

function legs(s, x, y, w, h, color) {
  s.rect(x, y, 2, h, color);
  s.rect(x + w - 2, y, 2, h, color);
  s.px(x, y + h - 1, OUT);
  s.px(x + w - 1, y + h - 1, OUT);
}

// ───────────────────────── floor & wall tiles ─────────────────────────

function drawFloor(s, id) {
  const rnd = rngFor(id);
  const speckle = (base, dark, density = 0.06) => {
    s.rect(0, 0, T, T, base);
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) if (rnd() < density) s.px(x, y, dark);
  };
  switch (id) {
    case "floor_wood":
    case "floor_gym": {
      const base = id === "floor_gym" ? P.woodPale : P.woodLight;
      s.rect(0, 0, T, T, base);
      for (let row = 0; row < 4; row++) {
        s.hline(0, row * 8 + 7, T, shade(base, 0.75));
        const off = (row % 2) * 16 + 8;
        s.vline(off, row * 8, 8, shade(base, 0.8));
      }
      if (id === "floor_gym") s.hline(0, 15, T, shade(P.orange, 0.9));
      break;
    }
    case "floor_carpet":
      speckle(hex("#b06a5a"), hex("#9c5b4c"), 0.18);
      break;
    case "floor_tile": {
      s.rect(0, 0, T, T, P.offwhite);
      for (const k of [0, 16]) {
        s.hline(0, k + 15, T, shade(P.offwhite, 0.8));
        s.vline(k + 15, 0, T, shade(P.offwhite, 0.8));
      }
      break;
    }
    case "floor_linoleum":
      speckle(hex("#d8d3bc"), hex("#c4bfa6"), 0.1);
      break;
    case "floor_concrete":
      speckle(hex("#a8a8a2"), hex("#94948e"), 0.08);
      s.hline(4, 20, 9, hex("#90908a"));
      break;
    case "floor_grass": {
      speckle(hex("#6cab57"), hex("#5c974a"), 0.2);
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(rnd() * 30),
          y = Math.floor(rnd() * 29) + 2;
        s.px(x, y, P.greenDark);
        s.px(x + 1, y - 1, P.greenDark);
      }
      break;
    }
    case "floor_dirt":
      speckle(hex("#a87f54"), hex("#946e46"), 0.14);
      break;
    case "floor_asphalt":
      speckle(hex("#5d5d63"), hex("#52525a"), 0.1);
      break;
    case "floor_sand":
      speckle(P.sand, shade(P.sand, 0.88), 0.12);
      break;
    default:
      speckle(P.gray, shade(P.gray, 0.9));
  }
}

function drawWall(s, id) {
  const rnd = rngFor(id);
  const face = (base, band) => {
    s.rect(0, 0, T, T, base);
    s.rect(0, 0, T, 4, shade(base, 0.72)); // top edge (ceiling shadow)
    if (band) s.rect(0, 22, T, 6, band);
    s.rect(0, 28, T, 4, shade(base, 0.6)); // baseboard
  };
  switch (id) {
    case "wall_plaster":
      face(P.cream, null);
      break;
    case "wall_wallpaper": {
      face(hex("#e8d9b8"), null);
      for (let x = 3; x < T; x += 8) s.vline(x, 4, 24, hex("#d9c39a"));
      break;
    }
    case "wall_brick": {
      s.rect(0, 0, T, T, hex("#a05a45"));
      for (let row = 0; row < 8; row++) {
        s.hline(0, row * 4 + 3, T, hex("#7e4434"));
        const off = (row % 2) * 8;
        for (let x = off; x < T; x += 16) s.vline(x, row * 4, 4, hex("#7e4434"));
      }
      s.rect(0, 0, T, 2, shade(hex("#a05a45"), 0.7));
      break;
    }
    case "wall_school":
      face(hex("#e6e0c6"), P.teal);
      break;
    case "wall_hospital":
      face(P.white, hex("#a8cfc4"));
      break;
    case "wall_office":
      face(hex("#d4d4cd"), hex("#b9b9b1"));
      break;
    case "wall_industrial": {
      s.rect(0, 0, T, T, hex("#8e9296"));
      for (let row = 0; row < 4; row++) {
        s.hline(0, row * 8 + 7, T, hex("#74787c"));
        const off = (row % 2) * 16;
        s.vline(off + 15, row * 8, 8, hex("#74787c"));
      }
      s.rect(0, 0, T, 3, shade(hex("#8e9296"), 0.7));
      break;
    }
    case "wall_hedge": {
      s.rect(0, 0, T, T, P.greenDark);
      for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) if (rnd() < 0.3) s.px(x, y, P.green);
      for (let i = 0; i < 14; i++) s.px(Math.floor(rnd() * T), Math.floor(rnd() * T), P.greenPale);
      break;
    }
    default:
      face(P.gray, null);
  }
}

// ───────────────────────── character sprites ─────────────────────────
// 12 frames: [down, up, left, right] x [stand, stepA, stepB]. 32x32 each.

const CHAR_STYLES = {
  chr_baby: { stage: "baby", skin: P.skinLight, hair: P.hairBrown, shirt: P.pink, pants: P.white },
  chr_toddler: { stage: "toddler", skin: P.skinLight, hair: P.hairBrown, shirt: P.yellow, pants: P.green },
  chr_child: { stage: "child", skin: P.skinMed, hair: P.hairBlack, shirt: P.red, pants: P.blue },
  chr_teen: { stage: "teen", skin: P.skinLight, hair: P.hairBlack, shirt: P.purple, pants: P.charcoal },
  chr_adult_casual: { stage: "adult", skin: P.skinMed, hair: P.hairBrown, shirt: P.green, pants: P.navy },
  chr_adult_formal: { stage: "adult", skin: P.skinLight, hair: P.hairBlack, shirt: P.navy, pants: P.charcoal },
  chr_adult_worker: { stage: "adult", skin: P.skinDark, hair: P.hairBlack, shirt: P.orange, pants: P.blueDark },
  chr_middle_aged: { stage: "adult", skin: P.skinMed, hair: P.hairBrown, shirt: P.brown, pants: P.charcoal },
  chr_senior: { stage: "senior", skin: P.skinLight, hair: P.hairGray, shirt: P.teal, pants: P.grayDark },
  chr_doctor: { stage: "adult", skin: P.skinMed, hair: P.hairBlack, shirt: P.white, pants: P.bluePale },
  chr_nurse: { stage: "adult", skin: P.skinLight, hair: P.hairBlonde, shirt: P.bluePale, pants: P.white },
  chr_teacher: { stage: "adult", skin: P.skinDark, hair: P.hairBlack, shirt: P.yellow, pants: P.brown },
  chr_police: { stage: "adult", skin: P.skinMed, hair: P.hairBlack, shirt: P.blueDark, pants: P.navy },
  chr_chef: { stage: "adult", skin: P.skinLight, hair: P.hairBrown, shirt: P.white, pants: P.charcoal },
};

// Variant ids (chr_x_b/_c/_d) keep the base silhouette but reroll skin, hair,
// and clothing from these pools — deterministic per id, so every villager in
// the catalog has a stable, distinct look.
const SKIN_POOL = [P.skinLight, P.skinMed, P.skinDark];
const HAIR_POOL = [P.hairBrown, P.hairBlack, P.hairBlonde, P.hairGray, P.redDark];
const SHIRT_POOL = [P.red, P.blue, P.purple, P.teal, P.yellow, P.pink, P.orange, P.greenPale, P.offwhite, P.brown];
const PANTS_POOL = [P.navy, P.charcoal, P.brownDark, P.blueDark, P.grayDark, P.greenDark];

function styleFor(id) {
  const direct = CHAR_STYLES[id];
  if (direct) return direct;
  const m = id.match(/^(chr_.+)_[bcd]$/);
  const base = m ? CHAR_STYLES[m[1]] : null;
  if (!base) return CHAR_STYLES.chr_adult_casual;
  const rnd = rngFor(id);
  const pick = (pool, avoid) => {
    const choice = pool[Math.floor(rnd() * pool.length)];
    return choice === avoid ? pool[(pool.indexOf(choice) + 1) % pool.length] : choice;
  };
  return {
    stage: base.stage,
    skin: pick(SKIN_POOL),
    hair: base.stage === "senior" ? pick([P.hairGray, P.white]) : pick(HAIR_POOL, P.hairGray),
    shirt: pick(SHIRT_POOL, base.shirt),
    pants: pick(PANTS_POOL, base.pants),
  };
}

function drawHumanFrame(s, style, dir, step) {
  // step: 0 stand, 1 left leg forward, 2 right leg forward
  const stage = style.stage;
  if (stage === "baby") return drawBabyFrame(s, style, dir, step);

  const dims = { toddler: { h: 18, headW: 9 }, child: { h: 22, headW: 9 }, teen: { h: 26, headW: 10 }, adult: { h: 27, headW: 10 }, senior: { h: 26, headW: 10 } }[stage];
  const cx = 16;
  const top = 31 - dims.h;
  const headW = dims.headW;
  const headH = Math.round(headW * 0.9);
  const bodyH = Math.round(dims.h * 0.34);
  const legH = dims.h - headH - bodyH;
  const bob = step === 0 ? 0 : 1;

  const hx = cx - Math.floor(headW / 2);
  const hy = top + bob;

  // legs
  const legY = hy + headH + bodyH;
  const legW = 3;
  const lOff = step === 1 ? -1 : step === 2 ? 1 : 0;
  const rOff = step === 1 ? 1 : step === 2 ? -1 : 0;
  if (dir === "left" || dir === "right") {
    const f = dir === "left" ? -1 : 1;
    s.rect(cx - 3 + f * lOff, legY, legW, legH - Math.abs(lOff), style.pants);
    s.rect(cx + 0 + f * rOff, legY, legW, legH - Math.abs(rOff), style.pants);
  } else {
    s.rect(cx - 4, legY, legW, legH + (step === 1 ? -1 : 0), style.pants);
    s.rect(cx + 1, legY, legW, legH + (step === 2 ? -1 : 0), style.pants);
  }
  // shoes
  s.hline(cx - 4, legY + legH - 1 + (step === 1 ? -1 : 0), 3, OUT);
  s.hline(cx + 1, legY + legH - 1 + (step === 2 ? -1 : 0), 3, OUT);

  // torso
  const bw = headW + 2;
  const bx = cx - Math.floor(bw / 2);
  const by = hy + headH;
  s.rect(bx, by, bw, bodyH, style.shirt);
  s.outline(bx, by, bw, bodyH, OUT);
  // arms
  const armSwing = step === 0 ? 0 : step === 1 ? 1 : -1;
  s.rect(bx - 2, by + 1 + armSwing, 2, bodyH - 2, style.shirt);
  s.rect(bx + bw, by + 1 - armSwing, 2, bodyH - 2, style.shirt);
  s.px(bx - 2, by + bodyH - 1 + armSwing, style.skin);
  s.px(bx + bw + 1, by + bodyH - 1 - armSwing, style.skin);

  // head
  s.rect(hx, hy, headW, headH, style.skin);
  s.outline(hx, hy, headW, headH, OUT);
  // hair
  s.rect(hx, hy, headW, 3, style.hair);
  if (dir === "up") {
    s.rect(hx, hy, headW, headH - 2, style.hair);
  } else if (dir === "down") {
    s.px(hx + 2, hy + 4, OUT);
    s.px(hx + headW - 3, hy + 4, OUT);
    if (stage === "senior") s.hline(hx + 2, hy + 6, headW - 4, shade(style.skin, 0.85));
  } else {
    const ex = dir === "left" ? hx + 2 : hx + headW - 3;
    s.px(ex, hy + 4, OUT);
    s.rect(dir === "left" ? hx + headW - 3 : hx, hy, 3, headH - 3, style.hair);
  }

  // senior cane (side views)
  if (stage === "senior" && (dir === "left" || dir === "right")) {
    const cxn = dir === "left" ? bx - 4 : bx + bw + 3;
    s.vline(cxn, by + 2, legH + bodyH - 3, P.woodDark);
  }
}

function drawBabyFrame(s, style, dir, step) {
  // Crawling bundle, 14x10, bobbing with step.
  const bob = step === 1 ? 1 : 0;
  const x = 9,
    y = 18 + bob;
  s.rect(x, y + 3, 12, 6, style.shirt); // body
  s.outline(x, y + 3, 12, 6, OUT);
  const hx = dir === "left" ? x - 2 : dir === "right" ? x + 8 : x + 3;
  s.rect(hx, y - 2, 7, 7, style.skin);
  s.outline(hx, y - 2, 7, 7, OUT);
  s.rect(hx, y - 2, 7, 2, style.hair);
  if (dir !== "up") {
    s.px(hx + 2, y + 1, OUT);
    s.px(hx + 4, y + 1, OUT);
  }
  // little limbs
  s.px(x + 1, y + 9, style.skin);
  s.px(x + 10, y + 9 - (step === 2 ? 1 : 0), style.skin);
}

function drawCharacterStrip(id) {
  const style = styleFor(id);
  const strip = new Surface(T * 12, T);
  const dirs = ["down", "up", "left", "right"];
  for (let d = 0; d < 4; d++)
    for (let f = 0; f < 3; f++) {
      const cell = new Surface(T, T);
      shadow(cell, 9);
      drawHumanFrame(cell, style, dirs[d], f);
      strip.blit(cell, (d * 3 + f) * T, 0);
    }
  return strip;
}

// ───────────────────────── object recipes ─────────────────────────

const A = {
  table(s, top = P.wood, w = s.w) {
    shadow(s);
    s.rect(2, s.h - 14, w - 4, 4, shade(top, 0.7));
    legs(s, 3, s.h - 12, w - 6, 8, shade(top, 0.62));
    s.rect(1, s.h - 24, w - 2, 12, top);
    s.hline(1, s.h - 22, w - 2, shade(top, 1.12));
    s.outline(1, s.h - 24, w - 2, 12, OUT);
  },
  chair(s, c = P.wood) {
    shadow(s, 8);
    s.rect(10, 6, 12, 12, shade(c, 0.85)); // back
    s.outline(10, 6, 12, 12, OUT);
    s.rect(9, 17, 14, 6, c); // seat
    s.outline(9, 17, 14, 6, OUT);
    legs(s, 10, 23, 12, 6, shade(c, 0.6));
  },
  bed(s, blanket = P.red, w = s.w, h = s.h) {
    shadow(s);
    s.rect(2, 4, w - 4, h - 9, P.white); // mattress
    s.rect(2, Math.round(h * 0.36), w - 4, Math.round(h * 0.5), blanket);
    s.hline(2, Math.round(h * 0.36), w - 4, shade(blanket, 1.15));
    s.rect(5, 6, Math.min(10, w - 10), 6, P.cream); // pillow
    s.outline(5, 6, Math.min(10, w - 10), 6, shade(P.cream, 0.7));
    s.outline(2, 4, w - 4, h - 9, OUT);
    s.rect(2, h - 6, w - 4, 3, P.woodDark);
    s.outline(2, h - 6, w - 4, 3, OUT);
  },
  shelf(s, c = P.wood, withItems = true) {
    shadow(s);
    box3q(s, 2, 2, s.w - 4, s.h - 6, 3, c, shade(c, 1.1));
    const rows = Math.max(2, Math.floor((s.h - 12) / 9));
    const rnd = rngFor("shelf" + String(s.w));
    for (let r = 0; r < rows; r++) {
      const y = 7 + r * 9;
      s.hline(3, y + 6, s.w - 6, shade(c, 0.65));
      if (withItems)
        for (let x = 5; x < s.w - 7; x += 4) {
          if (rnd() < 0.75) {
            const cc = [P.red, P.blue, P.green, P.yellow, P.purple][Math.floor(rnd() * 5)];
            s.rect(x, y + 1, 3, 5, cc);
            s.outline(x, y + 1, 3, 5, shade(cc, 0.6));
          }
        }
    }
  },
  appliance(s, body = P.white, detail = P.metalDark) {
    shadow(s, 6);
    box3q(s, 5, 3, s.w - 10, s.h - 8, 3, body, shade(body, 1.05));
    s.hline(6, Math.round(s.h * 0.45), s.w - 12, shade(body, 0.75));
    s.vline(s.w - 9, 8, 5, detail); // handle
    s.vline(s.w - 9, Math.round(s.h * 0.45) + 3, 5, detail);
  },
  screenDevice(s, standH = 4) {
    shadow(s, 7);
    s.rect(5, 5, s.w - 10, s.h - 14 - standH, P.charcoal);
    s.rect(7, 7, s.w - 14, s.h - 18 - standH, P.screen);
    s.px(8, 8, P.screenGlow);
    s.hline(8, 9, 5, shade(P.screen, 1.3));
    s.outline(5, 5, s.w - 10, s.h - 14 - standH, OUT);
    s.rect(Math.floor(s.w / 2) - 2, s.h - 9 - standH, 4, standH, P.metalDark);
    s.rect(Math.floor(s.w / 2) - 6, s.h - 9, 12, 3, P.metalDark);
    s.outline(Math.floor(s.w / 2) - 6, s.h - 9, 12, 3, OUT);
  },
  plant(s, potColor = hex("#b06a3c")) {
    shadow(s, 9);
    s.rect(12, 21, 8, 7, potColor);
    s.outline(12, 21, 8, 7, OUT);
    s.disc(16, 13, 7, P.green);
    s.disc(12, 10, 4, P.greenPale);
    s.disc(20, 11, 4, P.greenDark);
    s.disc(16, 13, 7.5, null);
  },
  tree(s) {
    shadow(s, 5);
    s.rect(14, 18, 4, 11, P.brown);
    s.outline(14, 18, 4, 11, shade(P.brown, 0.55));
    s.disc(16, 11, 10, P.greenDark);
    s.disc(12, 8, 6, P.green);
    s.disc(21, 10, 5, P.green);
    s.disc(16, 6, 4, P.greenPale);
  },
  couch(s, c = P.blue) {
    shadow(s);
    s.rect(2, 8, s.w - 4, 7, shade(c, 0.8)); // back
    s.rect(2, 14, s.w - 4, 9, c); // seat
    const cushW = Math.floor((s.w - 8) / 2);
    s.vline(2 + cushW + 1, 14, 8, shade(c, 0.7));
    s.rect(0, 10, 4, 13, shade(c, 0.9)); // arms
    s.rect(s.w - 4, 10, 4, 13, shade(c, 0.9));
    s.outline(0, 8, s.w, 16, OUT);
    s.rect(3, s.h - 8, s.w - 6, 2, shade(c, 0.5));
  },
  counter(s, top = P.offwhite, front = P.wood) {
    shadow(s);
    s.rect(1, 4, s.w - 2, 8, top);
    s.rect(1, 12, s.w - 2, s.h - 17, front);
    s.hline(1, 12, s.w - 2, shade(front, 0.7));
    for (let x = 8; x < s.w - 4; x += 10) s.vline(x, 14, s.h - 21, shade(front, 0.75));
    s.outline(1, 4, s.w - 2, s.h - 9, OUT);
  },
  crate(s, c = P.tan) {
    shadow(s, 5);
    box3q(s, 4, 6, s.w - 8, s.h - 12, 4, c, shade(c, 1.12));
    s.hline(5, Math.round(s.h * 0.5), s.w - 10, shade(c, 0.7));
    s.vline(Math.round(s.w / 2), 8, s.h - 16, shade(c, 0.7));
  },
  lamp(s) {
    shadow(s, 11);
    s.vline(16, 12, 14, P.metalDark);
    s.rect(11, 26, 10, 2, P.metalDark);
    s.rect(10, 4, 12, 8, P.yellow);
    s.outline(10, 4, 12, 8, OUT);
    s.hline(11, 5, 10, shade(P.yellow, 1.15));
  },
  smallProp(s, draw) {
    shadow(s, 10);
    draw();
  },
};

function drawObject(s, asset) {
  const id = asset.id;
  const rnd = rngFor(id);
  switch (id) {
    // nursery / early life
    case "crib": {
      shadow(s);
      s.rect(3, 8, s.w - 6, 16, P.white);
      s.rect(5, 10, s.w - 10, 8, P.pink);
      for (let x = 4; x < s.w - 4; x += 4) s.vline(x, 6, 8, P.woodPale);
      s.hline(3, 6, s.w - 6, P.woodPale);
      s.outline(3, 6, s.w - 6, 18, OUT);
      break;
    }
    case "changing_table":
      A.counter(s, P.bluePale, P.woodLight);
      s.rect(6, 6, 10, 4, P.white);
      s.outline(6, 6, 10, 4, shade(P.white, 0.7));
      break;
    case "rocking_chair":
      A.chair(s, P.woodDark);
      s.hline(7, 29, 18, P.woodDark);
      s.px(7, 28, P.woodDark);
      s.px(24, 28, P.woodDark);
      break;
    case "toy_chest":
      A.crate(s, P.teal);
      s.rect(13, 10, 6, 3, P.yellow);
      break;
    case "stuffed_animal":
      A.smallProp(s, () => {
        s.disc(16, 20, 5, P.brown);
        s.disc(16, 13, 4, P.brown);
        s.px(13, 9, P.brown);
        s.px(19, 9, P.brown);
        s.px(15, 12, OUT);
        s.px(18, 12, OUT);
      });
      break;
    case "night_light":
      A.smallProp(s, () => {
        s.rect(13, 18, 6, 8, P.cream);
        s.disc(16, 15, 4, P.yellow);
        s.outline(13, 18, 6, 8, OUT);
      });
      break;
    case "highchair":
      A.chair(s, P.woodPale);
      s.rect(9, 14, 14, 3, P.woodPale);
      s.outline(9, 14, 14, 3, OUT);
      break;
    case "building_blocks":
      A.smallProp(s, () => {
        s.rect(10, 20, 5, 5, P.red);
        s.rect(16, 20, 5, 5, P.blue);
        s.rect(13, 15, 5, 5, P.yellow);
        s.outline(10, 20, 5, 5, OUT);
        s.outline(16, 20, 5, 5, OUT);
        s.outline(13, 15, 5, 5, OUT);
      });
      break;

    // living room
    case "couch":
      A.couch(s, P.blue);
      break;
    case "armchair":
      A.couch(s, P.green);
      break;
    case "coffee_table":
      A.table(s, P.woodDark);
      break;
    case "tv_stand":
      A.table(s, P.woodDark);
      s.rect(8, 2, s.w - 16, 14, P.charcoal);
      s.rect(10, 4, s.w - 20, 10, P.screen);
      s.outline(8, 2, s.w - 16, 14, OUT);
      break;
    case "bookshelf":
      A.shelf(s, P.wood, true);
      break;
    case "fireplace": {
      shadow(s);
      box3q(s, 2, 4, s.w - 4, s.h - 9, 4, hex("#9c6a52"), hex("#b07c60"));
      s.rect(Math.round(s.w / 2) - 9, 14, 18, 12, P.charcoal);
      s.rect(Math.round(s.w / 2) - 6, 18, 12, 8, P.orange);
      s.rect(Math.round(s.w / 2) - 3, 20, 6, 6, P.yellow);
      s.outline(Math.round(s.w / 2) - 9, 14, 18, 12, OUT);
      break;
    }
    case "family_photo":
      A.smallProp(s, () => {
        s.rect(11, 10, 10, 12, P.woodDark);
        s.rect(13, 12, 6, 8, P.bluePale);
        s.px(15, 14, P.skinMed);
        s.px(17, 14, P.skinLight);
        s.outline(11, 10, 10, 12, OUT);
      });
      break;
    case "rug": {
      s.rect(4, 6, s.w - 8, s.h - 12, P.red);
      s.outline(4, 6, s.w - 8, s.h - 12, shade(P.red, 0.7));
      s.outline(7, 9, s.w - 14, s.h - 18, P.cream);
      break;
    }
    case "floor_lamp":
      A.lamp(s);
      break;
    case "houseplant":
      A.plant(s);
      break;

    // kitchen
    case "dining_table":
      A.table(s, P.wood);
      s.disc(Math.round(s.w / 2), s.h - 19, 2, P.cream);
      break;
    case "kitchen_chair":
      A.chair(s);
      break;
    case "stove": {
      A.appliance(s, P.steel, P.charcoal);
      s.disc(12, 8, 2, P.charcoal);
      s.disc(20, 8, 2, P.charcoal);
      break;
    }
    case "refrigerator":
      A.appliance(s, P.white, P.metalDark);
      break;
    case "kitchen_counter":
      A.counter(s);
      break;
    case "kitchen_sink":
      A.counter(s);
      s.rect(10, 5, 12, 6, P.metal);
      s.outline(10, 5, 12, 6, OUT);
      s.vline(16, 2, 4, P.metalDark);
      break;
    case "microwave":
      A.smallProp(s, () => {
        s.rect(7, 14, 18, 11, P.white);
        s.rect(9, 16, 10, 7, P.charcoal);
        s.vline(21, 16, 7, P.metalDark);
        s.outline(7, 14, 18, 11, OUT);
      });
      break;
    case "fruit_bowl":
      A.smallProp(s, () => {
        s.rect(11, 20, 10, 4, P.woodDark);
        s.px(13, 18, P.red);
        s.px(16, 17, P.green);
        s.px(18, 18, P.yellow);
        s.outline(11, 20, 10, 4, OUT);
      });
      break;

    // bathroom
    case "toilet":
      A.smallProp(s, () => {
        s.rect(11, 10, 10, 7, P.white);
        s.disc(16, 21, 6, P.white);
        s.disc(16, 21, 4, P.offwhite);
        s.outline(11, 10, 10, 7, OUT);
      });
      break;
    case "bathroom_sink":
      A.smallProp(s, () => {
        s.rect(10, 14, 12, 7, P.white);
        s.rect(12, 16, 8, 3, P.bluePale);
        s.vline(16, 10, 4, P.metalDark);
        s.outline(10, 14, 12, 7, OUT);
        s.rect(13, 21, 6, 7, P.white);
      });
      break;
    case "bathtub": {
      shadow(s);
      s.rect(3, 8, s.w - 6, 16, P.white);
      s.rect(6, 11, s.w - 12, 9, P.bluePale);
      s.outline(3, 8, s.w - 6, 16, OUT);
      s.px(8, 6, P.metalDark);
      s.vline(8, 4, 3, P.metalDark);
      break;
    }
    case "mirror":
      A.smallProp(s, () => {
        s.rect(11, 8, 10, 14, P.woodDark);
        s.rect(13, 10, 6, 10, P.bluePale);
        s.px(14, 11, P.white);
        s.outline(11, 8, 10, 14, OUT);
      });
      break;

    // bedrooms
    case "single_bed":
      A.bed(s, P.blue);
      break;
    case "double_bed":
      A.bed(s, P.red);
      break;
    case "dresser":
      A.crate(s, P.woodLight);
      s.px(12, 12, P.metalDark);
      s.px(s.w - 12, 12, P.metalDark);
      s.px(12, 19, P.metalDark);
      s.px(s.w - 12, 19, P.metalDark);
      break;
    case "wardrobe":
      A.shelf(s, P.woodDark, false);
      s.vline(Math.round(s.w / 2), 4, s.h - 10, shade(P.woodDark, 0.6));
      s.px(Math.round(s.w / 2) - 2, 16, P.yellow);
      s.px(Math.round(s.w / 2) + 2, 16, P.yellow);
      break;
    case "nightstand":
      A.crate(s, P.woodLight);
      break;
    case "desk":
      A.table(s, P.woodLight);
      s.rect(6, 6, 8, 8, P.white);
      s.outline(6, 6, 8, 8, shade(P.gray, 0.8));
      break;
    case "desk_chair":
      A.chair(s, P.charcoal);
      break;
    case "computer":
      A.screenDevice(s);
      break;
    case "poster":
      A.smallProp(s, () => {
        s.rect(10, 8, 12, 16, P.purple);
        s.rect(12, 11, 8, 6, P.pink);
        s.hline(12, 19, 8, P.white);
        s.outline(10, 8, 12, 16, OUT);
      });
      break;
    case "guitar":
      A.smallProp(s, () => {
        s.disc(15, 22, 5, P.woodDark);
        s.disc(17, 16, 3, P.woodDark);
        s.disc(15, 22, 1, OUT);
        s.vline(19, 6, 11, P.wood);
        s.rect(18, 4, 3, 3, P.charcoal);
      });
      break;
    case "clothes_pile":
      A.smallProp(s, () => {
        s.disc(14, 23, 4, P.red);
        s.disc(19, 22, 3, P.blue);
        s.disc(16, 20, 3, P.green);
      });
      break;
    case "laundry_hamper":
      A.smallProp(s, () => {
        s.rect(11, 13, 10, 13, P.tan);
        for (let y = 15; y < 24; y += 3) s.hline(12, y, 8, shade(P.tan, 0.8));
        s.outline(11, 13, 10, 13, OUT);
        s.px(13, 12, P.white);
        s.px(17, 12, P.red);
      });
      break;

    // school
    case "student_desk":
      A.table(s, P.woodPale);
      s.rect(20, s.h - 22, 6, 4, P.white);
      break;
    case "teacher_desk":
      A.table(s, P.woodDark);
      s.rect(6, s.h - 22, 8, 5, P.cream);
      break;
    case "chalkboard": {
      shadow(s, 4);
      s.rect(2, 6, s.w - 4, 18, P.woodDark);
      s.rect(4, 8, s.w - 8, 14, hex("#2f5648"));
      s.hline(8, 12, 14, P.white);
      s.hline(8, 16, 9, P.white);
      s.outline(2, 6, s.w - 4, 18, OUT);
      break;
    }
    case "locker_row": {
      shadow(s, 4);
      s.rect(2, 4, s.w - 4, 24, P.teal);
      for (let x = 2; x < s.w - 2; x += 10) {
        s.vline(x, 4, 24, shade(P.teal, 0.6));
        s.px(x + 7, 16, P.metalDark);
        s.hline(x + 2, 7, 6, shade(P.teal, 0.75));
      }
      s.outline(2, 4, s.w - 4, 24, OUT);
      break;
    }
    case "cafeteria_table":
      A.table(s, P.offwhite);
      legs(s, 6, s.h - 10, s.w - 12, 6, P.metalDark);
      break;
    case "globe":
      A.smallProp(s, () => {
        s.disc(16, 14, 5, P.blue);
        s.px(14, 12, P.green);
        s.px(17, 14, P.green);
        s.px(15, 16, P.green);
        s.vline(16, 20, 5, P.woodDark);
        s.rect(13, 25, 7, 2, P.woodDark);
      });
      break;
    case "bulletin_board": {
      shadow(s, 4);
      s.rect(3, 6, s.w - 6, 16, P.tan);
      s.outline(3, 6, s.w - 6, 16, P.woodDark);
      for (let i = 0; i < 5; i++) {
        const x = 6 + Math.floor(rnd() * (s.w - 16));
        const y = 8 + Math.floor(rnd() * 9);
        s.rect(x, y, 4, 5, [P.white, P.yellow, P.bluePale][i % 3]);
      }
      break;
    }
    case "water_fountain":
      A.smallProp(s, () => {
        s.rect(11, 12, 10, 14, P.metal);
        s.rect(11, 12, 10, 4, P.steel);
        s.px(15, 10, P.bluePale);
        s.outline(11, 12, 10, 14, OUT);
      });
      break;
    case "trophy_case":
      A.shelf(s, P.woodDark, false);
      s.px(10, 12, P.yellow);
      s.rect(9, 13, 3, 3, P.yellow);
      s.px(20, 21, P.yellow);
      s.rect(19, 22, 3, 3, P.yellow);
      break;
    case "basketball_hoop":
      A.smallProp(s, () => {
        s.vline(16, 8, 20, P.metalDark);
        s.rect(10, 4, 12, 8, P.white);
        s.outline(10, 4, 12, 8, OUT);
        s.outline(13, 11, 6, 3, P.orange);
      });
      break;
    case "bleachers": {
      shadow(s, 3);
      for (let r = 0; r < 3; r++) {
        s.rect(2, 6 + r * 7, s.w - 4, 6, r % 2 ? P.metal : P.steel);
        s.hline(2, 6 + r * 7, s.w - 4, shade(P.metal, 0.7));
      }
      s.outline(2, 6, s.w - 4, 21, OUT);
      break;
    }
    case "gym_mat":
      s.rect(3, 5, s.w - 6, s.h - 10, P.blue);
      s.outline(3, 5, s.w - 6, s.h - 10, shade(P.blue, 0.6));
      s.hline(3, Math.round(s.h / 2), s.w - 6, shade(P.blue, 0.8));
      break;

    // office
    case "cubicle": {
      shadow(s, 3);
      s.rect(2, 4, s.w - 4, 22, P.gray);
      s.rect(4, 6, s.w - 8, 18, hex("#b8b8b0"));
      s.outline(2, 4, s.w - 4, 22, OUT);
      break;
    }
    case "office_desk":
      A.table(s, P.woodPale);
      s.rect(8, s.h - 30, 12, 9, P.charcoal);
      s.rect(10, s.h - 28, 8, 5, P.screen);
      s.outline(8, s.h - 30, 12, 9, OUT);
      break;
    case "office_chair":
      A.chair(s, P.charcoal);
      s.px(15, 29, P.metalDark);
      s.px(11, 29, P.metalDark);
      s.px(19, 29, P.metalDark);
      break;
    case "filing_cabinet":
      A.appliance(s, P.metal, P.charcoal);
      s.hline(8, 12, s.w - 16, P.metalDark);
      s.hline(8, 19, s.w - 16, P.metalDark);
      break;
    case "water_cooler":
      A.smallProp(s, () => {
        s.rect(12, 16, 8, 11, P.white);
        s.rect(13, 8, 6, 8, P.bluePale);
        s.outline(13, 8, 6, 8, OUT);
        s.outline(12, 16, 8, 11, OUT);
      });
      break;
    case "printer":
      A.smallProp(s, () => {
        s.rect(8, 16, 16, 9, P.gray);
        s.rect(10, 13, 12, 3, P.white);
        s.outline(8, 16, 16, 9, OUT);
      });
      break;
    case "whiteboard": {
      shadow(s, 4);
      s.rect(3, 6, s.w - 6, 16, P.white);
      s.hline(6, 10, 12, P.blue);
      s.hline(6, 14, 8, P.red);
      s.outline(3, 6, s.w - 6, 16, OUT);
      break;
    }
    case "conference_table":
      A.table(s, P.woodDark);
      break;
    case "coffee_machine":
      A.smallProp(s, () => {
        s.rect(11, 12, 10, 14, P.charcoal);
        s.rect(13, 19, 6, 5, P.white);
        s.px(16, 17, P.brown);
        s.outline(11, 12, 10, 14, OUT);
      });
      break;
    case "vending_machine": {
      shadow(s, 6);
      box3q(s, 6, 2, s.w - 12, s.h - 7, 3, P.red, shade(P.red, 1.1));
      s.rect(8, 6, 10, 14, P.screen);
      for (let y = 8; y < 18; y += 4) s.hline(9, y, 8, P.white);
      s.rect(20, 8, 4, 8, P.charcoal);
      break;
    }
    case "motivational_poster":
      A.smallProp(s, () => {
        s.rect(10, 8, 12, 14, P.blueDark);
        s.rect(12, 10, 8, 7, P.bluePale);
        s.hline(13, 19, 6, P.white);
        s.outline(10, 8, 12, 14, OUT);
      });
      break;

    // warehouse / industrial
    case "pallet": {
      s.rect(4, 14, 24, 12, P.tan);
      for (let y = 14; y < 26; y += 4) s.hline(4, y, 24, shade(P.tan, 0.7));
      s.outline(4, 14, 24, 12, OUT);
      break;
    }
    case "box_stack": {
      shadow(s);
      A.crate(s, P.tan);
      const top = new Surface(20, 14);
      box3q(top, 1, 1, 18, 12, 3, shade(P.tan, 0.94), shade(P.tan, 1.06));
      s.blit(top, 6, -1);
      break;
    }
    case "metal_shelving":
      A.shelf(s, P.metal, true);
      break;
    case "forklift": {
      shadow(s);
      s.rect(6, 10, 16, 12, P.yellow);
      s.rect(8, 6, 10, 6, shade(P.yellow, 0.85));
      s.outline(6, 10, 16, 12, OUT);
      s.disc(10, 24, 3, P.charcoal);
      s.disc(19, 24, 3, P.charcoal);
      s.vline(25, 6, 18, P.metalDark);
      s.hline(25, 22, 6, P.metalDark);
      s.hline(25, 24, 6, P.metalDark);
      break;
    }
    case "conveyor_belt": {
      shadow(s, 3);
      s.rect(2, 10, s.w - 4, 10, P.charcoal);
      for (let x = 4; x < s.w - 4; x += 6) s.vline(x, 11, 8, P.metalDark);
      s.outline(2, 10, s.w - 4, 10, OUT);
      legs(s, 4, 20, s.w - 8, 6, P.metalDark);
      break;
    }
    case "time_clock":
      A.smallProp(s, () => {
        s.rect(11, 10, 10, 12, P.gray);
        s.disc(16, 14, 3, P.white);
        s.px(16, 13, OUT);
        s.rect(13, 19, 6, 2, P.charcoal);
        s.outline(11, 10, 10, 12, OUT);
      });
      break;
    case "hand_truck":
      A.smallProp(s, () => {
        s.vline(13, 8, 16, P.metalDark);
        s.vline(18, 8, 16, P.metalDark);
        s.hline(13, 8, 6, P.metalDark);
        s.disc(14, 25, 2, P.charcoal);
        s.disc(18, 25, 2, P.charcoal);
        s.hline(11, 22, 8, P.metal);
      });
      break;
    case "safety_sign":
      A.smallProp(s, () => {
        s.rect(11, 9, 10, 12, P.yellow);
        s.outline(11, 9, 10, 12, OUT);
        s.vline(16, 12, 5, OUT);
        s.px(16, 18, OUT);
        s.vline(14, 21, 6, P.metalDark);
        s.vline(18, 21, 6, P.metalDark);
      });
      break;
    case "workbench":
      A.table(s, P.woodDark);
      s.px(8, s.h - 21, P.metal);
      s.rect(12, s.h - 22, 5, 2, P.red);
      break;
    case "toolbox":
      A.smallProp(s, () => {
        s.rect(9, 17, 14, 8, P.red);
        s.hline(13, 14, 6, P.charcoal);
        s.vline(13, 14, 3, P.charcoal);
        s.vline(18, 14, 3, P.charcoal);
        s.outline(9, 17, 14, 8, OUT);
      });
      break;
    case "scaffolding": {
      for (const x of [4, 26]) s.vline(x, 4, 24, P.metalDark);
      for (const y of [8, 16, 24]) s.hline(4, y, 23, P.metal);
      s.rect(4, 14, 23, 2, P.tan);
      break;
    }
    case "cement_mixer": {
      shadow(s);
      s.disc(14, 14, 8, P.orange);
      s.disc(14, 14, 8.5, null);
      s.rect(10, 22, 12, 4, P.metalDark);
      s.disc(10, 27, 2, P.charcoal);
      s.disc(20, 27, 2, P.charcoal);
      s.outline(6, 6, 16, 16, null);
      break;
    }
    case "safety_cone":
      A.smallProp(s, () => {
        s.rect(12, 24, 8, 2, P.orange);
        s.rect(14, 18, 4, 6, P.orange);
        s.hline(14, 20, 4, P.white);
        s.px(15, 16, P.orange);
        s.px(16, 16, P.orange);
      });
      break;
    case "wheelbarrow":
      A.smallProp(s, () => {
        s.rect(9, 14, 14, 7, P.green);
        s.outline(9, 14, 14, 7, OUT);
        s.disc(12, 24, 3, P.charcoal);
        s.vline(23, 15, 8, P.metalDark);
      });
      break;

    // restaurant / retail
    case "restaurant_table":
      A.table(s, P.white);
      break;
    case "bar_counter":
      A.counter(s, P.woodDark, P.wood);
      break;
    case "cash_register":
      A.smallProp(s, () => {
        s.rect(10, 14, 12, 10, P.charcoal);
        s.rect(12, 11, 8, 4, P.screen);
        s.px(13, 12, P.screenGlow);
        s.outline(10, 14, 12, 10, OUT);
      });
      break;
    case "retail_shelf":
      A.shelf(s, P.metal, true);
      break;
    case "produce_display": {
      shadow(s);
      s.rect(3, 12, s.w - 6, 12, P.woodDark);
      s.outline(3, 12, s.w - 6, 12, OUT);
      for (let x = 6; x < s.w - 6; x += 4) {
        s.px(x, 14, P.red);
        s.px(x + 1, 14, P.red);
        s.px(x, 18, P.green);
        s.px(x + 1, 18, P.orange);
      }
      break;
    }
    case "grill":
      A.counter(s, P.charcoal, P.metal);
      s.hline(6, 7, s.w - 12, P.metalDark);
      s.hline(6, 9, s.w - 12, P.metalDark);
      break;
    case "deep_fryer":
      A.appliance(s, P.metal, P.charcoal);
      s.rect(9, 7, s.w - 18, 4, P.yellow);
      break;
    case "prep_table":
      A.counter(s, P.steel, P.metal);
      break;
    case "bar_stool":
      A.smallProp(s, () => {
        s.disc(16, 14, 5, P.red);
        s.disc(16, 14, 5.5, null);
        s.vline(16, 19, 8, P.metalDark);
        s.hline(12, 27, 9, P.metalDark);
      });
      break;
    case "shopping_cart":
      A.smallProp(s, () => {
        s.rect(10, 13, 13, 8, P.metal);
        for (let x = 11; x < 22; x += 3) s.vline(x, 14, 6, shade(P.metal, 0.8));
        s.outline(10, 13, 13, 8, OUT);
        s.disc(12, 24, 2, P.charcoal);
        s.disc(20, 24, 2, P.charcoal);
        s.vline(24, 10, 6, P.metalDark);
      });
      break;

    // medical
    case "hospital_bed":
      A.bed(s, P.bluePale);
      s.vline(2, 2, 8, P.metal);
      s.vline(s.w - 3, 2, 8, P.metal);
      break;
    case "iv_stand":
      A.smallProp(s, () => {
        s.vline(16, 6, 20, P.metal);
        s.hline(12, 27, 9, P.metal);
        s.rect(13, 7, 4, 6, P.bluePale);
        s.outline(13, 7, 4, 6, OUT);
      });
      break;
    case "patient_monitor":
      A.screenDevice(s, 8);
      s.hline(9, 10, 6, P.screenGlow);
      break;
    case "exam_table":
      A.bed(s, P.white);
      break;
    case "visitor_chair":
      A.chair(s, P.teal);
      break;
    case "curtain_divider": {
      s.hline(4, 4, 24, P.metal);
      for (let x = 5; x < 27; x += 2) s.vline(x, 5, 20 + (x % 4 === 1 ? 1 : 0), x % 4 === 1 ? P.bluePale : shade(P.bluePale, 0.9));
      break;
    }
    case "medical_poster":
      A.smallProp(s, () => {
        s.rect(10, 8, 12, 15, P.white);
        s.rect(13, 10, 6, 8, P.pink);
        s.vline(16, 10, 8, P.red);
        s.outline(10, 8, 12, 15, OUT);
      });
      break;
    case "wheelchair":
      A.smallProp(s, () => {
        s.disc(13, 21, 5, P.charcoal);
        s.disc(13, 21, 3, null);
        s.rect(13, 11, 9, 7, P.navy);
        s.vline(21, 9, 9, P.metalDark);
        s.disc(22, 24, 2, P.charcoal);
      });
      break;
    case "walker":
      A.smallProp(s, () => {
        s.vline(11, 12, 14, P.metal);
        s.vline(20, 12, 14, P.metal);
        s.hline(11, 12, 10, P.metal);
        s.hline(11, 18, 10, shade(P.metal, 0.8));
      });
      break;
    case "puzzle_table":
      A.table(s, P.woodLight);
      s.rect(10, s.h - 22, 12, 7, P.bluePale);
      s.px(13, s.h - 20, P.red);
      s.px(17, s.h - 18, P.green);
      break;

    // outdoor
    case "tree":
      A.tree(s);
      break;
    case "bush":
      A.smallProp(s, () => {
        s.disc(16, 19, 7, P.greenDark);
        s.disc(13, 17, 4, P.green);
        s.disc(20, 18, 4, P.green);
        s.px(15, 15, P.greenPale);
      });
      break;
    case "flower_bed": {
      s.rect(2, 10, s.w - 4, 14, hex("#7a5a3a"));
      s.outline(2, 10, s.w - 4, 14, OUT);
      for (let x = 5; x < s.w - 5; x += 5) {
        const c = [P.red, P.yellow, P.pink, P.purple][Math.floor(rnd() * 4)];
        s.px(x, 14, c);
        s.px(x + 1, 14, c);
        s.px(x, 18, P.green);
      }
      break;
    }
    case "park_bench": {
      shadow(s);
      s.rect(3, 10, s.w - 6, 5, P.wood);
      s.rect(3, 16, s.w - 6, 5, P.wood);
      s.hline(3, 11, s.w - 6, shade(P.wood, 1.15));
      s.outline(3, 10, s.w - 6, 11, OUT);
      legs(s, 5, 21, s.w - 10, 6, P.metalDark);
      break;
    }
    case "street_lamp":
      A.smallProp(s, () => {
        s.vline(16, 6, 21, P.charcoal);
        s.rect(13, 3, 7, 5, P.yellow);
        s.outline(13, 3, 7, 5, OUT);
        s.rect(12, 26, 9, 2, P.charcoal);
      });
      break;
    case "mailbox":
      A.smallProp(s, () => {
        s.rect(11, 12, 10, 7, P.blueDark);
        s.outline(11, 12, 10, 7, OUT);
        s.vline(15, 19, 7, P.woodDark);
        s.px(12, 14, P.red);
      });
      break;
    case "swing_set": {
      s.vline(4, 8, 18, P.metalDark);
      s.vline(27, 8, 18, P.metalDark);
      s.hline(4, 7, 24, P.metalDark);
      for (const x of [11, 20]) {
        s.vline(x, 8, 9, P.gray);
        s.vline(x + 3, 8, 9, P.gray);
        s.rect(x, 17, 4, 2, P.red);
      }
      break;
    }
    case "slide": {
      shadow(s);
      for (let i = 0; i < 12; i++) {
        s.px(8 + i, 22 - i, P.yellow);
        s.px(9 + i, 22 - i, P.yellow);
        s.px(10 + i, 22 - i, shade(P.yellow, 0.8));
      }
      s.vline(21, 9, 6, P.metalDark);
      s.vline(8, 20, 6, P.metalDark);
      s.hline(18, 8, 5, P.metal);
      break;
    }
    case "sandbox": {
      s.rect(3, 8, s.w - 6, s.h - 14, P.woodDark);
      s.rect(6, 11, s.w - 12, s.h - 20, P.sand);
      s.outline(3, 8, s.w - 6, s.h - 14, OUT);
      s.px(12, 18, P.red);
      s.px(20, 22, P.blue);
      break;
    }
    case "seesaw": {
      shadow(s);
      for (let i = 0; i < 22; i++) s.px(5 + i, 18 - Math.round(i * 0.27), P.green);
      s.rect(14, 18, 4, 6, P.metalDark);
      s.rect(4, 14, 3, 3, P.red);
      s.rect(25, 9, 3, 3, P.red);
      break;
    }
    case "monkey_bars": {
      for (const x of [4, 27]) s.vline(x, 6, 20, P.metalDark);
      s.hline(4, 6, 24, P.metal);
      for (let x = 8; x < 27; x += 4) s.vline(x, 6, 4, P.metal);
      break;
    }
    case "pond": {
      for (let y = 0; y < s.h; y++)
        for (let x = 0; x < s.w; x++) {
          const dx = (x - s.w / 2) / (s.w / 2 - 2);
          const dy = (y - s.h / 2) / (s.h / 2 - 2);
          if (dx * dx + dy * dy < 1) s.px(x, y, P.blue);
        }
      for (let i = 0; i < 10; i++) s.px(6 + Math.floor(rnd() * (s.w - 12)), 5 + Math.floor(rnd() * (s.h - 10)), P.bluePale);
      // duck
      s.px(s.w / 2, s.h / 2 - 1, P.yellow);
      s.rect(s.w / 2 - 1, s.h / 2, 3, 2, P.white);
      break;
    }
    case "picnic_table":
      A.table(s, P.wood);
      s.rect(0, s.h - 14, 3, 8, P.wood);
      s.rect(s.w - 3, s.h - 14, 3, 8, P.wood);
      break;
    case "bbq_grill":
      A.smallProp(s, () => {
        s.disc(16, 15, 6, P.charcoal);
        s.hline(11, 14, 11, P.metalDark);
        s.vline(13, 21, 6, P.metalDark);
        s.vline(19, 21, 6, P.metalDark);
      });
      break;
    case "fence": {
      s.hline(0, 12, s.w, P.woodLight);
      s.hline(0, 18, s.w, P.woodLight);
      for (let x = 2; x < s.w; x += 6) {
        s.rect(x, 8, 2, 16, P.wood);
        s.px(x, 8, shade(P.wood, 1.2));
      }
      break;
    }
    case "trash_can":
      A.smallProp(s, () => {
        s.rect(11, 13, 10, 12, P.metalDark);
        s.rect(10, 11, 12, 3, P.metal);
        s.outline(11, 13, 10, 12, OUT);
      });
      break;
    case "fire_hydrant":
      A.smallProp(s, () => {
        s.rect(13, 14, 6, 11, P.red);
        s.disc(16, 12, 3, P.red);
        s.px(11, 17, P.red);
        s.px(20, 17, P.red);
        s.outline(13, 14, 6, 11, OUT);
      });
      break;
    case "bus_stop": {
      shadow(s, 3);
      s.vline(3, 6, 20, P.metalDark);
      s.vline(s.w - 4, 6, 20, P.metalDark);
      s.rect(3, 4, s.w - 6, 4, P.red);
      s.rect(5, 16, s.w - 10, 4, P.metal);
      s.outline(3, 4, s.w - 6, 4, OUT);
      break;
    }
    case "traffic_light":
      A.smallProp(s, () => {
        s.vline(16, 16, 11, P.charcoal);
        s.rect(13, 4, 7, 13, P.charcoal);
        s.px(16, 6, P.red);
        s.px(16, 10, P.yellow);
        s.px(16, 14, P.green);
        s.outline(13, 4, 7, 13, OUT);
      });
      break;
    case "storefront": {
      shadow(s, 2);
      s.rect(2, 4, s.w - 4, 22, hex("#8a5a48"));
      s.rect(4, 12, s.w - 8, 12, P.bluePale);
      s.rect(2, 4, s.w - 4, 6, P.teal);
      s.hline(3, 5, s.w - 6, shade(P.teal, 1.2));
      s.rect(Math.round(s.w / 2) - 3, 16, 6, 10, P.woodDark);
      s.outline(2, 4, s.w - 4, 22, OUT);
      break;
    }
    case "dumpster": {
      shadow(s);
      box3q(s, 3, 8, s.w - 6, 16, 4, P.greenDark, shade(P.greenDark, 1.15));
      s.hline(4, 16, s.w - 8, shade(P.greenDark, 0.7));
      break;
    }
    case "campfire":
      A.smallProp(s, () => {
        s.hline(10, 24, 12, P.brownDark);
        s.hline(11, 22, 10, P.brown);
        s.px(15, 15, P.yellow);
        s.px(16, 14, P.yellow);
        s.rect(14, 16, 4, 5, P.orange);
        s.px(13, 19, P.red);
        s.px(18, 18, P.red);
      });
      break;
    case "tent": {
      shadow(s);
      for (let i = 0; i < 11; i++) {
        s.vline(5 + i, 22 - i, i + 2, P.teal);
        s.vline(26 - i, 22 - i, i + 2, shade(P.teal, 0.85));
      }
      s.vline(16, 11, 13, OUT);
      s.rect(14, 18, 4, 6, shade(P.teal, 0.5));
      break;
    }
    case "fallen_log": {
      shadow(s);
      s.rect(3, 12, s.w - 6, 8, P.brown);
      s.disc(4, 16, 4, P.woodPale);
      s.disc(4, 16, 2, P.wood);
      s.hline(8, 14, s.w - 12, shade(P.brown, 1.15));
      s.outline(3, 12, s.w - 6, 8, OUT);
      break;
    }
    case "boulder":
      A.smallProp(s, () => {
        s.disc(16, 18, 7, P.gray);
        s.disc(13, 15, 3, shade(P.gray, 1.15));
        s.disc(19, 20, 3, P.grayDark);
      });
      break;
    case "beach_umbrella":
      A.smallProp(s, () => {
        s.vline(16, 10, 16, P.metalDark);
        s.disc(16, 9, 7, P.red);
        s.rect(9, 8, 4, 2, P.white);
        s.rect(18, 8, 4, 2, P.white);
        s.disc(16, 9, 7.5, null);
      });
      break;
    case "beach_towel":
      s.rect(8, 4, 16, s.h - 8, P.teal);
      s.hline(8, 8, 16, P.white);
      s.hline(8, s.h - 9, 16, P.white);
      s.outline(8, 4, 16, s.h - 8, shade(P.teal, 0.7));
      break;
    case "sandcastle":
      A.smallProp(s, () => {
        s.rect(10, 16, 12, 9, P.sand);
        s.rect(13, 11, 6, 5, P.sand);
        s.px(13, 10, P.sand);
        s.px(18, 10, P.sand);
        s.px(16, 8, P.red);
        s.vline(16, 8, 3, shade(P.sand, 0.7));
        s.outline(10, 16, 12, 9, shade(P.sand, 0.6));
      });
      break;
    case "lifeguard_tower": {
      shadow(s);
      s.rect(8, 6, 16, 10, P.white);
      s.rect(10, 8, 5, 5, P.bluePale);
      s.outline(8, 6, 16, 10, OUT);
      s.vline(9, 16, 12, P.wood);
      s.vline(22, 16, 12, P.wood);
      for (let i = 0; i < 5; i++) s.hline(12, 18 + i * 2, 8, P.woodLight);
      break;
    }
    case "gravestone":
      A.smallProp(s, () => {
        s.rect(11, 12, 10, 13, P.gray);
        s.disc(16, 12, 5, P.gray);
        s.hline(13, 16, 6, P.grayDark);
        s.hline(13, 19, 6, P.grayDark);
        s.outline(11, 12, 10, 13, OUT);
      });
      break;
    case "wilted_flowers":
      A.smallProp(s, () => {
        s.px(14, 20, P.green);
        s.px(16, 19, P.green);
        s.px(18, 20, P.green);
        s.px(14, 18, P.purple);
        s.px(16, 17, P.pink);
        s.px(18, 18, P.yellow);
      });
      break;

    // vehicles
    case "car_seat":
      A.chair(s, P.charcoal);
      break;
    case "car_dashboard": {
      s.rect(2, 10, s.w - 4, 12, P.charcoal);
      s.disc(10, 16, 4, P.metalDark);
      s.disc(10, 16, 2, null);
      s.rect(20, 13, 8, 5, P.screen);
      s.outline(2, 10, s.w - 4, 12, OUT);
      break;
    }
    case "steering_wheel":
      A.smallProp(s, () => {
        s.disc(16, 16, 6, P.charcoal);
        s.disc(16, 16, 4, null);
        s.px(16, 16, P.charcoal);
      });
      break;
    case "bus_seat_row":
      A.couch(s, P.green);
      break;

    // basement / attic / misc
    case "washer":
      A.appliance(s, P.white, P.metalDark);
      s.disc(Math.round(s.w / 2), Math.round(s.h / 2) + 2, 5, P.bluePale);
      s.disc(Math.round(s.w / 2), Math.round(s.h / 2) + 2, 5.5, null);
      break;
    case "dryer":
      A.appliance(s, P.offwhite, P.metalDark);
      s.disc(Math.round(s.w / 2), Math.round(s.h / 2) + 2, 5, P.charcoal);
      break;
    case "water_heater":
      A.smallProp(s, () => {
        s.rect(11, 6, 10, 20, P.steel);
        s.disc(16, 6, 5, P.steel);
        s.outline(11, 6, 10, 20, OUT);
        s.vline(16, 26, 3, P.metalDark);
      });
      break;
    case "covered_furniture": {
      shadow(s);
      s.rect(4, 10, s.w - 8, 14, P.offwhite);
      s.px(6, 9, P.offwhite);
      s.px(12, 7, P.offwhite);
      s.rect(8, 6, 12, 5, P.offwhite);
      s.hline(5, 15, 8, shade(P.offwhite, 0.85));
      s.hline(14, 19, 10, shade(P.offwhite, 0.85));
      s.outline(4, 10, s.w - 8, 14, shade(P.offwhite, 0.6));
      break;
    }
    case "ping_pong_table":
      A.table(s, P.teal);
      s.vline(Math.round(s.w / 2), s.h - 24, 12, P.white);
      break;
    case "dusty_box":
      A.crate(s, shade(P.tan, 0.85));
      break;
    case "phone_booth": {
      shadow(s, 6);
      box3q(s, 7, 2, 18, s.h - 7, 3, P.blueDark, shade(P.blueDark, 1.15));
      s.rect(10, 8, 12, 10, P.bluePale);
      s.rect(12, 20, 8, 4, P.charcoal);
      break;
    }
    case "piano": {
      shadow(s);
      box3q(s, 2, 4, s.w - 4, s.h - 10, 6, P.charcoal, shade(P.charcoal, 1.2));
      s.rect(4, 14, s.w - 8, 4, P.white);
      for (let x = 6; x < s.w - 6; x += 3) s.vline(x, 14, 2, OUT);
      break;
    }
    case "birthday_cake":
      A.smallProp(s, () => {
        s.rect(10, 17, 12, 7, P.pink);
        s.rect(12, 13, 8, 4, P.white);
        s.px(14, 11, P.yellow);
        s.px(17, 11, P.yellow);
        s.vline(14, 11, 2, P.bluePale);
        s.vline(17, 11, 2, P.bluePale);
        s.outline(10, 17, 12, 7, OUT);
      });
      break;
    case "present_box":
      A.smallProp(s, () => {
        s.rect(11, 15, 10, 9, P.red);
        s.vline(16, 15, 9, P.yellow);
        s.hline(11, 19, 10, P.yellow);
        s.px(15, 13, P.yellow);
        s.px(17, 13, P.yellow);
        s.outline(11, 15, 10, 9, OUT);
      });
      break;

    default: {
      // Fallback: hash-tinted crate so nothing renders invisible.
      const tints = [P.tan, P.teal, P.bluePale, P.gray, P.greenPale];
      A.crate(s, tints[Math.floor(rngFor(id)() * tints.length)]);
      break;
    }
  }
}

// ───────────────────────── atlas assembly ─────────────────────────

function main() {
  const entries = [];
  for (const asset of ASSET_CATALOG) {
    let surface;
    let meta;
    if (asset.kind === "floor") {
      surface = new Surface(T, T);
      drawFloor(surface, asset.id);
      meta = { kind: "floor" };
    } else if (asset.kind === "wall") {
      surface = new Surface(T, T);
      drawWall(surface, asset.id);
      meta = { kind: "wall" };
    } else if (asset.kind === "character") {
      surface = drawCharacterStrip(asset.id);
      meta = { kind: "character", frames: 12, frameW: T, frameH: T };
    } else {
      surface = new Surface(asset.w * T, asset.h * T);
      drawObject(surface, asset);
      meta = { kind: "object", wTiles: asset.w, hTiles: asset.h };
    }
    entries.push({ id: asset.id, surface, meta });
  }

  // Shelf packing, tallest-first for density.
  entries.sort((a, b) => b.surface.h - a.surface.h || b.surface.w - a.surface.w);
  let x = 0,
    y = 0,
    shelfH = 0,
    atlasH = 0;
  const placements = new Map();
  for (const entry of entries) {
    if (x + entry.surface.w > ATLAS_W) {
      x = 0;
      y += shelfH;
      shelfH = 0;
    }
    placements.set(entry.id, { x, y });
    x += entry.surface.w;
    shelfH = Math.max(shelfH, entry.surface.h);
    atlasH = Math.max(atlasH, y + entry.surface.h);
  }

  const atlas = new Surface(ATLAS_W, atlasH);
  const index = {};
  for (const entry of entries) {
    const pos = placements.get(entry.id);
    atlas.blit(entry.surface, pos.x, pos.y);
    index[entry.id] = { x: pos.x, y: pos.y, w: entry.surface.w, h: entry.surface.h, ...entry.meta };
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "atlas.png"), encodePng(ATLAS_W, atlasH, atlas.data));
  writeFileSync(
    join(OUT_DIR, "atlas.json"),
    JSON.stringify({ tileSize: T, width: ATLAS_W, height: atlasH, sprites: index }, null, 1),
  );
  console.log(
    `atlas: ${String(ATLAS_W)}x${String(atlasH)} px, ${String(entries.length)} sprites -> ${OUT_DIR}`,
  );
}

main();

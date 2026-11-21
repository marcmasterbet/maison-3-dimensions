import * as THREE from "three";

// ---------- Dimensions de la maison (en mètres) ----------
export const W = 9; // longueur (axe X, parallèle au faîtage)
export const D = 6.4; // profondeur (axe Z)
export const WALL_H = 2.9;
export const T = 0.25; // épaisseur des murs
export const H = 2.75; // hauteur du toit
export const OV_Z = 0.5; // débord de toit (égout)
export const OV_X = 0.35; // débord de toit (pignons)
export const Y_R = WALL_H + 0.22 + H; // altitude du faîtage (dessus des chevrons)
export const THETA = Math.atan(H / (D / 2)); // pente du toit
export const LS = (D / 2 + OV_Z) / Math.cos(THETA); // longueur de rampant

// Coupe "écorchée" (comme l'illustration du site) :
// à gauche la charpente nue, au centre le voligeage, à droite les tuiles.
export const X_PLANKS = -1.3;
export const X_TILES = 1.4;
export const X_MIN = -W / 2 - OV_X;
export const X_MAX = W / 2 + OV_X;

export type Piece = { m: THREE.Matrix4; order: number; tint: number };

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Pièce en repère local `frame`. Les pièces de bois ont leur longueur sur Z local. */
export function piece(
  frame: THREE.Matrix4,
  pos: [number, number, number],
  size: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  order = 0,
  tint = 0
): Piece {
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  _p.set(...pos);
  _s.set(...size);
  const local = new THREE.Matrix4().compose(_p, _q, _s);
  return { m: new THREE.Matrix4().multiplyMatrices(frame, local), order, tint };
}

export const IDENTITY = new THREE.Matrix4();

/** Repère d'un versant : x le long du faîtage, z descend la pente, y = normale sortante. */
export function slopeFrame(side: 1 | -1) {
  const m = new THREE.Matrix4().makeTranslation(0, Y_R, 0);
  if (side === -1) m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
  m.multiply(new THREE.Matrix4().makeRotationX(THETA));
  return m;
}
/** x monde -> x local du versant */
export const lx = (side: 1 | -1, xw: number) => (side === 1 ? xw : -xw);

/** Point monde sur la surface du toit, à la distance s du faîtage. */
export function roofPoint(side: 1 | -1, xw: number, s: number, up = 0) {
  return new THREE.Vector3(lx(side, xw), up, s).applyMatrix4(slopeFrame(side));
}

const rnd = (() => {
  let seed = 7;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
})();

// ---------- Charpente ----------
export function buildTrusses(): Piece[] {
  const out: Piece[] = [];
  const span = X_MAX - X_MIN;
  const ord = (x: number) => (x - X_MIN) / span;

  for (const side of [1, -1] as const) {
    const f = slopeFrame(side);
    // chevrons
    for (let x = X_MIN + 0.06; x <= X_MAX - 0.05; x += 0.6) {
      out.push(piece(f, [lx(side, x), -0.08, LS / 2], [0.07, 0.16, LS], [0, 0, 0], ord(x) * 0.8 + 0.2, rnd()));
    }
    // sablières
    out.push(
      piece(IDENTITY, [0, WALL_H + 0.05, side * (D / 2 - 0.12)], [0.16, 0.1, W], [0, Math.PI / 2, 0], 0, rnd())
    );
  }
  // faîtière
  out.push(piece(IDENTITY, [0, Y_R - 0.2, 0], [0.12, 0.22, X_MAX - X_MIN], [0, Math.PI / 2, 0], 0.15, rnd()));

  // fermes
  for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) {
    const o = ord(x) * 0.6;
    out.push(piece(IDENTITY, [x, WALL_H + 0.14, 0], [0.1, 0.2, D + 0.1], [0, 0, 0], o, rnd())); // entrait
    const kTop = Y_R - 0.3;
    const kBot = WALL_H + 0.24;
    out.push(piece(IDENTITY, [x, (kTop + kBot) / 2, 0], [0.1, 0.12, kTop - kBot], [Math.PI / 2, 0, 0], o + 0.05, rnd())); // poinçon
    for (const side of [1, -1] as const) {
      const f = slopeFrame(side);
      out.push(piece(f, [lx(side, x), -0.11, (D / 2) / Math.cos(THETA) / 2 + 0.1], [0.1, 0.2, (D / 2) / Math.cos(THETA)], [0, 0, 0], o + 0.08, rnd())); // arbalétrier
      // jambe de force
      const a = new THREE.Vector3(x, WALL_H + 0.9, 0);
      const b = roofPoint(side, x, LS * 0.42, -0.2);
      b.x = x;
      const len = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const ang = Math.atan2(b.y - a.y, b.z - a.z);
      out.push(piece(IDENTITY, [mid.x, mid.y, mid.z], [0.08, 0.1, len], [-ang, 0, 0], o + 0.1, rnd()));
    }
  }
  return out;
}

// ---------- Voligeage ----------
export function buildPlanks(): Piece[] {
  const out: Piece[] = [];
  for (const side of [1, -1] as const) {
    const f = slopeFrame(side);
    let row = 0;
    for (let s = 0.08; s < LS; s += 0.16, row++) {
      // planches de longueurs inégales, joints décalés
      const split = X_PLANKS + 1.6 + (row % 3) * 1.1;
      const segs: [number, number][] = [
        [X_PLANKS, split],
        [split, X_MAX],
      ];
      for (const [a, b] of segs) {
        const c = (a + b) / 2;
        out.push(
          piece(f, [lx(side, c), 0.014, s], [0.14, 0.026, b - a - 0.01], [0, Math.PI / 2, 0], 1 - s / LS, rnd())
        );
      }
    }
  }
  return out;
}

// ---------- Tuiles ----------
export const TILE = { w: 0.29, l: 0.42, t: 0.035, step: 0.3, row: 0.33 };
export function buildTiles(): Piece[] {
  const out: Piece[] = [];
  for (const side of [1, -1] as const) {
    const f = slopeFrame(side);
    let r = 0;
    for (let s = 0.2; s < LS - 0.05; s += TILE.row, r++) {
      const off = r % 2 ? TILE.step / 2 : 0;
      for (let x = X_TILES + 0.15 + off; x < X_MAX - 0.1; x += TILE.step) {
        out.push(
          piece(f, [lx(side, x), 0.06, s], [1, 1, 1], [-0.075, 0, 0], 1 - s / LS + (x - X_TILES) * 0.02, rnd())
        );
      }
    }
  }
  return out;
}
export function buildRidgeCaps(): Piece[] {
  const out: Piece[] = [];
  for (let x = X_TILES + 0.2; x < X_MAX; x += 0.38) {
    out.push(piece(IDENTITY, [x, Y_R + 0.09, 0], [1, 1, 1], [0, 0, Math.PI / 2], 1 + (x - X_TILES) * 0.05, rnd()));
  }
  return out;
}

// ---------- Isolation (rouleaux dans les combles) ----------
export function buildInsulation(): Piece[] {
  const out: Piece[] = [];
  const zMin = -D / 2 + T + 0.05;
  const zMax = D / 2 - T - 0.05;
  for (let x = -W / 2 + T + 0.35; x < W / 2 - T - 0.2; x += 0.6) {
    out.push(
      piece(IDENTITY, [x, WALL_H + 0.12, 0], [0.56, 0.24, zMax - zMin], [0, 0, 0], (x + W / 2) / W, rnd())
    );
  }
  return out;
}

// ---------- Zinguerie ----------
export function gutterLine(side: 1 | -1) {
  const p = roofPoint(side, 0, LS, 0);
  return { y: p.y - 0.1, z: p.z + side * 0.08 };
}
export function buildGutters(): Piece[] {
  const out: Piece[] = [];
  for (const side of [1, -1] as const) {
    const g = gutterLine(side);
    out.push(piece(IDENTITY, [0, g.y, g.z], [1, X_MAX - X_MIN, 1], [0, 0, Math.PI / 2], 0, 0)); // gouttière (cylindre)
    for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) {
      // descente : coude + tuyau vertical contre le mur
      const zWall = side * (D / 2 + 0.08);
      const dz = Math.abs(g.z - zWall);
      const dy = 0.4;
      out.push(
        piece(IDENTITY, [x, g.y - 0.05 - dy / 2, (g.z + zWall) / 2], [0.7, Math.hypot(dz, dy), 0.7], [side * Math.atan2(dz, dy), 0, 0], 0.3, 0)
      );
      out.push(piece(IDENTITY, [x, (g.y - 0.45) / 2, zWall], [0.7, g.y - 0.45, 0.7], [0, 0, 0], 0.5, 0));
    }
  }
  return out;
}

// ---------- Grilles anti-rongeurs ----------
export function buildGrilles(): Piece[] {
  const out: Piece[] = [];
  const z = D / 2 + 0.005;
  for (const x of [-3.9, -0.4, 3.1]) {
    out.push(piece(IDENTITY, [x, 0.42, z], [0.28, 0.14, 0.03], [0, 0, 0], 0, 0));
    out.push(piece(IDENTITY, [x, 0.42, -z], [0.28, 0.14, 0.03], [0, 0, 0], 0.3, 0));
  }
  // closoirs le long des égouts, sous la première rangée de tuiles
  for (const side of [1, -1] as const) {
    const f = slopeFrame(side);
    const c = (X_TILES + X_MAX) / 2;
    out.push(piece(f, [lx(side, c), 0.03, LS - 0.04], [0.05, 0.05, X_MAX - X_TILES], [0, Math.PI / 2, 0], 0.6, 0));
  }
  return out;
}

// ---------- Ouvertures (fenêtres / portes) ----------
export type Opening = { c: number; w: number; y0: number; y1: number; shutters?: boolean };
export type WallDef = {
  pos: [number, number, number];
  rotY: number;
  length: number;
  openings: Opening[];
};

const win = (c: number, shutters = false): Opening => ({ c, w: 0.95, y0: 1.0, y1: 2.25, shutters });
const door = (c: number, w = 1.1): Opening => ({ c, w, y0: 0, y1: 2.3 });

export const WALLS: WallDef[] = [
  { pos: [0, 0, D / 2 - T / 2], rotY: 0, length: W, openings: [win(-3.1), win(-1.2), door(1.9, 1.3), win(3.6, true)] },
  { pos: [0, 0, -D / 2 + T / 2], rotY: Math.PI, length: W, openings: [win(-2.4), door(0.4), win(2.6)] },
  { pos: [W / 2 - T / 2, 0, 0], rotY: Math.PI / 2, length: D - 2 * T, openings: [win(0, true)] },
  { pos: [-W / 2 + T / 2, 0, 0], rotY: -Math.PI / 2, length: D - 2 * T, openings: [win(-1.2), win(1.2)] },
];

/** Découpe un mur en blocs pleins autour des ouvertures. Repère local : x le long du mur, y vertical. */
export function wallBlocks(L: number, Hh: number, openings: Opening[]) {
  const blocks: { x: number; y: number; w: number; h: number }[] = [];
  const ops = [...openings].sort((a, b) => a.c - b.c);
  let cur = -L / 2;
  for (const o of ops) {
    const left = o.c - o.w / 2;
    if (left - cur > 0.001) blocks.push({ x: (cur + left) / 2, y: Hh / 2, w: left - cur, h: Hh });
    if (o.y0 > 0) blocks.push({ x: o.c, y: o.y0 / 2, w: o.w, h: o.y0 });
    blocks.push({ x: o.c, y: (o.y1 + Hh) / 2, w: o.w, h: Hh - o.y1 });
    cur = o.c + o.w / 2;
  }
  if (L / 2 - cur > 0.001) blocks.push({ x: (cur + L / 2) / 2, y: Hh / 2, w: L / 2 - cur, h: Hh });
  return blocks;
}

// ---------- Textures procédurales ----------
export function woodTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 26; i++) {
    const y0 = Math.random() * 64;
    const amp = 1 + Math.random() * 3;
    const freq = 0.004 + Math.random() * 0.01;
    const ph = Math.random() * 10;
    g.strokeStyle = `rgba(${90 + Math.random() * 40},${50 + Math.random() * 25},20,${0.12 + Math.random() * 0.22})`;
    g.lineWidth = 0.6 + Math.random() * 1.8;
    g.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const y = y0 + Math.sin(x * freq + ph) * amp;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** BoxGeometry 1×1×1 dont les UV suivent l'axe Z (fil du bois dans la longueur). */
export function grainBox() {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + 0.5,
      y = pos.getY(i) + 0.5,
      z = pos.getZ(i) + 0.5;
    const nx = Math.abs(nor.getX(i)),
      ny = Math.abs(nor.getY(i));
    if (nx > 0.5) uv.setXY(i, z, y);
    else if (ny > 0.5) uv.setXY(i, z, x);
    else uv.setXY(i, x * 0.1, y);
  }
  uv.needsUpdate = true;
  return g;
}

export function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

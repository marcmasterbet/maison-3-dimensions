// État partagé entre la page (HTML) et la scène 3D, sans re-render React.
// p = position de scroll exprimée en "sections" (0 = accueil, 1 = section 1, ...).

export const scroll = {
  target: 0, // valeur brute lue sur le scroll
  p: 0, // valeur lissée, utilisée par la 3D
};

// Rotation libre choisie par l'utilisateur (cliquer-glisser), conservée d'une section à l'autre.
export const orbit = {
  yaw: 0, // cible (radians, illimité = 360°)
  pitch: 0, // cible (radians, borné)
  y: 0, // valeurs lissées
  x: 0,
  dragging: false,
};
export const PITCH_MIN = -0.35;
export const PITCH_MAX = 0.55;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const bell = (center: number, width: number, x: number) =>
  smooth(center - width, center - width * 0.35, x) * (1 - smooth(center + width * 0.35, center + width, x));

export function scrollToSection(i: number) {
  window.scrollTo({ top: i * window.innerHeight, behavior: "smooth" });
}

// ---- Scénario ----
// La maison est complète sur l'accueil, se "démonte" pour le diagnostic,
// puis chaque couche revient en place quand on arrive sur sa prestation.
export const disassembled = (p: number) => smooth(0.05, 0.8, p);
export const layer = (p: number, from: number, to: number) =>
  Math.max(1 - disassembled(p), smooth(from, to, p));

export const timeline = {
  trusses: (p: number) => layer(p, 2.35, 3.0),
  insulation: (p: number) => layer(p, 3.3, 3.95),
  vmc: (p: number) => layer(p, 3.55, 4.0),
  planks: (p: number) => layer(p, 4.25, 4.75),
  tiles: (p: number) => layer(p, 4.6, 5.15),
  gutters: (p: number) => layer(p, 5.35, 6.0),
  grilles: (p: number) => layer(p, 7.4, 8.0),
  // effets
  humidity: (p: number) => disassembled(p) * (1 - smooth(1.05, 1.7, p)),
  dirt: (p: number) => disassembled(p) * (1 - smooth(1.55, 2.05, p)),
  air: (p: number) => bell(7, 0.9, p),
  grilleGlow: (p: number) => bell(8, 0.8, p),
};

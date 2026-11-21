"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, N8AO, Vignette } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import House, { VMC_POS, VENT_POS } from "./House";
import { D, T, THETA, W, WALL_H, gutterLine } from "./geometry";
import { SECTIONS } from "./content";
import { hotspotEls } from "./hotspots";
import { bell, layout, orbit, scroll, smooth } from "./scroll";

const BG = "#0a1f4d";

// Une position de caméra (et un point visé) par section.
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const SHOTS: [THREE.Vector3, THREE.Vector3][] = [
  [v(11.5, 7.2, 12.5), v(0, 2.9, 0)], // accueil
  [v(3.6, 2.2, 11.5), v(0.3, 1.2, 1)], // humidité
  [v(-3.6, 3.4, 12.5), v(0.2, 1.8, 0)], // façade
  [v(-11.5, 7.5, 6.5), v(-0.8, 3.0, 0)], // charpente
  [v(-8.5, 8, 5), v(0.2, 2.8, 0)], // isolation
  [v(8.5, 12, 11), v(0.8, 3.9, 0)], // toiture
  [v(9.5, 4.2, 10), v(3.2, 2.7, 2)], // zinguerie
  [v(-6, 7.5, 12), v(0, 3.2, 0)], // air
  [v(6, 2.2, 11), v(0.4, 1.6, 1)], // rongeurs
  [v(-12, 7, 12), v(0, 2.9, 0)], // contact
];

// Calage de la maison sur l'accueil (desktop)
const HERO_GAP = 18; // marge sous le bouton (px)
const HERO_BOTTOM = 44; // marge en bas d'écran (px)
const HOUSE_FIT = 0.97; // hauteur de la maison (fraction d'écran) à distance 1
const HOUSE_FIT_W = 0.98; // largeur de la maison (fraction de la hauteur d'écran) à distance 1
const HOUSE_CENTER = 0.0; // correction du centre visuel (fraction d'écran)

const MOBILE_K = [1, 1.05, 1, 1, 1.15, 0.88, 1.22, 1.05, 1.12, 0.95];

function CameraRig() {
  const { camera, size, pointer } = useThree();
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const look = useRef(new THREE.Vector3(0, 2.9, 0));

  useFrame((state, dt) => {
    scroll.p = THREE.MathUtils.damp(scroll.p, scroll.target, 4, dt);
    const p = THREE.MathUtils.clamp(scroll.p, 0, SHOTS.length - 1);
    const i = Math.min(Math.floor(p), SHOTS.length - 2);
    const f = p - i;
    const e = f * f * (3 - 2 * f);
    pos.lerpVectors(SHOTS[i][0], SHOTS[i + 1][0], e);
    tgt.lerpVectors(SHOTS[i][1], SHOTS[i + 1][1], e);

    // légère rotation "vitrine" sur l'accueil et le contact, + parallaxe souris
    const idle = Math.max(1 - p, p - (SHOTS.length - 2), 0);
    const ang = Math.sin(state.clock.elapsedTime * 0.12) * 0.28 * idle + pointer.x * 0.06;
    const wide = size.width >= 900;
    const portrait = size.height > size.width;
    const aspect = size.width / size.height;
    // Accueil (desktop) : texte centré en haut, maison centrée en dessous, un peu plus grande.
    const heroK = 1 - smooth(0.05, 0.9, p);
    const hero = wide ? heroK : 0;
    // Accueil desktop : la maison occupe exactement la place libre sous le bouton (mesurée en px).
    const top = (layout.heroBottom || size.height * 0.4) + HERO_GAP;
    const availPx = Math.max(120, size.height - top - HERO_BOTTOM);
    // la maison doit tenir en hauteur dans la zone libre ET en largeur dans l'écran
    const heroDist = THREE.MathUtils.clamp(
      Math.max(HOUSE_FIT / (availPx / size.height), HOUSE_FIT_W / aspect),
      1.2,
      6
    );
    // si la largeur limite la taille (téléphone), la maison remonte vers le bouton au lieu de flotter au milieu
    const housePx = (HOUSE_FIT / heroDist) * size.height;
    const centerY = top + THREE.MathUtils.lerp(Math.min(availPx, housePx + 20) / 2, availPx / 2, 0.4);
    const heroOy = -(centerY - size.height / 2) + size.height * HOUSE_CENTER;
    // sur téléphone, recul ajusté par section pour que la maison ne touche jamais les bords
    const mk = THREE.MathUtils.lerp(MOBILE_K[i], MOBILE_K[i + 1], e);
    const base = wide ? 1.95 : aspect < 0.6 ? 3.1 * mk : portrait ? 2.3 : 2.0;
    // écran de fin (desktop) : la maison recule un peu et se décale à droite pour laisser la place au texte
    const endK = wide ? smooth(SHOTS.length - 1.9, SHOTS.length - 1.1, p) : 0;
    // écran de fin (téléphone) : la maison tient dans la place libre au-dessus du bloc de texte
    const endM = !wide ? smooth(SHOTS.length - 1.9, SHOTS.length - 1.1, p) : 0;
    const endAvail = Math.max(110, (layout.endTop || size.height * 0.4) - 28);
    const endDist = Math.max((HOUSE_FIT * 1.2) / (endAvail / size.height), HOUSE_FIT_W / aspect);
    const endOy = size.height / 2 - (16 + endAvail / 2);
    const dist =
      THREE.MathUtils.lerp(THREE.MathUtils.lerp(base, heroDist, heroK), endDist, endM) * (1 + 0.14 * endK);
    const rel = pos.clone().sub(tgt).multiplyScalar(dist);
    // rotation libre de l'utilisateur
    orbit.y = THREE.MathUtils.damp(orbit.y, orbit.yaw, 8, dt);
    orbit.x = THREE.MathUtils.damp(orbit.x, orbit.pitch, 8, dt);
    const touched = Math.abs(orbit.yaw) > 0.001 || Math.abs(orbit.pitch) > 0.001;
    rel.applyAxisAngle(THREE.Object3D.DEFAULT_UP, (touched ? 0 : ang) + orbit.y);
    const side = new THREE.Vector3().crossVectors(THREE.Object3D.DEFAULT_UP, rel).normalize();
    const elev = Math.asin(THREE.MathUtils.clamp(rel.y / rel.length(), -1, 1));
    const pitch = THREE.MathUtils.clamp(orbit.x, 0.06 - elev, 1.35 - elev);
    rel.applyAxisAngle(side, -pitch);
    if (!touched) rel.y += pointer.y * 0.4;
    camera.position.lerp(tgt.clone().add(rel), orbit.dragging ? 1 : 1 - Math.exp(-6 * dt));
    look.current.lerp(tgt, 1 - Math.exp(-6 * dt));
    camera.lookAt(look.current);

    // Décale le rendu pour laisser la place au texte (à gauche sur desktop, en bas sur mobile)
    const cam = camera as THREE.PerspectiveCamera;
    const ox = wide ? -size.width * (0.17 + 0.06 * endK) * (1 - hero) : 0;
    const mobileOy = size.height * (aspect < 0.6 ? 0.25 : portrait ? 0.16 : 0.12);
    const oy = wide ? heroOy * hero : THREE.MathUtils.lerp(THREE.MathUtils.lerp(mobileOy, heroOy, heroK), endOy, endM);
    cam.fov = wide ? 32 : 44;
    cam.setViewOffset(size.width, size.height, ox, oy, size.width, size.height);
    cam.updateProjectionMatrix();
  });
  return null;
}

// Points cliquables : projetés en 2D à chaque image (le DOM est rendu dans Experience).
const g = gutterLine(1);
const n = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
const HOTSPOTS: { section: number; pos: THREE.Vector3; normal?: THREE.Vector3 }[] = [
  { section: 1, pos: v(0.6, 0.6, D / 2 + 0.2), normal: n(0, 0, 1) },
  { section: 2, pos: v(W / 2 + 0.2, 1.9, -1.7), normal: n(1, 0, 0) },
  { section: 3, pos: v(-3.6, WALL_H + 1.5, 1.1) },
  { section: 4, pos: v(VMC_POS.x, VMC_POS.y + 0.45, VMC_POS.z) },
  { section: 5, pos: v(3.3, VENT_POS.y - 0.5, VENT_POS.z + 0.6), normal: n(0, Math.cos(THETA), Math.sin(THETA)) },
  { section: 6, pos: v(4.1, g.y, g.z + 0.1), normal: n(0, 0.3, 1) },
  { section: 7, pos: v(-1.2, 1.65, D / 2 + 0.3), normal: n(0, 0, 1) },
  { section: 8, pos: v(3.1, 0.42, D / 2 + T), normal: n(0, 0, 1) },
];

function HotspotProjector() {
  const { camera, size } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const p = scroll.p;
    const last = SECTIONS.length - 1;
    HOTSPOTS.forEach((h, i) => {
      const el = hotspotEls[i];
      if (!el) return;
      let o = Math.max(1 - smooth(0.05, 0.35, p), smooth(last - 0.5, last - 0.1, p), bell(h.section, 0.55, p));
      if (h.normal) {
        dir.copy(camera.position).sub(h.pos).normalize();
        o *= smooth(0.0, 0.3, dir.dot(h.normal));
      }
      tmp.copy(h.pos).project(camera);
      if (tmp.z > 1) o = 0;
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.02 ? "hidden" : "visible";
      el.style.pointerEvents = o > 0.5 ? "auto" : "none";
      el.dataset.active = Math.abs(p - h.section) < 0.4 ? "1" : "0";
    });
  });
  return null;
}

// Sol invisible : fond bleu uni (pas de ligne d'horizon), seule l'ombre de la maison est dessinée,
// avec un halo doux sous la maison pour la détacher du fond.
function Ground() {
  const glow = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(90,125,210,0.42)");
    grd.addColorStop(0.5, "rgba(70,105,190,0.16)");
    grd.addColorStop(1, "rgba(60,95,180,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[17, 64]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[40, 48]} />
        <shadowMaterial transparent opacity={0.38} />
      </mesh>
    </group>
  );
}

// Qualité adaptée à l'appareil : les téléphones démarrent en mode allégé,
// et tout appareil qui rame descend automatiquement d'un cran.
const isMobile = () =>
  typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900);

export default function Scene({ onReady, safe = false }: { onReady?: () => void; safe?: boolean }) {
  const mobile = useMemo(isMobile, []);
  const [high, setHigh] = useState(!safe);
  // Effets de post-traitement : ordinateur uniquement. Sur téléphone (iOS surtout) ils peuvent
  // saturer la mémoire graphique et faire planter la page ; la netteté vient de la résolution.
  const effects = high && !mobile && !safe;
  return (
    <Canvas
      shadows
      dpr={safe ? 1 : high ? (mobile ? [1.5, 2] : [1, 2]) : [1, 1.5]}
      camera={{ position: SHOTS[0][0].toArray(), fov: 32, near: 0.5, far: 160 }}
      gl={{ antialias: !safe, powerPreference: safe ? "default" : "high-performance", failIfMajorPerformanceCaveat: false }}
      onCreated={() => setTimeout(() => onReady?.(), 250)}
    >
      <PerformanceMonitor onDecline={() => setHigh(false)} bounds={() => [28, 55]} />
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 40, 95]} />

      <hemisphereLight args={["#bcd3ff", "#0a1a3a", 0.55]} />
      <directionalLight
        position={[9, 15, 8]}
        intensity={2.4}
        castShadow
        shadow-mapSize={mobile || safe ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-10, 6, -8]} intensity={0.7} color="#8fb4ff" />

      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2} position={[0, 8, 6]} scale={[12, 4, 1]} />
        <Lightformer intensity={1.2} position={[-8, 4, -4]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#9cc3ff" />
        <Lightformer intensity={0.8} position={[8, 3, -6]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#ffd9b0" />
      </Environment>

      <House light={mobile || !high} />
      <Ground />
      <HotspotProjector />

      <CameraRig />
      {effects && (
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={0.9} intensity={2.2} distanceFalloff={0.6} quality="medium" />
          <Vignette offset={0.2} darkness={0.3} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

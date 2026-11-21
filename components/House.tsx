"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  D, T, W, WALL_H, Y_R, TILE, WALLS,
  buildGrilles, buildGutters, buildInsulation, buildPlanks, buildRidgeCaps, buildTiles, buildTrusses,
  dotTexture, grainBox, roofPoint, wallBlocks, woodTexture, type Piece, type Opening,
} from "./geometry";
import { clamp, scroll, timeline } from "./scroll";

// ---------------------------------------------------------------------------
// Pièces instanciées qui "tombent" en place une à une selon la progression a ∈ [0,1]
// ---------------------------------------------------------------------------
function Pieces({
  items, geometry, material, getA, drop = 3.2, spread = 0.75, tint = 0.14,
}: {
  items: Piece[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  getA: (p: number) => number;
  drop?: number;
  spread?: number;
  tint?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const last = useRef(-1);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);

  useLayoutEffect(() => {
    const c = new THREE.Color();
    items.forEach((it, i) => {
      const v = 1 - tint / 2 + it.tint * tint;
      ref.current.setColorAt(i, c.setRGB(v, v, v));
    });
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    last.current = -1;
  }, [items, tint]);

  useFrame(() => {
    const a = getA(scroll.p);
    if (Math.abs(a - last.current) < 1e-4) return;
    last.current = a;
    const mesh = ref.current;
    mesh.visible = a > 0.001;
    for (let i = 0; i < items.length; i++) {
      const t = clamp(a * (1 + spread) - clamp(items[i].order) * spread);
      if (t <= 0) {
        mesh.setMatrixAt(i, zero);
        continue;
      }
      const e = 1 - Math.pow(1 - t, 3);
      m.makeTranslation(0, (1 - e) * drop, 0).multiply(items[i].m);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow receiveShadow frustumCulled={false} />
  );
}

/** Groupe qui descend en place selon la progression (pour les objets uniques). */
function Layer({ getA, drop = 2.5, children }: { getA: (p: number) => number; drop?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    const a = getA(scroll.p);
    const e = 1 - Math.pow(1 - a, 3);
    ref.current.visible = a > 0.01;
    ref.current.position.y = (1 - e) * drop;
    ref.current.scale.setScalar(0.6 + 0.4 * e);
  });
  return <group ref={ref}>{children}</group>;
}

// ---------------------------------------------------------------------------
// Matériaux
// ---------------------------------------------------------------------------
const CLEAN = new THREE.Color("#eef1f5");
const DIRTY = new THREE.Color("#a39478");

function useMaterials() {
  return useMemo(() => {
    const grain = woodTexture();
    const shutterTex = (() => {
      const c = document.createElement("canvas");
      c.width = 8;
      c.height = 64;
      const g = c.getContext("2d")!;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, 8, 64);
      g.fillStyle = "rgba(0,0,0,0.18)";
      for (let y = 0; y < 64; y += 4) g.fillRect(0, y, 8, 1);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1, 4);
      return t;
    })();
    return {
      wall: new THREE.MeshStandardMaterial({ color: CLEAN.clone(), roughness: 0.92 }),
      slab: new THREE.MeshStandardMaterial({ color: "#d9dee6", roughness: 0.95 }),
      timber: new THREE.MeshStandardMaterial({ color: "#c47a3c", map: grain, roughness: 0.72 }),
      planks: new THREE.MeshStandardMaterial({ color: "#e0a868", map: grain, roughness: 0.78 }),
      tiles: new THREE.MeshStandardMaterial({ color: "#3d434c", roughness: 0.78, metalness: 0.05 }),
      insulation: new THREE.MeshStandardMaterial({ color: "#efd27a", roughness: 1 }),
      zinc: new THREE.MeshStandardMaterial({ color: "#aab3bd", roughness: 0.35, metalness: 0.85 }),
      alu: new THREE.MeshStandardMaterial({ color: "#d3d8df", roughness: 0.3, metalness: 0.9 }),
      unit: new THREE.MeshStandardMaterial({ color: "#f3f5f8", roughness: 0.5 }),
      frame: new THREE.MeshStandardMaterial({ color: "#4a3122", roughness: 0.6 }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#0d1d3a", roughness: 0.06, metalness: 0.2, envMapIntensity: 1.6 }),
      sill: new THREE.MeshStandardMaterial({ color: "#f7f8fa", roughness: 0.7 }),
      shutter: new THREE.MeshStandardMaterial({ color: "#e6eaef", map: shutterTex, roughness: 0.7 }),
      grille: new THREE.MeshStandardMaterial({ color: "#8d96a1", metalness: 0.8, roughness: 0.4, emissive: new THREE.Color("#ff9a3c"), emissiveIntensity: 0 }),
    };
  }, []);
}
type Mats = ReturnType<typeof useMaterials>;

// ---------------------------------------------------------------------------
// Murs, ouvertures, pignon, plancher des combles
// ---------------------------------------------------------------------------
const unitBox = new THREE.BoxGeometry(1, 1, 1);

function OpeningParts({ o, mats }: { o: Opening; mats: Mats }) {
  const f = 0.06; // section du cadre
  const z = T / 2 - 0.07;
  const isDoor = o.y0 === 0;
  const h = o.y1 - o.y0;
  const cy = (o.y0 + o.y1) / 2;
  return (
    <group>
      <mesh geometry={unitBox} material={mats.glass} position={[o.c, cy, z - 0.02]} scale={[o.w, h, 0.02]} />
      {/* cadre */}
      <mesh geometry={unitBox} material={mats.frame} position={[o.c, o.y1 - f / 2, z]} scale={[o.w, f, 0.1]} castShadow />
      <mesh geometry={unitBox} material={mats.frame} position={[o.c, o.y0 + f / 2, z]} scale={[o.w, f, 0.1]} />
      <mesh geometry={unitBox} material={mats.frame} position={[o.c - o.w / 2 + f / 2, cy, z]} scale={[f, h, 0.1]} />
      <mesh geometry={unitBox} material={mats.frame} position={[o.c + o.w / 2 - f / 2, cy, z]} scale={[f, h, 0.1]} />
      <mesh geometry={unitBox} material={mats.frame} position={[o.c, cy, z]} scale={[0.045, h, 0.08]} />
      {isDoor && <mesh geometry={unitBox} material={mats.frame} position={[o.c, 1.0, z]} scale={[o.w, 0.05, 0.08]} />}
      {!isDoor && (
        <mesh geometry={unitBox} material={mats.sill} position={[o.c, o.y0 - 0.03, T / 2 + 0.03]} scale={[o.w + 0.16, 0.06, 0.14]} castShadow />
      )}
      {o.shutters &&
        [-1, 1].map((s) => (
          <mesh
            key={s}
            geometry={unitBox}
            material={mats.shutter}
            position={[o.c + s * (o.w / 2 + 0.25), cy, T / 2 + 0.03]}
            scale={[0.48, h + 0.06, 0.04]}
            castShadow
          />
        ))}
    </group>
  );
}

function Walls({ mats }: { mats: Mats }) {
  useFrame(() => {
    const d = timeline.dirt(scroll.p);
    mats.wall.color.lerpColors(CLEAN, DIRTY, d);
  });

  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-D / 2, WALL_H);
    s.lineTo(D / 2, WALL_H);
    s.lineTo(0, Y_R - 0.24);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    return g;
  }, []);

  return (
    <group>
      {WALLS.map((w, i) => (
        <group key={i} position={w.pos} rotation={[0, w.rotY, 0]}>
          {wallBlocks(w.length, WALL_H, w.openings).map((b, j) => (
            <mesh key={j} geometry={unitBox} material={mats.wall} position={[b.x, b.y, 0]} scale={[b.w, b.h, T]} castShadow receiveShadow />
          ))}
          {w.openings.map((o, j) => (
            <OpeningParts key={j} o={o} mats={mats} />
          ))}
        </group>
      ))}
      {/* plancher des combles */}
      <mesh geometry={unitBox} material={mats.slab} position={[0, WALL_H - 0.07, 0]} scale={[W, 0.14, D]} receiveShadow castShadow />
      {/* pignon droit (revient avec la charpente) */}
      <Layer getA={timeline.trusses} drop={1.5}>
        <mesh geometry={gable} material={mats.wall} position={[W / 2 - T, 0, 0]} castShadow receiveShadow />
      </Layer>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Humidité ascensionnelle (shader sur l'extérieur des murs)
// ---------------------------------------------------------------------------
const HUMID_H = 1.7;
function Humidity() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uLevel: { value: 0 },
          uIntensity: { value: 0 },
          uTime: { value: 0 },
          uStain: { value: new THREE.Color("#2f4560") },
          uGlow: { value: new THREE.Color("#5fd4ff") },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv; varying vec3 vW;
          void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          uniform float uLevel, uIntensity, uTime; uniform vec3 uStain, uGlow;
          varying vec2 vUv; varying vec3 vW;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
          void main(){
            float u = vW.x + vW.z;
            float h = vUv.y;
            float edge = uLevel + 0.05*sin(u*2.7 + uTime*0.8) + 0.035*sin(u*6.1 - uTime*0.5) + (noise(vec2(u*3., 2.))-.5)*0.08;
            float stain = smoothstep(edge, edge - 0.22, h);
            float blot = 0.55 + 0.45*noise(vec2(u*4.0, h*9.0));
            float line = smoothstep(0.025, 0.0, abs(h - edge)) * step(0.01, uLevel);
            vec3 col = mix(uStain, uGlow, line);
            float a = (stain * 0.62 * blot + line * 0.95) * uIntensity;
            if (a < 0.003) discard;
            gl_FragColor = vec4(col, a);
          }`,
      }),
    []
  );

  useFrame((s) => {
    const k = timeline.humidity(scroll.p);
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uLevel.value = 0.62 * k;
    mat.uniforms.uIntensity.value = clamp(k * 1.6);
  });

  // segments hors portes
  const segs = useMemo(() => {
    const out: { wall: number; x: number; w: number }[] = [];
    WALLS.forEach((w, i) => {
      const L = (i < 2 ? W : D) + 0.03;
      const doors = w.openings.filter((o) => o.y0 === 0).sort((a, b) => a.c - b.c);
      let cur = -L / 2;
      for (const d of doors) {
        out.push({ wall: i, x: (cur + d.c - d.w / 2) / 2, w: d.c - d.w / 2 - cur });
        cur = d.c + d.w / 2;
      }
      out.push({ wall: i, x: (cur + L / 2) / 2, w: L / 2 - cur });
    });
    return out;
  }, []);

  return (
    <group>
      {segs.map((s, i) => {
        const w = WALLS[s.wall];
        return (
          <group key={i} position={w.pos} rotation={[0, w.rotY, 0]}>
            <mesh material={mat} position={[s.x, HUMID_H / 2, T / 2 + 0.012]} renderOrder={2}>
              <planeGeometry args={[s.w, HUMID_H]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// VMC, gaines et chatière
// ---------------------------------------------------------------------------
export const VMC_POS = new THREE.Vector3(-1.6, WALL_H + 0.52, 0.7);
export const VENT_POS = roofPoint(1, 2.6, 1.35, 0.12);

function Ventilation({ mats }: { mats: Mats }) {
  const ducts = useMemo(() => {
    const v = VMC_POS;
    const out = VENT_POS.clone().add(new THREE.Vector3(0, -0.15, 0));
    const curves = [
      new THREE.CatmullRomCurve3([
        v.clone().add(new THREE.Vector3(0.35, 0.05, 0)),
        new THREE.Vector3(0.2, WALL_H + 1.1, 0.9),
        new THREE.Vector3(1.9, out.y - 0.5, out.z - 0.35),
        out,
      ]),
      new THREE.CatmullRomCurve3([
        v.clone().add(new THREE.Vector3(-0.35, -0.05, 0.1)),
        new THREE.Vector3(-2.6, WALL_H + 0.45, 1.3),
        new THREE.Vector3(-3.1, WALL_H + 0.3, 1.8),
        new THREE.Vector3(-3.1, WALL_H + 0.05, 1.8),
      ]),
      new THREE.CatmullRomCurve3([
        v.clone().add(new THREE.Vector3(0, -0.05, -0.28)),
        new THREE.Vector3(-0.6, WALL_H + 0.42, -0.8),
        new THREE.Vector3(0.5, WALL_H + 0.3, -1.5),
        new THREE.Vector3(0.5, WALL_H + 0.05, -1.5),
      ]),
    ];
    return curves.map((c) => new THREE.TubeGeometry(c, 48, 0.075, 12, false));
  }, []);

  return (
    <group>
      <Layer getA={timeline.vmc}>
        <mesh material={mats.unit} position={VMC_POS} castShadow>
          <primitive object={new RoundedBoxGeometry(0.75, 0.42, 0.6, 3, 0.05)} attach="geometry" />
        </mesh>
        <mesh geometry={unitBox} material={mats.zinc} position={[VMC_POS.x, VMC_POS.y + 0.215, VMC_POS.z]} scale={[0.5, 0.01, 0.4]} />
        {ducts.map((g, i) => (
          <mesh key={i} geometry={g} material={mats.alu} castShadow />
        ))}
      </Layer>
      <Layer getA={timeline.tiles} drop={3}>
        <group position={VENT_POS}>
          <mesh material={mats.tiles} castShadow>
            <cylinderGeometry args={[0.13, 0.16, 0.28, 20]} />
          </mesh>
          <mesh material={mats.tiles} position={[0, 0.2, 0]} castShadow>
            <coneGeometry args={[0.24, 0.16, 20]} />
          </mesh>
        </group>
      </Layer>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Flux d'air (qualité de l'air intérieur)
// ---------------------------------------------------------------------------
function AirFlow({ count }: { count: number }) {
  const COUNT = count;
  const { geo, data, curves } = useMemo(() => {
    const vent = VENT_POS;
    const vmc = VMC_POS;
    const tail = [
      new THREE.Vector3(vmc.x, vmc.y, vmc.z),
      new THREE.Vector3(0.2, WALL_H + 1.1, 0.9),
      new THREE.Vector3(2.0, vent.y - 0.45, vent.z - 0.35),
      vent.clone(),
      vent.clone().add(new THREE.Vector3(0.2, 1.4, 0.5)),
      vent.clone().add(new THREE.Vector3(0.8, 2.6, 0.6)),
    ];
    const curves = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.1, 1.6, 5.2), new THREE.Vector3(-3.1, 1.6, 2.8), new THREE.Vector3(-2.4, 2.0, 1.6),
        new THREE.Vector3(-3.1, 2.7, 1.8), new THREE.Vector3(-3.1, WALL_H + 0.15, 1.8), ...tail,
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.6, 1.6, -5.2), new THREE.Vector3(2.6, 1.6, -2.6), new THREE.Vector3(1.2, 1.9, -1.6),
        new THREE.Vector3(0.5, 2.7, -1.5), new THREE.Vector3(0.5, WALL_H + 0.15, -1.5), ...tail,
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(6.4, 1.6, 0), new THREE.Vector3(3.8, 1.6, 0), new THREE.Vector3(2.2, 2.0, -0.8),
        new THREE.Vector3(0.5, 2.7, -1.5), new THREE.Vector3(0.5, WALL_H + 0.15, -1.5), ...tail,
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.2, 1.6, 5.2), new THREE.Vector3(-1.2, 1.7, 2.6), new THREE.Vector3(-2.4, 2.1, 1.9),
        new THREE.Vector3(-3.1, 2.7, 1.8), new THREE.Vector3(-3.1, WALL_H + 0.15, 1.8), ...tail,
      ]),
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    const data = Array.from({ length: COUNT }, (_, i) => ({
      c: i % curves.length,
      phase: Math.random(),
      speed: 0.05 + Math.random() * 0.035,
      jx: (Math.random() - 0.5) * 0.35,
      jy: (Math.random() - 0.5) * 0.35,
      jz: (Math.random() - 0.5) * 0.35,
    }));
    return { geo, data, curves };
  }, [COUNT]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.2,
        map: dotTexture(),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }),
    []
  );
  const ref = useRef<THREE.Points>(null!);
  const v = useMemo(() => new THREE.Vector3(), []);
  const cIn = useMemo(() => new THREE.Color("#66d9ff"), []);
  const cOut = useMemo(() => new THREE.Color("#c9f3ff"), []);
  const col = useMemo(() => new THREE.Color(), []);

  useFrame((s) => {
    const k = timeline.air(scroll.p);
    mat.opacity = k;
    ref.current.visible = k > 0.01;
    if (!ref.current.visible) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colA = geo.attributes.color as THREE.BufferAttribute;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const u = (d.phase + t * d.speed) % 1;
      curves[d.c].getPointAt(u, v);
      const spread = Math.sin(u * Math.PI);
      pos.setXYZ(i, v.x + d.jx * spread, v.y + d.jy * spread, v.z + d.jz * spread);
      col.lerpColors(cIn, cOut, u);
      const fade = Math.min(1, u * 8, (1 - u) * 6);
      colA.setXYZ(i, col.r * fade, col.g * fade, col.b * fade);
    }
    pos.needsUpdate = true;
    colA.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} renderOrder={10} frustumCulled={false} />;
}

// ---------------------------------------------------------------------------
// Maison complète
// ---------------------------------------------------------------------------
export default function House({ light = false }: { light?: boolean }) {
  const mats = useMaterials();
  const geo = useMemo(
    () => ({
      grain: grainBox(),
      box: new THREE.BoxGeometry(1, 1, 1),
      tile: new RoundedBoxGeometry(TILE.w, TILE.t, TILE.l, 2, 0.012),
      cap: new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16, 1, false, 0, Math.PI),
      pipe: new THREE.CylinderGeometry(0.075, 0.075, 1, 16),
    }),
    []
  );
  const items = useMemo(
    () => ({
      trusses: buildTrusses(),
      planks: buildPlanks(),
      tiles: buildTiles(),
      caps: buildRidgeCaps(),
      insulation: buildInsulation(),
      gutters: buildGutters(),
      grilles: buildGrilles(),
    }),
    []
  );
  const insulationGeo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.18), []);

  useFrame(() => {
    mats.grille.emissiveIntensity = timeline.grilleGlow(scroll.p) * 2.2;
  });

  return (
    <group>
      <Walls mats={mats} />
      <Humidity />
      <Pieces items={items.trusses} geometry={geo.grain} material={mats.timber} getA={timeline.trusses} />
      <Pieces items={items.insulation} geometry={insulationGeo} material={mats.insulation} getA={timeline.insulation} drop={2} tint={0.08} />
      <Ventilation mats={mats} />
      <Pieces items={items.planks} geometry={geo.grain} material={mats.planks} getA={timeline.planks} drop={2.2} tint={0.22} />
      <Pieces items={items.tiles} geometry={geo.tile} material={mats.tiles} getA={timeline.tiles} drop={2.4} tint={0.25} />
      <Pieces items={items.caps} geometry={geo.cap} material={mats.tiles} getA={timeline.tiles} drop={2.4} tint={0.1} />
      <Pieces items={items.gutters} geometry={geo.pipe} material={mats.zinc} getA={timeline.gutters} drop={1.6} tint={0} />
      <Pieces items={items.grilles} geometry={geo.box} material={mats.grille} getA={timeline.grilles} drop={1} tint={0} />
      <AirFlow count={light ? 450 : 900} />
    </group>
  );
}


import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment, Lightformer,
  Line,
} from '@react-three/drei';
import { Aperture, Box, Camera, Grid3x3, Ruler, Scan, Type, Volume2 } from 'lucide-react';
import { useStore } from '../store';
import { ELEMENTS, stickRadius } from '../lib/elements';
import {
  add, arcPoints, centroid, dist, angleDeg, norm, cross, sub, scale, type Vec3,
} from '../lib/geometry';
import type { Atom, Bond, DisplayMode, Selection } from '../types';
import { bus, type CamFly, type FxDissolve, type FxSpark } from '../lib/bus';
import { SCENES } from '../lib/scenes';
import { useT, ELEMENT_NAME_TR } from '../lib/i18n';

const frac = (x: number) => x - Math.floor(x);

/* ---------- optional narration audio (clips live in public/audio) ---------- */
const NARRATION: Record<string, string> = {
  'scene:vibrations': 'audio/scene-vibrations.mp3',
  'scene:formation': 'audio/scene-formation.mp3',
  'scene:phases': 'audio/scene-phases.mp3',
  'scene:resonance': 'audio/scene-resonance.mp3',
  'demo:intro': 'audio/demo-intro.mp3',
};
const NARR_KEY = 'molecular-studio:narration:v1';
let narrAudio: HTMLAudioElement | null = null;

export const narrationEnabled = (): boolean => {
  try {
    return localStorage.getItem(NARR_KEY) !== 'off';
  } catch {
    return true;
  }
};
export const toggleNarration = (): boolean => {
  const next = !narrationEnabled();
  try {
    localStorage.setItem(NARR_KEY, next ? 'on' : 'off');
  } catch {
    /* storage unavailable — toggle stays in-memory */
  }
  return next;
};
/** plays the clip if the file exists; a missing file leaves the studio silent */
function playNarration(key: string) {
  if (!narrationEnabled()) return;
  const src = NARRATION[key];
  if (!src) return;
  stopNarration();
  narrAudio = new Audio(src);
  narrAudio.volume = 0.9;
  narrAudio.play().catch(() => {
    narrAudio = null;
  });
}
function stopNarration() {
  if (narrAudio) {
    narrAudio.pause();
    narrAudio = null;
  }
}

/* ---------- shared geometry (module scope, never disposed per-mesh) ---------- */
const sphereGeo = new THREE.SphereGeometry(1, 40, 28);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 22, 1);
const UP = new THREE.Vector3(0, 1, 0);

function atomRadius(el: Atom['element'], mode: DisplayMode): number {
  if (mode === 'spacefill') return ELEMENTS[el].vdw * 0.95;
  if (mode === 'wireframe') return 0.14;
  return stickRadius(el);
}

/* ---------- canvas text sprite labels (no network fonts) ---------- */
const labelCache = new Map<string, { tex: THREE.Texture; aspect: number }>();

function makeLabel(text: string, color: string, chip: boolean): { tex: THREE.Texture; aspect: number } {
  const key = `${chip ? 'c' : 'l'}:${color}:${text}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = chip ? '500 44px "IBM Plex Mono", monospace' : '600 88px "IBM Plex Sans", sans-serif';
  ctx.font = font;
  const tw = ctx.measureText(text).width;
  const padX = chip ? 26 : 24;
  const padY = chip ? 16 : 24;
  const w = Math.ceil(tw + padX * 2);
  const h = chip ? 76 : 136;
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  if (chip) {
    const r = 12;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, r);
    ctx.fillStyle = 'rgba(13,17,23,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(43,52,64,0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2 + (chip ? 2 : 6));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const out = { tex, aspect: w / h };
  labelCache.set(key, out);
  return out;
}

function AtomLabel({ symbol, position }: { symbol: string; position: Vec3 }) {
  const { tex, aspect } = useMemo(() => makeLabel(symbol, 'rgba(230,235,242,0.92)', false), [symbol]);
  const h = 0.26;
  return (
    <sprite position={position} scale={[h * aspect, h, 1]} renderOrder={20}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} toneMapped={false} />
    </sprite>
  );
}

function ChipLabel({ text, color, position, height = 0.19 }: { text: string; color: string; position: Vec3; height?: number }) {
  const { tex, aspect } = useMemo(() => makeLabel(text, color, true), [text, color]);
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={21}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} toneMapped={false} />
    </sprite>
  );
}

/* ---------- atom ---------- */
/** bond tool: id of the atom a drag-to-bond gesture started from */
let bondDragFrom: string | null = null;
/** set when a drag-to-bond just completed, so the trailing click is swallowed */
let bondJustMade = false;

function SourcePulse({ r }: { r: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const k = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 5);
    ref.current.scale.setScalar(r * (1.22 + 0.1 * k));
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.16 * k;
  });
  return (
    <mesh ref={ref} geometry={sphereGeo} dispose={null}>
      <meshBasicMaterial color="#2ad2e8" transparent opacity={0.2} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  );
}

const dragPlane = new THREE.Plane();
const hitPoint = new THREE.Vector3();
const camDir = new THREE.Vector3();
const grabOffset = new THREE.Vector3();

function AtomMesh({ atom }: { atom: Atom }) {
  const mode = useStore((s) => s.displayMode);
  const tool = useStore((s) => s.tool);
  const hovered = useStore((s) => s.hoveredId === atom.id);
  const selected = useStore((s) => s.selection?.kind === 'atom' && s.selection.id === atom.id);
  const showLabels = useStore((s) => s.showLabels);
  const isBondSource = useStore((s) => s.bondSource === atom.id);
  const measured = useStore((s) => s.measurePicks.includes(atom.id));
  const r = atomRadius(atom.element, mode);
  const cpk = ELEMENTS[atom.element].cpk;
  const moved = useRef(false);

  const startDrag = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element & { setPointerCapture: (id: number) => void }).setPointerCapture(e.pointerId);
    const st = useStore.getState();
    st.beginDrag();
    st.setDragging(atom.id);
    moved.current = false;
    e.camera.getWorldDirection(camDir).negate();
    dragPlane.setFromNormalAndCoplanarPoint(camDir, e.object.position);
    if (e.ray.intersectPlane(dragPlane, hitPoint)) {
      grabOffset.copy(e.object.position).sub(hitPoint);
    } else grabOffset.set(0, 0, 0);
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const st = useStore.getState();
    if (st.draggingId !== atom.id) return;
    e.stopPropagation();
    if (e.ray.intersectPlane(dragPlane, hitPoint)) {
      moved.current = true;
      const p = hitPoint.add(grabOffset);
      st.moveAtom(atom.id, [p.x, p.y, p.z]);
    }
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    const st = useStore.getState();
    if (st.draggingId !== atom.id) return;
    e.stopPropagation();
    (e.target as Element & { releasePointerCapture: (id: number) => void }).releasePointerCapture(e.pointerId);
    st.endDrag();
    if (!moved.current) st.select({ kind: 'atom', id: atom.id });
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (moved.current) {
      moved.current = false;
      return; // this was a drag, not a click
    }
    const st = useStore.getState();
    if (bondJustMade) {
      bondJustMade = false;
      return; // trailing click of a finished drag-to-bond
    }
    if (st.tool === 'bond') {
      if (!st.bondSource) st.setBondSource(atom.id);
      else st.bondAtoms(st.bondSource, atom.id);
    } else if (st.tool === 'delete') {
      st.deleteAtom(atom.id);
    } else if (st.tool === 'measure') {
      st.pushMeasure(atom.id);
    } else if (st.tool === 'select') {
      st.select({ kind: 'atom', id: atom.id });
    }
  };

  const highlight = selected || isBondSource || measured;
  const draggable = tool === 'move' || tool === 'select';

  return (
    <group position={atom.position}>
      <mesh
        geometry={sphereGeo}
        dispose={null}
        scale={r}
        onPointerOver={(e) => { e.stopPropagation(); useStore.getState().hover(atom.id); }}
        onPointerOut={() => { if (useStore.getState().hoveredId === atom.id) useStore.getState().hover(null); }}
        onPointerDown={(e) => {
          const st = useStore.getState();
          if (st.tool === 'bond') {
            // a source already picked = second click of the click-click flow;
            // leave the gesture to onClick so the source is not overwritten
            if (st.bondSource && st.bondSource !== atom.id) return;
            e.stopPropagation();
            bondDragFrom = atom.id; // drag-to-bond: release on another atom
            st.setBondSource(atom.id);
            st.setDragging('bond'); // freezes OrbitControls so the target stays under the cursor
            return;
          }
          if (draggable) startDrag(e);
        }}
        onPointerMove={onMove}
        onPointerUp={(e) => {
          const st = useStore.getState();
          if (bondDragFrom && st.bondSource === bondDragFrom) {
            e.stopPropagation();
            if (bondDragFrom !== atom.id) {
              st.bondAtoms(bondDragFrom, atom.id);
              bondJustMade = true;
            }
            bondDragFrom = null;
            st.setDragging(null);
            return;
          }
          bondDragFrom = null;
          endDrag(e);
        }}
        onClick={onClick}
      >
        <meshPhysicalMaterial
          color={cpk}
          roughness={0.26}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={1.15}
          emissive="#2ad2e8"
          emissiveIntensity={highlight ? 0.32 : hovered ? 0.14 : 0}
        />
      </mesh>
      {highlight && (
        <mesh geometry={sphereGeo} dispose={null} scale={r * 1.16}>
          <meshBasicMaterial color="#2ad2e8" transparent opacity={0.16} depthWrite={false} side={THREE.BackSide} />
        </mesh>
      )}
      {isBondSource && <SourcePulse r={r} />}
      {showLabels && mode !== 'spacefill' && (
        <AtomLabel symbol={atom.element} position={[0, r + 0.26, 0]} />
      )}
    </group>
  );
}

/* ---------- bond ---------- */
function BondStrand({ from, to, radius }: { from: Vec3; to: Vec3; radius: number }) {
  const { mid, quat, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const L = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
    return { mid: a.clone().add(b).multiplyScalar(0.5), quat: q, length: L };
  }, [from, to]);
  return (
    <mesh geometry={cylGeo} dispose={null} position={mid} quaternion={quat} scale={[radius, length, radius]}>
      <meshPhysicalMaterial color="#aeb6c2" roughness={0.32} metalness={0.35} clearcoat={0.7} clearcoatRoughness={0.2} envMapIntensity={0.9} />
    </mesh>
  );
}

function BondMesh({ bond }: { bond: Bond }) {
  const mode = useStore((s) => s.displayMode);
  const selected = useStore((s) => s.selection?.kind === 'bond' && s.selection.id === bond.id);
  const hovered = useStore((s) => s.hoveredId === bond.id);
  const atoms = useStore((s) => s.molecule.atoms);
  const a = atoms.find((x) => x.id === bond.a);
  const b = atoms.find((x) => x.id === bond.b);
  if (!a || !b || mode === 'spacefill') return null;

  const pa = new THREE.Vector3(...a.position);
  const pb = new THREE.Vector3(...b.position);
  const dir = pb.clone().sub(pa).normalize();
  const rA = atomRadius(a.element, mode);
  const rB = atomRadius(b.element, mode);
  const trim = mode === 'wireframe' ? 0 : (rA + rB) * 0.35;
  const from = pa.clone().addScaledVector(dir, trim * 0.5);
  const to = pb.clone().addScaledVector(dir, -trim * 0.5);
  const perp = norm(cross(dir.toArray() as Vec3, Math.abs(dir.y) < 0.9 ? [0, 1, 0] : [1, 0, 0]) as Vec3);

  const strands: { off: number; radius: number }[] =
    mode === 'wireframe'
      ? [{ off: 0, radius: 0.02 }]
      : bond.order === 1
        ? [{ off: 0, radius: 0.085 }]
        : bond.order === 2
          ? [{ off: -0.1, radius: 0.055 }, { off: 0.1, radius: 0.055 }]
          : [{ off: -0.12, radius: 0.045 }, { off: 0, radius: 0.045 }, { off: 0.12, radius: 0.045 }];

  const p = new THREE.Vector3(...perp);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        const st = useStore.getState();
        if (st.tool === 'delete') st.deleteBond(bond.id);
        else if (st.tool === 'select' || st.tool === 'bond') st.select({ kind: 'bond', id: bond.id });
      }}
      onPointerOver={(e) => { e.stopPropagation(); useStore.getState().hover(bond.id); }}
      onPointerOut={() => { if (useStore.getState().hoveredId === bond.id) useStore.getState().hover(null); }}
    >
      {strands.map((s, i) => {
        const off = p.clone().multiplyScalar(s.off);
        return (
          <BondStrand
            key={i}
            from={from.clone().add(off).toArray() as Vec3}
            to={to.clone().add(off).toArray() as Vec3}
            radius={s.radius}
          />
        );
      })}
      {(selected || hovered) && (
        <mesh
          geometry={cylGeo}
          dispose={null}
          position={pa.clone().add(pb).multiplyScalar(0.5).toArray() as Vec3}
          quaternion={new THREE.Quaternion().setFromUnitVectors(UP, pb.clone().sub(pa).normalize())}
          scale={[selected ? 0.13 : 0.11, pa.distanceTo(pb), selected ? 0.13 : 0.11]}
        >
          <meshBasicMaterial color="#2ad2e8" transparent opacity={selected ? 0.4 : 0.22} depthWrite={false} />
        </mesh>
      )}
      {selected && (
        <mesh position={pa.clone().add(pb).multiplyScalar(0.5).toArray() as Vec3}>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshBasicMaterial color="#2ad2e8" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* ---------- annotations ---------- */
function AngleAnnotation({ atom }: { atom: Atom }) {
  const atoms = useStore((s) => s.molecule.atoms);
  const bonds = useStore((s) => s.molecule.bonds);
  const ns = bonds
    .filter((b) => b.a === atom.id || b.b === atom.id)
    .map((b) => atoms.find((a) => a.id === (b.a === atom.id ? b.b : b.a)))
    .filter((x): x is Atom => Boolean(x))
    .slice(0, 2);
  if (ns.length < 2) return null;
  const deg = angleDeg(ns[0].position, atom.position, ns[1].position);
  const pts = arcPoints(ns[0].position, atom.position, ns[1].position, 0.78);
  const mid = pts[Math.floor(pts.length / 2)];
  return (
    <group>
      <Line points={pts} color="#2ad2e8" lineWidth={1.4} transparent opacity={0.75} />
      <ChipLabel text={`${deg.toFixed(1)}°`} color="#2ad2e8" position={add(mid, scale(norm(sub(mid, atom.position)), 0.34))} />
    </group>
  );
}

function MeasureOverlay() {
  const picks = useStore((s) => s.measurePicks);
  const atoms = useStore((s) => s.molecule.atoms);
  const picked = picks.map((id) => atoms.find((a) => a.id === id)).filter((x): x is Atom => Boolean(x));
  if (picked.length < 2) return null;
  const [a, b, c] = picked;
  const d = dist(a.position, b.position);
  const mid = scale(add(a.position, b.position), 0.5);
  return (
    <group>
      <Line points={[a.position, b.position]} color="#e8b44c" lineWidth={1.6} dashed dashSize={0.12} gapSize={0.08} />
      <ChipLabel text={`${d.toFixed(3)} Å`} color="#e8b44c" position={add(mid, [0, 0.28, 0])} />
      {c && (
        <>
          <Line
            points={arcPoints(a.position, b.position, c.position, 0.78)}
            color="#e8b44c"
            lineWidth={1.4}
            transparent
            opacity={0.8}
          />
          <ChipLabel
            text={`${angleDeg(a.position, b.position, c.position).toFixed(1)}°`}
            color="#e8b44c"
            position={add(scale(norm(sub(b.position, centroid([a.position, b.position, c.position]))), -1.05), b.position)}
          />
        </>
      )}
    </group>
  );
}

function BondPreview() {
  const source = useStore((s) => s.bondSource);
  const hovered = useStore((s) => s.hoveredId);
  const atoms = useStore((s) => s.molecule.atoms);
  if (!source || !hovered || hovered === source) return null;
  const a = atoms.find((x) => x.id === source);
  const b = atoms.find((x) => x.id === hovered);
  if (!a || !b) return null;
  return <Line points={[a.position, b.position]} color="#2ad2e8" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.08} transparent opacity={0.8} />;
}

/* ---------- transient FX (reactive feedback for user actions) ---------- */
interface FxItem { id: number; kind: 'spark' | 'dissolve'; pos: Vec3; color: string; }
let fxSeq = 0;

function SparkFx({ pos, onDone }: { pos: Vec3; onDone: () => void }) {
  const shell = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const t0 = useRef(-1);
  useFrame((state) => {
    if (t0.current < 0) t0.current = state.clock.elapsedTime;
    const e = (state.clock.elapsedTime - t0.current) / 0.55;
    if (e >= 1) { onDone(); return; }
    shell.current?.scale.setScalar(0.12 + e * 0.95);
    if (shell.current) (shell.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - e);
    core.current?.scale.setScalar(0.05 + e * 0.28);
    if (core.current) (core.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - e);
  });
  return (
    <group position={pos}>
      <mesh ref={shell} geometry={sphereGeo} dispose={null}>
        <meshBasicMaterial color="#2ad2e8" transparent opacity={0.45} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <mesh ref={core} geometry={sphereGeo} dispose={null}>
        <meshBasicMaterial color="#bff4fb" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

const shardDir = (i: number, seed: number): Vec3 => {
  const a = i * 2.39996 + seed * 0.7;
  const b = Math.acos(1 - 2 * frac(Math.sin(i * 12.9898 + seed) * 43758.5453));
  return [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)];
};

function DissolveFx({ pos, color, onDone }: { pos: Vec3; color: string; onDone: () => void }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const t0 = useRef(-1);
  const dirs = useMemo(() => Array.from({ length: 9 }, (_, i) => shardDir(i, pos[0] + pos[2])), [pos]);
  useFrame((state) => {
    if (t0.current < 0) t0.current = state.clock.elapsedTime;
    const e = (state.clock.elapsedTime - t0.current) / 0.7;
    if (e >= 1) { onDone(); return; }
    refs.current.forEach((m, i) => {
      if (!m) return;
      const d = dirs[i];
      m.position.set(pos[0] + d[0] * e * 1.15, pos[1] + d[1] * e * 1.15 + e * e * 0.2, pos[2] + d[2] * e * 1.15);
      m.scale.setScalar(Math.max(0.001, 0.055 * (1 - e)));
      (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - e);
    });
  });
  return (
    <group>
      {dirs.map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} geometry={sphereGeo} dispose={null} position={pos}>
          <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function FxLayer() {
  const [items, setItems] = useState<FxItem[]>([]);
  useEffect(
    () => {
      const off1 = bus.on('fx:spark', (p: FxSpark) =>
        setItems((x) => [...x.slice(-7), { id: ++fxSeq, kind: 'spark', pos: p.pos, color: '#2ad2e8' }]));
      const off2 = bus.on('fx:dissolve', (p: FxDissolve) =>
        setItems((x) => [...x.slice(-7), { id: ++fxSeq, kind: 'dissolve', pos: p.pos, color: p.color }]));
      return () => { off1(); off2(); };
    },
    [],
  );
  const remove = (id: number) => setItems((x) => x.filter((i) => i.id !== id));
  return (
    <>
      {items.map((i) =>
        i.kind === 'spark' ? (
          <SparkFx key={i.id} pos={i.pos} onDone={() => remove(i.id)} />
        ) : (
          <DissolveFx key={i.id} pos={i.pos} color={i.color} onDone={() => remove(i.id)} />
        ),
      )}
    </>
  );
}

/* ---------- living scene: depth particles + hydrogen-bond glints ---------- */
function AmbientParticles() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 90;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (frac(Math.sin(i * 12.9898) * 43758.5453) * 2 - 1) * 9;
      arr[i * 3 + 1] = frac(Math.sin(i * 78.233) * 12543.2107) * 7 - 2.6;
      arr[i * 3 + 2] = (frac(Math.sin(i * 39.425) * 9631.7713) * 2 - 1) * 9;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.008;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.045} color="#2ad2e8" transparent opacity={0.13} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function HBondGlints() {
  const atoms = useStore((s) => s.molecule.atoms);
  const bonds = useStore((s) => s.molecule.bonds);
  const mats = useRef<(THREE.Material | null)[]>([]);
  const pairs = useMemo(() => {
    const bonded = new Set(bonds.map((b) => [b.a, b.b].sort().join('|')));
    const out: [Vec3, Vec3][] = [];
    for (let i = 0; i < atoms.length && out.length < 10; i++)
      for (let j = i + 1; j < atoms.length && out.length < 10; j++) {
        if (bonded.has([atoms[i].id, atoms[j].id].sort().join('|'))) continue;
        const d = dist(atoms[i].position, atoms[j].position);
        if (d > 2.2 && d < 3.4) out.push([atoms[i].position, atoms[j].position]);
      }
    return out;
  }, [atoms, bonds]);
  useFrame((state) => {
    const o = 0.05 + 0.08 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.7));
    mats.current.forEach((m) => { if (m) m.opacity = o; });
  });
  if (!pairs.length) return null;
  return (
    <group>
      {pairs.map(([a, b], i) => (
        <Line
          key={i}
          points={[a, b]}
          color="#7fb4ff"
          lineWidth={1}
          dashed
          dashSize={0.14}
          gapSize={0.12}
          transparent
          opacity={0.1}
          ref={(el: unknown) => {
            mats.current[i] = el ? ((el as { material: THREE.Material }).material) : null;
          }}
        />
      ))}
    </group>
  );
}

/* ---------- molecular scenes: deterministic driver ---------- */
let sceneStart = 0;

function SceneDriver() {
  const sceneActive = useStore((s) => s.sceneActive);
  useEffect(() => {
    if (!sceneActive) {
      stopNarration();
      return;
    }
    const def = SCENES.find((s) => s.id === sceneActive);
    if (!def) return;
    sceneStart = performance.now();
    const mol = def.apply(0);
    const c = centroid(mol.atoms.map((a) => a.position));
    let r = 1;
    for (const a of mol.atoms) r = Math.max(r, dist(a.position, c) + 1);
    bus.emit('cam:fly', { target: c, dist: r * 2.1, ms: 900 });
    playNarration(`scene:${sceneActive}`);
    return () => stopNarration();
  }, [sceneActive]);
  useFrame(() => {
    if (!sceneActive) return;
    const def = SCENES.find((s) => s.id === sceneActive);
    if (!def) return;
    const t = ((performance.now() - sceneStart) / 1000 / def.duration) % 1;
    useStore.setState({ molecule: def.apply(t) });
  });
  return null;
}

/* ---------- guided tour: camera flights + captions ---------- */
interface TourStop {
  target: Vec3;
  dist: number;
  caption: { en: string; tr: string };
  select?: Selection;
  measure?: string[];
}
let tourTimers: ReturnType<typeof setTimeout>[] = [];

function TourController() {
  const tourActive = useStore((s) => s.tourActive);
  useEffect(() => {
    tourTimers.forEach(clearTimeout);
    tourTimers = [];
    if (!tourActive) {
      bus.emit('tour:stop', null);
      return;
    }
    const st = useStore.getState();
    const { atoms, bonds } = st.molecule;
    if (atoms.length < 2) {
      st.setTourActive(false);
      return;
    }
    const a0 = atoms[0];
    const b0 = bonds[0] ?? null;
    const pa = b0 ? atoms.find((x) => x.id === b0.a) : undefined;
    const pb = b0 ? atoms.find((x) => x.id === b0.b) : undefined;
    const deg = (id: string) => bonds.filter((b) => b.a === id || b.b === id).length;
    const angAtom = atoms.find((a) => deg(a.id) >= 2) ?? a0;
    const ns = bonds
      .filter((b) => b.a === angAtom.id || b.b === angAtom.id)
      .map((b) => atoms.find((x) => x.id === (b.a === angAtom.id ? b.b : b.a)))
      .filter((x): x is Atom => Boolean(x))
      .slice(0, 2);
    const c = centroid(atoms.map((a) => a.position));
    const el = ELEMENTS[a0.element];
    const elTr = ELEMENT_NAME_TR[a0.element] ?? el.name;
    const bl = pa && pb ? dist(pa.position, pb.position).toFixed(3) : '—';
    const ang = ns.length === 2 ? angleDeg(ns[0].position, angAtom.position, ns[1].position).toFixed(1) : '—';
    const mid = (x: Vec3, y: Vec3): Vec3 => [(x[0] + y[0]) / 2, (x[1] + y[1]) / 2, (x[2] + y[2]) / 2];
    const stops: TourStop[] = [
      {
        target: a0.position, dist: 2.1, select: { kind: 'atom', id: a0.id },
        caption: {
          en: `${el.name} (${a0.element}) — atomic number ${el.number}. Sphere size and CPK color come from published constants.`,
          tr: `${elTr} (${a0.element}) — atom numarası ${el.number}. Küre boyutu ve CPK rengi yayımlanmış sabitlerden gelir.`,
        },
      },
      ...(pa && pb && b0
        ? [{
            target: mid(pa.position, pb.position), dist: 2.0, select: { kind: 'bond', id: b0.id } as Selection,
            caption: {
              en: `A bond: shared electron pairs hold the molecule together. Measured length ${bl} Å.`,
              tr: `Bir bağ: ortaklanmış elektron çiftleri molekülü bir arada tutar. Ölçülen uzunluk ${bl} Å.`,
            },
          }]
        : []),
      ...(ns.length === 2
        ? [{
            target: angAtom.position, dist: 2.7, select: { kind: 'atom', id: angAtom.id } as Selection,
            caption: {
              en: `Bond angle measured live from coordinates: ${ang}°. VSEPR predicts the ideal shape.`,
              tr: `Bağ açısı koordinatlardan canlı ölçülür: ${ang}°. VSEPR ideal biçimi öngörür.`,
            },
          },
          {
            target: mid(ns[0].position, angAtom.position), dist: 3.2, measure: [ns[0].id, angAtom.id],
            caption: {
              en: 'Measure mode: pick two atoms for a distance, a third adds the angle.',
              tr: 'Ölçüm modu: uzaklık için iki atom seçin, üçüncüsü açıyı ekler.',
            },
          }]
        : []),
      {
        target: c, dist: 5.2,
        caption: {
          en: 'Every edit is validated live: over-valence becomes an error, fragments a warning.',
          tr: 'Her düzenleme canlı doğrulanır: aşırı valans hata, kopuk parçalar uyarı olur.',
        },
      },
      {
        target: c, dist: 7.4,
        caption: {
          en: 'Export the project as JSON, save a PNG snapshot, or reload — your session autosaves.',
          tr: 'Projeyi JSON dışa aktarın, PNG anlık görüntü alın ya da sayfayı yenileyin — oturum otomatik kaydedilir.',
        },
      },
    ];
    stops.forEach((s, i) => {
      tourTimers.push(setTimeout(() => {
        bus.emit('cam:fly', { target: s.target, dist: s.dist, ms: 1500 });
        useStore.setState({ selection: s.select ?? null, measurePicks: s.measure ?? [] });
        bus.emit('tour:stop', { i, n: stops.length, caption: s.caption });
      }, i * 4200));
    });
    tourTimers.push(setTimeout(() => {
      useStore.getState().setTourActive(false);
      useStore.setState({ measurePicks: [], selection: null });
    }, stops.length * 4200));
    return () => {
      tourTimers.forEach(clearTimeout);
      tourTimers = [];
    };
  }, [tourActive]);
  return null;
}

/* ---------- live demo: the studio performs its own capabilities ---------- */
function DemoController() {
  const demoActive = useStore((s) => s.demoActive);
  useEffect(() => {
    if (!demoActive) return;
    let cancelled = false;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const cap = (en: string, tr: string) => bus.emit('demo:step', { en, tr });
    const go = async () => {
      const s = () => useStore.getState();
      s().newProject();
      s().frame();
      cap('Live demo — the studio builds water from scratch', 'Canlı demo — stüdyo suyu sıfırdan inşa ediyor');
      playNarration('demo:intro');
      await wait(1500); if (cancelled) return;
      s().setElement('O');
      s().addAtomAt([0, 0, 0]);
      cap('Oxygen placed at the origin', 'Oksijen merkezde');
      await wait(1200); if (cancelled) return;
      s().setElement('H');
      s().addAtomAt([0.757, 0.586, 0]);
      cap('First hydrogen, 0.958 Å from the oxygen', 'İlk hidrojen, oksijenden 0.958 Å');
      await wait(1100); if (cancelled) return;
      s().addAtomAt([-0.757, 0.586, 0]);
      cap('Second hydrogen — the 104.5° angle appears on its own', 'İkinci hidrojen — 104.5° açısı kendiliğinden belirir');
      await wait(1500); if (cancelled) return;
      const atoms = s().molecule.atoms;
      const o = atoms.find((a) => a.element === 'O');
      const hs = atoms.filter((a) => a.element === 'H');
      if (!o || hs.length < 2) return;
      s().setTool('bond');
      s().bondAtoms(o.id, hs[0].id);
      cap('Bond formed — the spark marks the shared electron pair', 'Bağ kuruldu — kıvılcım ortak elektron çiftini işaretler');
      await wait(900); if (cancelled) return;
      s().bondAtoms(o.id, hs[1].id);
      await wait(1300); if (cancelled) return;
      s().setTool('measure');
      s().pushMeasure(hs[0].id);
      s().pushMeasure(o.id); // middle pick = vertex of the measured angle
      cap('Measure mode: O–H reads 0.958 Å from live coordinates', 'Ölçüm modu: O–H canlı koordinatlardan 0.958 Å');
      await wait(1700); if (cancelled) return;
      s().pushMeasure(hs[1].id);
      cap('A third pick adds the angle at the middle atom: 104.5°, the experimental value', 'Üçüncü seçim ortadaki atomda açıyı ekler: 104.5°, deneysel değer');
      await wait(1900); if (cancelled) return;
      s().clearMeasure();
      s().setTool('select');
      s().select({ kind: 'atom', id: o.id });
      cap('Inspector: Z=8, VSEPR shape, measured vs ideal angle', 'Inspector: Z=8, VSEPR biçimi, ölçülen ve ideal açı');
      await wait(2400); if (cancelled) return;
      s().loadExample('benzene');
      cap('Example library: benzene — planar aromatic ring, Kekulé bonds', 'Örnek kütüphanesi: benzen — düzlem aromatik halka, Kekulé bağları');
      await wait(2600); if (cancelled) return;
      s().setSceneActive('resonance');
      cap('Scene: Kekulé resonance — orders swap, the hybrid stays equivalent', 'Sahne: Kekulé rezonansı — mertebeler değişir, hibrit eşdeğer kalır');
      await wait(7000); if (cancelled) return;
      s().setSceneActive(null);
      s().loadExample('water');
      s().setDisplayMode('spacefill');
      cap('Space-fill: van der Waals surfaces at true scale', 'Uzay dolgusu: gerçek ölçekte van der Waals yüzeyleri');
      await wait(2100); if (cancelled) return;
      s().setDisplayMode('ballstick');
      s().toggle('photoMode');
      cap('Photo mode: turntable under studio light', 'Fotoğraf modu: stüdyo ışığında döner tabla');
      await wait(3600); if (cancelled) return;
      s().toggle('photoMode');
      cap('Done — everything you just saw is interactive. Your turn.', 'Bitti — az önce gördüğünüz her şey etkileşimli. Sıra sizde.');
      await wait(2600); if (cancelled) return;
      s().setDemoActive(false);
    };
    go();
    return () => { cancelled = true; stopNarration(); };
  }, [demoActive]);
  return null;
}

function CamFlyController() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3; update: () => void; enabled: boolean;
  } | null;
  const flight = useRef<{
    from: THREE.Vector3; to: THREE.Vector3; tf: THREE.Vector3; tt: THREE.Vector3;
    t0: number; ms: number;
  } | null>(null);
  useEffect(
    () => bus.on('cam:fly', (p: CamFly) => {
      if (!controls) return;
      const target = new THREE.Vector3(...p.target);
      const dir = camera.position.clone().sub(controls.target).normalize();
      flight.current = {
        from: camera.position.clone(),
        to: target.clone().addScaledVector(dir, p.dist),
        tf: controls.target.clone(),
        tt: target,
        t0: performance.now(),
        ms: p.ms,
      };
      controls.enabled = false;
    }),
    [camera, controls],
  );
  useFrame(() => {
    const f = flight.current;
    if (!f || !controls) return;
    const e = Math.min(1, (performance.now() - f.t0) / f.ms);
    const k = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
    camera.position.lerpVectors(f.from, f.to, k);
    controls.target.lerpVectors(f.tf, f.tt, k);
    controls.update();
    if (e >= 1) {
      flight.current = null;
      controls.enabled = true;
    }
  });
  return null;
}

/* ---------- scene bits ---------- */
function AddPlane() {
  const tool = useStore((s) => s.tool);
  if (tool !== 'add') return null;
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        useStore.getState().addAtomAt([e.point.x, 0, e.point.z]);
      }}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function MoleculeScene() {
  const atoms = useStore((s) => s.molecule.atoms);
  const bonds = useStore((s) => s.molecule.bonds);
  const showAngles = useStore((s) => s.showAngles);
  const selection = useStore((s) => s.selection);
  const targets = useMemo(() => {
    if (!showAngles) return [];
    const degree = (id: string) => bonds.filter((b) => b.a === id || b.b === id).length;
    return atoms.filter((a) => {
      const n = degree(a.id);
      const isSel = selection?.kind === 'atom' && selection.id === a.id;
      return n === 2 || (isSel && n >= 2);
    });
  }, [atoms, bonds, showAngles, selection]);
  return (
    <group>
      {atoms.map((a) => <AtomMesh key={a.id} atom={a} />)}
      {bonds.map((b) => <BondMesh key={b.id} bond={b} />)}
      {showAngles && targets.map((a) => <AngleAnnotation key={`ang-${a.id}`} atom={a} />)}
      <MeasureOverlay />
      <BondPreview />
    </group>
  );
}

function FrameController() {
  const nonce = useStore((s) => s.frameNonce);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    if (!nonce || !controls) return;
    const mol = useStore.getState().molecule;
    if (!mol.atoms.length) return;
    const c = centroid(mol.atoms.map((a) => a.position));
    let r = 0.8;
    for (const a of mol.atoms) r = Math.max(r, dist(a.position, c) + 0.9);
    const fov = (camera.fov * Math.PI) / 180;
    const d = (r / Math.sin(fov / 2)) * 1.12;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.set(c[0] + dir.x * d, c[1] + dir.y * d, c[2] + dir.z * d);
    controls.target.set(c[0], c[1], c[2]);
    controls.update();
  }, [nonce, camera, controls]);
  return null;
}

function SnapshotController() {
  const nonce = useStore((s) => s.snapshotNonce);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!nonce) return;
    gl.render(scene, camera);
    const url = gl.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'molecular-studio.png';
    a.click();
    useStore.getState().notify('PNG snapshot saved', 'ok');
  }, [nonce, gl, scene, camera]);
  return null;
}

function SceneContents() {
  const draggingId = useStore((s) => s.draggingId);
  const photoMode = useStore((s) => s.photoMode);
  const showGrid = useStore((s) => s.showGrid);
  return (
    <>
      <color attach="background" args={['#0a0e13']} />
      <fog attach="fog" args={['#0a0e13', 16, 42]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 4]} intensity={2.4} color="#ffffff" />
      <directionalLight position={[-6, 3, -5]} intensity={0.9} color="#7fb4ff" />
      <pointLight position={[0, -4, 0]} intensity={18} decay={2} color="#2ad2e8" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="ring" intensity={3.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={5} color="#ffffff" />
        <Lightformer form="rect" intensity={1.4} position={[-5, 2, -3]} rotation-y={Math.PI / 3} scale={[6, 3, 1]} color="#9fc3ff" />
        <Lightformer form="rect" intensity={0.9} position={[5, 1, 4]} rotation-y={-Math.PI / 3} scale={[5, 2, 1]} color="#2ad2e8" />
        <Lightformer form="circle" intensity={0.5} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={7} color="#10151c" />
      </Environment>

      <MoleculeScene />
      <AddPlane />
      <FxLayer />
      <AmbientParticles />
      <HBondGlints />
      <SceneDriver />
      <CamFlyController />
      <TourController />
      <DemoController />

      {showGrid && !photoMode && (
        <Grid
          position={[0, -1.9, 0]}
          args={[40, 40]}
          cellSize={0.5}
          cellThickness={0.7}
          cellColor="#1c2532"
          sectionSize={2.5}
          sectionThickness={1.1}
          sectionColor="#2c3a4d"
          fadeDistance={26}
          fadeStrength={2.2}
          infiniteGrid
        />
      )}

      {!photoMode && (
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport axisColors={['#f0555e', '#3dd68c', '#4d9dff']} />
        </GizmoHelper>
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enabled={!draggingId}
        autoRotate={photoMode}
        autoRotateSpeed={1.1}
        minDistance={1.5}
        maxDistance={30}
      />
      <FrameController />
      <SnapshotController />
    </>
  );
}

/* ---------- viewport HUD overlays ---------- */
const TOOL_TR: Record<string, string> = {
  select: 'SEÇ', move: 'TAŞI', add: 'EKLE', bond: 'BAĞ', delete: 'SİL', measure: 'ÖLÇ',
};

function toolHint(tool: string, t: (en: string, tr: string) => string): string {
  switch (tool) {
    case 'select': return t('Click an atom or bond to inspect it · drag atoms with Move', 'İncelemek için bir atom veya bağa tıklayın · Taşı ile atomları sürükleyin');
    case 'move': return t('Drag atoms to reposition · release to commit to history', 'Atomları sürükleyerek taşıyın · bırakınca geçmişe işlenir');
    case 'add': return t('Click the grid plane to place the selected element', 'Seçili elementi yerleştirmek için ızgara düzlemine tıklayın');
    case 'bond': return t('Click two atoms in turn to bond them · clicking a bond cycles its order', 'Bağ kurmak için iki atoma sırayla tıklayın · bağa tıklamak mertebesini döndürür');
    case 'delete': return t('Click atoms or bonds to remove them', 'Kaldırmak için atom veya bağlara tıklayın');
    case 'measure': return t('Pick 2 atoms for a distance · a 3rd adds the angle · Esc clears', 'Uzaklık için 2 atom seçin · 3.sü açıyı ekler · Esc temizler');
    default: return '';
  }
}

function SceneOverlay() {
  const sceneActive = useStore((s) => s.sceneActive);
  const t = useT();
  const [prog, setProg] = useState(0);
  const def = SCENES.find((s) => s.id === sceneActive);
  useEffect(() => {
    if (!def) return;
    let raf = 0;
    const tick = () => {
      setProg(((performance.now() - sceneStart) / 1000 / def.duration) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [def]);
  if (!def) return null;
  const cap = def.caption(prog);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center">
      <div className="fade-in w-[min(560px,82%)] rounded-panel border border-line bg-panel/90 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="panel-h text-accent">
            {t('SCENE', 'SAHNE')} · {t(def.nameEn, def.nameTr)}
          </span>
          <span className="data-v text-[10px] text-t3">
            {Math.floor(prog * def.duration)}s / {def.duration}s
          </span>
        </div>
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded bg-line">
          <div className="h-full bg-accent/70" style={{ width: `${prog * 100}%` }} />
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-t2">{t(cap.en, cap.tr)}</p>
        <p className="mt-1 text-[10px] text-t3">
          {t('Schematic animation — not a quantum simulation', 'Şematik animasyon — kuantum simülasyonu değildir')}
        </p>
      </div>
    </div>
  );
}

function TourOverlay() {
  const tourActive = useStore((s) => s.tourActive);
  const t = useT();
  const [stop, setStop] = useState<{ i: number; n: number; caption: { en: string; tr: string } } | null>(null);
  useEffect(() => bus.on('tour:stop', (p) => setStop(p)), []);
  useEffect(() => {
    if (!tourActive) setStop(null);
  }, [tourActive]);
  if (!tourActive || !stop) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center">
      <div className="fade-in w-[min(520px,82%)] rounded-panel border border-accent/40 bg-panel/90 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="panel-h text-accent">
            {t('GUIDED TOUR', 'REHBERLİ TUR')} · {stop.i + 1}/{stop.n}
          </span>
          <button
            type="button"
            className="pointer-events-auto text-[10px] text-t3 transition-colors hover:text-t1"
            onClick={() => useStore.getState().setTourActive(false)}
          >
            {t('End tour', 'Turu bitir')}
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-snug text-t1">{t(stop.caption.en, stop.caption.tr)}</p>
      </div>
    </div>
  );
}

function HudButton({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-btn border p-1.5 transition-colors duration-100 ${
        active
          ? 'border-accent/60 bg-accent/15 text-accent shadow-[0_0_12px_rgba(42,210,232,0.16)]'
          : 'border-line bg-raised/90 text-t2 hover:border-line2 hover:bg-hover hover:text-t1'
      }`}
    >
      {children}
    </button>
  );
}

function DemoOverlay() {
  const demoActive = useStore((s) => s.demoActive);
  const t = useT();
  const [cap, setCap] = useState<{ en: string; tr: string } | null>(null);
  useEffect(() => bus.on('demo:step', (p) => setCap(p)), []);
  useEffect(() => {
    if (!demoActive) setCap(null);
  }, [demoActive]);
  if (!demoActive || !cap) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center">
      <div className="fade-in w-[min(560px,82%)] rounded-panel border border-accent/40 bg-panel/90 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="panel-h flex items-center gap-1.5 text-accent">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-accent" />
            {t('LIVE DEMO', 'CANLI DEMO')}
          </span>
          <button
            type="button"
            className="pointer-events-auto text-[10px] text-t3 transition-colors hover:text-t1"
            onClick={() => useStore.getState().setDemoActive(false)}
          >
            {t('End demo', 'Demoyu bitir')}
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-snug text-t1">{t(cap.en, cap.tr)}</p>
      </div>
    </div>
  );
}

function Hud() {
  const [narrOn, setNarrOn] = useState(narrationEnabled());
  const tool = useStore((s) => s.tool);
  const photoMode = useStore((s) => s.photoMode);
  const showLabels = useStore((s) => s.showLabels);
  const showGrid = useStore((s) => s.showGrid);
  const showAngles = useStore((s) => s.showAngles);
  const projection = useStore((s) => s.projection);
  const atomCount = useStore((s) => s.molecule.atoms.length);
  const element = useStore((s) => s.element);
  const t = useT();
  const st = useStore.getState;
  return (
    <>
      {!photoMode && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[46%] rounded-btn border border-line bg-panel/80 px-2.5 py-1.5 text-[11px] leading-snug text-t2 backdrop-blur-sm">
          <span className="panel-h mr-2 text-accent">{TOOL_TR[tool] ?? tool}</span>
          {tool === 'add' ? `${toolHint(tool, t)} (${element})` : toolHint(tool, t)}
        </div>
      )}
      {atomCount === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="fade-in rounded-panel border border-line bg-panel/85 px-5 py-4 text-center">
            <p className="text-sm text-t1">{t('Empty project', 'Boş proje')}</p>
            <p className="mt-1 text-[12px] text-t2">
              {t(
                'Press A and click the plane to add an atom, or load an example from the left panel.',
                'A tuşuna basıp düzleme tıklayarak atom ekleyin ya da sol panelden bir örnek yükleyin.',
              )}
            </p>
          </div>
        </div>
      )}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <HudButton title={t('Frame molecule (F)', 'Molekülü çerçevele (F)')} onClick={() => st().frame()}><Scan size={14} /></HudButton>
        <HudButton title={t('Save PNG snapshot', 'PNG anlık görüntü kaydet')} onClick={() => st().snapshot()}><Camera size={14} /></HudButton>
        <HudButton title={t('Photo mode: turntable + studio light', 'Fotoğraf modu: döner tabla + stüdyo ışığı')} active={photoMode} onClick={() => st().toggle('photoMode')}><Aperture size={14} /></HudButton>
        <HudButton
          title={t('Narration audio for scenes & demo (clips in public/audio)', 'Sahneler ve demo için anlatım sesi (klipler public/audio içinde)')}
          active={narrOn}
          onClick={() => {
            const v = toggleNarration();
            setNarrOn(v);
            if (!v) stopNarration();
          }}
        ><Volume2 size={14} /></HudButton>
      </div>
      <div className="absolute bottom-3 left-3 flex gap-1">
        <HudButton title={t('Atom labels', 'Atom etiketleri')} active={showLabels} onClick={() => st().toggle('showLabels')}><Type size={14} /></HudButton>
        <HudButton title={t('Coordinate grid', 'Koordinat ızgarası')} active={showGrid} onClick={() => st().toggle('showGrid')}><Grid3x3 size={14} /></HudButton>
        <HudButton title={t('Bond-angle annotations', 'Bağ açısı açıklamaları')} active={showAngles} onClick={() => st().toggle('showAngles')}><Ruler size={14} /></HudButton>
        <HudButton title={projection === 'persp' ? t('Switch to orthographic', 'Ortografik görünüme geç') : t('Switch to perspective', 'Perspektif görünüme geç')} onClick={() => st().toggleProjection()}><Box size={14} /></HudButton>
      </div>
      <SceneOverlay />
      <TourOverlay />
      <DemoOverlay />
    </>
  );
}

export default function Viewport() {
  const projection = useStore((s) => s.projection);
  const onMissed = () => {
    bondDragFrom = null;
    const st = useStore.getState();
    if (st.tool === 'bond') st.setDragging(null); // released over empty space — unfreeze camera
    if (st.tool !== 'add') st.select(null);
  };
  return (
    <div className="relative h-full w-full">
      <Canvas
        key={projection}
        dpr={[1, 2]}
        orthographic={projection === 'ortho'}
        camera={projection === 'ortho' ? { position: [5, 3, 6], zoom: 90 } : { position: [4.4, 2.6, 5.4], fov: 42 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onPointerMissed={onMissed}
      >
        <SceneContents />
      </Canvas>
      {/* instrument-frame dressing: depth vignette + corner brackets */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 92% at 50% 45%, transparent 58%, rgba(3,5,9,0.55) 100%)' }}
        />
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
      </div>
      <Hud />
    </div>
  );
}

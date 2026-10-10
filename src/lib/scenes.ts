import type { Atom, Bond, Molecule } from '../types';

export interface SceneDef {
  id: string;
  nameEn: string;
  nameTr: string;
  subEn: string;
  subTr: string;
  /** seconds, 8-14 */
  duration: number;
  /** t in [0,1) */
  caption: (t: number) => { en: string; tr: string };
  /** pure, deterministic; builds its own molecule */
  apply: (t: number) => Molecule;
}

type V3 = [number, number, number];

const D2R = Math.PI / 180;
const OH = 0.958; // O–H length in water, Å
const HOH = 104.5; // H–O–H angle, degrees

const v = (x: number, y: number, z: number): V3 => [x, y, z];
const frac = (x: number) => x - Math.floor(x);

/** deterministic hash noise in [-1, 1] — never Math.random */
function noise(i: number): number {
  return frac(Math.sin(i * 12.9898) * 43758.5453) * 2 - 1;
}

function smoothstep(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return x * x * (3 - 2 * x);
}

function mix(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function mixV(a: V3, b: V3, u: number): V3 {
  return v(mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u));
}

interface Frag {
  atoms: Atom[];
  bonds: Bond[];
}

/**
 * One rigid water molecule in the z=0 plane. O sits at `center`; the
 * bisector points along `rotDeg`; H's at exact bond lengths / angle.
 */
function water(
  prefix: string,
  center: V3,
  rotDeg: number,
  l1: number,
  l2: number,
  angleDeg: number,
): Frag {
  const half = angleDeg / 2;
  const t1 = (rotDeg + half) * D2R;
  const t2 = (rotDeg - half) * D2R;
  const atoms: Atom[] = [
    { id: `${prefix}O`, element: 'O', position: v(center[0], center[1], center[2]) },
    {
      id: `${prefix}H1`,
      element: 'H',
      position: v(center[0] + l1 * Math.cos(t1), center[1] + l1 * Math.sin(t1), center[2]),
    },
    {
      id: `${prefix}H2`,
      element: 'H',
      position: v(center[0] + l2 * Math.cos(t2), center[1] + l2 * Math.sin(t2), center[2]),
    },
  ];
  const bonds: Bond[] = [
    { id: `${prefix}b1`, a: `${prefix}O`, b: `${prefix}H1`, order: 1 },
    { id: `${prefix}b2`, a: `${prefix}O`, b: `${prefix}H2`, order: 1 },
  ];
  return { atoms, bonds };
}

const frag = (parts: Frag[]): Molecule => ({
  atoms: parts.flatMap((p) => p.atoms),
  bonds: parts.flatMap((p) => p.bonds),
});

/* ------------------------------------------------------------------ */
/* 1. Water vibrational modes                                          */
/* ------------------------------------------------------------------ */

function vibrationsApply(t: number): Molecule {
  const seg = Math.min(2, Math.floor(t * 3));
  const local = t * 3 - seg; // [0,1) within the segment
  const osc = Math.sin(local * 2 * Math.PI * 2); // two cycles per segment
  let l1 = OH;
  let l2 = OH;
  let angle = HOH;
  if (seg === 0) {
    // symmetric stretch: both O–H oscillate in phase, 0.958 ± 0.06 Å
    l1 = OH + 0.06 * osc;
    l2 = l1;
  } else if (seg === 1) {
    // bend: H–O–H oscillates 104.5 ± 6°
    angle = HOH + 6 * osc;
  } else {
    // asymmetric stretch: one lengthens while the other shortens
    l1 = OH + 0.06 * osc;
    l2 = OH - 0.06 * osc;
  }
  return frag([water('v', v(0, 0, 0), 90, l1, l2, angle)]);
}

const VIB_NOTE = {
  en: ' (schematic oscillation, IR-active modes)',
  tr: ' (şematik salınım, IR-aktif modlar)',
};

function vibrationsCaption(t: number): { en: string; tr: string } {
  const seg = Math.min(2, Math.floor(t * 3));
  const names = [
    { en: 'Symmetric stretch ν₁', tr: 'Simetrik gerilme ν₁' },
    { en: 'Bending mode ν₂', tr: 'Bükülme modu ν₂' },
    { en: 'Asymmetric stretch ν₃', tr: 'Asimetrik gerilme ν₃' },
  ];
  const n = names[seg];
  return { en: n.en + VIB_NOTE.en, tr: n.tr + VIB_NOTE.tr };
}

/* ------------------------------------------------------------------ */
/* 2. Formation of water: 2 H₂ + O₂ → 2 H₂O                            */
/* ------------------------------------------------------------------ */

const FORM_IDS = ['fO1', 'fO2', 'fH1', 'fH2', 'fH3', 'fH4'] as const;

// start: O₂ (O=O 1.21 Å) on the left, two H₂ (H–H 0.74 Å) on the right
const FORM_START: Record<string, V3> = {
  fO1: v(-3.605, 0.3, 0),
  fO2: v(-2.395, 0.3, 0),
  fH1: v(1.43, 1.4, 0),
  fH2: v(2.17, 1.4, 0),
  fH3: v(1.43, -1.4, 0),
  fH4: v(2.17, -1.4, 0),
};

// end: two water molecules ~3.2 Å apart, exact 0.958 Å / 104.5° geometry
const FORM_END: Record<string, V3> = (() => {
  const a = water('', v(-1.6, 0, 0), 90, OH, OH, HOH);
  const b = water('', v(1.6, 0, 0), -90, OH, OH, HOH);
  return {
    fO1: a.atoms[0].position,
    fH1: a.atoms[1].position,
    fH2: a.atoms[2].position,
    fO2: b.atoms[0].position,
    fH3: b.atoms[1].position,
    fH4: b.atoms[2].position,
  };
})();

function formationApply(t: number): Molecule {
  // separated diatomics until t=0.45, rearrangement 0.45→0.55, products after
  const u = smoothstep((t - 0.45) / 0.1);
  const atoms: Atom[] = FORM_IDS.map((id) => ({
    id,
    element: id === 'fO1' || id === 'fO2' ? ('O' as const) : ('H' as const),
    position: mixV(FORM_START[id], FORM_END[id], u),
  }));
  const bonds: Bond[] =
    u < 0.5
      ? [
          { id: 'fbH1', a: 'fH1', b: 'fH2', order: 1 }, // H–H
          { id: 'fbH2', a: 'fH3', b: 'fH4', order: 1 }, // H–H
          { id: 'fbO', a: 'fO1', b: 'fO2', order: 2 }, // O=O
        ]
      : [
          { id: 'fb1', a: 'fO1', b: 'fH1', order: 1 },
          { id: 'fb2', a: 'fO1', b: 'fH2', order: 1 },
          { id: 'fb3', a: 'fO2', b: 'fH3', order: 1 },
          { id: 'fb4', a: 'fO2', b: 'fH4', order: 1 },
        ];
  return { atoms, bonds };
}

function formationCaption(): { en: string; tr: string } {
  return {
    en: '2 H₂ + O₂ → 2 H₂O — schematic choreography; the real reaction proceeds via radicals',
    tr: '2 H₂ + O₂ → 2 H₂O — şematik koreografi; gerçek tepkime radikaller üzerinden yürür',
  };
}

/* ------------------------------------------------------------------ */
/* 3. Ice → water → vapor                                              */
/* ------------------------------------------------------------------ */

const N_MOL = 5;
const NN = 2.75; // O···O nearest-neighbour distance in ice, Å

// hexagonal-ish zigzag arrangement of oxygen centres (z = 0 plane)
const ICE_C: V3[] = [
  v(0, 0, 0),
  v(NN, 0, 0),
  v(NN / 2, NN * 0.866, 0),
  v(-NN / 2, NN * 0.866, 0),
  v(-NN, 0, 0),
];
const ICE_R = ICE_C.map(() => 90);

// liquid: same cluster, deterministically jittered and reoriented
const LIQ_C: V3[] = ICE_C.map((c, i) =>
  v(c[0] + 0.45 * noise(i * 3 + 1), c[1] + 0.45 * noise(i * 3 + 2), c[2] + 0.45 * noise(i * 3 + 3)),
);
const LIQ_R = ICE_R.map((r, i) => r + 45 * noise(i * 3 + 4));

// vapor: dispersed to ~6 Å spacing
const GAS_C: V3[] = LIQ_C.map((c, i) =>
  v(c[0] * 2.2 + 0.3 * noise(i * 3 + 5), c[1] * 2.2 + 0.3 * noise(i * 3 + 6), 0.3 * noise(i * 3 + 7)),
);
const GAS_R = LIQ_R.map((r, i) => r + 90 * noise(i * 3 + 8));

function phasesApply(t: number): Molecule {
  // blend ice → liquid over [1/3, 2/3), liquid → gas over [2/3, 1)
  const s1 = smoothstep((t - 1 / 3) * 3);
  const s2 = smoothstep((t - 2 / 3) * 3);
  const parts: Frag[] = [];
  for (let i = 0; i < N_MOL; i++) {
    const iceLiq = mixV(ICE_C[i], LIQ_C[i], s1);
    const center = mixV(iceLiq, GAS_C[i], s2);
    const rot = mix(mix(ICE_R[i], LIQ_R[i], s1), GAS_R[i], s2);
    // internal geometry stays exact in every phase
    parts.push(water(`p${i}`, center, rot, OH, OH, HOH));
  }
  return frag(parts);
}

function phasesCaption(t: number): { en: string; tr: string } {
  if (t < 1 / 3)
    return {
      en: 'Ice — in ice each O makes four H-bonds in a hexagonal lattice (O···O ≈ 2.75 Å)',
      tr: 'Buz — buzda her O dört H-bağı yapar, altıgen örgü (O···O ≈ 2.75 Å)',
    };
  if (t < 2 / 3)
    return {
      en: 'Liquid water — H-bonds constantly break and reform; the network is transient',
      tr: 'Sıvı su — H-bağları sürekli kopar ve yeniden kurulur; ağ geçicidir',
    };
  return {
    en: 'Water vapor — molecules fly free, essentially no hydrogen bonds',
    tr: 'Su buharı — moleküller serbestçe uçar, hidrojen bağı neredeyse yoktur',
  };
}

/* ------------------------------------------------------------------ */
/* 4. Benzene resonance                                                */
/* ------------------------------------------------------------------ */

const KEKULE_A: (1 | 2)[] = [2, 1, 2, 1, 2, 1];
const KEKULE_B: (1 | 2)[] = [1, 2, 1, 2, 1, 2];
const R_C = 1.39; // ring C–C distance = circumradius for a regular hexagon
const R_H = 1.39 + 1.09; // C–H 1.09 Å along the radial direction

function resonanceApply(t: number): Molecule {
  // step function: pattern A for t < 0.5, B after — orders are never interpolated
  const flip = Math.floor(t / 0.5) % 2 === 1;
  const ring = flip ? KEKULE_B : KEKULE_A;
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 60 * D2R;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    atoms.push({ id: `rC${i}`, element: 'C', position: v(R_C * ca, R_C * sa, 0) });
    atoms.push({ id: `rH${i}`, element: 'H', position: v(R_H * ca, R_H * sa, 0) });
  }
  for (let i = 0; i < 6; i++) {
    bonds.push({ id: `rr${i}`, a: `rC${i}`, b: `rC${(i + 1) % 6}`, order: ring[i] });
    bonds.push({ id: `rh${i}`, a: `rC${i}`, b: `rH${i}`, order: 1 });
  }
  return { atoms, bonds };
}

function resonanceCaption(t: number): { en: string; tr: string } {
  const k = Math.floor(t / 0.5) % 2 === 1 ? 'B' : 'A';
  return {
    en: `Kekulé structure ${k} — the real molecule is a resonance hybrid with equivalent 1.39 Å bonds`,
    tr: `Kekulé yapısı ${k} — gerçek molekül rezonans hibrididir, bağlar eşdeğerdir (1.39 Å)`,
  };
}

/* ------------------------------------------------------------------ */

export const SCENES: SceneDef[] = [
  {
    id: 'vibrations',
    nameEn: 'Water vibrational modes',
    nameTr: 'Su titreşim modları',
    subEn: 'ν₁ stretch · ν₂ bend · ν₃ stretch',
    subTr: 'ν₁ gerilme · ν₂ bükülme · ν₃ gerilme',
    duration: 12,
    caption: vibrationsCaption,
    apply: vibrationsApply,
  },
  {
    id: 'formation',
    nameEn: 'Formation of water',
    nameTr: 'Suyun oluşumu',
    subEn: '2 H₂ + O₂ → 2 H₂O',
    subTr: '2 H₂ + O₂ → 2 H₂O',
    duration: 10,
    caption: formationCaption,
    apply: formationApply,
  },
  {
    id: 'phases',
    nameEn: 'Ice → water → vapor',
    nameTr: 'Buz → su → buhar',
    subEn: 'Hydrogen-bond network across phases',
    subTr: 'Fazlar boyunca hidrojen bağı ağı',
    duration: 12,
    caption: phasesCaption,
    apply: phasesApply,
  },
  {
    id: 'resonance',
    nameEn: 'Benzene resonance',
    nameTr: 'Benzen rezonansı',
    subEn: 'Kekulé structures A ⇌ B',
    subTr: 'Kekulé yapıları A ⇌ B',
    duration: 10,
    caption: resonanceCaption,
    apply: resonanceApply,
  },
];

import { buildZMatrix } from './geometry';
import type { ZEntry, Vec3 } from './geometry';
import type { Bond, Molecule } from '../types';

export interface ExampleDef {
  id: string;
  name: string;
  formula: string;
  blurb: string;
  build: () => Molecule;
}

let uid = 0;
const nid = (p: string) => `${p}${++uid}`;

function molFromZ(
  spec: ZEntry[],
  bonds: [number, number, (1 | 2 | 3)?][],
): Molecule {
  const pos = buildZMatrix(spec);
  const atoms = spec.map((e, i) => ({
    id: nid('a'),
    element: e.element,
    position: pos[i],
  }));
  const bs: Bond[] = bonds.map(([a, b, o]) => ({
    id: nid('b'),
    a: atoms[a].id,
    b: atoms[b].id,
    order: o ?? 1,
  }));
  return { atoms, bonds: bs };
}

function molFromPositions(
  spec: { element: ZEntry['element']; position: Vec3 }[],
  bonds: [number, number, (1 | 2 | 3)?][],
): Molecule {
  const atoms = spec.map((e) => ({ id: nid('a'), element: e.element, position: e.position }));
  const bs: Bond[] = bonds.map(([a, b, o]) => ({
    id: nid('b'),
    a: atoms[a].id,
    b: atoms[b].id,
    order: o ?? 1,
  }));
  return { atoms, bonds: bs };
}

/** H-N-H 106.7°, N-H 1.012 Å, placed on a cone around the C3 axis */
const ammonia = (): Molecule => {
  const L = 1.012;
  const sa = 0.9265;
  const ca = 0.3764;
  const h = (phi: number): Vec3 => [
    L * sa * Math.cos(phi),
    L * sa * Math.sin(phi),
    L * ca,
  ];
  return molFromPositions(
    [
      { element: 'N', position: [0, 0, 0] },
      { element: 'H', position: h(0) },
      { element: 'H', position: h((2 * Math.PI) / 3) },
      { element: 'H', position: h((4 * Math.PI) / 3) },
    ],
    [[0, 1], [0, 2], [0, 3]],
  );
};

export const EXAMPLES: ExampleDef[] = [
  {
    id: 'water',
    name: 'Water',
    formula: 'H2O',
    blurb: 'Bent, 104.5°',
    build: () =>
      molFromZ(
        [
          { element: 'O' },
          { element: 'H', ref: 0, length: 0.958 },
          { element: 'H', ref: 0, length: 0.958, angle: 104.5 },
        ],
        [[0, 1], [0, 2]],
      ),
  },
  {
    id: 'methane',
    name: 'Methane',
    formula: 'CH4',
    blurb: 'Tetrahedral, 109.47°',
    build: () =>
      molFromZ(
        [
          { element: 'C' },
          { element: 'H', ref: 0, length: 1.087 },
          { element: 'H', ref: 0, length: 1.087, angle: 109.47, dihedral: 0 },
          { element: 'H', ref: 0, length: 1.087, angle: 109.47, dihedral: 120 },
          { element: 'H', ref: 0, length: 1.087, angle: 109.47, dihedral: 240 },
        ],
        [[0, 1], [0, 2], [0, 3], [0, 4]],
      ),
  },
  {
    id: 'ammonia',
    name: 'Ammonia',
    formula: 'NH3',
    blurb: 'Trigonal pyramidal, 106.7°',
    build: ammonia,
  },
  {
    id: 'co2',
    name: 'Carbon dioxide',
    formula: 'CO2',
    blurb: 'Linear, two double bonds',
    build: () =>
      molFromZ(
        [
          { element: 'C' },
          { element: 'O', ref: 0, length: 1.16 },
          { element: 'O', ref: 0, length: 1.16, angle: 180 },
        ],
        [[0, 1, 2], [0, 2, 2]],
      ),
  },
  {
    id: 'ethanol',
    name: 'Ethanol',
    formula: 'C2H6O',
    blurb: 'C-C-O chain with hydroxyl',
    build: () =>
      molFromZ(
        [
          { element: 'C' },
          { element: 'C', ref: 0, length: 1.52 },
          { element: 'O', ref: 1, length: 1.43, angle: 108.5 },
          { element: 'H', ref: 2, length: 0.96, angle: 108.9, dihedral: 60 },
          { element: 'H', ref: 0, length: 1.09, angle: 109.5, dihedral: 0 },
          { element: 'H', ref: 0, length: 1.09, angle: 109.5, dihedral: 120 },
          { element: 'H', ref: 0, length: 1.09, angle: 109.5, dihedral: 240 },
          { element: 'H', ref: 1, length: 1.09, angle: 109.5, dihedral: 60 },
          { element: 'H', ref: 1, length: 1.09, angle: 109.5, dihedral: 180 },
        ],
        [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]],
      ),
  },
  {
    id: 'benzene',
    name: 'Benzene',
    formula: 'C6H6',
    blurb: 'Planar aromatic ring',
    build: () =>
      molFromZ(
        [
          { element: 'C' },
          { element: 'C', ref: 0, length: 1.39 },
          { element: 'C', ref: 1, length: 1.39, angle: 120 },
          { element: 'C', ref: 2, length: 1.39, angle: 120 },
          { element: 'C', ref: 3, length: 1.39, angle: 120 },
          { element: 'C', ref: 4, length: 1.39, angle: 120 },
          { element: 'H', ref: 0, length: 1.09, angle: 120, angleRef: 5, dihedral: 180 },
          { element: 'H', ref: 1, length: 1.09, angle: 120, angleRef: 0, dihedral: 180 },
          { element: 'H', ref: 2, length: 1.09, angle: 120, angleRef: 1, dihedral: 180 },
          { element: 'H', ref: 3, length: 1.09, angle: 120, angleRef: 2, dihedral: 180 },
          { element: 'H', ref: 4, length: 1.09, angle: 120, angleRef: 3, dihedral: 180 },
          { element: 'H', ref: 5, length: 1.09, angle: 120, angleRef: 4, dihedral: 180 },
        ],
        [[0, 1, 2], [1, 2], [2, 3, 2], [3, 4], [4, 5, 2], [5, 0], [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]],
      ),
  },
];

import type { ElementSymbol } from '../types';

export interface ElementInfo {
  symbol: ElementSymbol;
  name: string;
  number: number;
  /** IUPAC standard atomic weight, g/mol */
  mass: number;
  /** CPK / Jmol convention color */
  cpk: string;
  /** Cordero et al. covalent radius, angstrom */
  covalent: number;
  /** van der Waals radius, angstrom (Bondi; Alvarez 2013 for Fe/Cu) */
  vdw: number;
  /** common neutral valences (bond-order sum) */
  valences: number[];
  /** valence electrons of the neutral atom (lone-pair bookkeeping) */
  ve: number;
}

export const ELEMENTS: Record<ElementSymbol, ElementInfo> = {
  H:  { symbol: 'H',  name: 'Hydrogen',  number: 1,  mass: 1.008,   cpk: '#f2f5f8', covalent: 0.31, vdw: 1.2,  valences: [1],       ve: 1 },
  C:  { symbol: 'C',  name: 'Carbon',    number: 6,  mass: 12.011,  cpk: '#8f959c', covalent: 0.76, vdw: 1.7,  valences: [4],       ve: 4 },
  N:  { symbol: 'N',  name: 'Nitrogen',  number: 7,  mass: 14.007,  cpk: '#3050f8', covalent: 0.71, vdw: 1.55, valences: [3, 5],    ve: 5 },
  O:  { symbol: 'O',  name: 'Oxygen',    number: 8,  mass: 15.999,  cpk: '#ff0d0d', covalent: 0.66, vdw: 1.52, valences: [2],       ve: 6 },
  F:  { symbol: 'F',  name: 'Fluorine',  number: 9,  mass: 18.998,  cpk: '#90e050', covalent: 0.57, vdw: 1.47, valences: [1],       ve: 7 },
  P:  { symbol: 'P',  name: 'Phosphorus',number: 15, mass: 30.974,  cpk: '#ff8000', covalent: 1.07, vdw: 1.8,  valences: [3, 5],    ve: 5 },
  S:  { symbol: 'S',  name: 'Sulfur',    number: 16, mass: 32.06,   cpk: '#e8d44c', covalent: 1.05, vdw: 1.8,  valences: [2, 4, 6], ve: 6 },
  Cl: { symbol: 'Cl', name: 'Chlorine',  number: 17, mass: 35.45,   cpk: '#1ff01f', covalent: 1.02, vdw: 1.75, valences: [1, 3, 5, 7], ve: 7 },
  Br: { symbol: 'Br', name: 'Bromine',   number: 35, mass: 79.904,  cpk: '#a62929', covalent: 1.2,  vdw: 1.85, valences: [1, 3, 5], ve: 7 },
  I:  { symbol: 'I',  name: 'Iodine',    number: 53, mass: 126.904, cpk: '#940094', covalent: 1.39, vdw: 1.98, valences: [1, 3, 5, 7], ve: 7 },
  Na: { symbol: 'Na', name: 'Sodium',    number: 11, mass: 22.99,   cpk: '#ab5cf2', covalent: 1.66, vdw: 2.27, valences: [1],       ve: 1 },
  Mg: { symbol: 'Mg', name: 'Magnesium', number: 12, mass: 24.305,  cpk: '#8aff00', covalent: 1.41, vdw: 1.73, valences: [2],       ve: 2 },
  Ca: { symbol: 'Ca', name: 'Calcium',   number: 20, mass: 40.078,  cpk: '#3dff00', covalent: 1.76, vdw: 2.31, valences: [2],       ve: 2 },
  Fe: { symbol: 'Fe', name: 'Iron',      number: 26, mass: 55.845,  cpk: '#e06633', covalent: 1.32, vdw: 2.05, valences: [2, 3],    ve: 0 },
  Cu: { symbol: 'Cu', name: 'Copper',    number: 29, mass: 63.546,  cpk: '#c88033', covalent: 1.32, vdw: 1.96, valences: [1, 2],    ve: 0 },
};

export const ELEMENT_ORDER: ElementSymbol[] = [
  'H', 'C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'Na', 'Mg', 'Ca', 'Fe', 'Cu',
];

/** ball & stick visual sphere radius, angstrom */
export function stickRadius(symbol: ElementSymbol): number {
  return symbol === 'H' ? 0.3 : 0.42;
}

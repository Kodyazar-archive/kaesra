export type ElementSymbol =
  | 'H' | 'C' | 'N' | 'O' | 'S' | 'P' | 'F' | 'Cl' | 'Br' | 'I'
  | 'Na' | 'Mg' | 'Ca' | 'Fe' | 'Cu';

export interface Atom {
  id: string;
  element: ElementSymbol;
  /** angstroms, right-handed, y-up */
  position: [number, number, number];
}

export interface Bond {
  id: string;
  a: string;
  b: string;
  order: 1 | 2 | 3;
}

export interface Molecule {
  atoms: Atom[];
  bonds: Bond[];
}

export type Tool = 'select' | 'move' | 'add' | 'bond' | 'delete' | 'measure';

export type DisplayMode = 'ballstick' | 'spacefill' | 'wireframe';

export type Selection = { kind: 'atom' | 'bond'; id: string } | null;

export interface Issue {
  level: 'error' | 'warning';
  message: string;
  atomIds: string[];
}

export interface ValidationReport {
  errors: Issue[];
  warnings: Issue[];
}

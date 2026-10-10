import { ELEMENTS } from './elements';
import { dist, angleDeg, centroid } from './geometry';
import type { Vec3 } from './geometry';
import type { Atom, Bond, ElementSymbol, Issue, Molecule, ValidationReport } from '../types';

/** Hill system: C first, H second, then all others alphabetically */
export function molecularFormula(mol: Molecule): string {
  const counts = new Map<ElementSymbol, number>();
  for (const a of mol.atoms) counts.set(a.element, (counts.get(a.element) ?? 0) + 1);
  const order: ElementSymbol[] = [];
  if (counts.has('C')) order.push('C');
  if (counts.has('H')) order.push('H');
  for (const s of [...counts.keys()].sort()) if (s !== 'C' && s !== 'H') order.push(s);
  return order
    .map((s) => `${s}${counts.get(s) === 1 ? '' : counts.get(s)}`)
    .join('');
}

export function molecularMass(mol: Molecule): number {
  return mol.atoms.reduce((sum, a) => sum + ELEMENTS[a.element].mass, 0);
}

export function bondLength(mol: Molecule, bond: Bond): number | null {
  const a = mol.atoms.find((x) => x.id === bond.a);
  const b = mol.atoms.find((x) => x.id === bond.b);
  if (!a || !b) return null;
  return dist(a.position, b.position);
}

export function neighboursOf(mol: Molecule, atomId: string): { atom: Atom; bond: Bond }[] {
  const out: { atom: Atom; bond: Bond }[] = [];
  for (const b of mol.bonds) {
    const other = b.a === atomId ? b.b : b.b === atomId ? b.a : null;
    if (!other) continue;
    const atom = mol.atoms.find((a) => a.id === other);
    if (atom) out.push({ atom, bond: b });
  }
  return out;
}

export function bondOrderSum(mol: Molecule, atomId: string): number {
  return neighboursOf(mol, atomId).reduce((s, n) => s + n.bond.order, 0);
}

/** connected components over bonds */
export function fragments(mol: Molecule): string[][] {
  const seen = new Set<string>();
  const groups: string[][] = [];
  const adj = new Map<string, string[]>();
  for (const a of mol.atoms) adj.set(a.id, []);
  for (const b of mol.bonds) {
    adj.get(b.a)?.push(b.b);
    adj.get(b.b)?.push(b.a);
  }
  for (const a of mol.atoms) {
    if (seen.has(a.id)) continue;
    const group: string[] = [];
    const stack = [a.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      group.push(id);
      stack.push(...(adj.get(id) ?? []));
    }
    groups.push(group);
  }
  return groups;
}

/**
 * Honest structural validation. Errors = chemically impossible for a neutral
 * molecule (valence exceeded). Warnings = incomplete but possible (open
 * valence, isolated atom, disconnected fragments).
 */
export function validate(mol: Molecule): ValidationReport {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const label = (a: Atom) => `${ELEMENTS[a.element].name} ${indexLabel(mol, a.id)}`;

  for (const a of mol.atoms) {
    const sum = bondOrderSum(mol, a.id);
    const valences = ELEMENTS[a.element].valences;
    const max = Math.max(...valences);
    if (sum > max) {
      errors.push({
        level: 'error',
        atomIds: [a.id],
        message: `${label(a)} has ${sum} bonds but ${ELEMENTS[a.element].name} supports at most ${max} in a neutral structure.`,
      });
    } else if (sum === 0) {
      warnings.push({
        level: 'warning',
        atomIds: [a.id],
        message: `${label(a)} is not bonded to anything.`,
      });
    } else if (!valences.includes(sum)) {
      warnings.push({
        level: 'warning',
        atomIds: [a.id],
        message: `${label(a)} has ${sum} bonds; neutral ${ELEMENTS[a.element].name} usually shows ${valences.join(' or ')}. Possible radical or charge.`,
      });
    }
  }

  const frags = fragments(mol);
  if (mol.atoms.length > 1 && frags.length > 1) {
    warnings.push({
      level: 'warning',
      atomIds: [],
      message: `Structure has ${frags.length} disconnected fragments.`,
    });
  }
  return { errors, warnings };
}

function indexLabel(mol: Molecule, id: string): string {
  const i = mol.atoms.findIndex((a) => a.id === id);
  return i >= 0 ? `${mol.atoms[i].element}${i + 1}` : id;
}

/**
 * VSEPR shape from steric number (neighbours + lone pairs). Lone pairs are
 * bookkept from the neutral atom's valence electrons — an idealized model,
 * labeled as such in the UI. Transition metals return null (not applicable).
 */
export function vseprShape(mol: Molecule, atomId: string): string | null {
  const atom = mol.atoms.find((a) => a.id === atomId);
  if (!atom) return null;
  const n = neighboursOf(mol, atomId).length;
  if (n <= 1) return null; // terminal or isolated: no shape to speak of
  const info = ELEMENTS[atom.element];
  if (info.ve === 0) return null; // Fe, Cu: VSEPR not applicable
  const sum = bondOrderSum(mol, atomId);
  const lp = Math.max(0, Math.floor((info.ve - sum) / 2));
  const shapes: Record<string, string> = {
    '2-0': 'Linear',
    '3-0': 'Trigonal planar',
    '2-1': 'Bent',
    '4-0': 'Tetrahedral',
    '3-1': 'Trigonal pyramidal',
    '2-2': 'Bent',
  };
  return shapes[`${n}-${lp}`] ?? null;
}

/** ideal bond angle implied by the steric number around the vertex atom */
export function idealAngle(mol: Molecule, vertexId: string): number | null {
  const shape = vseprShape(mol, vertexId);
  if (shape === 'Linear') return 180;
  if (shape === 'Trigonal planar') return 120;
  if (shape === 'Tetrahedral') return 109.5;
  if (shape === 'Trigonal pyramidal') return 107;
  if (shape === 'Bent') return 104.5;
  return null;
}

/** measured angle at `vertexId` between its two first neighbours, if any */
export function measuredAngle(mol: Molecule, vertexId: string): { a: Atom; b: Atom; deg: number } | null {
  const vertex = mol.atoms.find((a) => a.id === vertexId);
  const ns = neighboursOf(mol, vertexId);
  if (!vertex || ns.length < 2) return null;
  const [p, q] = ns;
  return {
    a: p.atom,
    b: q.atom,
    deg: angleDeg(p.atom.position, vertex.position, q.atom.position),
  };
}

export function moleculeCentroid(mol: Molecule): Vec3 {
  return centroid(mol.atoms.map((a) => a.position));
}

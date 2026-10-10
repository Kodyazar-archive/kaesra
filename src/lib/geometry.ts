export type Vec3 = [number, number, number];

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
export function len(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}
export function norm(a: Vec3): Vec3 {
  const l = len(a) || 1;
  return scale(a, 1 / l);
}
export function dist(a: Vec3, b: Vec3): number {
  return len(sub(a, b));
}

/** angle a-b-c in degrees (vertex at b) */
export function angleDeg(a: Vec3, b: Vec3, c: Vec3): number {
  const u = norm(sub(a, b));
  const w = norm(sub(c, b));
  const d = Math.min(1, Math.max(-1, dot(u, w)));
  return (Math.acos(d) * 180) / Math.PI;
}

export function centroid(points: Vec3[]): Vec3 {
  if (points.length === 0) return [0, 0, 0];
  const s = points.reduce<Vec3>((acc, p) => add(acc, p), [0, 0, 0]);
  return scale(s, 1 / points.length);
}

/** points along the arc of angle a-b-c at given radius from vertex b */
export function arcPoints(a: Vec3, b: Vec3, c: Vec3, radius: number, segments = 32): Vec3[] {
  const u = norm(sub(a, b));
  const w = norm(sub(c, b));
  const d = Math.min(1, Math.max(-1, dot(u, w)));
  const theta = Math.acos(d);
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let dir: Vec3;
    if (theta < 1e-4) {
      dir = u;
    } else {
      const s = Math.sin(theta);
      dir = scale(
        add(scale(u, Math.sin((1 - t) * theta)), scale(w, Math.sin(t * theta))),
        1 / s,
      );
    }
    pts.push(add(b, scale(dir, radius)));
  }
  return pts;
}

/**
 * Internal-coordinate (z-matrix style) builder.
 *  - entry 0 sits at the origin
 *  - entry 1 is placed along +x from its ref
 *  - entry n: bonded to `ref` at `length` Å; `angle` is measured at `ref`
 *    between the new atom and `angleRef` (default: ref's parent bond, else
 *    ref's first child); `dihedral` rotates around that arm (0 keeps the
 *    placement in the plane spanned by the arm and the world axes).
 */
export interface ZEntry {
  element: import('../types').ElementSymbol;
  ref?: number;
  length?: number;
  angle?: number;
  angleRef?: number;
  dihedral?: number;
}

export function buildZMatrix(spec: ZEntry[]): Vec3[] {
  const out: Vec3[] = [];
  const parent: number[] = [];
  const firstChild: number[] = [];

  for (let i = 0; i < spec.length; i++) {
    const e = spec[i];
    if (i === 0 || e.ref === undefined) {
      out.push([0, 0, 0]);
      parent[i] = -1;
      continue;
    }
    const ref = e.ref;
    const L = e.length ?? 1.0;
    parent[i] = ref;

    if (i === 1) {
      out.push(add(out[ref], [L, 0, 0]));
      if (firstChild[ref] === undefined) firstChild[ref] = i;
      continue;
    }

    const armIdx = e.angleRef ?? (parent[ref] >= 0 ? parent[ref] : firstChild[ref]);
    if (armIdx === undefined || armIdx === i || armIdx === ref) {
      // ref has no other neighbour yet: place perpendicular to everything so far
      out.push(add(out[ref], [0, L, 0]));
      if (firstChild[ref] === undefined) firstChild[ref] = i;
      continue;
    }

    const arm = norm(sub(out[armIdx], out[ref]));
    const theta = ((e.angle ?? 109.5) * Math.PI) / 180;
    const phi = ((e.dihedral ?? 0) * Math.PI) / 180;
    const refVec: Vec3 = Math.abs(arm[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
    const p1 = norm(cross(arm, refVec));
    const p2 = norm(cross(arm, p1));
    const dir = norm(
      add(
        add(scale(arm, Math.cos(theta)), scale(p1, Math.sin(theta) * Math.cos(phi))),
        scale(p2, Math.sin(theta) * Math.sin(phi)),
      ),
    );
    out.push(add(out[ref], scale(dir, L)));
    if (firstChild[ref] === undefined) firstChild[ref] = i;
  }
  return out;
}

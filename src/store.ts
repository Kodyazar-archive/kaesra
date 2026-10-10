import { create } from 'zustand';
import { ELEMENTS, ELEMENT_ORDER } from './lib/elements';
import { EXAMPLES } from './lib/examples';
import { validate } from './lib/chemistry';
import { bus } from './lib/bus';
import { L } from './lib/i18n';
import type {
  Atom, Bond, DisplayMode, ElementSymbol, Molecule, Selection, Tool,
} from './types';

let uid = 0;
const nid = (p: string) => `${p}${Date.now().toString(36)}${++uid}`;

const clone = (m: Molecule): Molecule => structuredClone(m);

export interface Toast {
  msg: string;
  kind: 'info' | 'error' | 'ok';
}

interface State {
  projectName: string;
  molecule: Molecule;
  past: Molecule[];
  future: Molecule[];
  selection: Selection;
  hoveredId: string | null;
  tool: Tool;
  element: ElementSymbol;
  bondOrder: 1 | 2 | 3;
  displayMode: DisplayMode;
  bondSource: string | null;
  measurePicks: string[];
  draggingId: string | null;
  photoMode: boolean;
  showLabels: boolean;
  showGrid: boolean;
  showAngles: boolean;
  projection: 'persp' | 'ortho';
  toast: Toast | null;
  frameNonce: number;
  snapshotNonce: number;

  setTool: (t: Tool) => void;
  setElement: (e: ElementSymbol) => void;
  setBondOrder: (o: 1 | 2 | 3) => void;
  setDisplayMode: (m: DisplayMode) => void;
  toggle: (k: 'photoMode' | 'showLabels' | 'showGrid' | 'showAngles') => void;
  toggleProjection: () => void;
  select: (s: Selection) => void;
  hover: (id: string | null) => void;
  setDragging: (id: string | null) => void;
  setBondSource: (id: string | null) => void;
  pushMeasure: (id: string) => void;
  clearMeasure: () => void;
  frame: () => void;
  snapshot: () => void;
  notify: (msg: string, kind?: Toast['kind']) => void;

  addAtomAt: (pos: [number, number, number]) => void;
  deleteAtom: (id: string) => void;
  deleteBond: (id: string) => void;
  moveAtom: (id: string, pos: [number, number, number]) => void;
  beginDrag: () => void;
  endDrag: () => void;
  bondAtoms: (a: string, b: string) => void;
  setOrderOf: (bondId: string, order: 1 | 2 | 3) => void;
  cycleOrder: (bondId: string) => void;

  introOpen: boolean;
  setIntroOpen: (v: boolean) => void;
  tourActive: boolean;
  setTourActive: (v: boolean) => void;
  demoActive: boolean;
  setDemoActive: (v: boolean) => void;
  sceneActive: string | null;
  setSceneActive: (id: string | null) => void;

  undo: () => void;
  redo: () => void;
  loadMolecule: (m: Molecule, name: string) => void;
  newProject: () => void;
  loadExample: (id: string) => void;
  exportJSON: () => void;
  importJSON: (text: string) => void;
}

const HISTORY_MAX = 60;
const AUTOSAVE_KEY = 'molecular-studio:autosave:v1';

function freshWater(): Molecule {
  return EXAMPLES[0].build();
}

function restoreAutosave(): { molecule: Molecule; name: string } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const mol = parseMoleculeJSON(JSON.stringify(parsed.molecule ?? parsed));
    return { molecule: mol, name: parsed.name ?? 'Untitled' };
  } catch {
    return null;
  }
}

const autosaved = typeof localStorage !== 'undefined' ? restoreAutosave() : null;

export const useStore = create<State>((set, get) => {
  /** apply a structural change with history */
  const mutate = (fn: (m: Molecule) => Molecule) => {
    const prev = get().molecule;
    set({
      molecule: fn(clone(prev)),
      past: [...get().past.slice(-(HISTORY_MAX - 1)), prev],
      future: [],
      sceneActive: null, // any structural edit hands control back to the user
    });
  };

  let dragSnapshot: Molecule | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    projectName: autosaved?.name ?? 'Water — H₂O',
    molecule: autosaved?.molecule ?? freshWater(),
    past: [],
    future: [],
    selection: null,
    hoveredId: null,
    tool: 'select',
    element: 'C',
    bondOrder: 1,
    displayMode: 'ballstick',
    bondSource: null,
    measurePicks: [],
    draggingId: null,
    photoMode: false,
    showLabels: true,
    showGrid: true,
    showAngles: true,
    projection: 'persp',
    introOpen: true,
    tourActive: false,
    demoActive: false,
    sceneActive: null,
    toast: autosaved
      ? { msg: L('Restored autosaved session', 'Otomatik kaydedilen oturum geri yüklendi'), kind: 'info' }
      : null,
    frameNonce: 1, // frame the initial molecule on mount
    snapshotNonce: 0,

    setTool: (tool) =>
      set({ tool, bondSource: null, sceneActive: null, measurePicks: tool === 'measure' ? [] : get().measurePicks }),
    setIntroOpen: (introOpen) => set({ introOpen }),
    setTourActive: (tourActive) =>
      set({ tourActive, demoActive: false, sceneActive: tourActive ? null : get().sceneActive }),
    setDemoActive: (demoActive) =>
      set({ demoActive, tourActive: false, sceneActive: demoActive ? null : get().sceneActive }),
    setSceneActive: (sceneActive) => set({ sceneActive }),
    setElement: (element) => set({ element }),
    setBondOrder: (bondOrder) => {
      const sel = get().selection;
      set({ bondOrder });
      if (sel?.kind === 'bond') get().setOrderOf(sel.id, bondOrder);
    },
    setDisplayMode: (displayMode) => set({ displayMode }),
    toggle: (k) => set({ [k]: !get()[k] } as Partial<State>),
    toggleProjection: () => set({ projection: get().projection === 'persp' ? 'ortho' : 'persp' }),
    select: (selection) => set({ selection }),
    hover: (hoveredId) => set({ hoveredId }),
    setDragging: (draggingId) => set({ draggingId }),
    setBondSource: (bondSource) => set({ bondSource }),
    pushMeasure: (id) => {
      const picks = get().measurePicks.includes(id)
        ? get().measurePicks.filter((p) => p !== id)
        : [...get().measurePicks, id].slice(-3);
      set({ measurePicks: picks });
    },
    clearMeasure: () => set({ measurePicks: [] }),
    frame: () => set({ frameNonce: get().frameNonce + 1 }),
    snapshot: () => set({ snapshotNonce: get().snapshotNonce + 1 }),
    notify: (msg, kind = 'info') => {
      if (toastTimer) clearTimeout(toastTimer);
      set({ toast: { msg, kind } });
      toastTimer = setTimeout(() => set({ toast: null }), 2600);
    },

    addAtomAt: (pos) => {
      const element = get().element;
      const atom: Atom = { id: nid('a'), element, position: pos };
      mutate((m) => ({ ...m, atoms: [...m.atoms, atom] }));
      set({ selection: { kind: 'atom', id: atom.id } });
    },
    deleteAtom: (id) => {
      const gone = get().molecule.atoms.find((a) => a.id === id);
      mutate((m) => ({
        atoms: m.atoms.filter((a) => a.id !== id),
        bonds: m.bonds.filter((b) => b.a !== id && b.b !== id),
      }));
      if (gone) bus.emit('fx:dissolve', { pos: gone.position, color: ELEMENTS[gone.element].cpk });
      const sel = get().selection;
      if (sel?.kind === 'atom' && sel.id === id) set({ selection: null });
    },
    deleteBond: (id) => {
      const b = get().molecule.bonds.find((x) => x.id === id);
      const pa = b && get().molecule.atoms.find((a) => a.id === b.a);
      const pb = b && get().molecule.atoms.find((a) => a.id === b.b);
      mutate((m) => ({ ...m, bonds: m.bonds.filter((x) => x.id !== id) }));
      if (pa && pb)
        bus.emit('fx:spark', {
          pos: [
            (pa.position[0] + pb.position[0]) / 2,
            (pa.position[1] + pb.position[1]) / 2,
            (pa.position[2] + pb.position[2]) / 2,
          ],
        });
      const sel = get().selection;
      if (sel?.kind === 'bond' && sel.id === id) set({ selection: null });
    },
    moveAtom: (id, pos) =>
      set({
        molecule: {
          ...get().molecule,
          atoms: get().molecule.atoms.map((a) => (a.id === id ? { ...a, position: pos } : a)),
        },
      }),
    beginDrag: () => {
      dragSnapshot = clone(get().molecule);
    },
    endDrag: () => {
      if (dragSnapshot) {
        const snap = dragSnapshot;
        dragSnapshot = null;
        const changed = JSON.stringify(snap) !== JSON.stringify(get().molecule);
        if (changed)
          set({ past: [...get().past.slice(-(HISTORY_MAX - 1)), snap], future: [] });
      }
      set({ draggingId: null });
    },
    bondAtoms: (a, b) => {
      if (a === b) return;
      const existing = get().molecule.bonds.find(
        (x) => (x.a === a && x.b === b) || (x.a === b && x.b === a),
      );
      if (existing) {
        get().cycleOrder(existing.id);
        return;
      }
      const order = get().bondOrder;
      const bond: Bond = { id: nid('b'), a, b, order };
      mutate((m) => ({ ...m, bonds: [...m.bonds, bond] }));
      const pa = get().molecule.atoms.find((x) => x.id === a);
      const pb = get().molecule.atoms.find((x) => x.id === b);
      if (pa && pb)
        bus.emit('fx:spark', {
          pos: [
            (pa.position[0] + pb.position[0]) / 2,
            (pa.position[1] + pb.position[1]) / 2,
            (pa.position[2] + pb.position[2]) / 2,
          ],
        });
      set({ selection: { kind: 'bond', id: bond.id }, bondSource: null });
    },
    setOrderOf: (bondId, order) =>
      mutate((m) => ({
        ...m,
        bonds: m.bonds.map((b) => (b.id === bondId ? { ...b, order } : b)),
      })),
    cycleOrder: (bondId) =>
      mutate((m) => ({
        ...m,
        bonds: m.bonds.map((b) =>
          b.id === bondId ? { ...b, order: ((b.order % 3) + 1) as 1 | 2 | 3 } : b,
        ),
      })),

    undo: () => {
      const { past, future, molecule } = get();
      if (!past.length) return;
      const prev = past[past.length - 1];
      set({
        molecule: prev,
        past: past.slice(0, -1),
        future: [molecule, ...future].slice(0, HISTORY_MAX),
        selection: null,
        bondSource: null,
      });
    },
    redo: () => {
      const { past, future, molecule } = get();
      if (!future.length) return;
      const next = future[0];
      set({
        molecule: next,
        past: [...past.slice(-(HISTORY_MAX - 1)), molecule],
        future: future.slice(1),
        selection: null,
        bondSource: null,
      });
    },
    loadMolecule: (m, name) => {
      const prev = get().molecule;
      set({
        molecule: m,
        projectName: name,
        past: [...get().past.slice(-(HISTORY_MAX - 1)), prev],
        future: [],
        selection: null,
        bondSource: null,
        measurePicks: [],
        frameNonce: get().frameNonce + 1,
      });
    },
    newProject: () => {
      get().loadMolecule({ atoms: [], bonds: [] }, 'Untitled');
      get().notify('New empty project', 'info');
    },
    loadExample: (id) => {
      const ex = EXAMPLES.find((e) => e.id === id);
      if (!ex) return;
      get().loadMolecule(ex.build(), `${ex.name} — ${ex.formula}`);
      get().notify(`Loaded ${ex.name}`, 'ok');
    },
    exportJSON: () => {
      const { molecule, projectName } = get();
      const payload = {
        app: 'molecular-studio',
        version: 1,
        name: projectName,
        molecule,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^\w-]+/g, '_').toLowerCase() || 'molecule'}.molstudio.json`;
      a.click();
      URL.revokeObjectURL(url);
      get().notify('Project exported as JSON', 'ok');
    },
    importJSON: (text) => {
      try {
        const parsed = JSON.parse(text);
        const mol = parseMoleculeJSON(text);
        get().loadMolecule(mol, parsed.name ?? 'Imported');
        get().notify('Project opened', 'ok');
      } catch (e) {
        get().notify(`Invalid file: ${(e as Error).message}`, 'error');
      }
    },
  };
});

/** strict, honest parser: rejects anything that is not a well-formed molecule */
export function parseMoleculeJSON(text: string): Molecule {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('not valid JSON');
  }
  const root = (data as { molecule?: unknown })?.molecule ?? data;
  const obj = root as { atoms?: unknown; bonds?: unknown };
  if (!obj || !Array.isArray(obj.atoms) || !Array.isArray(obj.bonds))
    throw new Error('missing atoms/bonds arrays');
  const ids = new Set<string>();
  const atoms: Atom[] = obj.atoms.map((raw, i) => {
    const a = raw as Partial<Atom>;
    if (typeof a.id !== 'string' || !ids.add(a.id)) throw new Error(`duplicate atom id at index ${i}`);
    if (!a.element || !(a.element in ELEMENTS)) throw new Error(`unknown element at atom ${i}`);
    const p = a.position;
    if (!Array.isArray(p) || p.length !== 3 || p.some((n) => typeof n !== 'number' || !isFinite(n)))
      throw new Error(`bad position at atom ${i}`);
    return { id: a.id, element: a.element as ElementSymbol, position: p as [number, number, number] };
  });
  const bonds: Bond[] = obj.bonds.map((raw, i) => {
    const b = raw as Partial<Bond>;
    if (typeof b.id !== 'string') throw new Error(`bad bond id at index ${i}`);
    if (!ids.has(b.a ?? '') || !ids.has(b.b ?? '')) throw new Error(`bond ${i} references a missing atom`);
    if (b.a === b.b) throw new Error(`bond ${i} connects an atom to itself`);
    const order = b.order;
    if (order !== 1 && order !== 2 && order !== 3) throw new Error(`bad bond order at bond ${i}`);
    return { id: b.id, a: b.a!, b: b.b!, order };
  });
  return { atoms, bonds };
}

/** debounced autosave */
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe((s, prev) => {
  if (s.molecule === prev.molecule && s.projectName === prev.projectName) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        AUTOSAVE_KEY,
        JSON.stringify({ name: useStore.getState().projectName, molecule: useStore.getState().molecule }),
      );
    } catch {
      /* storage full or unavailable — autosave is best-effort */
    }
  }, 800);
});

// dev-only handle for debugging gestures from the browser console
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __ms?: typeof useStore }).__ms = useStore;
}

/** convenience selectors */
export const useValidation = () => {
  const molecule = useStore((s) => s.molecule);
  return validate(molecule);
};

export { ELEMENT_ORDER };

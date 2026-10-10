# Molecular Studio

> **Live Demo:** [https://kaesra.vercel.app](https://kaesra.vercel.app)


An interactive 3D molecular modeling workstation: build, edit, measure and inspect
molecular structures in the browser. Built for the **Kodyazar CodeJam**.
React 19 + TypeScript + Vite + React Three Fiber + Drei + Zustand + Tailwind v4.
Fully bilingual UI — Turkish (default) and English, switchable from the toolbar
(`TR / EN`, persisted to localStorage).

```bash
npm install
npm run dev      # development server
npm run build    # typecheck + production build
```

## Workspace

- **Top toolbar** — project identity, new/open/export, undo/redo, live validation pill.
- **Left panel** — tools (select, move, add, bond, delete, measure), element palette
  (CPK colors + atomic numbers), bond order, display mode, structure hierarchy, examples.
- **Viewport** — orbit / pan / zoom, atom dragging on a camera-facing plane, bond
  previews, bond-angle arcs, measurement overlays, axis gizmo, coordinate grid,
  photo mode (turntable + studio lighting), PNG snapshots.
- **Living scene** — depth particles drift in the void; unbonded atom pairs at
  hydrogen-bonding distance (2.2–3.4 Å) get a faint pulsing dashed glint.
- **Reactive FX** — bonding an atom fires a cyan spark ring at the bond midpoint;
  deleting an atom dissolves it into colored shards; both are transient WebGL
  effects driven by a tiny event bus (`src/lib/bus.ts`), never stored in history.
- **Molecular scenes** (`SCENES` in the left panel) — deterministic, captioned
  choreographies: water vibrational modes (symmetric stretch / bend / asymmetric
  stretch), schematic 2 H₂ + O₂ → 2 H₂O formation, ice → water → vapor with
  hydrogen-bond network, and benzene Kekulé resonance. Each scene drives the
  molecule per-frame from a pure function of time and labels itself
  "schematic — not a quantum simulation".
- **Guided tour** — toolbar button (or the welcome modal) flies the camera through
  six stops (atom → bond → angle → measure → validation → export) with bilingual
  caption cards; `Esc` ends it. Any structural edit cancels an active scene and
  hands control back to the user.
- **Inspector** — molecule (Hill formula, molar mass, counts, fragments, validation),
  selected atom (valence bookkeeping, VSEPR shape, measured vs ideal angle),
  selected bond (order control, measured length).
- **Status bar** — active tool, formula, counts, validation, camera mode, shortcuts.

Keyboard: `V M A B D E` tools · `1 2 3` bond order · `Ctrl+Z` / `Ctrl+Shift+Z` undo/redo ·
`F` frame · `Esc` clear selection & measure picks.

## Project file format (`.molstudio.json`)

```jsonc
{
  "app": "molecular-studio",
  "version": 1,
  "name": "Water — H₂O",
  "molecule": {
    "atoms": [
      { "id": "a1", "element": "O", "position": [0, 0, 0] },        // Å, right-handed, y-up
      { "id": "a2", "element": "H", "position": [0.958, 0, 0] }
    ],
    "bonds": [
      { "id": "b1", "a": "a1", "b": "a2", "order": 1 }              // order: 1 | 2 | 3
    ]
  }
}
```

Atom ids are stable strings; bonds reference atom ids. The importer validates every
field (unknown elements, dangling bond references, self-bonds, bad orders/positions
are rejected with a message). The session also autosaves to `localStorage` and is
restored on next launch.

## Scientific honesty

- Molar mass uses IUPAC 2021 average atomic weights (not exact mass).
- Bond lengths and angles are **measured from the current 3D coordinates**.
- Valence checks and VSEPR shapes are heuristic rules for neutral atoms, labeled
  "idealized" in the UI; transition metals report VSEPR as not applicable.
- No quantum-chemical quantities (energy, pKa, orbitals) are shown or implied.

## Layout of the code

- `src/lib/` — chemistry core (elements, formulas, validation, VSEPR), vector math,
  z-matrix builder, curated examples, scene definitions (`scenes.ts`), i18n
  (`i18n.ts`), event bus (`bus.ts`).
- `src/store.ts` — Zustand editor state: molecule, history (undo/redo), tools,
  selection, persistence.
- `src/components/` — Viewport (R3F scene + HUD + FX + tour camera), Toolbar,
  LeftPanel, Inspector, StatusBar, WelcomeModal.

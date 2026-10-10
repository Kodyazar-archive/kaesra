/**
 * Tiny synchronous event bus for cross-layer cues that are not state:
 * transient FX (spark on bond create, dissolve on delete) and camera
 * flight commands from the guided tour. Kept outside the Zustand store
 * because none of it belongs in history or autosave.
 */
type Handler = (payload: any) => void;

const handlers = new Map<string, Set<Handler>>();

export const bus = {
  on(ev: string, h: Handler): () => void {
    let set = handlers.get(ev);
    if (!set) handlers.set(ev, (set = new Set()));
    set.add(h);
    return () => set!.delete(h);
  },
  emit(ev: string, payload?: any) {
    handlers.get(ev)?.forEach((h) => h(payload));
  },
};

export type FxSpark = { pos: [number, number, number] };
export type FxDissolve = { pos: [number, number, number]; color: string };
export type CamFly = {
  target: [number, number, number];
  dist: number;
  ms: number;
};

import {
  Link2, Atom as MoleculeIcon, MousePointer2, Move, Play, Plus, Ruler,
  Square, Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStore } from '../store';
import { ELEMENTS, ELEMENT_ORDER } from '../lib/elements';
import { molecularFormula } from '../lib/chemistry';
import { EXAMPLES } from '../lib/examples';
import { SCENES } from '../lib/scenes';
import { useT } from '../lib/i18n';
import type { DisplayMode, Tool } from '../types';

const TOOLS: { id: Tool; en: string; tr: string; Icon: LucideIcon }[] = [
  { id: 'select', en: 'Select', tr: 'Seç', Icon: MousePointer2 },
  { id: 'move', en: 'Move', tr: 'Taşı', Icon: Move },
  { id: 'add', en: 'Add Atom', tr: 'Atom Ekle', Icon: Plus },
  { id: 'bond', en: 'Bond', tr: 'Bağ', Icon: Link2 },
  { id: 'delete', en: 'Delete', tr: 'Sil', Icon: Trash2 },
  { id: 'measure', en: 'Measure', tr: 'Ölç', Icon: Ruler },
];

const DISPLAY_MODES: { id: DisplayMode; en: string; tr: string }[] = [
  { id: 'ballstick', en: 'Ball+Stick', tr: 'Top+Çubuk' },
  { id: 'spacefill', en: 'Space-fill', tr: 'Uzay dolgusu' },
  { id: 'wireframe', en: 'Wireframe', tr: 'Tel kafes' },
];

const EXAMPLE_META: Record<string, { en: string; tr: string; subEn: string; subTr: string }> = {
  water: { en: 'Water', tr: 'Su', subEn: 'Bent, 104.5°', subTr: 'Açılı, 104.5°' },
  methane: { en: 'Methane', tr: 'Metan', subEn: 'Tetrahedral, 109.47°', subTr: 'Dört yüzlü, 109.47°' },
  ammonia: { en: 'Ammonia', tr: 'Amonyak', subEn: 'Trigonal pyramidal, 106.7°', subTr: 'Üçgen piramit, 106.7°' },
  co2: { en: 'Carbon dioxide', tr: 'Karbondioksit', subEn: 'Linear; two double bonds', subTr: 'Doğrusal; iki çift bağ' },
  ethanol: { en: 'Ethanol', tr: 'Etanol', subEn: 'C–C–O chain with hydroxyl', subTr: 'Hidroksilli C–C–O zinciri' },
  benzene: { en: 'Benzene', tr: 'Benzen', subEn: 'Planar aromatic ring', subTr: 'Düzlem aromatik halka' },
};

const ORDERS = [1, 2, 3] as const;
const ORDER_GLYPH: Record<1 | 2 | 3, string> = { 1: '–', 2: '=', 3: '≡' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line">
      <div className="panel-h flex h-8 items-center px-3">{title}</div>
      <div className="px-3 pb-3">{children}</div>
    </section>
  );
}

export default function LeftPanel() {
  const t = useT();
  const molecule = useStore((s) => s.molecule);
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const element = useStore((s) => s.element);
  const setElement = useStore((s) => s.setElement);
  const bondOrder = useStore((s) => s.bondOrder);
  const setBondOrder = useStore((s) => s.setBondOrder);
  const displayMode = useStore((s) => s.displayMode);
  const setDisplayMode = useStore((s) => s.setDisplayMode);
  const select = useStore((s) => s.select);
  const loadExample = useStore((s) => s.loadExample);
  const sceneActive = useStore((s) => s.sceneActive);
  const setSceneActive = useStore((s) => s.setSceneActive);

  const formula = molecularFormula(molecule);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* TOOLS */}
        <Section title={t('Tools', 'Araçlar')}>
          <div className="grid grid-cols-3 gap-1.5">
            {TOOLS.map(({ id, en, tr, Icon }) => {
              const active = tool === id;
              const label = t(en, tr);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTool(id)}
                  title={label}
                  className={`flex flex-col items-center gap-1 rounded-btn border py-2 text-[10.5px] ${
                    active
                      ? 'border-accent/60 bg-accent/15 text-accent'
                      : 'border-line bg-raised text-t2 hover:bg-hover hover:text-t1'
                  }`}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  <span className="leading-none">{label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ELEMENT */}
        <Section title={t('Element', 'Element')}>
          <div className="grid grid-cols-4 gap-1.5">
            {ELEMENT_ORDER.map((sym) => {
              const info = ELEMENTS[sym];
              const active = element === sym;
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setElement(sym)}
                  title={`${info.name} (${info.number})`}
                  className={`flex flex-col items-center gap-0.5 rounded-btn border py-1.5 ${
                    active
                      ? 'border-accent/70 bg-accent/15'
                      : 'border-line bg-raised hover:bg-hover'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: info.cpk }}
                  />
                  <span className="text-[12px] font-medium leading-none text-t1">{sym}</span>
                  <span className="data-v text-[9px] leading-none text-t3">{info.number}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* BOND ORDER */}
        <Section title={t('Bond order', 'Bağ mertebesi')}>
          <div className="grid grid-cols-3 gap-1.5">
            {ORDERS.map((n) => {
              const active = bondOrder === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBondOrder(n)}
                  className={`flex flex-col items-center gap-1 rounded-btn border py-2 ${
                    active
                      ? 'border-accent/60 bg-accent/15 text-accent'
                      : 'border-line bg-raised text-t2 hover:bg-hover hover:text-t1'
                  }`}
                >
                  <span
                    className="flex h-[9px] flex-col items-center justify-center"
                    style={{ gap: n === 1 ? 0 : n === 2 ? 2 : 3 }}
                  >
                    {Array.from({ length: n }, (_, i) => (
                      <span key={i} className="block h-px w-5 bg-current" />
                    ))}
                  </span>
                  <span className="data-v text-[10px] leading-none">{n}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-t3">
            {t(
              'applies to new bonds; selecting a bond then clicking sets its order',
              'yeni bağlara uygulanır; bir bağı seçip tıklayınca mertebesini ayarlar',
            )}
          </p>
        </Section>

        {/* DISPLAY */}
        <Section title={t('Display', 'Görünüm')}>
          <div className="flex flex-col gap-1.5">
            {DISPLAY_MODES.map(({ id, en, tr }) => {
              const active = displayMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDisplayMode(id)}
                  className={`rounded-btn border px-2.5 py-1.5 text-left text-[10.5px] ${
                    active
                      ? 'border-accent/60 bg-accent/15 text-accent'
                      : 'border-line bg-raised text-t2 hover:bg-hover hover:text-t1'
                  }`}
                >
                  {t(en, tr)}
                </button>
              );
            })}
          </div>
        </Section>

        {/* SCENES */}
        <Section title={t('Scenes', 'Sahneler')}>
          <div className="flex flex-col gap-1.5">
            {SCENES.map((sc) => {
              const active = sceneActive === sc.id;
              const Icon = active ? Square : Play;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSceneActive(active ? null : sc.id)}
                  title={t('Play', 'Oynat')}
                  className={`flex w-full items-start gap-2 rounded-btn border px-2.5 py-2 text-left ${
                    active
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-line bg-raised hover:bg-hover'
                  }`}
                >
                  <Icon
                    size={13}
                    strokeWidth={1.75}
                    className={`mt-px shrink-0 ${active ? 'text-accent' : 'text-t3'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[12px] ${active ? 'text-accent' : 'text-t1'}`}>
                      {t(sc.nameEn, sc.nameTr)}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-t3">
                      {t(sc.subEn, sc.subTr)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-t3">
            {t(
              'Schematic animation — not a quantum simulation',
              'Şematik animasyon — kuantum simülasyonu değildir',
            )}
          </p>
        </Section>

        {/* HIERARCHY */}
        <Section title={t('Hierarchy', 'Hiyerarşi')}>
          <div className="flex h-8 items-center gap-2 text-t1">
            <MoleculeIcon size={14} className="shrink-0 text-accent" />
            <span className="data-v truncate text-[12px]">{formula || t('(empty)', '(boş)')}</span>
            <span className="data-v ml-auto shrink-0 text-[10px] text-t3">
              {t(`${molecule.atoms.length} atoms`, `${molecule.atoms.length} atom`)}
            </span>
          </div>
          <div>
            {molecule.atoms.map((a, i) => {
              const selected = selection?.kind === 'atom' && selection.id === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => select({ kind: 'atom', id: a.id })}
                  className={`relative flex h-7 w-full items-center gap-2 pl-5 pr-2 text-left text-[11px] hover:bg-hover ${
                    selected ? 'bg-accent/10 text-accent' : 'text-t2'
                  }`}
                >
                  {selected && (
                    <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-accent" />
                  )}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ELEMENTS[a.element].cpk }}
                  />
                  <span className="data-v shrink-0">{`${a.element}${i + 1}`}</span>
                  <span className="truncate text-[10.5px] text-t3">
                    {ELEMENTS[a.element].name}
                  </span>
                </button>
              );
            })}
            {molecule.bonds.map((b) => {
              const selected = selection?.kind === 'bond' && selection.id === b.id;
              const atomA = molecule.atoms.find((x) => x.id === b.a);
              const atomB = molecule.atoms.find((x) => x.id === b.b);
              const label = `${atomA?.element ?? '?'}${ORDER_GLYPH[b.order]}${atomB?.element ?? '?'}`;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => select({ kind: 'bond', id: b.id })}
                  className={`relative flex h-7 w-full items-center gap-2 pl-5 pr-2 text-left text-[11px] hover:bg-hover ${
                    selected ? 'bg-accent/10 text-accent' : 'text-t2'
                  }`}
                >
                  {selected && (
                    <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-accent" />
                  )}
                  <Link2 size={11} className="shrink-0 text-t3" />
                  <span className="data-v shrink-0">{label}</span>
                  <span className="truncate text-[10.5px] text-t3">{t('bond', 'bağ')}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* EXAMPLES */}
        <Section title={t('Examples', 'Örnekler')}>
          <div className="flex flex-col gap-1.5">
            {EXAMPLES.map((ex) => {
              const meta = EXAMPLE_META[ex.id];
              const name = meta ? t(meta.en, meta.tr) : ex.name;
              const sub = meta ? t(meta.subEn, meta.subTr) : ex.blurb;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => loadExample(ex.id)}
                  className="w-full rounded-btn border border-line bg-raised px-2.5 py-2 text-left hover:bg-hover"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] text-t1">{name}</span>
                    <span className="data-v shrink-0 text-[11px] text-accent">{ex.formula}</span>
                  </span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-t3">{sub}</span>
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </aside>
  );
}

import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore, useValidation } from '../store';
import { ELEMENTS } from '../lib/elements';
import {
  bondLength,
  bondOrderSum,
  fragments,
  idealAngle,
  measuredAngle,
  molecularFormula,
  molecularMass,
  neighboursOf,
  vseprShape,
} from '../lib/chemistry';
import type { Atom } from '../types';
import { useT } from '../lib/i18n';

/** Turkish element names (local to Inspector — lib/elements.ts stays English) */
const ELEMENT_NAME_TR: Record<string, string> = {
  H: 'Hidrojen',
  C: 'Karbon',
  N: 'Azot',
  O: 'Oksijen',
  S: 'Kükürt',
  P: 'Fosfor',
  F: 'Flor',
  Cl: 'Klor',
  Br: 'Brom',
  I: 'İyot',
  Na: 'Sodyum',
  Mg: 'Magnezyum',
  Ca: 'Kalsiyum',
  Fe: 'Demir',
  Cu: 'Bakır',
};

/** Turkish VSEPR shape names — keys match exactly what chemistry.ts returns */
const SHAPE_TR: Record<string, string> = {
  Linear: 'Doğrusal',
  Bent: 'Açılı',
  'Trigonal planar': 'Üçgen düzlem',
  'Trigonal pyramidal': 'Üçgen piramit',
  Tetrahedral: 'Dört yüzlü',
};

const RE_VALENCE = /^(.+) has (\d+) bonds but (.+) supports at most (\d+) in a neutral structure\.$/;
const RE_ISOLATED = /^(.+) is not bonded to anything\.$/;
const RE_RADICAL =
  /^(.+) has (\d+) bonds; neutral (.+) usually shows (.+)\. Possible radical or charge\.$/;
const RE_FRAGMENTS = /^Structure has (\d+) disconnected fragments\.$/;

/** chemistry.ts issues English messages; rebuild the known patterns in Turkish
 *  locally (chemistry.ts is not edited). Unknown patterns pass through. */
function issueMessageTr(message: string): string {
  // chemistry.ts embeds full English names ("Hydrogen"); map them to Turkish
  // via the symbol lookup in elements.ts without editing either lib file.
  const elName = (en: string) => {
    const sym = (Object.keys(ELEMENTS) as (keyof typeof ELEMENTS)[]).find(
      (k) => ELEMENTS[k].name === en,
    );
    return (sym && ELEMENT_NAME_TR[sym]) || en;
  };
  let m = RE_VALENCE.exec(message);
  if (m) return `${m[1]} ${m[2]} bağa sahip ama ${elName(m[3])} nötr bir yapıda en fazla ${m[4]} destekler.`;
  m = RE_ISOLATED.exec(message);
  if (m) return `${m[1]} hiçbir şeye bağlı değil.`;
  m = RE_RADICAL.exec(message);
  if (m)
    return `${m[1]} ${m[2]} bağa sahip; nötr ${elName(m[3])} genellikle ${m[4].replace(/ or /g, ' veya ')} gösterir. Olası radikal veya yük.`;
  m = RE_FRAGMENTS.exec(message);
  if (m) return `Yapıda ${m[1]} ayrık parça var.`;
  return message;
}

/** 1-based display label like "O1", "H2" */
function atomLabel(atoms: Atom[], id: string): string {
  const i = atoms.findIndex((a) => a.id === id);
  if (i < 0) return id;
  return `${atoms[i].element}${i + 1}`;
}

function Row({
  label,
  value,
  title,
}: {
  label: string;
  value: ReactNode;
  title?: string;
}) {
  return (
    <div
      className="h-7 border-t border-line/60 px-3 flex items-center justify-between gap-2"
      title={title}
    >
      <span className="text-t2 text-[11.5px] truncate">{label}</span>
      <span className="data-v text-t1 text-[12px] truncate">{value}</span>
    </div>
  );
}

function CardHeader({ title, meta }: { title: ReactNode; meta?: string }) {
  return (
    <div className="h-9 px-3 flex items-center justify-between gap-2">
      <span className="panel-h flex items-center gap-1.5 min-w-0">
        {title}
      </span>
      {meta != null && (
        <span className="data-v text-[11px] text-t2 truncate">{meta}</span>
      )}
    </div>
  );
}

function AtomPanel({
  atom,
  onSelectAtom,
}: {
  atom: Atom;
  onSelectAtom: (id: string) => void;
}) {
  const t = useT();
  const molecule = useStore((s) => s.molecule);
  const info = ELEMENTS[atom.element];
  const sum = bondOrderSum(molecule, atom.id);
  const maxValence = Math.max(...info.valences);
  const exceeds = sum > maxValence;
  const neighbours = neighboursOf(molecule, atom.id);
  const shape = vseprShape(molecule, atom.id);
  const measured = measuredAngle(molecule, atom.id);
  const ideal = idealAngle(molecule, atom.id);

  return (
    <>
      <CardHeader
        title={
          <>
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-line2"
              style={{ backgroundColor: info.cpk }}
            />
            {`${t(info.name, ELEMENT_NAME_TR[atom.element] ?? info.name)} (${info.symbol})`}
          </>
        }
        meta={atomLabel(molecule.atoms, atom.id)}
      />
      <Row label={t('Atomic number', 'Atom numarası')} value={String(info.number)} />
      <Row label={t('Atomic mass', 'Atom kütlesi')} value={`${info.mass.toFixed(3)} g/mol`} />
      <Row label={t('Valence electrons', 'Değerlik elektronları')} value={String(info.ve)} />
      <Row
        label={t('Bond-order sum / valence', 'Bağ mertebesi toplamı / valans')}
        value={
          exceeds ? (
            <span className="text-err">
              {t(`${sum} — exceeds max ${maxValence}`, `${sum} — azami ${maxValence} aşıyor`)}
            </span>
          ) : (
            t(`${sum} of ${info.valences.join('/')}`, `${sum} / ${info.valences.join('/')}`)
          )
        }
      />
      <div className="border-t border-line/60 px-3 py-1.5">
        <div className="text-t2 text-[11.5px] mb-1">
          {t('Connected atoms', 'Bağlı atomlar')}
        </div>
        {neighbours.length === 0 ? (
          <div className="text-t3 text-[11px]">{t('none', 'yok')}</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {neighbours.map((n) => (
              <button
                key={n.atom.id}
                onClick={() => onSelectAtom(n.atom.id)}
                className="data-v text-[11px] px-1.5 h-5 rounded-btn border border-line2 text-accent hover:bg-hover hover:text-accent-hi transition-colors"
              >
                {atomLabel(molecule.atoms, n.atom.id)}
              </button>
            ))}
          </div>
        )}
      </div>
      <Row label={t('Van der Waals radius', 'Van der Waals yarıçapı')} value={`${info.vdw.toFixed(2)} Å`} />
      <Row label={t('Covalent radius', 'Kovalent yarıçap')} value={`${info.covalent.toFixed(2)} Å`} />
      <div className="h-7 border-t border-line/60 px-3 flex items-center justify-between gap-2">
        <span className="text-t2 text-[11.5px]">{t('CPK color', 'CPK rengi')}</span>
        <span className="flex items-center gap-1.5">
          <span className="data-v text-t3 text-[11px]">{info.cpk}</span>
          <span
            className="inline-block w-3.5 h-3.5 rounded-btn border border-line2"
            style={{ backgroundColor: info.cpk }}
          />
        </span>
      </div>

      {/* GEOMETRY sub-block */}
      <div className="border-t border-line/60 px-3 pt-2 pb-0.5">
        <span className="panel-h">{t('Geometry', 'Geometri')}</span>
      </div>
      <Row
        label={t('VSEPR shape', 'VSEPR biçimi')}
        value={
          shape == null ? (
            <span className="text-t3">{t('not applicable', 'geçerli değil')}</span>
          ) : (
            t(shape, SHAPE_TR[shape] ?? shape)
          )
        }
      />
      <div className="px-3 pt-1">
        <span className="text-[10px] text-t3 leading-relaxed">
          {t('idealized; assumes neutral atoms', 'idealleştirilmiş; nötr atomlar varsayar')}
        </span>
      </div>
      <Row
        label={t('Measured angle (from coordinates)', 'Ölçülen açı (koordinatlardan)')}
        value={measured == null ? '—' : `${measured.deg.toFixed(1)}°`}
      />
      <Row
        label={t('Ideal angle (VSEPR)', 'İdeal açı (VSEPR)')}
        value={ideal == null ? '—' : `${ideal.toFixed(1)}°`}
      />
      <div className="h-2" />
    </>
  );
}

function BondPanel({ bondId }: { bondId: string }) {
  const t = useT();
  const molecule = useStore((s) => s.molecule);
  const select = useStore((s) => s.select);
  const setOrderOf = useStore((s) => s.setOrderOf);
  const { atoms, bonds } = molecule;
  const bond = bonds.find((b) => b.id === bondId);
  if (!bond) return null;

  const len = bondLength(molecule, bond);
  const a = atoms.find((x) => x.id === bond.a);
  const b = atoms.find((x) => x.id === bond.b);
  const sigma =
    a && b ? ELEMENTS[a.element].covalent + ELEMENTS[b.element].covalent : null;

  return (
    <>
      <CardHeader
        title={t('Bond', 'Bağ')}
        meta={`${atomLabel(atoms, bond.a)} – ${atomLabel(atoms, bond.b)}`}
      />
      <div className="h-7 border-t border-line/60 px-3 flex items-center justify-between gap-2">
        <span className="text-t2 text-[11.5px]">{t('Bond order', 'Bağ mertebesi')}</span>
        <span className="flex items-center gap-0.5">
          {([1, 2, 3] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrderOf(bond.id, o)}
              className={`data-v w-6 h-5 text-[11px] rounded-btn border transition-colors ${
                bond.order === o
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-line2 text-t2 hover:bg-hover'
              }`}
              aria-pressed={bond.order === o}
            >
              {o}
            </button>
          ))}
        </span>
      </div>
      <Row
        label={t('Length (measured)', 'Uzunluk (ölçülen)')}
        value={len == null ? '—' : `${len.toFixed(3)} Å`}
      />
      <Row
        label={t('Σ covalent radii (ref)', 'Σ kovalent yarıçap (ref)')}
        value={sigma == null ? '—' : `${sigma.toFixed(3)} Å`}
      />
      <div className="h-7 border-t border-line/60 px-3 flex items-center justify-between gap-2">
        <span className="text-t2 text-[11.5px]">{t('Atoms', 'Atomlar')}</span>
        <span className="flex items-center gap-1.5">
          {a && (
            <button
              onClick={() => select({ kind: 'atom', id: a.id })}
              className="data-v text-[12px] text-accent hover:text-accent-hi transition-colors"
            >
              {atomLabel(atoms, a.id)}
            </button>
          )}
          <span className="text-t3 text-[11px]">·</span>
          {b && (
            <button
              onClick={() => select({ kind: 'atom', id: b.id })}
              className="data-v text-[12px] text-accent hover:text-accent-hi transition-colors"
            >
              {atomLabel(atoms, b.id)}
            </button>
          )}
        </span>
      </div>
      <div className="h-2" />
    </>
  );
}

export default function Inspector() {
  const t = useT();
  const molecule = useStore((s) => s.molecule);
  const projectName = useStore((s) => s.projectName);
  const selection = useStore((s) => s.selection);
  const select = useStore((s) => s.select);
  const validation = useValidation();

  const { atoms, bonds } = molecule;
  const empty = atoms.length === 0;
  const formula = empty ? '—' : molecularFormula(molecule);
  const mass = empty ? '—' : molecularMass(molecule).toFixed(3);

  const selectedAtom =
    selection?.kind === 'atom'
      ? atoms.find((a) => a.id === selection.id) ?? null
      : null;
  const hasBondSelection =
    selection?.kind === 'bond' && bonds.some((b) => b.id === selection.id);

  return (
    <aside className="w-[300px] shrink-0 border-l border-line bg-panel flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ── Card 1: MOLECULE ─────────────────────────────── */}
        <section className="border-b border-line">
          <CardHeader title={t('Molecule', 'Molekül')} />
          <div className="px-3 pb-2">
            <div className="data-v text-xl text-t1 leading-tight">{formula}</div>
            <div className="text-t3 text-[11px] truncate mt-0.5">{projectName}</div>
          </div>
          <Row
            label={t('Molar mass', 'Molar kütle')}
            value={empty ? '—' : `${mass} g/mol`}
            title={t(
              'IUPAC 2021 average atomic weights — not exact mass',
              'IUPAC 2021 ortalama atom ağırlıkları — tam kütle değil',
            )}
          />
          <Row label={t('Atoms', 'Atomlar')} value={String(atoms.length)} />
          <Row label={t('Bonds', 'Bağlar')} value={String(bonds.length)} />
          <Row label={t('Fragments', 'Parçalar')} value={String(fragments(molecule).length)} />

          {validation.errors.length === 0 && validation.warnings.length === 0 ? (
            <div className="h-7 border-t border-line/60 px-3 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-ok shrink-0" />
              <span className="text-[11px] text-t2 truncate">
                {t('No structural errors', 'Yapısal hata yok')}
              </span>
            </div>
          ) : (
            <div className="border-t border-line/60 px-3 py-1.5 flex flex-col gap-1">
              {validation.errors.map((iss, i) => (
                <div key={`e${i}`} className="flex items-start gap-1.5">
                  <AlertCircle size={12} className="text-err shrink-0 mt-[2px]" />
                  <span className="text-[11px] text-t2 leading-snug">
                    {t(iss.message, issueMessageTr(iss.message))}
                  </span>
                </div>
              ))}
              {validation.warnings.map((iss, i) => (
                <div key={`w${i}`} className="flex items-start gap-1.5">
                  <AlertTriangle size={12} className="text-warn shrink-0 mt-[2px]" />
                  <span className="text-[11px] text-t2 leading-snug">
                    {t(iss.message, issueMessageTr(iss.message))}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-t3 leading-relaxed px-3 py-2 border-t border-line">
            {t(
              'Geometry is measured from your current 3D coordinates. Properties derive from published constants and heuristic rules — not a quantum-chemical calculation.',
              'Geometri geçerli 3B koordinatlardan ölçülür. Özellikler yayımlanmış sabitlerden ve sezgisel kurallardan türetilir — kuantum-kimya hesabı değildir.',
            )}
          </p>
        </section>

        {/* ── Card 2: SELECTED ATOM ────────────────────────── */}
        <section className="border-b border-line">
          {selectedAtom ? (
            <AtomPanel
              atom={selectedAtom}
              onSelectAtom={(id) => select({ kind: 'atom', id })}
            />
          ) : (
            <>
              <CardHeader title={t('Selected Atom', 'Seçili Atom')} />
              <p className="text-t3 text-[11.5px] px-3 py-4">
                {t(
                  'Nothing selected — click an atom or bond in the viewport.',
                  "Seçim yok — viewport'tan bir atom veya bağa tıklayın.",
                )}
              </p>
            </>
          )}
        </section>

        {/* ── Card 3: SELECTED BOND ────────────────────────── */}
        {hasBondSelection && selection?.kind === 'bond' && (
          <section className="border-b border-line">
            <BondPanel bondId={selection.id} />
          </section>
        )}
      </div>
    </aside>
  );
}

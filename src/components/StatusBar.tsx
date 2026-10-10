import type { ReactNode } from 'react';
import { useStore } from '../store';
import { molecularFormula, validate } from '../lib/chemistry';
import { useT } from '../lib/i18n';
import type { DisplayMode, Tool } from '../types';

function Item({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="truncate" title={title}>
      {children}
    </span>
  );
}

export function StatusBar() {
  const t = useT();
  const tool = useStore((s) => s.tool);
  const molecule = useStore((s) => s.molecule);
  const projection = useStore((s) => s.projection);
  const displayMode = useStore((s) => s.displayMode);

  const TOOL_LABELS: Record<Tool, string> = {
    select: t('SELECT', 'SEÇ'),
    move: t('MOVE', 'TAŞI'),
    add: t('ADD', 'EKLE'),
    bond: t('BOND', 'BAĞ'),
    delete: t('DELETE', 'SİL'),
    measure: t('MEASURE', 'ÖLÇ'),
  };
  const MODE_LABELS: Record<DisplayMode, string> = {
    ballstick: t('ballstick', 'top-çubuk'),
    spacefill: t('spacefill', 'uzay dolgusu'),
    wireframe: t('wireframe', 'tel kafes'),
  };
  const hints = t(
    'V M A B D E tools · 1/2/3 bond order · Ctrl+Z undo · Ctrl+Shift+Z redo · F frame · Esc clear',
    'V M A B D E araçlar · 1/2/3 bağ derecesi · Ctrl+Z geri al · Ctrl+Shift+Z yinele · F çerçevele · Esc temizle',
  );

  const report = validate(molecule);
  const dot =
    report.errors.length > 0
      ? 'bg-err'
      : report.warnings.length > 0
        ? 'bg-warn'
        : 'bg-ok';
  const firstIssue = report.errors[0]?.message ?? report.warnings[0]?.message;
  const formula = molecularFormula(molecule);

  return (
    <footer className="flex h-[26px] shrink-0 items-center gap-4 border-t border-line bg-panel px-3 font-mono text-[11px] text-t3">
      <Item>
        <span className="uppercase text-accent">{TOOL_LABELS[tool]}</span>
      </Item>
      <Item title={formula}>{formula || '—'}</Item>
      <Item title={t('Atom and bond counts', 'Atom ve bağ sayıları')}>
        {molecule.atoms.length} {t('atoms', 'atom')} · {molecule.bonds.length}{' '}
        {t('bonds', 'bağ')}
      </Item>
      <span
        className="flex shrink-0 items-center gap-1.5"
        title={firstIssue ?? t('No structural errors', 'Yapısal hata yok')}
      >
        <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
        {report.errors.length > 0
          ? `${report.errors.length} ${t('err', 'hata')}`
          : report.warnings.length > 0
            ? `${report.warnings.length} ${t('warn', 'uyarı')}`
            : t('valid', 'geçerli')}
      </span>
      <Item title={t('Camera projection', 'Kamera projeksiyonu')}>{projection}</Item>
      <Item title={t('Display mode', 'Görünüm modu')}>{MODE_LABELS[displayMode]}</Item>
      <span className="ml-auto hidden max-w-[46%] truncate xl:block" title={hints}>
        {hints}
      </span>
    </footer>
  );
}

export default StatusBar;

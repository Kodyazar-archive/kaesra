import { useRef, type ChangeEvent, type ReactNode } from 'react';
import {
  Clapperboard,
  Download,
  FilePlus2,
  FlaskConical,
  FolderOpen,
  Keyboard,
  Redo2,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { useStore } from '../store';
import { validate } from '../lib/chemistry';
import { useI18n, useT, type Lang } from '../lib/i18n';

function IconBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="flex size-8 items-center justify-center rounded-btn text-t2 hover:bg-hover hover:text-t1"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-line" aria-hidden />;
}

export function Toolbar() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const projectName = useStore((s) => s.projectName);
  const molecule = useStore((s) => s.molecule);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const newProject = useStore((s) => s.newProject);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const tourActive = useStore((s) => s.tourActive);
  const setTourActive = useStore((s) => s.setTourActive);
  const demoActive = useStore((s) => s.demoActive);
  const setDemoActive = useStore((s) => s.setDemoActive);
  const fileRef = useRef<HTMLInputElement>(null);

  const shortcutTitle = t(
    'Keyboard shortcuts — V select · M move · A add · B bond · D delete · E measure · ' +
      '1/2/3 bond order · Ctrl+Z undo · Ctrl+Shift+Z redo · F frame · Esc clear',
    'Klavye kısayolları — V seç · M taşı · A ekle · B bağ · D sil · E ölç · ' +
      '1/2/3 bağ derecesi · Ctrl+Z geri al · Ctrl+Shift+Z yinele · F çerçevele · Esc temizle',
  );

  const report = validate(molecule);
  const nErr = report.errors.length;
  const nWarn = report.warnings.length;
  const status =
    nErr > 0
      ? { dot: 'bg-err', label: `${nErr} ${t('errors', 'hata')}` }
      : nWarn > 0
        ? { dot: 'bg-warn', label: `${nWarn} ${t('warnings', 'uyarı')}` }
        : { dot: 'bg-ok', label: t('no structural errors', 'yapısal hata yok') };
  const firstIssue = report.errors[0]?.message ?? report.warnings[0]?.message;

  const tourEnabled = molecule.atoms.length >= 2;

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    importJSON(text);
  };

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-panel px-3">
      {/* brand */}
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-btn bg-accent/10 text-accent">
          <FlaskConical size={14} strokeWidth={1.75} />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-t1">
          Molecular Studio
        </span>
      </div>

      <Sep />

      {/* project name */}
      <span
        className="max-w-[220px] truncate text-[12px] text-t2"
        title={projectName}
      >
        {projectName}
      </span>

      <Sep />

      {/* file + history actions */}
      <IconBtn title={t('New', 'Yeni')} onClick={newProject}>
        <FilePlus2 size={15} strokeWidth={1.75} />
      </IconBtn>
      <IconBtn title={t('Open', 'Aç')} onClick={() => fileRef.current?.click()}>
        <FolderOpen size={15} strokeWidth={1.75} />
      </IconBtn>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          void onFileChange(e);
        }}
      />
      <IconBtn title={t('Export', 'Dışa aktar')} onClick={exportJSON}>
        <Download size={15} strokeWidth={1.75} />
      </IconBtn>

      <Sep />

      <IconBtn title={`${t('Undo', 'Geri al')} (Ctrl+Z)`} onClick={undo} disabled={!canUndo}>
        <Undo2 size={15} strokeWidth={1.75} />
      </IconBtn>
      <IconBtn
        title={`${t('Redo', 'Yinele')} (Ctrl+Shift+Z)`}
        onClick={redo}
        disabled={!canRedo}
      >
        <Redo2 size={15} strokeWidth={1.75} />
      </IconBtn>

      {/* language switcher */}
      <div
        className="ml-1 flex items-center overflow-hidden rounded-btn border border-line"
        title={t('Language', 'Dil')}
      >
        {(['tr', 'en'] as const).map((l: Lang) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-label={t('Language', 'Dil')}
            className={`px-1.5 py-1 font-mono text-[11px] leading-none ${
              lang === l
                ? 'border-accent/50 bg-accent/15 text-accent'
                : 'bg-raised text-t3 hover:bg-hover hover:text-t2'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* live demo */}
      <button
        type="button"
        title={t('Live demo: watch the studio build a molecule', 'Canlı demo: stüdyonun molekül inşa etmesini izle')}
        aria-label={t('Live demo', 'Canlı demo')}
        onClick={() => setDemoActive(!demoActive)}
        className={`flex size-8 items-center justify-center rounded-btn border ${
          demoActive
            ? 'border-accent/50 bg-accent/15 text-accent'
            : 'border-line bg-raised text-t2 hover:bg-hover hover:text-t1'
        }`}
      >
        <Sparkles size={15} strokeWidth={1.75} />
      </button>

      {/* guided tour */}
      <button
        type="button"
        title={t('Guided tour', 'Rehberli tur')}
        aria-label={t('Guided tour', 'Rehberli tur')}
        onClick={() => setTourActive(!tourActive)}
        className={`flex size-8 items-center justify-center rounded-btn border ${
          tourActive
            ? 'border-accent/50 bg-accent/15 text-accent'
            : 'border-line bg-raised text-t2 hover:bg-hover hover:text-t1'
        } ${tourEnabled ? '' : 'opacity-40 pointer-events-none'}`}
      >
        <Clapperboard size={15} strokeWidth={1.75} />
      </button>

      {/* validation pill */}
      <div
        className="ml-1 flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-t2"
        title={
          firstIssue ??
          t(
            'Structure passes valence and fragment checks',
            'Yapı değerlik ve parça kontrollerini geçiyor',
          )
        }
      >
        <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden />
        {status.label}
      </div>

      {/* right side */}
      <div className="ml-auto flex items-center gap-1">
        <IconBtn title={shortcutTitle}>
          <Keyboard size={15} strokeWidth={1.75} />
        </IconBtn>
      </div>
    </header>
  );
}

export default Toolbar;

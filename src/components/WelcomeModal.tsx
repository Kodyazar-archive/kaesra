import { useEffect } from 'react';
import { Box, Clapperboard, Link2, Ruler } from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../lib/i18n';

export default function WelcomeModal() {
  const introOpen = useStore((s) => s.introOpen);
  const setIntroOpen = useStore((s) => s.setIntroOpen);
  const setTourActive = useStore((s) => s.setTourActive);
  const t = useT();

  useEffect(() => {
    if (!introOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIntroOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [introOpen, setIntroOpen]);

  if (!introOpen) return null;

  const features = [
    {
      Icon: Box,
      label: t('Real 3D geometry, measured live', 'Gerçek 3D geometri, canlı ölçüm'),
    },
    {
      Icon: Link2,
      label: t('Bond building & VSEPR validation', 'Bağ kurma ve VSEPR doğrulaması'),
    },
    {
      Icon: Ruler,
      label: t('Distance & angle measurement', 'Uzaklık ve açı ölçümü'),
    },
    {
      Icon: Clapperboard,
      label: t('Molecular scenes & guided tour', 'Moleküler sahneler ve rehberli tur'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Molecular Studio"
    >
      <div className="fade-in w-full max-w-[540px] bg-panel border border-line rounded-lg shadow-lg">
        {/* header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-line">
          <img
            src="/codejam-logo.png"
            alt="Kodyazar CodeJam"
            className="w-11 h-11 rounded-md border border-line2 object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-t1 text-[15px] font-semibold tracking-wide truncate">
                Molecular Studio
              </h1>
              <span className="border border-accent/40 text-accent text-[10px] uppercase tracking-wider px-1.5 py-px rounded shrink-0">
                Kodyazar CodeJam
              </span>
            </div>
            <p className="text-t3 text-[11px] mt-0.5">
              {t('3D molecular modeling workbench', '3D molekül modelleme tezgâhı')}
            </p>
          </div>
        </div>

        {/* body */}
        <div className="px-5 py-4">
          <p className="text-t2 text-[12px] leading-relaxed">
            {t(
              'Built for the Kodyazar CodeJam. A fully interactive 3D molecular modeling workbench: drag atoms, create bonds, measure angles and distances, and watch molecular scenes play out.',
              'Bu proje Kodyazar CodeJam için geliştirildi. Tamamen etkileşimli bir 3D molekül modelleme tezgâhı: atomları sürükleyin, bağ kurun, açıları ve uzaklıkları ölçün, moleküler sahneleri izleyin.',
            )}
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            {features.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 min-w-0">
                <Icon size={15} className="text-accent shrink-0" strokeWidth={1.75} />
                <span className="text-t1 text-[11.5px] leading-snug">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-t3 text-[11px] leading-relaxed mt-4 pt-3 border-t border-line/60">
            {t(
              'Geometry is measured from the current coordinates; properties derive from published constants — not a quantum-chemical calculation.',
              'Geometri geçerli koordinatlardan ölçülür; özellikler yayımlanmış sabitlerden türetilir — kuantum-kimya hesabı değildir.',
            )}
          </p>
        </div>

        {/* actions */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            onClick={() => {
              setIntroOpen(false);
              setTourActive(true);
            }}
            className="h-8 px-3 rounded-btn border border-line2 text-t2 text-[12px] hover:bg-hover hover:text-t1 transition-colors"
          >
            {t('Take the tour', 'Turu başlat')}
          </button>
          <button
            onClick={() => setIntroOpen(false)}
            className="h-8 px-3.5 rounded-btn bg-accent/15 border border-accent/50 text-accent text-[12px] hover:bg-accent/25 transition-colors"
          >
            {t('Enter the studio', 'Stüdyoya gir')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { create } from 'zustand';

export type Lang = 'tr' | 'en';

const KEY = 'molecular-studio:lang:v1';

function initial(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' ? 'en' : 'tr';
  } catch {
    return 'tr';
  }
}

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useI18n = create<I18nState>((set) => ({
  lang: initial(),
  setLang: (lang) => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* private mode — language is session-only */
    }
    set({ lang });
  },
}));

/** hook for components: const t = useT(); t('Select', 'Seç') */
export function useT() {
  const lang = useI18n((s) => s.lang);
  return (en: string, tr: string) => (lang === 'tr' ? tr : en);
}

/** non-hook version for store/actions/toasts: L('Export', 'Dışa aktar') */
export const L = (en: string, tr: string) =>
  useI18n.getState().lang === 'tr' ? tr : en;

/** element display names (English canonical, Turkish localized) */
export const ELEMENT_NAME_TR: Record<string, string> = {
  H: 'Hidrojen', C: 'Karbon', N: 'Azot', O: 'Oksijen', S: 'Kükürt',
  P: 'Fosfor', F: 'Flor', Cl: 'Klor', Br: 'Brom', I: 'İyot',
  Na: 'Sodyum', Mg: 'Magnezyum', Ca: 'Kalsiyum', Fe: 'Demir', Cu: 'Bakır',
};

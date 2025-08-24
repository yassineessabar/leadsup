import { useTranslation } from 'react-i18next';

export function useI18n(namespace?: string) {
  const { t, i18n, ready } = useTranslation(namespace);
  
  // Debug logging
  console.log('useI18n - Current language:', i18n.language, 'Ready:', ready);
  
  return {
    t,
    i18n,
    ready,
    currentLanguage: i18n.language,
    changeLanguage: (lng: string) => {
      console.log('Changing language to:', lng);
      i18n.changeLanguage(lng);
    },
    isRTL: i18n.dir() === 'rtl',
    languages: i18n.languages,
  };
}
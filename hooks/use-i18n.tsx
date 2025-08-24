import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

export function useI18n(namespace?: string) {
  const { t, i18n, ready } = useTranslation(namespace);
  const [isFullyReady, setIsFullyReady] = useState(false);
  
  // Wait for translations to be fully loaded
  useEffect(() => {
    const checkTranslations = () => {
      if (ready && i18n.hasResourceBundle(i18n.language, 'translation')) {
        setIsFullyReady(true);
        console.log('✅ Translations fully loaded for language:', i18n.language);
      } else {
        console.log('⏳ Waiting for translations to load...', { ready, language: i18n.language });
      }
    };

    checkTranslations();
    
    // Listen for language changes and resource additions
    i18n.on('languageChanged', checkTranslations);
    i18n.on('loaded', checkTranslations);
    
    return () => {
      i18n.off('languageChanged', checkTranslations);
      i18n.off('loaded', checkTranslations);
    };
  }, [ready, i18n]);
  
  // Debug logging
  console.log('useI18n - Current language:', i18n.language, 'Ready:', ready, 'Fully ready:', isFullyReady);
  
  return {
    t,
    i18n,
    ready: isFullyReady,
    currentLanguage: i18n.language,
    changeLanguage: (lng: string) => {
      console.log('Changing language to:', lng);
      i18n.changeLanguage(lng);
    },
    isRTL: i18n.dir() === 'rtl',
    languages: i18n.languages,
  };
}
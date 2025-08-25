import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

export function useI18n(namespace?: string) {
  const { t, i18n, ready } = useTranslation(namespace);
  const [isFullyReady, setIsFullyReady] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);
  
  // Wait for translations to be fully loaded
  useEffect(() => {
    const checkTranslations = (lng?: string) => {
      const currentLanguage = lng || i18n.language;
      const hasResources = i18n.hasResourceBundle(currentLanguage, 'translation');
      if (ready && hasResources) {
        setIsFullyReady(true);
        setCurrentLang(currentLanguage);
        console.log('✅ Translations fully loaded for language:', currentLanguage);
      } else {
        console.log('⏳ Waiting for translations to load...', { ready, language: currentLanguage, hasResources });
        setIsFullyReady(false);
        // Force reload resources if needed
        if (ready && !hasResources) {
          console.log('🔄 Forcing resource reload for language:', currentLanguage);
          i18n.reloadResources([currentLanguage]);
        }
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
    currentLanguage: currentLang,
    changeLanguage: async (lng: string) => {
      console.log('useI18n - Changing language to:', lng);
      try {
        // Update storage first
        if (typeof window !== 'undefined') {
          localStorage.setItem('i18nextLng', lng);
          sessionStorage.setItem('i18nextLng', lng);
          document.cookie = `i18nextLng=${lng}; path=/; max-age=31536000`;
        }
        
        await i18n.changeLanguage(lng);
        setCurrentLang(lng);
        console.log('useI18n - Language changed successfully to:', i18n.language);
      } catch (error) {
        console.error('useI18n - Error changing language:', error);
      }
    },
    isRTL: i18n.dir() === 'rtl',
    languages: i18n.languages,
  };
}
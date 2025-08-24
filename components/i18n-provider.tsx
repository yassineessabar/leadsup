'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);

  useEffect(() => {
    // Wait for i18n to be initialized
    const initI18n = async () => {
      if (!i18n.isInitialized) {
        await i18n.init();
      }
      
      // Force language from localStorage if available
      const savedLanguage = localStorage.getItem('i18nextLng');
      if (savedLanguage && savedLanguage !== i18n.language) {
        console.log('Restoring saved language:', savedLanguage);
        await i18n.changeLanguage(savedLanguage);
      }
      
      setIsI18nInitialized(true);
    };

    // Listen for language changes
    const handleLanguageChange = () => {
      console.log('Language changed to:', i18n.language);
    };

    i18n.on('languageChanged', handleLanguageChange);
    initI18n();

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  // Show a loading state while i18n is initializing
  if (!isI18nInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);

  useEffect(() => {
    // Wait for i18n to be initialized
    const initI18n = async () => {
      try {
        // i18n is already initialized in lib/i18n.js, just wait for it to be ready
        console.log('✅ i18n already initialized, language:', i18n.language);
        
        // Check for stored language preference and respect it
        const storedLanguage = typeof window !== 'undefined' ? 
          localStorage.getItem('i18nextLng') || sessionStorage.getItem('i18nextLng') || 'en' : 'en';
        
        console.log('Current i18n language:', i18n.language);
        console.log('Stored language preference:', storedLanguage);
        
        // Only set to stored language if it differs from current AND is a valid language
        if (i18n.language !== storedLanguage && ['en', 'fr'].includes(storedLanguage)) {
          console.log('🔄 Setting language to stored preference:', storedLanguage);
          await i18n.changeLanguage(storedLanguage);
          console.log('✅ Language set to:', i18n.language);
        } else {
          console.log('✅ Language already matches stored preference or invalid stored language:', i18n.language);
        }
        
        // Wait for initial translations to be ready
        let attempts = 0;
        const maxAttempts = 10;
        
        const waitForTranslations = async () => {
          const hasCurrentLangResources = i18n.hasResourceBundle(i18n.language, 'translation');
          
          if (hasCurrentLangResources || attempts >= maxAttempts) {
            console.log('📚 Translation resources ready for:', i18n.language);
            setIsI18nInitialized(true);
            return;
          }
          
          attempts++;
          console.log(`⏳ Waiting for translations... (${attempts}/${maxAttempts})`);
          
          // Try to reload resources for current language
          if (attempts <= 3) {
            await i18n.reloadResources([i18n.language]);
          }
          
          setTimeout(waitForTranslations, 200);
        };
        
        await waitForTranslations();
        console.log('✅ i18n setup complete, current language:', i18n.language);
      } catch (error) {
        console.error('❌ Error setting up i18n:', error);
        setIsI18nInitialized(true); // Still set to true to prevent infinite loading
      }
    };

    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      console.log('🌍 Language changed to:', lng);
      // Update storage to keep it in sync
      if (typeof window !== 'undefined') {
        localStorage.setItem('i18nextLng', lng);
        sessionStorage.setItem('i18nextLng', lng);
        document.cookie = `i18nextLng=${lng}; path=/; max-age=31536000`;
      }
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
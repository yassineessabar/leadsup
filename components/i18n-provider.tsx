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
        
        // Always set to stored language if it differs from current
        if (i18n.language !== storedLanguage) {
          console.log('🔄 Setting language to stored preference:', storedLanguage);
          await i18n.changeLanguage(storedLanguage);
          console.log('✅ Language set to:', i18n.language);
        } else {
          console.log('✅ Language already matches stored preference:', i18n.language);
        }
        
        // Check if translations are loaded
        const hasEnglish = i18n.hasResourceBundle('en', 'translation');
        const hasFrench = i18n.hasResourceBundle('fr', 'translation');
        console.log('📚 Translation bundles loaded:', { en: hasEnglish, fr: hasFrench });
        
        // Force load translations if not already loaded
        if (!hasEnglish || !hasFrench) {
          console.log('🔄 Force loading missing translation bundles...');
          await i18n.reloadResources();
        }
        
        console.log('✅ i18n setup complete, current language:', i18n.language);
        setIsI18nInitialized(true);
      } catch (error) {
        console.error('❌ Error setting up i18n:', error);
        setIsI18nInitialized(true); // Still set to true to prevent infinite loading
      }
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
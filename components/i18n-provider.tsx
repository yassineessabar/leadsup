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
        if (i18n.isInitialized) {
          console.log('✅ i18n already initialized, language:', i18n.language);
        } else {
          console.log('⏳ Waiting for i18n to initialize...');
          // Wait for it to be ready
          await i18n.init();
        }
        
        // Force French for now to test translations
        if (i18n.language !== 'fr') {
          console.log('🔄 Forcing French language...');
          await i18n.changeLanguage('fr');
        }
        
        // Check if translations are loaded
        const hasEnglish = i18n.hasResourceBundle('en', 'translation');
        const hasFrench = i18n.hasResourceBundle('fr', 'translation');
        console.log('📚 Translation bundles loaded:', { en: hasEnglish, fr: hasFrench });
        
        // Test a specific key
        const testKey = i18n.t('campaignManagement.targetTab.title');
        console.log('🧪 Test translation for targetTab.title:', testKey);
        
        console.log('✅ i18n initialization complete, current language:', i18n.language);
        setIsI18nInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing i18n:', error);
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
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// Only initialize if we're in the browser
if (typeof window !== 'undefined') {
  i18n
    .use(HttpApi) // HTTP backend for loading translations
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n instance to react-i18next
    .init({
      fallbackLng: 'en',
      debug: true,
      
      // Backend configuration
      backend: {
        loadPath: '/locales/{{lng}}/translation.json',
        crossDomain: false,
        allowMultiLoading: false
      },
      
      // Language detection options (prioritize user choice over browser language)
      detection: {
        order: ['querystring', 'localStorage', 'sessionStorage', 'cookie'],
        caches: ['localStorage', 'sessionStorage', 'cookie'],
        lookupQuerystring: 'lng',
        lookupLocalStorage: 'i18nextLng',
        lookupSessionStorage: 'i18nextLng',
        lookupCookie: 'i18nextLng',
        // Remove navigator and htmlTag to prevent browser language override
        excludeCacheFor: ['cimode']
      },
      
      // Default namespace
      ns: ['translation'],
      defaultNS: 'translation',
      
      interpolation: {
        escapeValue: false, // React already does escaping
      },
      
      // React options
      react: {
        useSuspense: false,
      },
      
      // Language settings
      supportedLngs: ['en', 'fr'],
    });
} else {
  // Server-side initialization with empty resources
  i18n
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      debug: false,
      ns: ['translation'],
      defaultNS: 'translation',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      supportedLngs: ['en', 'fr'],
      resources: {
        en: { translation: {} },
        fr: { translation: {} }
      }
    });
}

export default i18n;
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi) // Load translations using http (default public/locales)
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: 'en',
    lng: 'fr', // Force French as default for testing
    debug: true,
    
    // Language detection options
    detection: {
      order: ['querystring', 'localStorage', 'sessionStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'sessionStorage', 'cookie'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      lookupSessionStorage: 'i18nextLng',
      lookupCookie: 'i18nextLng',
    },
    
    // Backend options (for loading translation files)
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Default namespace
    ns: ['translation'],
    defaultNS: 'translation',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // Allow returning objects for nested keys
    returnObjects: true,
    
    // React options
    react: {
      useSuspense: false,
    },
    
    // Language settings
    supportedLngs: ['en', 'fr'],
    
    // Load translations on init
    preload: ['en', 'fr'],
  });

export default i18n;
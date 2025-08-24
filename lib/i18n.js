import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Load translations directly to avoid HTTP issues
const loadTranslations = async () => {
  try {
    // Load English translations
    const enResponse = await fetch('/locales/en/translation.json');
    const enTranslations = await enResponse.json();
    
    // Load French translations  
    const frResponse = await fetch('/locales/fr/translation.json');
    const frTranslations = await frResponse.json();
    
    // Add resource bundles directly
    i18n.addResourceBundle('en', 'translation', enTranslations);
    i18n.addResourceBundle('fr', 'translation', frTranslations);
    
    console.log('✅ Translations loaded successfully');
    console.log('EN keys:', Object.keys(enTranslations));
    console.log('FR keys:', Object.keys(frTranslations));
  } catch (error) {
    console.error('❌ Failed to load translations:', error);
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: 'en',
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
    
    // Resources will be loaded dynamically
    resources: {},
  })
  .then(() => {
    // Load translations after i18n is initialized
    loadTranslations();
  });

export default i18n;
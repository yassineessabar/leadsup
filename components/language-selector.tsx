'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng);
    };

    setCurrentLang(i18n.language);
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = async (lng: string) => {
    try {
      console.log('🔄 LanguageSelector changing language to:', lng);
      
      // Set storage consistently
      localStorage.setItem('i18nextLng', lng);
      sessionStorage.setItem('i18nextLng', lng);
      document.cookie = `i18nextLng=${lng}; path=/; max-age=31536000`;
      
      await i18n.changeLanguage(lng);
      setCurrentLang(lng);
      console.log('✅ LanguageSelector language changed to:', i18n.language);
    } catch (error) {
      console.error('❌ LanguageSelector error:', error);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-block">{currentLanguage.flag} {currentLanguage.name}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className="gap-2"
          >
            <span className="text-lg">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {currentLang === language.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for tight spaces
export function LanguageSelectorCompact() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng);
    };

    setCurrentLang(i18n.language);
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const toggleLanguage = async () => {
    try {
      const newLang = currentLang === 'en' ? 'fr' : 'en';
      console.log('🔄 LanguageSelectorCompact toggling to:', newLang);
      
      // Set storage consistently
      localStorage.setItem('i18nextLng', newLang);
      sessionStorage.setItem('i18nextLng', newLang);
      document.cookie = `i18nextLng=${newLang}; path=/; max-age=31536000`;
      
      await i18n.changeLanguage(newLang);
      setCurrentLang(newLang);
      console.log('✅ LanguageSelectorCompact language changed to:', i18n.language);
    } catch (error) {
      console.error('❌ LanguageSelectorCompact error:', error);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1 px-2"
      title={`Switch to ${currentLang === 'en' ? 'Français' : 'English'}`}
    >
      <span className="text-lg">{currentLanguage.flag}</span>
      <span className="text-xs font-medium">{currentLang.toUpperCase()}</span>
    </Button>
  );
}

// Inline language buttons for settings page
export function LanguageButtons() {
  const { i18n, t, ready } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng);
    };

    setCurrentLang(i18n.language);
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = async (lng: string) => {
    if (isChanging || lng === currentLang) return;
    
    try {
      setIsChanging(true);
      console.log('🔄 Changing language from', currentLang, 'to:', lng);
      console.log('🔍 Before change - Current i18n language:', i18n.language);
      
      // Set the new language preference consistently
      console.log('💾 Setting new language preference to:', lng);
      localStorage.setItem('i18nextLng', lng);
      sessionStorage.setItem('i18nextLng', lng);
      document.cookie = `i18nextLng=${lng}; path=/; max-age=31536000`;
      
      // Force change the language
      console.log('🔀 Calling i18n.changeLanguage');
      await i18n.changeLanguage(lng);
      console.log('✅ i18n language changed to:', i18n.language);
      
      setCurrentLang(lng);
      console.log('✅ Language change completed successfully');
      setIsChanging(false);
    } catch (error) {
      console.error('❌ Error changing language:', error);
      setIsChanging(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Language
        </label>
        <div className="flex gap-2">
          <div className="w-24 h-8 bg-gray-200 animate-pulse rounded"></div>
          <div className="w-24 h-8 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('settings.language.title')}
      </label>
      <div className="flex gap-2">
        {languages.map((language) => (
          <Button
            key={language.code}
            variant={currentLang === language.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeLanguage(language.code)}
            disabled={isChanging}
            className="gap-2"
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
            {isChanging && currentLang !== language.code && <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin ml-1"></div>}
          </Button>
        ))}
      </div>
    </div>
  );
}
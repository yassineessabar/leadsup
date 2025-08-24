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
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLang(lng);
    // Store the language preference in multiple places
    localStorage.setItem('i18nextLng', lng);
    sessionStorage.setItem('i18nextLng', lng);
    document.cookie = `i18nextLng=${lng}; path=/; max-age=31536000`; // 1 year
    // Force page reload to ensure all components update
    setTimeout(() => window.location.reload(), 100);
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

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    setCurrentLang(newLang);
    // Store the language preference in multiple places
    localStorage.setItem('i18nextLng', newLang);
    sessionStorage.setItem('i18nextLng', newLang);
    document.cookie = `i18nextLng=${newLang}; path=/; max-age=31536000`; // 1 year
    // Force page reload to ensure all components update
    setTimeout(() => window.location.reload(), 100);
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
  const { i18n, t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLang(lng);
    // Store the language preference in multiple places
    localStorage.setItem('i18nextLng', lng);
    sessionStorage.setItem('i18nextLng', lng);
    document.cookie = `i18nextLng=${lng}; path=/; max-age=31536000`; // 1 year
    // Force page reload to ensure all components update
    setTimeout(() => window.location.reload(), 100);
  };

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
            className="gap-2"
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
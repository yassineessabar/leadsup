"use client"

import { ArrowLeft, Globe, Palette, Bell, Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { LanguageButtons } from "@/components/language-selector"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface LanguagePreferencesPageProps {
  onBack: () => void
}

export function LanguagePreferencesPage({ onBack }: LanguagePreferencesPageProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-2 h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
          <div>
            <h1 className="text-4xl font-light text-gray-900 dark:text-gray-100 tracking-tight mb-2">
              {t('settings.languagePreferences.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{t('settings.languagePreferences.description')}</p>
          </div>
        </div>
      </div>

      {/* Language & Preferences Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100/50 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="space-y-0">
          
          {/* Language Section */}
          <div className="bg-gray-50/50 dark:bg-gray-800/50 px-8 py-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t('settings.language.title')}</h2>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 flex items-center justify-center">
                <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">{t('settings.language.title')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.language.description')}</p>
              </div>
            </div>
            <LanguageButtons />
          </div>

          {/* Theme Section (Future Enhancement) */}
          <div className="bg-gray-50/50 dark:bg-gray-800/50 px-8 py-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t('settings.theme.title')}</h2>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100/50 dark:bg-purple-900/30 flex items-center justify-center">
                <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">{t('settings.theme.title')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.theme.description')}</p>
              </div>
            </div>
            {mounted && (
              <div className="flex gap-3">
                <Button 
                  variant={theme === 'light' ? 'default' : 'outline'} 
                  onClick={() => setTheme('light')}
                  className="flex-1 h-12 border-gray-200 dark:border-gray-700 rounded-2xl"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  {t('settings.theme.light')}
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'outline'} 
                  onClick={() => setTheme('dark')}
                  className="flex-1 h-12 border-gray-200 dark:border-gray-700 rounded-2xl"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  {t('settings.theme.dark')}
                </Button>
                <Button 
                  variant={theme === 'system' ? 'default' : 'outline'} 
                  onClick={() => setTheme('system')}
                  className="flex-1 h-12 border-gray-200 dark:border-gray-700 rounded-2xl"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  {t('settings.theme.system')}
                </Button>
              </div>
            )}
          </div>

          {/* Notifications Section (Future Enhancement) */}
          <div className="bg-gray-50/50 dark:bg-gray-800/50 px-8 py-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t('settings.notifications.title')}</h2>
          </div>

          <div className="p-8 opacity-50">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center">
                <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">{t('settings.notifications.title')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.notifications.description')}</p>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.notifications.campaigns')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.notifications.campaignsDesc')}</p>
                </div>
                <div className="w-10 h-6 bg-gray-300 dark:bg-gray-600 rounded-full cursor-not-allowed"></div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.notifications.system')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.notifications.systemDesc')}</p>
                </div>
                <div className="w-10 h-6 bg-gray-300 dark:bg-gray-600 rounded-full cursor-not-allowed"></div>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {t('settings.notifications.comingSoon')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
"use client"

import { ArrowLeft, Globe, Palette, Bell, Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { LanguageButtons } from "@/components/language-selector"

interface LanguagePreferencesPageProps {
  onBack: () => void
}

export function LanguagePreferencesPage({ onBack }: LanguagePreferencesPageProps) {
  const { t } = useTranslation()

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 p-2 h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">
              {t('settings.languagePreferences.title')}
            </h1>
            <p className="text-gray-600">{t('settings.languagePreferences.description')}</p>
          </div>
        </div>
      </div>

      {/* Language & Preferences Settings */}
      <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden shadow-sm">
        <div className="space-y-0">
          
          {/* Language Section */}
          <div className="bg-gray-50/50 px-8 py-4">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">{t('settings.language.title')}</h2>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gray-100/50 flex items-center justify-center">
                <Globe className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900">{t('settings.language.title')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{t('settings.language.description')}</p>
              </div>
            </div>
            <LanguageButtons />
          </div>

          {/* Theme Section (Future Enhancement) */}
          <div className="bg-gray-50/50 px-8 py-4">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">{t('settings.theme.title')}</h2>
          </div>

          <div className="p-8 opacity-50">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100/50 flex items-center justify-center">
                <Palette className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900">{t('settings.theme.title')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{t('settings.theme.description')}</p>
              </div>
            </div>
            <div className="flex gap-3 mb-4">
              <Button variant="outline" disabled className="flex-1 h-12 border-gray-200 rounded-2xl">
                <Sun className="h-4 w-4 mr-2" />
                {t('settings.theme.light')}
              </Button>
              <Button variant="outline" disabled className="flex-1 h-12 border-gray-200 rounded-2xl">
                <Moon className="h-4 w-4 mr-2" />
                {t('settings.theme.dark')}
              </Button>
              <Button variant="outline" disabled className="flex-1 h-12 border-gray-200 rounded-2xl">
                <Monitor className="h-4 w-4 mr-2" />
                {t('settings.theme.system')}
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {t('settings.theme.comingSoon')}
            </p>
          </div>

          {/* Notifications Section (Future Enhancement) */}
          <div className="bg-gray-50/50 px-8 py-4">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">{t('settings.notifications.title')}</h2>
          </div>

          <div className="p-8 opacity-50">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-100/50 flex items-center justify-center">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900">{t('settings.notifications.title')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{t('settings.notifications.description')}</p>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('settings.notifications.campaigns')}</p>
                  <p className="text-xs text-gray-500">{t('settings.notifications.campaignsDesc')}</p>
                </div>
                <div className="w-10 h-6 bg-gray-300 rounded-full cursor-not-allowed"></div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('settings.notifications.system')}</p>
                  <p className="text-xs text-gray-500">{t('settings.notifications.systemDesc')}</p>
                </div>
                <div className="w-10 h-6 bg-gray-300 rounded-full cursor-not-allowed"></div>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {t('settings.notifications.comingSoon')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
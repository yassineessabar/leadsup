"use client"

import { ArrowLeft, Globe, Palette, Bell, Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/hooks/use-i18n"
import { LanguageButtons } from "@/components/language-selector"

interface LanguagePreferencesPageProps {
  onBack: () => void
}

export function LanguagePreferencesPage({ onBack }: LanguagePreferencesPageProps) {
  const { t } = useI18n()

  return (
    <div className="h-full bg-gray-50/50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t('settings.languagePreferences.title')}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t('settings.languagePreferences.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Language Section */}
        <Card className="border border-gray-200/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100/50 flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-medium text-gray-900">
                  {t('settings.language.title')}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  {t('settings.language.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LanguageButtons />
          </CardContent>
        </Card>

        {/* Theme Section (Future Enhancement) */}
        <Card className="border border-gray-200/50 shadow-sm opacity-50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100/50 flex items-center justify-center">
                <Palette className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-medium text-gray-900">
                  {t('settings.theme.title')}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  {t('settings.theme.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="outline" disabled className="flex-1 h-12">
                <Sun className="h-4 w-4 mr-2" />
                {t('settings.theme.light')}
              </Button>
              <Button variant="outline" disabled className="flex-1 h-12">
                <Moon className="h-4 w-4 mr-2" />
                {t('settings.theme.dark')}
              </Button>
              <Button variant="outline" disabled className="flex-1 h-12">
                <Monitor className="h-4 w-4 mr-2" />
                {t('settings.theme.system')}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              {t('settings.theme.comingSoon')}
            </p>
          </CardContent>
        </Card>

        {/* Notifications Section (Future Enhancement) */}
        <Card className="border border-gray-200/50 shadow-sm opacity-50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100/50 flex items-center justify-center">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-medium text-gray-900">
                  {t('settings.notifications.title')}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  {t('settings.notifications.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
            <p className="text-xs text-gray-400 mt-3 text-center">
              {t('settings.notifications.comingSoon')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
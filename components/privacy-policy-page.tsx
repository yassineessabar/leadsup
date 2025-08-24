"use client"

import { ArrowLeft, Shield, Eye, Lock, Database, Mail, Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

interface PrivacyPolicyPageProps {
  onBack: () => void
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  const { t } = useTranslation()

  const sections = [
    {
      icon: <Eye className="w-5 h-5" />,
      key: "dataCollection",
    },
    {
      icon: <Database className="w-5 h-5" />,
      key: "dataUsage",
    },
    {
      icon: <Lock className="w-5 h-5" />,
      key: "dataSecurity",
    },
    {
      icon: <Cookie className="w-5 h-5" />,
      key: "cookies",
    },
    {
      icon: <Mail className="w-5 h-5" />,
      key: "contact",
    },
  ]

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
              {t('privacy.title')}
            </h1>
            <p className="text-gray-600">{t('privacy.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden shadow-sm">
        {/* Introduction */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-900">{t('privacy.introduction.title')}</h2>
          </div>
          <p className="text-gray-600 leading-relaxed">
            {t('privacy.introduction.content')}
          </p>
          <p className="text-sm text-gray-500 mt-4">
            {t('privacy.lastUpdated')}: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Sections */}
        <div className="divide-y divide-gray-100">
          {sections.map((section) => (
            <div key={section.key} className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  {section.icon}
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {t(`privacy.sections.${section.key}.title`)}
                </h3>
              </div>
              <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                  {t(`privacy.sections.${section.key}.content`)}
                </p>
                {t(`privacy.sections.${section.key}.details`) && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm text-gray-600">
                      {t(`privacy.sections.${section.key}.details`)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">{t('privacy.footer.title')}</h3>
          </div>
          <p className="text-gray-600">
            {t('privacy.footer.content')}
          </p>
        </div>
      </div>
    </div>
  )
}
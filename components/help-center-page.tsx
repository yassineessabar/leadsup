"use client"

import { ArrowLeft, HelpCircle, Book, MessageSquare, Settings, Mail, Phone, Globe, Search, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"
import { useState } from "react"

interface HelpCenterPageProps {
  onBack: () => void
}

export function HelpCenterPage({ onBack }: HelpCenterPageProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const categories = [
    {
      icon: <Settings className="w-5 h-5" />,
      key: "gettingStarted",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: <Book className="w-5 h-5" />,
      key: "features",
      color: "bg-green-100 text-green-600",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      key: "campaigns",
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      key: "integrations",
      color: "bg-orange-100 text-orange-600",
    },
  ]

  const faqItems = [
    "howToStart",
    "setupCampaign",
    "trackResults",
    "manageDomains",
    "billingQuestions"
  ]

  const contactOptions = [
    {
      icon: <Mail className="w-5 h-5" />,
      key: "email",
      action: "mailto:support@leadsup.io",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      key: "chat",
      action: "#",
      color: "bg-green-100 text-green-600",
    },
  ]

  const toggleFaq = (faqKey: string) => {
    setExpandedFaq(expandedFaq === faqKey ? null : faqKey)
  }

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
              {t('help.title')}
            </h1>
            <p className="text-gray-600">{t('help.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={t('help.search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 border-gray-200 rounded-2xl text-lg focus:border-blue-600 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories */}
        <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-medium text-gray-900">{t('help.categories.title')}</h2>
            <p className="text-gray-600 text-sm mt-1">{t('help.categories.subtitle')}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {categories.map((category) => (
              <button
                key={category.key}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${category.color} flex items-center justify-center`}>
                    {category.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-medium text-gray-900">
                      {t(`help.categories.${category.key}.title`)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t(`help.categories.${category.key}.description`)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-medium text-gray-900">{t('help.faq.title')}</h2>
            <p className="text-gray-600 text-sm mt-1">{t('help.faq.subtitle')}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {faqItems.map((faq) => (
              <div key={faq}>
                <button
                  onClick={() => toggleFaq(faq)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <HelpCircle className="h-4 w-4 text-gray-600" />
                    </div>
                    <h3 className="text-base font-medium text-gray-900">
                      {t(`help.faq.${faq}.question`)}
                    </h3>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${
                    expandedFaq === faq ? 'rotate-90' : ''
                  }`} />
                </button>
                {expandedFaq === faq && (
                  <div className="px-6 pb-6">
                    <div className="ml-12 bg-gray-50 rounded-2xl p-4">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {t(`help.faq.${faq}.answer`)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="mt-8 bg-white rounded-3xl border border-gray-100/50 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-medium text-gray-900">{t('help.contact.title')}</h2>
          <p className="text-gray-600 text-sm mt-1">{t('help.contact.subtitle')}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactOptions.map((option) => (
              <a
                key={option.key}
                href={option.action}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition-all duration-200 group"
              >
                <div className={`w-10 h-10 rounded-xl ${option.color} flex items-center justify-center`}>
                  {option.icon}
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">
                    {t(`help.contact.${option.key}.title`)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t(`help.contact.${option.key}.description`)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors ml-auto" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
"use client"

import { ArrowLeft, HelpCircle, Mail, MessageSquare, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { useState } from "react"

interface HelpCenterPageProps {
  onBack: () => void
}

export function HelpCenterPage({ onBack }: HelpCenterPageProps) {
  const { t } = useTranslation()
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const faqItems = [
    "howToStart",
    "setupCampaign", 
    "trackResults",
    "manageDomains",
    "billingQuestions"
  ]

  const toggleFaq = (faqKey: string) => {
    setExpandedFaq(expandedFaq === faqKey ? null : faqKey)
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      {/* FAQ Section */}
      <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden shadow-sm mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-gray-900">{t('help.faq.title')}</h2>
              <p className="text-gray-600 text-sm">{t('help.faq.subtitle')}</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {faqItems.map((faq) => (
            <div key={faq}>
              <button
                onClick={() => toggleFaq(faq)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 text-left"
              >
                <h3 className="text-base font-medium text-gray-900 flex-1">
                  {t(`help.faq.${faq}.question`)}
                </h3>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ml-4 ${
                  expandedFaq === faq ? 'rotate-180' : ''
                }`} />
              </button>
              {expandedFaq === faq && (
                <div className="px-6 pb-6">
                  <div className="bg-gray-50 rounded-2xl p-4">
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

      {/* Contact Section */}
      <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-gray-900">{t('help.contact.title')}</h2>
              <p className="text-gray-600 text-sm">{t('help.contact.subtitle')}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="mailto:support@leadsup.io"
              className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900">
                  {t('help.contact.email.title')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('help.contact.email.description')}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </a>
            <a
              href="#"
              className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900">
                  {t('help.contact.chat.title')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('help.contact.chat.description')}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
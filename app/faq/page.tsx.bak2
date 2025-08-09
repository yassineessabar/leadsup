"use client"

import { useState } from "react"
import { ChevronDown, Search, MessageCircle, CreditCard, Shield, Zap, Settings, HelpCircle, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const router = useRouter()

  const faqCategories = [
    { id: "all", label: "All Questions", icon: HelpCircle },
    { id: "getting-started", label: "Getting Started", icon: Zap },
    { id: "reviews", label: "Reviews", icon: MessageCircle },
    { id: "billing", label: "Billing & Pricing", icon: CreditCard },
    { id: "integrations", label: "Integrations", icon: Settings },
    { id: "security", label: "Security & Privacy", icon: Shield },
  ]

  const faqs = [
    {
      category: "getting-started",
      question: "How do I get started with Loop Review?",
      answer: "Getting started is easy! First, sign up for an account, then complete the onboarding process where you'll set up your company profile, upload your logo, and configure your review link. After that, you can start sending review requests via email, SMS, or WhatsApp."
    },
    {
      category: "getting-started",
      question: "What platforms can I collect reviews from?",
      answer: "Loop Review supports review collection from multiple platforms including Google Business, Trustpilot, Facebook, and custom review forms. You can also integrate with Shopify for e-commerce reviews."
    },
    {
      category: "getting-started",
      question: "How long does it take to set up Loop Review?",
      answer: "Most users can complete the initial setup in under 10 minutes. This includes creating your account, setting up your review link, and sending your first review request. Additional integrations may take a few more minutes each."
    },
    {
      category: "reviews",
      question: "How do I send review requests?",
      answer: "You can send review requests through multiple channels: Email campaigns with customizable templates, SMS messages with short links, WhatsApp messages for direct communication, or by sharing your unique review link directly. All methods can be automated based on your preferences."
    },
    {
      category: "reviews",
      question: "Can I customize my review request messages?",
      answer: "Yes! Loop Review offers fully customizable templates for all communication channels. You can personalize messages with customer names, purchase details, and your branding. We also support multiple languages and A/B testing for optimization."
    },
    {
      category: "reviews",
      question: "How do I respond to reviews?",
      answer: "For integrated platforms like Google Business, you can respond directly from the Loop Review dashboard. We also offer AI-powered response suggestions to help you craft professional replies quickly. For other platforms, we provide response templates and best practices."
    },
    {
      category: "reviews",
      question: "What is the review link feature?",
      answer: "The review link is a custom URL that directs customers to leave reviews on your preferred platforms. You can customize the appearance, add your logo, and even create QR codes for physical locations. The link works on all devices and tracks conversion rates."
    },
    {
      category: "billing",
      question: "What pricing plans are available?",
      answer: "We offer three plans: Starter (€29/month) for up to 100 reviews/month, Professional (€79/month) for up to 500 reviews/month with advanced features, and Enterprise (€199/month) for unlimited reviews with custom solutions. All plans include core features with varying limits."
    },
    {
      category: "billing",
      question: "Can I change my plan anytime?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll have immediate access to new features. When downgrading, changes take effect at the next billing cycle. No contracts or cancellation fees apply."
    },
    {
      category: "billing",
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express), debit cards, and bank transfers for annual plans. All payments are processed securely through Stripe with PCI compliance."
    },
    {
      category: "billing",
      question: "Is there a free trial?",
      answer: "Yes! We offer a 14-day free trial for new users. No credit card required to start. You'll have access to all Professional plan features during the trial period to fully experience Loop Review's capabilities."
    },
    {
      category: "integrations",
      question: "How do I connect my Google Business account?",
      answer: "In the Integrations tab, click on Google, then search for your business listing. Select your business from the results and confirm the connection. Once connected, reviews will sync automatically and you can respond directly from Loop Review."
    },
    {
      category: "integrations",
      question: "Can I integrate with my CRM or e-commerce platform?",
      answer: "Yes! Loop Review integrates with popular platforms like Shopify, WooCommerce, and various CRMs through our API. We also support webhooks for custom integrations. Check our integrations page for the full list of supported platforms."
    },
    {
      category: "integrations",
      question: "How does WhatsApp integration work?",
      answer: "Our WhatsApp integration uses the WhatsApp Business API to send review requests. You'll need a WhatsApp Business account and phone number. Once configured, you can send personalized messages and track delivery rates."
    },
    {
      category: "security",
      question: "How is my data protected?",
      answer: "We use enterprise-grade security including 256-bit SSL encryption, secure data centers, regular security audits, and GDPR compliance. Your data is never shared with third parties and you maintain full ownership of all customer information."
    },
    {
      category: "security",
      question: "Are you GDPR compliant?",
      answer: "Yes, Loop Review is fully GDPR compliant. We provide data processing agreements, tools for data export and deletion, consent management features, and transparent privacy policies. You can manage all privacy settings from your account."
    },
    {
      category: "security",
      question: "Can I export my data?",
      answer: "Absolutely! You can export all your data including reviews, customer information, analytics, and campaign history in CSV or JSON format. Exports are available on-demand from your account settings."
    },
    {
      category: "getting-started",
      question: "Do you provide customer support?",
      answer: "Yes! We offer multiple support channels: 24/7 chat support for all plans, email support with <4 hour response time, comprehensive documentation and video tutorials, and dedicated account managers for Enterprise customers."
    },
    {
      category: "reviews",
      question: "How can I increase my review response rate?",
      answer: "To improve response rates: Send requests within 24-48 hours of service, personalize messages with customer names, use multiple channels (email + SMS), keep messages short and clear, include direct review links, and follow up with non-responders after 1 week."
    },
    {
      category: "reviews",
      question: "Can I filter or moderate reviews?",
      answer: "While you cannot delete legitimate reviews from platforms like Google, Loop Review helps you manage your reputation by: Alerting you to negative reviews immediately, providing response templates, tracking review trends, and helping you address issues proactively."
    }
  ]

  // Filter FAQs based on search and category
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group FAQs by category
  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = []
    }
    acc[faq.category].push(faq)
    return acc
  }, {} as Record<string, typeof faqs>)

  const getCategoryLabel = (categoryId: string) => {
    return faqCategories.find(cat => cat.id === categoryId)?.label || categoryId
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Find answers to common questions about Loop Review
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for answers..."
                className="pl-12 pr-4 py-6 text-lg border-gray-300 rounded-xl focus:border-[#e66465] focus:ring-[#e66465]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {faqCategories.map((category) => {
            const Icon = category.icon
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                className={selectedCategory === category.id
                  ? "bg-gradient-to-r from-[#e66465] to-[#9198e5] border-0"
                  : ""}
                onClick={() => setSelectedCategory(category.id)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {category.label}
              </Button>
            )
          })}
        </div>

        {/* FAQ Accordion */}
        {Object.keys(groupedFAQs).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedFAQs).map(([category, categoryFaqs]) => (
              <div key={category}>
                {selectedCategory === "all" && (
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    {faqCategories.find(cat => cat.id === category)?.icon && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#e66465] to-[#9198e5] flex items-center justify-center">
                        {(() => {
                          const Icon = faqCategories.find(cat => cat.id === category)?.icon
                          return Icon ? <Icon className="w-4 h-4 text-white" /> : null
                        })()}
                      </div>
                    )}
                    {getCategoryLabel(category)}
                  </h2>
                )}
                <Accordion type="single" collapsible className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {categoryFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`${category}-${index}`} className="border-b last:border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 text-left">
                        <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 py-4 text-gray-600 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No questions found matching your search. Try different keywords or browse all categories.
            </p>
          </div>
        )}

        {/* Still Need Help */}
        <div className="mt-16 bg-gradient-to-r from-[#e66465] to-[#9198e5] rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Can't find what you're looking for?
          </h2>
          <p className="text-white/90 mb-6">
            Our support team is here to help you with any questions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="bg-white text-[#e66465] hover:bg-gray-100"
              size="lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Contact Support
            </Button>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-[#e66465]"
              size="lg"
              onClick={() => window.location.href = '/help'}
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              Visit Help Center
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
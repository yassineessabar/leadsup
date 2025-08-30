"use client"

import { useState } from "react"
import { useI18n } from '@/hooks/use-i18n'
import { Eye, Share2, Filter, ChevronDown, FileText, X, Copy, Mail, Check, Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Template {
  id: string
  title: string
  subtitle: string
  category: string
  tags: string[]
  metrics: {
    openRate: string
    responseRate: string
    conversionRate: string
  }
  content?: string
}

export function TemplatesTab() {
  const { t, ready } = useI18n()
  
  // All state declarations must be before any early returns
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isCampaignSelectOpen, setIsCampaignSelectOpen] = useState(false)
  const [templateToUse, setTemplateToUse] = useState<Template | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [templateToShare, setTemplateToShare] = useState<Template | null>(null)
  const [shareSuccess, setShareSuccess] = useState(false)
  
  if (!ready) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>
  }

  const templates: Template[] = [
    {
      id: "1",
      title: t('emailTemplates.firstSaasOutreach.title'),
      subtitle: t('emailTemplates.firstSaasOutreach.subtitle'),
      category: t('templates.community'),
      tags: ["cold_outreach", "SaaS"],
      metrics: {
        openRate: "45.2%",
        responseRate: "8.3%",
        conversionRate: "2.1%"
      },
      content: `Subject: ${t('emailTemplates.firstSaasOutreach.subject')}

${t('emailTemplates.firstSaasOutreach.content')}`
    },
    {
      id: "2", 
      title: t('emailTemplates.warmFollowUp.title'),
      subtitle: t('emailTemplates.warmFollowUp.subtitle'),
      category: t('templates.community'),
      tags: ["follow_up", "All sectors"],
      metrics: {
        openRate: "52.7%",
        responseRate: "12.1%",
        conversionRate: "4.2%"
      },
      content: `Subject: ${t('emailTemplates.warmFollowUp.subject')}

${t('emailTemplates.warmFollowUp.content')}`
    },
    {
      id: "3",
      title: t('emailTemplates.productDemo.title'),
      subtitle: t('emailTemplates.productDemo.subtitle'),
      category: t('templates.premium'),
      tags: ["demo", "SaaS", "B2B"],
      metrics: {
        openRate: "38.9%",
        responseRate: "6.7%",
        conversionRate: "3.1%"
      },
      content: `Subject: ${t('emailTemplates.productDemo.subject')}

${t('emailTemplates.productDemo.content')}`
    },
    {
      id: "4",
      title: t('emailTemplates.reEngagement.title'),
      subtitle: t('emailTemplates.reEngagement.subtitle'),
      category: t('templates.community'),
      tags: ["re_engagement", "All sectors"],
      metrics: {
        openRate: "29.4%",
        responseRate: "4.8%",
        conversionRate: "1.8%"
      },
      content: `Subject: ${t('emailTemplates.reEngagement.subject')}

${t('emailTemplates.reEngagement.content')}`
    },
    {
      id: "5",
      title: t('emailTemplates.partnershipProposal.title'),
      subtitle: t('emailTemplates.partnershipProposal.subtitle'),
      category: t('templates.premium'),
      tags: ["partnership", "B2B", "growth"],
      metrics: {
        openRate: "41.3%",
        responseRate: "7.2%",
        conversionRate: "2.9%"
      },
      content: `Subject: ${t('emailTemplates.partnershipProposal.subject')}

${t('emailTemplates.partnershipProposal.content')}`
    },
    {
      id: "6",
      title: t('emailTemplates.eventInvitation.title'),
      subtitle: t('emailTemplates.eventInvitation.subtitle'),
      category: t('templates.community'),
      tags: ["event", "networking", "invite"],
      metrics: {
        openRate: "47.8%",
        responseRate: "9.4%",
        conversionRate: "3.6%"
      },
      content: `Subject: ${t('emailTemplates.eventInvitation.subject')}

${t('emailTemplates.eventInvitation.content')}`
    }
  ]

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(template => template.category.toLowerCase() === selectedCategory.toLowerCase())

  const handleViewTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(template)
      setIsPreviewOpen(true)
    }
  }

  const handleUseTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setTemplateToUse(template)
      setLoadingCampaigns(true)
      setIsCampaignSelectOpen(true)
      
      // Fetch user's campaigns
      try {
        const response = await fetch('/api/campaigns', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          console.log('Campaigns API response:', data) // Debug log
          
          // Handle different possible response structures
          const campaignsData = data.data || data.campaigns || data || []
          setCampaigns(Array.isArray(campaignsData) ? campaignsData : [])
        } else {
          console.error('Failed to fetch campaigns:', response.status)
          setCampaigns([])
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error)
        setCampaigns([])
      } finally {
        setLoadingCampaigns(false)
      }
    }
  }

  const handleAddToCampaign = async (campaignId: string) => {
    if (!templateToUse) return

    // Copy template content to clipboard
    const templateContent = templateToUse.content || `Subject: ${templateToUse.title}

${templateToUse.subtitle}

Hi {{firstName}},

[Template content for ${templateToUse.title}]

Best regards,
{{senderName}}`

    try {
      await navigator.clipboard.writeText(templateContent)
      
      // Show success message with instructions
      const event = new CustomEvent('template-copied', {
        detail: {
          templateTitle: templateToUse.title,
          campaignId: campaignId,
          message: `Template "${templateToUse.title}" copied to clipboard! You can now paste it in your campaign sequence.`
        }
      })
      window.dispatchEvent(event)
      
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = templateContent
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    // Close modal
    setIsCampaignSelectOpen(false)
    setTemplateToUse(null)

    // Redirect to campaign sequences section
    window.location.href = `/?tab=campaigns-email&campaignId=${campaignId}&subtab=sequence`
  }

  const handleShareTemplate = (template?: Template) => {
    const templateToShareData = template || filteredTemplates[0] // Share first template if none specified
    setTemplateToShare(templateToShareData)
    setIsShareModalOpen(true)
    setShareSuccess(false)
  }

  const copyTemplateLink = async () => {
    if (!templateToShare) return
    
    const shareUrl = `${window.location.origin}/?tab=templates&template=${templateToShare.id}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000)
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000)
    }
  }

  const shareViaEmail = () => {
    if (!templateToShare) return
    
    const subject = `Check out this email template: ${templateToShare.title}`
    const body = `Hi there!

I wanted to share this amazing email template with you:

"${templateToShare.title}"
${templateToShare.subtitle}

This template has achieved:
- ${templateToShare.metrics.openRate} open rate
- ${templateToShare.metrics.responseRate} response rate
- ${templateToShare.metrics.conversionRate} conversion rate

You can view and use it here: ${window.location.origin}/?tab=templates&template=${templateToShare.id}

Best regards!`

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink)
  }

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-light text-gray-900 dark:text-gray-100 tracking-tight mb-2">
                {t('templates.templateLibrary')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-light">
                {t('templates.browseAndUse')}
              </p>
            </div>
            
            <div className="flex gap-3">
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('templates.allCategories')} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-200 dark:border-gray-700">
                  <SelectItem value="all">{t('templates.allCategories')}</SelectItem>
                  <SelectItem value="community">{t('templates.community')}</SelectItem>
                  <SelectItem value="premium">{t('templates.premium')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 border border-gray-100/50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer group"
            >
              <div className="p-8">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                      {template.title}
                    </h3>
                    <Badge 
                      variant="outline"
                      className={`${
                        template.category === 'Premium' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      } border rounded-full px-2 py-1 text-xs`}
                    >
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{template.subtitle}</p>
                </div>

                {/* Single Key Metric */}
                <div className="mb-6 text-center">
                  <p className="text-2xl font-light text-gray-900 dark:text-gray-100">{template.metrics.openRate}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('campaigns.openRate')}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 rounded-2xl"
                    onClick={() => handleViewTemplate(template.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('templates.view')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 rounded-2xl"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    {t('templates.useTemplate')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 rounded-2xl">
                    onClick={() => handleShareTemplate(template)}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">{t('templates.noTemplatesFound')}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-light">{t('templates.tryAdjustingFilters')}</p>
            <Button 
              variant="outline"
              onClick={() => setSelectedCategory("all")}
              className="border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 font-medium transition-all duration-300 rounded-2xl">
            >
              {t('templates.showAllTemplates')}
            </Button>
          </div>
        )}

        {/* Template Preview Modal */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-light text-gray-900 dark:text-gray-100 tracking-tight">
                {selectedTemplate?.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline"
                  className={`${
                    selectedTemplate?.category === 'Premium' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  } border rounded-full px-2 py-1 text-xs`}
                >
                  {selectedTemplate?.category}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedTemplate?.subtitle}</span>
              </div>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="space-y-6">
                {/* Template Content */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{t('templates.emailTemplate')}</h3>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-normal leading-relaxed">
                    {selectedTemplate.content || t('templates.noContentAvailable')}
                  </pre>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-xl font-light text-gray-900 dark:text-gray-100">{selectedTemplate.metrics.openRate}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('campaigns.openRate')}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-xl font-light text-gray-900 dark:text-gray-100">{selectedTemplate.metrics.responseRate}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('campaigns.responseRate')}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-xl font-light text-gray-900 dark:text-gray-100">{selectedTemplate.metrics.conversionRate}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('campaigns.conversionRate')}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => setIsPreviewOpen(false)}
                    className="flex-1 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-all duration-300 rounded-2xl"
                  >
                    {t('button.close')}
                  </Button>
                  <Button
                    onClick={() => {
                      handleUseTemplate(selectedTemplate.id)
                      setIsPreviewOpen(false)
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium transition-all duration-300 rounded-2xl"
                  >
                    {t('templates.useThisTemplate')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Campaign Selection Modal */}
        <Dialog open={isCampaignSelectOpen} onOpenChange={setIsCampaignSelectOpen}>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-light text-gray-900 dark:text-gray-100 tracking-tight">
                {t('templates.useTemplateInCampaign')}
              </DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t('templates.selectCampaignToCopy', { title: templateToUse?.title })}
              </p>
            </DialogHeader>
            
            {/* Instructions */}
            <div className="bg-blue-50/50 dark:bg-gray-800 border border-blue-100/50 dark:border-gray-700 rounded-2xl p-4 my-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm flex items-center">
                <Copy className="w-4 h-4 text-blue-600 mr-2" />
                {t('templates.howItWorks')}
              </h4>
              <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                <li>{t('templates.selectCampaignBelow')}</li>
                <li>{t('templates.contentCopiedToClipboard')}</li>
                <li>{t('templates.redirectToSequenceEditor')}</li>
                <li>{t('templates.pasteContentIntoSequence')}</li>
              </ol>
            </div>
            
            <div className="space-y-4">
              {loadingCampaigns ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-2xl animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : campaigns.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-gray-800 rounded-2xl cursor-pointer transition-all duration-200 group"
                      onClick={() => handleAddToCampaign(campaign.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{campaign.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {campaign.status} • {campaign.type || 'Email Campaign'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {campaign.status}
                          </Badge>
                          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">{t('templates.noCampaignsFound')}</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setLoadingCampaigns(true)
                        // Retry fetching campaigns
                        try {
                          const response = await fetch('/api/campaigns', {
                            credentials: 'include'
                          })
                          if (response.ok) {
                            const data = await response.json()
                            console.log('Retry campaigns API response:', data)
                            const campaignsData = data.data || data.campaigns || data || []
                            setCampaigns(Array.isArray(campaignsData) ? campaignsData : [])
                          }
                        } catch (error) {
                          console.error('Error retrying campaigns:', error)
                        } finally {
                          setLoadingCampaigns(false)
                        }
                      }}
                      disabled={loadingCampaigns}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-2xl"
                    >
                      {loadingCampaigns ? t('common.loading') : t('templates.refreshCampaigns')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCampaignSelectOpen(false)
                        setTemplateToUse(null)
                        // Navigate to campaigns tab to create new campaign
                        window.location.href = '/?tab=campaigns-email'
                      }}
                      className="border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl"
                    >
                      {t('templates.createNewCampaign')}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setIsCampaignSelectOpen(false)}
                  className="flex-1 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl"
                >
                  {t('button.cancel')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Template Modal */}
        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
          <DialogContent className="max-w-md rounded-3xl border border-gray-100/20 dark:border-gray-800">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-center text-2xl font-light text-gray-900 dark:text-gray-100 tracking-tight">
                {t('templates.shareTemplate')}
              </DialogTitle>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-2">
                {t('templates.shareTemplateWith', { title: templateToShare?.title })}
              </p>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Template Preview */}
              <div className="bg-gray-50/50 dark:bg-gray-800 border border-gray-100/50 dark:border-gray-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{templateToShare?.title}</h4>
                  <Badge 
                    variant="outline"
                    className={`${
                      templateToShare?.category === 'Premium' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    } border rounded-full px-2 py-1 text-xs`}
                  >
                    {templateToShare?.category}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{templateToShare?.subtitle}</p>
                <div className="flex justify-center gap-4 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{templateToShare?.metrics.openRate} open rate</span>
                  <span className="text-gray-600 dark:text-gray-400">{templateToShare?.metrics.responseRate} response rate</span>
                </div>
              </div>

              {/* Share Options */}
              <div className="space-y-3">
                <Button
                  onClick={copyTemplateLink}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                >
                  {shareSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t('templates.linkCopied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {t('templates.copyShareLink')}
                    </>
                  )}
                </Button>

                <Button
                  onClick={shareViaEmail}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl px-6 py-3 font-medium transition-all duration-200"
                >
                  <Mail className="w-4 h-4" />
                  {t('templates.shareViaEmail')}
                </Button>
              </div>

              {/* Share URL Display */}
              <div className="bg-gray-50/50 dark:bg-gray-800 border border-gray-100/50 dark:border-gray-700 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Link className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('templates.shareURL')}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                  {window.location.origin}/?tab=templates&template={templateToShare?.id}
                </p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-100/50 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsShareModalOpen(false)}
                className="w-full border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl px-6 py-3 font-medium"
              >
                {t('button.close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
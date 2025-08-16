"use client"

import { useState } from "react"
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

  const templates: Template[] = [
    {
      id: "1",
      title: "First SaaS Outreach",
      subtitle: "Boost your conversions by 35% in 30 days",
      category: "Community",
      tags: ["cold_outreach", "SaaS"],
      metrics: {
        openRate: "45.2%",
        responseRate: "8.3%",
        conversionRate: "2.1%"
      },
      content: `Subject: Quick question about {{company}}'s growth goals

Hi {{firstName}},

I noticed {{company}} has been expanding rapidly in the {{industry}} space. Congratulations on the recent growth!

I'm reaching out because we've helped similar companies like yours boost their conversion rates by 35% in just 30 days using our automated outreach platform.

Would you be interested in a quick 15-minute call to see how this could work for {{company}}?

Best regards,
{{senderName}}

P.S. Here's a case study showing how we helped [Similar Company] achieve similar results: [link]`
    },
    {
      id: "2", 
      title: "Warm Follow-up",
      subtitle: "Re: Our conversation about {{company}}",
      category: "Community",
      tags: ["follow_up", "All sectors"],
      metrics: {
        openRate: "52.7%",
        responseRate: "12.1%",
        conversionRate: "4.2%"
      },
      content: `Subject: Re: Our conversation about {{company}}

Hi {{firstName}},

I wanted to follow up on our conversation last week about {{company}}'s challenges with lead generation.

Since we spoke, I've been thinking about how our platform could specifically help with the issues you mentioned around qualifying leads and improving response rates.

I'd love to show you a quick demo of exactly how this would work for your team. Are you available for a brief call this week?

Looking forward to continuing our conversation.

Best,
{{senderName}}`
    },
    {
      id: "3",
      title: "Product Demo Request",
      subtitle: "Quick 15-min demo for {{company}}",
      category: "Premium",
      tags: ["demo", "SaaS", "B2B"],
      metrics: {
        openRate: "38.9%",
        responseRate: "6.7%",
        conversionRate: "3.1%"
      },
      content: `Subject: Quick 15-min demo for {{company}}?

Hi {{firstName}},

I've been researching {{company}} and I'm impressed by your approach to {{industry}}.

I'd love to show you how companies like yours are using our platform to streamline their outreach process and increase qualified leads by 40%.

Would you be open to a quick 15-minute demo this week? I can show you:
• How to automate your lead qualification process
• Ways to personalize outreach at scale
• Real results from similar companies in your space

What does your calendar look like?

Best,
{{senderName}}`
    },
    {
      id: "4",
      title: "Re-engagement Sequence",
      subtitle: "Haven't heard from you in a while...",
      category: "Community",
      tags: ["re_engagement", "All sectors"],
      metrics: {
        openRate: "29.4%",
        responseRate: "4.8%",
        conversionRate: "1.8%"
      }
    },
    {
      id: "5",
      title: "Partnership Proposal",
      subtitle: "Strategic partnership opportunity",
      category: "Premium",
      tags: ["partnership", "B2B", "growth"],
      metrics: {
        openRate: "41.3%",
        responseRate: "7.2%",
        conversionRate: "2.9%"
      }
    },
    {
      id: "6",
      title: "Event Invitation",
      subtitle: "Exclusive invite to {{eventName}}",
      category: "Community",
      tags: ["event", "networking", "invite"],
      metrics: {
        openRate: "47.8%",
        responseRate: "9.4%",
        conversionRate: "3.6%"
      }
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
    <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">
                Template Library
              </h1>
              <p className="text-gray-500 font-light">
                Browse and use proven email templates that convert
              </p>
            </div>
            
            <div className="flex gap-3">
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 h-10 bg-white border-gray-200 rounded-2xl">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-200">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
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
              className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer group"
            >
              <div className="p-8">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
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
                  <p className="text-sm text-gray-500">{template.subtitle}</p>
                </div>

                {/* Single Key Metric */}
                <div className="mb-6 text-center">
                  <p className="text-2xl font-light text-gray-900">{template.metrics.openRate}</p>
                  <p className="text-xs text-gray-500 mt-1">Open Rate</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-300 rounded-2xl"
                    onClick={() => handleViewTemplate(template.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-300 rounded-2xl"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    Use Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-300 rounded-2xl"
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
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-8 font-light">Try adjusting your filters to see more templates</p>
            <Button 
              variant="outline"
              onClick={() => setSelectedCategory("all")}
              className="border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 font-medium transition-all duration-300 rounded-2xl"
            >
              Show All Templates
            </Button>
          </div>
        )}

        {/* Template Preview Modal */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-light text-gray-900 tracking-tight">
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
                <span className="text-sm text-gray-500">{selectedTemplate?.subtitle}</span>
              </div>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="space-y-6">
                {/* Template Content */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Email Template</h3>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-normal leading-relaxed">
                    {selectedTemplate.content || 'No content available for this template.'}
                  </pre>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-2xl">
                    <p className="text-xl font-light text-gray-900">{selectedTemplate.metrics.openRate}</p>
                    <p className="text-xs text-gray-500 mt-1">Open Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-2xl">
                    <p className="text-xl font-light text-gray-900">{selectedTemplate.metrics.responseRate}</p>
                    <p className="text-xs text-gray-500 mt-1">Response Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-2xl">
                    <p className="text-xl font-light text-gray-900">{selectedTemplate.metrics.conversionRate}</p>
                    <p className="text-xs text-gray-500 mt-1">Conversion Rate</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setIsPreviewOpen(false)}
                    className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-300 rounded-2xl"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      handleUseTemplate(selectedTemplate.id)
                      setIsPreviewOpen(false)
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium transition-all duration-300 rounded-2xl"
                  >
                    Use This Template
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
              <DialogTitle className="text-xl font-light text-gray-900 tracking-tight">
                Use Template in Campaign
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                Select a campaign to copy "{templateToUse?.title}" content to your clipboard
              </p>
            </DialogHeader>
            
            {/* Instructions */}
            <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 my-4">
              <h4 className="font-medium text-gray-900 mb-2 text-sm flex items-center">
                <Copy className="w-4 h-4 text-blue-600 mr-2" />
                How it works
              </h4>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Select your campaign below</li>
                <li>Template content will be copied to your clipboard</li>
                <li>You'll be redirected to the campaign's sequence editor</li>
                <li>Paste the template content into your email sequence</li>
              </ol>
            </div>
            
            <div className="space-y-4">
              {loadingCampaigns ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border border-gray-200 rounded-2xl animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : campaigns.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-4 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-2xl cursor-pointer transition-all duration-200 group"
                      onClick={() => handleAddToCampaign(campaign.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                          <p className="text-sm text-gray-500">
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
                  <p className="text-gray-500 mb-4">No campaigns found</p>
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
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-2xl"
                    >
                      {loadingCampaigns ? 'Loading...' : 'Refresh Campaigns'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCampaignSelectOpen(false)
                        setTemplateToUse(null)
                        // Navigate to campaigns tab to create new campaign
                        window.location.href = '/?tab=campaigns-email'
                      }}
                      className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl"
                    >
                      Create New Campaign
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setIsCampaignSelectOpen(false)}
                  className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Template Modal */}
        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
          <DialogContent className="max-w-md rounded-3xl border border-gray-100/20">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-center text-2xl font-light text-gray-900 tracking-tight">
                Share Template
              </DialogTitle>
              <p className="text-center text-gray-500 text-sm mt-2">
                Share "{templateToShare?.title}" with others
              </p>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Template Preview */}
              <div className="bg-gray-50/50 border border-gray-100/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{templateToShare?.title}</h4>
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
                <p className="text-sm text-gray-500 mb-3">{templateToShare?.subtitle}</p>
                <div className="flex justify-center gap-4 text-xs">
                  <span className="text-gray-600">{templateToShare?.metrics.openRate} open rate</span>
                  <span className="text-gray-600">{templateToShare?.metrics.responseRate} response rate</span>
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
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Share Link
                    </>
                  )}
                </Button>

                <Button
                  onClick={shareViaEmail}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl px-6 py-3 font-medium transition-all duration-200"
                >
                  <Mail className="w-4 h-4" />
                  Share via Email
                </Button>
              </div>

              {/* Share URL Display */}
              <div className="bg-gray-50/50 border border-gray-100/50 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Link className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">Share URL</span>
                </div>
                <p className="text-xs text-gray-500 break-all">
                  {window.location.origin}/?tab=templates&template={templateToShare?.id}
                </p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-100/50">
              <Button
                variant="outline"
                onClick={() => setIsShareModalOpen(false)}
                className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl px-6 py-3 font-medium"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
"use client"

import { useState } from "react"
import { Eye, Share2, Filter, ChevronDown, FileText, X } from "lucide-react"
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
          setCampaigns(data.campaigns || [])
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error)
        setCampaigns([])
      } finally {
        setLoadingCampaigns(false)
      }
    }
  }

  const handleAddToCampaign = (campaignId: string) => {
    console.log('Adding template', templateToUse?.id, 'to campaign', campaignId)
    // TODO: Implement actual template addition to campaign
    setIsCampaignSelectOpen(false)
    setTemplateToUse(null)
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
              
              {/* Share Template Button */}
              <Button 
                variant="outline" 
                className="border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Template
              </Button>
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
          <DialogContent className="max-w-4xl max-h-[20vh] overflow-y-auto rounded-3xl">
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
          <DialogContent className="max-w-md max-h-[60vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-light text-gray-900 tracking-tight">
                Add Template to Campaign
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                Select which campaign to add "{templateToUse?.title}" to
              </p>
            </DialogHeader>
            
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
                      className="p-4 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-2xl cursor-pointer transition-all duration-200"
                      onClick={() => handleAddToCampaign(campaign.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                          <p className="text-sm text-gray-500">
                            {campaign.status} • {campaign.type || 'Email Campaign'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-4">No campaigns found</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCampaignSelectOpen(false)
                      // TODO: Navigate to create campaign
                    }}
                    className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl"
                  >
                    Create New Campaign
                  </Button>
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
      </div>
    </div>
  )
}
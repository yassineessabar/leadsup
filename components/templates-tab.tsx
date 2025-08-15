"use client"

import { useState } from "react"
import { Eye, Share2, Filter, ChevronDown, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
}

export function TemplatesTab() {
  const [selectedCategory, setSelectedCategory] = useState("all")

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
      }
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
      }
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
      }
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
    console.log("View template:", templateId)
    // TODO: Implement template preview modal
  }

  const handleUseTemplate = (templateId: string) => {
    console.log("Use template:", templateId)
    // TODO: Implement template usage (redirect to campaign creation with template)
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Template Library
            </h1>
            <p className="text-slate-600 text-lg">
              Browse email templates that convert.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px] bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Share Template Button */}
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Share2 className="w-4 h-4 mr-2" />
              Share Template
            </Button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 flex flex-col text-card-foreground shadow-sm"
            >
              {/* Header */}
              <div className="flex flex-col space-y-1.5 p-6">
                <div className="flex justify-between items-start">
                  <h3 className="tracking-tight text-lg font-bold text-slate-900">
                    {template.title}
                  </h3>
                  <Badge 
                    className={`${
                      template.category === 'Premium' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-purple-100 text-purple-700'
                    } border-transparent hover:bg-secondary/80`}
                  >
                    {template.category}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
                  {template.subtitle}
                </p>
              </div>

              {/* Content */}
              <div className="p-6 pt-0 flex-grow space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="font-semibold">{template.metrics.openRate}</p>
                    <p className="text-slate-500">Open Rate</p>
                  </div>
                  <div>
                    <p className="font-semibold">{template.metrics.responseRate}</p>
                    <p className="text-slate-500">Response</p>
                  </div>
                  <div>
                    <p className="font-semibold">{template.metrics.conversionRate}</p>
                    <p className="text-slate-500">Conversion</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-slate-200/60 flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewTemplate(template.id)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleUseTemplate(template.id)}
                >
                  Use Template
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters to see more templates</p>
            <Button onClick={() => setSelectedCategory("all")}>
              Show All Templates
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
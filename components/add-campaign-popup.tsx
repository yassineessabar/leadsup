"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, ChevronRight, MessageSquare, X, Globe, Search, BarChart3, MapPin, Tag, FolderOpen, Send, Users, Brain, Target, Filter, ExternalLink, FileText, ChevronLeft, Edit, Save, XCircle, Eye } from 'lucide-react'

interface AddCampaignPopupProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (campaignData: any) => void
}

const steps = [
  { id: "company", label: "Company name", completed: false },
  { id: "icps-personas", label: "ICPs & Personas", completed: false },
  { id: "pain-value", label: "Pain points & Value props", completed: false },
  { id: "sequence", label: "Sequence review", completed: false },
]

const processingSteps = {
  company: [
    { icon: Search, text: "Defining search strategy", completed: false },
    { icon: Globe, text: "Searching official website and other sources", completed: false },
    { icon: BarChart3, text: "Analyzing content", completed: false },
    { icon: MapPin, text: "Identifying company mission and key offerings", completed: false },
    { icon: Tag, text: "Extracting industry and sector tags", completed: false },
    { icon: FolderOpen, text: "Compiling company profile summary", completed: false },
  ],
  "icps-personas": [
    { icon: FileText, text: "Analyzing company activity", completed: false },
    { icon: Search, text: "Searching ICPs", completed: false },
    { icon: Target, text: "Segmenting results", completed: false },
    { icon: Users, text: "Identifying high-potential ICPs", completed: false },
    { icon: Brain, text: "Identifying personas and motivations", completed: false },
    { icon: Filter, text: "Refining ICPs and personas", completed: false },
    { icon: FolderOpen, text: "Compiling profiles", completed: false },
    { icon: Send, text: "Presenting results", completed: false },
  ],
  "pain-value": [
    { icon: Users, text: "Analyzing persona profiles and behaviors", completed: false },
    { icon: MapPin, text: "Mapping pain points and business needs", completed: false },
    { icon: Target, text: "Refining pain points", completed: false },
    { icon: Brain, text: "Generating value propositions", completed: false },
    { icon: Filter, text: "Matching solutions to pain points", completed: false },
    { icon: FolderOpen, text: "Compiling insights", completed: false },
    { icon: Send, text: "Presenting recommendations", completed: false },
  ],
  sequence: [
    { icon: Search, text: "Searching information on leads", completed: false },
    { icon: BarChart3, text: "Analyzing content", completed: false },
    { icon: FileText, text: "Crafting icebreakers", completed: false },
    { icon: Target, text: "Generating messages", completed: false },
    { icon: FolderOpen, text: "Reviewing sequence", completed: false },
    { icon: Send, text: "Presenting sequence", completed: false },
  ]
}

const sampleICPs = [
  {
    id: 1,
    title: "Advertising Agencies - Hyperlocal Campaigns",
    description: "Agencies focused on innovative advertising solutions need dynamic platforms to enhance campaign reach and engagement. Uboard's targeted, location-based advertising on rideshare vehicles offers a unique channel to deliver impactful campaigns and measure effectiveness through advanced analytics.",
    targetDescription: "Advertising agency specializing in creating and managing advertising campaigns for clients across various industries.",
    companySize: "11-50"
  }
]

const samplePersonas = [
  {
    id: 1,
    title: "Digital Advertising Manager",
    description: "Responsible for planning, executing, and optimizing digital advertising campaigns. This includes identifying target audiences, selecting appropriate channels and platforms, negotiating ad placements, and monitoring campaign performance. They analyze data to improve ROI and ensure campaigns align with overall marketing objectives. They are also responsible for staying up-to-date with the latest trends and technologies in digital advertising.",
    equivalentTitles: "Digital Marketing Manager, Campaign Manager, Advertising Specialist"
  }
]

const samplePainPoints = [
  {
    id: 1,
    title: "Inaccurate campaign effectiveness measurement",
    description: "Difficulty in accurately measuring the effectiveness of advertising campaigns due to reliance on traditional metrics, leading to uncertainty in budget allocation decisions and reduced client satisfaction."
  }
]

const sampleValuePropositions = [
  {
    id: 1,
    title: "Precise campaign performance insights",
    subtitle: "Pain point: Inaccurate campaign effectiveness measurement",
    description: "Advanced measurement techniques, such as collecting device IDs and comparing them with control groups, provide precise insights into campaign effectiveness, enabling data-driven budget allocation decisions."
  }
]

const sampleLeads = [
  {
    id: 1,
    name: "Jessica Elmes",
    title: "Digital Marketing Manager",
    company: "Insight Social Media",
    location: "Australia",
    avatar: "/placeholder.svg?height=40&width=40&text=JE"
  },
  {
    id: 2,
    name: "Nerieda Keenan",
    title: "Digital Marketing Specialist", 
    company: "Born Social",
    location: "Australia",
    avatar: "/placeholder.svg?height=40&width=40&text=NK"
  },
  {
    id: 3,
    name: "Craig Bartlett",
    title: "Digital Advertising Specialist/Google Coach",
    company: "Sensis",
    location: "Australia", 
    avatar: "/placeholder.svg?height=40&width=40&text=CB"
  },
  {
    id: 4,
    name: "Dheeraj Kodamanchili",
    title: "Senior Digital Advertising Specialist",
    company: "ADME Advertising",
    location: "Australia",
    avatar: "/placeholder.svg?height=40&width=40&text=DK"
  }
]

const outreachStrategies = [
  {
    id: "email",
    title: "Email only",
    description: "Ideal for maximizing prospecting volume with automated email sequences. Best for reaching large audiences efficiently.",
    icon: "📧",
    features: ["High volume", "Cost effective", "Automated sequences"]
  }
  // LinkedIn and Multi-Channel options temporarily hidden
]

export default function AddCampaignPopup({ isOpen, onClose, onComplete }: AddCampaignPopupProps) {
  const [currentStep, setCurrentStep] = useState("company")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [formData, setFormData] = useState({
    campaignName: "",
    companyName: "",
    website: "",
    noWebsite: false,
    language: "",
    keywords: [] as string[],
    mainActivity: "Uboard is a company specializing in revolutionizing car advertising through the deployment of smart rooftop screens on rideshare vehicles. Their technology enhances ad visibility by displaying targeted advertisements at optimal moments and locations, leveraging a proprietary targeting algorithm that considers the vehicle's exact location and time to ensure ads are shown when and where they are most effective. Their rooftop screens measure 37.8 inches wide by 12.6 inches tall and support various media formats including MP4, MOV, GIF, PNG, JPG, and HEIC, displaying 6–8 second full-motion creatives with auto-brightness for visibility even under direct sunlight. Uboard offers programmatic advertising capabilities, dashboard reporting, and ads are shown on both sides of the screen for maximum exposure.\n\nThe company has demonstrated advanced measurement techniques by collecting device IDs of users within viewing distance during ad play and comparing them with control groups to evaluate campaign effectiveness. They have executed hyper-targeted campaigns in specific urban neighborhoods such as Manhattan and",
    location: "Australia"
  })
  const [selectedICP, setSelectedICP] = useState(1)
  const [selectedPersona, setSelectedPersona] = useState(1)
  const [selectedPainPoint, setSelectedPainPoint] = useState(1)
  const [selectedOutreachStrategy, setSelectedOutreachStrategy] = useState("email")
  const [processingStepIndex, setProcessingStepIndex] = useState(0)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState({ title: "", content: "" })

  // Auto-generate campaign name when company name changes
  useEffect(() => {
    if (formData.companyName && !formData.campaignName) {
      setFormData(prev => ({
        ...prev,
        campaignName: `${formData.companyName} - Outreach Campaign`
      }))
    }
  }, [formData.companyName, formData.campaignName])
  const [editingICP, setEditingICP] = useState(false)
  const [editingPersona, setEditingPersona] = useState(false)
  const [editingPainPoint, setEditingPainPoint] = useState(false)
  const [editingValueProp, setEditingValueProp] = useState(false)
  const [editedData, setEditedData] = useState({
    icp: { ...sampleICPs.find(icp => icp.id === selectedICP) },
    persona: { ...samplePersonas.find(persona => persona.id === selectedPersona) },
    painPoint: { ...samplePainPoints.find(pp => pp.id === selectedPainPoint) },
    valueProp: { ...sampleValuePropositions[0] }
  })

  const getProgressPercentage = () => {
    const totalSteps = steps.length
    const currentStepIndex = steps.findIndex(step => step.id === currentStep)
    const completedCount = completedSteps.length
    
    return Math.round(((completedCount + (isProcessing ? 0.5 : 0)) / totalSteps) * 100)
  }

  const handleStepClick = (stepId: string) => {
    if (completedSteps.includes(stepId) || stepId === "company") {
      setCurrentStep(stepId)
      setIsProcessing(false)
      setShowForm(stepId === "company")
      setEditingICP(false)
      setEditingPersona(false)
      setEditingPainPoint(false)
      setEditingValueProp(false)
    }
  }

  const handleSave = (type: 'icp' | 'persona' | 'painPoint' | 'valueProp') => {
    switch(type) {
      case 'icp':
        setEditingICP(false)
        break
      case 'persona':
        setEditingPersona(false)
        break
      case 'painPoint':
        setEditingPainPoint(false)
        break
      case 'valueProp':
        setEditingValueProp(false)
        break
    }
  }

  const handleCancel = (type: 'icp' | 'persona' | 'painPoint' | 'valueProp') => {
    switch(type) {
      case 'icp':
        setEditedData(prev => ({ ...prev, icp: { ...sampleICPs.find(icp => icp.id === selectedICP) } }))
        setEditingICP(false)
        break
      case 'persona':
        setEditedData(prev => ({ ...prev, persona: { ...samplePersonas.find(persona => persona.id === selectedPersona) } }))
        setEditingPersona(false)
        break
      case 'painPoint':
        setEditedData(prev => ({ ...prev, painPoint: { ...samplePainPoints.find(pp => pp.id === selectedPainPoint) } }))
        setEditingPainPoint(false)
        break
      case 'valueProp':
        setEditedData(prev => ({ ...prev, valueProp: { ...sampleValuePropositions[0] } }))
        setEditingValueProp(false)
        break
    }
  }

  const [newKeyword, setNewKeyword] = useState("")

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        keywords: [...prev.keywords, newKeyword.trim()] 
      }))
      setNewKeyword("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      keywords: prev.keywords.filter(keyword => keyword !== keywordToRemove) 
    }))
  }

  const handleContinue = () => {
    const stepOrder = ["company", "icps-personas", "pain-value", "sequence"]
    const currentIndex = stepOrder.indexOf(currentStep)
    
    if (currentStep === "company" && showForm) {
      setShowForm(false)
      setIsProcessing(true)
      setProcessingStepIndex(0)
      
      const companySteps = processingSteps.company
      let stepIndex = 0
      const stepInterval = setInterval(() => {
        setProcessingStepIndex(stepIndex)
        stepIndex++
        if (stepIndex >= companySteps.length) {
          clearInterval(stepInterval)
          setTimeout(() => {
            setIsProcessing(false)
            setCompletedSteps(prev => [...prev, "company"])
            setCurrentStep("icps-personas")
            setIsProcessing(true)
            setProcessingStepIndex(0)
            
            const icpSteps = processingSteps["icps-personas"]
            let icpStepIndex = 0
            const icpInterval = setInterval(() => {
              setProcessingStepIndex(icpStepIndex)
              icpStepIndex++
              if (icpStepIndex >= icpSteps.length) {
                clearInterval(icpInterval)
                setTimeout(() => {
                  setIsProcessing(false)
                }, 500)
              }
            }, 500)
          }, 1000)
        }
      }, 400)
    } else if (!isProcessing && currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1]
      setCompletedSteps(prev => [...prev, currentStep])
      setCurrentStep(nextStep)
      setEditingICP(false)
      setEditingPersona(false)
      setEditingPainPoint(false)
      setEditingValueProp(false)
      
      if (["icps-personas", "pain-value", "sequence"].includes(nextStep)) {
        setIsProcessing(true)
        setProcessingStepIndex(0)
        
        const steps = processingSteps[nextStep as keyof typeof processingSteps]
        if (steps) {
          let stepIndex = 0
          const stepInterval = setInterval(() => {
            setProcessingStepIndex(stepIndex)
            stepIndex++
            if (stepIndex >= steps.length) {
              clearInterval(stepInterval)
              setTimeout(() => {
                setIsProcessing(false)
              }, 500)
            }
          }, 500)
        }
      }
    } else if (currentStep === "sequence") {
      // Final step - complete the campaign creation
      const campaignData = {
        formData,
        selectedICP: sampleICPs.find(icp => icp.id === selectedICP),
        selectedPersona: samplePersonas.find(persona => persona.id === selectedPersona),
        selectedPainPoint: samplePainPoints.find(pp => pp.id === selectedPainPoint),
        selectedOutreachStrategy,
        completedSteps: [...completedSteps, currentStep]
      }
      onComplete(campaignData)
    }
  }

  const handleBack = () => {
    const stepOrder = ["company", "icps-personas", "pain-value", "sequence"]
    const currentIndex = stepOrder.indexOf(currentStep)
    
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1]
      setCurrentStep(prevStep)
      setIsProcessing(false)
      setEditingICP(false)
      setEditingPersona(false)
      setEditingPainPoint(false)
      setEditingValueProp(false)
      
      if (prevStep === "company") {
        setShowForm(false)
      }
    }
  }

  const renderProcessingSteps = () => {
    const currentProcessingSteps = processingSteps[currentStep as keyof typeof processingSteps]
    if (!currentProcessingSteps) return null

    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <div className="flex items-center space-x-3" style={{ color: 'rgb(87, 140, 255)' }}>
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgb(87, 140, 255)', borderTopColor: 'transparent' }}></div>
          <span className="text-lg font-medium" style={{ color: 'rgb(87, 140, 255)' }}>
            AI Copilot brainstorming in progress
          </span>
        </div>
        
        <div className="space-y-4 w-full max-w-md">
          {currentProcessingSteps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = index < processingStepIndex
            const isCurrent = index === processingStepIndex
            
            return (
              <div key={index} className={`flex items-center space-x-3 transition-all duration-300 ${
                isCompleted ? 'text-gray-400' : isCurrent ? 'text-gray-800 font-medium' : 'text-gray-300'
              }`}>
                <div className={`p-1 rounded-lg`} style={isCurrent ? { backgroundColor: 'rgba(87, 140, 255, 0.05)' } : {}}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="flex-1">{step.text}</span>
                {isCompleted && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderCompanyForm = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-gray-900">
          Your company name and website
        </h2>
        <p className="text-gray-600">Let's start by getting to know your business</p>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="campaign-name" className="text-base font-semibold text-gray-800">Campaign name</Label>
          <Input
            id="campaign-name"
            value={formData.campaignName}
            onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
            className="h-12 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)] transition-colors"
            placeholder="Enter your campaign name"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="company" className="text-base font-semibold text-gray-800">Company name</Label>
          <Input
            id="company"
            value={formData.companyName}
            onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
            className="h-12 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)] transition-colors"
            placeholder="Enter your company name"
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="website" className="text-base font-semibold text-gray-800">Website</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="website"
              className="pl-12 h-12 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)] transition-colors"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              disabled={formData.noWebsite}
              placeholder="https://yourcompany.com"
            />
          </div>
        
          <div className="flex items-center space-x-3 mt-3">
            <Checkbox
              id="no-website"
              checked={formData.noWebsite}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                noWebsite: checked as boolean,
                website: checked ? "" : prev.website
              }))}
              className="border-gray-300"
            />
            <Label htmlFor="no-website" className="text-sm text-gray-600 cursor-pointer">
              {"I don't have a website"}
            </Label>
          </div>
        </div>

      
        <div className="space-y-3">
          <Label htmlFor="language" className="text-base font-semibold text-gray-800">Prospecting language</Label>
          <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
            <SelectTrigger className="h-12 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]">
              <SelectValue placeholder="Select your preferred language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">🇺🇸 English</SelectItem>
              <SelectItem value="french">🇫🇷 French</SelectItem>
              <SelectItem value="spanish">🇪🇸 Spanish</SelectItem>
              <SelectItem value="german">🇩🇪 German</SelectItem>
              <SelectItem value="italian">🇮🇹 Italian</SelectItem>
              <SelectItem value="portuguese">🇵🇹 Portuguese</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const renderCompanyInfo = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Information about your company
        </h2>
        <p className="text-gray-600">Help our AI understand your business better</p>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="activity" className="text-base font-semibold text-gray-800">Main activity</Label>
          <p className="text-sm text-gray-600">{"Describe your company's core business, products, or services"}</p>
          <Textarea
            id="activity"
            className="min-h-[200px] border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
            value={formData.mainActivity}
            onChange={(e) => setFormData(prev => ({ ...prev, mainActivity: e.target.value }))}
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="location" className="text-base font-semibold text-gray-800">Location</Label>
          <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
            <SelectTrigger className="h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
              <SelectItem value="United States">🇺🇸 United States</SelectItem>
              <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
              <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
              <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const renderICPsAndPersonasList = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          ICPs & Personas for {formData.companyName || "your company"}
        </h2>
        <p className="text-gray-600">Review and customize your ideal customer profile and target persona</p>
      </div>
      
      {/* ICPs Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Ideal Customer Profile</h3>
        {sampleICPs.map((icp) => (
          <Card 
            key={icp.id} 
            className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md"
          >
            <CardContent className="p-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">{icp.title}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedICP(icp.id)
                      setEditingICP(true)
                      setEditedData(prev => ({ ...prev, icp: { ...icp } }))
                    }}
                    className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-gray-600 leading-relaxed">{icp.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Personas Section */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-xl font-semibold text-gray-800">Target Persona</h3>
        {samplePersonas.map((persona) => (
          <Card 
            key={persona.id} 
            className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md"
          >
            <CardContent className="p-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">{persona.title}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedPersona(persona.id)
                      setEditingPersona(true)
                      setEditedData(prev => ({ ...prev, persona: { ...persona } }))
                    }}
                    className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-gray-600 leading-relaxed">{persona.description.substring(0, 150)}...</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Keywords Section */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-xl font-semibold text-gray-800">Keywords</h3>
        <p className="text-sm text-gray-600">Add relevant keywords to help identify and target the right prospects</p>
        <div className="flex space-x-2">
          <Input
            id="keywords"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            className="flex-1 h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
            placeholder="Enter a keyword"
          />
          <Button 
            type="button"
            onClick={addKeyword}
            className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Add
          </Button>
        </div>
        {formData.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.keywords.map((keyword, index) => (
              <div key={index} className="flex items-center space-x-2 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                <span className="text-sm font-medium">{keyword}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderICPsList = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          ICPs found for uboard
        </h2>
        <p className="text-gray-600">Select your ideal customer profile</p>
      </div>
      
      <div className="space-y-4">
        {sampleICPs.map((icp) => (
          <Card 
            key={icp.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedICP === icp.id 
                ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedICP(icp.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <RadioGroup value={selectedICP.toString()} onValueChange={(value) => setSelectedICP(parseInt(value))}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={icp.id.toString()} className="border-gray-400" />
                  </div>
                </RadioGroup>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">{icp.title}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedICP(icp.id)
                        setEditingICP(true)
                        setEditedData(prev => ({ ...prev, icp: { ...icp } }))
                      }}
                      className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{icp.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderICPDetail = () => {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Edit ICP Details
          </h2>
          <p className="text-gray-600">Customize your ideal customer profile</p>
        </div>
        
        <Card className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="icp-name" className="text-base font-semibold text-gray-800">ICP Name</Label>
                <Input 
                  id="icp-name" 
                  value={editedData.icp?.title || ""} 
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    icp: { ...prev.icp!, title: e.target.value } 
                  }))}
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="icp-description" className="text-base font-semibold text-gray-800">ICP Description</Label>
                <Textarea
                  id="icp-description"
                  className="min-h-[120px] border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  value={editedData.icp?.description || ""}
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    icp: { ...prev.icp!, description: e.target.value } 
                  }))}
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="target-description" className="text-base font-semibold text-gray-800">Target Company Description</Label>
                <p className="text-sm text-gray-600">This helps us find more leads that look like your ideal customers.</p>
                <Textarea
                  id="target-description"
                  className="min-h-[100px] border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  value={editedData.icp?.targetDescription || ""}
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    icp: { ...prev.icp!, targetDescription: e.target.value } 
                  }))}
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="company-size" className="text-base font-semibold text-gray-800">Company size</Label>
                <Select 
                  value={editedData.icp?.companySize}
                  onValueChange={(value) => setEditedData(prev => ({ 
                    ...prev, 
                    icp: { ...prev.icp!, companySize: value } 
                  }))}
                >
                  <SelectTrigger className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-1000">201-1000 employees</SelectItem>
                    <SelectItem value="1000+">1000+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => handleCancel('icp')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={() => handleSave('icp')}
                className="text-white" style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPersonasList = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Personas for uboard
        </h2>
        <p className="text-gray-600">Choose your target persona</p>
      </div>
      
      <div className="space-y-4">
        {samplePersonas.map((persona) => (
          <Card 
            key={persona.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedPersona === persona.id 
                ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedPersona(persona.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <RadioGroup value={selectedPersona.toString()} onValueChange={(value) => setSelectedPersona(parseInt(value))}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={persona.id.toString()} className="border-gray-400" />
                  </div>
                </RadioGroup>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">{persona.title}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedPersona(persona.id)
                        setEditingPersona(true)
                        setEditedData(prev => ({ ...prev, persona: { ...persona } }))
                      }}
                      className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{persona.description.substring(0, 150)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderPersonaDetail = () => {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Edit Persona Details
          </h2>
          <p className="text-gray-600">Customize your target persona</p>
        </div>
        
        <Card className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="persona-title" className="text-base font-semibold text-gray-800">Title</Label>
                <Input 
                  id="persona-title" 
                  value={editedData.persona?.title || ""} 
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    persona: { ...prev.persona!, title: e.target.value } 
                  }))}
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="persona-description" className="text-base font-semibold text-gray-800">Job description</Label>
                <Textarea
                  id="persona-description"
                  className="min-h-[150px] border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  value={editedData.persona?.description || ""}
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    persona: { ...prev.persona!, description: e.target.value } 
                  }))}
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="equivalent-titles" className="text-base font-semibold text-gray-800">Equivalent job titles</Label>
                <Input 
                  id="equivalent-titles" 
                  value={editedData.persona?.equivalentTitles || ""}
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    persona: { ...prev.persona!, equivalentTitles: e.target.value } 
                  }))}
                  placeholder="Enter equivalent job titles separated by commas"
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => handleCancel('persona')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={() => handleSave('persona')}
                className="text-white" style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPainPointDetail = () => {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Edit Pain Point Details
          </h2>
          <p className="text-gray-600">Customize your pain point</p>
        </div>
        
        <Card className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="pain-title" className="text-base font-semibold text-gray-800">Title</Label>
                <Input 
                  id="pain-title" 
                  value={editedData.painPoint?.title || ""} 
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    painPoint: { ...prev.painPoint!, title: e.target.value } 
                  }))}
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="pain-description" className="text-base font-semibold text-gray-800">Description</Label>
                <Textarea
                  id="pain-description"
                  className="min-h-[150px] border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  value={editedData.painPoint?.description || ""}
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    painPoint: { ...prev.painPoint!, description: e.target.value } 
                  }))}
                />
              </div>
            </div>
          
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => handleCancel('painPoint')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={() => handleSave('painPoint')}
                className="text-white" style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderLeadsReview = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          We found 36 leads for you
        </h2>
        <p className="text-gray-600">Review your potential prospects</p>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mt-1">
            <span className="text-white text-sm font-bold">i</span>
          </div>
          <div>
            <p className="text-blue-900 font-semibold text-lg">Leadlist generator: AI-powered prospecting at your fingertips.</p>
            <p className="text-blue-700 mt-1">Quick review recommended for optimal results.</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {sampleLeads.map((lead) => (
          <Card key={lead.id} className="hover:shadow-lg transition-all duration-200 border-gray-200 hover:border-gray-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <img src={lead.avatar || "/placeholder.svg"} alt={lead.name} className="w-14 h-14 rounded-full border-2 border-gray-200" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-blue-600 font-semibold text-sm">in</span>
                    <h3 className="text-xl font-semibold text-gray-900">{lead.name}</h3>
                  </div>
                  <p className="text-gray-600 font-medium">{lead.title}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
                    <span className="text-sm text-gray-500">{lead.company} • {lead.location}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center">
        <Button variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
          Enter focus mode to review
        </Button>
      </div>
    </div>
  )

  const renderPainAndValueList = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Pain Points & Value Propositions
        </h2>
        <p className="text-gray-600">Review the identified challenge and your solution</p>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mt-1">
            <span className="text-white text-sm font-bold">i</span>
          </div>
          <p className="text-blue-900 font-medium">Review the main challenge your customers face and how you solve it.</p>
        </div>
      </div>
      
      {/* Pain Points Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Customer Pain Point</h3>
        {samplePainPoints.map((painPoint) => (
          <Card 
            key={painPoint.id} 
            className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md"
          >
            <CardContent className="p-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">{painPoint.title}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedPainPoint(painPoint.id)
                      setEditingPainPoint(true)
                      setEditedData(prev => ({ ...prev, painPoint: { ...painPoint } }))
                    }}
                    className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-gray-600 leading-relaxed">{painPoint.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Value Proposition Section */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-xl font-semibold text-gray-800">Your Value Proposition</h3>
        <Card className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{sampleValuePropositions[0].title}</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditingValueProp(true)
                    setEditedData(prev => ({ ...prev, valueProp: { ...sampleValuePropositions[0] } }))
                  }}
                  className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-indigo-600 text-sm font-semibold bg-indigo-100 px-3 py-1 rounded-full inline-block">
                {sampleValuePropositions[0].subtitle}
              </p>
              <p className="text-gray-600 leading-relaxed">{sampleValuePropositions[0].description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderPainPointsList = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Define your audience pain points
        </h2>
        <p className="text-gray-600">Identify the main challenges your customers face</p>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mt-1">
            <span className="text-white text-sm font-bold">i</span>
          </div>
          <p className="text-blue-900 font-medium">Choose the main challenge your ideal customers face.</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {samplePainPoints.map((painPoint) => (
          <Card 
            key={painPoint.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedPainPoint === painPoint.id 
                ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedPainPoint(painPoint.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <RadioGroup value={selectedPainPoint.toString()} onValueChange={(value) => setSelectedPainPoint(parseInt(value))}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={painPoint.id.toString()} className="border-gray-400" />
                  </div>
                </RadioGroup>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">{painPoint.title}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedPainPoint(painPoint.id)
                        setEditingPainPoint(true)
                        setEditedData(prev => ({ ...prev, painPoint: { ...painPoint } }))
                      }}
                      className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{painPoint.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderValuePropositions = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Choose your value proposition
        </h2>
        <p className="text-gray-600">Define how you solve your customers' problems</p>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mt-1">
            <span className="text-white text-sm font-bold">i</span>
          </div>
          <p className="text-blue-900 font-medium">Review and adjust your value proposition. Ensure it perfectly addresses your audience's pain point.</p>
        </div>
      </div>
      
      <Card className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <RadioGroup value="1">
              <RadioGroupItem value="1" className="border-gray-400" />
            </RadioGroup>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{sampleValuePropositions[0].title}</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditingValueProp(true)
                    setEditedData(prev => ({ ...prev, valueProp: { ...sampleValuePropositions[0] } }))
                  }}
                  className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-indigo-600 text-sm font-semibold bg-indigo-100 px-3 py-1 rounded-full inline-block">
                {sampleValuePropositions[0].subtitle}
              </p>
              <p className="text-gray-600 leading-relaxed">{sampleValuePropositions[0].description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderOutreachStrategy = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Choose your outreach strategy
        </h2>
        <p className="text-gray-600">Select the approach that best fits your goals</p>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mt-1">
            <span className="text-white text-sm font-bold">i</span>
          </div>
          <p className="text-blue-900 font-medium">Choose the outreach method that best fits your audience and goals.</p>
        </div>
      </div>
      
      <div className="grid gap-6">
        {outreachStrategies.map((strategy) => (
          <Card 
            key={strategy.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedOutreachStrategy === strategy.id 
                ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedOutreachStrategy(strategy.id)}
          >
            <CardContent className="p-8">
              <div className="flex items-start space-x-6">
                <RadioGroup value={selectedOutreachStrategy} onValueChange={setSelectedOutreachStrategy}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={strategy.id} className="border-gray-400" />
                  </div>
                </RadioGroup>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{strategy.icon}</span>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">{strategy.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {strategy.features.map((feature, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-lg">{strategy.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderSequencePreview = () => {
    const getSequenceSteps = () => {
      switch (selectedOutreachStrategy) {
        case "email":
          return [
            { type: "start", title: "Sequence start" },
            { type: "timing", text: "Send immediately", color: "text-blue-600" },
            { 
              type: "action", 
              icon: "📧", 
              title: "Email", 
              subtitle: "Collaborate?",
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
              message: "Hi {{firstName}},\n\nI hope this email finds you well. I came across your work at {{companyName}} and was impressed by your approach to {{industry}}.\n\nI'd love to explore how we can collaborate and potentially help you overcome some of the challenges you might be facing with {{painPoint}}.\n\nWould you be open to a brief conversation this week?\n\nBest regards,\n{{senderName}}"
            },
            { type: "timing", text: "Wait for 2 days" },
            { 
              type: "action", 
              icon: "📧", 
              title: "Follow-up Email", 
              subtitle: "Following up - {{companyName}}",
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
              message: "Hi {{firstName}},\n\nI wanted to follow up on my previous email about potential collaboration opportunities.\n\nI understand you're probably busy, but I believe our solution could significantly help with {{painPoint}} that many companies like {{companyName}} face.\n\nWould you have 10 minutes for a quick call this week?\n\nBest regards,\n{{senderName}}"
            },
            { type: "timing", text: "Wait for 3 days" },
            { 
              type: "action", 
              icon: "📧", 
              title: "Final Email", 
              subtitle: "Last attempt - {{companyName}}",
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
              message: "Hi {{firstName}},\n\nThis will be my final email regarding our potential collaboration.\n\nI understand timing might not be right, but I wanted to leave you with some resources that might be helpful for addressing {{painPoint}}.\n\nIf you change your mind, feel free to reach out anytime.\n\nBest regards,\n{{senderName}}"
            }
          ]
        
        case "linkedin":
          return [
            { type: "start", title: "Sequence start" },
            { type: "timing", text: "Send immediately", color: "text-blue-600" },
            { 
              type: "action", 
              icon: "💼", 
              title: "LinkedIn Connection", 
              subtitle: "Connection Request",
              platform: "LinkedIn",
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
              message: `Hi {{firstName}},

I came across your profile and was impressed by your work at {{companyName}}. I'd love to connect and share some insights that could help with {{painPoint}}.

Looking forward to connecting!

Best regards,
{{senderName}}`
            },
            { type: "timing", text: "Wait for 3 days" },
            { 
              type: "action", 
              icon: "💼", 
              title: "LinkedIn Message", 
              subtitle: "Follow-up Message",
              platform: "LinkedIn",
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
              message: `Hi {{firstName}},

Thanks for connecting! I wanted to reach out because I noticed {{companyName}} might be facing challenges with {{painPoint}}.

We've helped similar companies overcome this. Would you be interested in a brief conversation about how we could help?

Best regards,
{{senderName}}`
            },
            { type: "timing", text: "Wait for 4 days" },
            { 
              type: "action", 
              icon: "💼", 
              title: "LinkedIn Message", 
              subtitle: "Final Message",
              platform: "LinkedIn",
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
              message: `Hi {{firstName}},

I hope you're doing well. I wanted to follow up one last time regarding {{painPoint}}.

If now isn't the right time, no worries. I'll leave you with some resources that might be helpful. Feel free to reach out if you'd like to discuss in the future.

Best regards,
{{senderName}}`
            }
          ]
        
        case "email-linkedin":
          return [
            { type: "start", title: "Sequence start" },
            { type: "timing", text: "Send immediately", color: "text-blue-600" },
            { 
              type: "action", 
              icon: "📧", 
              title: "Email", 
              subtitle: "Collaborate?",
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
              message: `Hi {{firstName}},

I hope this email finds you well. I came across your work at {{companyName}} and was impressed by your approach to {{industry}}.

I'd love to explore how we can collaborate and potentially help you overcome some of the challenges you might be facing with {{painPoint}}.

Would you be open to a brief conversation this week?

Best regards,
{{senderName}}`
            },
            { type: "timing", text: "Wait for 2 days", color: "text-blue-600" },
            { 
              type: "action", 
              icon: "👥", 
              title: "LinkedIn Connection", 
              subtitle: "Connection Request",
              platform: "LinkedIn",
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
              message: `Hi {{firstName}},

I came across your profile and was impressed by your work at {{companyName}}. I'd love to connect and share some insights that could help with {{painPoint}}.

Looking forward to connecting!

Best regards,
{{senderName}}`
            }
          ]
        
        default:
          return []
      }
    }

    const sequenceSteps = getSequenceSteps()
    const strategyTitle = outreachStrategies.find(s => s.id === selectedOutreachStrategy)?.title || "Email only"

    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Sequence Preview - {strategyTitle}
          </h2>
          <p className="text-gray-600">Review your automated outreach sequence</p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mt-1">
              <span className="text-white text-sm font-bold">i</span>
            </div>
            <div>
              <p className="text-blue-900 font-semibold">This sequence will run automatically for each lead</p>
              <p className="text-blue-700 mt-1">You can edit individual steps or timing after creation</p>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 transform -translate-x-1/2"></div>
          
          <div className="space-y-0">
            {sequenceSteps.map((step, index) => {
              if (step.type === "start") {
                return (
                  <div key={index} className="relative flex justify-center mb-8">
                    <div className="bg-white border border-gray-200 rounded-2xl px-8 py-4 shadow-sm">
                      <span className="text-gray-500 font-medium">{step.title}</span>
                    </div>
                  </div>
                )
              }

              if (step.type === "timing") {
                return (
                  <div key={index} className="relative flex justify-center mb-6">
                    <div className="bg-white px-4 py-2 flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-400 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      </div>
                      <span className={`font-medium ${step.color || 'text-gray-700'}`}>
                        {step.text}
                      </span>
                    </div>
                  </div>
                )
              }

              if (step.type === "action") {
                return (
                  <div key={index} className="relative flex justify-center mb-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full max-w-sm">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 ${step.iconBg} rounded-xl flex items-center justify-center`}>
                          <span className="text-lg">{step.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{step.title}</h3>
                          <p className="text-gray-500 text-sm">{step.subtitle}</p>
                          {step.platform && (
                            <div className="flex items-center space-x-1 mt-1">
                              <span className="text-blue-600 text-xs font-medium">in</span>
                              <span className="text-gray-400 text-xs">{step.platform}</span>
                            </div>
                          )}
                          {step.message && (
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMessage({
                                    title: `${step.title}: ${step.subtitle}`,
                                    content: step.message
                                  })
                                  setShowMessageModal(true)
                                }}
                                className="text-xs px-3 py-1 h-6 border-gray-200" style={{ color: 'rgb(87, 140, 255)', borderColor: 'rgba(87, 140, 255, 0.2)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(87, 140, 255, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View Message
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              return null
            })}
          </div>
        </div>
        
        <div className="text-center">
          <span className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
            36 leads will receive this sequence
          </span>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex shadow-2xl">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 text-gray-400 hover:text-gray-600 transition-colors bg-white/80 hover:bg-gray-50 rounded-full p-2 shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex w-full">
          {/* Sidebar */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 h-full">
            <div className="p-6 space-y-8">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgb(87, 140, 255)' }}>GET STARTED</p>
                <h1 className="text-2xl font-bold text-gray-900">
                  Campaign creation
                </h1>
              </div>
              
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const isCompleted = completedSteps.includes(step.id)
                  const isCurrent = currentStep === step.id
                  const isClickable = isCompleted || step.id === "company"
                  
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center space-x-4 cursor-pointer transition-all duration-200 ${
                        isClickable ? 'hover:bg-gray-100' : 'cursor-not-allowed'
                      } p-3 rounded-lg group`}
                      onClick={() => handleStepClick(step.id)}
                    >
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isCompleted 
                          ? 'border-transparent shadow-sm' 
                          : isCurrent 
                            ? 'shadow-sm' 
                            : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : isCurrent ? (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-gray-400 transition-colors" />
                        )}
                      </div>
                      <span className={`font-medium transition-colors ${
                        isCurrent 
                          ? 'font-semibold' 
                          : isCompleted 
                            ? 'text-gray-900' 
                            : 'text-gray-500 group-hover:text-gray-700'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              
              {/* Helper text */}
              <div className="mt-8 p-5 bg-gray-100 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  {currentStep === "company" 
                    ? "To create the most relevant campaign, please complete each step and provide as much context as possible to our AI. Your input is crucial for optimal results!"
                    : currentStep === "icps-personas"
                      ? "Define your ideal customer profile and target personas to focus your sales and marketing efforts on the right audience."
                      : currentStep === "pain-value"
                        ? "Identify customer pain points and articulate your value propositions to create messaging that resonates."
                        : "Create sequences that progressively deliver value, vary touchpoints, and optimize regularly based on prospect engagement metrics."
                  }
                </p>
              </div>
              
              {/* Copilot indicator */}
              <div className="flex items-center space-x-3 mt-8 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(87, 140, 255, 0.05)', borderColor: 'rgba(87, 140, 255, 0.2)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: 'rgb(87, 140, 255)' }}>
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold" style={{ color: 'rgb(87, 140, 255)' }}>
                  AI Copilot
                </span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-8 overflow-y-auto bg-white">
            {currentStep === "company" && showForm && renderCompanyForm()}
            {currentStep === "company" && !showForm && !isProcessing && renderCompanyInfo()}
            {currentStep === "icps-personas" && !isProcessing && (
              editingICP ? renderICPDetail() : 
              editingPersona ? renderPersonaDetail() : 
              renderICPsAndPersonasList()
            )}
            {currentStep === "pain-value" && !isProcessing && (
              editingPainPoint ? renderPainPointDetail() :
              editingValueProp ? renderValuePropositions() :
              renderPainAndValueList()
            )}
            {/* Outreach strategy step removed - using email only */}
            {currentStep === "sequence" && !isProcessing && renderSequencePreview()}
            {isProcessing && renderProcessingSteps()}
            
            {/* Navigation buttons */}
            <div className="flex justify-between items-center mt-12">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className={`border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors ${
                  currentStep === "company" && showForm ? "invisible" : ""
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleContinue}
                disabled={isProcessing}
                className="text-white shadow-lg transition-all duration-200 disabled:opacity-50" style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
              >
                <span>
                  {isProcessing 
                    ? "Processing..." 
                    : currentStep === "sequence" 
                      ? "Create Campaign" 
                      : "Continue"
                  }
                </span>
                {!isProcessing && <ChevronRight className="w-4 h-4 ml-2" />}
                {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Preview Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {selectedMessage.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-4 border">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {selectedMessage.content}
              </pre>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <strong>Note:</strong> Variables like {"{{firstName}}"}, {"{{companyName}}"}, and {"{{painPoint}}"} will be automatically replaced with actual values when the campaign runs.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
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

// Removed processingSteps - no longer needed for simplified loading

const sampleICPs = [
  {
    id: 1,
    title: "Technology Companies - Digital Marketing Solutions",
    description: "Companies focused on innovative digital marketing solutions need platforms to enhance campaign reach and engagement. Our targeted advertising solutions offer unique channels to deliver impactful campaigns and measure effectiveness through advanced analytics.",
    targetDescription: "Technology company specializing in creating and managing digital marketing campaigns for clients across various industries.",
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

// Helper function to get suggested roles based on campaign objective
const getSuggestedRoles = (objective: string): string[] => {
  // IMPORTANT: Only return broad, generic, industry-agnostic prospect roles
  // Never return specific roles like "automate reviews", "online reputation", "customer feedback"
  // These roles must work across ALL industries and sectors
  const broadRoles = [
    'CEO', 'Founder', 'President', 'Director', 'VP', 'Manager', 
    'Executive', 'Head of Department', 'Owner', 'Partner'
  ]
  
  switch (objective) {
    case 'sell-service':
      return ['CEO', 'Founder', 'President', 'Director', 'VP', 'Manager', 'Owner']
    case 'raise-money':
      return ['CEO', 'Founder', 'CFO', 'President', 'Director', 'Partner', 'Owner']
    case 'book-meetings':
      return ['CEO', 'Director', 'VP', 'Manager', 'Head of Department', 'Executive']
    case 'grow-brand':
      return ['CEO', 'Director', 'VP', 'Manager', 'Head of Department', 'Executive']
    case 'collect-reviews':
      return ['CEO', 'Director', 'VP', 'Manager', 'Head of Department', 'Executive']
    case 'recruit':
      return ['CEO', 'Director', 'VP', 'Manager', 'Head of Department', 'Executive']
    default:
      return broadRoles.slice(0, 6) // Return first 6 broad roles
  }
}

export default function AddCampaignPopup({ isOpen, onClose, onComplete }: AddCampaignPopupProps) {
  const [currentStep, setCurrentStep] = useState("company")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [aiAssets, setAiAssets] = useState<any>(null)
  const [campaignId, setCampaignId] = useState<number | null>(null)
  const [campaignResult, setCampaignResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    campaignName: "",
    campaignObjective: "",
    companyName: "",
    website: "",
    noWebsite: false,
    language: "",
    keywords: [] as string[],
    mainActivity: "",
    location: "Australia",
    industry: ""
  })
  const [selectedICP, setSelectedICP] = useState(1)
  const [selectedPersona, setSelectedPersona] = useState(1)
  const [selectedPainPoint, setSelectedPainPoint] = useState(1)
  const [selectedOutreachStrategy, setSelectedOutreachStrategy] = useState("email")
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState({ title: "", content: "" })
  const [error, setError] = useState<string | null>(null)
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

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

  const handleSave = async (type: 'icp' | 'persona' | 'painPoint' | 'valueProp') => {
    // Update AI assets with edited data
    let updatedAssets = { ...aiAssets }
    
    switch(type) {
      case 'icp':
        if (editedData.icp && aiAssets?.icps) {
          updatedAssets.icps = aiAssets.icps.map((icp: any) => 
            icp.id === editedData.icp?.id ? editedData.icp : icp
          )
        }
        setEditingICP(false)
        break
      case 'persona':
        if (editedData.persona && aiAssets?.personas) {
          updatedAssets.personas = aiAssets.personas.map((persona: any) => 
            persona.id === editedData.persona?.id ? editedData.persona : persona
          )
        }
        setEditingPersona(false)
        break
      case 'painPoint':
        if (editedData.painPoint && aiAssets?.pain_points) {
          updatedAssets.pain_points = aiAssets.pain_points.map((pp: any) => 
            pp.id === editedData.painPoint?.id ? editedData.painPoint : pp
          )
        }
        setEditingPainPoint(false)
        break
      case 'valueProp':
        if (editedData.valueProp && aiAssets?.value_propositions) {
          updatedAssets.value_propositions = aiAssets.value_propositions.map((vp: any) => 
            vp.id === editedData.valueProp?.id ? editedData.valueProp : vp
          )
        }
        setEditingValueProp(false)
        break
    }
    
    // Update local state immediately for responsive UI
    setAiAssets(updatedAssets)
    
    // Save to database if campaign exists
    if (campaignId) {
      await updateAIAssets(updatedAssets)
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

  const createCampaignWithICPs = async () => {
    try {
      setIsCreatingCampaign(true);
      setError(null);

      const response = await fetch('/api/campaigns/create-progressive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 'create-campaign',
          formData: {
            campaignName: formData.campaignName,
            campaignObjective: formData.campaignObjective,
            companyName: formData.companyName,
            website: formData.website,
            noWebsite: formData.noWebsite,
            language: formData.language || 'English',
            keywords: formData.keywords,
            mainActivity: formData.mainActivity,
            location: formData.location,
            industry: formData.industry,
            productService: formData.productService,
            goals: formData.goals,
            targetAudience: formData.targetAudience
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to continue');
        } else if (response.status === 400) {
          throw new Error(result.error || 'Please check your input and try again');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later');
        } else {
          throw new Error(result.error || 'Failed to create campaign');
        }
      }

      if (result.success) {
        setCampaignId(result.data.campaign.id);
        setAiAssets(prev => ({ ...prev, ...result.data.aiAssets }));
        
        // Auto-fill AI-generated target prospect roles based on campaign objective and company info
        if (result.data.aiGeneratedRoles && result.data.aiGeneratedRoles.length > 0) {
          console.log('🎯 AI-generated roles received:', result.data.aiGeneratedRoles);
          const newKeywords = [...new Set([...formData.keywords, ...result.data.aiGeneratedRoles])];
          console.log('📝 Setting formData keywords to:', newKeywords);
          setFormData(prev => ({
            ...prev,
            keywords: newKeywords
          }));
          // Save AI-generated keywords to database immediately
          console.log('💾 Saving AI-generated keywords to database for campaign:', result.data.campaign.id);
          updateCampaignKeywords(newKeywords, result.data.campaign.id);
        }
        // Fallback to extractedKeywords for backward compatibility
        else if (result.data.extractedKeywords && result.data.extractedKeywords.length > 0) {
          console.log('🎯 Extracted keywords received (fallback):', result.data.extractedKeywords);
          const newKeywords = [...new Set([...formData.keywords, ...result.data.extractedKeywords])];
          console.log('📝 Setting formData keywords to:', newKeywords);
          setFormData(prev => ({
            ...prev,
            keywords: newKeywords
          }));
          // Save AI-generated keywords to database immediately
          console.log('💾 Saving extracted keywords to database for campaign:', result.data.campaign.id);
          updateCampaignKeywords(newKeywords, result.data.campaign.id);
        }
        
        return result.data;
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error creating campaign and ICPs:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      throw error;
    } finally {
      setIsCreatingCampaign(false);
    }
  }

  const generatePainPointsAndValueProps = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/campaigns/create-progressive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 'generate-pain-value',
          campaignId: campaignId,
          aiAssets: aiAssets
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiAssets(prev => ({ ...prev, ...result }));
        return result;
      } else {
        throw new Error(result.error || 'Failed to generate pain points and value propositions');
      }
    } catch (error) {
      console.error('Error generating pain points and value props:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  const generateEmailSequence = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/campaigns/create-progressive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 'generate-sequence',
          campaignId: campaignId,
          formData: formData,
          aiAssets: aiAssets
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiAssets(prev => ({ ...prev, ...result }));
        return result;
      } else {
        throw new Error(result.error || 'Failed to generate email sequence');
      }
    } catch (error) {
      console.error('Error generating email sequence:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  const generateAllRemaining = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/campaigns/create-progressive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 'generate-all-remaining',
          campaignId: campaignId,
          formData: formData,
          aiAssets: aiAssets
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiAssets(prev => ({ 
          ...prev, 
          pain_points: result.pain_points,
          value_propositions: result.value_propositions,
          email_sequences: result.email_sequences
        }));
        return result;
      } else {
        throw new Error(result.error || 'Failed to generate remaining content');
      }
    } catch (error) {
      console.error('Error generating remaining content:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  const updateAIAssets = async (updatedAssets: any) => {
    try {
      const response = await fetch('/api/campaigns/create-progressive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 'update-assets',
          campaignId: campaignId,
          aiAssets: updatedAssets
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiAssets(prev => ({ ...prev, ...updatedAssets }));
        return result;
      } else {
        console.warn('Failed to update assets in database:', result.error);
      }
    } catch (error) {
      console.error('Error updating AI assets:', error);
    }
  }

  const updateCampaignKeywords = async (keywords: string[], targetCampaignId?: number) => {
    const campaignIdToUse = targetCampaignId || campaignId;
    if (!campaignIdToUse) {
      console.warn('No campaign ID available to update keywords');
      return;
    }

    try {
      console.log('🔄 [Frontend] Updating campaign keywords:', keywords);
      
      const response = await fetch(`/api/campaigns/${campaignIdToUse}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          campaignData: {
            keywords: keywords
          },
          saveType: 'keywords'
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [Frontend] Campaign keywords updated successfully');
      } else {
        console.error('❌ [Frontend] Failed to update campaign keywords:', result.error);
      }
    } catch (error) {
      console.error('❌ [Frontend] Error updating campaign keywords:', error);
    }
  }

  const [newKeyword, setNewKeyword] = useState("")

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      const newKeywords = [...formData.keywords, newKeyword.trim()];
      setFormData(prev => ({ 
        ...prev, 
        keywords: newKeywords
      }))
      setNewKeyword("")
      
      // Update campaign with new keywords if campaign exists
      if (campaignId) {
        updateCampaignKeywords(newKeywords);
      }
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    const newKeywords = formData.keywords.filter(keyword => keyword !== keywordToRemove);
    setFormData(prev => ({ 
      ...prev, 
      keywords: newKeywords
    }))
    
    // Update campaign with new keywords if campaign exists
    if (campaignId) {
      updateCampaignKeywords(newKeywords);
    }
  }

  const handleContinue = async () => {
    // Prevent multiple executions while processing
    if (isProcessing || isCreatingCampaign) {
      console.log('⚠️ Campaign creation already in progress, ignoring click')
      return
    }
    
    const stepOrder = ["company", "icps-personas", "pain-value", "sequence"]
    const currentIndex = stepOrder.indexOf(currentStep)
    
    if (currentStep === "company" && showForm) {
      // Clear any previous errors
      setError(null);

      // Validate required fields before proceeding
      if (!formData.campaignName?.trim()) {
        setError("Campaign name is required");
        return;
      }
      if (!formData.campaignObjective) {
        setError("Campaign objective is required");
        return;
      }
      if (!formData.companyName?.trim()) {
        setError("Company name is required");
        return;
      }

      setShowForm(false);
      setIsProcessing(true);
      
      try {
        // Step 1: Create campaign and generate ICPs & Personas
        const result = await createCampaignWithICPs();
        
        // Store the campaign result for later use
        setCampaignResult(result);
        
        // Immediately move to next step after API completes
        setIsProcessing(false);
        setCompletedSteps(prev => [...prev, "company"]);
        setCurrentStep("icps-personas");

      } catch (error) {
        setIsProcessing(false);
        setShowForm(true);
        // Error is already set in createCampaignWithICPs function
      }
    } else if (!isProcessing && currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1]
      
      // Generate content for the next step
      if (nextStep === "pain-value") {
        setIsProcessing(true);
        try {
          // NEW: Generate both pain points and email sequence in parallel for speed
          await generateAllRemaining();
          setCompletedSteps(prev => [...prev, currentStep, "pain-value"])
          setCurrentStep("sequence") // Skip directly to sequence since we generated both
        } catch (error) {
          // Error handling is done in the function
          return;
        }
      } else if (nextStep === "sequence") {
        setIsProcessing(true);
        try {
          await generateEmailSequence();
          setCompletedSteps(prev => [...prev, currentStep])
          setCurrentStep(nextStep)
        } catch (error) {
          // Error handling is done in the function
          return;
        }
      } else {
        setCompletedSteps(prev => [...prev, currentStep])
        setCurrentStep(nextStep)
      }
      
      setEditingICP(false)
      setEditingPersona(false)
      setEditingPainPoint(false)
      setEditingValueProp(false)
    } else if (currentStep === "sequence") {
      // Final step - ensure sequences are generated before completing campaign
      if (!aiAssets?.email_sequences || aiAssets.email_sequences.length === 0) {
        console.log('📧 No sequences found, generating before completing campaign...')
        setIsProcessing(true);
        try {
          await generateEmailSequence();
        } catch (error) {
          console.error('❌ Failed to generate sequences:', error);
          setError('Failed to generate email sequences. Please try again.');
          setIsProcessing(false);
          return;
        } finally {
          setIsProcessing(false);
        }
      }
      
      // Final step - complete the campaign creation
      const campaignData = {
        formData,
        campaignId,
        aiAssets,
        campaignResult, // Include the stored campaign result
        campaign: campaignResult?.campaign, // Direct reference to campaign object
        selectedICP: aiAssets?.icps?.find((icp: any) => icp.id === selectedICP) || sampleICPs.find(icp => icp.id === selectedICP),
        selectedPersona: aiAssets?.personas?.find((persona: any) => persona.id === selectedPersona) || samplePersonas.find(persona => persona.id === selectedPersona),
        selectedPainPoint: aiAssets?.pain_points?.find((pp: any) => pp.id === selectedPainPoint) || samplePainPoints.find(pp => pp.id === selectedPainPoint),
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
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="relative">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-3">
          <span className="text-xl font-light text-gray-900 tracking-tight">
            {currentStep === "company" ? "Generating AI campaign assets..." : "Processing..."}
          </span>
          <p className="text-sm text-gray-500 font-light">This may take a few seconds</p>
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce animation-delay-100"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce animation-delay-200"></div>
          </div>
        </div>
      </div>
    )
  }

  const renderCompanyForm = () => (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-medium text-gray-900">
          Your company name and website
        </h2>
        <p className="text-sm text-gray-500 mt-1">Let's start by getting to know your business</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-sm font-medium text-gray-700">Campaign name</Label>
            <Input
              id="campaign-name"
              value={formData.campaignName}
              onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
              className="h-10 border-gray-200 focus:border-blue-600 focus:ring-blue-600 transition-all duration-300 rounded-xl text-sm"
              placeholder="Enter your campaign name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-objective" className="text-sm font-medium text-gray-700">Campaign objective</Label>
            <div className="relative">
              <select 
                value={formData.campaignObjective} 
                onChange={(e) => setFormData(prev => ({ ...prev, campaignObjective: e.target.value }))}
                className="w-full h-10 border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20 text-sm rounded-xl px-3 bg-white appearance-none cursor-pointer"
              >
                <option value="">Select your objective</option>
                <option value="sell-service">💼 Sell your service</option>
                <option value="raise-money">💰 Raise money</option>
                <option value="book-meetings">📅 Book more meetings</option>
                <option value="grow-brand">📢 Grow your brand awareness</option>
                <option value="collect-reviews">⭐ Collect reviews/testimonials</option>
                <option value="recruit">👥 Recruit candidates</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-medium text-gray-700">Company name</Label>
            <Input
              id="company"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              className="h-10 border-gray-200 focus:border-blue-600 focus:ring-blue-600 transition-all duration-300 rounded-xl text-sm"
              placeholder="Enter your company name"
            />
          </div>
          <div></div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="website" className="text-sm font-medium text-gray-700">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="website"
                className="pl-10 h-10 border-gray-200 focus:border-blue-600 focus:ring-blue-600 transition-all duration-300 rounded-xl text-sm"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                disabled={formData.noWebsite}
                placeholder="https://yourcompany.com"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
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
            <Label htmlFor="no-website" className="text-xs text-gray-600 cursor-pointer">
              No website
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
            <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)] text-sm">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                <SelectItem value="United States">🇺🇸 United States</SelectItem>
                <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                <SelectItem value="France">🇫🇷 France</SelectItem>
                <SelectItem value="Spain">🇪🇸 Spain</SelectItem>
                <SelectItem value="Italy">🇮🇹 Italy</SelectItem>
                <SelectItem value="Netherlands">🇳🇱 Netherlands</SelectItem>
                <SelectItem value="Singapore">🇸🇬 Singapore</SelectItem>
                <SelectItem value="India">🇮🇳 India</SelectItem>
                <SelectItem value="Japan">🇯🇵 Japan</SelectItem>
                <SelectItem value="Brazil">🇧🇷 Brazil</SelectItem>
                <SelectItem value="Mexico">🇲🇽 Mexico</SelectItem>
                <SelectItem value="South Africa">🇿🇦 South Africa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry" className="text-sm font-medium text-gray-700">Industry</Label>
            <Input
              id="industry"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              className="h-10 border-gray-200 focus:border-blue-600 focus:ring-blue-600 transition-all duration-300 rounded-xl text-sm"
              placeholder="e.g., Technology, Healthcare"
            />
          </div>
        </div>
      
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language" className="text-sm font-medium text-gray-700">Prospecting language</Label>
            <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)] text-sm">
                <SelectValue placeholder="Select language" />
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
          <div></div>
        </div>


      </div>
    </div>
  )

  const renderCompanyInfo = () => (
    <div className="max-w-3xl mx-auto space-y-3">
      <div>
        <h2 className="text-xl font-medium text-gray-900">
          Information about your company
        </h2>
        <p className="text-sm text-gray-500 mt-1">Help our AI understand your business better</p>
      </div>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="activity" className="text-sm font-medium text-gray-700">Main activity</Label>
          <p className="text-xs text-gray-500">{"Describe your company's core business, products, or services"}</p>
          <Textarea
            id="activity"
            className="min-h-[80px] max-h-[120px] border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors text-sm rounded-xl resize-none"
            value={formData.mainActivity}
            onChange={(e) => setFormData(prev => ({ ...prev, mainActivity: e.target.value }))}
          />
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-800">Target Prospect Roles</h3>
              {formData.keywords.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  AI Generated
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {formData.keywords.length > 0 
                ? "AI-generated prospect roles based on your campaign objective and company info. You can add more or remove any." 
                : "Add job titles and roles of your ideal prospects (e.g., \"CEO\", \"Director\", \"VP\", \"Manager\")"
              }
            </p>
            <p className="text-xs text-gray-500">These will help us identify the right decision-makers to reach out to</p>
          </div>
          <div className="flex space-x-2">
            <Input
              id="keywords"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              className="flex-1 h-10 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors rounded-xl text-sm"
              placeholder="e.g., CEO, Director, VP, Manager"
            />
            <Button 
              type="button"
              onClick={addKeyword}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 text-sm"
            >
              Add Role
            </Button>
          </div>
          
          {/* Suggested roles based on campaign objective - only show if no AI roles yet */}
          {formData.campaignObjective && formData.keywords.length === 0 && (
            <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-3">
              <p className="text-xs font-medium text-blue-700 mb-2">Quick-add suggested roles while AI processes your data:</p>
              <div className="flex flex-wrap gap-2">
                {getSuggestedRoles(formData.campaignObjective).map((role, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (!formData.keywords.includes(role)) {
                        const newKeywords = [...formData.keywords, role];
                        setFormData(prev => ({ 
                          ...prev, 
                          keywords: newKeywords
                        }))
                        // Update campaign with new keywords if campaign exists
                        if (campaignId) {
                          updateCampaignKeywords(newKeywords);
                        }
                      }
                    }}
                    className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    + {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Additional suggestions for AI-generated roles */}
          {formData.campaignObjective && formData.keywords.length > 0 && (
            <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Additional suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {getSuggestedRoles(formData.campaignObjective)
                  .filter(role => !formData.keywords.includes(role))
                  .slice(0, 4)
                  .map((role, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const newKeywords = [...formData.keywords, role];
                      setFormData(prev => ({ 
                        ...prev, 
                        keywords: newKeywords
                      }))
                      // Update campaign with new keywords if campaign exists
                      if (campaignId) {
                        updateCampaignKeywords(newKeywords);
                      }
                    }}
                    className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    + {role}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {formData.keywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Selected prospect roles:</p>
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map((keyword, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                    <span className="text-xs font-medium">{keyword}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderICPsAndPersonasList = () => {
    const displayICPs = aiAssets?.icps || sampleICPs
    const displayPersonas = aiAssets?.personas || samplePersonas

    return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-medium text-gray-900">
          Target Audience & Prospects
        </h2>
        <p className="text-sm text-gray-500 mt-1">Define your ideal customers, personas, and prospect roles</p>
      </div>
      
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: ICPs & Personas */}
        <div className="space-y-6">
          
          {/* ICPs Section - Compact */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">Ideal Customer Profile</h3>
            <div className="space-y-3">
              {displayICPs.slice(0, 1).map((icp: any) => (
                <div 
                  key={icp.id} 
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">{icp.title}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{icp.description.substring(0, 100)}...</p>
                      {icp.companySize && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {icp.companySize} employees
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedICP(icp.id)
                        setEditingICP(true)
                        setEditedData(prev => ({ ...prev, icp: { ...icp } }))
                      }}
                      className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg p-1.5 ml-2"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Personas Section - Compact */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">Target Persona</h3>
            <div className="space-y-3">
              {displayPersonas.slice(0, 1).map((persona: any) => (
                <div 
                  key={persona.id} 
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">{persona.title}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {(persona.demographics || persona.description || 'Demographics information').substring(0, 100)}...
                      </p>
                      {persona.equivalentTitles && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Also: {persona.equivalentTitles.split(',')[0]}...
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedPersona(persona.id)
                        setEditingPersona(true)
                        setEditedData(prev => ({ ...prev, persona: { ...persona } }))
                      }}
                      className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg p-1.5 ml-2"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Target Prospect Roles */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900">Target Prospect Roles</h3>
              {formData.keywords.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  AI Generated
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {formData.keywords.length > 0 
                ? "AI-generated prospect roles based on your campaign objective and company info. You can add more or remove any." 
                : "Add job titles and roles of your ideal prospects (e.g., \"CEO\", \"Director\", \"VP\", \"Manager\")"
              }
            </p>
            <p className="text-xs text-gray-500">These will help us identify the right decision-makers to reach out to</p>
          </div>
          <div className="flex space-x-2">
            <Input
              id="keywords"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              className="flex-1 h-10 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors rounded-xl text-sm"
              placeholder="e.g., CEO, Director, VP, Manager"
            />
            <Button 
              type="button"
              onClick={addKeyword}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 text-sm"
            >
              Add Role
            </Button>
          </div>
          
          {/* Suggested roles based on campaign objective - only show if no AI roles yet */}
          {formData.campaignObjective && formData.keywords.length === 0 && (
            <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-3">
              <p className="text-xs font-medium text-blue-700 mb-2">Quick-add suggested roles while AI processes your data:</p>
              <div className="flex flex-wrap gap-2">
                {getSuggestedRoles(formData.campaignObjective).map((role, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (!formData.keywords.includes(role)) {
                        const newKeywords = [...formData.keywords, role];
                        setFormData(prev => ({ 
                          ...prev, 
                          keywords: newKeywords
                        }))
                        // Update campaign with new keywords if campaign exists
                        if (campaignId) {
                          updateCampaignKeywords(newKeywords);
                        }
                      }
                    }}
                    className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    + {role}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Additional suggestions for AI-generated roles */}
          {formData.campaignObjective && formData.keywords.length > 0 && (
            <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Additional suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {getSuggestedRoles(formData.campaignObjective)
                  .filter(role => !formData.keywords.includes(role))
                  .slice(0, 4)
                  .map((role, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const newKeywords = [...formData.keywords, role];
                      setFormData(prev => ({ 
                        ...prev, 
                        keywords: newKeywords
                      }))
                      // Update campaign with new keywords if campaign exists
                      if (campaignId) {
                        updateCampaignKeywords(newKeywords);
                      }
                    }}
                    className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    + {role}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {formData.keywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Selected prospect roles:</p>
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map((keyword, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                    <span className="text-xs font-medium">{keyword}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    )
  }

  const renderICPsList = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          ICPs found for {campaignFormData.companyName || 'your company'}
        </h2>
        <p className="text-gray-600">Select your ideal customer profile</p>
      </div>
      
      <div className="space-y-4">
        {sampleICPs.map((icp) => (
          <Card 
            key={icp.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedICP === icp.id 
                ? 'shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={selectedICP === icp.id ? { borderColor: 'rgb(37, 99, 235)', background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' } : {}}
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
        
        <Card className="border-2 shadow-lg" style={{ borderColor: 'rgb(37, 99, 235)', background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' }}>
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
                className="text-white" style={{ backgroundColor: 'rgb(37, 99, 235)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(37, 99, 235)'}
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
          Personas for {campaignFormData.companyName || 'your company'}
        </h2>
        <p className="text-gray-600">Choose your target persona</p>
      </div>
      
      <div className="space-y-4">
        {samplePersonas.map((persona) => (
          <Card 
            key={persona.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedPersona === persona.id 
                ? 'shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={selectedPersona === persona.id ? { borderColor: 'rgb(37, 99, 235)', background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' } : {}}
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
                  <p className="text-gray-600 leading-relaxed">
                    {(persona.demographics || persona.description || 'Demographics information').substring(0, 150)}...
                  </p>
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
        
        <Card className="border-2 shadow-lg" style={{ borderColor: 'rgb(37, 99, 235)', background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' }}>
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
                className="text-white" style={{ backgroundColor: 'rgb(37, 99, 235)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(37, 99, 235)'}
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
        
        <Card className="border-2 shadow-lg" style={{ borderColor: 'rgb(37, 99, 235)', background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' }}>
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
                className="text-white" style={{ backgroundColor: 'rgb(37, 99, 235)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(37, 99, 235)'}
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

  const renderPainAndValueList = () => {
    const displayPainPoints = aiAssets?.pain_points || samplePainPoints
    const displayValueProps = aiAssets?.value_propositions || sampleValuePropositions

    return (
      <div className="max-w-3xl mx-auto space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-medium text-gray-900">
          Pain Points & Value Propositions
        </h2>
        <p className="text-sm text-gray-500 mt-1">Review the AI-generated challenges and your solutions</p>
      </div>
      
      <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-4">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-blue-600 rounded-xl flex items-center justify-center mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <p className="text-blue-900 font-medium text-sm">Review the main challenge your customers face and how you solve it.</p>
        </div>
      </div>
      
      {/* Side-by-side layout for compact display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pain Points Section */}
        <div className="space-y-3">
          <h3 className="text-base font-medium text-gray-900">Customer Pain Point</h3>
          {displayPainPoints.slice(0, 1).map((painPoint: any) => (
            <div 
              key={painPoint.id} 
              className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="p-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{painPoint.title}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedPainPoint(painPoint.id)
                        setEditingPainPoint(true)
                        setEditedData(prev => ({ ...prev, painPoint: { ...painPoint } }))
                      }}
                      className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl p-1.5"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{painPoint.description.substring(0, 100)}...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Value Proposition Section */}
        <div className="space-y-3">
          <h3 className="text-base font-medium text-gray-900">Your Value Proposition</h3>
          {displayValueProps.slice(0, 1).map((valueProp: any) => (
            <div 
              key={valueProp.id} 
              className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="p-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{valueProp.title}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditingValueProp(true)
                        setEditedData(prev => ({ ...prev, valueProp: { ...valueProp } }))
                      }}
                      className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl p-1.5"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{valueProp.description.substring(0, 100)}...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Show additional items if they exist */}
      {(displayPainPoints.length > 1 || displayValueProps.length > 1) && (
        <div className="text-center">
          <p className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-block">
            {displayPainPoints.length + displayValueProps.length - 2} more items available for editing after creation
          </p>
        </div>
      )}
    </div>
    )
  }

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
                ? 'shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={selectedPainPoint === painPoint.id ? { borderColor: 'rgb(37, 99, 235)', background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' } : {}}
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
      
      <Card className="border-2 shadow-lg" style={{ borderColor: 'rgb(37, 99, 235)', background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' }}>
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
                ? 'shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={selectedOutreachStrategy === strategy.id ? { borderColor: 'rgb(37, 99, 235)', background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' } : {}}
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
      // Use AI-generated email sequences if available
      const emailSequences = aiAssets?.email_sequences || []
      
      if (emailSequences.length > 0) {
        const steps = [{ type: "start", title: "Sequence start" }]
        
        emailSequences.forEach((email: any, index: number) => {
          steps.push({
            type: "timing",
            text: email.timing_days === 0 ? "Immediately" : `Wait for ${email.timing_days} day${email.timing_days > 1 ? 's' : ''}`,
            color: "text-blue-600"
          })
          steps.push({
            type: "action",
            icon: "📧",
            title: "Email",
            subtitle: email.subject,
            iconBg: "bg-green-50",
            iconColor: "text-green-600",
            message: email.content
          })
        })
        
        return steps
      }

      // Fallback to default email sequence
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
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-medium text-gray-900">
            {aiAssets?.email_sequences ? 'AI-Generated Sequence Preview' : `Sequence Preview - ${strategyTitle}`}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {aiAssets?.email_sequences ? 'Review your AI-generated automated outreach sequence' : 'Review your automated outreach sequence'}
          </p>
        </div>

        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 rounded-xl flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <p className="text-blue-900 font-medium text-sm">
                {aiAssets?.email_sequences ? 'This AI-generated sequence will run automatically for each lead' : 'This sequence will run automatically for each lead'}
              </p>
              <p className="text-blue-700 mt-1 text-xs">You can edit individual steps or timing after creation</p>
            </div>
          </div>
        </div>
        
        {/* Compact sequence display - optimized to fit without scrolling */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-2xl p-4">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
            
            <div className="space-y-2">
              {sequenceSteps.slice(0, 6).map((step, index) => {
                if (step.type === "start") {
                  return (
                    <div key={index} className="relative flex items-center mb-2">
                      <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3 relative z-10">
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                      </div>
                      <div className="bg-white/90 border border-gray-100 rounded-lg px-2 py-1 shadow-sm">
                        <span className="text-gray-600 font-medium text-xs">{step.title}</span>
                      </div>
                    </div>
                  )
                }

                if (step.type === "timing") {
                  return (
                    <div key={index} className="relative flex items-center mb-1">
                      <div className="w-4 h-4 border-2 border-gray-300 bg-white rounded-full flex items-center justify-center mr-3 relative z-10">
                        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                      </div>
                      <span className={`font-medium text-xs ${step.color || 'text-gray-600'}`}>
                        {step.text}
                      </span>
                    </div>
                  )
                }

                if (step.type === "action") {
                  return (
                    <div key={index} className="relative flex items-start mb-2">
                      <div className={`w-4 h-4 ${step.iconBg || 'bg-green-50'} rounded-full flex items-center justify-center mr-3 relative z-10 border border-gray-200`}>
                        <span className="text-xs">{step.icon}</span>
                      </div>
                      <div className="bg-white/90 border border-gray-100 rounded-lg p-2 shadow-sm flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-xs">{step.title}</h4>
                            <p className="text-gray-500 text-xs mt-0.5 truncate">{step.subtitle}</p>
                            {step.platform && (
                              <div className="flex items-center space-x-1 mt-0.5">
                                <span className="text-blue-600 text-xs font-medium">via</span>
                                <span className="text-gray-400 text-xs">{step.platform}</span>
                              </div>
                            )}
                          </div>
                          {step.message && (
                            <div className="ml-2">
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
                                className="text-xs px-1.5 py-0.5 h-4 border-gray-200" 
                                style={{ color: 'rgb(37, 99, 235)', borderColor: 'rgba(87, 140, 255, 0.2)' }} 
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(87, 140, 255, 0.05)'} 
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Eye className="w-2 h-2 mr-0.5" />
                                View
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                )
              }

              return null
            })}
            
            {/* Show indicator if there are more steps */}
            {sequenceSteps.length > 6 && (
              <div className="relative flex items-center text-center justify-center mt-2">
                <div className="w-4 h-4 border-2 border-gray-300 bg-white rounded-full flex items-center justify-center mr-3 relative z-10">
                  <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  +{sequenceSteps.length - 6} more steps
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    )
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{zIndex: 9999}}>
      <div className="bg-white/90 backdrop-blur-xl border border-gray-100/20 rounded-3xl w-full max-w-7xl h-[85vh] max-h-[720px] overflow-hidden flex shadow-2xl relative">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 transition-all duration-300 bg-white/90 backdrop-blur-xl hover:bg-gray-50/90 rounded-xl p-2 shadow-sm border border-gray-100/30"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex w-full">
          {/* Sidebar */}
          <div className="w-80 bg-gray-50/80 backdrop-blur-xl border-r border-gray-100/30 h-full overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider font-semibold text-blue-600">GET STARTED</p>
                <h1 className="text-2xl font-medium text-gray-900">
                  Campaign creation
                </h1>
              </div>
              
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const isCompleted = completedSteps.includes(step.id)
                  const isCurrent = currentStep === step.id
                  const isClickable = isCompleted || step.id === "company"
                  
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center space-x-3 cursor-pointer transition-all duration-300 ${
                        isClickable ? 'hover:bg-white/40 hover:shadow-sm' : 'cursor-not-allowed'
                      } p-3 rounded-xl group`}
                      onClick={() => handleStepClick(step.id)}
                    >
                      <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-blue-600 border-blue-600 shadow-blue-200' 
                          : isCurrent 
                            ? 'bg-blue-600 border-blue-600 shadow-blue-200' 
                            : 'border-gray-300 bg-white group-hover:border-blue-300 group-hover:bg-blue-50'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-3 h-3 text-white" />
                        ) : isCurrent ? (
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        ) : (
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-blue-400 transition-colors" />
                        )}
                      </div>
                      <span className={`text-sm transition-colors ${
                        isCurrent 
                          ? 'font-semibold text-blue-600' 
                          : isCompleted 
                            ? 'text-gray-900' 
                            : 'text-gray-600 group-hover:text-blue-600'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              
              {/* Helper text */}
              <div className="mt-5 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/30 shadow-sm">
                <p className="text-sm text-gray-600 leading-relaxed">
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
              <div className="flex items-center space-x-3 mt-5 p-3 rounded-2xl border bg-blue-50/80 backdrop-blur-sm border-blue-200/30">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-600">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-600">
                  AI Copilot
                </span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
            {/* Scrollable content area */}
            <div className="flex-1 p-6 overflow-y-auto">
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
            </div>
            
            {/* Fixed navigation buttons at bottom */}
            <div className="border-t border-gray-100/30 bg-white/80 backdrop-blur-xl px-6 py-4">
              <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  className={`border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 rounded-2xl px-5 py-2.5 font-medium ${
                    currentStep === "company" && showForm ? "invisible" : ""
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleContinue}
                  disabled={isProcessing || isCreatingCampaign}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl shadow-lg disabled:opacity-50"
                >
                  <span>
                    {isCreatingCampaign && currentStep === "company" && showForm
                      ? "Generating..."
                      : isProcessing 
                        ? "Loading..." 
                        : currentStep === "sequence" 
                          ? "Create Campaign" 
                          : "Continue"
                    }
                  </span>
                  {!isProcessing && !isCreatingCampaign && <ChevronRight className="w-4 h-4 ml-2" />}
                  {(isProcessing || isCreatingCampaign) && <Brain className="w-4 h-4 text-white animate-pulse ml-2" />}
                </Button>
              </div>
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

  return createPortal(modalContent, document.body)
}
"use client"

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

import React, { useState, useCallback, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { UpgradeProDialog } from "@/components/upgrade-pro-dialog"
import {
  MessageSquareText,
  Mail,
  QrCode,
  Crown,
  Zap,
  ChevronDown,
  Clock,
  GitBranch,
  GripVertical,
  Plus,
  Copy,
  Download,
  Share2,
  Send,
} from "lucide-react"
import dynamic from "next/dynamic"

// Dynamic import for QR code to avoid SSR issues with fallback
const QRCodeSVG = dynamic(
  () => {
    try {
      return import("qrcode.react").then((mod) => {
        // Try different ways to access the QRCodeSVG component
        if (mod.QRCodeSVG) {
          return { default: mod.QRCodeSVG }
        } else if (mod.default?.QRCodeSVG) {
          return { default: mod.default.QRCodeSVG }
        } else if (mod.default) {
          return { default: mod.default }
        } else {
          throw new Error('QRCodeSVG component not found in module')
        }
      })
    } catch (error) {
      console.error('Error:', error)
      // Return a fallback component
      return Promise.resolve({
        default: () => (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded">
            <div className="text-sm">QR Code temporarily unavailable</div>
            <div className="text-xs mt-1">Please refresh the page</div>
          </div>
        )
      })
    }
  },
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading QR Code...</div>
      </div>
    )
  }
)

// --- Type Definitions ---
export interface WorkflowStep {
  id: string
  type: "sms" | "email" | "wait" | "branch"
  isOpen: boolean
  subject?: string
  content: string
  days?: number
  branchDecision?: "yes" | "no" | null
}

export interface Contact {
  name: string
  number?: string // For SMS
  email?: string // For Email
}

// --- Components ---

// Component for the phone mockup displaying SMS content
function SmsPhonePreview({
  sender,
  message,
  reviewLink,
}: {
  sender: string
  message: string
  reviewLink: string
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-900">
      {/* Phone header */}
      <div className="flex w-full items-center justify-between border-b bg-gray-50 dark:bg-gray-800 p-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
        <span className="text-gray-500 dark:text-gray-400">Messages</span>
        <span className="text-gray-500 dark:text-gray-400">9:41 AM</span>
      </div>
      {/* Message content */}
      <div className="flex flex-1 flex-col justify-center p-4">
        <div className="max-w-[85%] rounded-2xl bg-gray-100 dark:bg-gray-700 p-4 text-sm text-gray-800 dark:text-gray-200 shadow-sm">
          <p className="mb-2 font-semibold">{sender}</p>
          <p className="leading-relaxed">{message}</p>
          <p className="mt-3 break-all font-medium underline" style={{ color: 'rgb(87, 140, 255)' }}>{reviewLink}</p>
        </div>
      </div>
    </div>
  )
}

// Component for the email mockup displaying email content
function EmailPreview({
  senderEmail,
  subject,
  message,
  reviewLink,
}: {
  senderEmail: string
  subject: string
  message: string
  reviewLink: string
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-900">
      {/* Email Header */>
      <div className="bg-black p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{subject}</h3>
            <p className="text-xs text-white/80">From: {senderEmail}</p>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Subject: {subject}</h4>
          <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            <p>{message}</p>
            <div className="mt-3 rounded-lg p-2" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)' }}>
              <p className="break-all text-xs font-medium underline" style={{ color: 'rgb(87, 140, 255)' }}>{reviewLink}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ReviewCampaignHeaderProps {
  onSaveConfiguration: () => void
  isSaving: boolean
}

function ReviewCampaignHeader({ onSaveConfiguration, isSaving }: ReviewCampaignHeaderProps) {
  const [userInfo, setUserInfo] = useState<{
    subscription_type?: string;
    subscription_status?: string;
  }>({})

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" })
        
        if (!response.ok) {
          return
        }
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          return
        }
        
        const data = await response.json()
        if (data.success && data.user) {
          setUserInfo({
            subscription_type: data.user.subscription_type,
            subscription_status: data.user.subscription_status,
          })
        }
      } catch (error) {
        console.error("Error fetching user info:", error)
      }
    }
    fetchUserInfo()
  }, [])

  const hasActiveSubscription = userInfo.subscription_type &&
    userInfo.subscription_type !== 'free' &&
    userInfo.subscription_status === 'active'

  return (
    <div className="flex items-center justify-between pb-6">
      <div className="flex items-center gap-4">
      <Button
            variant="outline"
            className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-lg font-semibold hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Campaign Settings
          </Button>
      </div>
      {!hasActiveSubscription && (
        <div className="flex items-center gap-2">
          <UpgradeProDialog>
            <Button
              variant="outline"
              className="gap-2 rounded-full border-violet-300 bg-violet-50 text-violet-600 shadow-sm hover:bg-violet-100"
            >
              <Crown className="h-4 w-4" />
              Try Pro for free
            </Button>
          </UpgradeProDialog>
        </div>
      )}
    </div>
  )
}

interface QrCodeTabProps {
  reviewLink: string
  qrCodeData: string | null
  companyName: string
  loadingReviewLink: boolean
}

function QrCodeTab({ reviewLink, qrCodeData, companyName, loadingReviewLink }: QrCodeTabProps) {
  const { toast } = useToast()

  const handleDownloadQR = () => {
    if (!qrCodeData || !reviewLink) {
      toast({
        title: "QR Code Not Available",
        description: "Please wait for the QR code to load.",
        variant: "destructive",
      })
      return
    }
    // Create a canvas element to generate the QR code image
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // Set canvas size
    const size = 256
    canvas.width = size
    canvas.height = size
    // Create QR code using qrcode library
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvas, reviewLink, { width: size }, (error) => {
        if (error) {
          toast({
            title: "Download Failed",
            description: "Failed to generate QR code image.",
            variant: "destructive",
          })
          return
        }
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          if (!blob) return

          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `review-qr-code-${Date.now()}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast({
            title: "QR Code Downloaded",
            description: "QR code image has been saved to your downloads.",
          })
        })
      })
    })
  }

  const handleCopyLink = async () => {
    if (!reviewLink) {
      toast({
        title: "Link Not Available",
        description: "Please wait for the review link to load.",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(reviewLink)
      toast({
        title: "Link Copied",
        description: "Review link has been copied to your clipboard.",
      })
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea")
      textArea.value = reviewLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)

      toast({
        title: "Link Copied",
        description: "Review link has been copied to your clipboard.",
      })
    }
  }

  const handleShare = async () => {
    if (!reviewLink) {
      toast({
        title: "Link Not Available",
        description: "Please wait for the review link to load.",
        variant: "destructive",
      })
      return
    }
    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${companyName} - Leave us a review`,
          text: `Please take a moment to leave ${companyName} a review!`,
          url: reviewLink,
        })
        toast({
          title: "Shared Successfully",
          description: "Review link has been shared.",
        })
      } catch (error: any) {
        if (error.name !== "AbortError") {
          // Fallback to copy if share was cancelled or failed
          handleCopyLink()
        }
      }
    } else {
      // Fallback to copy link if Web Share API is not supported
      handleCopyLink()
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-4 text-center">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">QR Code Campaign</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">Generate and share QR codes for easy review access</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              {loadingReviewLink ? (
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#9198e5]" />
              ) : reviewLink ? (
                <QRCodeSVG
                  value={reviewLink}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin={true}
                />
              ) : (
                <QrCode className="h-24 w-24 text-gray-400" />
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Review Link:</p>
                  <p className="break-all font-mono text-sm text-violet-800">
                    {loadingReviewLink ? "Loading..." : reviewLink}
                  </p>
                  {!loadingReviewLink && reviewLink && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Customers can scan this QR code or visit this link to leave reviews
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 transition-colors hover:border-violet-300 hover:bg-violet-50 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-full"
                  onClick={handleDownloadQR}
                  disabled={loadingReviewLink || !reviewLink}
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 transition-colors hover:border-violet-300 hover:bg-violet-50 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-full"
                  onClick={handleCopyLink}
                  disabled={loadingReviewLink || !reviewLink}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 transition-colors hover:border-violet-300 hover:bg-violet-50 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-full"
                  onClick={handleShare}
                  disabled={loadingReviewLink || !reviewLink}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface LivePreviewPanelProps {
  previewContent: { step: WorkflowStep; type: "sms" | "email" } | null
  activeSubTab: string
  companyName: string
  reviewLink: string
  smsSenderName: string
  emailSenderEmail: string
  emailSubject: string
  smsMessageTemplate: string
  emailMessageTemplate: string
  loadingReviewLink: boolean
}

function LivePreviewPanel({
  previewContent,
  activeSubTab,
  companyName,
  reviewLink,
  smsSenderName,
  emailSenderEmail,
  emailSubject,
  smsMessageTemplate,
  emailMessageTemplate,
  loadingReviewLink,
}: LivePreviewPanelProps) {
  return (
    <div className="sticky top-6 flex h-fit w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 to-blue-50 p-6 shadow-lg border border-violet-100">
      <div className="relative flex h-[650px] w-[320px] items-center justify-center rounded-[40px] border-[10px] border-gray-800 bg-black shadow-2xl overflow-hidden">
        {/* iPhone Bezel */}
        <div className="pointer-events-none absolute inset-0 rounded-[35px] border-[2px] border-gray-700"></div>
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-10 flex h-[25px] w-[120px] -translate-x-1/2 items-center justify-center rounded-b-xl bg-black">
          <div className="h-1 w-10 rounded-full bg-gray-700" />
        </div>
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-white dark:bg-gray-900">
          {(() => {
            const shouldShowSms = previewContent ? previewContent.type === "sms" : activeSubTab === "sms"
            const shouldShowEmail = previewContent ? previewContent.type === "email" : activeSubTab === "email"

            if (shouldShowSms) {
              return (
                <SmsPhonePreview
                  sender={smsSenderName || companyName || "Your Business"}
                  message={
                    (previewContent && previewContent.type === "sms" ? previewContent.step.content : smsMessageTemplate)
                      .replace(/\{\{customerName\}\}/g, "John Smith")
                      .replace(/\{\{companyName\}\}/g, companyName || "Your Business")
                      .replace(/\{\{reviewUrl\}\}/g, reviewLink || "https://your-review-link.com")
                      .replace(/\[Name\]/g, "John Smith")
                      .replace(/\[Company\]/g, companyName || "Your Business")
                      .replace(/\[reviewUrl\]/g, reviewLink || "https://your-review-link.com") || "Your message will appear here"
                  }
                  reviewLink={reviewLink}
                />
              )
            } else if (shouldShowEmail) {
              return (
                <EmailPreview
                  senderEmail={emailSenderEmail || "hello@yourbusiness.com"}
                  subject={
                    (previewContent && previewContent.type === "email" ? previewContent.step.subject : emailSubject) ||
                    "We'd love your feedback!"
                  }
                  message={
                    (previewContent && previewContent.type === "email"
                      ? previewContent.step.content
                      : emailMessageTemplate
                    )
                      .replace(/\{\{customerName\}\}/g, "John Smith")
                      .replace(/\{\{companyName\}\}/g, companyName || "Your Business")
                      .replace(/\{\{reviewUrl\}\}/g, reviewLink || "https://your-review-link.com")
                      .replace(/\[Name\]/g, "John Smith")
                      .replace(/\[Company\]/g, companyName || "Your Business")
                      .replace(/\[reviewUrl\]/g, reviewLink || "https://your-review-link.com") || "Your message will appear here"
                  }
                  reviewLink={reviewLink}
                />
              )
            } else if (activeSubTab === "qr-code") {
              return (
                <div className="flex h-full items-center justify-center p-4">
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                      {loadingReviewLink ? (
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#9198e5]" />
                      ) : reviewLink ? (
                        <QRCodeSVG
                          value={reviewLink}
                          size={180}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="M"
                          includeMargin={true}
                        />
                      ) : (
                        <QrCode className="h-16 w-16 text-gray-400" />
                      )}
                    </div>
                    <div className="px-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Scan to leave a review</p>
                      <p className="mt-1 break-all text-xs text-gray-600 dark:text-gray-400">{reviewLink}</p>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })()}
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Live Preview</p>
          <p className="mt-1 text-xs text-gray-500">
            See how your {activeSubTab === "sms" ? "SMS" : activeSubTab === "email" ? "email" : "QR code"} will appear
          </p>
        </div>
      </div>
    </div>
  )
}

interface WorkflowEditorProps {
  sequence: WorkflowStep[]
  type: "sms" | "email"
  onToggleStep: (stepId: string) => void
  onContentChange: (stepId: string, content: string) => void
  onSubjectChange?: (stepId: string, subject: string) => void // Optional for SMS
  onDaysChange: (stepId: string, days: number) => void // New prop for updating wait days
  onBranchDecision: (branchId: string, decision: "yes" | "no", type: "sms" | "email") => void
  onPreviewStep: (stepId: string, type: "sms" | "email") => void
  initialTriggerDisplay: React.ReactNode // New prop for the initial trigger display
}

function WorkflowEditor({
  sequence,
  type,
  onToggleStep,
  onContentChange,
  onSubjectChange,
  onDaysChange,
  onBranchDecision,
  onPreviewStep,
  initialTriggerDisplay,
}: WorkflowEditorProps) {

  // Function to insert placeholder at cursor position
  const insertPlaceholder = (stepId: string, placeholder: string) => {
    const step = sequence.find(s => s.id === stepId)
    if (!step) return

    // Get the textarea element
    const textarea = document.getElementById(`content-${stepId}`) as HTMLTextAreaElement
    if (!textarea) return

    const startPos = textarea.selectionStart
    const endPos = textarea.selectionEnd
    const currentContent = step.content

    // Insert placeholder at cursor position
    const newContent = currentContent.substring(0, startPos) + placeholder + currentContent.substring(endPos)

    // Update the content
    onContentChange(stepId, newContent)

    // Set cursor position after the inserted placeholder
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(startPos + placeholder.length, startPos + placeholder.length)
    }, 0)
  }
  return (
    <div className="grid gap-4">
      {/* Use the new prop here for the initial trigger display */}
      <div className="flex items-center justify-center rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        {initialTriggerDisplay}
      </div>
      {sequence.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="relative">
            {step.type === type ? (
              <Collapsible
                open={step.isOpen}
                onOpenChange={() => onToggleStep(step.id)}
                className="rounded-xl border bg-white dark:bg-gray-800 text-card-foreground shadow-sm"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex cursor-pointer items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {type === "sms" ? (
                        <MessageSquareText className="h-5 w-5 text-primary" />
                      ) : (
                        <Mail className="h-5 w-5 text-primary" />
                      )}
                      <div className="grid gap-1">
                        <h3 className="text-base font-semibold">
                          {step.id.includes("followup")
                            ? `Follow-up ${type === "sms" ? "SMS" : "Email"}`
                            : `Step ${index + 1} Automated ${type === "sms" ? "SMS" : "email"}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {type === "sms" ? step.content.substring(0, 50) + "..." : step.subject}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${step.isOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t p-4">
                  <div className="grid gap-4">
                    {type === "email" && (
                      <div className="grid gap-2">
                        <Label htmlFor={`subject-${step.id}`}>Subject</Label>
                        <Input
                          id={`subject-${step.id}`}
                          value={step.subject || ""}
                          onChange={(e) => onSubjectChange?.(step.id, e.target.value)}
                          className="rounded-lg border-gray-200 dark:border-gray-600 focus:border-violet-300 focus:ring-violet-100 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor={`content-${step.id}`}>Message Content</Label>
                      <Textarea
                        id={`content-${step.id}`}
                        value={step.content}
                        onChange={(e) => onContentChange(step.id, e.target.value)}
                        className={`${type === "sms" ? "min-h-[120px]" : "min-h-[200px]"} rounded-lg border-gray-200 dark:border-gray-600 focus:border-violet-300 focus:ring-violet-100 dark:bg-gray-700 dark:text-gray-100`}
                      />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-violet-50 dark:hover:bg-violet-900 hover:border-violet-300 rounded-full px-2">
                              <Plus className="mr-1 h-3 w-3" /> Insert Placeholder
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => insertPlaceholder(step.id, "[Name]")}>
                              <span className="font-mono" style={{ color: 'rgb(87, 140, 255)' }}>[Name]</span> - Customer name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertPlaceholder(step.id, "[Company]")}>
                              <span className="font-mono" style={{ color: 'rgb(87, 140, 255)' }}>[Company]</span> - Company name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertPlaceholder(step.id, "[reviewUrl]")}>
                              <span className="font-mono" style={{ color: 'rgb(87, 140, 255)' }}>[reviewUrl]</span> - Review link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertPlaceholder(step.id, "{{customerName}}")}>
                              <span className="text-green-600 font-mono">{"{{customerName}}"}</span> - Customer name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertPlaceholder(step.id, "{{companyName}}")}>
                              <span className="text-green-600 font-mono">{"{{companyName}}"}</span> - Company name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertPlaceholder(step.id, "{{reviewUrl}}")}>
                              <span className="text-green-600 font-mono">{"{{reviewUrl}}"}</span> - Review link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPreviewStep(step.id, type)}
                        className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-violet-50 dark:hover:bg-violet-900 hover:border-violet-300 rounded-full"
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : step.type === "wait" ? (
              <Collapsible
                open={step.isOpen}
                onOpenChange={() => onToggleStep(step.id)}
                className="rounded-xl border border-violet-200 bg-violet-50 text-violet-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex cursor-pointer items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Clock className="h-5 w-5 text-violet-600" />
                      <h3 className="text-base font-semibold">Wait {step.days} business days</h3>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${step.isOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t p-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`wait-days-${step.id}`}>Number of business days to wait</Label>
                    <Input
                      id={`wait-days-${step.id}`}
                      type="number"
                      min="1"
                      value={step.days || 1}
                      onChange={(e) => onDaysChange(step.id, Number(e.target.value))}
                      className="w-24 rounded-lg border-gray-200 dark:border-gray-600 focus:border-violet-300 focus:ring-violet-100 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : step.type === "branch" ? (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitBranch className="h-5 w-5 text-orange-600" />
                    <div>
                      <h3 className="text-base font-semibold">{step.content}</h3>
                      <p className="text-sm text-muted-foreground">Choose to add a follow-up message</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant={step.branchDecision === "yes" ? "default" : "outline"}
                    className={
                      step.branchDecision === "yes" ? "bg-violet-600 hover:bg-violet-700 text-white rounded-full" : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-violet-50 dark:hover:bg-violet-900 hover:border-violet-300 rounded-full"
                    }
                    onClick={() => onBranchDecision(step.id, "yes", type)}
                  >
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant={step.branchDecision === "no" ? "default" : "outline"}
                    className={
                      step.branchDecision === "no" ? "bg-gray-600 hover:bg-gray-700 text-white rounded-full" : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 rounded-full"
                    }
                    onClick={() => onBranchDecision(step.id, "no", type)}
                  >
                    No
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Connector Arrow - Show after SMS/Email steps and before wait steps */}
          {(() => {
            const nextStep = sequence[index + 1]
            const showConnector =
              (step.type === type &&
                nextStep &&
                (nextStep.type === "branch" || nextStep.type === "wait" || nextStep.type === type)) ||
              (step.type === "branch" &&
                step.branchDecision === "yes" &&
                nextStep &&
                (nextStep.type === type || nextStep.type === "wait")) ||
              (step.type === "wait" && nextStep && (nextStep.type === type || nextStep.type === "branch"))

            return showConnector ? (
              <div className="flex justify-center py-2">
                <div className="relative h-8 w-0.5 rounded-full bg-gradient-to-b from-violet-300 to-violet-400 dark:from-gray-600 dark:to-gray-500">
                  <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 transform rotate-45 bg-violet-400 dark:bg-gray-500"></div>
                </div>
              </div>
            ) : null
          })()}
        </React.Fragment>
      ))}
    </div>
  )
}

interface EmailCampaignTabProps {
  reviewLink: string
  companyName: string
  isSending: boolean
  onPreviewStep: (stepId: string, type: "sms" | "email") => void
  emailSenderEmail: string
  setEmailSenderEmail: (email: string) => void
  emailSubject: string
  setEmailSubject: (subject: string) => void
  emailMessageTemplate: string
  setEmailMessageTemplate: (template: string) => void
  emailContacts: Contact[]
  setEmailContacts: (contacts: Contact[]) => void
  emailConsentChecked: boolean
  setEmailConsentChecked: (checked: boolean) => void
  emailSequence: WorkflowStep[]
  setEmailSequence: (sequence: WorkflowStep[]) => void
  onSendRequests: (
    type: "sms" | "email",
    contacts: Contact[],
    content: string,
    subject?: string,
    fromEmail?: string,
    senderName?: string,
  ) => Promise<void>
  onSaveTemplate: (
    type: "sms" | "email",
    data: { senderName?: string; content?: string; subject?: string; fromEmail?: string },
  ) => Promise<void>
  onUploadCsv: (event: React.ChangeEvent<HTMLInputElement>, type: "sms" | "email") => Promise<void>
  uploadingCsv: boolean
  csvErrors: string[]
  emailInitialTrigger: "immediate" | "wait"
  setEmailInitialTrigger: (type: "immediate" | "wait") => void
  emailInitialWaitDays: number
  setEmailInitialWaitDays: (days: number) => void
}

function EmailCampaignTab({
  reviewLink,
  companyName,
  isSending,
  onPreviewStep,
  emailSenderEmail,
  setEmailSenderEmail,
  emailSubject,
  setEmailSubject,
  emailMessageTemplate,
  setEmailMessageTemplate,
  emailContacts,
  setEmailContacts,
  emailConsentChecked,
  setEmailConsentChecked,
  emailSequence,
  setEmailSequence,
  onSendRequests,
  onSaveTemplate,
  onUploadCsv,
  uploadingCsv,
  csvErrors,
  emailInitialTrigger,
  setEmailInitialTrigger,
  emailInitialWaitDays,
  setEmailInitialWaitDays,
}: EmailCampaignTabProps) {
  const { toast } = useToast()

  const [isSavingEmailTemplate, setIsSavingEmailTemplate] = useState(false)

  const handleToggleEmailStep = (stepId: string) => {
    setEmailSequence((prev) => prev.map((step) => (step.id === stepId ? { ...step, isOpen: !step.isOpen } : step)))
  }

  const handleEmailSubjectChange = (stepId: string, subject: string) => {
    setEmailSequence((prev) => prev.map((step) => (step.id === stepId ? { ...step, subject } : step)))

    // Also update the main subject state if this is the first email step
    if (stepId === "1") {
      setEmailSubject(subject)
    }
  }

  const handleEmailContentChange = (stepId: string, content: string) => {
    setEmailSequence((prev) => prev.map((step) => (step.id === stepId ? { ...step, content } : step)))

    // Also update the main template state if this is the first email step
    if (stepId === "1") {
      setEmailMessageTemplate(content)
    }
  }

  const handleEmailDaysChange = (stepId: string, days: number) => {
    setEmailSequence((prev) => prev.map((step) => (step.id === stepId ? { ...step, days } : step)))
  }

  const handleBranchDecision = (branchId: string, decision: "yes" | "no", type: "sms" | "email") => {
    setEmailSequence((prev) => {
      const branchIndex = prev.findIndex((step) => step.id === branchId)
      if (branchIndex === -1) return prev

      const updatedSteps = prev.map((step) => (step.id === branchId ? { ...step, branchDecision: decision } : step))

      if (decision === "yes") {
        const stepsAfterBranch = updatedSteps.slice(branchIndex + 1)
        const hasExistingFollowup = stepsAfterBranch.some(
          (step) => step.id.includes(`followup-${branchId}`) || step.id.includes(`wait-${branchId}`),
        )

        if (hasExistingFollowup) {
          return updatedSteps
        }

        const stepsBeforeBranch = updatedSteps.slice(0, branchIndex + 1)
        const stepsAfterBranchOriginal = updatedSteps.slice(branchIndex + 1)

        const newSteps: WorkflowStep[] = []

        newSteps.push({
          id: `wait-${branchId}-${Date.now()}`,
          type: "wait",
          isOpen: true,
          content: "",
          days: 3,
        })
        newSteps.push({
          id: `email-followup-${branchId}-${Date.now()}`,
          type: "email",
          isOpen: true,
          subject: "Follow-up: How was your experience with [Company]?",
          content:
            "Hi [Name],\n\nJust a friendly reminder about sharing your thoughts on your experience with [Company].\n\nYour feedback helps us improve and lets others know what to expect.\n\nLeave a review: [reviewUrl]\n\nThanks for your time,\nThe [Company] Team",
        })

        return [...stepsBeforeBranch, ...newSteps, ...stepsAfterBranchOriginal]
      } else {
        return updatedSteps.filter(
          (step) =>
            !step.id.startsWith(`email-followup-${branchId}`) &&
            !step.id.startsWith(`wait-${branchId}`) &&
            !step.id.startsWith(`branch-${branchId}`),
        )
      }
    })
  }

  const handleContactChange = (index: number, field: string, value: string) => {
    setEmailContacts((prev) => prev.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)))
  }

  const addContact = () => {
    setEmailContacts((prev) => [...prev, { name: "", email: "" }])
  }

  const removeContact = (index: number) => {
    setEmailContacts((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveEmailTemplate = async () => {
    setIsSavingEmailTemplate(true)
    try {
      await onSaveTemplate("email", {
        fromEmail: emailSenderEmail,
        subject: emailSubject,
        content: emailMessageTemplate,
      })
    } finally {
      setIsSavingEmailTemplate(false)
    }
  }

  const initialTriggerDisplay =
    emailInitialTrigger === "immediate" ? (
      "Start immediately after enrollment"
    ) : (
      <>
        <Clock className="mr-2 h-4 w-4" /> Wait {emailInitialWaitDays} business days
      </>
    )

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:grid-cols-1 xl:col-span-2">
      <Card className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Campaign Start</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose when the campaign should begin.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <RadioGroup
            value={emailInitialTrigger}
            onValueChange={(value: "immediate" | "wait") => setEmailInitialTrigger(value)}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="immediate" id="email-trigger-immediate" />
              <Label htmlFor="email-trigger-immediate">Start immediately after enrollment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="wait" id="email-trigger-wait" />
              <Label htmlFor="email-trigger-wait">Wait a specified number of business days</Label>
            </div>
            {emailInitialTrigger === "wait" && (
              <div className="ml-6 flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={emailInitialWaitDays}
                  onChange={(e) => setEmailInitialWaitDays(Number(e.target.value))}
                  className="w-20 rounded-lg border-gray-200 dark:border-gray-600 focus:border-violet-300 focus:ring-violet-100 dark:bg-gray-700 dark:text-gray-100"
                />
                <Label>business days</Label>
              </div>
            )}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Email Workflow</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">Define the sequence of messages for your Email campaign.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <WorkflowEditor
            sequence={emailSequence}
            type="email"
            onToggleStep={handleToggleEmailStep}
            onContentChange={handleEmailContentChange}
            onSubjectChange={handleEmailSubjectChange}
            onDaysChange={handleEmailDaysChange}
            onBranchDecision={handleBranchDecision}
            onPreviewStep={onPreviewStep}
            initialTriggerDisplay={initialTriggerDisplay}
          />
        </CardContent>
      </Card>

      <Button
        onClick={handleSaveEmailTemplate}
        disabled={isSavingEmailTemplate}
        className="w-full rounded-full bg-violet-600 hover:bg-violet-700 text-white"
      >
        <Send className="mr-2 h-4 w-4" /> Save configuration
      </Button>
    </div>
  )
}

interface SmsCampaignTabProps {
  reviewLink: string
  companyName: string
  isSending: boolean
  onPreviewStep: (stepId: string, type: "sms" | "email") => void
  smsSenderName: string
  setSmsSenderName: (name: string) => void
  smsMessageTemplate: string
  setSmsMessageTemplate: (template: string) => void
  smsContacts: Contact[]
  setSmsContacts: (contacts: Contact[]) => void
  smsConsentChecked: boolean
  setSmsConsentChecked: (checked: boolean) => void
  smsSequence: WorkflowStep[]
  setSmsSequence: (sequence: WorkflowStep[]) => void
  onSendRequests: (
    type: "sms" | "email",
    contacts: Contact[],
    content: string,
    subject?: string,
    fromEmail?: string,
    senderName?: string,
  ) => Promise<void>
  onSaveTemplate: (
    type: "sms" | "email",
    data: { senderName?: string; content?: string; subject?: string; fromEmail?: string },
  ) => Promise<void>
  onUploadCsv: (event: React.ChangeEvent<HTMLInputElement>, type: "sms" | "email") => Promise<void>
  uploadingCsv: boolean
  csvErrors: string[]
  smsInitialTrigger: "immediate" | "wait"
  setSmsInitialTrigger: (type: "immediate" | "wait") => void
  smsInitialWaitDays: number
  setSmsInitialWaitDays: (days: number) => void
}

function SmsCampaignTab({
  reviewLink,
  companyName,
  isSending,
  onPreviewStep,
  smsSenderName,
  setSmsSenderName,
  smsMessageTemplate,
  setSmsMessageTemplate,
  smsContacts,
  setSmsContacts,
  smsConsentChecked,
  setSmsConsentChecked,
  smsSequence,
  setSmsSequence,
  onSendRequests,
  onSaveTemplate,
  onUploadCsv,
  uploadingCsv,
  csvErrors,
  smsInitialTrigger,
  setSmsInitialTrigger,
  smsInitialWaitDays,
  setSmsInitialWaitDays,
}: SmsCampaignTabProps) {
  const { toast } = useToast()

  const [isSavingSmsTemplate, setIsSavingSmsTemplate] = useState(false)

  const handleToggleSmsStep = (stepId: string) => {
    setSmsSequence((prev) => prev.map((step) => (step.id === stepId ? { ...step, isOpen: !step.isOpen } : step)))
  }

  const handleSmsContentChange = (stepId: string, content: string) => {
    setSmsSequence((prev) => prev.map((step) => (step.id === stepId ? { ...step, content } : step)))

    // Also update the main template state if this is the first SMS step
    if (stepId === "1") {
      setSmsMessageTemplate(content)
    }
  }

  const handleSmsDaysChange = (stepId: string, days: number) => {
    setSmsSequence((prev) => prev.map((step) => (step.id === stepId ? { ...step, days } : step)))
  }

  const handleBranchDecision = (branchId: string, decision: "yes" | "no", type: "sms" | "email") => {
    setSmsSequence((prev) => {
      const branchIndex = prev.findIndex((step) => step.id === branchId)
      if (branchIndex === -1) return prev

      const updatedSteps = prev.map((step) => (step.id === branchId ? { ...step, branchDecision: decision } : step))

      if (decision === "yes") {
        const stepsAfterBranch = updatedSteps.slice(branchIndex + 1)
        const hasExistingFollowup = stepsAfterBranch.some(
          (step) => step.id.includes(`followup-${branchId}`) || step.id.includes(`wait-${branchId}`),
        )

        if (hasExistingFollowup) {
          return updatedSteps
        }

        const stepsBeforeBranch = updatedSteps.slice(0, branchIndex + 1)
        const stepsAfterBranchOriginal = updatedSteps.slice(branchIndex + 1)

        const newSteps: WorkflowStep[] = []

        newSteps.push({
          id: `wait-${branchId}-${Date.now()}`,
          type: "wait",
          isOpen: true,
          content: "",
          days: 3,
        })
        newSteps.push({
          id: `sms-followup-${branchId}-${Date.now()}`,
          type: "sms",
          isOpen: true,
          content:
            "Hi [Name], just a quick follow-up - how was your experience with [Company]?\nWe'd love your feedback: [reviewUrl]",
        })

        return [...stepsBeforeBranch, ...newSteps, ...stepsAfterBranchOriginal]
      } else {
        return updatedSteps.filter(
          (step) =>
            !step.id.startsWith(`sms-followup-${branchId}`) &&
            !step.id.startsWith(`wait-${branchId}`) &&
            !step.id.startsWith(`branch-${branchId}`),
        )
      }
    })
  }

  const handleContactChange = (index: number, field: string, value: string) => {
    setSmsContacts((prev) => prev.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)))
  }

  const addContact = () => {
    setSmsContacts((prev) => [...prev, { name: "", number: "" }])
  }

  const removeContact = (index: number) => {
    setSmsContacts((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveSmsTemplate = async () => {
    setIsSavingSmsTemplate(true)
    try {
      await onSaveTemplate("sms", {
        senderName: smsSenderName,
        content: smsMessageTemplate,
      })
    } finally {
      setIsSavingSmsTemplate(false)
    }
  }

  const initialTriggerDisplay =
    smsInitialTrigger === "immediate" ? (
      "Start immediately after enrollment"
    ) : (
      <>
        <Clock className="mr-2 h-4 w-4" /> Wait {smsInitialWaitDays} business days
      </>
    )

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:grid-cols-1 xl:col-span-2">
      <Card className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Campaign Start</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose when the campaign should begin.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <RadioGroup
            value={smsInitialTrigger}
            onValueChange={(value: "immediate" | "wait") => setSmsInitialTrigger(value)}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="immediate" id="sms-trigger-immediate" />
              <Label htmlFor="sms-trigger-immediate">Start immediately after enrollment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="wait" id="sms-trigger-wait" />
              <Label htmlFor="sms-trigger-wait">Wait a specified number of business days</Label>
            </div>
            {smsInitialTrigger === "wait" && (
              <div className="ml-6 flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={smsInitialWaitDays}
                  onChange={(e) => setSmsInitialWaitDays(Number(e.target.value))}
                  className="w-20 rounded-lg border-gray-200 dark:border-gray-600 focus:border-violet-300 focus:ring-violet-100 dark:bg-gray-700 dark:text-gray-100"
                />
                <Label>business days</Label>
              </div>
            )}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">SMS Workflow</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">Define the sequence of messages for your SMS campaign.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <WorkflowEditor
            sequence={smsSequence}
            type="sms"
            onToggleStep={handleToggleSmsStep}
            onContentChange={handleSmsContentChange}
            onDaysChange={handleSmsDaysChange}
            onBranchDecision={handleBranchDecision}
            onPreviewStep={onPreviewStep}
            initialTriggerDisplay={initialTriggerDisplay}
          />
        </CardContent>
      </Card>

      <Button
        onClick={handleSaveSmsTemplate}
        disabled={isSavingSmsTemplate}
        className="w-full rounded-full bg-violet-600 hover:bg-violet-700 text-white"
      >
        <Send className="mr-2 h-4 w-4" /> Save configuration
      </Button>
    </div>
  )
}

// --- Main Page Component ---
export function GetReviewsTab() {
  const [activeSubTab, setActiveSubTab] = useState("email")
  const { toast } = useToast()

  // Global Review Link State
  const [reviewLink, setReviewLink] = useState("Loading...")
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("Your Company")
  const [loadingReviewLink, setLoadingReviewLink] = useState(true)

  // New states for initial trigger
  const [smsInitialTrigger, setSmsInitialTrigger] = useState<"immediate" | "wait">("immediate")
  const [smsInitialWaitDays, setSmsInitialWaitDays] = useState(3)

  const [emailInitialTrigger, setEmailInitialTrigger] = useState<"immediate" | "wait">("immediate")
  const [emailInitialWaitDays, setEmailInitialWaitDays] = useState(3)

  // SMS States
  const [smsSenderName, setSmsSenderName] = useState("")
  const [smsMessageTemplate, setSmsMessageTemplate] = useState(
    "Hi [Name], how was your experience with [Company]?\nWe'd love your quick feedback: [reviewUrl]\n\n",
  )
  const [smsContacts, setSmsContacts] = useState<Contact[]>([{ name: "", number: "" }])
  const [smsConsentChecked, setSmsConsentChecked] = useState(false)
  const [smsSequence, setSmsSequence] = useState<WorkflowStep[]>([
    {
      id: "1",
      type: "sms",
      isOpen: true,
      content: "Hi [Name], how was your experience with [Company]?\nWe'd love your quick feedback: [reviewUrl]\n\n",
    },
    {
      id: "branch-1",
      type: "branch",
      isOpen: true,
      content: "Add a follow-up sequence?",
      branchDecision: "no",
    },
  ])

  // Email States
  const [emailSenderEmail, setEmailSenderEmail] = useState("hello@uboard.com")
  const [emailSubject, setEmailSubject] = useState("How was your experience with [Company]?")
  const [emailMessageTemplate, setEmailMessageTemplate] = useState(
    "Hi [Name],\n\nWe hope you enjoyed your experience with [Company]. Could you take 30 seconds to share your thoughts?\n\nYour feedback helps us improve and lets others know what to expect.\n\nLeave a review: [reviewUrl]\n\nThanks for your time,\nThe [Company] Team",
  )
  const [emailContacts, setEmailContacts] = useState<Contact[]>([{ name: "", email: "" }])
  const [emailConsentChecked, setEmailConsentChecked] = useState(false)
  const [emailSequence, setEmailSequence] = useState<WorkflowStep[]>([
    {
      id: "1",
      type: "email",
      isOpen: true,
      subject: "How was your experience with [Company]?",
      content:
        "Hi [Name],\n\nWe hope you enjoyed your experience with [Company]. Could you take 30 seconds to share your thoughts?\n\nYour feedback helps us improve and lets others know what to expect.\n\nLeave a review: [reviewUrl]\n\nThanks for your time,\nThe [Company] Team",
    },
    {
      id: "branch-1",
      type: "branch",
      isOpen: true,
      content: "Add a follow-up sequence?",
      branchDecision: "no",
    },
  ])

  // Loading/Error States
  const [isSending, setIsSending] = useState(false)
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false)
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const [csvErrors, setCsvErrors] = useState<{ sms: string[]; email: string[] }>({ sms: [], email: [] })

  // Preview states
  const [previewStepId, setPreviewStepId] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<"sms" | "email">("sms")

  // Preview handlers
  const handlePreviewStep = useCallback((stepId: string, type: "sms" | "email") => {
    setPreviewStepId(stepId)
    setPreviewType(type)
  }, [])

  const getPreviewContent = useCallback(() => {
    if (!previewStepId) {
      if (activeSubTab === "sms") {
        const firstSmsStep = smsSequence.find((step) => step.type === "sms")
        return firstSmsStep ? { step: firstSmsStep, type: "sms" as const } : null
      } else if (activeSubTab === "email") {
        const firstEmailStep = emailSequence.find((step) => step.type === "email")
        return firstEmailStep ? { step: firstEmailStep, type: "email" as const } : null
      }
      return null
    }

    const smsStep = smsSequence.find((step) => step.id === previewStepId)
    const emailStep = emailSequence.find((step) => step.id === previewStepId)

    if (smsStep && previewType === "sms") {
      return { step: smsStep, type: "sms" as const }
    } else if (emailStep && previewType === "email") {
      return { step: emailStep, type: "email" as const }
    }

    return null
  }, [previewStepId, previewType, activeSubTab, smsSequence, emailSequence])

  // Reset preview when switching tabs
  useEffect(() => {
    setPreviewStepId(null)
    setPreviewType(activeSubTab as "sms" | "email")
  }, [activeSubTab])

  // Fetch review link data and campaign templates on component load
  useEffect(() => {
    const fetchReviewLinkAndCampaignData = async () => {
      setLoadingReviewLink(true)
      try {
        // Fetch review link data and campaign data in parallel
        const [reviewLinkResponse, campaignResponse] = await Promise.all([
          fetch('/api/review-link', {
            method: 'GET',
            credentials: 'include'
          }),
          fetch('/api/campaigns', {
            method: 'GET',
            credentials: 'include'
          })
        ])

        const reviewLinkResult = await reviewLinkResponse.json()
        const campaignResult = await campaignResponse.json()

        // Handle review link data
        if (reviewLinkResult.success && reviewLinkResult.data) {
          const url = reviewLinkResult.data.review_url || reviewLinkResult.data.url || "https://go.climbo.com/default-review"
          setReviewLink(url)
          setQrCodeData(reviewLinkResult.data.review_qr_code || reviewLinkResult.data.qr_code)
          const company = reviewLinkResult.data.company_name || reviewLinkResult.data.company || "Your Company"
          setCompanyName(company)
        } else {
          console.error("Failed to fetch review link data:", reviewLinkResult.error || 'Unknown error')
          setReviewLink("https://go.climbo.com/default-review")
          setCompanyName("Your Company")
        }

        // Handle campaign data
        if (campaignResult.success && campaignResult.data) {
          const { email, sms, settings } = campaignResult.data

          // Set email campaign data
          if (email) {
            setEmailSenderEmail(email.from_email || "hello@yourbusiness.com")
            setEmailSubject(email.subject || "We'd love your feedback!")
            setEmailMessageTemplate(email.content || "Hi [Name],\n\nThank you for choosing [Company]! We would greatly appreciate if you could take a moment to leave us a review.\n\nBest regards,\nThe [Company] Team")
            setEmailInitialTrigger(email.initial_trigger || "immediate")
            setEmailInitialWaitDays(email.initial_wait_days || 3)

            if (email.sequence) {
              try {
                const parsedSequence = JSON.parse(email.sequence)
                setEmailSequence(parsedSequence)
              } catch (e) {
                console.error("Error parsing email sequence:", e)
              }
            }
          }

          // Set SMS campaign data
          if (sms) {
            setSmsSenderName(sms.sender_name || companyName || "Your Company")
            setSmsMessageTemplate(sms.content || "Hi [Name], how was your experience with [Company]?\nWe'd love your quick feedback: [reviewUrl]\n\n")
            setSmsInitialTrigger(sms.initial_trigger || "immediate")
            setSmsInitialWaitDays(sms.initial_wait_days || 3)

            if (sms.sequence) {
              try {
                const parsedSequence = JSON.parse(sms.sequence)
                setSmsSequence(parsedSequence)
              } catch (e) {
                console.error("Error parsing SMS sequence:", e)
              }
            }
          }
        } else {
          console.error("Failed to fetch campaign data:", campaignResult.error || 'Unknown error')
        }

      } catch (error) {
        console.error("Error fetching data:", error)
        setReviewLink("https://go.climbo.com/default-review")
        setCompanyName("Your Company")
      } finally {
        setLoadingReviewLink(false)
      }
    }
    fetchReviewLinkAndCampaignData()
  }, [])

  const handleUploadCsv = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, type: "sms" | "email") => {
      setUploadingCsv(true)
      setCsvErrors((prev) => ({ ...prev, [type]: [] }))
      const file = event.target.files?.[0]
      if (!file) {
        toast({
          title: "No File Selected",
          description: "Please select a CSV file to upload.",
          variant: "destructive",
        })
        setUploadingCsv(false)
        return
      }
      try {
        const fileText = await file.text()
        const lines = fileText.split("\n").filter((line) => line.trim())

        if (lines.length === 0) {
          toast({
            title: "Empty File",
            description: "The CSV file appears to be empty.",
            variant: "destructive",
          })
          setUploadingCsv(false)
          return
        }
        const errorLog: string[] = []
        const processedContacts: Array<{ name: string; contact: string }> = []

        const startIndex =
          lines[0].toLowerCase().includes("name") ||
          lines[0].toLowerCase().includes("email") ||
          lines[0].toLowerCase().includes("phone")
            ? 1
            : 0

        lines.slice(startIndex).forEach((line, index) => {
          const actualRowNumber = startIndex + index + 1
          const parts = line.split(",").map((part) => part.trim().replace(/^"(.+)"$/, "$1"))

          if (parts.length < 2) {
            errorLog.push(
              `Row ${actualRowNumber}: Insufficient columns. Expected format: Name,${type === "sms" ? "Phone" : "Email"}`,
            )
            return
          }
          const name = parts[0]
          const contact = parts[1]
          if (!name || !contact) {
            errorLog.push(
              `Row ${actualRowNumber}: Missing ${!name ? "name" : type === "sms" ? "phone" : "email"} value`,
            )
            return
          }
          if (type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            const phoneRegex = /^[+]?[\d\s\-()]+$/

            if (!emailRegex.test(contact)) {
              if (phoneRegex.test(contact)) {
                errorLog.push(
                  `Row ${actualRowNumber}: Expected email but found phone number: ${contact}. Use the SMS tab for phone numbers.`,
                )
              } else {
                errorLog.push(`Row ${actualRowNumber}: Invalid email format: ${contact}`)
              }
              return
            }
          } else if (type === "sms") {
            const phoneRegex = /^[+]?[\d\s\-()]+$/
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

            if (!phoneRegex.test(contact) || contact.replace(/\D/g, "").length < 10) {
              if (emailRegex.test(contact)) {
                errorLog.push(
                  `Row ${actualRowNumber}: Expected phone but found email: ${contact}. Use the Email tab for email addresses.`,
                )
              } else {
                errorLog.push(`Row ${actualRowNumber}: Invalid phone format: ${contact}`)
              }
              return
            }
          }
          processedContacts.push({ name, contact })
        })
        if (type === "sms") {
          const newSmsContacts = processedContacts.map(({ name, contact }) => ({ name, number: contact }))
          setSmsContacts((prev) => {
            if (prev.length === 1 && !prev[0].name && !prev[0].number) {
              return newSmsContacts
            }
            return [...prev, ...newSmsContacts]
          })
        } else {
          const newEmailContacts = processedContacts.map(({ name, contact }) => ({ name, email: contact }))
          setEmailContacts((prev) => {
            if (prev.length === 1 && !prev[0].name && !prev[0].email) {
              return newEmailContacts
            }
            return [...prev, ...newEmailContacts]
          })
        }
        const successCount = processedContacts.length
        const errorCount = errorLog.length

        if (successCount > 0) {
          toast({
            title: "CSV Upload Successful",
            description: `${successCount} contact${successCount > 1 ? "s" : ""} added to the form${errorCount > 0 ? `. ${errorCount} row${errorCount > 1 ? "s" : ""} had errors.` : "."}`,
          })
        }
        if (errorCount > 0) {
          console.error("CSV Upload Errors:", errorLog)
          setCsvErrors((prev) => ({ ...prev, [type]: errorLog }))
          if (successCount === 0) {
            toast({
              title: "CSV Upload Failed",
              description: `All ${errorCount} row${errorCount > 1 ? "s" : ""} had errors. See details below.`,
              variant: "destructive",
            })
          }
        }
      } catch (err: any) {
        toast({
          title: "Upload Failed",
          description: err.message || "Failed to process CSV file.",
          variant: "destructive",
        })
      } finally {
        setUploadingCsv(false)
        event.target.value = ""
      }
    },
    [toast],
  )

  const handleSaveConfiguration = useCallback(async () => {
    setIsSavingConfiguration(true)
    try {
      if (activeSubTab === "sms") {
        // Get content from the first SMS step in sequence (what user actually edited)
        const firstSmsStep = smsSequence.find(step => step.type === "sms")
        const actualContent = firstSmsStep?.content || smsMessageTemplate

        const response = await fetch('/api/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'sms',
            data: {
              senderName: smsSenderName,
              content: actualContent,
              initialTrigger: smsInitialTrigger,
              initialWaitDays: smsInitialWaitDays,
              sequence: smsSequence
            }
          })
        })

        const result = await response.json()

        if (result.success) {
          toast({
            title: "SMS Configuration Saved",
            description: "Your SMS template has been saved successfully.",
          })
        } else {
          throw new Error(result.error || "Failed to save SMS configuration")
        }

      } else if (activeSubTab === "email") {
        // Get content from the first email step in sequence (what user actually edited)
        const firstEmailStep = emailSequence.find(step => step.type === "email")
        const actualContent = firstEmailStep?.content || emailMessageTemplate
        const actualSubject = firstEmailStep?.subject || emailSubject

        const response = await fetch('/api/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'email',
            data: {
              fromEmail: emailSenderEmail,
              subject: actualSubject,
              content: actualContent,
              initialTrigger: emailInitialTrigger,
              initialWaitDays: emailInitialWaitDays,
              sequence: emailSequence
            }
          })
        })

        const result = await response.json()

        if (result.success) {
          toast({
            title: "Email Configuration Saved",
            description: "Your email template has been saved successfully.",
          })
        } else {
          throw new Error(result.error || "Failed to save email configuration")
        }

      } else if (activeSubTab === "qr-code") {
        toast({
          title: "QR Code Settings Saved",
          description: "QR Code settings are automatically updated with review link changes.",
        })
      }
    } catch (error: any) {
      console.error(`❌ Error saving ${activeSubTab} configuration:`, error)
      toast({
        title: "Save Failed",
        description: error.message || `Failed to save ${activeSubTab} configuration.`,
        variant: "destructive",
      })
    } finally {
      setIsSavingConfiguration(false)
    }
  }, [activeSubTab, smsSenderName, smsMessageTemplate, emailSenderEmail, emailSubject, emailMessageTemplate, smsInitialTrigger, smsInitialWaitDays, smsSequence, emailInitialTrigger, emailInitialWaitDays, emailSequence, toast])

  const handleSendRequests = useCallback(
    async (
      type: "sms" | "email",
      contacts: Contact[],
      content: string,
      subject?: string,
      fromEmail?: string,
      senderName?: string,
    ) => {
      setIsSending(true)
      try {
        const validContacts = contacts.filter((contact) => {
          if (type === "sms") {
            return contact.name && contact.number
          } else {
            return contact.name && contact.email
          }
        })
        if (validContacts.length === 0) {
          toast({
            title: "No Valid Contacts",
            description: "Please add at least one valid contact before sending requests.",
            variant: "destructive",
          })
          return
        }

        let response, result
        if (type === "sms") {
          // Send actual SMS messages
          response = await fetch("/api/send-sms", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contacts: validContacts,
              content: content,
              sms_sender_name: senderName || smsSenderName,
            }),
          })

          result = await response.json()

          if (result.success) {
            const { successful_sends, failed_sends, errors } = result.data

            if (successful_sends > 0 && failed_sends === 0) {
              toast({
                title: "SMS Messages Sent Successfully",
                description: `${successful_sends} SMS message${successful_sends !== 1 ? "s" : ""} have been sent.`,
              })
            } else if (successful_sends > 0 && failed_sends > 0) {
              toast({
                title: "Partially Successful",
                description: `${successful_sends} SMS sent successfully, ${failed_sends} failed. Check console for details.`,
                variant: "destructive",
              })
              console.error("SMS sending errors:", JSON.stringify(errors, null, 2))
            } else {
              toast({
                title: "SMS Sending Failed",
                description: `All ${failed_sends} SMS messages failed to send. Check console for details.`,
                variant: "destructive",
              })
              console.error("SMS sending errors:", JSON.stringify(errors, null, 2))
            }

            setSmsContacts([{ name: "", number: "" }])
          } else {
            throw new Error(result.error || "Failed to send SMS messages")
          }
        } else {
          // Send actual Email messages
          response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contacts: validContacts,
            }),
          })

          result = await response.json()

          if (result.success) {
            const { successful_sends, failed_sends, errors } = result.data

            if (successful_sends > 0 && failed_sends === 0) {
              toast({
                title: "Emails Sent Successfully",
                description: `${successful_sends} email${successful_sends !== 1 ? "s" : ""} have been sent.`,
              })
            } else if (successful_sends > 0 && failed_sends > 0) {
              toast({
                title: "Partially Successful",
                description: `${successful_sends} emails sent successfully, ${failed_sends} failed. Check console for details.`,
                variant: "destructive",
              })
              if (errors && errors.length > 0) {
                console.error("Email sending errors:", JSON.stringify(errors, null, 2))
              }
            } else if (failed_sends > 0) {
              toast({
                title: "Email Sending Failed",
                description: `All ${failed_sends} email${failed_sends !== 1 ? "s" : ""} failed to send. Check console for details.`,
                variant: "destructive",
              })
              if (errors && errors.length > 0) {
                console.error("Email sending errors:", JSON.stringify(errors, null, 2))
              }
            } else {
              toast({
                title: "No Emails Sent",
                description: "No valid emails were found to send.",
                variant: "destructive",
              })
            }

            setEmailContacts([{ name: "", email: "" }])
          } else {
            throw new Error(result.error || "Failed to send emails")
          }
        }
      } catch (error: any) {
        console.error("Error sending requests:", error)
        toast({
          title: "Failed to Send Requests",
          description: error.message || "There was an error sending the requests. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSending(false)
      }
    },
    [toast],
  )

  // Keep handleSaveTemplate for other uses but simplified
  const handleSaveTemplate = useCallback(
    async (
      type: "sms" | "email",
      data: { senderName?: string; content?: string; subject?: string; fromEmail?: string },
    ) => {
      try {
        const campaignData = {
          type,
          data: {
            ...(type === "email" ? {
              subject: data.subject || emailSubject,
              content: data.content || emailMessageTemplate,
              fromEmail: data.fromEmail || emailSenderEmail,
              sequence: emailSequence,
              initialTrigger: emailInitialTrigger,
              initialWaitDays: emailInitialWaitDays
            } : {
              content: data.content || smsMessageTemplate,
              senderName: data.senderName || smsSenderName,
              sequence: smsSequence,
              initialTrigger: smsInitialTrigger,
              initialWaitDays: smsInitialWaitDays
            })
          }
        }

        const response = await fetch('/api/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(campaignData)
        })

        const result = await response.json()

        if (result.success) {
          toast({
            title: `${type === "sms" ? "SMS" : "Email"} Campaign Saved`,
            description: `Your ${type === "sms" ? "SMS" : "email"} campaign configuration has been saved successfully.`,
          })
        } else {
          throw new Error(result.error || `Failed to save ${type === "sms" ? "SMS" : "email"} campaign`)
        }
      } catch (error: any) {
        console.error(`Error saving ${type} campaign:`, error)
        toast({
          title: "Save Failed",
          description: error.message || `Failed to save ${type === "sms" ? "SMS" : "email"} campaign.`,
          variant: "destructive",
        })
      }
    },
    [toast, emailSubject, emailMessageTemplate, emailSenderEmail, emailSequence, emailInitialTrigger, emailInitialWaitDays,
     smsMessageTemplate, smsSenderName, smsSequence, smsInitialTrigger, smsInitialWaitDays],
  )

  return (
    <div className="flex min-h-screen flex-col bg-[rgb(243,243,241)] dark:bg-gray-900 p-6">
      <ReviewCampaignHeader onSaveConfiguration={handleSaveConfiguration} isSaving={isSavingConfiguration} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
            <div className="flex justify-start">
              <TabsList className="grid h-12 w-fit grid-cols-3 rounded-xl bg-white dark:bg-gray-800 p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                <TabsTrigger
                  value="email"
                  className="flex items-center gap-2 rounded-lg px-6 py-2 transition-all data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm"
                >
                  <Mail className="h-5 w-5" />
                  <span className="font-medium">Email Campaign</span>
                </TabsTrigger>
                <TabsTrigger
                  value="sms"
                  className="flex items-center gap-2 rounded-lg px-6 py-2 transition-all data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm"
                >
                  <MessageSquareText className="h-5 w-5" />
                  <span className="font-medium">SMS Campaign</span>
                </TabsTrigger>
                <TabsTrigger
                  value="qr-code"
                  className="flex items-center gap-2 rounded-lg px-6 py-2 transition-all data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm"
                >
                  <QrCode className="h-5 w-5" />
                  <span className="font-medium">QR Code</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="email" className="mt-8 space-y-8">
              <EmailCampaignTab
                reviewLink={reviewLink}
                companyName={companyName}
                isSending={isSending}
                onPreviewStep={handlePreviewStep}
                emailSenderEmail={emailSenderEmail}
                setEmailSenderEmail={setEmailSenderEmail}
                emailSubject={emailSubject}
                setEmailSubject={setEmailSubject}
                emailMessageTemplate={emailMessageTemplate}
                setEmailMessageTemplate={setEmailMessageTemplate}
                emailContacts={emailContacts}
                setEmailContacts={setEmailContacts}
                emailConsentChecked={emailConsentChecked}
                setEmailConsentChecked={setEmailConsentChecked}
                emailSequence={emailSequence}
                setEmailSequence={setEmailSequence}
                onSendRequests={handleSendRequests}
                onSaveTemplate={handleSaveTemplate}
                onUploadCsv={handleUploadCsv}
                uploadingCsv={uploadingCsv}
                csvErrors={csvErrors.email}
                emailInitialTrigger={emailInitialTrigger}
                setEmailInitialTrigger={setEmailInitialTrigger}
                emailInitialWaitDays={emailInitialWaitDays}
                setEmailInitialWaitDays={setEmailInitialWaitDays}
              />
            </TabsContent>

            <TabsContent value="sms" className="mt-8 space-y-8">
              <SmsCampaignTab
                reviewLink={reviewLink}
                companyName={companyName}
                isSending={isSending}
                onPreviewStep={handlePreviewStep}
                smsSenderName={smsSenderName}
                setSmsSenderName={setSmsSenderName}
                smsMessageTemplate={smsMessageTemplate}
                setSmsMessageTemplate={setSmsMessageTemplate}
                smsContacts={smsContacts}
                setSmsContacts={setSmsContacts}
                smsConsentChecked={smsConsentChecked}
                setSmsConsentChecked={setSmsConsentChecked}
                smsSequence={smsSequence}
                setSmsSequence={setSmsSequence}
                onSendRequests={handleSendRequests}
                onSaveTemplate={handleSaveTemplate}
                onUploadCsv={handleUploadCsv}
                uploadingCsv={uploadingCsv}
                csvErrors={csvErrors.sms}
                smsInitialTrigger={smsInitialTrigger}
                setSmsInitialTrigger={setSmsInitialTrigger}
                smsInitialWaitDays={smsInitialWaitDays}
                setSmsInitialWaitDays={setSmsInitialWaitDays}
              />
            </TabsContent>

            <TabsContent value="qr-code" className="mt-8 space-y-8">
              <QrCodeTab
                reviewLink={reviewLink}
                qrCodeData={qrCodeData}
                companyName={companyName}
                loadingReviewLink={loadingReviewLink}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2 w-full space-y-6">
          <LivePreviewPanel
            previewContent={getPreviewContent()}
            activeSubTab={activeSubTab}
            companyName={companyName}
            reviewLink={reviewLink}
            smsSenderName={smsSenderName}
            emailSenderEmail={emailSenderEmail}
            emailSubject={emailSubject}
            smsMessageTemplate={smsMessageTemplate}
            emailMessageTemplate={emailMessageTemplate}
            loadingReviewLink={loadingReviewLink}
          />
        </div>
      </div>
    </div>
  )
}
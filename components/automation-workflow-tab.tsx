"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { ChevronDown, Info, Plus, Trash2, Clock, GitBranch, Mail, MessageSquare, Zap, Users, X, Eye, Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface WorkflowStep {
  id: string
  type:
    | "advanced"
    | "recipient"
    | "communication"
    | "wait"
    | "email_activation"
    | "new_event"
    | "branch_condition"
    | "send_sms"
    | "add_tag"
    | "custom_action"
  title: string
  subtitle: string
  icon: React.ElementType
  iconBgColor: string
  iconTextColor: string
  isCollapsible: boolean
  defaultOpen?: boolean
  content?: React.ReactNode
  options?: { value: string; label: string }[]
  customValue?: string
}

interface DashboardMainContentProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

export function DashboardMainContent({ activeTab, setActiveTab }: DashboardMainContentProps) {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState("email")
  const [previewContent, setPreviewContent] = useState({
    type: "email",
    subject: "Hey {name} - I think we're the right fit for you!",
    body: "Hi {name},\n\nI've seen that your company {company} is specialized in the field {industry}. From my experience companies in that segment profit a lot from our software so I'd love to show you some helpful advances features I think perfectly matches to your work.\n\nI have a good availability this week - do you have",
    phone: "+1234567890",
    message: "Hi {name}, thank you for your recent purchase! We'd love to hear about your experience. Please leave us a review: {reviewUrl}"
  })

  const [emailSteps, setEmailSteps] = useState<WorkflowStep[]>([
    {
      id: "advanced-settings-email",
      type: "advanced",
      title: "When will this run?",
      subtitle: "immediately",
      icon: Zap,
      iconBgColor: "bg-violet-50",
      iconTextColor: "text-violet-600",
      isCollapsible: true,
      defaultOpen: false,
      options: [
        { value: "immediately", label: "Immediately" },
        { value: "after-1-day", label: "After 1 day" },
        { value: "after-3-days", label: "After 3 days" },
        { value: "after-x-days", label: "After X days" },
      ],
      customValue: "",
      content: (
        <p className="text-sm text-gray-500 dark:text-gray-400 pl-14">
          Additional settings for when this workflow will run.
        </p>
      ),
    },
    {
      id: "recipient-selection-email",
      type: "recipient",
      title: "Who will receive this?",
      subtitle: "all-new-members",
      icon: Users,
      iconBgColor: "bg-violet-50",
      iconTextColor: "text-violet-600",
      isCollapsible: true,
      defaultOpen: true,
      options: [
        { value: "all-new-members", label: "All new members" },
        { value: "specific-group", label: "Specific group" },
      ],
      content: (
        <p className="text-sm text-gray-500 dark:text-gray-400 pl-14">
          Additional settings for recipient selection can go here.
        </p>
      ),
    },
    {
      id: "email-activation-initial",
      type: "email_activation",
      title: "Send Email",
      subtitle: "Email Activation",
      icon: Mail,
      iconBgColor: "bg-gray-100",
      iconTextColor: "text-gray-600",
      isCollapsible: true,
      defaultOpen: true,
      content: (
        <div className="pl-14 space-y-4">
          <Input placeholder="From Name" defaultValue="Your Company" />
          <Input placeholder="From Email" defaultValue="noreply@yourcompany.com" type="email" />
          <Input
            placeholder="Email Subject"
            defaultValue="Hey {name} - I think we're the right fit for you!"
            onChange={(e) => setPreviewContent(prev => ({ ...prev, subject: e.target.value }))}
          />
          <Textarea
            placeholder="Email Body"
            defaultValue="Hi {name},\n\nI've seen that your company {company} is specialized in the field {industry}. From my experience companies in that segment profit a lot from our software so I'd love to show you some helpful advances features I think perfectly matches to your work.\n\nI have a good availability this week - do you have"
            className="min-h-[100px]"
            onChange={(e) => setPreviewContent(prev => ({ ...prev, body: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Insert Placeholder
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button className="w-fit">Save Email Content</Button>
          </div>
        </div>
      ),
    },
    {
      id: "branch-condition-email",
      type: "branch_condition",
      title: "Add a follow-up sequence?",
      subtitle: "Choose Yes or No",
      icon: GitBranch,
      iconBgColor: "bg-orange-50",
      iconTextColor: "text-orange-600",
      isCollapsible: true,
      defaultOpen: true,
      content: (
        <div className="pl-14 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Do you want to add a follow-up sequence based on a condition?
          </p>
          <div className="flex gap-2">
            <Button onClick={() => handleBranchDecision("yes", "branch-condition-email")}>Yes</Button>
            <Button onClick={() => handleBranchDecision("no", "branch-condition-email")}>No</Button>
          </div>
        </div>
      ),
    },
  ])

  const [smsSteps, setSmsSteps] = useState<WorkflowStep[]>([
    {
      id: "advanced-settings-sms",
      type: "advanced",
      title: "When will this run?",
      subtitle: "immediately",
      icon: Zap,
      iconBgColor: "bg-blue-50",
      iconTextColor: "text-blue-600",
      isCollapsible: true,
      defaultOpen: false,
      options: [
        { value: "immediately", label: "Immediately" },
        { value: "after-1-day", label: "After 1 day" },
        { value: "after-3-days", label: "After 3 days" },
        { value: "after-x-days", label: "After X days" },
      ],
      customValue: "",
      content: (
        <p className="text-sm text-gray-500 dark:text-gray-400 pl-14">
          Additional settings for when this SMS workflow will run.
        </p>
      ),
    },
    {
      id: "recipient-selection-sms",
      type: "recipient",
      title: "Who will receive this?",
      subtitle: "all-new-members",
      icon: Users,
      iconBgColor: "bg-blue-50",
      iconTextColor: "text-blue-600",
      isCollapsible: true,
      defaultOpen: true,
      options: [
        { value: "all-new-members", label: "All new members" },
        { value: "specific-group", label: "Specific group" },
      ],
      content: (
        <p className="text-sm text-gray-500 dark:text-gray-400 pl-14">
          Additional settings for SMS recipient selection.
        </p>
      ),
    },
    {
      id: "sms-activation-initial",
      type: "send_sms",
      title: "Send SMS",
      subtitle: "SMS Activation",
      icon: MessageSquare,
      iconBgColor: "bg-blue-50",
      iconTextColor: "text-blue-600",
      isCollapsible: true,
      defaultOpen: true,
      content: (
        <div className="pl-14 space-y-4">
          <Textarea
            placeholder="SMS Message"
            defaultValue="Hi {name}, thank you for your recent purchase! We'd love to hear about your experience. Please leave us a review: {reviewUrl}"
            className="min-h-[80px]"
            onChange={(e) => setPreviewContent(prev => ({ ...prev, message: e.target.value }))}
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>Character count: {previewContent.message.length}/160</span>
            <span className={previewContent.message.length > 160 ? "text-red-500" : "text-green-500"}>
              {previewContent.message.length > 160 ? "Over limit" : "Within limit"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Insert Placeholder
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button className="w-fit">Save SMS Content</Button>
          </div>
        </div>
      ),
    },
    {
      id: "branch-condition-sms",
      type: "branch_condition",
      title: "Add a follow-up sequence?",
      subtitle: "Choose Yes or No",
      icon: GitBranch,
      iconBgColor: "bg-orange-50",
      iconTextColor: "text-orange-600",
      isCollapsible: true,
      defaultOpen: true,
      content: (
        <div className="pl-14 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Do you want to add a follow-up sequence based on a condition?
          </p>
          <div className="flex gap-2">
            <Button onClick={() => handleBranchDecision("yes", "branch-condition-sms")}>Yes</Button>
            <Button onClick={() => handleBranchDecision("no", "branch-condition-sms")}>No</Button>
          </div>
        </div>
      ),
    },
  ])

  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false)
  const [addEventIndex, setAddEventIndex] = useState<number | null>(null)

  const getCurrentSteps = () => {
    return activeWorkflowTab === "email" ? emailSteps : smsSteps
  }

  const setCurrentSteps = (steps: WorkflowStep[] | ((prev: WorkflowStep[]) => WorkflowStep[])) => {
    if (activeWorkflowTab === "email") {
      setEmailSteps(steps)
    } else {
      setSmsSteps(steps)
    }
  }

  const handleUpdateStepSubtitle = (id: string, newSubtitle: string) => {
    const currentSteps = getCurrentSteps()
    setCurrentSteps(
      currentSteps.map((step) => (step.id === id ? { ...step, subtitle: newSubtitle } : step))
    )
  }

  const handleDeleteStep = (idToDelete: string) => {
    const currentSteps = getCurrentSteps()
    setCurrentSteps(currentSteps.filter((step) => step.id !== idToDelete))
  }

  const handleBranchDecision = (decision: "yes" | "no", branchId: string) => {
    const currentSteps = getCurrentSteps()
    setCurrentSteps((prevSteps) => {
      // First, filter out any existing conditional steps related to this branch
      const filteredSteps = prevSteps.filter(
        (step) => step.id !== `wait-${branchId}` && step.id !== `email-${branchId}` && step.id !== `sms-${branchId}`,
      )

      if (decision === "yes") {
        const branchIndex = filteredSteps.findIndex((step) => step.id === branchId)
        if (branchIndex === -1) return filteredSteps // Should not happen if branchId is valid

        const newStepsToInsert = [
          {
            id: `wait-${branchId}`,
            type: "wait" as const,
            title: "Wait",
            subtitle: "2 days", // Default value
            icon: Clock,
            iconBgColor: "bg-violet-50",
            iconTextColor: "text-violet-600",
            isCollapsible: true,
            defaultOpen: true,
            options: [
              { value: "1 day", label: "1 day" },
              { value: "2 days", label: "2 days" },
              { value: "3 days", label: "3 days" },
              { value: "1 week", label: "1 week" },
              { value: "2 weeks", label: "2 weeks" },
            ],
            content: (
              <p className="text-sm text-gray-500 dark:text-gray-400 pl-14">
                Configure the duration of the wait period.
              </p>
            ),
          },
          {
            id: branchId.includes("email") ? `email-${branchId}` : `sms-${branchId}`,
            type: branchId.includes("email") ? "email_activation" as const : "send_sms" as const,
            title: branchId.includes("email") ? "Send Email" : "Send SMS",
            subtitle: branchId.includes("email") ? "Follow-up Email" : "Follow-up SMS",
            icon: branchId.includes("email") ? Mail : MessageSquare,
            iconBgColor: branchId.includes("email") ? "bg-gray-100" : "bg-blue-50",
            iconTextColor: branchId.includes("email") ? "text-gray-600" : "text-blue-600",
            isCollapsible: true,
            defaultOpen: false,
            content: branchId.includes("email") ? (
              <div className="pl-14 space-y-4">
                <Input placeholder="From Name" defaultValue="Your Company" />
                <Input placeholder="From Email" defaultValue="noreply@yourcompany.com" type="email" />
                <Input placeholder="Email Subject" defaultValue="Follow-up Email!" />
                <Textarea
                  placeholder="Email Body"
                  defaultValue="This is a follow-up email based on your previous action."
                  className="min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button className="w-fit">Save Email Content</Button>
                </div>
              </div>
            ) : (
              <div className="pl-14 space-y-4">
                <Textarea
                  placeholder="SMS Message"
                  defaultValue="This is a follow-up SMS based on your previous action."
                  className="min-h-[80px]"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button className="w-fit">Save SMS Content</Button>
                </div>
              </div>
            ),
          },
        ]

        // Insert the new steps after the branch condition
        const updatedSteps = [
          ...filteredSteps.slice(0, branchIndex + 1),
          ...newStepsToInsert,
          ...filteredSteps.slice(branchIndex + 1),
        ]
        return updatedSteps
      } else {
        // If decision is "no", just return the filtered steps (which already removed the conditional ones)
        return filteredSteps
      }
    })
  }

  const handleAddSpecificEvent = (type: "email" | "wait" | "sms") => {
    const newId = `${type}-${Date.now()}`
    let newStep: WorkflowStep

    if (type === "email") {
      newStep = {
        id: newId,
        type: "email_activation",
        title: "Send Email",
        subtitle: "New Email",
        icon: Mail,
        iconBgColor: "bg-gray-100",
        iconTextColor: "text-gray-600",
        isCollapsible: true,
        defaultOpen: true,
        content: (
          <div className="pl-14 space-y-4">
            <Input placeholder="From Name" defaultValue="Your Company" />
            <Input placeholder="From Email" defaultValue="noreply@yourcompany.com" type="email" />
            <Input
              placeholder="Email Subject"
              defaultValue="Hey {name} - I think we're the right fit for you!"
            />
            <Textarea
              placeholder="Email Body"
              defaultValue="Hi {name},\n\nI've seen that your company {company} is specialized in the field {industry}. From my experience companies in that segment profit a lot from our software so I'd love to show you some helpful advances features I think perfectly matches to your work.\n\nI have a good availability this week - do you have"
              className="min-h-[100px]"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Insert Placeholder
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button className="w-fit">Save Email Content</Button>
            </div>
          </div>
        ),
      }
    } else if (type === "sms") {
      newStep = {
        id: newId,
        type: "send_sms",
        title: "Send SMS",
        subtitle: "New SMS",
        icon: MessageSquare,
        iconBgColor: "bg-blue-50",
        iconTextColor: "text-blue-600",
        isCollapsible: true,
        defaultOpen: true,
        content: (
          <div className="pl-14 space-y-4">
            <Textarea placeholder="SMS Message" defaultValue="Your message here..." className="min-h-[80px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button className="w-fit">Save SMS Content</Button>
            </div>
          </div>
        ),
      }
    } else {
      newStep = {
        id: newId,
        type: "wait",
        title: "Wait",
        subtitle: "1 day",
        icon: Clock,
        iconBgColor: "bg-violet-50",
        iconTextColor: "text-violet-600",
        isCollapsible: true,
        defaultOpen: true,
        options: [
          { value: "1 day", label: "1 day" },
          { value: "2 days", label: "2 days" },
          { value: "3 days", label: "3 days" },
          { value: "1 week", label: "1 week" },
          { value: "2 weeks", label: "2 weeks" },
        ],
        content: (
          <p className="text-sm text-gray-500 dark:text-gray-400 pl-14">Configure the duration of the wait period.</p>
        ),
      }
    }

    const currentSteps = getCurrentSteps()
    if (addEventIndex !== null && addEventIndex >= 0 && addEventIndex <= currentSteps.length) {
      const newSteps = [...currentSteps]
      newSteps.splice(addEventIndex, 0, newStep)
      setCurrentSteps(newSteps)
    } else {
      setCurrentSteps([...currentSteps, newStep])
    }
    setIsAddEventDialogOpen(false)
    setAddEventIndex(null)
  }

  const PreviewPanel = () => (
    <div className="sticky top-6 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg h-fit overflow-hidden">
      <div className="relative w-[320px] h-[650px] rounded-[40px] bg-black shadow-2xl flex items-center justify-center border-[10px] border-gray-800 overflow-hidden">
        {/* iPhone Bezel */}
        <div className="absolute inset-0 rounded-[35px] border-[2px] border-gray-700 pointer-events-none"></div>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[25px] bg-black rounded-b-xl z-10 flex items-center justify-center">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>
        {/* Screen Content */}
        <div className="w-full h-full bg-white rounded-[30px] overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="h-10 bg-white flex items-center justify-between px-6 pt-6">
            <div className="text-sm font-semibold">9:41</div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-black rounded-sm">
                <div className="w-full h-full bg-black rounded-sm"></div>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeWorkflowTab === "email" ? (
              <div className="space-y-4">
                <div className="text-center">
                  <Monitor className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Email Preview</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="text-gray-900">Your Company</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">To:</span>
                    <span className="text-gray-900">customer@email.com</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="font-semibold text-sm mb-2">{previewContent.subject}</div>
                    <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {previewContent.body}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  Variables like {"{name}"} will be replaced with actual data
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-blue-500 text-white p-3 rounded-2xl rounded-br-md max-w-[250px] text-sm leading-relaxed">
                    {previewContent.message}
                  </div>
                  <div className="text-xs text-gray-500">
                    Delivered • {previewContent.message.length}/160 characters
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const WorkflowSteps = ({ steps }: { steps: WorkflowStep[] }) => (
    <div className="flex flex-col gap-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <Collapsible defaultOpen={step.defaultOpen} className="relative">
            <Card className="p-4 rounded-xl shadow-sm bg-white dark:bg-gray-800">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.iconBgColor} ${step.iconTextColor}`}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{step.title}</p>
                      {step.type === "advanced" || step.type === "recipient" ? (
                        <div className="flex flex-col gap-1">
                          <Select
                            value={step.subtitle}
                            onValueChange={(value) => {
                              const currentSteps = getCurrentSteps()
                              setCurrentSteps(
                                currentSteps.map((s) => {
                                  if (s.id === step.id) {
                                    return {
                                      ...s,
                                      subtitle: value,
                                      customValue: value === "after-x-days" ? s.customValue || "" : undefined,
                                    }
                                  }
                                  return s
                                })
                              )
                            }}
                          >
                            <SelectTrigger className="w-full font-semibold text-gray-800 dark:text-gray-200 border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0">
                              <SelectValue placeholder="Select...">
                                {step.options?.find((opt) => opt.value === step.subtitle)?.label}
                                {step.subtitle === "after-x-days" && step.customValue && ` (${step.customValue} days)`}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {step.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {step.type === "advanced" && step.subtitle === "after-x-days" && (
                            <Input
                              placeholder="Enter number of days"
                              value={step.customValue || ""}
                              onChange={(e) => {
                                const newCustomValue = e.target.value
                                const currentSteps = getCurrentSteps()
                                setCurrentSteps(
                                  currentSteps.map((s) => (s.id === step.id ? { ...s, customValue: newCustomValue } : s))
                                )
                              }}
                              className="mt-2 font-semibold text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      ) : step.type === "wait" ? (
                        <Select
                          value={step.subtitle}
                          onValueChange={(value) => handleUpdateStepSubtitle(step.id, value)}
                        >
                          <SelectTrigger className="w-full font-semibold text-gray-800 dark:text-gray-200 border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {step.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{step.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.type !== "advanced" && <Info className="h-4 w-4 text-gray-400" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteStep(step.id)
                      }}
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="sr-only">Delete step</span>
                    </Button>
                    {step.isCollapsible && (
                      <ChevronDown className="h-5 w-5 text-gray-500 data-[state=open]:rotate-180 transition-transform" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">{step.content}</CollapsibleContent>
            </Card>
          </Collapsible>
          {index < steps.length - 1 && (
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute h-full w-px bg-gray-300 dark:bg-gray-700" />
              <Dialog
                open={isAddEventDialogOpen && addEventIndex === index + 1}
                onOpenChange={(open) => {
                  setIsAddEventDialogOpen(open)
                  if (!open) setAddEventIndex(null)
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative z-10 h-8 w-8 rounded-full bg-white shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                    onClick={() => {
                      setIsAddEventDialogOpen(true)
                      setAddEventIndex(index + 1)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add an event</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-lg rounded-2xl bg-white p-0 shadow-2xl border-0 dark:bg-gray-900">
                  <div className="p-6 pb-4">
                    <DialogHeader className="relative text-center">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                      <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                        Add New Event
                      </DialogTitle>
                      <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2 text-base">
                        Choose what happens next in your workflow
                      </DialogDescription>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-8 w-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => {
                          setIsAddEventDialogOpen(false)
                          setAddEventIndex(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </Button>
                    </DialogHeader>
                  </div>

                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-1 gap-3">
                      {/* Email Option */}
                      <div
                        className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-violet-300 dark:border-gray-700 dark:hover:border-violet-600 transition-all duration-200 cursor-pointer hover:shadow-md"
                        onClick={() => handleAddSpecificEvent("email")}
                      >
                        <div className="p-4 flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center group-hover:from-violet-100 group-hover:to-violet-200 dark:group-hover:from-violet-900 dark:group-hover:to-violet-800 transition-all duration-200">
                              <Mail className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-violet-900 dark:group-hover:text-violet-100">
                              Send Email
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Send a personalized email to your customers
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-violet-500 dark:group-hover:border-violet-400 flex items-center justify-center transition-all duration-200">
                              <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-violet-500 dark:group-hover:bg-violet-400 transition-all duration-200"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SMS Option */}
                      <div
                        className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer hover:shadow-md"
                        onClick={() => handleAddSpecificEvent("sms")}
                      >
                        <div className="p-4 flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 dark:group-hover:from-blue-800 dark:group-hover:to-blue-700 transition-all duration-200">
                              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100">
                              Send SMS
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Send a text message directly to their phone
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-blue-500 dark:group-hover:border-blue-400 flex items-center justify-center transition-all duration-200">
                              <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-all duration-200"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Wait Option */}
                      <div
                        className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-amber-300 dark:border-gray-700 dark:hover:border-amber-600 transition-all duration-200 cursor-pointer hover:shadow-md"
                        onClick={() => handleAddSpecificEvent("wait")}
                      >
                        <div className="p-4 flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-xl flex items-center justify-center group-hover:from-amber-200 group-hover:to-amber-300 dark:group-hover:from-amber-800 dark:group-hover:to-amber-700 transition-all duration-200">
                              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-amber-900 dark:group-hover:text-amber-100">
                              Add Delay
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Wait for a specific time before the next action
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-amber-500 dark:group-hover:border-amber-400 flex items-center justify-center transition-all duration-200">
                              <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-amber-500 dark:group-hover:bg-amber-400 transition-all duration-200"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Choose an action to continue your workflow
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                          onClick={() => {
                            setIsAddEventDialogOpen(false)
                            setAddEventIndex(null)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Pink Add Button at bottom */}
      <Dialog
        open={isAddEventDialogOpen && addEventIndex === steps.length}
        onOpenChange={(open) => {
          setIsAddEventDialogOpen(open)
          if (!open) setAddEventIndex(null)
        }}
      >
        <DialogTrigger asChild>
          <Button
            className="w-full rounded-3xl bg-violet-600 py-6 text-lg font-semibold text-white hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600"
            onClick={() => {
              setIsAddEventDialogOpen(true)
              setAddEventIndex(steps.length)
            }}
          >
            <Plus className="mr-2 h-5 w-5" />
            Add an event
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900">
          <DialogHeader className="relative">
            <DialogTitle className="text-xl font-bold text-center">Add a new event</DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-400 mt-2">
              Choose an action to add to your workflow.
            </DialogDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => {
                setIsAddEventDialogOpen(false)
                setAddEventIndex(null)
              }}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <Button
              variant="outline"
              className="w-full rounded-lg py-4 text-base font-semibold bg-transparent justify-start"
              onClick={() => handleAddSpecificEvent("email")}
            >
              <Mail className="mr-3 h-5 w-5 text-gray-600 dark:text-gray-400" />
              Add Email Step
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-lg py-4 text-base font-semibold bg-transparent justify-start"
              onClick={() => handleAddSpecificEvent("sms")}
            >
              <MessageSquare className="mr-3 h-5 w-5 text-gray-600 dark:text-gray-400" />
              Add SMS Step
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-lg py-4 text-base font-semibold bg-transparent justify-start"
              onClick={() => handleAddSpecificEvent("wait")}
            >
              <Clock className="mr-3 h-5 w-5 text-gray-600 dark:text-gray-400" />
              Add Wait Step
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  return (
    <div className="flex gap-6 max-w-7xl mx-auto p-6">
      {/* Main Content */}
      <div className="flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Automation Workflow</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Configure your email and SMS automation sequences</p>
        </div>

        <Tabs value={activeWorkflowTab} onValueChange={setActiveWorkflowTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Workflow
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              SMS Workflow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <WorkflowSteps steps={emailSteps} />
          </TabsContent>

          <TabsContent value="sms">
            <WorkflowSteps steps={smsSteps} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Panel */}
      <div className="w-80">
        <PreviewPanel />
      </div>
    </div>
  )
}
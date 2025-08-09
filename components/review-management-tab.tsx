"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Zap,
  Clock,
  Mail,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Send,
  Target,
  Repeat,
  CheckCircle,
  XCircle,
  Save,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { AutomationSettings, TriggerSettings, EmailTemplate, SMSTemplate, Workflow } from "@/types/db"

export function ReviewManagementTab() {
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
    user_id: "1",
    automation_enabled: false,
    email_enabled: false,
    sms_enabled: false,
  })
  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>({
    user_id: "1",
    sending_time: "09:00",
    timezone: "Europe/Paris",
    delay_days: 1,
    follow_up_days: 7,
  })
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>({
    user_id: "1",
    subject: "",
    content: "",
  })
  const [smsTemplate, setSmsTemplate] = useState<SMSTemplate>({
    user_id: "1",
    content: "",
  })
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [newWorkflow, setNewWorkflow] = useState<Partial<Workflow>>({
    name: "",
    trigger_event: "new_review",
    delay_value: 1,
    delay_unit: "days",
    channel: "email",
    status: "active",
  })
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReviewManagementData = useCallback(async () => {
    setLoading(true)
    try {
      const [automationRes, triggerRes, emailTemplateRes, smsTemplateRes, workflowsRes] = await Promise.all([
        fetch("/api/review-management/automation"),
        fetch("/api/review-management/triggers"),
        fetch("/api/review-management/email-template"),
        fetch("/api/review-management/sms-template"),
        fetch("/api/review-management/workflows"),
      ])

      const [automationData, triggerData, emailTemplateData, smsTemplateData, workflowsData] = await Promise.all([
        automationRes.json(),
        triggerRes.json(),
        emailTemplateRes.json(),
        smsTemplateRes.json(),
        workflowsRes.json(),
      ])

      if (automationData.success) setAutomationSettings(automationData.data)
      if (triggerData.success) setTriggerSettings(triggerData.data)
      if (emailTemplateData.success) setEmailTemplate(emailTemplateData.data)
      if (smsTemplateData.success) setSmsTemplate(smsTemplateData.data)
      if (workflowsData.success) setWorkflows(workflowsData.data)
    } catch (error) {
      console.error("Error fetching review management data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviewManagementData()
  }, [fetchReviewManagementData])

  const handleSaveAutomation = async () => {
    try {
      const response = await fetch("/api/review-management/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(automationSettings),
      })
      const result = await response.json()
      if (result.success) {
        alert("Automation settings saved successfully!")
      } else {
        console.error("Error saving automation settings:", result.error)
        alert("Failed to save automation settings.")
      }
    } catch (error) {
      console.error("Error saving automation settings:", error)
      alert("Failed to save automation settings.")
    }
  }

  const handleSaveTriggers = async () => {
    try {
      const response = await fetch("/api/review-management/triggers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(triggerSettings),
      })
      const result = await response.json()
      if (result.success) {
        alert("Trigger settings saved successfully!")
      } else {
        console.error("Error saving trigger settings:", result.error)
        alert("Failed to save trigger settings.")
      }
    } catch (error) {
      console.error("Error saving trigger settings:", error)
      alert("Failed to save trigger settings.")
    }
  }

  const handleSaveEmailTemplate = async () => {
    try {
      const response = await fetch("/api/review-management/email-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailTemplate),
      })
      const result = await response.json()
      if (result.success) {
        alert("Email template saved successfully!")
      } else {
        console.error("Error saving email template:", result.error)
        alert("Failed to save email template.")
      }
    } catch (error) {
      console.error("Error saving email template:", error)
      alert("Failed to save email template.")
    }
  }

  const handleSaveSmsTemplate = async () => {
    try {
      const response = await fetch("/api/review-management/sms-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smsTemplate),
      })
      const result = await response.json()
      if (result.success) {
        alert("SMS template saved successfully!")
      } else {
        console.error("Error saving SMS template:", result.error)
        alert("Failed to save SMS template.")
      }
    } catch (error) {
      console.error("Error saving SMS template:", error)
      alert("Failed to save SMS template.")
    }
  }

  const handleCreateOrUpdateWorkflow = async () => {
    const method = editingWorkflow ? "PUT" : "POST"
    const url = editingWorkflow
      ? `/api/review-management/workflows/${editingWorkflow.id}`
      : "/api/review-management/workflows"
    const payload = editingWorkflow ? { ...editingWorkflow, ...newWorkflow } : newWorkflow

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (result.success) {
        alert(`Workflow ${editingWorkflow ? "updated" : "created"} successfully!`)
        fetchReviewManagementData() // Re-fetch all workflows
        setIsWorkflowDialogOpen(false)
        setNewWorkflow({
          name: "",
          trigger_event: "new_review",
          delay_value: 1,
          delay_unit: "days",
          channel: "email",
          status: "active",
        })
        setEditingWorkflow(null)
      } else {
        console.error(`Error ${editingWorkflow ? "updating" : "creating"} workflow:`, result.error)
        alert(`Failed to ${editingWorkflow ? "update" : "create"} workflow.`)
      }
    } catch (error) {
      console.error(`Error ${editingWorkflow ? "updating" : "creating"} workflow:`, error)
      alert(`Failed to ${editingWorkflow ? "update" : "create"} workflow.`)
    }
  }

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return
    try {
      const response = await fetch(`/api/review-management/workflows/${workflowId}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (result.success) {
        alert("Workflow deleted successfully!")
        fetchReviewManagementData() // Re-fetch all workflows
      } else {
        console.error("Error deleting workflow:", result.error)
        alert("Failed to delete workflow.")
      }
    } catch (error) {
      console.error("Error deleting workflow:", error)
      alert("Failed to delete workflow.")
    }
  }

  const handleToggleWorkflowStatus = async (workflow: Workflow) => {
    const newStatus = workflow.status === "active" ? "paused" : "active"
    try {
      const response = await fetch(`/api/review-management/workflows/${workflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (result.success) {
        alert(`Workflow ${newStatus} successfully!`)
        fetchReviewManagementData() // Re-fetch all workflows
      } else {
        console.error("Error toggling workflow status:", result.error)
        alert("Failed to toggle workflow status.")
      }
    } catch (error) {
      console.error("Error toggling workflow status:", error)
      alert("Failed to toggle workflow status.")
    }
  }

  const handleEditClick = (workflow: Workflow) => {
    setEditingWorkflow(workflow)
    setNewWorkflow(workflow) // Populate form with existing data
    setIsWorkflowDialogOpen(true)
  }

  const handleNewWorkflowClick = () => {
    setEditingWorkflow(null)
    setNewWorkflow({
      name: "",
      trigger_event: "new_review",
      delay_value: 1,
      delay_unit: "days",
      channel: "email",
      status: "active",
    })
    setIsWorkflowDialogOpen(true)
  }

  const timezones = [
    "Europe/Paris",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Tokyo",
    "Australia/Sydney",
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#e66465] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Automation Settings */}
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Automation Settings
          </CardTitle>
          <CardDescription className="text-gray-600">Configure automatic actions for review management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Enable Automation</h4>
                <p className="text-sm text-gray-600">Turn on or off all automated review processes</p>
              </div>
              <Switch
                checked={automationSettings.automation_enabled}
                onCheckedChange={(checked) =>
                  setAutomationSettings((prev) => ({ ...prev, automation_enabled: checked }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Enable Email Automation</h4>
                <p className="text-sm text-gray-600">Send automated emails for review requests and responses</p>
              </div>
              <Switch
                checked={automationSettings.email_enabled}
                onCheckedChange={(checked) => setAutomationSettings((prev) => ({ ...prev, email_enabled: checked }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Enable SMS Automation</h4>
                <p className="text-sm text-gray-600">Send automated SMS messages for review requests and alerts</p>
              </div>
              <Switch
                checked={automationSettings.sms_enabled}
                onCheckedChange={(checked) => setAutomationSettings((prev) => ({ ...prev, sms_enabled: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
              onClick={handleSaveAutomation}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Automation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trigger Settings */}
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Trigger Settings
          </CardTitle>
          <CardDescription className="text-gray-600">Define when and how review requests are sent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Sending Time</Label>
              <Input
                type="time"
                value={triggerSettings.sending_time}
                onChange={(e) => setTriggerSettings((prev) => ({ ...prev, sending_time: e.target.value }))}
                className="h-9 text-sm border-gray-200"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Timezone</Label>
              <Select
                value={triggerSettings.timezone}
                onValueChange={(value) => setTriggerSettings((prev) => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger className="h-9 text-sm border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((timezone) => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Delay Before First Request (Days)</Label>
              <Input
                type="number"
                value={triggerSettings.delay_days}
                onChange={(e) =>
                  setTriggerSettings((prev) => ({ ...prev, delay_days: Number.parseInt(e.target.value) }))
                }
                className="h-9 text-sm border-gray-200"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Follow-up Delay (Days)</Label>
              <Input
                type="number"
                value={triggerSettings.follow_up_days}
                onChange={(e) =>
                  setTriggerSettings((prev) => ({ ...prev, follow_up_days: Number.parseInt(e.target.value) }))
                }
                className="h-9 text-sm border-gray-200"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
              onClick={handleSaveTriggers}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Triggers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Template
          </CardTitle>
          <CardDescription className="text-gray-600">Customize the email sent for review requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Subject</Label>
            <Input
              value={emailTemplate.subject}
              onChange={(e) => setEmailTemplate((prev) => ({ ...prev, subject: e.target.value }))}
              className="h-9 text-sm border-gray-200"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Content</Label>
            <Textarea
              value={emailTemplate.content}
              onChange={(e) => setEmailTemplate((prev) => ({ ...prev, content: e.target.value }))}
              rows={8}
              className="resize-none text-sm border-gray-200"
              placeholder="Write your email content here..."
            />
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
              onClick={handleSaveEmailTemplate}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Email Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Template */}
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Template
          </CardTitle>
          <CardDescription className="text-gray-600">Customize the SMS sent for review requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Content</Label>
            <Textarea
              value={smsTemplate.content}
              onChange={(e) => setSmsTemplate((prev) => ({ ...prev, content: e.target.value }))}
              rows={5}
              className="resize-none text-sm border-gray-200"
              placeholder="Write your SMS content here..."
            />
            <p className="text-xs text-gray-500">Max 160 characters per SMS segment.</p>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
              onClick={handleSaveSmsTemplate}
            >
              <Save className="w-4 h-4 mr-2" />
              Save SMS Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflows */}
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Repeat className="w-5 h-5" />
                Workflows
              </CardTitle>
              <CardDescription className="text-gray-600">
                Create and manage automated review request workflows
              </CardDescription>
            </div>
            <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
                  onClick={handleNewWorkflowClick}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingWorkflow ? "Edit Workflow" : "Create New Workflow"}</DialogTitle>
                  <DialogDescription>
                    {editingWorkflow
                      ? "Make changes to your workflow here."
                      : "Define a new automated sequence for review requests."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="workflow-name">Workflow Name</Label>
                    <Input
                      id="workflow-name"
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow((prev) => ({ ...prev, name: e.target.value }))}
                      className="col-span-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trigger-event">Trigger Event</Label>
                    <Select
                      value={newWorkflow.trigger_event}
                      onValueChange={(value) => setNewWorkflow((prev) => ({ ...prev, trigger_event: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trigger" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_review">New Review Received</SelectItem>
                        <SelectItem value="order_completed">Order Completed</SelectItem>
                        <SelectItem value="product_shipped">Product Shipped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="delay-value" className="col-span-1">
                      Delay
                    </Label>
                    <Input
                      id="delay-value"
                      type="number"
                      value={newWorkflow.delay_value}
                      onChange={(e) =>
                        setNewWorkflow((prev) => ({ ...prev, delay_value: Number.parseInt(e.target.value) }))
                      }
                      className="col-span-1"
                    />
                    <Select
                      value={newWorkflow.delay_unit}
                      onValueChange={(value) => setNewWorkflow((prev) => ({ ...prev, delay_unit: value }))}
                    >
                      <SelectTrigger className="col-span-1">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel">Channel</Label>
                    <Select
                      value={newWorkflow.channel}
                      onValueChange={(value) => setNewWorkflow((prev) => ({ ...prev, channel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="status">Status</Label>
                    <Switch
                      id="status"
                      checked={newWorkflow.status === "active"}
                      onCheckedChange={(checked) =>
                        setNewWorkflow((prev) => ({ ...prev, status: checked ? "active" : "paused" }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
                    onClick={handleCreateOrUpdateWorkflow}
                  >
                    {editingWorkflow ? "Save Changes" : "Create Workflow"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {workflows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No workflows created yet.</div>
          ) : (
            <div className="grid gap-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="border border-gray-200/60 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {workflow.status === "active" ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                        <p className="text-sm text-gray-600">
                          Trigger: {workflow.trigger_event.replace(/_/g, " ")} | Delay: {workflow.delay_value}{" "}
                          {workflow.delay_unit} | Channel: {workflow.channel}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" /> {workflow.sent_count} Sent
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {workflow.opened_count} Opened
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" /> {workflow.clicked_count} Clicked
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          workflow.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }
                      >
                        {workflow.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent"
                        onClick={() => handleToggleWorkflowStatus(workflow)}
                      >
                        {workflow.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span className="sr-only">Toggle Status</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent"
                        onClick={() => handleEditClick(workflow)}
                      >
                        <Edit className="w-4 h-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

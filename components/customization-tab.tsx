"use client"

import { useState, useEffect, useCallback } from "react"
import { Palette, MessageSquare, Link, UploadCloud, Save, Copy, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import type { BrandingSettings, MessageSettings, RedirectSettings } from "@/types/db"

export function CustomizationTab() {
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    user_id: "1",
    company_logo_url: "/placeholder.svg?height=64&width=64",
    sms_sender_name: "",
    email_sender_name: "",
    title_color: "#e66465",
  })
  const [messageSettings, setMessageSettings] = useState<MessageSettings>({
    user_id: "1",
    rating_page_content: "",
    redirect_text: "",
    notification_text: "",
    skip_redirect: false,
  })
  const [redirectSettings, setRedirectSettings] = useState<RedirectSettings>({
    user_id: "1",
    base_url: "",
    custom_id: "",
    full_url: "",
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchCustomizationData = useCallback(async () => {
    setLoading(true)
    try {
      const [brandingRes, messageRes, redirectRes] = await Promise.all([
        fetch("/api/customization/branding"),
        fetch("/api/customization/messages"),
        fetch("/api/customization/redirect"),
      ])

      const [brandingData, messageData, redirectData] = await Promise.all([
        brandingRes.json(),
        messageRes.json(),
        redirectRes.json(),
      ])

      if (brandingData.success) {
        setBrandingSettings({
          ...brandingData.data,
          company_logo_url: brandingData.data.company_logo_url || "/placeholder.svg?height=64&width=64",
        })
      } else {
        console.error("Error fetching branding settings:", brandingData.error)
      }

      if (messageData.success) setMessageSettings(messageData.data)
      if (redirectData.success) setRedirectSettings(redirectData.data)
    } catch (error) {
      console.error("Error fetching customization data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomizationData()
  }, [fetchCustomizationData])

  useEffect(() => {
    const baseUrl = redirectSettings.base_url || "https://yourdomain.com/review"
    const customId = redirectSettings.custom_id || "your-unique-id"
    setRedirectSettings((prev) => ({ ...prev, full_url: `${baseUrl}/${customId}` }))
  }, [redirectSettings.base_url, redirectSettings.custom_id])

  const handleSaveBranding = async () => {
    try {
      const response = await fetch("/api/customization/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandingSettings),
      })
      const result = await response.json()
      if (result.success) {
        alert("Branding settings saved successfully!")
      } else {
        console.error("Error saving branding settings:", result.error)
        alert("Failed to save branding settings.")
      }
    } catch (error) {
      console.error("Error saving branding settings:", error)
      alert("Failed to save branding settings.")
    }
  }

  const handleSaveMessages = async () => {
    try {
      const response = await fetch("/api/customization/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageSettings),
      })
      const result = await response.json()
      if (result.success) {
        alert("Message settings saved successfully!")
      } else {
        console.error("Error saving message settings:", result.error)
        alert("Failed to save message settings.")
      }
    } catch (error) {
      console.error("Error saving message settings:", error)
      alert("Failed to save message settings.")
    }
  }

  const handleSaveRedirect = async () => {
    try {
      const response = await fetch("/api/customization/redirect", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(redirectSettings),
      })
      const result = await response.json()
      if (result.success) {
        alert("Redirect settings saved successfully!")
      } else {
        console.error("Error saving redirect settings:", result.error)
        alert("Failed to save redirect settings.")
      }
    } catch (error) {
      console.error("Error saving redirect settings:", error)
      alert("Failed to save redirect settings.")
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(redirectSettings.full_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#e66465] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Branding */}
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Branding
          </CardTitle>
          <CardDescription className="text-gray-600">
            Customize the look and feel of your review pages and communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Company Logo</Label>
            <div className="flex items-center gap-4">
              <img
                src={brandingSettings.company_logo_url || "/placeholder.svg?height=64&width=64"}
                alt="Company Logo"
                className="w-16 h-16 object-contain rounded-md border border-gray-200"
              />
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent">
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload Logo
              </Button>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">SMS Sender Name</Label>
              <Input
                value={brandingSettings.sms_sender_name}
                onChange={(e) => setBrandingSettings((prev) => ({ ...prev, sms_sender_name: e.target.value }))}
                className="h-9 text-sm border-gray-200"
                placeholder="e.g., YourCompany"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Email Sender Name</Label>
              <Input
                value={brandingSettings.email_sender_name}
                onChange={(e) => setBrandingSettings((prev) => ({ ...prev, email_sender_name: e.target.value }))}
                className="h-9 text-sm border-gray-200"
                placeholder="e.g., YourCompany Support"
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Title Color</Label>
            <div className="flex items-center gap-4">
              <Input
                type="color"
                value={brandingSettings.title_color}
                onChange={(e) => setBrandingSettings((prev) => ({ ...prev, title_color: e.target.value }))}
                className="w-16 h-9 p-1 border-gray-200"
              />
              <Input
                value={brandingSettings.title_color}
                onChange={(e) => setBrandingSettings((prev) => ({ ...prev, title_color: e.target.value }))}
                className="flex-1 h-9 text-sm border-gray-200"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
              onClick={handleSaveBranding}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Branding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages
          </CardTitle>
          <CardDescription className="text-gray-600">
            Customize the messages displayed on your review pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Rating Page Content</Label>
            <Textarea
              value={messageSettings.rating_page_content}
              onChange={(e) => setMessageSettings((prev) => ({ ...prev, rating_page_content: e.target.value }))}
              rows={4}
              className="resize-none text-sm border-gray-200"
              placeholder="Message displayed on the initial rating page..."
            />
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Redirect Text</Label>
            <Textarea
              value={messageSettings.redirect_text}
              onChange={(e) => setMessageSettings((prev) => ({ ...prev, redirect_text: e.target.value }))}
              rows={3}
              className="resize-none text-sm border-gray-200"
              placeholder="Text displayed before redirecting to a review platform..."
            />
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Notification Text</Label>
            <Textarea
              value={messageSettings.notification_text}
              onChange={(e) => setMessageSettings((prev) => ({ ...prev, notification_text: e.target.value }))}
              rows={3}
              className="resize-none text-sm border-gray-200"
              placeholder="Message displayed for internal notifications..."
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Skip Redirect Page</h4>
              <p className="text-sm text-gray-600">
                Directly send customers to the review platform after rating (bypasses redirect text)
              </p>
            </div>
            <Switch
              checked={messageSettings.skip_redirect}
              onCheckedChange={(checked) => setMessageSettings((prev) => ({ ...prev, skip_redirect: checked }))}
            />
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
              onClick={handleSaveMessages}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Messages
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Redirect Link */}
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Link className="w-5 h-5" />
            Redirect Link
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configure the unique link for your review requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Base URL</Label>
            <Input
              value={redirectSettings.base_url}
              onChange={(e) => setRedirectSettings((prev) => ({ ...prev, base_url: e.target.value }))}
              className="h-9 text-sm border-gray-200"
              placeholder="e.g., https://yourdomain.com/review"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Custom ID</Label>
            <Input
              value={redirectSettings.custom_id}
              onChange={(e) => setRedirectSettings((prev) => ({ ...prev, custom_id: e.target.value }))}
              className="h-9 text-sm border-gray-200"
              placeholder="e.g., your-unique-id"
            />
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Full Redirect Link</Label>
            <div className="flex items-center gap-2">
              <Input value={redirectSettings.full_url} readOnly className="h-9 text-sm border-gray-200" />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                <span className="sr-only">Copy link</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500">Share this link with your customers to collect reviews.</p>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
              onClick={handleSaveRedirect}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Redirect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

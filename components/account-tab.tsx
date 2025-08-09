"use client"

import React from "react"

import { useState, useEffect, useCallback, useRef } from "react" // Import useRef
import { useRouter } from "next/navigation"
import { useCompanyLogo } from "@/hooks/useCompanyLogo"
import { useSubscription } from "@/hooks/use-subscription"
import { Save, Edit3, X, Globe, User, Mail, Phone, Building, MapPin, Clock, Eye, Crown, ArrowLeft, Info } from "lucide-react"
import { toast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { UserProfile, NotificationSettings } from "@/types/db"

interface AccountTabProps {
  onTabChange?: (tab: string) => void
}

export function AccountTab({ onTabChange }: AccountTabProps) {
  const router = useRouter()
  const { logoUrl, updateLogo } = useCompanyLogo()
  const { userInfo, hasActiveSubscription } = useSubscription()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState<UserProfile>({
    id: "1", // Mock ID
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    address: "",
    city: "",
    postal_code: "",
    country: "",
    timezone: "",
    language: "",
    bio: "",
    avatar_url: "/placeholder.svg?height=80&width=80",
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    user_id: "1", // Mock ID
    email_notifications: false,
    sms_notifications: false,
    review_alerts: false,
    weekly_reports: false,
    marketing_emails: false,
    notification_email: "", // Initialize new fields
    reply_email: "", // Initialize new fields
  })

  const [isEditingNotificationEmail, setIsEditingNotificationEmail] = useState(false)
  const [isEditingReplyEmail, setIsEditingReplyEmail] = useState(false)
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false)

  const [loading, setLoading] = useState(true)

  // Get real subscription data from useSubscription hook
  const isPremium = hasActiveSubscription
  const planName = userInfo?.subscription_type
    ? userInfo.subscription_type.charAt(0).toUpperCase() + userInfo.subscription_type.slice(1) + " Plan"
    : "Free Plan"

  const fileInputRef = useRef<HTMLInputElement>(null) // Ref for the hidden file input

  const fetchAccountData = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, notificationRes] = await Promise.all([
        fetch("/api/account/profile"),
        fetch("/api/account/notifications"),
      ])

      const [profileData, notificationData] = await Promise.all([profileRes.json(), notificationRes.json()])

      if (profileData.success) {
        setProfileData({
          ...profileData.data,
          avatar_url: profileData.data.avatar_url || "/placeholder.svg?height=80&width=80",
        })
      } else {
        console.error("Error fetching profile:", profileData.error)
      }

      if (notificationData.success) {
        setNotificationSettings(notificationData.data)
      } else {
        console.error("Error fetching notification settings:", notificationData.error)
      }
      // Note: isPremium and planName are now derived from useSubscription hook
    } catch (error) {
      console.error("Error fetching account data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccountData()
  }, [])

  // Update profile avatar when logoUrl changes
  // useEffect(() => {
  //   if (logoUrl) {
  //     setProfileData(prev => ({
  //       ...prev,
  //       avatar_url: logoUrl
  //     }))
  //   }
  // }, [logoUrl])

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      })
      const result = await response.json()
      if (result.success) {
        // Remove success message - no popup needed for successful save
        setIsEditing(false)
      } else {
        console.error("Error saving profile:", result.error)
        toast({
          title: "Save Failed",
          description: "Failed to save profile information.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Save Failed",
        description: "Failed to save profile information.",
        variant: "destructive"
      })
    }
  }

  const handleToggleEmailNotifications = async (checked: boolean) => {
    if (isTogglingNotifications) return // Prevent multiple simultaneous calls

    setIsTogglingNotifications(true)
    const previousValue = notificationSettings.email_notifications

    // Optimistically update UI
    setNotificationSettings((prev) => ({
      ...prev,
      email_notifications: checked
    }))

    try {
      const response = await fetch("/api/account/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_notifications: checked }),
      })

      if (!response.ok) {
        throw new Error("Failed to save notification settings")
      }
    } catch (error) {
      console.error("Error saving notification settings:", error)
      // Revert on error
      setNotificationSettings((prev) => ({
        ...prev,
        email_notifications: previousValue
      }))
    } finally {
      setIsTogglingNotifications(false)
    }
  }

  const handleSaveNotifications = async (field: "notification_email" | "reply_email" | "toggle") => {
    try {
      let updates: Partial<NotificationSettings> = {}
      if (field === "notification_email") {
        updates = { notification_email: notificationSettings.notification_email }
      } else if (field === "reply_email") {
        updates = { reply_email: notificationSettings.reply_email }
      } else if (field === "toggle") {
        updates = { email_notifications: notificationSettings.email_notifications }
      }

      const response = await fetch("/api/account/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const result = await response.json()
      if (result.success) {
        // Remove success message - no popup needed for successful save
        if (field === "notification_email") setIsEditingNotificationEmail(false)
        if (field === "reply_email") setIsEditingReplyEmail(false)
      } else {
        console.error("Error saving notifications:", result.error)
        toast({
          title: "Save Failed",
          description: "Failed to save notification preferences.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving notifications:", error)
      toast({
        title: "Save Failed",
        description: "Failed to save notification preferences.",
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    fetchAccountData() // Revert changes by refetching
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const newLogoUrl = reader.result as string
        const result = await updateLogo(newLogoUrl)
        if (result.success) {
          setProfileData((prev) => ({ ...prev, avatar_url: newLogoUrl }))
          // Remove success message - logo update is already handled by the hook
        } else {
          toast({
            title: "Upload Failed",
            description: "Failed to sync avatar across components. Please try again.",
            variant: "destructive"
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const timezones = [
    "Europe/Paris",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Tokyo",
    "Australia/Sydney",
  ]

  const languages = ["English", "French", "Spanish", "German", "Italian", "Portuguese"]

  const countries = ["France", "United Kingdom", "United States", "Germany", "Spain", "Italy", "Canada"]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => onTabChange?.("settings")}
            className="text-gray-600 hover:text-gray-900 p-2 h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Account</h1>
            <p className="text-gray-600 mt-2">Manage your profile information and preferences</p>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Profile Section */}
        <div className="space-y-0">
          {/* Profile Header with Avatar */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 ring-4 ring-gray-100">
                <AvatarImage src={logoUrl || profileData.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-black text-white text-xl font-medium">
                  {profileData.first_name?.[0]}
                  {profileData.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {profileData.first_name} {profileData.last_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{profileData.email}</p>
                    {profileData.position && (
                      <p className="text-xs text-gray-500 mt-1">{profileData.position}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`transition-all duration-200 rounded-lg ${
                      isEditing
                        ? "text-red-600 border-red-200 hover:bg-red-50"
                        : "text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>
                {isEditing && (
                  <div className="mt-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="sr-only"
                      accept="image/*"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 text-gray-700 hover:bg-gray-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          {isEditing && (
            <>
              <div className="bg-gray-50 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Personal Information</h2>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">First Name</Label>
                    <Input
                      value={profileData.first_name}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, first_name: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Last Name</Label>
                    <Input
                      value={profileData.last_name}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, last_name: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
                    <Input
                      value={profileData.phone}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Company</Label>
                    <Input
                      value={profileData.company}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, company: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Position</Label>
                    <Input
                      value={profileData.position}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, position: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="h-px bg-gray-200" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">Street Address</Label>
                    <Input
                      value={profileData.address}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, address: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">City</Label>
                    <Input
                      value={profileData.city}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, city: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Postal Code</Label>
                    <Input
                      value={profileData.postal_code}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, postal_code: e.target.value }))}
                      className="h-10 text-sm border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Country</Label>
                    <Select
                      value={profileData.country}
                      onValueChange={(value) => setProfileData((prev) => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger className="h-10 text-sm border-gray-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Timezone</Label>
                    <Select
                      value={profileData.timezone}
                      onValueChange={(value) => setProfileData((prev) => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger className="h-10 text-sm border-gray-200 rounded-lg">
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
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <Button
                    className="bg-black hover:bg-gray-800 text-white rounded-lg"
                    onClick={handleSaveProfile}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notifications Section */}
        <div className="bg-gray-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Notifications</h2>
        </div>

        <div className="space-y-0">
          <div className="p-6 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-gray-900">Daily Notifications</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                            <Info className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm">
                            <strong>Daily summary emails</strong> sent once per day with:
                            <br />• Number of new reviews received
                            <br />• Average rating for the day
                            <br />• Total review link clicks
                            <br />• Customer activity overview
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {notificationSettings.notification_email || "No email set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isEditingNotificationEmail ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Email for notifications"
                      value={notificationSettings.notification_email || ""}
                      onChange={(e) => setNotificationSettings((prev) => ({ ...prev, notification_email: e.target.value }))}
                      className="h-9 text-sm border-gray-200 w-48"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSaveNotifications("notification_email")
                        setIsEditingNotificationEmail(false)
                      }}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingNotificationEmail(true)}
                    className="text-gray-700 border-gray-200 hover:bg-gray-50"
                  >
                    Edit
                  </Button>
                )}
                <Switch
                  checked={notificationSettings.email_notifications}
                  onCheckedChange={handleToggleEmailNotifications}
                  disabled={isTogglingNotifications}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200" />

          <div className="p-6 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-gray-900">Client Replies</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                            <Info className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm">
                            <strong>Instant email alerts</strong> when customers submit feedback:
                            <br />• Customer name and contact info
                            <br />• Star rating given
                            <br />• Written feedback/comments
                            <br />• Platform source
                            <br />Perfect for responding quickly to reviews
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {notificationSettings.reply_email || "No email set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isEditingReplyEmail ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Email for replies"
                      value={notificationSettings.reply_email || ""}
                      onChange={(e) => setNotificationSettings((prev) => ({ ...prev, reply_email: e.target.value }))}
                      className="h-9 text-sm border-gray-200 w-48"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSaveNotifications("reply_email")
                        setIsEditingReplyEmail(false)
                      }}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingReplyEmail(true)}
                    className="text-gray-700 border-gray-200 hover:bg-gray-50"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="bg-gray-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Billing & Plan</h2>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Crown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900">Current Plan</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isPremium ? `${planName} - Active` : "Upgrade to unlock more features"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isPremium && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Active
                </div>
              )}
              <Button
                className="bg-black hover:bg-gray-800 text-white rounded-lg"
                onClick={() => onTabChange?.("upgrade")}
              >
                {isPremium ? "Change Plan" : "Upgrade"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

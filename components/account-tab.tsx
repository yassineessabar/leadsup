"use client"

import React from "react"

import { useState, useEffect, useCallback, useRef } from "react" // Import useRef
import { useRouter } from "next/navigation"
import { useCompanyLogo } from "@/hooks/useCompanyLogo"
import { useSubscription } from "@/hooks/use-subscription"
import { Save, Edit3, X, Globe, User, Mail, Phone, Building, MapPin, Clock, Eye, Crown, ArrowLeft, Info } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useI18n } from "@/hooks/use-i18n"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { UserProfile } from "@/types/db"

interface AccountTabProps {
  onTabChange?: (tab: string) => void
}

export function AccountTab({ onTabChange }: AccountTabProps) {
  const { t } = useI18n()
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
      const profileRes = await fetch("/api/account/profile")
      const profileData = await profileRes.json()

      if (profileData.success) {
        setProfileData({
          ...profileData.data,
          avatar_url: profileData.data.avatar_url || "/placeholder.svg?height=80&width=80",
        })
      } else {
        console.error("Error fetching profile:", profileData.error)
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
          title: t('account.profile.errors.saveFailed'),
          description: t('account.profile.errors.saveFailedDescription'),
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: t('account.profile.errors.saveFailed'),
        description: t('account.profile.errors.saveFailedDescription'),
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
            title: t('account.profile.errors.uploadFailed'),
            description: t('account.profile.errors.uploadFailedDescription'),
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
    <div className="max-w-6xl mx-auto">
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
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">{t('account.title')}</h1>
            <p className="text-gray-600">Manage your profile information and account settings</p>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden shadow-sm">


        {/* Profile Section */}
        <div className="space-y-0">
          {/* Profile Header with Avatar */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 ring-2 ring-gray-100">
                <AvatarImage src={logoUrl || profileData.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-blue-600 text-white text-xl font-medium">
                  {profileData.first_name?.[0] || 'U'}
                  {profileData.last_name?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-light text-gray-900 mb-1">
                      {profileData.first_name} {profileData.last_name}
                    </h3>
                    <p className="text-gray-600 mb-1">{profileData.email}</p>
                    {profileData.position && (
                      <p className="text-sm text-gray-500">{profileData.position}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`transition-all duration-200 rounded-2xl font-medium ${
                      isEditing
                        ? "text-red-600 border-red-200 hover:bg-red-50"
                        : "text-blue-600 border-blue-200 hover:bg-blue-50"
                    }`}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        {t('account.profile.cancel')}
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 mr-2" />
                        {t('account.profile.editProfile')}
                      </>
                    )}
                  </Button>
                </div>
                {isEditing && (
                  <div className="mt-4">
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
                      className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t('account.profile.changePhoto')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          {isEditing && (
            <>
              <div className="bg-gray-50/50 px-8 py-4">
                <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">{t('account.profile.personalInformation')}</h2>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('account.profile.firstName')}</Label>
                    <Input
                      value={profileData.first_name || ''}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, first_name: e.target.value }))}
                      className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                      placeholder={t('account.profile.placeholders.firstName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('account.profile.lastName')}</Label>
                    <Input
                      value={profileData.last_name || ''}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, last_name: e.target.value }))}
                      className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                      placeholder={t('account.profile.placeholders.lastName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('account.profile.emailAddress')}</Label>
                    <Input
                      type="email"
                      value={profileData.email || ''}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                      className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                      placeholder={t('account.profile.placeholders.email')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('account.profile.company')}</Label>
                    <Input
                      value={profileData.company || ''}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, company: e.target.value }))}
                      className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                      placeholder={t('account.profile.placeholders.company')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t('account.profile.password')}</Label>
                  <Input
                    type="password"
                    placeholder={t('account.profile.placeholders.password')}
                    className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                  />
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-300"
                    onClick={handleSaveProfile}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {t('account.profile.saveChanges')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>


        {/* Subscription Section */}
        <div className="bg-gray-50/50 px-8 py-4">
          <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">{t('account.billing.title')}</h2>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Crown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900">{t('account.billing.currentPlan')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isPremium ? `${planName} - ${t('account.billing.active')}` : t('account.billing.upgradeToUnlock')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isPremium && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {t('account.billing.active')}
                </div>
              )}
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-300"
                onClick={() => onTabChange?.("upgrade")}
              >
                {isPremium ? t('account.billing.changePlan') : t('account.billing.upgrade')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

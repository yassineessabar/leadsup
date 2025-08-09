"use client"

import { useState } from "react"
import {
  User,
  Zap,
  HelpCircle,
  FileText,
  Lightbulb,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Palette,
  Loader2,
  Bold,
  Italic,
  Underline,
  Type,
  Link,
  Image,
  Smile,
  Code
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

interface SettingsPageProps {
  onSectionChange?: (section: string) => void
}

interface SettingsItemProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  onClick?: () => void
  className?: string
}

function SettingsItem({ icon: Icon, title, description, onClick, className = "" }: SettingsItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors duration-200 group ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div className="text-left">
          <h3 className="text-base font-medium text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </button>
  )
}

function SectionSeparator() {
  return <div className="h-px bg-gray-200" />
}

export function SettingsPage({ onSectionChange }: SettingsPageProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [firstName, setFirstName] = useState("Loop")
  const [lastName, setLastName] = useState("Review")

  const handleLogout = async () => {
    if (isSigningOut) return // Prevent double clicks

    setIsSigningOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        window.location.href = "/auth/login"
      } else {
        console.error("Logout failed")
        setIsSigningOut(false)
      }
    } catch (error) {
      console.error("Error during logout:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and application preferences</p>
      </div>

      {/* Email Signature Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        {/* Sender Name Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-medium text-gray-800">Sender name</h2>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-gray-600 font-medium">
              First Name
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-12 text-lg border-gray-300 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-gray-600 font-medium">
              Last Name
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-12 text-lg border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Signature Section */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">Signature</h3>
          
          <Card className="border border-gray-300 rounded-lg overflow-hidden">
            {/* Signature Content */}
            <div className="p-8 bg-white min-h-[400px] flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <p className="text-lg">Your signature will appear here</p>
                <p className="text-sm mt-2">Use the formatting tools below to create your signature</p>
              </div>
            </div>
            
            {/* Formatting Toolbar */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Underline className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Type className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <span className="text-sm font-bold">A</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Link className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Image className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Smile className="w-4 h-4" />
                </Button>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Code className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Account Section */}
        <div className="space-y-0">
          <SettingsItem
            icon={User}
            title="Account"
            description="Manage your profile and account settings"
            onClick={() => onSectionChange?.("account")}
          />

          <SectionSeparator />

          <SettingsItem
            icon={Palette}
            title="Appearance"
            description="Customize the look and feel of your interface"
            onClick={() => onSectionChange?.("appearance")}
          />
        </div>

        {/* Billing Section */}
        <div className="bg-gray-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Billing & Plan</h2>
        </div>

        <div className="space-y-0">
          <SettingsItem
            icon={Zap}
            title="Upgrade Plan"
            description="Unlock premium features and increased limits"
            onClick={() => onSectionChange?.("upgrade")}
          />

          <SectionSeparator />

          <SettingsItem
            icon={CreditCard}
            title="Billing & Invoices"
            description="View your billing history and payment methods"
            onClick={() => onSectionChange?.("billing")}
          />
        </div>

        {/* Support Section */}
        <div className="bg-gray-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Support & Resources</h2>
        </div>

        <div className="space-y-0">
          <SettingsItem
            icon={HelpCircle}
            title="Help Center"
            description="Find answers to common questions"
            onClick={() => window.open("https://loopreview.io/#contact", "_blank")}
          />

          <SectionSeparator />

          <SettingsItem
            icon={Shield}
            title="Privacy & Security"
            description="Control your privacy settings and security options"
            onClick={() => window.open("https://loopreview.io/privacy-policy", "_blank")}
          />
        </div>

        {/* Account Actions */}
        <div className="bg-gray-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account Actions</h2>
        </div>

        <div className="space-y-0">

          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className="w-full flex items-center justify-between p-6 hover:bg-red-50 transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                {isSigningOut ? (
                  <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-red-600">
                  {isSigningOut ? "Signing Out..." : "Sign Out"}
                </h3>
                <p className="text-sm text-red-500 mt-0.5">
                  {isSigningOut ? "Please wait..." : "Sign out of your account"}
                </p>
              </div>
            </div>
            {!isSigningOut && (
              <ChevronRight className="h-5 w-5 text-red-400 group-hover:text-red-600 transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Need help? <a href="/support" className="text-blue-600 hover:text-blue-700 font-medium">Contact Support</a></p>
      </div>
    </div>
  )
}
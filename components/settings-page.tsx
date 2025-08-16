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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SettingsPageProps {
  onSectionChange?: (section: string) => void
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
        <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and application preferences</p>
      </div>

      {/* Settings List */}
      <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-2xl overflow-hidden">
        <div className="divide-y divide-gray-50">
          {/* Account Section */}
          <button
            onClick={() => onSectionChange?.("account")}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100/50 flex items-center justify-center group-hover:bg-gray-200/50 transition-colors">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-gray-900">Profile</h3>
                <p className="text-sm text-gray-500">Manage your profile and account settings</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>

          {/* Billing Section */}
          <button
            onClick={() => onSectionChange?.("upgrade")}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100/50 flex items-center justify-center group-hover:bg-gray-200/50 transition-colors">
                <Zap className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-gray-900">Upgrade Plan</h3>
                <p className="text-sm text-gray-500">Unlock premium features and increased limits</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>

          <button
            onClick={() => onSectionChange?.("billing")}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100/50 flex items-center justify-center group-hover:bg-gray-200/50 transition-colors">
                <CreditCard className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-gray-900">Billing & Invoices</h3>
                <p className="text-sm text-gray-500">View your billing history and payment methods</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>

          {/* Support Section */}
          <button
            onClick={() => window.open("https://loopreview.io/#contact", "_blank")}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100/50 flex items-center justify-center group-hover:bg-gray-200/50 transition-colors">
                <HelpCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-gray-900">Help Center</h3>
                <p className="text-sm text-gray-500">Find answers to common questions</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>

          <button
            onClick={() => window.open("https://loopreview.io/privacy-policy", "_blank")}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100/50 flex items-center justify-center group-hover:bg-gray-200/50 transition-colors">
                <Shield className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-gray-900">Privacy & Security</h3>
                <p className="text-sm text-gray-500">Control your privacy settings and security options</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>

          {/* Account Actions */}
          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100/50 flex items-center justify-center group-hover:bg-gray-200/50 transition-colors">
                {isSigningOut ? (
                  <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-gray-900">
                  {isSigningOut ? "Signing Out..." : "Sign Out"}
                </h3>
                <p className="text-sm text-gray-500">
                  {isSigningOut ? "Please wait..." : "Sign out of your account"}
                </p>
              </div>
            </div>
            {!isSigningOut && (
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Need help? <a href="/support" className="font-medium" style={{ color: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(87, 140, 255)'}>Contact Support</a></p>
      </div>
    </div>
  )
}
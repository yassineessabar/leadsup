"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { UpgradeProDialog } from "./upgrade-pro-dialog"
import Image from "next/image"
import { CheckCircle, Plus, Upload, Zap } from "lucide-react"

// Local ColorInput component
interface ColorInputProps {
  label: string
  value: string
  onChange?: (value: string) => void
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div>
      <label
        htmlFor={`${label.toLowerCase().replace(/\s/g, "-")}-input`}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <div className="mt-1 flex rounded-md shadow-sm">
        <span
          className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          id={`${label.toLowerCase().replace(/\s/g, "-")}-input`}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 rounded-none rounded-r-md border-l-0 h-10 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
        />
      </div>
    </div>
  )
}

interface DesignPageProps {
  customizationSettings: {
    company_name: string
    company_logo_url: string | null
    primary_color: string
    secondary_color: string
    show_powered_by: boolean
    messages: any
    conditional_actions: any
    trustpilot_url: string
    google_url: string
    facebook_url: string
    enabled_platforms: string[]
  }
  setCustomizationSettings: (settings: any) => void
  links: any[]
  headerSettings: any
  initialViewSettings: any
  negativeSettings: any
  videoUploadSettings: any
  previewStep: string
  setPreviewStep: (step: string) => void
  isPremium?: boolean
}

interface ThemeColors {
  primary: string
  secondary: string
}

const THEME_PRESETS: Record<string, ThemeColors> = {
  custom: { primary: "#000000", secondary: "#333333" },
  "loop-blue": { primary: "#3B82F6", secondary: "#60A5FA" },
  "loop-yellow": { primary: "#F59E0B", secondary: "#FCD34D" },
}

export default function DesignPage({
  customizationSettings,
  setCustomizationSettings,
  links,
  headerSettings,
  initialViewSettings,
  negativeSettings,
  videoUploadSettings,
  previewStep,
  setPreviewStep,
  isPremium = false
}: DesignPageProps) {
  const [selectedProfile, setSelectedProfile] = useState("classic")
  const [selectedTheme, setSelectedTheme] = useState("custom")
  const [selectedFont, setSelectedFont] = useState("gothic-a1")
  const [textColor, setTextColor] = useState("#FFFFFF")
  const [buttonTextColor, setButtonTextColor] = useState("#FFFFFF")
  const [buttonStyle, setButtonStyle] = useState("rounded-full")
  const [isSaving, setIsSaving] = useState(false)

  // Apply theme changes
  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme)
    if (theme !== "custom") {
      const colors = THEME_PRESETS[theme]
      setCustomizationSettings((prev: any) => ({
        ...prev,
        primary_color: colors.primary,
        secondary_color: colors.secondary
      }))
    }
  }

  // Save all design settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Here you would typically save to your backend
      // For now, we're just updating the local state
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call

      // Show success message
      const toast = document.createElement('div')
      toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      toast.textContent = 'Design settings saved successfully!'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
        <h1 className="text-2xl font-bold">Design</h1>

        {/* Profile Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <Card className="p-6 rounded-2xl shadow-sm bg-white dark:bg-gray-800">
            <div className="grid grid-cols-2 gap-4">
              {/* Classic Profile Option */}
              <div
                className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer ${
                  selectedProfile === "classic"
                    ? "border-black"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                }`}
                onClick={() => {
                  setSelectedProfile("classic")
                  // You can add logic here to change header style if needed
                }}
              >
                {customizationSettings.company_logo_url ? (
                  <Image
                    src={customizationSettings.company_logo_url}
                    alt="Classic Profile"
                    width={100}
                    height={100}
                    className="rounded-full mb-2 object-cover"
                  />
                ) : (
                  <div className="w-[100px] h-[100px] rounded-full mb-2 bg-gray-200 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <p className="text-sm font-medium">Classic</p>
                {selectedProfile === "classic" && (
                  <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-black fill-black" />
                )}
              </div>

              {/* Hero Profile Option */}
              <div
                className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer ${
                  selectedProfile === "hero"
                    ? "border-black"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                }`}
                onClick={() => {
                  setSelectedProfile("hero")
                  // You can add logic here to change header style if needed
                }}
              >
                {customizationSettings.company_logo_url ? (
                  <Image
                    src={customizationSettings.company_logo_url}
                    alt="Hero Profile"
                    width={100}
                    height={100}
                    className="rounded-2xl mb-2 object-cover"
                  />
                ) : (
                  <div className="w-[100px] h-[100px] rounded-2xl mb-2 bg-gray-200 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <p className="text-sm font-medium">Hero</p>
                {selectedProfile === "hero" && (
                  <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-black fill-black" />
                )}
                {!isPremium && (
                  <Plus className="absolute top-2 right-2 h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
            <Button variant="outline" className="mt-6 w-full rounded-full py-6 text-base font-semibold bg-transparent">
              Edit image
            </Button>
          </Card>
        </section>

        {/* Theme Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Theme</h2>
          <Card className="p-6 rounded-2xl shadow-sm bg-white dark:bg-gray-800">
            <div className="grid grid-cols-3 gap-4">
              {/* Custom Theme */}
              <div
                className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-2xl h-40 cursor-pointer ${
                  selectedTheme === "custom"
                    ? "border-black"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                }`}
                onClick={() => handleThemeChange("custom")}
              >
                <p className="text-center text-sm font-medium">CREATE YOUR OWN</p>
                <p className="text-xs text-gray-500">Custom</p>
                {selectedTheme === "custom" && (
                  <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-black fill-black" />
                )}
              </div>

              {/* Loop Blue Theme */}
              <div
                className={`relative flex flex-col items-center p-2 border-2 rounded-2xl h-40 cursor-pointer ${
                  selectedTheme === "loop-blue"
                    ? "border-black"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                }`}
                onClick={() => handleThemeChange("loop-blue")}
              >
                <div className="w-full h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl mb-2"></div>
                <p className="text-sm font-medium">Loop Blue</p>
                {selectedTheme === "loop-blue" && (
                  <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-black fill-black" />
                )}
                {!isPremium && (
                  <Plus className="absolute top-2 right-2 h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Loop Yellow Theme */}
              <div
                className={`relative flex flex-col items-center p-2 border-2 rounded-2xl h-40 cursor-pointer ${
                  selectedTheme === "loop-yellow"
                    ? "border-black"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                }`}
                onClick={() => handleThemeChange("loop-yellow")}
              >
                <div className="w-full h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl mb-2"></div>
                <p className="text-sm font-medium">Loop Yellow</p>
                {selectedTheme === "loop-yellow" && (
                  <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-black fill-black" />
                )}
                {!isPremium && (
                  <Plus className="absolute top-2 right-2 h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Style Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Style</h2>
          <Card className="p-6 rounded-2xl shadow-sm bg-white dark:bg-gray-800">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="text" className="rounded-2xl">Text</TabsTrigger>
                <TabsTrigger value="buttons" className="rounded-2xl">Buttons</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-4 space-y-4">
                <div>
                  <label htmlFor="font-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Font
                  </label>
                  <Select value={selectedFont} onValueChange={setSelectedFont}>
                    <SelectTrigger id="font-select" className="w-full mt-1 rounded-2xl">
                      <SelectValue placeholder="Select a font" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="gothic-a1">Gothic A1</SelectItem>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ColorInput
                  label="Page text color"
                  value={textColor}
                  onChange={(value) => {
                    setTextColor(value)
                    // Apply to preview if needed
                  }}
                />
                <ColorInput
                  label="Button text color"
                  value={buttonTextColor}
                  onChange={(value) => {
                    setButtonTextColor(value)
                    // This could be applied to button text in the preview
                  }}
                />
              </TabsContent>
              <TabsContent value="buttons" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Button Style
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Button
                        variant={buttonStyle === "rounded-md" ? "default" : "outline"}
                        className="rounded-md"
                        onClick={() => setButtonStyle("rounded-md")}
                      >
                        Square
                      </Button>
                      <Button
                        variant={buttonStyle === "rounded-lg" ? "default" : "outline"}
                        className="rounded-lg"
                        onClick={() => setButtonStyle("rounded-lg")}
                      >
                        Rounded
                      </Button>
                      <Button
                        variant={buttonStyle === "rounded-full" ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => setButtonStyle("rounded-full")}
                      >
                        Full
                      </Button>
                    </div>
                  </div>
                  <ColorInput
                    label="Button background color"
                    value={customizationSettings.primary_color}
                    onChange={(value) => {
                      setCustomizationSettings((prev: any) => ({
                        ...prev,
                        primary_color: value
                      }))
                    }}
                  />
                  <ColorInput
                    label="Button secondary color"
                    value={customizationSettings.secondary_color}
                    onChange={(value) => {
                      setCustomizationSettings((prev: any) => ({
                        ...prev,
                        secondary_color: value
                      }))
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </section>

        {/* Hide Loop Footer Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Hide Loop Footer</h2>
          <Card className="p-6 rounded-2xl shadow-sm bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                  Hide the Loop footer
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Remove "Powered by Loop" from your review pages
                </p>
              </div>
              {isPremium ? (
                <Switch
                  checked={!customizationSettings.show_powered_by}
                  onCheckedChange={(checked) =>
                    setCustomizationSettings((prev: any) => ({
                      ...prev,
                      show_powered_by: !checked
                    }))
                  }
                />
              ) : (
                <UpgradeProDialog>
                  <Button variant="ghost" size="sm" className="text-yellow-600 hover:text-yellow-700">
                    <Zap className="h-4 w-4 mr-1" />
                    Upgrade
                  </Button>
                </UpgradeProDialog>
              )}
            </div>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Zap className="h-3 w-3" />
                <span>Powered by Loop</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Save Button */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700 -mx-6 mt-8">
          <Button
            className="w-full rounded-full bg-black text-white hover:bg-gray-800"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Design Settings"}
          </Button>
        </div>
    </div>
  )
}
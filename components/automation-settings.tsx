"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, ChevronDown, Save } from 'lucide-react'
import { toast } from "@/hooks/use-toast"

const emailAccounts = [
  "contact@leadsupbase.com",
  "contact@leadsupdirect.co",
  "contact@leadsupdirect.com",
  "contact@leadsuplab.co",
  "contact@leadsuplab.com",
  "contact@leadsupresch.co"
]

interface AutomationSettingsProps {
  campaignId?: number
}

export default function AutomationSettings({ campaignId }: AutomationSettingsProps) {
  const [stopOnReply, setStopOnReply] = useState(true)
  const [openTracking, setOpenTracking] = useState(true)
  const [linkTracking, setLinkTracking] = useState(false)
  const [textOnlyEmails, setTextOnlyEmails] = useState(false)
  const [firstEmailTextOnly, setFirstEmailTextOnly] = useState(true)
  const [dailyLimit, setDailyLimit] = useState("1000")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedAccounts, setSelectedAccounts] = useState(emailAccounts)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load existing settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      if (!campaignId) return

      try {
        setLoading(true)
        const response = await fetch(`/api/automation-settings?campaignId=${campaignId}`)
        const result = await response.json()

        if (response.ok && result.settings) {
          const settings = result.settings
          setStopOnReply(settings.stop_on_reply ?? settings.stopOnReply ?? true)
          setOpenTracking(settings.open_tracking ?? settings.openTracking ?? true)
          setLinkTracking(settings.link_tracking ?? settings.linkTracking ?? false)
          setTextOnlyEmails(settings.text_only_emails ?? settings.textOnlyEmails ?? false)
          setFirstEmailTextOnly(settings.first_email_text_only ?? settings.firstEmailTextOnly ?? true)
          setDailyLimit(String(settings.daily_limit ?? settings.dailyLimit ?? 1000))
          setSelectedAccounts(settings.selected_accounts ?? settings.selectedAccounts ?? emailAccounts)
        }
      } catch (error) {
        console.error('Error loading automation settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [campaignId])

  const removeAccount = (accountToRemove: string) => {
    setSelectedAccounts(prev => prev.filter(account => account !== accountToRemove))
  }

  const handleSave = async () => {
    try {
      if (!campaignId) {
        toast({
          title: "Error",
          description: "Campaign ID is required to save settings.",
          variant: "destructive"
        })
        return
      }

      setSaving(true)

      const settings = {
        campaignId,
        stopOnReply,
        openTracking,
        linkTracking,
        textOnlyEmails,
        firstEmailTextOnly,
        dailyLimit: parseInt(dailyLimit),
        selectedAccounts
      }

      const response = await fetch('/api/automation-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: result.message || "Your automation settings have been saved to the database successfully.",
        })
      } else {
        throw new Error(result.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving automation settings:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save automation settings to database.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Accounts to use */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Accounts to use</h3>
              <p className="text-sm text-gray-600 mt-1">Select one or more accounts to send emails from</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {selectedAccounts.map((account, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm">
                  <span>{account}</span>
                  <button
                    onClick={() => removeAccount(account)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm">
                <span>+19 more</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Stop sending emails on reply */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Stop sending emails on reply</h3>
              <p className="text-sm text-gray-600 mt-1">Stop sending emails to a lead if a response has been received</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={stopOnReply ? "outline" : "outline"}
                size="sm"
                onClick={() => setStopOnReply(false)}
                className={`${!stopOnReply ? 'bg-gray-100 text-gray-700' : 'text-gray-600 border-gray-300'}`}
              >
                Disable
              </Button>
              <Button
                variant={stopOnReply ? "default" : "outline"}
                size="sm"
                onClick={() => setStopOnReply(true)}
                className={`${stopOnReply ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 border-gray-300'}`}
              >
                Enable
              </Button>
            </div>
          </div>
        </div>

        {/* Open Tracking */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Open Tracking</h3>
              <p className="text-sm text-gray-600 mt-1">Track email opens</p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="link-tracking"
                  checked={linkTracking}
                  onCheckedChange={setLinkTracking}
                  className="border-gray-300"
                />
                <label htmlFor="link-tracking" className="text-sm text-gray-700">
                  Link tracking
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={openTracking ? "outline" : "outline"}
                  size="sm"
                  onClick={() => setOpenTracking(false)}
                  className={`${!openTracking ? 'bg-gray-100 text-gray-700' : 'text-gray-600 border-gray-300'}`}
                >
                  Disable
                </Button>
                <Button
                  variant={openTracking ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOpenTracking(true)}
                  className={`${openTracking ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 border-gray-300'}`}
                >
                  Enable
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Optimization */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-medium text-gray-900">Delivery Optimization</h3>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Recommended
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Disables open tracking</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="text-only-emails"
                  checked={textOnlyEmails}
                  onCheckedChange={setTextOnlyEmails}
                  className="border-gray-300"
                />
                <label htmlFor="text-only-emails" className="text-sm text-gray-700">
                  Send emails as text-only (no HTML)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="first-email-text-only"
                  checked={firstEmailTextOnly}
                  onCheckedChange={setFirstEmailTextOnly}
                  className="border-gray-300"
                />
                <label htmlFor="first-email-text-only" className="text-sm text-gray-700 flex items-center space-x-2">
                  <span>Send first email as text-only</span>
                  <Badge className="bg-orange-100 text-orange-800 text-xs">
                    Pro
                  </Badge>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Limit */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Daily Limit</h3>
              <p className="text-sm text-gray-600 mt-1">Max number of emails to send per day for this campaign</p>
            </div>
            
            <div className="w-32">
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="text-center border-gray-300 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]"
              />
            </div>
          </div>
        </div>

        {/* Show advanced options */}
        <div className="text-center">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors mx-auto"
          >
            <span className="text-sm">Show advanced options</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4 pt-8">
          <Button 
            className="text-white px-8" style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
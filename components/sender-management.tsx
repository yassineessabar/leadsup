"use client"

import { useState, useEffect } from "react"
import {
  Mail,
  Plus,
  Trash2,
  Star,
  StarOff,
  ArrowLeft,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  Edit3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { fetchHealthScores, getHealthScoreColor, type HealthScoreResult } from "@/lib/health-score"

interface Sender {
  id: string
  email: string
  display_name: string
  is_default: boolean
  is_active: boolean
  emails_sent: number
  created_at: string
  setup_status: 'completed' | 'warming_up' | 'needs_attention' | 'pending'
  daily_limit: number
  health_score: number
}

interface Domain {
  id: string
  domain: string
  status: string
}

interface SenderManagementProps {
  domainId: string
  onBack: () => void
}

export function SenderManagement({ domainId, onBack }: SenderManagementProps) {
  const [domain, setDomain] = useState<Domain | null>(null)
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSender, setShowAddSender] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState<string | null>(null)
  const [addSenderForm, setAddSenderForm] = useState({
    localPart: '', // Just the part before @
    display_name: '',
    is_default: false
  })
  const [editSenderForm, setEditSenderForm] = useState({
    display_name: '',
    daily_limit: 50,
    is_default: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [creatingPresets, setCreatingPresets] = useState(false)
  const [healthScores, setHealthScores] = useState<Record<string, HealthScoreResult>>({})

  // Load health scores for all senders
  const loadHealthScores = async () => {
    try {
      console.log('📊 Loading health scores for domain senders...')
      
      const senderIds = senders.map(sender => sender.id)
      
      if (senderIds.length === 0) {
        console.log('⚠️ No sender IDs available for health score calculation')
        return
      }
      
      console.log('🔍 Fetching health scores for:', senderIds.length, 'senders')
      const scores = await fetchHealthScores(senderIds)
      setHealthScores(scores)
      
      console.log('✅ Loaded health scores for', Object.keys(scores).length, 'accounts')
    } catch (error) {
      console.error('❌ Error loading health scores:', error)
      // Don't show error toast as this is not critical functionality
    }
  }


  // Calculate statistics
  const getStats = () => {
    const totalAccounts = senders.length
    const activeWarmup = senders.filter(s => s.setup_status === 'warming_up').length
    const needAttention = senders.filter(s => s.setup_status === 'needs_attention').length
    const healthScoreValues = senders.map(s => healthScores[s.id]?.score).filter(score => score !== undefined)
    const avgScore = healthScoreValues.length > 0 ? 
      Math.round(healthScoreValues.reduce((sum, score) => sum + score, 0) / healthScoreValues.length) : 0
    
    return { totalAccounts, activeWarmup, needAttention, avgScore }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'warming_up':
        return 'bg-blue-100 text-blue-700'
      case 'needs_attention':
        return 'bg-red-100 text-red-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Active'
      case 'warming_up':
        return 'Warming Up'
      case 'needs_attention':
        return 'Needs Attention'
      case 'pending':
        return 'Pending'
      default:
        return 'Unknown'
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  useEffect(() => {
    fetchSenders()
  }, [domainId])

  // Load health scores when senders are loaded
  useEffect(() => {
    if (senders.length > 0) {
      loadHealthScores()
    }
  }, [senders])

  const createPresetSenders = async (domainName: string) => {
    const presetAccounts = [
      { localPart: 'contact', displayName: 'Contact', healthScore: 85 },
      { localPart: 'hello', displayName: 'Hello', healthScore: 78 },
      { localPart: 'info', displayName: 'Info', healthScore: 92 }
    ]

    try {
      setCreatingPresets(true)
      
      // Create all preset accounts in parallel
      const createPromises = presetAccounts.map((account, index) => 
        fetch(`/api/domains/${domainId}/senders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `${account.localPart}@${domainName}`,
            display_name: account.displayName,
            is_default: index === 0 // Make 'contact' the default
          })
        })
      )

      const responses = await Promise.all(createPromises)
      const successCount = responses.filter(r => r.ok).length
      
      if (successCount > 0) {
        toast.success(`Created ${successCount} preset email accounts`)
        // Refresh the senders list after creating presets
        const updatedResponse = await fetch(`/api/domains/${domainId}/senders`)
        const updatedData = await updatedResponse.json()
        if (updatedResponse.ok) {
          setSenders(updatedData.senders)
        }
      }
    } catch (error) {
      console.error('Error creating preset senders:', error)
    } finally {
      setCreatingPresets(false)
    }
  }

  const fetchSenders = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/domains/${domainId}/senders`)
      const data = await response.json()

      if (response.ok) {
        setDomain(data.domain)
        setSenders(data.senders)
        
        // If no senders exist and domain is loaded, create preset accounts
        if (data.senders.length === 0 && data.domain) {
          await createPresetSenders(data.domain.domain)
        }
      } else {
        toast.error(data.error || 'Failed to load sender accounts')
      }
    } catch (error) {
      console.error('Error fetching senders:', error)
      toast.error('Failed to load sender accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSender = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!addSenderForm.localPart) {
      toast.error('Email is required')
      return
    }

    // Combine localPart with domain to create full email
    const fullEmail = `${addSenderForm.localPart}@${domain?.domain}`

    setSubmitting(true)
    try {
      const response = await fetch(`/api/domains/${domainId}/senders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fullEmail,
          display_name: addSenderForm.display_name,
          is_default: addSenderForm.is_default
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Sender account created successfully')
        setShowAddSender(false)
        setAddSenderForm({ localPart: '', display_name: '', is_default: false })
        fetchSenders()
      } else {
        toast.error(data.error || 'Failed to create sender account')
      }
    } catch (error) {
      console.error('Error creating sender:', error)
      toast.error('Failed to create sender account')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetDefault = async (senderId: string) => {
    try {
      const response = await fetch(`/api/domains/${domainId}/senders/${senderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Default sender updated')
        fetchSenders()
      } else {
        toast.error(data.error || 'Failed to update default sender')
      }
    } catch (error) {
      console.error('Error updating default sender:', error)
      toast.error('Failed to update default sender')
    }
  }

  const handleEditSender = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!showEditDialog) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/domains/${domainId}/senders/${showEditDialog}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: editSenderForm.display_name,
          daily_limit: editSenderForm.daily_limit,
          is_default: editSenderForm.is_default
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Sender account updated successfully')
        setShowEditDialog(null)
        setEditSenderForm({ display_name: '', daily_limit: 50, is_default: false })
        fetchSenders()
      } else {
        toast.error(data.error || 'Failed to update sender account')
      }
    } catch (error) {
      console.error('Error updating sender:', error)
      toast.error('Failed to update sender account')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSender = async (senderId: string) => {
    try {
      const response = await fetch(`/api/domains/${domainId}/senders/${senderId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Sender account deleted')
        setShowDeleteDialog(null)
        fetchSenders()
      } else {
        toast.error(data.error || 'Failed to delete sender account')
      }
    } catch (error) {
      console.error('Error deleting sender:', error)
      toast.error('Failed to delete sender account')
    }
  }

  const handleLocalPartChange = (localPart: string) => {
    setAddSenderForm(prev => ({
      ...prev,
      localPart,
      display_name: prev.display_name || localPart // Auto-fill display name from local part
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">
                {creatingPresets ? 'Setting up your email accounts...' : 'Loading sender accounts...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)]">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost"
            onClick={onBack} 
            className="text-gray-600 hover:text-gray-900 -ml-2 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Domains
          </Button>
          
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Email Senders</h1>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">{domain?.domain}</span>
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Connected</span>
                  </div>
                </div>
                <p className="text-gray-500 font-light">
                  Manage who can send emails from this domain
                </p>
              </div>

              <Button 
                onClick={() => setShowAddSender(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sender
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {senders.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {(() => {
                const stats = getStats()
                return (
                  <>
                    <div className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
                      <div className="p-6">
                        <div className="text-3xl font-light text-gray-900">{stats.totalAccounts}</div>
                        <div className="text-sm text-gray-500 mt-1">Total Accounts</div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
                      <div className="p-6">
                        <div className="text-3xl font-light text-blue-600">{stats.activeWarmup}</div>
                        <div className="text-sm text-gray-500 mt-1">Active Warmup</div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
                      <div className="p-6">
                        <div className="text-3xl font-light text-red-600">{stats.needAttention}</div>
                        <div className="text-sm text-gray-500 mt-1">Need Attention</div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
                      <div className="p-6">
                        <div className={`text-3xl font-light ${getHealthScoreColor(stats.avgScore)}`}>{stats.avgScore}%</div>
                        <div className="text-sm text-gray-500 mt-1">Avg. Score</div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Senders */}
        <div>
          {senders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No senders yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Add email addresses that can send from this domain. Each sender gets their own email identity.
              </p>
              <Button 
                onClick={() => setShowAddSender(true)} 
                className="text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Sender
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Show info about preset accounts if they were just created */}
              {senders.length === 3 && 
               senders.some(s => s.email.startsWith('contact@')) && 
               senders.some(s => s.email.startsWith('hello@')) && 
               senders.some(s => s.email.startsWith('info@')) && (
                <div className="bg-blue-50 rounded-2xl p-6 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      We've created 3 common email accounts for you. You can add more or customize these as needed.
                    </p>
                  </div>
                </div>
              )}
              
              {senders.map((sender) => (
                <div key={sender.id} className={`bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden ${sender.is_default ? 'ring-2 ring-blue-200' : ''}`}>
                  <div className="p-8">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">{sender.display_name || sender.email.split('@')[0]}</h3>
                          {sender.is_default && (
                            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex-shrink-0">Primary</span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3 truncate">{sender.email}</p>
                        
                        {/* Sender details in grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 mb-1">Daily Limit</div>
                            <div className="font-medium text-gray-900">{sender.daily_limit || 50}/day</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Health Score</div>
                            {Object.keys(healthScores).length === 0 ? (
                              <div className="font-medium text-lg text-gray-400">
                                <div className="animate-pulse">--</div>
                              </div>
                            ) : (
                              <div className={`font-medium text-lg ${getHealthScoreColor(healthScores[sender.id]?.score || 0)}`}>
                                {healthScores[sender.id]?.score || '--'}%
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{sender.emails_sent || 0} emails sent</span>
                            <span>Added {new Date(sender.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 flex-shrink-0 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditSenderForm({
                            display_name: sender.display_name,
                            daily_limit: sender.daily_limit || 50,
                            is_default: sender.is_default
                          })
                          setShowEditDialog(sender.id)
                        }}
                        className="border-gray-300 hover:bg-gray-50 text-gray-600 px-3 py-2 rounded-2xl font-medium transition-all duration-300"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteDialog(sender.id)}
                        className="border-red-300 hover:bg-red-50 text-red-600 px-3 py-2 rounded-2xl font-medium transition-all duration-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Sender Dialog */}
        <Dialog open={showAddSender} onOpenChange={setShowAddSender}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-xl font-medium text-gray-900">Add New Sender</DialogTitle>
              <DialogDescription className="text-gray-500">
                Create a new email sender for {domain?.domain}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSender} className="space-y-6">
              <div>
                <Label htmlFor="localPart" className="text-sm font-medium text-gray-700 mb-2 block">
                  Email Address
                </Label>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black transition-colors">
                  <Input
                    id="localPart"
                    type="text"
                    value={addSenderForm.localPart}
                    onChange={(e) => handleLocalPartChange(e.target.value)}
                    placeholder="support"
                    className="flex-1 border-none rounded-none focus:ring-0 focus:border-transparent"
                    required
                  />
                  <div className="bg-gray-50 px-4 py-2.5 text-gray-600 flex items-center border-l border-gray-300">
                    @{domain?.domain || 'loading...'}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This will create: {addSenderForm.localPart || 'example'}@{domain?.domain}
                </p>
              </div>

              <div>
                <Label htmlFor="display_name" className="text-sm font-medium text-gray-700 mb-2 block">
                  Display Name (Optional)
                </Label>
                <Input
                  id="display_name"
                  value={addSenderForm.display_name}
                  onChange={(e) => setAddSenderForm(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Support Team"
                  className="border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
                />
                <p className="text-sm text-gray-500 mt-2">
                  How this sender will appear in recipient emails
                </p>
              </div>

              {senders.length === 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      This will be your primary sender since it's the first one.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddSender(false)}
                  disabled={submitting}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:bg-gray-300"
                  style={{ backgroundColor: submitting ? undefined : 'rgb(87, 140, 255)' }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                    }
                  }}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Sender
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Sender Dialog */}
        <Dialog open={!!showEditDialog} onOpenChange={() => setShowEditDialog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-xl font-medium text-gray-900">Edit Sender</DialogTitle>
              <DialogDescription className="text-gray-500">
                Update the details for this email sender
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSender} className="space-y-6">
              <div>
                <Label htmlFor="edit_display_name" className="text-sm font-medium text-gray-700 mb-2 block">
                  Display Name
                </Label>
                <Input
                  id="edit_display_name"
                  value={editSenderForm.display_name}
                  onChange={(e) => setEditSenderForm(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Support Team"
                  className="border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
                />
                <p className="text-sm text-gray-500 mt-2">
                  How this sender will appear in recipient emails
                </p>
              </div>

              <div>
                <Label htmlFor="edit_daily_limit" className="text-sm font-medium text-gray-700 mb-2 block">
                  Daily Email Limit
                </Label>
                <Input
                  id="edit_daily_limit"
                  type="number"
                  value={editSenderForm.daily_limit}
                  onChange={(e) => setEditSenderForm(prev => ({ ...prev, daily_limit: parseInt(e.target.value) || 50 }))}
                  min="1"
                  max="500"
                  className="border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Maximum number of emails this sender can send per day
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_default"
                  checked={editSenderForm.is_default}
                  onChange={(e) => setEditSenderForm(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                <Label htmlFor="edit_is_default" className="text-sm text-gray-700">
                  Make this the primary sender
                </Label>
              </div>

              <DialogFooter className="gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(null)}
                  disabled={submitting}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:bg-gray-300"
                  style={{ backgroundColor: submitting ? undefined : 'rgb(87, 140, 255)' }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                    }
                  }}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Sender
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-xl font-medium text-gray-900">Remove Sender</DialogTitle>
              <DialogDescription className="text-gray-500">
                Are you sure you want to remove this email sender? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={() => showDeleteDialog && handleDeleteSender(showDeleteDialog)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Remove Sender
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
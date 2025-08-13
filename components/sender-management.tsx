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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Sender {
  id: string
  email: string
  display_name: string
  is_default: boolean
  is_active: boolean
  emails_sent: number
  created_at: string
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
  const [addSenderForm, setAddSenderForm] = useState({
    localPart: '', // Just the part before @
    display_name: '',
    is_default: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [creatingPresets, setCreatingPresets] = useState(false)

  useEffect(() => {
    fetchSenders()
  }, [domainId])

  const createPresetSenders = async (domainName: string) => {
    const presetAccounts = [
      { localPart: 'contact', displayName: 'Contact' },
      { localPart: 'hello', displayName: 'Hello' },
      { localPart: 'info', displayName: 'Info' }
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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-light text-gray-900 mb-2">Email Senders</h1>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">{domain?.domain}</span>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Connected</span>
                </div>
              </div>
              <p className="text-gray-500 text-lg">
                Manage who can send emails from this domain
              </p>
            </div>

            <Button 
              onClick={() => setShowAddSender(true)} 
              className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sender
            </Button>
          </div>
        </div>

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
                className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Sender
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show info about preset accounts if they were just created */}
              {senders.length === 3 && 
               senders.some(s => s.email.startsWith('contact@')) && 
               senders.some(s => s.email.startsWith('hello@')) && 
               senders.some(s => s.email.startsWith('info@')) && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      We've created 3 common email accounts for you. You can add more or customize these as needed.
                    </p>
                  </div>
                </div>
              )}
              
              {senders.map((sender) => (
                <div key={sender.id} className={`bg-white border rounded-xl p-6 hover:shadow-md transition-shadow ${sender.is_default ? 'ring-2 ring-gray-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-600" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-medium text-gray-900">{sender.display_name || sender.email.split('@')[0]}</h3>
                          {sender.is_default && (
                            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">Primary</span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-1">{sender.email}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{sender.emails_sent || 0} emails sent</span>
                          <span>Added {new Date(sender.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteDialog(sender.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 px-3 py-2 rounded-lg font-medium transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                  className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Sender
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
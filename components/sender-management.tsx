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

  useEffect(() => {
    fetchSenders()
  }, [domainId])

  const fetchSenders = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/domains/${domainId}/senders`)
      const data = await response.json()

      if (response.ok) {
        setDomain(data.domain)
        setSenders(data.senders)
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
              <span className="text-gray-600">Loading sender accounts...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={onBack} 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Domains
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sender Accounts</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">{domain?.domain}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">Verified</Badge>
                </div>
              </div>
              <p className="text-gray-600 mt-2">
                Manage sender email addresses for this domain. All emails will be sent through SendGrid.
              </p>
            </div>

            <Button onClick={() => setShowAddSender(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Sender
            </Button>
          </div>
        </div>

        {/* Senders Grid */}
        {senders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sender Accounts</h3>
              <p className="text-gray-600 text-center mb-6">
                Add sender email addresses to start sending emails from this domain.
              </p>
              <Button onClick={() => setShowAddSender(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Sender
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {senders.map((sender) => (
              <Card key={sender.id} className={`${sender.is_default ? 'ring-2 ring-blue-200 border-blue-200' : ''}`}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{sender.display_name}</h3>
                        {sender.is_default && (
                          <Badge className="bg-blue-100 text-blue-700">Default</Badge>
                        )}
                      </div>
                      <p className="text-gray-600">{sender.email}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{sender.emails_sent} emails sent</span>
                        <span>Added {new Date(sender.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(sender.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Sender Dialog */}
        <Dialog open={showAddSender} onOpenChange={setShowAddSender}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Sender Account</DialogTitle>
              <DialogDescription>
                Create a new sender email address for {domain?.domain}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSender} className="space-y-4">
              <div>
                <Label htmlFor="localPart">Email Address</Label>
                <div className="flex mt-1 border rounded-md overflow-hidden">
                  <Input
                    id="localPart"
                    type="text"
                    value={addSenderForm.localPart}
                    onChange={(e) => handleLocalPartChange(e.target.value)}
                    placeholder="sender"
                    className="flex-1 border-none rounded-none focus:ring-0"
                    required
                  />
                  <div className="bg-gray-50 px-3 py-2 text-gray-600 border-l flex items-center">
                    @{domain?.domain || 'loading...'}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Enter the part before @{domain?.domain}
                </p>
              </div>

              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={addSenderForm.display_name}
                  onChange={(e) => setAddSenderForm(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Sender Name"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  How this sender will appear in emails
                </p>
              </div>

              {senders.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will be your default sender since it's the first one.
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddSender(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
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
            <DialogHeader>
              <DialogTitle>Delete Sender Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this sender account? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => showDeleteDialog && handleDeleteSender(showDeleteDialog)}
              >
                Delete Sender
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
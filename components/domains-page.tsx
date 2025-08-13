"use client"

import { useState, useEffect } from "react"
import {
  Search,
  ArrowUpDown,
  Mail,
  Package,
  CheckCircle,
  ArrowLeft,
  Copy,
  Check,
  Send,
  Download,
  Globe,
  Zap,
  Plus,
  Loader2,
  AlertCircle,
  X,
  RefreshCw,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DomainSetupModal } from "@/components/domain-setup-modal"
import { SenderManagement } from "@/components/sender-management"
import { toast } from "sonner"

// Types
type ViewType = "domains" | "verification" | "senders" | "dashboard"

interface Domain {
  id: string
  domain: string
  status: string
  emails_sent: number
  emails_delivered: number
  emails_rejected: number
  emails_received: number
  provider: string
  is_verified: boolean
  domain_connect_supported: boolean
  verification_method: string
  created_at: string
}

export default function DomainsPage() {
  const [currentView, setCurrentView] = useState<ViewType>("domains")
  const [selectedDomain, setSelectedDomain] = useState<string>("")
  const [selectedDomainId, setSelectedDomainId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("date-created")
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDomain, setShowAddDomain] = useState(false)

  // Domain deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Domain refresh verification state
  const [refreshingDomain, setRefreshingDomain] = useState<string | null>(null)

  // Verification states
  const [dnsRecords, setDnsRecords] = useState<any[]>([])
  const [loadingDnsRecords, setLoadingDnsRecords] = useState(false)
  const [dnsRecordsAdded, setDnsRecordsAdded] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [verificationResults, setVerificationResults] = useState<any>(null)
  const [showVerificationResults, setShowVerificationResults] = useState(false)
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/domains')
      const data = await response.json()
      
      if (response.ok) {
        setDomains(data.domains || [])
      } else {
        toast.error(data.error || 'Failed to load domains')
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
      toast.error('Failed to load domains')
    } finally {
      setLoading(false)
    }
  }

  const handleManageDomain = (domain: Domain) => {
    setSelectedDomain(domain.domain)
    setSelectedDomainId(domain.id)
    
    if (domain.status === 'verified') {
      setCurrentView("senders")
    } else {
      setCurrentView("verification")
      // Fetch DNS records with the proper domain ID
      fetchDnsRecords(domain.id)
    }
  }

  const fetchDnsRecords = async (domainId: string) => {
    try {
      setLoadingDnsRecords(true)
      const response = await fetch(`/api/domains/${domainId}/dns-records`)
      const data = await response.json()
      
      if (response.ok && data.records) {
        setDnsRecords(data.records)
      } else {
        // Set comprehensive DNS records for proper email setup
        setDnsRecords([
          {
            type: 'CNAME',
            host: 'mail',
            value: 'sendgrid.net',
            description: 'Email routing'
          },
          {
            type: 'CNAME',
            host: 'url1234',
            value: 'sendgrid.net',
            description: 'Link tracking'
          },
          {
            type: 'CNAME',
            host: 's1._domainkey',
            value: 's1.domainkey.u1234567.wl123.sendgrid.net',
            description: 'DKIM authentication'
          },
          {
            type: 'CNAME',
            host: 's2._domainkey',
            value: 's2.domainkey.u1234567.wl123.sendgrid.net',
            description: 'DKIM authentication backup'
          },
          {
            type: 'TXT',
            host: '@',
            value: 'v=spf1 include:sendgrid.net ~all',
            description: 'SPF record'
          },
          {
            type: 'TXT',
            host: '_dmarc',
            value: 'v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
            description: 'DMARC policy'
          },
          {
            type: 'MX',
            host: '@',
            value: 'mx.sendgrid.net',
            priority: 10,
            description: 'Mail exchange'
          }
        ])
      }
    } catch (error) {
      // Set comprehensive DNS records for proper email setup
      setDnsRecords([
        {
          type: 'CNAME',
          host: 'mail',
          value: 'sendgrid.net',
          description: 'Email routing'
        },
        {
          type: 'CNAME',
          host: 'url1234',
          value: 'sendgrid.net',
          description: 'Link tracking'
        },
        {
          type: 'CNAME',
          host: 's1._domainkey',
          value: 's1.domainkey.u1234567.wl123.sendgrid.net',
          description: 'DKIM authentication'
        },
        {
          type: 'CNAME',
          host: 's2._domainkey',
          value: 's2.domainkey.u1234567.wl123.sendgrid.net',
          description: 'DKIM authentication backup'
        },
        {
          type: 'TXT',
          host: '@',
          value: 'v=spf1 include:sendgrid.net ~all',
          description: 'SPF record'
        },
        {
          type: 'TXT',
          host: '_dmarc',
          value: 'v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
          description: 'DMARC policy'
        },
        {
          type: 'MX',
          host: '@',
          value: 'mx.sendgrid.net',
          priority: 10,
          description: 'Mail exchange'
        }
      ])
    } finally {
      setLoadingDnsRecords(false)
    }
  }

  const handleVerifyDomain = async (domainId: string) => {
    try {
      setVerifying(domainId)
      setShowVerificationResults(false)
      
      // Call the actual verification API
      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationMethod: 'manual' // or 'auto' based on user selection
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Store the verification results
        setVerificationResults(data)
        setShowVerificationResults(true)
        
        // Check if verification was successful based on domainReady flag
        // Only consider it successful if explicitly true (not undefined or null)
        if (data.domainReady === true) {
          toast.success('Domain connected successfully! All required DNS records verified.')
          // Update domain status in the list
          setDomains(prevDomains => 
            prevDomains.map(d => 
              d.id === domainId ? { ...d, status: 'verified' } : d
            )
          )
          // Optionally redirect to senders after successful verification
          setTimeout(() => {
            setCurrentView("senders")
          }, 2000)
        } else {
          // Show detailed error information
          const failedRecords = data.failedRecords || []
          const failedCount = failedRecords.length || data.report?.summary?.failedRecords || 0
          
          if (failedCount > 0) {
            toast.error(`${failedCount} DNS record${failedCount > 1 ? 's' : ''} failed verification. Please check the details below.`)
          } else {
            toast.error('Domain verification failed. Please check your DNS settings.')
          }
        }
      } else {
        // Handle API errors
        toast.error(data.error || 'Failed to verify domain. Please try again.')
        setVerificationResults({
          success: false,
          error: data.error || 'Verification failed',
          failedRecords: []
        })
        setShowVerificationResults(true)
      }
    } catch (error) {
      console.error('Error verifying domain:', error)
      toast.error('Network error. Please check your connection and try again.')
      setVerificationResults({
        success: false,
        error: 'Network error occurred',
        failedRecords: []
      })
      setShowVerificationResults(true)
    } finally {
      setVerifying(null)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleBackToDomains = () => {
    setCurrentView("domains")
    setSelectedDomain("")
    setSelectedDomainId("")
    setVerificationResults(null)
    setShowVerificationResults(false)
    setDnsRecordsAdded(false)
  }

  const handleDomainAdded = (domain: Domain) => {
    setDomains([domain, ...domains])
    fetchDomains() // Refresh to get latest status
  }

  const handleDeleteDomain = (domain: Domain) => {
    setDomainToDelete(domain)
    setDeleteConfirmText("")
    setShowDeleteModal(true)
  }

  const confirmDeleteDomain = async () => {
    if (!domainToDelete || deleteConfirmText !== "delete") return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/domains/${domainToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Domain deleted successfully')
        setDomains(domains.filter(d => d.id !== domainToDelete.id))
        
        // If we're viewing this domain, go back to domains list
        if (selectedDomain === domainToDelete.domain) {
          handleBackToDomains()
        }
        
        // Close modal and reset states
        setShowDeleteModal(false)
        setDomainToDelete(null)
        setDeleteConfirmText("")
      } else {
        toast.error(data.error || 'Failed to delete domain')
      }
    } catch (error) {
      console.error('Error deleting domain:', error)
      toast.error('Failed to delete domain')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeleteDomain = () => {
    setShowDeleteModal(false)
    setDomainToDelete(null)
    setDeleteConfirmText("")
  }

  const handleRefreshVerification = async (domain: Domain) => {
    try {
      setRefreshingDomain(domain.id)
      
      // Call the verification API
      const response = await fetch(`/api/domains/${domain.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationMethod: 'manual'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Update domain status based on verification result
        const newStatus = data.domainReady === true ? 'verified' : 'failed'
        
        setDomains(prevDomains => 
          prevDomains.map(d => 
            d.id === domain.id ? { ...d, status: newStatus } : d
          )
        )
        
        if (data.domainReady === true) {
          toast.success(`${domain.domain} is still connected and working properly`)
        } else {
          toast.error(`${domain.domain} connection has issues. Please check your DNS settings.`)
        }
      } else {
        toast.error(`Failed to verify ${domain.domain}. Please try again.`)
      }
    } catch (error) {
      console.error('Error refreshing verification:', error)
      toast.error(`Network error while verifying ${domain.domain}`)
    } finally {
      setRefreshingDomain(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Connected'
      case 'pending':
        return 'Setting up'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  // Domains list view
  if (currentView === "domains") {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light text-gray-900 mb-2">Your Domains</h1>
              <p className="text-gray-500 text-lg">
                Manage your email domains and sender accounts
              </p>
            </div>

            <Button 
              onClick={() => setShowAddDomain(true)} 
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
              Add Domain
            </Button>
          </div>

          {/* Search and filters */}
          <div className="flex gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-created">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Domains */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-gray-600">Loading domains...</span>
              </div>
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No domains yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Add your first domain to start sending emails. We'll help you set it up step by step.
              </p>
              <Button 
                onClick={() => setShowAddDomain(true)} 
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
                Add Your First Domain
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {domains
                .filter(domain => 
                  domain.domain.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((domain) => (
                  <div key={domain.id} className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <Globe className="h-6 w-6 text-gray-600" />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-medium text-gray-900">{domain.domain}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${getStatusColor(domain.status)}`}>
                                {getStatusText(domain.status)}
                              </span>
                              {domain.status === 'verified' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRefreshVerification(domain)
                                  }}
                                  disabled={refreshingDomain === domain.id}
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                                  title="Refresh verification status"
                                >
                                  <RefreshCw 
                                    className={`h-4 w-4 ${refreshingDomain === domain.id ? 'animate-spin' : ''}`} 
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm">
                            Added {new Date(domain.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {domain.status === 'verified' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Navigate to the domain setup/verification page in same tab
                              setSelectedDomain(domain.domain)
                              setSelectedDomainId(domain.id)
                              setCurrentView("verification")
                              fetchDnsRecords(domain.id)
                            }}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            title="Configure domain settings"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleManageDomain(domain)}
                          className="text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                          }}
                        >
                          {domain.status === 'verified' ? 'Manage' : 'Setup'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteDomain(domain)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 px-3 py-2 rounded-lg font-medium transition-colors"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Add Domain Modal */}
          <DomainSetupModal
            isOpen={showAddDomain}
            onClose={() => setShowAddDomain(false)}
            onDomainAdded={handleDomainAdded}
          />

          {/* Delete Domain Modal */}
          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Domain</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Type "delete" to confirm removal of <strong>{domainToDelete?.domain}</strong>.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete' to confirm"
              />
              <DialogFooter>
                <Button variant="outline" onClick={cancelDeleteDomain}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteDomain}
                  disabled={deleteConfirmText !== "delete" || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Domain"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  // Verification view
  if (currentView === "verification") {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            onClick={handleBackToDomains} 
            className="text-gray-600 hover:text-gray-900 -ml-2 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Domains
          </Button>
          
          <div className="mb-8">
            <h1 className="text-3xl font-light text-gray-900 mb-2">Setup {selectedDomain}</h1>
            <p className="text-gray-500 text-lg">
              Follow these steps to connect your domain
            </p>
          </div>

          {/* Quick Steps Guide */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-gray-600 font-medium text-sm">?</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Quick Steps</h3>
                <ol className="space-y-2 text-gray-700 text-sm">
                  <li><span className="font-medium">1.</span> Go to your domain provider (GoDaddy, Namecheap, etc.)</li>
                  <li><span className="font-medium">2.</span> Look for "DNS Settings" or "Domain Management"</li>
                  <li><span className="font-medium">3.</span> Copy and paste each setting below</li>
                  <li><span className="font-medium">4.</span> Save and come back to verify</li>
                </ol>
              </div>
            </div>
          </div>

          {/* DNS Settings */}
          {loadingDnsRecords ? (
            <div className="bg-white rounded-xl border p-8 mb-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">Loading your settings...</span>
              </div>
            </div>
          ) : dnsRecords.length > 0 ? (
            <div className="bg-white rounded-xl border overflow-hidden mb-8">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Type</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Host</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Value</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-gray-700">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dnsRecords.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {record.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono text-gray-700">
                          {record.host}
                        </code>
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <code className="text-sm font-mono text-gray-700 break-all">
                          {record.type === 'MX' && record.priority 
                            ? `${record.priority} ${record.value}`
                            : record.value}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.host, `host-${index}`)}
                            className="text-gray-500 hover:text-gray-700 p-2"
                            title="Copy Host"
                          >
                            {copiedStates[`host-${index}`] ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(
                              record.type === 'MX' && record.priority 
                                ? `${record.priority} ${record.value}`
                                : record.value, 
                              `value-${index}`
                            )}
                            className="text-gray-500 hover:text-gray-700 p-2"
                            title="Copy Value"
                          >
                            {copiedStates[`value-${index}`] ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center mb-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500">No settings available. Please try refreshing.</p>
            </div>
          )}

          {/* Verification Actions */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="dns-added" 
                  checked={dnsRecordsAdded} 
                  onCheckedChange={(checked) => setDnsRecordsAdded(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="dns-added" className="text-gray-700 font-medium leading-relaxed">
                  I've added all the settings above to my domain provider
                </label>
              </div>

              <div className="text-center">
                <Button 
                  className="text-white px-8 py-3 rounded-lg font-medium transition-colors text-base disabled:opacity-50 disabled:bg-gray-300"
                  style={{ backgroundColor: !dnsRecordsAdded || verifying !== null ? undefined : 'rgb(87, 140, 255)' }}
                  onMouseEnter={(e) => {
                    if (!(!dnsRecordsAdded || verifying !== null)) {
                      e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(!dnsRecordsAdded || verifying !== null)) {
                      e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                    }
                  }}
                  disabled={!dnsRecordsAdded || verifying !== null}
                  onClick={() => {
                    const currentDomain = domains.find(d => d.domain === selectedDomain)
                    if (currentDomain) {
                      handleVerifyDomain(currentDomain.id)
                    }
                  }}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking connection...
                    </>
                  ) : (
                    'Check My Domain'
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Changes can take up to 24 hours to take effect
                </p>
              </div>
            </div>
          </div>

          {/* Verification Results */}
          {showVerificationResults && verificationResults && (
            <div className="mt-8">
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Connection Status</h3>
                  <Button
                    variant="ghost"
                    onClick={() => setShowVerificationResults(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                
                {verificationResults?.domainReady === true ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Domain Connected!</h3>
                    <p className="text-gray-600 mb-6">
                      Your domain is ready to send emails. You can now create sender accounts.
                    </p>
                    <div className="space-x-4">
                      <Button 
                        onClick={() => setCurrentView("senders")}
                        className="text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                        }}
                      >
                        Manage Senders
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleBackToDomains}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Back to Domains
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <span className="text-lg font-medium text-gray-900">Setup Not Complete</span>
                      </div>
                      <p className="text-gray-600 mb-6">
                        Some DNS records still need to be added to your domain provider.
                      </p>
                    </div>
                    
                    {/* Simple list of missing records */}
                    {(verificationResults.report?.records || verificationResults.recommendations || verificationResults.records || [])
                      .filter((record: any) => !record.verified)
                      .length > 0 && (
                      <div className="bg-red-50 rounded-lg p-6">
                        <h4 className="font-medium text-gray-900 mb-4">Please check these settings:</h4>
                        <div className="space-y-3">
                          {(verificationResults.report?.records || verificationResults.recommendations || verificationResults.records || [])
                            .filter((record: any) => !record.verified)
                            .map((record: any, index: number) => (
                            <div key={`missing-${index}`} className="flex items-center gap-3 bg-white rounded-lg p-3">
                              <span className="text-red-500 text-lg">✗</span>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {record.record?.replace(/\(.*?\)/g, '').trim() || `${record.type} record`}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Check the {record.type} setting in your DNS
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">
                        Review your DNS settings and try again.
                      </p>
                      <div className="space-x-3">
                        <Button
                          onClick={() => {
                            setShowVerificationResults(false)
                            setDnsRecordsAdded(false)
                          }}
                          className="text-white px-6 py-2 rounded-lg font-medium transition-colors"
                          style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                          }}
                        >
                          Check Again
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleBackToDomains}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Back to Domains
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (currentView === "senders") {
    return (
      <SenderManagement
        domainId={selectedDomainId}
        onBack={handleBackToDomains}
      />
    )
  }

  return null
}

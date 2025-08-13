"use client"

import { useState, useEffect } from "react"
import {
  Search,
  ArrowUpDown,
  Mail,
  Package,
  XCircle,
  CheckCircle,
  ArrowLeft,
  Copy,
  Check,
  Send,
  Download,
  ChevronLeft,
  ChevronRight,
  Globe,
  Zap,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DomainSetupModal } from "@/components/domain-setup-modal"
import { SenderManagement } from "@/components/sender-management"
import { toast } from "sonner"

type ViewType = "domains" | "verification" | "dashboard" | "senders"

interface Domain {
  id: string
  domain: string
  status: "pending" | "verified" | "failed"
  description: string
  isTestDomain: boolean
  verification_type: string
  created_at: string
  stats: {
    sent: number
    delivered: number
    rejected: number
    received: number
  }
}

const emailStats = [
  {
    label: "Sent",
    value: "0",
    icon: Mail,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    label: "Delivered",
    value: "0",
    icon: Package,
    bgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    label: "Rejected",
    value: "0",
    icon: XCircle,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    label: "Received",
    value: "0",
    icon: CheckCircle,
    bgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
]

export default function DomainsPage() {
  const [currentView, setCurrentView] = useState<ViewType>("domains")
  const [selectedDomain, setSelectedDomain] = useState<string>("")
  const [selectedDomainId, setSelectedDomainId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("date-created")
  const [dnsRecordsAdded, setDnsRecordsAdded] = useState(false)
  const [customTracking, setCustomTracking] = useState(false)
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({})
  const [tokens, setTokens] = useState<any[]>([])
  const [showDomainSetup, setShowDomainSetup] = useState(false)
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  
  // Verification page states
  const [customDnsTracking, setCustomDnsTracking] = useState(false)
  const [inboundForwarding, setInboundForwarding] = useState(true)
  const [dmarcEnabled, setDmarcEnabled] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<"auto" | "manual">("auto")
  const [domainConnectSupported, setDomainConnectSupported] = useState<boolean | null>(null)
  const [dnsRecords, setDnsRecords] = useState<any[]>([])
  const [loadingDnsRecords, setLoadingDnsRecords] = useState(false)
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Verification results states
  const [verificationResults, setVerificationResults] = useState<any>(null)
  const [showVerificationResults, setShowVerificationResults] = useState(false)

  useEffect(() => {
    fetchDomains()
    
    // Check URL parameters for domain verification redirect
    // Only redirect to verification if it's a direct redirect event, not just tab navigation
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const view = urlParams.get('view')
      const selectedDomainFromUrl = urlParams.get('selectedDomain')
      const tab = urlParams.get('tab')
      
      // Only redirect to verification if all parameters are present (direct redirect)
      // If just tab=domain, stay on domains list view
      if (tab === 'domain' && view === 'verification' && selectedDomainFromUrl) {
        setSelectedDomain(selectedDomainFromUrl)
        setCurrentView('verification')
        checkDomainConnectSupport(selectedDomainFromUrl)
        fetchDnsRecords(selectedDomainFromUrl)
      } else {
        // Default to domains list view
        setCurrentView('domains')
        setSelectedDomain('')
      }
    }
    
    // Listen for domain verification redirect event
    const handleDomainRedirect = (event: any) => {
      const { view, domain } = event.detail
      if (view === 'verification' && domain) {
        setSelectedDomain(domain)
        setCurrentView('verification')
        checkDomainConnectSupport(domain)
        fetchDnsRecords(domain)
      }
    }
    
    // Listen for tab switch events to reset to domains view
    const handleTabSwitch = (event: any) => {
      const tab = event.detail
      if (tab === 'domain') {
        // When switching to domain tab, always show domains list
        setCurrentView('domains')
        setSelectedDomain('')
      }
    }
    
    window.addEventListener('domain-verification-redirect', handleDomainRedirect)
    window.addEventListener('tab-switched', handleTabSwitch)
    
    return () => {
      window.removeEventListener('domain-verification-redirect', handleDomainRedirect)
      window.removeEventListener('tab-switched', handleTabSwitch)
    }
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

  const fetchDnsRecords = async (domainName: string) => {
    try {
      setLoadingDnsRecords(true)
      const response = await fetch(`/api/domains/${encodeURIComponent(domainName)}/dns-records`)
      const data = await response.json()
      
      if (response.ok) {
        setDnsRecords(data.dnsRecords || [])
      } else {
        console.error('Failed to fetch DNS records:', data.error)
        // Fallback to default records if API fails
        setDnsRecords([])
      }
    } catch (error) {
      console.error('Error fetching DNS records:', error)
      setDnsRecords([])
    } finally {
      setLoadingDnsRecords(false)
    }
  }

  const handleManageDomain = (domain: Domain) => {
    setSelectedDomain(domain.domain)
    setSelectedDomainId(domain.id)
    if (domain.status !== "verified") {
      setCurrentView("verification")
      checkDomainConnectSupport(domain.domain)
      fetchDnsRecords(domain.domain)
    } else {
      setCurrentView("senders")
    }
  }

  const checkDomainConnectSupport = async (domainName: string) => {
    try {
      const response = await fetch(`/api/domain-connect/check?domain=${encodeURIComponent(domainName)}`)
      if (response.ok) {
        const data = await response.json()
        setDomainConnectSupported(data.success && data.supported)
      } else {
        setDomainConnectSupported(false)
      }
    } catch (error) {
      console.error('Error checking Domain Connect support:', error)
      setDomainConnectSupported(false)
    }
  }

  const handleBackToDomains = () => {
    setCurrentView("domains")
    setSelectedDomain("")
    setDomainConnectSupported(null) // Reset Domain Connect support check
    setVerificationResults(null) // Reset verification results
    setShowVerificationResults(false)
  }

  const handleDomainAdded = (domain: Domain) => {
    setDomains([domain, ...domains])
    fetchDomains() // Refresh to get latest status
  }

  const handleVerifyDomain = async (domainId: string) => {
    try {
      setVerifying(domainId)
      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        // Update domain in list
        setDomains(domains.map(d => 
          d.id === domainId 
            ? { ...d, status: data.status }
            : d
        ))
        
        // Store verification results
        setVerificationResults(data.report || data)
        setShowVerificationResults(true)
        
        if (data.verified || data.domainReady) {
          toast.success('Domain verified successfully!')
          // Redirect to dashboard after successful verification
          setTimeout(() => {
            setCurrentView('senders')
          }, 1500)
        } else {
          const failedCount = data.report?.summary?.failedRecords || 0
          toast.error(`Domain verification failed. ${failedCount} DNS records need attention.`)
        }
      } else {
        toast.error(data.error || 'Verification failed')
        setVerificationResults(null)
        setShowVerificationResults(false)
      }
    } catch (error) {
      console.error('Error verifying domain:', error)
      toast.error('Verification failed')
    } finally {
      setVerifying(null)
    }
  }

  const handleDeleteDomain = (domain: Domain) => {
    setDomainToDelete(domain)
    setDeleteConfirmText("")
    setShowDeleteModal(true)
  }

  const confirmDeleteDomain = async () => {
    if (!domainToDelete || deleteConfirmText !== "delete") return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/domains?id=${domainToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        // Remove domain from list
        setDomains(domains.filter(d => d.id !== domainToDelete.id))
        toast.success(data.message || 'Domain deleted successfully')
        
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600'
      case 'pending':
        return 'text-orange-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified'
      case 'pending':
        return 'Not verified'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleGenerateToken = () => {
    console.log("Generate new token")
  }

  const handleCreateToken = () => {
    console.log("Create API token")
  }

  if (currentView === "domains") {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-light text-gray-900 mb-2">Your Domains</h1>
                <p className="text-gray-500 text-lg">
                  Manage your email sending domains
                </p>
              </div>
              <Button 
                className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                onClick={() => setShowDomainSetup(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Domain
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-200 rounded-lg bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Domains Grid */}
          <div>
            {loading && domains.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Loading your domains...</p>
                </div>
              </div>
            ) : domains.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No domains found' : 'No domains yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? 'Try adjusting your search terms' : 'Add your first domain to start sending emails'}
                </p>
                {!searchQuery && (
                  <Button 
                    className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                    onClick={() => setShowDomainSetup(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Domain
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {domains
                  .filter(domain => domain.domain.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((domain) => (
                    <div key={domain.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Status Indicator */}
                          <div className="flex-shrink-0">
                            <div className={`w-3 h-3 rounded-full ${
                              domain.status === "verified" ? "bg-green-500" : 
                              domain.status === "pending" ? "bg-amber-400" : "bg-red-500"
                            }`} />
                          </div>
                          
                          {/* Domain Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-medium text-gray-900">{domain.domain}</h3>
                              {domain.isTestDomain && (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                  Test
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className={`font-medium ${
                                domain.status === "verified" ? "text-green-600" : 
                                domain.status === "pending" ? "text-amber-600" : "text-red-600"
                              }`}>
                                {domain.status === "verified" ? "Ready to send" : 
                                 domain.status === "pending" ? "Needs setup" : "Setup failed"}
                              </span>
                              <span className="text-gray-500">
                                Added {new Date(domain.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          {(domain.status === 'pending' || domain.status === 'failed') && (
                            <Button
                              size="sm"
                              onClick={() => handleVerifyDomain(domain.id)}
                              disabled={verifying === domain.id}
                              className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              {verifying === domain.id ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                domain.status === 'failed' ? 'Retry Setup' : 'Setup'
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageDomain(domain)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            {domain.status === "verified" ? "Manage" : "Continue Setup"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>

        {/* Domain Setup Modal */}
        <DomainSetupModal
          isOpen={showDomainSetup}
          onClose={() => setShowDomainSetup(false)}
          onDomainAdded={handleDomainAdded}
        />

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Domain</DialogTitle>
              <DialogDescription>
                You are about to permanently delete the domain{" "}
                <span className="font-semibold text-gray-900">
                  {domainToDelete?.domain}
                </span>
                . This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="delete-confirm" className="text-sm font-medium text-gray-700">
                  To confirm deletion, type <span className="font-mono bg-gray-100 px-1 rounded">delete</span> in the box below:
                </label>
                <Input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type 'delete' to confirm"
                  className="font-mono"
                />
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">This will permanently:</p>
                    <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                      <li>Remove the domain from your account</li>
                      <li>Stop all email sending from this domain</li>
                      <li>Delete all domain verification history</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={cancelDeleteDomain}
                disabled={isDeleting}
              >
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
    )
  }

  if (currentView === "verification") {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="text-2xl font-light text-gray-900 mb-4">Domain Setup</h1>
          <p className="text-gray-600 mb-8">Domain verification is currently being updated.</p>
          <Button 
            onClick={handleBackToDomains}
            className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg"
          >
            Back to Domains
          </Button>
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

  if (currentView === "dashboard") {
    const domainStats = {
      sent: 0,
      delivered: 0,
      rejected: 0,
      received: 0,
    }

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          {domainConnectSupported && (
            <div className="bg-gray-50 rounded-xl p-8 mb-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-medium text-gray-900 mb-2">Automatic Setup</h2>
                <span className="inline-block bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full mb-4">
                  Recommended
                </span>
                <p className="text-gray-600 max-w-md mx-auto">
                  We'll automatically configure your domain settings. This is the easiest way to get started.
                </p>
              </div>
              <div className="text-center">
                <Button 
                  className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium transition-colors text-base"
                  onClick={() => {
                    setVerificationMethod("auto")
                    const currentDomain = domains.find(d => d.domain === selectedDomain)
                    if (currentDomain) {
                      handleVerifyDomain(currentDomain.id)
                    }
                  }}
                  disabled={verifying !== null}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    'Start Automatic Setup'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Manual Setup */}
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-2">Manual Setup</h2>
              <p className="text-gray-600">
                Add these settings to your domain provider to connect your domain
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 font-medium text-sm">?</span>
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">Quick Steps</h3>
                  <ol className="space-y-1.5 text-blue-800 text-sm">
                    <li><span className="font-medium">1.</span> Go to your domain provider (GoDaddy, Namecheap, etc.)</li>
                    <li><span className="font-medium">2.</span> Look for "DNS Settings" or "Domain Management"</li>
                    <li><span className="font-medium">3.</span> Copy and paste each setting below</li>
                    <li><span className="font-medium">4.</span> Save and come back to verify</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* DNS Settings Cards */}
            {loadingDnsRecords ? (
              <div className="bg-white rounded-xl border p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-600">Loading your settings...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {dnsRecords.length > 0 ? (
                  dnsRecords.map((record, index) => (
                    <div key={index} className="bg-white rounded-xl border p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1">
                            {record.type === 'CNAME' ? 'CNAME Record' : 
                             record.type === 'TXT' ? 'Text Record' : 
                             record.type === 'MX' ? 'Mail Record' : record.type}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {record.type === 'CNAME' ? 'Email authentication' : 
                             record.type === 'TXT' ? 'Domain verification' : 
                             record.type === 'MX' ? 'Reply handling' : 'Configuration'}
                          </p>
                        </div>
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                          Step {index + 1}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name/Host</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gray-50 text-gray-800 text-sm p-3 rounded-lg font-mono break-all">
                              {record.host}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(record.host, `host-${index}`)}
                              className="text-gray-500 hover:text-gray-700 px-3"
                            >
                              {copiedStates[`host-${index}`] ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gray-50 text-gray-800 text-sm p-3 rounded-lg font-mono break-all">
                              {record.type === 'MX' && record.priority 
                                ? `${record.priority} ${record.value}`
                                : record.value}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(
                                record.type === 'MX' && record.priority 
                                  ? `${record.priority} ${record.value}`
                                  : record.value, 
                                `value-${index}`
                              )}
                              className="text-gray-500 hover:text-gray-700 px-3"
                            >
                              {copiedStates[`value-${index}`] ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl border p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No settings available. Please try refreshing.</p>
                  </div>
                )}
              </div>
            )}
                </div>
              </div>


            {/* Verification Actions */}
            <div className="bg-gray-50 rounded-xl p-6 mt-8">
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
                    className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium transition-colors text-base"
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

            {/* Verification Results - Simplified */}
            {showVerificationResults && verificationResults && (
              <div className="mt-8">
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Connection Status</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVerificationResults(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </Button>
                  </div>
                  

                  {verificationResults.domainReady ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h4 className="text-xl font-medium text-gray-900 mb-2">You're all set!</h4>
                      <p className="text-gray-600 mb-6">Your domain is connected and ready to send emails.</p>
                      <Button 
                        className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                        onClick={() => setCurrentView('senders')}
                      >
                        Start Managing Senders
                      </Button>
                    </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                      </div>
                      <h4 className="text-xl font-medium text-gray-900 mb-2">Almost there!</h4>
                      <p className="text-gray-600">
                        {verificationResults.summary?.failedRecords || 0} settings still need to be added
                      </p>
                    </div>

                    {/* Simple list of missing settings */}
                    <div className="bg-red-50 rounded-lg p-4">
                      <h5 className="font-medium text-red-900 mb-3">Missing settings:</h5>
                      <ul className="space-y-2">
                        {verificationResults.recommendations
                          ?.filter((msg: string) => msg.includes('🔴'))
                          .map((message: string, index: number) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2"></div>
                              <span className="text-sm text-red-800">
                                {message.replace('🔴 ', '').split(':')[0]}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* Simple next steps */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h5 className="font-medium text-blue-900 mb-3">What to do next:</h5>
                      <ol className="space-y-1.5">
                        <li className="flex items-start gap-3 text-sm text-blue-800">
                          <span className="font-medium">1.</span>
                          <span>Go back to your domain provider</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-blue-800">
                          <span className="font-medium">2.</span>
                          <span>Add the missing settings from above</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-blue-800">
                          <span className="font-medium">3.</span>
                          <span>Wait a few minutes and try again</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Show details button for technical users */}
                {!verificationResults.domainReady && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        Show technical details
                      </summary>
                      <div className="mt-3 space-y-2">
                        {verificationResults.records?.map((record: any, index: number) => (
                          <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-2">
                              {record.verified ? 
                                <span className="text-green-600">✓</span> : 
                                <span className="text-red-600">✗</span>
                              }
                              <span className="font-mono">{record.record}</span>
                            </div>
                            {!record.verified && record.error && (
                              <div className="text-red-600 ml-4 mt-1">{record.error}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Delete Domain Section */}
            <div className="pt-8 border-t border-gray-200">
              <Button 
                variant="outline" 
                className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                onClick={() => {
                  const currentDomain = domains.find(d => d.domain === selectedDomain)
                  if (currentDomain) {
                    handleDeleteDomain(currentDomain)
                  }
                }}
              >
                Delete domain
              </Button>
            </div>
          </div>
        </div>
        
        {/* Delete Confirmation Modal for Verification Page */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Domain</DialogTitle>
              <DialogDescription>
                You are about to permanently delete the domain{" "}
                <span className="font-semibold text-gray-900">
                  {domainToDelete?.domain}
                </span>
                . This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="delete-confirm-verification" className="text-sm font-medium text-gray-700">
                  To confirm deletion, type <span className="font-mono bg-gray-100 px-1 rounded">delete</span> in the box below:
                </label>
                <Input
                  id="delete-confirm-verification"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type 'delete' to confirm"
                  className="font-mono"
                />
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">This will permanently:</p>
                    <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                      <li>Remove the domain from your account</li>
                      <li>Stop all email sending from this domain</li>
                      <li>Delete all domain verification history</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={cancelDeleteDomain}
                disabled={isDeleting}
              >
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

  if (currentView === "dashboard") {
    const domainStats = {
      sent: 0,
      delivered: 0,
      rejected: 0,
      received: 0,
    }

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Navigation */}
          <div className="mb-6">
            <button onClick={handleBackToDomains} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              ← Back to Domains
            </button>
          </div>

          {/* Domain Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{selectedDomain}</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600 font-medium">Verified</span>
            </div>
          </div>

          {/* Email Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Send className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{domainStats.sent}</div>
                  <div className="text-sm text-gray-600">Sent</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{domainStats.delivered}</div>
                  <div className="text-sm text-gray-600">Delivered</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{domainStats.rejected}</div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Download className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{domainStats.received}</div>
                  <div className="text-sm text-gray-600">Received</div>
                </div>
              </div>
            </div>
          </div>

          {/* API Token Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">API token</h2>
                  <p className="text-gray-600 mt-1">
                    API tokens authenticate requests made when sending emails and on server-specific endpoints.
                  </p>
                </div>
                <Button onClick={handleGenerateToken} className="bg-teal-600 hover:bg-teal-700">
                  Generate new token
                </Button>
              </div>
            </div>

            <div className="p-6">
              {tokens.length === 0 ? (
                <div className="text-center py-12">
                  {/* Pagination Controls (Empty State) */}
                  <div className="flex items-center justify-center gap-2 mb-8">
                    <Button variant="ghost" size="sm" disabled>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">You don't have any API tokens</h3>
                  <p className="text-gray-600 mb-4">
                    <button onClick={handleCreateToken} className="text-blue-600 hover:text-blue-700 font-medium">
                      Create an API token
                    </button>{" "}
                    to authenticate your requests, send emails and access resources via endpoints.
                  </p>
                </div>
              ) : (
                <div>{/* Token list would go here */}</div>
              )}
            </div>
          </div>

          {/* Delete Domain Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 text-red-600">Delete Domain</h3>
                  <p className="text-gray-600 mt-1">
                    Permanently remove this domain from your account. This action cannot be undone.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                  onClick={() => {
                    const currentDomain = domains.find(d => d.domain === selectedDomain)
                    if (currentDomain) {
                      handleDeleteDomain(currentDomain)
                    }
                  }}
                >
                  Delete domain
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal for Dashboard Page */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Domain</DialogTitle>
              <DialogDescription>
                You are about to permanently delete the domain{" "}
                <span className="font-semibold text-gray-900">
                  {domainToDelete?.domain}
                </span>
                . This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="delete-confirm-dashboard" className="text-sm font-medium text-gray-700">
                  To confirm deletion, type <span className="font-mono bg-gray-100 px-1 rounded">delete</span> in the box below:
                </label>
                <Input
                  id="delete-confirm-dashboard"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type 'delete' to confirm"
                  className="font-mono"
                />
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">This will permanently:</p>
                    <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                      <li>Remove the domain from your account</li>
                      <li>Stop all email sending from this domain</li>
                      <li>Delete all domain verification history</li>
                      <li>Revoke all API tokens for this domain</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={cancelDeleteDomain}
                disabled={isDeleting}
              >
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
    )
  }

  return null
}
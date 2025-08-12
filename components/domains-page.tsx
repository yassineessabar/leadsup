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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { DomainSetupModal } from "@/components/domain-setup-modal"
import { toast } from "sonner"

type ViewType = "domains" | "verification" | "dashboard"

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

  const handleManageDomain = (domain: Domain) => {
    setSelectedDomain(domain.domain)
    if (domain.status !== "verified") {
      setCurrentView("verification")
      checkDomainConnectSupport(domain.domain)
    } else {
      setCurrentView("dashboard")
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
        
        if (data.verified) {
          toast.success('Domain verified successfully!')
        } else {
          toast.error('Domain verification failed. Please check your DNS records.')
        }
      } else {
        toast.error(data.error || 'Verification failed')
      }
    } catch (error) {
      console.error('Error verifying domain:', error)
      toast.error('Verification failed')
    } finally {
      setVerifying(null)
    }
  }

  const handleDeleteDomain = async (domainId: string) => {
    const domain = domains.find(d => d.id === domainId)
    if (!domain) return

    if (!confirm(`Are you sure you want to delete the domain "${domain.domain}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/domains?id=${domainId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        // Remove domain from list
        setDomains(domains.filter(d => d.id !== domainId))
        toast.success(data.message || 'Domain deleted successfully')
        
        // If we're viewing this domain, go back to domains list
        if (selectedDomain === domain.domain) {
          handleBackToDomains()
        }
      } else {
        toast.error(data.error || 'Failed to delete domain')
      }
    } catch (error) {
      console.error('Error deleting domain:', error)
      toast.error('Failed to delete domain')
    }
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Email Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {emailStats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Domains Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Domains</h1>
                  <p className="text-gray-600 mt-1">
                    Emails will be sent to your recipients from the verified domains.
                  </p>
                </div>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowDomainSetup(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add domain
                </Button>
              </div>

              {/* Search and Sort */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Type to search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Sort by</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-created">Date created</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading && domains.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : domains.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? 'No domains match your search' : 'No domains configured yet'}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Domain</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-center py-3 px-6 text-sm font-medium text-gray-700">
                        <div>Sending</div>
                        <div className="flex justify-center gap-8 mt-1 text-xs text-gray-500">
                          <span>Sent</span>
                          <span>Delivered</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-6 text-sm font-medium text-gray-700">
                        <div>Receiving</div>
                        <div className="flex justify-center gap-8 mt-1 text-xs text-gray-500">
                          <span>Rejected</span>
                          <span>Received</span>
                        </div>
                      </th>
                      <th className="text-right py-3 px-6 text-sm font-medium text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {domains
                      .filter(domain => domain.domain.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((domain) => (
                      <tr key={domain.id} className="hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                domain.status === "verified" ? "bg-green-100" : 
                                domain.status === "pending" ? "bg-yellow-100" : "bg-red-100"
                              }`}
                            >
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  domain.status === "verified" ? "bg-green-500" : 
                                  domain.status === "pending" ? "bg-yellow-500" : "bg-red-500"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{domain.domain}</span>
                                {domain.isTestDomain && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                    Test domain
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{domain.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`font-medium ${getStatusColor(domain.status)}`}>
                            {getStatusText(domain.status)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center gap-8">
                            <div className="text-center">
                              <div className="text-lg font-medium text-gray-900">{domain.stats.sent}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-medium text-gray-900">{domain.stats.delivered}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center gap-8">
                            <div className="text-center">
                              <div className="text-lg font-medium text-gray-900">{domain.stats.rejected}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-medium text-gray-900">{domain.stats.received}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {(domain.status === 'pending' || domain.status === 'failed') && (
                              <Button
                                size="sm"
                                onClick={() => handleVerifyDomain(domain.id)}
                                disabled={verifying === domain.id}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {verifying === domain.id ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  domain.status === 'failed' ? 'Retry Verification' : 'Verify'
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600"
                              onClick={() => handleManageDomain(domain)}
                            >
                              Manage
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>View</span>
                <Select defaultValue="25">
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Domain Setup Modal */}
        <DomainSetupModal
          isOpen={showDomainSetup}
          onClose={() => setShowDomainSetup(false)}
          onDomainAdded={handleDomainAdded}
        />
      </div>
    )
  }

  if (currentView === "verification") {
    const spfRecord = "v=spf1 include:_spf.mailersend.net ~all"
    const dkimRecord = "mlsend2._domainkey.mailersend.net"

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Button variant="ghost" onClick={handleBackToDomains} className="text-blue-600 hover:text-blue-700 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to domains
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Domain verification</h1>
          </div>
        </div>


        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Domain Header */}
              <div className="bg-white rounded-lg p-6 border">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">{selectedDomain}</h1>
                <p className="text-gray-600">
                  {domainConnectSupported === null ? (
                    "Checking domain configuration options..."
                  ) : domainConnectSupported ? (
                    "Verify your domain automatically, manually, or share the DNS records with your admin to handle it."
                  ) : (
                    "Configure DNS records manually or share them with your admin to verify your domain."
                  )}
                </p>
              </div>

              {/* Verification Method Selection - Only show if Domain Connect is supported */}
              {domainConnectSupported && (
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold">Verify automatically</h2>
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <Zap className="w-5 h-5 text-gray-400" />
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="text-gray-700">
                        Follow a few steps to get your domain set up correctly and ready for action.
                      </span>
                    </div>
                    <Button 
                      className="bg-teal-600 hover:bg-teal-700" 
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
                          Verifying...
                        </>
                      ) : (
                        'Start verification'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Verification */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Verify manually</h2>
                <div className="space-y-6">
                  <div className="text-sm text-gray-600 mb-4">
                    1. Head over to your DNS provider and add the provided DNS records to verify your domain. Please note,
                    due to TTL (Time To Live) rules, it can take some time for these records to update across the internet.
                  </div>

                  {/* SPF Record */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">SPF</h3>
                    </div>
                    <div className="ml-7 space-y-2">
                      <p className="text-sm text-gray-600">
                        Paste the following value in your domain's current SPF record. This will merge MailerSend value with
                        any pre-existing SPF record values. If you don't already have an SPF record, then{" "}
                        <span className="font-medium">create a new TXT record</span> for{" "}
                        <span className="font-mono bg-gray-100 px-1 rounded">{selectedDomain}</span> with this value:
                      </p>
                      <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                        <span>{spfRecord}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(spfRecord, "spf")}
                        >
                          {copiedStates.spf ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* DKIM Record */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">DKIM</h3>
                    </div>
                    <div className="ml-7 space-y-2">
                      <p className="text-sm text-gray-600">
                        Create a <span className="font-medium">CNAME</span> record for{" "}
                        <span className="font-mono bg-gray-100 px-1 rounded">mlsend2._domainkey.{selectedDomain}</span> with
                        this value:
                      </p>
                      <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                        <span>{dkimRecord}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(dkimRecord, "dkim")}
                        >
                          {copiedStates.dkim ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DNS Configuration Options */}
              <div className="bg-white rounded-lg border p-6">
                <div className="space-y-6">
                  {/* Custom DNS Records */}
                  <div className="flex items-start gap-4">
                    <Switch checked={customDnsTracking} onCheckedChange={setCustomDnsTracking} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Custom DNS records for tracking</h3>
                      <p className="text-sm text-gray-600">
                        Display a different URL in your emails with your own custom domain to track opens and clicks.
                      </p>
                    </div>
                  </div>

                  {/* Inbound Domain Forwarding */}
                  <div className="flex items-start gap-4">
                    <Switch
                      checked={inboundForwarding}
                      onCheckedChange={setInboundForwarding}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Inbound domain forwarding</h3>
                      <p className="text-sm text-gray-600">
                        Choose a dedicated subdomain that you plan to use exclusively for inbound email processing.
                      </p>
                    </div>
                  </div>

                  {/* Inbound Subdomain Configuration */}
                  {inboundForwarding && (
                    <div className="ml-8 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-gray-400" />
                        <h4 className="font-medium text-gray-900">Customize the inbound subdomain</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Create a new record with the following information:</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            Create a <span className="font-medium">MX</span> record with this name:
                          </p>
                          <div className="bg-white p-3 rounded border flex items-center justify-between">
                            <span className="font-mono">inbound.</span>
                            <Button variant="ghost" size="sm" className="text-blue-600">
                              Edit
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            Record value with priority <span className="font-medium">10</span>:
                          </p>
                          <div className="bg-white p-3 rounded border">
                            <span className="font-mono">inbound.mailersend.net</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DMARC */}
                  <div className="flex items-start gap-4">
                    <Switch checked={dmarcEnabled} onCheckedChange={setDmarcEnabled} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Improve deliverability with DMARC</h3>
                      <p className="text-sm text-gray-600">
                        Troubleshoot deliverability issues, protect your account against unauthorized activity, and prevent
                        emails from being blocked by mailbox providers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion */}
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  2. Once you're done, confirm that you've added the DNS records and finish the verification.
                </p>

                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="dns-added" 
                    checked={dnsRecordsAdded} 
                    onCheckedChange={(checked) => setDnsRecordsAdded(checked as boolean)}
                  />
                  <label htmlFor="dns-added" className="text-sm text-gray-700">
                    I have added DNS records.
                  </label>
                </div>

                <Button 
                  className="bg-teal-600 hover:bg-teal-700" 
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
                      Verifying...
                    </>
                  ) : (
                    'Finish verification'
                  )}
                </Button>
              </div>

              {/* Delete Domain Section */}
              <div className="pt-8 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                  onClick={() => {
                    const currentDomain = domains.find(d => d.domain === selectedDomain)
                    if (currentDomain) {
                      handleDeleteDomain(currentDomain.id)
                    }
                  }}
                >
                  Delete domain
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">How long does it take to verify the domain?</h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-gray-900">Your part: 5 minutes</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Time until the domain is fully verified: up to 48 hours.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Does it always take 48 hours?</h3>
                <p className="text-sm text-gray-600">
                  Once you update your domain settings, verifying the domain can take up to 48 hours. It's an automated
                  process that we can't speed up but sometimes finishes faster.
                </p>
                <p className="text-sm text-gray-600 mt-3">
                  If your domain is still not verified after 48 hours, ensure the records are correct by checking the SPF
                  and DKIM records on{" "}
                  <a href="#" className="text-teal-600 hover:underline">
                    Mailertest.com
                  </a>{" "}
                  or ask your domain administrator to take a look before contacting Customer Support.
                </p>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Frequently asked questions</h3>
                <div className="space-y-3">
                  <a href="#" className="block text-sm text-teal-600 hover:underline">
                    How to add and verify a domain?
                  </a>
                  <a href="#" className="block text-sm text-teal-600 hover:underline">
                    What is a sending domain?
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
        </div>
      </div>
    )
  }

  return null
}
"use client"

import { useState, useEffect, useCallback } from "react"
import { useI18n } from '@/hooks/use-i18n'
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
  inbound_parse_configured?: boolean
  inbound_parse_hostname?: string
  inbound_parse_error?: string
}

export default function DomainsPage() {
  const { t, ready } = useI18n()
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

  // Define all useCallback hooks first
  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Fetching domains from /api/domains...')
      const response = await fetch('/api/domains', {
        credentials: 'include', // Ensure cookies are sent
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      console.log('Domains API response:', { status: response.status, data })
      
      if (response.ok) {
        const domainsData = data.domains || []
        console.log('Setting domains data:', domainsData)
        setDomains(domainsData)
        console.log(`Successfully loaded ${domainsData.length} domains`)
      } else {
        console.error('Domains API error:', data)
        if (response.status === 401) {
          toast.error('Authentication required. Please sign in again.')
        } else {
          toast.error(data.error || 'Failed to load domains')
        }
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
      toast.error('Failed to load domains')
    } finally {
      setLoading(false)
    }
  }, [])

  // Define all useEffect hooks
  useEffect(() => {
    fetchDomains()
  }, []) // Remove domains dependency to prevent infinite loop

  useEffect(() => {
    // Listen for domain verification redirect events from the modal
    const handleDomainVerificationRedirect = (event: CustomEvent) => {
      console.log('📡 Received domain-verification-redirect event:', event.detail);
      const { domain } = event.detail
      
      console.log(`🔍 Looking for domain '${domain}' in domains list (${domains.length} total)`);
      
      // Find the domain in our list
      const domainData = domains.find(d => d.domain === domain)
      if (domainData) {
        console.log('✅ Found domain in list, switching to verification view:', domainData);
        // Set the selected domain and switch to verification view
        setSelectedDomain(domain)
        setSelectedDomainId(domainData.id)
        setCurrentView("verification")
        // Fetch DNS records for the domain
        fetchDnsRecords(domainData.id)
      } else {
        console.log('⚠️ Domain not found in current list, refreshing domains first');
        // If domain not found, refresh domains first then navigate
        fetchDomains().then(async () => {
          setTimeout(async () => {
            // Re-fetch the latest domains state after refresh
            const { data: latestDomains } = await supabase
              .from('domains')
              .select('*')
              .order('created_at', { ascending: false });
              
            const updatedDomain = latestDomains?.find(d => d.domain === domain);
            if (updatedDomain) {
              console.log('✅ Found domain after refresh, switching to verification view:', updatedDomain);
              setSelectedDomain(domain)
              setSelectedDomainId(updatedDomain.id)
              setCurrentView("verification")
              fetchDnsRecords(updatedDomain.id)
            } else {
              console.log('❌ Domain still not found after refresh');
              console.log('Available domains:', latestDomains?.map(d => d.domain));
            }
          }, 200)
        })
      }
    }
    
    // Add event listener
    window.addEventListener('domain-verification-redirect', handleDomainVerificationRedirect as EventListener)
    
    // Cleanup
    return () => {
      window.removeEventListener('domain-verification-redirect', handleDomainVerificationRedirect as EventListener)
    }
  }, [domains]) // Keep domains dependency only for the event listener


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
      
      console.log('DNS Records API Response:', { response: response.ok, data }) // Debug log
      
      if (response.ok && data.records) {
        console.log('Using API DNS records:', data.records) // Debug log
        setDnsRecords(data.records)
      } else {
        console.log('API failed, using fallback records') // Debug log
        
        // Try to extract reply subdomain from domain description
        const currentDomain = domains.find(d => d.id === domainId)
        let replySubdomain = 'reply' // default
        
        if (currentDomain?.description) {
          const replyMatch = currentDomain.description.match(/Reply:\s*([^.\s)]+)/)
          if (replyMatch && replyMatch[1]) {
            replySubdomain = replyMatch[1].split('.')[0] // Get just the subdomain part
          }
        }
        
        console.log('Using reply subdomain for fallback:', replySubdomain) // Debug log
        
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
            host: replySubdomain,
            value: 'mx.sendgrid.net',
            priority: 10,
            description: `Route replies from ${replySubdomain}.${currentDomain?.domain || selectedDomain} back to LeadsUp`
          }
        ])
      }
    } catch (error) {
      console.log('DNS Records API error:', error) // Debug log
      
      // Try to extract reply subdomain from domain description
      const currentDomain = domains.find(d => d.id === domainId)
      let replySubdomain = 'reply' // default
      
      if (currentDomain?.description) {
        const replyMatch = currentDomain.description.match(/Reply:\s*([^.\s)]+)/)
        if (replyMatch && replyMatch[1]) {
          replySubdomain = replyMatch[1].split('.')[0] // Get just the subdomain part
        }
      }
      
      console.log('Using reply subdomain for error fallback:', replySubdomain) // Debug log
      
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
          host: replySubdomain,
          value: 'mx.sendgrid.net',
          priority: 10,
          description: `Route replies from ${replySubdomain}.${currentDomain?.domain || selectedDomain} back to LeadsUp`
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
        // Check if verification was successful based on domainReady flag
        // Only consider it successful if explicitly true (not undefined or null)
        if (data.domainReady === true) {
          toast.success('Domain connected successfully! Redirecting to Email Senders...')
          // Update domain status in the list
          setDomains(prevDomains => 
            prevDomains.map(d => 
              d.id === domainId ? { ...d, status: 'verified' } : d
            )
          )
          // Immediately redirect to senders view without showing verification results
          setCurrentView("senders")
          return // Exit early to prevent showing verification results
        } else {
          // Store the verification results only for failed verifications
          setVerificationResults(data)
          setShowVerificationResults(true)
          
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
        return t('domains.status.verified')
      case 'pending':
        return t('domains.status.settingUp')
      case 'failed':
        return t('domains.status.failed')
      default:
        return t('domains.status.unknown')
    }
  }

  // Translation loading check - must come after all hooks
  if (!ready) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 dark:text-gray-400">{t ? t('common.loading') : 'Loading...'}</div>
    </div>
  }

  // Domains list view
  if (currentView === "domains") {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl font-light text-gray-900 dark:text-gray-100 tracking-tight mb-2">{t('domains.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400 font-light">
                  {t('domains.manageEmailDomains')}
                </p>
              </div>

              <Button 
                onClick={() => setShowAddDomain(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('domains.addDomain')}
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex gap-4 mb-8">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder={t('domains.searchDomains')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl dark:text-gray-100"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl dark:text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectItem value="date-created">{t('domains.dateCreated')}</SelectItem>
                <SelectItem value="name">{t('domains.name')}</SelectItem>
                <SelectItem value="status">{t('domains.statusLabel')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Domains */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">{t('domains.loadingDomains')}</span>
              </div>
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">{t('domains.noDomainsYet')}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 font-light max-w-md mx-auto">
                {t('domains.addFirstDomain')}
              </p>
              <Button 
                onClick={() => setShowAddDomain(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-6 py-3 font-medium transition-all duration-300 rounded-2xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('domains.addFirstDomain')}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {domains
                .filter(domain => 
                  domain.domain.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((domain) => (
                  <div key={domain.id} className="bg-white dark:bg-gray-800 border border-gray-100/50 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300 rounded-3xl overflow-hidden">
                    <div className="p-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Globe className="h-6 w-6 text-blue-600" />
                          </div>
                        
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{domain.domain}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${getStatusColor(domain.status)}`}>
                                {getStatusText(domain.status)}
                              </span>
                              {domain.status === 'verified' && domain.inbound_parse_configured && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg">
                                  {ready ? t('domains.replyCapture') : 'Reply Capture ✓'}
                                </span>
                              )}
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
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {t('domains.addedOn', { date: new Date(domain.created_at).toLocaleDateString() })}
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
                            className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Configure domain settings"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleManageDomain(domain)}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
                        >
                          {domain.status === 'verified' ? t('domains.manage') : t('domains.setup')}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteDomain(domain)}
                          className="border-red-300 hover:bg-red-50 text-red-600 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
                        >
                          {t('domains.delete')}
                        </Button>
                        </div>
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
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
              <DialogHeader>
                <DialogTitle>{t('domains.deleteDomain')}</DialogTitle>
                <DialogDescription>
                  <span>
                    Cette action ne peut pas être annulée. Tapez "delete" pour confirmer la suppression de{' '}
                    <strong className="font-semibold">{domainToDelete?.domain}</strong>.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t('domains.deletePlaceholder')}
              />
              <DialogFooter>
                <Button variant="outline" onClick={cancelDeleteDomain}>
                  {t('domains.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteDomain}
                  disabled={deleteConfirmText !== "delete" || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('domains.deleting')}
                    </>
                  ) : (
                    t('domains.deleteDomain')
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
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <Button 
            variant="ghost" 
            onClick={handleBackToDomains} 
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 -ml-2 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('dnsSetup.backToDomains')}
          </Button>
          
          <div className="mb-8">
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">{t('dnsSetup.title', { domain: selectedDomain })}</h1>
            <p className="text-gray-500 font-light">
              {t('dnsSetup.subtitle')}
            </p>
          </div>

          {/* Quick Steps Guide */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-gray-600 font-medium text-sm">?</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3">{t('dnsSetup.quickSteps.title')}</h3>
                <ol className="space-y-2 text-gray-700 text-sm">
                  <li><span className="font-medium">1.</span> {t('dnsSetup.quickSteps.step1')}</li>
                  <li><span className="font-medium">2.</span> {t('dnsSetup.quickSteps.step2')}</li>
                  <li><span className="font-medium">3.</span> {t('dnsSetup.quickSteps.step3')}</li>
                  <li><span className="font-medium">4.</span> {t('dnsSetup.quickSteps.step4')}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* DNS Settings */}
          {loadingDnsRecords ? (
            <div className="bg-white rounded-xl border p-8 mb-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">{t('dnsSetup.loading')}</span>
              </div>
            </div>
          ) : dnsRecords.length > 0 ? (
            <>
              {/* Regular DNS Records (non-MX) */}
              {dnsRecords.filter(r => r.type !== 'MX').length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">{t('dnsSetup.dnsRecords')}</h3>
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">{t('dnsSetup.table.type')}</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">{t('dnsSetup.table.host')}</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">{t('dnsSetup.table.value')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dnsRecords.filter(r => r.type !== 'MX').map((record, index) => (
                          <tr key={`regular-${index}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {record.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-gray-700">
                                  {record.host}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(record.host, `host-regular-${index}`)}
                                  className="text-gray-500 hover:text-gray-700 p-1 h-6 w-6"
                                  title={t('dnsSetup.copyHost')}
                                >
                                  {copiedStates[`host-regular-${index}`] ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-md">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-gray-700 break-all">
                                  {record.value}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(record.value, `value-regular-${index}`)}
                                  className="text-gray-500 hover:text-gray-700 p-1 h-6 w-6 flex-shrink-0"
                                  title={t('dnsSetup.copyValue')}
                                >
                                  {copiedStates[`value-regular-${index}`] ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MX Records with Priority */}
              {dnsRecords.filter(r => r.type === 'MX').length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">{t('dnsSetup.mxRecords')}</h3>
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">{t('dnsSetup.table.type')}</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">{t('dnsSetup.table.host')}</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">{t('dnsSetup.table.priority')}</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">{t('dnsSetup.table.value')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dnsRecords.filter(r => r.type === 'MX').map((record, index) => (
                          <tr key={`mx-${index}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {record.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-gray-700">
                                  {record.host}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(record.host, `host-mx-${index}`)}
                                  className="text-gray-500 hover:text-gray-700 p-1 h-6 w-6"
                                  title={t('dnsSetup.copyHost')}
                                >
                                  {copiedStates[`host-mx-${index}`] ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                  {record.priority || '10'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(String(record.priority || '10'), `priority-mx-${index}`)}
                                  className="text-gray-500 hover:text-gray-700 p-1 h-6 w-6"
                                  title={t('dnsSetup.copyPriority')}
                                >
                                  {copiedStates[`priority-mx-${index}`] ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-md">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-gray-700 break-all">
                                  {record.value}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(record.value, `value-mx-${index}`)}
                                  className="text-gray-500 hover:text-gray-700 p-1 h-6 w-6 flex-shrink-0"
                                  title={t('dnsSetup.copyValue')}
                                >
                                  {copiedStates[`value-mx-${index}`] ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center mb-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500">No settings available. Please try refreshing.</p>
            </div>
          )}

          {/* Verification Actions - Only show for unverified domains */}
          {(() => {
            const currentDomain = domains.find(d => d.domain === selectedDomain)
            const isAlreadyVerified = currentDomain?.status === 'verified'
            
            if (isAlreadyVerified) {
              return (
                <div className="bg-green-50 rounded-xl p-6 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">{t('domains.alreadyConnected.title')}</h3>
                    <p className="text-gray-600 mb-6">
                      {t('domains.alreadyConnected.description')}
                    </p>
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
                      {t('domains.alreadyConnected.manageSenders')}
                    </Button>
                  </div>
                </div>
              )
            }

            return (
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
                      {t('dnsSetup.verification.addedSettings')}
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
                        if (currentDomain) {
                          handleVerifyDomain(currentDomain.id)
                        }
                      }}
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('dnsSetup.verification.checking')}
                        </>
                      ) : (
                        t('dnsSetup.verification.checkDomain')
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      {t('dnsSetup.verification.timeNote')}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Verification Results */}
          {showVerificationResults && verificationResults && (
            <div className="mt-8">
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">{t('dnsSetup.verification.connectionStatus')}</h3>
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
                      {t('domains.verification.readyToSend')}
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
                        {t('dnsSetup.backToDomains')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <span className="text-lg font-medium text-gray-900">{t('dnsSetup.verification.setupNotComplete')}</span>
                      </div>
                      <p className="text-gray-600 mb-6">
                        {t('dnsSetup.verification.someDNSRecordsNeeded')}
                      </p>
                    </div>
                    
                    {/* Simple list of missing records */}
                    {(verificationResults.report?.records || verificationResults.recommendations || verificationResults.records || [])
                      .filter((record: any) => !record.verified)
                      .length > 0 && (
                      <div className="bg-red-50 rounded-lg p-6">
                        <h4 className="font-medium text-gray-900 mb-4">{t('dnsSetup.verification.pleaseCheckSettings')}</h4>
                        <div className="space-y-3">
                          {(verificationResults.report?.records || verificationResults.recommendations || verificationResults.records || [])
                            .filter((record: any) => !record.verified)
                            .map((record: any, index: number) => (
                            <div key={`missing-${index}`} className="flex items-center gap-3 bg-white rounded-lg p-3">
                              <span className="text-red-500 text-lg">✗</span>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {(() => {
                                    const recordText = record.record || `${record.type} ${record.host || ''}`;
                                    // If it contains "Cryptographic email signing", translate it
                                    if (recordText.includes('Cryptographic email signing')) {
                                      const parts = recordText.split(' - ');
                                      return `${parts[0]} - ${t('dnsSetup.verification.cryptographicEmailSigning')}`;
                                    }
                                    return recordText.replace(/\(.*?\)/g, '').trim();
                                  })()}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {t('dnsSetup.verification.checkSettingInDNS', { type: record.type })}
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
                        {t('dnsSetup.verification.reviewDNSSettings')}
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
                          {t('dnsSetup.verification.checkAgain')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleBackToDomains}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          {t('dnsSetup.backToDomains')}
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

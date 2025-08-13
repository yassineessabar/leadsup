"use client"

import { useState, useEffect } from "react"
import { Check, Mail, Plus, AlertCircle, Settings, ChevronDown, ChevronRight, User, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "sonner"

interface Domain {
  id: string
  domain: string
  status: 'verified' | 'pending' | 'failed'
  created_at: string
}

interface Sender {
  id: string
  email: string
  display_name: string
  is_default: boolean
  setup_status: 'completed' | 'warming_up' | 'needs_attention' | 'pending'
  daily_limit: number
  health_score: number
  emails_sent: number
  created_at: string
}

interface DomainWithSenders extends Domain {
  senders: Sender[]
}

interface CampaignSenderSelectionProps {
  campaignId: string | number
  onSelectionChange: (selectedSenders: string[]) => void
  initialSelectedSenders?: string[]
}

export default function CampaignSenderSelection({ 
  campaignId, 
  onSelectionChange, 
  initialSelectedSenders = [] 
}: CampaignSenderSelectionProps) {
  console.log('🎯 CampaignSenderSelection props:', { campaignId, initialSelectedSenders });
  const [domainsWithSenders, setDomainsWithSenders] = useState<DomainWithSenders[]>([])
  const [selectedSenders, setSelectedSenders] = useState<Set<string>>(() => {
    const initialSet = new Set(initialSelectedSenders)
    console.log('🚀 Initial selectedSenders state:', Array.from(initialSet), 'size:', initialSet.size)
    return initialSet
  })
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Test email modal state
  const [showTestModal, setShowTestModal] = useState(false)
  const [testModalEmail, setTestModalEmail] = useState('')
  const [testModalSender, setTestModalSender] = useState<Sender | null>(null)
  const [testModalLoading, setTestModalLoading] = useState(false)

  // Load domains and their sender accounts
  useEffect(() => {
    fetchDomainsAndSenders()
    loadExistingSenderAssignments()
  }, [])

  // Auto-expand domains that have selected senders
  useEffect(() => {
    const domainsToExpand = new Set<string>()
    domainsWithSenders.forEach(domain => {
      if (domain.senders.some(sender => selectedSenders.has(sender.id))) {
        domainsToExpand.add(domain.id)
      }
    })
    setExpandedDomains(domainsToExpand)
  }, [domainsWithSenders, selectedSenders])

  const fetchDomainsAndSenders = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all verified domains
      const domainsResponse = await fetch('/api/domains')
      const domainsData = await domainsResponse.json()

      if (!domainsResponse.ok || !domainsData.success) {
        throw new Error('Failed to fetch domains')
      }

      // Filter only verified domains
      const verifiedDomains = domainsData.domains.filter((domain: Domain) => domain.status === 'verified')

      // Fetch senders for each verified domain
      const domainsWithSendersPromises = verifiedDomains.map(async (domain: Domain) => {
        try {
          const sendersResponse = await fetch(`/api/domains/${domain.id}/senders`)
          const sendersData = await sendersResponse.json()

          if (sendersResponse.ok && sendersData.success) {
            return {
              ...domain,
              senders: sendersData.senders || []
            }
          } else {
            console.warn(`Failed to fetch senders for domain ${domain.domain}`)
            return {
              ...domain,
              senders: []
            }
          }
        } catch (error) {
          console.error(`Error fetching senders for domain ${domain.domain}:`, error)
          return {
            ...domain,
            senders: []
          }
        }
      })

      const domainsWithSendersResults = await Promise.all(domainsWithSendersPromises)
      setDomainsWithSenders(domainsWithSendersResults)

    } catch (error) {
      console.error('Error fetching domains and senders:', error)
      setError('Failed to load domain accounts. Please try again.')
      toast.error('Failed to load sender accounts')
    } finally {
      setLoading(false)
    }
  }

  const loadExistingSenderAssignments = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/senders`)
      const data = await response.json()

      if (response.ok && data.success) {
        // Handle both old and new format
        let assignedSenderIds: string[] = []
        
        if (data.assignments) {
          // Try different possible column names for sender ID
          assignedSenderIds = data.assignments.map((assignment: any) => 
            assignment.sender_account_id || assignment.sender_id || assignment.id
          ).filter(Boolean)
        }
        
        console.log('📋 Loaded existing sender assignments:', assignedSenderIds)
        console.log('📊 Setting selectedSenders size to:', assignedSenderIds.length)
        const newSelectedSet = new Set(assignedSenderIds)
        console.log('📊 New Set size:', newSelectedSet.size)
        setSelectedSenders(newSelectedSet)
        onSelectionChange(assignedSenderIds)
      }
    } catch (error) {
      console.error('Error loading existing sender assignments:', error)
      // Don't show error toast for this as it's not critical
    }
  }

  const saveSenderSelection = async (selectedSenderIds: string[]) => {
    try {
      console.log(`🔄 Saving ${selectedSenderIds.length} sender(s) to campaign ${campaignId}...`)
      console.log('📍 API URL:', `/api/campaigns/${campaignId}/senders`)
      console.log('📋 Selected sender IDs:', selectedSenderIds)
      
      // Quick auth check first
      console.log('🔐 Testing authentication...')
      const authTest = await fetch('/api/auth/me')
      console.log('🔐 Auth test status:', authTest.status, authTest.statusText)
      
      if (!authTest.ok) {
        console.error('❌ Authentication failed - user not logged in')
        throw new Error('You must be logged in to save sender selections')
      }
      
      const response = await fetch(`/api/campaigns/${campaignId}/senders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedSenderIds
        }),
      })

      console.log('📡 Response status:', response.status, response.statusText)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      let data
      try {
        const responseText = await response.text()
        console.log('📡 Raw response text (first 500 chars):', responseText.substring(0, 500))
        
        if (!responseText) {
          throw new Error('Empty response from server')
        }
        
        // Check if response is HTML (error page)
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          console.error('❌ Received HTML instead of JSON - likely an error page')
          throw new Error('Server returned an error page instead of JSON. Check if you are logged in and the API route exists.')
        }
        
        data = JSON.parse(responseText)
        console.log('📡 Parsed response data:', data)
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError)
        if (parseError.message.includes('Unexpected token')) {
          throw new Error('Server returned HTML instead of JSON. This usually means authentication failed or the API route is not found.')
        }
        throw new Error(`Invalid response from server: ${parseError.message}`)
      }

      if (!response.ok || !data.success) {
        console.error('❌ API Error Response:', { 
          status: response.status, 
          statusText: response.statusText,
          data 
        })
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ Saved ${selectedSenderIds.length} sender(s) to campaign`)
      toast.success(`✅ Saved ${selectedSenderIds.length} sender(s) to campaign`)

      // Auto-enable inbound tracking for domains with selected senders
      if (selectedSenderIds.length > 0) {
        await enableInboundTrackingForDomains(selectedSenderIds)
      }
    } catch (error) {
      console.error('❌ Error saving sender selection:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to save sender selection: ${errorMessage}`)
    }
  }

  const enableInboundTrackingForDomains = async (selectedSenderIds: string[]) => {
    try {
      // Get unique domain IDs from selected senders
      const domainsWithSelectedSenders = new Set<string>()
      
      domainsWithSenders.forEach(domain => {
        const hasSelectedSenders = domain.senders.some(sender => 
          selectedSenderIds.includes(sender.id)
        )
        if (hasSelectedSenders) {
          domainsWithSelectedSenders.add(domain.id)
        }
      })

      // Enable inbound tracking for each domain
      const enablePromises = Array.from(domainsWithSelectedSenders).map(async (domainId) => {
        try {
          const response = await fetch(`/api/domains/${domainId}/inbound-tracking`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            console.log(`✅ Enabled inbound tracking for domain ${domainId}`)
          } else {
            console.warn(`⚠️ Failed to enable inbound tracking for domain ${domainId}`)
          }
        } catch (error) {
          console.warn(`⚠️ Error enabling inbound tracking for domain ${domainId}:`, error)
        }
      })

      await Promise.all(enablePromises)
    } catch (error) {
      console.error('❌ Error enabling inbound tracking:', error)
      // Don't show error toast as this is a background operation
    }
  }

  const handleSenderToggle = (senderId: string, checked: boolean) => {
    console.log('🔄 Toggle sender clicked:', senderId, 'New checked state:', checked)
    console.log('📋 Current selected senders:', Array.from(selectedSenders))
    console.log('🔍 Was sender previously selected?', selectedSenders.has(senderId))
    
    const newSelectedSenders = new Set(selectedSenders)
    
    if (checked) {
      console.log('➕ Adding sender to selection')
      newSelectedSenders.add(senderId)
    } else {
      console.log('➖ Removing sender from selection')
      newSelectedSenders.delete(senderId)
    }
    
    console.log('📋 New selected senders:', Array.from(newSelectedSenders))
    console.log('🔍 Will sender be selected after update?', newSelectedSenders.has(senderId))
    
    // Update UI state immediately for responsive feedback using callback to ensure update
    setSelectedSenders(prevSenders => {
      const updatedSet = new Set(newSelectedSenders);
      console.log('🔄 State callback - updating from:', Array.from(prevSenders), 'to:', Array.from(updatedSet));
      return updatedSet;
    });
    onSelectionChange(Array.from(newSelectedSenders))
    
    console.log('✅ State updated - React will re-render with new state')
    
    // Add a small delay to verify state update
    setTimeout(() => {
      console.log('🔍 Post-update verification - sender selected?', newSelectedSenders.has(senderId))
    }, 100)
    
    // Auto-save the selection (don't block UI)
    saveSenderSelection(Array.from(newSelectedSenders)).catch(error => {
      console.error('Failed to save selection:', error)
      // Could revert the UI state here if needed
    })
  }

  const handleDomainToggle = (domain: DomainWithSenders, checked: boolean) => {
    const domainSenderIds = domain.senders.map(sender => sender.id)
    
    const newSelectedSenders = new Set(selectedSenders)
    
    if (checked) {
      // Select all senders in this domain
      domainSenderIds.forEach(id => newSelectedSenders.add(id))
    } else {
      // Unselect all senders in this domain
      domainSenderIds.forEach(id => newSelectedSenders.delete(id))
    }
    
    // Update UI state immediately for responsive feedback using callback to ensure update
    setSelectedSenders(prevSenders => {
      const updatedSet = new Set(newSelectedSenders);
      console.log('🔄 Domain toggle state callback - updating from:', Array.from(prevSenders), 'to:', Array.from(updatedSet));
      return updatedSet;
    });
    onSelectionChange(Array.from(newSelectedSenders))
    
    // Auto-save the selection (don't block UI)
    saveSenderSelection(Array.from(newSelectedSenders)).catch(error => {
      console.error('Failed to save selection:', error)
      // Could revert the UI state here if needed
    })
  }

  const toggleDomainExpansion = (domainId: string) => {
    const newExpanded = new Set(expandedDomains)
    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId)
    } else {
      newExpanded.add(domainId)
    }
    setExpandedDomains(newExpanded)
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

  // Handle test email button click
  const handleTestClick = (sender: Sender) => {
    setTestModalSender(sender)
    setTestModalEmail('ecomm2405@gmail.com') // Pre-fill with test email
    setShowTestModal(true)
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!testModalEmail.trim()) {
      toast.error("Please enter an email address to send the test to.")
      return
    }

    if (!testModalSender) {
      toast.error("No sender selected for test email.")
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/campaigns/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          senderEmail: testModalSender.email,
          testEmail: testModalEmail,
          campaignId: campaignId
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`Test email sent from ${testModalSender.email} to ${testModalEmail}. Reply to test the complete flow!`)
        setShowTestModal(false)
        setTestModalEmail('')
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to send test email. Please try again.")
    } finally {
      setTestModalLoading(false)
    }
  }

  // Handle domain configuration redirect
  const handleDomainConfig = (domain: Domain) => {
    // Redirect to domain verification/configuration page
    // Opens in new tab to preserve campaign workflow
    window.open(`/domains?domain=${encodeURIComponent(domain.domain)}`, '_blank')
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgb(87, 140, 255)', borderTopColor: 'transparent' }}></div>
              <span className="text-gray-600">Loading sender accounts...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Accounts</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchDomainsAndSenders} style={{ backgroundColor: 'rgb(87, 140, 255)' }}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (domainsWithSenders.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-4">No Verified Domains</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You need to set up and verify at least one domain before you can select sender accounts for campaigns.
            </p>
            <Button 
              onClick={() => {
                // Navigate to root page with domain tab selected
                console.log('🔄 Navigating to /?tab=domain...')
                window.location.href = '/?tab=domain'
              }}
              style={{ backgroundColor: 'rgb(87, 140, 255)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
            >
              <Plus className="h-4 w-4 mr-2" />
              Set Up Domain
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Campaign Senders</h1>
          <p className="text-gray-500 text-lg mb-6">
            Select which sender accounts will be used for this campaign
          </p>
        </div>

        {/* Domain Groups */}
        <div className="space-y-4">
          {domainsWithSenders.map((domain) => {
            const domainSenderIds = domain.senders.map(sender => sender.id)
            const selectedInDomain = domainSenderIds.filter(id => selectedSenders.has(id)).length
            const isExpanded = expandedDomains.has(domain.id)
            const allSelected = domainSenderIds.length > 0 && domainSenderIds.every(id => selectedSenders.has(id))
            const someSelected = selectedInDomain > 0 && !allSelected

            return (
              <Card key={domain.id} className="border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleDomainExpansion(domain.id)}
                        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -ml-2 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Globe className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{domain.domain}</h3>
                            <p className="text-sm text-gray-500">
                              {domain.senders.length} account{domain.senders.length !== 1 ? 's' : ''}
                              {selectedInDomain > 0 && (
                                <span className="ml-2 text-blue-600">
                                  • {selectedInDomain} selected
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Verified
                      </Badge>
                      
                      
                      {domain.senders.length > 0 && (
                        <div className="flex items-center">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => handleDomainToggle(domain, checked === true)}
                            className="data-[state=checked]:bg-[rgb(87,140,255)] data-[state=checked]:border-[rgb(87,140,255)]"
                            ref={el => {
                              if (el && someSelected) {
                                el.setAttribute('data-indeterminate', 'true')
                              }
                            }}
                          />
                          <label className="ml-2 text-sm text-gray-700 cursor-pointer">
                            Select All
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <Collapsible open={isExpanded}>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {domain.senders.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="h-6 w-6 text-gray-400" />
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">No Sender Accounts</h4>
                          <p className="text-sm text-gray-500 mb-4">
                            Add sender accounts to this domain to use them in campaigns
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to root page with domain tab to add senders
                              console.log('🔄 Navigating to /?tab=domain to add senders...')
                              window.location.href = '/?tab=domain'
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Senders
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {domain.senders.map((sender) => {
                            const isSelected = selectedSenders.has(sender.id);
                            
                            return (
                            <div 
                              key={sender.id} 
                              className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                                isSelected ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Checkbox
                                    key={`checkbox-${sender.id}-${isSelected}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      console.log(`🔍 Checkbox clicked - sender: ${sender.id}, checked: ${checked}, current isSelected: ${isSelected}`);
                                      console.log(`🎯 Element state - checkbox should be: ${checked ? 'CHECKED' : 'UNCHECKED'}`);
                                      handleSenderToggle(sender.id, checked === true);
                                    }}
                                    className="data-[state=checked]:bg-[rgb(87,140,255)] data-[state=checked]:border-[rgb(87,140,255)]"
                                    aria-label={`Select sender ${sender.email}`}
                                    data-testid={`sender-checkbox-${sender.id}`}
                                    data-selected={isSelected}
                                  />
                                  
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                      <User className="h-5 w-5 text-gray-600" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-gray-900">
                                          {sender.display_name || sender.email.split('@')[0]}
                                        </h4>
                                        {sender.is_default && (
                                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600">{sender.email}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-6 text-sm">
                                  <div className="text-center">
                                    <div className="text-gray-500">Daily Limit</div>
                                    <div className="font-medium text-gray-900">{sender.daily_limit || 50}/day</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-gray-500">Health Score</div>
                                    <div className={`font-medium ${getHealthScoreColor(sender.health_score || 0)}`}>
                                      {sender.health_score || 0}%
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTestClick(sender)
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="text-[rgb(87,140,255)] border-[rgb(87,140,255)] hover:bg-[rgb(87,140,255)] hover:text-white"
                                    >
                                      Test Email
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>


        {/* Test Email Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Send Test Email
                </h3>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {testModalSender && (
                <div className="bg-[rgba(87,140,255,0.05)] border border-[rgba(87,140,255,0.2)] rounded-lg p-4 mb-6">
                  <div className="text-sm text-gray-900 mb-1">
                    <strong>From:</strong> {testModalSender.email}
                  </div>
                  <div className="text-xs text-gray-600">
                    {testModalSender.display_name || 'Sender Account'}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send test email to:
                </label>
                <input
                  type="email"
                  value={testModalEmail}
                  onChange={(e) => setTestModalEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(87,140,255)] focus:border-[rgb(87,140,255)] outline-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <div className="text-sm text-blue-800 font-medium mb-1">
                  📧 What will be sent:
                </div>
                <div className="text-xs text-blue-700 mb-2">
                  This will send your <strong>actual campaign sequence</strong> (first email) with test variables:
                  <br/>• firstName: John • lastName: Doe • company: Acme Corp
                </div>
                <div className="text-sm text-blue-800 font-medium mb-1">
                  💡 Test Instructions:
                </div>
                <div className="text-xs text-blue-700">
                  1. Click "Send Test Email" below<br/>
                  2. Check your email and reply to the test message<br/>
                  3. Your reply should appear in both "Sent" and "Inbox" folders in LeadsUp
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowTestModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendTestEmail}
                  disabled={testModalLoading}
                  className="bg-[rgb(87,140,255)] hover:bg-[rgb(67,120,235)] text-white"
                >
                  {testModalLoading ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
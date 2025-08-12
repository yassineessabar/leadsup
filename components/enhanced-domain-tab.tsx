"use client"

import { useState, useEffect } from "react"
import { Search, Download, Plus, Settings, AlertCircle, CheckCircle, Copy, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SmartDomainSetup } from "@/components/smart-domain-setup"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

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

interface DNSRecord {
  type: string
  name: string
  value: string
  priority?: number
  purpose: string
}

export function EnhancedDomainTab() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("date-created")
  const [viewCount, setViewCount] = useState("25")
  
  // Smart domain setup state
  const [showSmartSetup, setShowSmartSetup] = useState(false)
  
  // DNS setup state
  const [showDNSSetup, setShowDNSSetup] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([])
  const [verifying, setVerifying] = useState<string | null>(null)
  const [copied, setCopied] = useState<Record<string, boolean>>({})

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

  const copyToClipboard = async (text: string, recordId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [recordId]: true })
      toast.success('Copied to clipboard')
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied({ ...copied, [recordId]: false })
      }, 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            Verified
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <AlertCircle className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  const filteredDomains = domains.filter(domain =>
    domain.domain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Domains</h1>
          <p className="text-sm text-gray-600 mt-1">
            Emails will be sent to your recipients from the verified domains.
          </p>
        </div>
        
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setShowSmartSetup(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add domain
        </Button>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Type to search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-created">Date created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading && domains.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? 'No domains match your search' : 'No domains configured yet'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Domain</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Status</th>
                <th className="text-center py-3 px-6 text-sm font-medium text-gray-600">
                  <div>Sending</div>
                  <div className="flex justify-center gap-8 mt-1 text-xs text-gray-500">
                    <span>Sent</span>
                    <span>Delivered</span>
                  </div>
                </th>
                <th className="text-center py-3 px-6 text-sm font-medium text-gray-600">
                  <div>Receiving</div>
                  <div className="flex justify-center gap-8 mt-1 text-xs text-gray-500">
                    <span>Rejected</span>
                    <span>Received</span>
                  </div>
                </th>
                <th className="text-right py-3 px-6 text-sm font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDomains.map((domain) => (
                <tr key={domain.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          domain.status === "verified" ? "bg-green-100 text-green-600" : 
                          domain.status === "pending" ? "bg-yellow-100 text-yellow-600" :
                          "bg-red-100 text-red-600"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          domain.status === "verified" ? "bg-green-600" :
                          domain.status === "pending" ? "bg-yellow-600" :
                          "bg-red-600"
                        }`}></div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{domain.domain}</span>
                          {domain.isTestDomain && (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                              Test domain
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{domain.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {getStatusBadge(domain.status)}
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
                      {domain.status === 'pending' && (
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
                            'Verify'
                          )}
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-600 hover:text-gray-900"
                        onClick={() => {
                          setSelectedDomain(domain)
                          setShowDNSSetup(true)
                        }}
                      >
                        <Settings className="mr-1 h-4 w-4" />
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
      <div className="flex items-center justify-between p-6 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">View</span>
          <Select value={viewCount} onValueChange={setViewCount}>
            <SelectTrigger className="w-16 h-8 border-gray-300">
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

      {/* DNS Setup Dialog */}
      <Dialog open={showDNSSetup} onOpenChange={setShowDNSSetup}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>DNS Setup for {selectedDomain?.domain}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Add these DNS records to your domain provider to complete verification.
              </AlertDescription>
            </Alert>

            {dnsRecords.map((record, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline">{record.type}</Badge>
                    {record.purpose}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-3 rounded-md font-mono text-sm space-y-1">
                    <div><strong>Type:</strong> {record.type}</div>
                    <div><strong>Name:</strong> {record.name}</div>
                    <div><strong>Value:</strong> {record.value}</div>
                    {record.priority && <div><strong>Priority:</strong> {record.priority}</div>}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(
                      `${record.type} ${record.name} ${record.value}${record.priority ? ` ${record.priority}` : ''}`,
                      `${index}`
                    )}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    {copied[index] ? (
                      <>
                        <CheckCircle className="mr-2 h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-3 w-3" />
                        Copy Record
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button
                onClick={() => selectedDomain && handleVerifyDomain(selectedDomain.id)}
                disabled={verifying === selectedDomain?.id}
                className="flex-1"
              >
                {verifying === selectedDomain?.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying DNS...
                  </>
                ) : (
                  'Verify DNS Setup'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDNSSetup(false)}
              >
                Close
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Need help?</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://docs.sendgrid.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    SendGrid Docs
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/help/dns-setup" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Setup Guide
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Domain Setup */}
      <SmartDomainSetup
        isOpen={showSmartSetup}
        onClose={() => setShowSmartSetup(false)}
        onDomainAdded={handleDomainAdded}
      />
    </div>
  )
}
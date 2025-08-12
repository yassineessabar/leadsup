"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Globe, CheckCircle, AlertCircle, Mail, Shield, Copy, ExternalLink, Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface DomainRecord {
  id: string
  domain: string
  status: 'pending' | 'verified' | 'failed'
  created_at: string
  last_checked: string
  mx_records?: string[]
  verification_type: 'sendgrid' | 'gmail'
}

export function DomainTab() {
  const [domains, setDomains] = useState<DomainRecord[]>([])
  const [newDomain, setNewDomain] = useState("")
  const [verificationType, setVerificationType] = useState<'sendgrid' | 'gmail'>('sendgrid')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)

  // Load domains on mount
  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API call
      // const response = await fetch('/api/domains')
      // const data = await response.json()
      // setDomains(data.domains)
      
      // Mock data for now
      setDomains([
        {
          id: '1',
          domain: 'reply.leadsup.io',
          status: 'verified',
          created_at: new Date().toISOString(),
          last_checked: new Date().toISOString(),
          mx_records: ['mx.sendgrid.net'],
          verification_type: 'sendgrid'
        }
      ])
    } catch (error) {
      console.error('Error fetching domains:', error)
      toast.error('Failed to load domains')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDomain = async () => {
    if (!newDomain) {
      toast.error('Please enter a domain')
      return
    }

    try {
      setLoading(true)
      // TODO: Replace with actual API call
      // const response = await fetch('/api/domains', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ domain: newDomain, verification_type: verificationType })
      // })
      
      const newDomainRecord: DomainRecord = {
        id: Date.now().toString(),
        domain: newDomain,
        status: 'pending',
        created_at: new Date().toISOString(),
        last_checked: new Date().toISOString(),
        verification_type: verificationType
      }
      
      setDomains([...domains, newDomainRecord])
      setNewDomain('')
      toast.success(`Domain ${newDomain} added successfully`)
    } catch (error) {
      console.error('Error adding domain:', error)
      toast.error('Failed to add domain')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyDomain = async (domainId: string) => {
    try {
      setVerifying(domainId)
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/domains/${domainId}/verify`, {
      //   method: 'POST'
      // })
      
      // Simulate verification
      setTimeout(() => {
        setDomains(domains.map(d => 
          d.id === domainId 
            ? { ...d, status: 'verified', mx_records: ['mx.sendgrid.net'] }
            : d
        ))
        setVerifying(null)
        toast.success('Domain verified successfully')
      }, 2000)
    } catch (error) {
      console.error('Error verifying domain:', error)
      toast.error('Failed to verify domain')
      setVerifying(null)
    }
  }

  const handleDeleteDomain = async (domainId: string) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/domains/${domainId}`, { method: 'DELETE' })
      
      setDomains(domains.filter(d => d.id !== domainId))
      toast.success('Domain removed successfully')
    } catch (error) {
      console.error('Error deleting domain:', error)
      toast.error('Failed to remove domain')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Domain Configuration</h2>
          <p className="text-muted-foreground">
            Manage your email domains for sending campaigns
          </p>
        </div>
      </div>

      {/* Add New Domain */}
      <Card>
        <CardHeader>
          <CardTitle>Add Email Domain</CardTitle>
          <CardDescription>
            Configure a domain to send emails from your own email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="e.g., yourdomain.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="type">Verification Type</Label>
              <select
                id="type"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={verificationType}
                onChange={(e) => setVerificationType(e.target.value as 'sendgrid' | 'gmail')}
              >
                <option value="sendgrid">SendGrid</option>
                <option value="gmail">Gmail/Google</option>
              </select>
            </div>
          </div>
          <Button onClick={handleAddDomain} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Domain
          </Button>
        </CardContent>
      </Card>

      {/* Existing Domains */}
      <Card>
        <CardHeader>
          <CardTitle>Your Domains</CardTitle>
          <CardDescription>
            Manage and verify your configured domains
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && domains.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No domains configured yet. Add your first domain above.
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{domain.domain}</span>
                        <Badge
                          variant={
                            domain.status === 'verified'
                              ? 'default'
                              : domain.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {domain.status === 'verified' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {domain.status === 'failed' && <AlertCircle className="mr-1 h-3 w-3" />}
                          {domain.status}
                        </Badge>
                        <Badge variant="outline">
                          {domain.verification_type === 'sendgrid' ? 'SendGrid' : 'Gmail'}
                        </Badge>
                      </div>
                      {domain.mx_records && (
                        <p className="text-sm text-muted-foreground mt-1">
                          MX: {domain.mx_records.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {domain.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleVerifyDomain(domain.id)}
                        disabled={verifying === domain.id}
                      >
                        {verifying === domain.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Verify
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDomain(domain.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to configure your domain for email sending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>SendGrid Setup:</strong> Configure your domain's MX records to point to SendGrid
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <h4 className="font-medium">For SendGrid Inbound Parse:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Add an MX record pointing to <code className="bg-muted px-1 rounded">mx.sendgrid.net</code></li>
              <li>Set priority to 10</li>
              <li>Configure SendGrid Inbound Parse webhook to point to your application</li>
              <li>Verify domain ownership in SendGrid dashboard</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">For Gmail/Google Workspace:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Verify domain ownership in Google Workspace Admin</li>
              <li>Add SPF record: <code className="bg-muted px-1 rounded">v=spf1 include:_spf.google.com ~all</code></li>
              <li>Configure DKIM authentication</li>
              <li>Enable API access for your domain</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                SendGrid Docs
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://support.google.com/a/answer/33786" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Google Workspace Docs
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
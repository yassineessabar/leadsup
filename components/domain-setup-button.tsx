"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Globe, 
  Zap, 
  Settings, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Clock,
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"

interface DomainSetupButtonProps {
  campaignId: string | number
  campaignName: string
}

export function DomainSetupButton({ campaignId, campaignName }: DomainSetupButtonProps) {
  const [showSetup, setShowSetup] = useState(false)
  const [setupMethod, setSetupMethod] = useState<'auto' | 'manual' | null>(null)
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [dnsRecords, setDnsRecords] = useState<any[]>([])
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const startDomainSetup = async (method: 'auto' | 'manual') => {
    setSetupMethod(method)
    setLoading(true)

    try {
      if (method === 'auto') {
        // Check Domain Connect support
        const response = await fetch('/api/domain-connect/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain })
        })

        const result = await response.json()
        
        if (result.supported && result.setupUrl) {
          // Open Domain Connect popup
          const popup = window.open(
            result.setupUrl,
            'domain-setup',
            'width=800,height=600,scrollbars=yes,resizable=yes'
          )

          if (!popup) {
            toast.error('Please allow popups for automated setup')
            return
          }

          // Monitor popup for completion
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed)
              setTimeout(() => {
                toast.success('Domain setup completed!')
                setShowSetup(false)
              }, 2000)
            }
          }, 1000)

        } else {
          toast.error('Automated setup not available for this domain')
          setSetupMethod('manual') // Fallback to manual
        }
      } else {
        // Manual setup - generate DNS records
        const records = [
          {
            type: 'TXT',
            name: '@',
            value: 'v=spf1 include:sendgrid.net ~all',
            purpose: 'Email authentication (SPF)'
          },
          {
            type: 'CNAME', 
            name: 's1._domainkey',
            value: 's1.domainkey.u30435661.wl250.sendgrid.net',
            purpose: 'Email signing (DKIM)'
          },
          {
            type: 'MX',
            name: 'reply',
            value: 'mx.sendgrid.net',
            priority: 10,
            purpose: 'Route replies to LeadsUp'
          },
          {
            type: 'TXT',
            name: '_leadsup-verify',
            value: `leadsup-verify-${Date.now()}`,
            purpose: 'Domain verification'
          }
        ]
        setDnsRecords(records)
      }
    } catch (error) {
      console.error('Domain setup error:', error)
      toast.error('Failed to start domain setup')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, recordId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [recordId]: true })
      toast.success('Copied to clipboard')
      
      setTimeout(() => {
        setCopied({ ...copied, [recordId]: false })
      }, 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDomainSubmit = () => {
    if (!domain) {
      toast.error('Please enter your domain')
      return
    }
    
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain)) {
      toast.error('Please enter a valid domain (e.g., yourdomain.com)')
      return
    }

    setSetupMethod(null) // Show method selection
  }

  return (
    <>
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => setShowSetup(true)}
      >
        <Globe className="mr-2 h-3 w-3" />
        Setup Domain
      </Button>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Domain Setup for {campaignName}</DialogTitle>
          </DialogHeader>

          {/* Step 1: Domain Input */}
          {!setupMethod && (
            <div className="space-y-6">
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Use your own domain to send emails from your brand instead of LeadsUp's domain.
                  This improves deliverability and recipient trust.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Domain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., yourdomain.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleDomainSubmit()}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Automated Setup Option */}
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-blue-200"
                    onClick={() => domain && startDomainSetup('auto')}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        Automated Setup
                        <Badge className="bg-blue-100 text-blue-700">Recommended</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        One-click setup for GoDaddy, Namecheap, Google Domains, and 50+ other providers.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        30 seconds
                      </div>
                    </CardContent>
                  </Card>

                  {/* Manual Setup Option */}
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-gray-200"
                    onClick={() => domain && startDomainSetup('manual')}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5 text-gray-600" />
                        Manual Setup
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        Step-by-step guide with DNS records. Works with any DNS provider.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        5-10 minutes
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleDomainSubmit}
                    disabled={!domain}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSetup(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Manual DNS Setup */}
          {setupMethod === 'manual' && (
            <div className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Add these DNS records to your domain provider to complete setup for <strong>{domain}</strong>
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

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  After adding these records, DNS changes can take up to 24 hours to propagate globally. 
                  Your emails will start using the custom domain once verification is complete.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    toast.success('Domain setup saved! We\'ll verify your DNS records and notify you when ready.')
                    setShowSetup(false)
                  }}
                  className="flex-1"
                >
                  I've Added the Records
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSetupMethod(null)}
                >
                  Back
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
          )}

          {/* Step 3: Automated Setup (Domain Connect) */}
          {setupMethod === 'auto' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Automated Setup in Progress</h3>
                <p className="text-gray-600 mt-1">
                  Complete the setup in the popup window to configure <strong>{domain}</strong>
                </p>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This will automatically add all required DNS records to your domain.
                  No manual configuration needed!
                </AlertDescription>
              </Alert>

              <Button variant="outline" onClick={() => setShowSetup(false)}>
                Continue in Background
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Loader2, 
  Zap, 
  Settings, 
  Globe,
  ArrowRight,
  Clock
} from "lucide-react"
import { toast } from "sonner"

interface SetupMethod {
  type: 'domain-connect' | 'direct-api' | 'manual'
  provider?: string
  setupUrl?: string
  requiresAuth?: boolean
  estimatedTime: string
  description: string
}

interface DNSRecord {
  type: string
  name: string
  value: string
  priority?: number
  purpose: string
}

interface SmartDomainSetupProps {
  isOpen: boolean
  onClose: () => void
  onDomainAdded: (domain: any) => void
}

export function SmartDomainSetup({ isOpen, onClose, onDomainAdded }: SmartDomainSetupProps) {
  const [step, setStep] = useState<'input' | 'method-selection' | 'setup' | 'verification'>('input')
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [setupMethods, setSetupMethods] = useState<SetupMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState<SetupMethod | null>(null)
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([])
  const [verificationProgress, setVerificationProgress] = useState(0)
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('input')
      setDomain('')
      setSetupMethods([])
      setSelectedMethod(null)
      setDnsRecords([])
      setVerificationProgress(0)
    }
  }, [isOpen])

  const checkDomainSetupOptions = async () => {
    if (!domain) {
      toast.error('Please enter a domain')
      return
    }

    setLoading(true)
    try {
      // Check Domain Connect support
      const response = await fetch('/api/domain-connect/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })

      const result = await response.json()
      
      const methods: SetupMethod[] = []

      if (result.supported && result.method === 'domain-connect') {
        methods.push({
          type: 'domain-connect',
          provider: result.provider,
          setupUrl: result.setupUrl,
          estimatedTime: '30 seconds',
          description: `One-click setup with ${result.provider}. No manual DNS changes needed.`
        })
      }

      if (result.method === 'direct-api') {
        methods.push({
          type: 'direct-api',
          provider: result.provider,
          requiresAuth: result.requiresAuth,
          estimatedTime: '2 minutes',
          description: `Automated setup via ${result.provider} API. Requires authentication.`
        })
      }

      // Always offer manual setup as fallback
      methods.push({
        type: 'manual',
        estimatedTime: '5-10 minutes',
        description: 'Manual DNS record setup. Works with any DNS provider.'
      })

      setSetupMethods(methods)
      setStep('method-selection')

    } catch (error) {
      console.error('Error checking domain options:', error)
      toast.error('Failed to check domain setup options')
    } finally {
      setLoading(false)
    }
  }

  const startDomainSetup = async (method: SetupMethod) => {
    setSelectedMethod(method)
    setLoading(true)

    try {
      if (method.type === 'domain-connect') {
        // Open Domain Connect popup
        const popup = window.open(
          method.setupUrl,
          'domain-connect-setup',
          'width=800,height=600,scrollbars=yes,resizable=yes'
        )

        if (!popup) {
          toast.error('Please allow popups for Domain Connect setup')
          return
        }

        // Monitor popup for completion
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            // Wait for callback processing
            setTimeout(() => {
              checkVerificationStatus()
            }, 2000)
          }
        }, 1000)

        setStep('verification')
        startVerificationPolling()

      } else {
        // For API and manual methods, create domain and get DNS records
        const response = await fetch('/api/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            domain,
            verificationType: method.type === 'direct-api' ? 'api' : 'manual'
          })
        })

        const data = await response.json()

        if (response.ok) {
          setDnsRecords(Object.values(data.dnsRecords))
          setStep('setup')
          onDomainAdded(data.domain)
        } else {
          toast.error(data.error || 'Failed to add domain')
        }
      }

    } catch (error) {
      console.error('Error starting domain setup:', error)
      toast.error('Failed to start domain setup')
    } finally {
      setLoading(false)
    }
  }

  const startVerificationPolling = () => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setVerificationProgress(progress)
      
      if (progress >= 100) {
        clearInterval(interval)
        checkVerificationStatus()
      }
    }, 500)
  }

  const checkVerificationStatus = async () => {
    try {
      // Check if domain was successfully verified
      const response = await fetch(`/api/domains?domain=${domain}`)
      const data = await response.json()
      
      const domainRecord = data.domains?.find((d: any) => d.domain === domain)
      
      if (domainRecord?.status === 'verified') {
        toast.success('Domain verified successfully! 🎉')
        onDomainAdded(domainRecord)
        onClose()
      } else if (domainRecord?.status === 'failed') {
        toast.error('Domain verification failed. Please try manual setup.')
        // Show manual setup option
        setSelectedMethod({ 
          type: 'manual', 
          estimatedTime: '5-10 minutes',
          description: 'Manual DNS record setup required'
        })
        setStep('setup')
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
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

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'domain-connect':
        return <Zap className="h-5 w-5 text-blue-600" />
      case 'direct-api':
        return <Settings className="h-5 w-5 text-green-600" />
      case 'manual':
        return <Globe className="h-5 w-5 text-gray-600" />
      default:
        return null
    }
  }

  const getMethodBadge = (type: string) => {
    switch (type) {
      case 'domain-connect':
        return <Badge className="bg-blue-100 text-blue-700">Instant</Badge>
      case 'direct-api':
        return <Badge className="bg-green-100 text-green-700">Automated</Badge>
      case 'manual':
        return <Badge className="bg-gray-100 text-gray-700">Manual</Badge>
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'input' && 'Add Your Domain'}
            {step === 'method-selection' && 'Choose Setup Method'}
            {step === 'setup' && 'DNS Configuration'}
            {step === 'verification' && 'Verifying Domain'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Domain Input */}
        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="e.g., yourdomain.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && checkDomainSetupOptions()}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={checkDomainSetupOptions}
                disabled={loading || !domain}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking setup options...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Method Selection */}
        {step === 'method-selection' && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                We found {setupMethods.length} setup option{setupMethods.length > 1 ? 's' : ''} for <strong>{domain}</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {setupMethods.map((method, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    index === 0 ? 'ring-2 ring-blue-500 ring-opacity-20' : ''
                  }`}
                  onClick={() => startDomainSetup(method)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getMethodIcon(method.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {method.provider || 'Manual Setup'}
                            </span>
                            {getMethodBadge(method.type)}
                            {index === 0 && (
                              <Badge className="bg-yellow-100 text-yellow-700">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {method.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {method.estimatedTime}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="outline" onClick={() => setStep('input')}>
              Back
            </Button>
          </div>
        )}

        {/* Step 3: DNS Setup (Manual/API) */}
        {step === 'setup' && selectedMethod?.type !== 'domain-connect' && (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Add these DNS records to complete domain verification for <strong>{domain}</strong>
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
                onClick={() => {
                  setStep('verification')
                  startVerificationPolling()
                }}
                className="flex-1"
              >
                I've Added the Records
              </Button>
              <Button variant="outline" onClick={() => setStep('method-selection')}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Verification */}
        {step === 'verification' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Verifying {domain}</h3>
              <p className="text-gray-600 mt-1">
                {selectedMethod?.type === 'domain-connect' 
                  ? 'Processing Domain Connect setup...'
                  : 'Checking DNS propagation...'
                }
              </p>
            </div>

            <div className="w-full">
              <Progress value={verificationProgress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2">
                {verificationProgress}% complete
              </p>
            </div>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This usually takes 30 seconds to 2 minutes. DNS changes can take up to 24 hours to propagate globally.
              </AlertDescription>
            </Alert>

            <Button variant="outline" onClick={onClose}>
              Continue in Background
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
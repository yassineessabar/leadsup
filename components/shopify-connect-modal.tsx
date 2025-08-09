"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, ExternalLink } from "lucide-react"

interface ShopifyConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnected?: () => void
}

export function ShopifyConnectModal({ isOpen, onClose, onConnected }: ShopifyConnectModalProps) {
  const [shopDomain, setShopDomain] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState("")

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      setError("Please enter your shop domain")
      return
    }

    try {
      setIsConnecting(true)
      setError("")

      // Ensure domain has .myshopify.com
      let normalizedDomain = shopDomain.trim()
      if (!normalizedDomain.includes('.myshopify.com')) {
        normalizedDomain += '.myshopify.com'
      }

      // Call the Shopify auth API
      const response = await fetch('/api/integrations/shopify/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopDomain: normalizedDomain
        })
      })

      const result = await response.json()

      if (result.success) {
        // Redirect to Shopify OAuth
        window.location.href = result.authUrl
      } else {
        setError(result.error || 'Failed to connect to Shopify')
        setIsConnecting(false)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to connect to Shopify. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopDomain(e.target.value)
    if (error) setError("") // Clear error when user starts typing
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Connect Shopify Store</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="shopDomain" className="text-sm font-medium">
              Store Domain
            </Label>
            <div className="relative mt-1">
              <Input
                id="shopDomain"
                type="text"
                placeholder="your-store-name"
                value={shopDomain}
                onChange={handleInputChange}
                className="pr-32"
                disabled={isConnecting}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                .myshopify.com
              </div>
            </div>
            {error && (
              <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !shopDomain.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Connecting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Connect
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
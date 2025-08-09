"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RefreshCw, Unlink, CheckCircle, AlertTriangle, X } from "lucide-react"

interface ShopifyManageModalProps {
  isOpen: boolean
  onClose: () => void
  onDisconnect: () => void
  onSync: () => void
}

export function ShopifyManageModal({
  isOpen,
  onClose,
  onDisconnect,
  onSync
}: ShopifyManageModalProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleDisconnectClick = () => {
    setShowDisconnectConfirm(true)
  }

  const handleDisconnectConfirm = async () => {
    setIsDisconnecting(true)
    setShowDisconnectConfirm(false)
    try {
      await onDisconnect()
      setNotification({
        type: 'success',
        message: 'Shopify integration disconnected successfully'
      })
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to disconnect Shopify integration'
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await onSync()
      setNotification({
        type: 'success',
        message: 'Customer sync completed successfully'
      })
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to sync customers'
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const dismissNotification = () => {
    setNotification(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-0 shadow-lg">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-medium text-gray-900">
            Shopify Integration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notification */}
          {notification && (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              notification.type === 'success'
                ? 'bg-gray-50 border-gray-200 text-gray-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <p className="text-sm flex-1">{notification.message}</p>
              <Button
                onClick={dismissNotification}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <CheckCircle className="h-4 w-4 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Connected</p>
              <p className="text-xs text-gray-500">Integration is active</p>
            </div>
          </div>

          {/* Disconnect Confirmation */}
          {showDisconnectConfirm && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium text-red-800">Confirm Disconnect</p>
              </div>
              <p className="text-xs text-red-700 mb-3">
                Are you sure you want to disconnect your Shopify store? This will remove the integration.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleDisconnectConfirm}
                  disabled={isDisconnecting}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDisconnecting ? "Disconnecting..." : "Yes, Disconnect"}
                </Button>
                <Button
                  onClick={() => setShowDisconnectConfirm(false)}
                  variant="outline"
                  size="sm"
                  className="border-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!showDisconnectConfirm && (
            <div className="space-y-3">
              <Button
                onClick={handleSync}
                disabled={isSyncing || isDisconnecting}
                className="w-full flex items-center justify-center gap-2 h-11 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
              >
                {isSyncing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isSyncing ? "Syncing..." : "Sync Customers"}
              </Button>

              <Button
                onClick={handleDisconnectClick}
                disabled={isDisconnecting || isSyncing}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 h-11 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
              >
                <Unlink className="h-4 w-4" />
                Disconnect
              </Button>
            </div>
          )}

          {/* Close */}
          <div className="pt-2 border-t border-gray-100">
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

interface PaymentSuccessProps {
  onContinue?: () => void
}

export function PaymentSuccess({ onContinue }: PaymentSuccessProps) {
  const [isUpdating, setIsUpdating] = useState(true)

  useEffect(() => {
    // Update user subscription status
    const updateSubscription = async () => {
      try {
        const response = await fetch('/api/subscription/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'premium',
            planName: 'Professional'
          })
        })

        const result = await response.json()
        if (result.success) {
          toast({
            title: "Welcome to Professional!",
            description: "Your account has been upgraded successfully."
          })
        }
      } catch (error) {
        console.error("Error updating subscription:", error)
      } finally {
        setIsUpdating(false)
      }
    }

    updateSubscription()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e66465] to-[#9198e5] flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-white shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-gray-600">
              Congratulations! You've successfully upgraded to the
              <span className="font-semibold text-[#e66465]"> Professional Plan</span>.
            </p>
            {isUpdating && (
              <p className="text-sm text-gray-500">
                Updating your account...
              </p>
            )}
          </div>

          <div className="bg-gradient-to-r from-[#e66465] to-[#9198e5] p-4 rounded-lg text-white">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-5 h-5" />
              <span className="font-semibold">Premium Features Unlocked</span>
            </div>
            <ul className="text-sm space-y-1 opacity-90">
              <li>• Up to 500 reviews/month</li>
              <li>• Custom email templates</li>
              <li>• Priority support</li>
              <li>• Advanced analytics</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
              onClick={onContinue || (() => window.location.href = '/')}
              disabled={isUpdating}
            >
              Continue to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <p className="text-xs text-gray-500">
              A confirmation email has been sent to your inbox.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
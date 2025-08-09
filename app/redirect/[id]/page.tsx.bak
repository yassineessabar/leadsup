"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ExternalLink, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RedirectPage() {
  const params = useParams()
  const [countdown, setCountdown] = useState(5)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const redirectId = params.id as string

  // Company branding - this would typically come from your database based on the redirect ID
  const companyBranding = {
    name: "DECATHLON",
    logo: "/loop-logo.png",
    color: "#e66465",
    redirectUrl: "https://trustpilot.com/review/decathlon.com",
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRedirecting(true)
          // Redirect to the review platform
          window.location.href = companyBranding.redirectUrl
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [companyBranding.redirectUrl])

  const handleManualRedirect = () => {
    setIsRedirecting(true)
    window.location.href = companyBranding.redirectUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e66465]/10 to-[#9198e5]/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Company Logo */}
        <div className="w-20 h-20 mx-auto mb-6 bg-white rounded-xl shadow-sm flex items-center justify-center overflow-hidden">
          <img
            src={companyBranding.logo || "/placeholder.svg"}
            alt={`${companyBranding.name} Logo`}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Company Name */}
        <h1 className="text-3xl font-bold mb-4 tracking-wide" style={{ color: companyBranding.color }}>
          {companyBranding.name}
        </h1>

        {/* Thank You Message */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Thank You!</h2>
          <p className="text-gray-600 leading-relaxed">
            We appreciate your business and would love to hear about your experience. You'll be redirected to our review
            platform shortly.
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#e66465] to-[#9198e5] text-white px-4 py-2 rounded-full">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Manual Redirect Button */}
        <Button
          onClick={handleManualRedirect}
          disabled={isRedirecting}
          className="w-full bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white py-3 text-lg font-medium transition-all duration-200"
        >
          {isRedirecting ? (
            "Redirecting..."
          ) : (
            <>
              <ExternalLink className="w-5 h-5 mr-2" />
              Continue to Review Platform
            </>
          )}
        </Button>

        {/* Footer with Redirect ID */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">Redirect ID: {redirectId}</p>
          <p className="text-xs text-gray-400 mt-1">Powered by Loop Review Management</p>
        </div>
      </div>
    </div>
  )
}

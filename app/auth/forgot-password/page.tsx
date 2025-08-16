"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [resetUrl, setResetUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setMessage("Please enter your email")
      return
    }

    setIsLoading(true)
    setMessage("")
    setResetUrl("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message)
        
        // In development mode, show the reset link directly
        if (data.devToken) {
          const url = `${window.location.origin}/auth/reset-password?token=${data.devToken}`
          setResetUrl(url)
          setMessage("Development mode: Reset link generated below")
        }
      } else {
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch (error) {
      setMessage("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center">
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">LeadsUp</h1>
            <p className="text-gray-600">Reset your password</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <p className="text-gray-600 text-sm mb-6 text-center">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {message && (
              <div className={`mb-6 p-4 rounded-2xl ${
                message.includes("sent") || message.includes("Development") || message.includes("exists")
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}>
                <p className={`text-sm ${
                  message.includes("sent") || message.includes("Development") || message.includes("exists")
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  {message}
                </p>
              </div>
            )}

            {resetUrl && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <p className="text-sm text-blue-800 mb-2 font-medium">Development Reset Link:</p>
                <a 
                  href={resetUrl}
                  className="text-blue-600 underline break-all text-sm hover:text-blue-800"
                >
                  {resetUrl}
                </a>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
              />
              
              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-300"
              >
                {isLoading ? "Sending..." : "Send Reset Email"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <a href="/auth/login" className="text-blue-600 hover:text-blue-700 text-sm">
                Back to sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

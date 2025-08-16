"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  useEffect(() => {
    if (!token) {
      setMessage("Invalid or missing reset token")
      setIsValidToken(false)
      return
    }

    // Validate token on page load
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch("/api/auth/validate-reset-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (data.success) {
        setIsValidToken(true)
      } else {
        setMessage(data.error || "Invalid or expired reset token")
        setIsValidToken(false)
      }
    } catch (error) {
      setMessage("Error validating reset token")
      setIsValidToken(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage("Password reset successfully! Redirecting to login...")
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      } else {
        setMessage(data.error || "Failed to reset password")
      }
    } catch (error) {
      setMessage("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <main className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
            <div className="p-8 text-center">
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">LeadsUp</h1>
              <p className="text-gray-600">Validating reset token...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (isValidToken === false) {
    return (
      <main className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
            <div className="p-8 text-center">
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">LeadsUp</h1>
              <p className="text-gray-600 mb-4">Invalid Reset Link</p>
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
                <p className="text-red-600 text-sm">{message}</p>
              </div>
              <a href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 text-sm">
                Request a new reset link
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center">
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">LeadsUp</h1>
            <p className="text-gray-600">Set new password</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {message && (
              <div className={`mb-6 p-4 rounded-2xl ${
                message.includes("successfully") 
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}>
                <p className={`text-sm ${
                  message.includes("successfully") 
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  {message}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
              />
              
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
              />

              <Button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-300 mt-6"
              >
                {isLoading ? "Updating..." : "Update Password"}
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
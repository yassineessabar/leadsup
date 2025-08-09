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
        setIsValidToken(false)
        setMessage(data.error || "Invalid or expired reset token")
      }
    } catch (error) {
      setIsValidToken(false)
      setMessage("Error validating reset token")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password.trim()) {
      setMessage("Please enter a new password")
      return
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long")
      return
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
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
        setMessage("Password reset successful! Redirecting to login...")
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
      <main className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating reset token...</p>
        </div>
      </main>
    )
  }

  if (isValidToken === false) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-red-600">Invalid Token</h1>
            <p className="text-lg text-gray-600">{message}</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => router.push("/auth/forgot-password")}
              className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-full font-semibold text-lg"
            >
              Request New Reset Link
            </Button>
            <p className="text-center text-sm">
              <a href="/auth/login" className="underline text-[#8A2BE2] font-semibold">
                Back to log in
              </a>
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Reset Your Password</h1>
          <p className="text-lg text-gray-600">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
            disabled={isLoading}
            minLength={8}
          />

          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
            disabled={isLoading}
            minLength={8}
          />

          <Button
            type="submit"
            disabled={isLoading || !password.trim() || !confirmPassword.trim()}
            className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-full font-semibold text-lg disabled:bg-[#EAEAEA] disabled:text-[#A0A0A0] disabled:cursor-not-allowed"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        {message && (
          <p className={`text-sm ${message.includes("successful") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}

        <p className="text-center text-sm">
          <a href="/auth/login" className="underline text-[#8A2BE2] font-semibold">
            Back to log in
          </a>
        </p>
      </div>
    </main>
  )
}
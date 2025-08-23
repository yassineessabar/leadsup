"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validate password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      })

      if (!response.ok) {
        let errorMessage = "Registration failed"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error (${response.status})`
        }
        setError(errorMessage)
        return
      }

      const data = await response.json()

      if (data.success) {
        // Auto-login after successful registration
        const loginResponse = await fetch("/api/auth/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
          credentials: "include",
        })

        if (loginResponse.ok) {
          const loginData = await loginResponse.json()
          if (loginData.success) {
            localStorage.removeItem('auth_cache')
            sessionStorage.removeItem('auth_cache')
            setTimeout(() => {
              window.location.href = "/"
            }, 100)
          }
        } else {
          // Registration successful but auto-login failed
          window.location.href = "/auth/login"
        }
      } else {
        setError(data.error || "Registration failed")
      }
    } catch (err) {
      console.error("Registration error:", err)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError("")
    
    try {
      // TODO: Implement Google OAuth
      setError("Google signup coming soon")
    } catch (err) {
      setError("Failed to sign up with Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="text-2xl font-semibold text-gray-900">
              LeadsUp
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Sign up for LeadsUp
            </h1>
            <p className="text-gray-600">Start your journey with us.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-900 mb-2">
                Full Name
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-2xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-2xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleInputChange}
                className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-2xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>


            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-4 py-2 font-medium transition-colors h-11"
            >
              {loading ? "Creating account..." : "Sign up"}
            </Button>

            {/* Login Link */}
            <div>
              <p className="text-sm text-gray-600 text-center">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Log in
                </Link>
              </p>
            </div>

            {/* Terms */}
            <div>
              <p className="text-xs text-gray-500 text-center">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>
              </p>
            </div>
          </form>

          {/* Help Link */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Having issues with this page?</p>
            <a href="mailto:support@leadsup.io" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact us
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
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

    try {
      const response = await fetch("/api/auth/signin", {
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

      if (!response.ok) {
        let errorMessage = "Login failed"
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
        localStorage.removeItem('auth_cache')
        sessionStorage.removeItem('auth_cache')
        setTimeout(() => {
          window.location.href = "/"
        }, 100)
      } else {
        setError(data.error || "Login failed")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError("")
    
    try {
      // TODO: Implement Google OAuth
      setError("Google login coming soon")
    } catch (err) {
      setError("Failed to login with Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center">
              <img 
                src="https://framerusercontent.com/images/yar0HFd2Ii54LrLgUJ1sPLmjoS0.svg" 
                alt="LeadsUp Logo" 
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Log into LeadsUp
            </h1>
            <p className="text-gray-600">Welcome back.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

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
                value={formData.password}
                onChange={handleInputChange}
                className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-2xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Forgot Password Link */}
            <div>
              <p className="text-sm text-gray-600">
                Forgot your password?{" "}
                <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
                  Reset password
                </Link>
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-4 py-2 font-medium transition-colors h-11"
            >
              {loading ? "Signing in..." : "Log in"}
            </Button>

            {/* Signup Link */}
            <div>
              <p className="text-sm text-gray-600 text-center">
                Don't have an account yet?{" "}
                <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign up now
                </Link>
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
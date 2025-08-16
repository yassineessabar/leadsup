"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function Component() {
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
  return (
    <main className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center">
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">LeadsUp</h1>
            <p className="text-gray-600">Welcome back</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                />
              </div>
              
              <div>
                <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-300"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p>
                <a href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 text-sm">
                  Forgot password?
                </a>
              </p>
              <p className="text-gray-600 text-sm">
                Don&apos;t have an account?{" "}
                <a href="/auth/signup" className="text-blue-600 hover:text-blue-700">
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

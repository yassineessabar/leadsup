"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    company: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          company: formData.company,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        let errorMessage = "Signup failed"
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
        // Set flag to indicate user just signed up
        sessionStorage.setItem('just_signed_up', 'true')
        setTimeout(() => {
          window.location.href = "/?from=signup"
        }, 100)
      } else {
        setError(data.error || "Signup failed")
      }
    } catch (err) {
      console.error("Signup error:", err)
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
            <p className="text-gray-600">Create your account</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="firstName"
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                />
                <Input
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
                />
              </div>
              
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
              />

              <Input
                name="company"
                type="text"
                placeholder="Company"
                value={formData.company}
                onChange={handleInputChange}
                required
                className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
              />
              
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
              />

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3 font-medium transition-all duration-300 mt-6"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{" "}
                <a href="/auth/login" className="text-blue-600 hover:text-blue-700">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
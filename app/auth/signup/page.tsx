"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useI18n } from "@/hooks/use-i18n"
import { LanguageSelectorCompact } from "@/components/language-selector"

export default function SignupPage() {
  const { t } = useI18n()
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
      setError(t("auth.passwordMinLength"))
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: formData.fullName.split(' ')[0] || formData.fullName,
          last_name: formData.fullName.split(' ').slice(1).join(' ') || '',
          email: formData.email,
          password: formData.password,
        }),
      })

      if (!response.ok) {
        let errorMessage = t("auth.signupFailed")
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
            // Preserve language setting
            const savedLang = localStorage.getItem('i18nextLng') || 'en'
            setTimeout(() => {
              window.location.href = `/?lng=${savedLang}`
            }, 100)
          }
        } else {
          // Registration successful but auto-login failed
          const savedLang = localStorage.getItem('i18nextLng') || 'en'
          window.location.href = `/auth/login?lng=${savedLang}`
        }
      } else {
        setError(data.error || t("auth.signupFailed"))
      }
    } catch (err) {
      console.error("Registration error:", err)
      setError(t("auth.networkError"))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError("")
    
    try {
      // TODO: Implement Google OAuth
      setError(t("auth.googleSignupComingSoon"))
    } catch (err) {
      setError(t("auth.googleSignupFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Language Selector */}
          <div className="flex justify-end mb-4">
            <LanguageSelectorCompact />
          </div>

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
              {t("auth.signupTitle")}
            </h1>
            <p className="text-gray-600">{t("auth.signupSubtitle")}</p>
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
                {t("auth.fullName")}
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
                {t("auth.email")}
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
                {t("auth.password")}
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
              {loading ? t("auth.creatingAccount") : t("auth.signup")}
            </Button>

            {/* Login Link */}
            <div>
              <p className="text-sm text-gray-600 text-center">
                {t("auth.alreadyHaveAccount")}{" "}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  {t("auth.login")}
                </Link>
              </p>
            </div>

            {/* Terms */}
            <div>
              <p className="text-xs text-gray-500 text-center">
                {t("auth.bySigningUp")}{" "}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700">{t("auth.termsOfService")}</Link>
                {" "}{t("auth.and")}{" "}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700">{t("auth.privacyPolicy")}</Link>
              </p>
            </div>
          </form>

          {/* Help Link */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>{t("auth.havingIssues")}</p>
            <a href="mailto:support@leadsup.io" className="text-blue-600 hover:text-blue-700 font-medium">
              {t("auth.contactUs")}
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
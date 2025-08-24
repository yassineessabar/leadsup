"use client"

import { useState } from "react"
import { useTranslation, Trans } from 'react-i18next'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { LanguageSelectorCompact } from "@/components/language-selector"

export default function LoginPageI18n() {
  const { t } = useTranslation()
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
        let errorMessage = t('auth.loginFailed')
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
        // Preserve language setting
        const savedLang = localStorage.getItem('i18nextLng') || 'en'
        setTimeout(() => {
          window.location.href = `/?lng=${savedLang}`
        }, 100)
      } else {
        setError(data.error || t('auth.loginFailed'))
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(t('auth.networkError'))
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
              {t('auth.greeting')}
            </h1>
            <p className="text-gray-600">
              {t('auth.login')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                {t('auth.email')}
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-2xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                {t('auth.password')}
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-2xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-4 py-2 font-medium transition-colors h-11"
            >
              {loading ? t('common.loading') : t('auth.login')}
            </Button>
          </form>


          {/* Sign up link */}
          <p className="text-center mt-6 text-sm text-gray-600">
            {t('auth.dontHaveAccount')}{" "}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-500 font-medium">
              {t('auth.signup')}
            </Link>
          </p>

          {/* Example of Trans component for rich text */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <Trans i18nKey="common.copyright">
              © 2024 LeadsUp. All rights reserved.
            </Trans>
          </div>
        </div>
      </main>
    </div>
  )
}
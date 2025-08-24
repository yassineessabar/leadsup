"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useI18n } from "@/hooks/use-i18n"
import { LanguageSelectorCompact } from "@/components/language-selector"

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [resetUrl, setResetUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setMessage(t('auth.pleaseEnterEmail'))
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
          setMessage(t('auth.devModeMessage'))
        }
      } else {
        setMessage(data.error || t('auth.somethingWentWrong'))
      }
    } catch (error) {
      setMessage(t('auth.somethingWentWrong'))
    } finally {
      setIsLoading(false)
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
                alt={t('logo.leadsUp')} 
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {t('auth.resetPasswordTitle')}
            </h1>
            <p className="text-gray-600">{t('auth.resetPasswordSubtitle')}</p>
          </div>

          {/* Messages */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
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
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2 font-medium">{t('auth.devResetLink')}</p>
              <a 
                href={resetUrl}
                className="text-blue-600 underline break-all text-sm hover:text-blue-800"
              >
                {resetUrl}
              </a>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                {t('auth.email')}
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-2xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
              
            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-4 py-2 font-medium transition-colors h-11"
            >
              {isLoading ? t('auth.sending') : t('auth.sendResetEmail')}
            </Button>

            <div>
              <p className="text-sm text-gray-600 text-center">
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  {t('auth.backToSignIn')}
                </Link>
              </p>
            </div>
          </form>

          {/* Help Link */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>{t('auth.havingIssuesPage')}</p>
            <a href="mailto:support@leadsup.io" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('auth.contactUs')}
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

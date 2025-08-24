"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/hooks/use-i18n"
import { LanguageSelectorCompact } from "@/components/language-selector"

export default function ResetPasswordPage() {
  const { t } = useI18n()
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
      setMessage(t('auth.invalidResetToken'))
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
        setMessage(data.error || t('auth.invalidOrExpiredToken'))
        setIsValidToken(false)
      }
    } catch (error) {
      setMessage(t('auth.errorValidatingToken'))
      setIsValidToken(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setMessage(t('auth.passwordsDoNotMatch'))
      return
    }

    if (password.length < 8) {
      setMessage(t('auth.passwordMinLength'))
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
        setMessage(t('auth.passwordResetSuccess'))
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      } else {
        setMessage(data.error || t('auth.failedToResetPassword'))
      }
    } catch (error) {
      setMessage(t('auth.somethingWentWrong'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Language Selector */}
          <div className="flex justify-end mb-4">
            <LanguageSelectorCompact />
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
            <div className="p-8 text-center">
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">LeadsUp</h1>
              <p className="text-gray-600">{t('auth.validatingToken')}</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (isValidToken === false) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Language Selector */}
          <div className="flex justify-end mb-4">
            <LanguageSelectorCompact />
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
            <div className="p-8 text-center">
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">LeadsUp</h1>
              <p className="text-gray-600 mb-4">{t('auth.invalidResetLink')}</p>
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
                <p className="text-red-600 text-sm">{message}</p>
              </div>
              <a href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 text-sm">
                {t('auth.requestNewResetLink')}
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Language Selector */}
        <div className="flex justify-end mb-4">
          <LanguageSelectorCompact />
        </div>
        
        <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center">
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">LeadsUp</h1>
            <p className="text-gray-600">{t('auth.setNewPassword')}</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {message && (
              <div className={`mb-6 p-4 rounded-2xl ${
                message.includes("successfully") || message.includes("succès")
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}>
                <p className={`text-sm ${
                  message.includes("successfully") || message.includes("succès")
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
                placeholder={t('auth.newPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                className="h-12 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-blue-600"
              />
              
              <Input
                type="password"
                placeholder={t('auth.confirmNewPassword')}
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
                {isLoading ? t('auth.updating') : t('auth.updatePassword')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <a href="/auth/login" className="text-blue-600 hover:text-blue-700 text-sm">
                {t('auth.backToSignIn')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
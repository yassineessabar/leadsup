"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setMessage("Please enter your email or username")
      return
    }

    setIsLoading(true)
    setMessage("")

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
      } else {
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch (error) {
      setMessage("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Forgot password?</h1>
          <p className="text-lg text-gray-600">
            Enter your email or username and we&apos;ll send you an email to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Email or username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-full font-semibold text-lg disabled:bg-[#EAEAEA] disabled:text-[#A0A0A0] disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Send Reset Email"}
          </Button>
        </form>

        {message && (
          <p className={`text-sm ${message.includes("sent") ? "text-green-600" : "text-red-600"}`}>
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

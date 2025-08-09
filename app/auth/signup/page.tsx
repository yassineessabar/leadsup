"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronDown, Twitter, Youtube, Instagram, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"

// Custom Google Icon SVG
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_1_2)">
      <path
        d="M19.6094 10.2031C19.6094 9.53125 19.5547 8.90625 19.4453 8.28125H10V11.8438H15.4219C15.1875 13.0156 14.4219 14.0156 13.3281 14.6875V17.0156H16.3281C18.1094 15.3906 19.1094 12.9219 19.6094 10.2031Z"
        fill="#4285F4"
      />
      <path
        d="M10 20C12.75 20 15.1094 19.1094 16.9062 17.5L13.3281 14.6875C12.3281 15.3906 11.1094 15.8438 10 15.8438C7.60938 15.8438 5.60938 14.2031 4.90625 11.9062H1.79688V14.3281C2.59375 16.9219 5.01562 18.8438 7.89062 19.6094L10 20Z"
        fill="#34A853"
      />
      <path
        d="M4.90625 11.9062C4.71875 11.3125 4.60938 10.6719 4.60938 10C4.60938 9.32812 4.71875 8.6875 4.90625 8.09375V5.67188H1.79688C1.10938 7.01562 0.75 8.46875 0.75 10C0.75 11.5312 1.10938 12.9844 1.79688 14.3281L4.90625 11.9062Z"
        fill="#FBBC05"
      />
      <path
        d="M10 4.15625C11.3281 4.15625 12.5156 4.60938 13.4531 5.5L16.9062 2.5C15.1094 0.890625 12.75 0 10 0C7.25 0 4.89062 0.890625 3.09375 2.5L4.90625 5.67188C5.60938 3.79688 7.60938 2.15625 10 2.15625V4.15625Z"
        fill="#EA4335"
      />
    </g>
    <defs>
      <clipPath id="clip0_1_2">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

export default function SignupPage() {
  const { refetch } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    company: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validatePassword = (password: string) => {
    if (password.length < 1) return "Password is required"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Validate password
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    try {
      const signupData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: "",
        company: formData.company,
        title: "",
        phone: "",
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
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
        // Success message before redirect
        setSuccess("Account created successfully! Redirecting...")

        // Wait a bit longer for cookie to be set properly
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Refresh auth state to ensure the new session is recognized
        try {
          await refetch()
          // Additional wait to ensure auth state is updated
          await new Promise(resolve => setTimeout(resolve, 300))
          router.push("/")
        } catch (error) {
          console.error("Auth refetch failed:", error)
          // Still try to redirect to dashboard
          router.push("/")
        }
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

  const handleGoogleSignup = () => {
    // Add Google OAuth signup logic here
    }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Section: Signup Form */}
      <section className="relative flex flex-col w-full px-6 md:px-8 min-h-screen lg:w-[calc(100vw-52%)]">
        {/* Logo - Top Left */}
        <div className="absolute top-6 left-6">
          <Image
            src="https://framerusercontent.com/images/96F1neBJPzWDRLRENsy9e6kdROM.png?scale-down-to=512"
            alt="Loop Logo"
            width={150}
            height={150}
            className="object-contain"
          />
        </div>

        <div className="flex-1 flex flex-col justify-center w-full max-w-[480px] mx-auto">
          {/* Centered Title */}
          <div className="mb-8 text-center">
            <h1 className="text-black text-[32px] font-extrabold leading-tight tracking-[-1px] lg:text-4xl lg:tracking-[-2px] mb-4" style={{fontFamily: 'Switzer, "Switzer Placeholder", sans-serif'}}>Join Loop</h1>
            <p className="text-gray-600 text-lg" style={{fontFamily: 'Switzer, "Switzer Placeholder", sans-serif'}}>Sign up for free!</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="first_name"
              type="text"
              placeholder="First Name"
              value={formData.first_name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 rounded-xl border-none bg-[#F0F0F0] focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 rounded-xl border-none bg-[#F0F0F0] focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <Input
              name="company"
              type="text"
              placeholder="Company"
              value={formData.company}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 rounded-xl border-none bg-[#F0F0F0] focus:ring-2 focus:ring-black focus:border-transparent"
            />

            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 pr-12 rounded-xl border-none bg-[#F0F0F0] focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-full font-semibold text-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center leading-relaxed mt-4">
            By clicking Create account, you agree to Loop&apos;s{" "}
            <a href="#" className="underline text-gray-600">
              privacy notice
            </a>
            ,{" "}
            <a href="#" className="underline text-gray-600">
              T&Cs
            </a>{" "}
            and to receive offers, news and updates.
          </p>

          {/* <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-x-0 h-px bg-gray-200" />
            <span className="relative bg-white px-4 text-sm text-gray-500">OR</span>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleGoogleSignup}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-full border border-gray-300 text-gray-700 font-semibold text-lg bg-transparent hover:bg-gray-50"
            >
              <GoogleIcon />
              <span>Sign up with Google</span>
            </Button>
          </div> */}

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="underline text-[#8A2BE2] font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </section>

      {/* Right Section: Signup Image */}
      <section className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div className="w-full h-full relative">
          <Image
            src="/signup-section-image.png"
            alt="Loop Signup Illustration"
            fill
            className="object-cover"
            priority
          />
        </div>
      </section>

      {/* Cookie preferences link */}
      <footer className="absolute bottom-4 left-4 text-xs text-gray-500">
        <a href="#" className="underline">
          Cookie preferences
        </a>
      </footer>
    </main>
  )
}
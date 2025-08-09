"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Store, Globe, ArrowRight, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StoreTypePage() {
  const [selectedType, setSelectedType] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" })
        if (!response.ok) {
          router.push("/auth/login")
          return
        }
        const data = await response.json()
        if (!data.success || !data.user) {
          router.push("/auth/login")
          return
        }
      } catch {
        router.push("/auth/login")
        return
      } finally {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async () => {
    if (!selectedType) {
      setError("Please select a store type")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/store-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeType: selectedType }),
        credentials: "include",
      })

      if (!response.ok) {
        let errorMessage = "Failed to save store type"
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
        setSuccess("Store type saved! Redirecting to dashboard...")
        setTimeout(() => router.push("/?tab=customization"), 1000)
      } else {
        setError(data.error || "Failed to save store type")
      }
    } catch (err) {
      console.error("Store type error:", err)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#e66465] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  const storeTypes = [
    {
      id: "physical",
      title: "Physical Store",
      description: "I have a brick-and-mortar location where customers visit",
      icon: Store,
      features: ["In-store QR codes", "Location-based reviews", "Walk-in customer feedback"],
    },
    {
      id: "online",
      title: "Online Store",
      description: "I operate primarily through e-commerce or digital platforms",
      icon: Globe,
      features: ["Email review requests", "Post-purchase feedback", "Digital review management"],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#e66465]/5 to-[#9198e5]/5"></div>
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-[#e66465]/10 to-[#9198e5]/10 blur-xl"
            style={{
              width: `${150 + Math.random() * 100}px`,
              height: `${150 + Math.random() * 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, 30, -30, 0],
              y: [0, -30, 30, 0],
              scale: [1, 1.1, 0.9, 1],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-[#e66465] to-[#9198e5] rounded-lg flex items-center justify-center">
            <img src="/loop-logo.png" alt="Loop" className="w-8 h-8 object-contain" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#e66465] to-[#9198e5] bg-clip-text text-transparent">
            Loop
          </h1>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-4xl"
        >
          <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/60 shadow-xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900">What type of business do you have?</CardTitle>
              <p className="text-gray-600 mt-2">This helps us customize Loop for your specific needs</p>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {storeTypes.map((type) => (
                  <motion.div
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative cursor-pointer transition-all duration-300 ${
                      selectedType === type.id
                        ? "ring-2 ring-[#e66465] bg-gradient-to-br from-[#e66465]/5 to-[#9198e5]/5"
                        : "hover:shadow-lg"
                    }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <Card className="h-full border-0 shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-lg ${
                              selectedType === type.id
                                ? "bg-gradient-to-r from-[#e66465] to-[#9198e5] text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <type.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.title}</h3>
                            <p className="text-gray-600 text-sm mb-4">{type.description}</p>
                            <ul className="space-y-2">
                              {type.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-gray-500">
                                  <div className="w-1.5 h-1.5 bg-[#e66465] rounded-full"></div>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {selectedType === type.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute top-4 right-4"
                          >
                            <div className="w-6 h-6 bg-gradient-to-r from-[#e66465] to-[#9198e5] rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Error/Success Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6"
                  >
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-600">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6"
                  >
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600">{success}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Continue Button */}
              <Button
                onClick={handleSubmit}
                disabled={loading || !selectedType}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white transition-all duration-300 disabled:opacity-50 rounded-lg group"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up your dashboard...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    Continue to Dashboard
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, X, Send, User, MessageSquare, Minimize2, CheckCircle, Clock, AlertCircle, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useCompanyLogo } from "@/hooks/useCompanyLogo"

interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

interface FormStep {
  field: keyof FormData
  placeholder: string
  type: string
  question: string
  validation?: (value: string) => string | null
}

interface SupportChatbotProps {
  className?: string
}

export function SupportChatbot({ className }: SupportChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentInput, setCurrentInput] = useState("")
  const [step, setStep] = useState(0)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: ""
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { logoUrl } = useCompanyLogo()

  const validateEmail = (email: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address"
    }
    return null
  }

  const steps: FormStep[] = [
    {
      field: "name",
      placeholder: "Type your name...",
      type: "text",
      question: "What's your name?",
      validation: (value) => value.length < 2 ? "Name must be at least 2 characters" : null
    },
    {
      field: "email",
      placeholder: "Type your email...",
      type: "email",
      question: "What's your email address?",
      validation: validateEmail
    },
    {
      field: "subject",
      placeholder: "Type the subject...",
      type: "text",
      question: "What's the subject of your inquiry?",
      validation: (value) => value.length < 3 ? "Subject must be at least 3 characters" : null
    },
    {
      field: "message",
      placeholder: "Type your message...",
      type: "textarea",
      question: "Please tell me more about your issue. How can I help you?",
      validation: (value) => value.length < 10 ? "Message must be at least 10 characters" : null
    }
  ]

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev)
  }, [])

  const resetChat = useCallback(() => {
    setIsSubmitted(false)
    setFormData({ name: "", email: "", subject: "", message: "" })
    setCurrentInput("")
    setStep(0)
    setValidationError(null)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [step, formData, currentInput, isOpen, scrollToBottom])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized, step])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentInput.trim()) return

    const currentStep = steps[step]

    // Validate input
    if (currentStep.validation) {
      const error = currentStep.validation(currentInput.trim())
      if (error) {
        setValidationError(error)
        return
      }
    }

    setValidationError(null)

    const newFormData = { ...formData, [currentStep.field]: currentInput.trim() }
    setFormData(newFormData)
    setCurrentInput("")

    if (step === steps.length - 1) {
      setIsSubmitting(true)

      try {
        const response = await fetch('/api/support-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newFormData)
        })

        if (response.ok) {
          const result = await response.json()
          setIsSubmitted(true)
        } else {
          try {
            const errorData = await response.json()
            console.error('Failed to send email:', errorData)
            setValidationError(`Failed to send message: ${errorData.error || 'Please try again later'}`)
          } catch (parseError) {
            // Handle case where response is HTML instead of JSON
            console.error('Failed to parse error response as JSON:', parseError)
            setValidationError(`Failed to send message. Server returned status: ${response.status}`)
          }
        }
      } catch (error) {
        console.error('Error:', error)
        setValidationError('Network error. Please check your connection and try again.')
      } finally {
        setIsSubmitting(false)
      }
    } else {
      setStep(step + 1)
    }
  }

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value)
    if (validationError) {
      setValidationError(null)
    }
  }, [validationError])

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {!isOpen && (
        <Button
          onClick={handleToggle}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] shadow-lg hover:shadow-xl transition-all duration-300 relative group"
          aria-label="Open support chat"
        >
          <MessageCircle className="w-6 h-6 text-white" />

          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#e66465] to-[#9198e5] animate-ping opacity-20"></div>

          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Need help? Chat with us!
          </div>
        </Button>
      )}

      {isOpen && (
        <Card className={cn(
          "w-96 shadow-2xl border-0 flex flex-col transition-all duration-300",
          isMinimized ? "h-16" : "h-[500px]"
        )}>
          <CardHeader className="bg-gradient-to-r from-[#e66465] to-[#9198e5] text-white p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Support Team</CardTitle>
                  <CardDescription className="text-white/80 text-sm flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Online • Avg response: 2 min
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMinimize}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggle}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isMinimized && (
            <div className="flex-1 flex flex-col min-h-0">
              {!isSubmitted ? (
                <>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50/50">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e66465] to-[#9198e5] flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm border">
                        <p className="text-sm text-gray-700">
                          👋 Hi there! I'm here to help you get support. I'll need a few details to connect you with our team.
                        </p>
                      </div>
                    </div>

                    {Object.entries(formData).map(([key, value], index) => {
                      if (!value || index >= step) return null
                      const stepData = steps.find(s => s.field === key)
                      if (!stepData) return null

                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e66465] to-[#9198e5] flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm border">
                              <p className="text-sm text-gray-700">{stepData.question}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <div className="bg-gradient-to-r from-[#e66465] to-[#9198e5] text-white rounded-lg p-3 max-w-[80%] shadow-sm">
                              <p className="text-sm break-words">{value}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {logoUrl ? (
                                <img src={logoUrl} alt="User" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {step < steps.length && (
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e66465] to-[#9198e5] flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm border">
                          <p className="text-sm text-gray-700">{steps[step].question}</p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            Step {step + 1} of {steps.length}
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
                    {validationError && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700">{validationError}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                      {step < steps.length && steps[step].type === 'textarea' ? (
                        <textarea
                          ref={inputRef as any}
                          placeholder={steps[step].placeholder}
                          value={currentInput}
                          onChange={(e) => handleInputChange(e as any)}
                          required
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e66465] focus:border-transparent resize-none"
                          disabled={isSubmitting}
                        />
                      ) : (
                        <input
                          ref={inputRef}
                          placeholder={step < steps.length ? steps[step].placeholder : "All done! Press send to submit..."}
                          value={currentInput}
                          onChange={handleInputChange}
                          type={step < steps.length ? steps[step].type : "text"}
                          required
                          className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e66465] focus:border-transparent"
                          disabled={isSubmitting}
                        />
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {isSubmitting && (
                            <>
                              <div className="w-3 h-3 border-2 border-gray-300 border-t-[#e66465] rounded-full animate-spin" />
                              <span>Sending...</span>
                            </>
                          )}
                        </div>

                        <Button
                          type="submit"
                          size="sm"
                          disabled={isSubmitting || !currentInput.trim()}
                          className="bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white px-4 shadow-md"
                        >
                          {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              {step === steps.length - 1 ? "Send" : "Next"}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
              </>
              ) : (
                <div className="p-6 h-full flex flex-col items-center justify-center text-center bg-gradient-to-b from-green-50 to-white">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Message Sent Successfully! ✨
                  </h3>
                  <p className="text-gray-600 mb-2 leading-relaxed">
                    Thanks for reaching out! Our support team has received your message and will respond within 24 hours.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    We'll send updates to <strong>{formData.email}</strong>
                  </p>
                  <div className="space-y-3 w-full max-w-xs">
                    <Button
                      onClick={resetChat}
                      className="w-full bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white shadow-md"
                    >
                      Send Another Message
                    </Button>
                    <Button
                      onClick={handleToggle}
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Close Chat
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
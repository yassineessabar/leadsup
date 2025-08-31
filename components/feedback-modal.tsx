"use client"

import { useState, useEffect } from "react"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Heart, Send } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
}

export function FeedbackModal({ isOpen, onClose, userEmail }: FeedbackModalProps) {
  
  const [feedbackForm, setFeedbackForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)

  // Auto-fill user email when modal opens
  useEffect(() => {
    if (isOpen && userEmail && !feedbackForm.email) {
      setFeedbackForm(prev => ({
        ...prev,
        email: userEmail
      }))
    }
  }, [isOpen, userEmail])

  const handleFeedbackSubmit = async () => {
    if (!feedbackForm.name.trim() || !feedbackForm.email.trim() || !feedbackForm.message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (name, email, and message)",
        variant: "destructive"
      })
      return
    }

    setFeedbackSubmitting(true)
    
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(feedbackForm),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Feedback Sent!",
          description: "Thank you for your feedback. We'll get back to you soon!"
        })
        
        // Reset form and close modal
        setFeedbackForm({
          name: "",
          email: "",
          subject: "",
          message: ""
        })
        onClose()
      } else {
        throw new Error(result.error || "Failed to send feedback")
      }
    } catch (error) {
      console.error("Error sending feedback:", error)
      toast({
        title: "Failed to Send",
        description: "Unable to send feedback. Please try again later.",
        variant: "destructive"
      })
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-0 overflow-hidden max-w-[500px] w-full mx-4 shadow-xl">
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Leave Feedback
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We'd love to hear your thoughts and suggestions!
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Name *
              </Label>
              <Input
                id="feedback-name"
                placeholder="Your name"
                value={feedbackForm.name}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email *
              </Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder="your@email.com"
                value={feedbackForm.email}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, email: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="feedback-subject" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Subject
            </Label>
            <Input
              id="feedback-subject"
              placeholder="Brief subject line (optional)"
              value={feedbackForm.subject}
              onChange={(e) => setFeedbackForm(prev => ({ ...prev, subject: e.target.value }))}
              className="rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="feedback-message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Message *
            </Label>
            <Textarea
              id="feedback-message"
              placeholder="Tell us about your experience, feature requests, bugs, or any other feedback..."
              value={feedbackForm.message}
              onChange={(e) => setFeedbackForm(prev => ({ ...prev, message: e.target.value }))}
              className="rounded-xl min-h-[120px] resize-none"
              rows={5}
            />
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={feedbackSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleFeedbackSubmit}
            disabled={feedbackSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            {feedbackSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Feedback
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
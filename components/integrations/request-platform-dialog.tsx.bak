"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import { useState } from "react"

export function RequestPlatformDialog({ children }: { children: React.ReactNode }) {
  const [platformRequest, setPlatformRequest] = useState("")
  const [open, setOpen] = useState(false)

  const handleRequest = () => {
    // Here you would typically send the request to a backend
    setPlatformRequest("") // Clear input
    setOpen(false) // Close dialog
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900">
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-bold text-center">Request a platform</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="mt-4">
          <Textarea
            placeholder="Which review platform would you like us to integrate with?"
            className="min-h-[120px] resize-y"
            value={platformRequest}
            onChange={(e) => setPlatformRequest(e.target.value)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-full px-6 py-3 text-base font-semibold bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full bg-gray-200 px-6 py-3 text-base font-semibold text-gray-600 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            onClick={handleRequest}
            disabled={!platformRequest.trim()}
          >
            Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
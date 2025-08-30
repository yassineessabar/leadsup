"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Crown } from "lucide-react"

export function UpgradeProDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Unlock all features and get unlimited access to our lead management platform.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Pro Features:</h4>
            <ul className="text-sm text-muted-foreground dark:text-gray-400 space-y-1">
              <li>• Unlimited leads</li>
              <li>• Advanced analytics</li>
              <li>• Priority support</li>
              <li>• Custom integrations</li>
              <li>• Team collaboration</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end">
          <Button className="w-full">
            Upgrade Now - $79/month
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
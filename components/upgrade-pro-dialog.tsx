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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Unlock all features and get unlimited access to our lead management platform.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <h4 className="font-medium">Pro Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
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
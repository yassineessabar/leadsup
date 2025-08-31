"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Clock, Crown, AlertTriangle } from "lucide-react"
import { useTrial, formatTrialEndDate } from "@/hooks/use-trial"

interface TrialBannerProps {
  userInfo: any
  onUpgradeClick?: () => void
}

export function TrialBanner({ userInfo, onUpgradeClick }: TrialBannerProps) {
  const trial = useTrial(userInfo)

  if (!trial.isInTrial) {
    return null
  }

  const getBannerStyle = () => {
    if (trial.isTrialExpired) {
      return "border-red-200 bg-red-50"
    } else if (trial.isTrialEndingSoon) {
      return "border-amber-200 bg-amber-50"
    } else {
      return "border-blue-200 bg-blue-50"
    }
  }

  const getIcon = () => {
    if (trial.isTrialExpired) {
      return <AlertTriangle className="h-5 w-5 text-red-600" />
    } else if (trial.isTrialEndingSoon) {
      return <Clock className="h-5 w-5 text-amber-600" />
    } else {
      return <Crown className="h-5 w-5 text-blue-600" />
    }
  }

  const getMessage = () => {
    if (trial.isTrialExpired) {
      return {
        title: "Trial Expired",
        description: "Your 7-day free trial has ended. Upgrade now to continue using all features."
      }
    } else if (trial.isTrialEndingSoon) {
      return {
        title: `${trial.daysLeft} Day${trial.daysLeft === 1 ? '' : 's'} Left!`,
        description: `Your trial ends on ${formatTrialEndDate(trial.trialEndDate!)}. Upgrade now to avoid interruption.`
      }
    } else {
      return {
        title: `Free Trial - ${trial.daysLeft} Days Remaining`,
        description: `Enjoying Loop? Your trial ends on ${formatTrialEndDate(trial.trialEndDate!)}. Upgrade anytime!`
      }
    }
  }

  const message = getMessage()

  return (
    <Card className={`p-4 mb-6 ${getBannerStyle()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <div>
            <h3 className="font-semibold text-gray-900">{message.title}</h3>
            <p className="text-sm text-gray-600">{message.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Progress indicator for active trials */}
          {!trial.isTrialExpired && (
            <div className="hidden sm:flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    trial.isTrialEndingSoon ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.max(10, 100 - (trial.daysLeft / 7) * 100)}%`
                  }}
                ></div>
              </div>
              <span className="text-xs text-gray-500">
                {Math.round(100 - (trial.daysLeft / 7) * 100)}%
              </span>
            </div>
          )}

          {/* Hide Choose Plan button since user already has Pro subscription */}
          {false && (
            <Button
              onClick={onUpgradeClick}
              size="sm"
              className={
                trial.isTrialExpired
                  ? "bg-red-600 hover:bg-red-700"
                  : trial.isTrialEndingSoon
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            >
              {trial.isTrialExpired ? "Upgrade Now" : "Choose Plan"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

// Compact version for sidebar/header
export function TrialIndicator({ userInfo }: { userInfo: any }) {
  const trial = useTrial(userInfo)

  if (!trial.isInTrial) {
    return null
  }

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      trial.isTrialExpired
        ? "bg-red-100 text-red-800"
        : trial.isTrialEndingSoon
        ? "bg-amber-100 text-amber-800"
        : "bg-blue-100 text-blue-800"
    }`}>
      <Crown className="h-3 w-3 mr-1" />
      {trial.isTrialExpired ? "Trial Expired" : `${trial.daysLeft}d left`}
    </div>
  )
}
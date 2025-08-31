import { useState, useEffect } from 'react'

interface TrialInfo {
  isInTrial: boolean
  trialEndDate: Date | null
  daysLeft: number
  isTrialExpired: boolean
  isTrialEndingSoon: boolean // Less than 2 days left
}

export function useTrial(userInfo: any): TrialInfo {
  const [trialInfo, setTrialInfo] = useState<TrialInfo>({
    isInTrial: false,
    trialEndDate: null,
    daysLeft: 0,
    isTrialExpired: false,
    isTrialEndingSoon: false
  })

  useEffect(() => {
    if (!userInfo) {
      setTrialInfo({
        isInTrial: false,
        trialEndDate: null,
        daysLeft: 0,
        isTrialExpired: false,
        isTrialEndingSoon: false
      })
      return
    }

    const now = new Date()
    const trialEndDate = userInfo.trial_end_date ? new Date(userInfo.trial_end_date) : null
    const subscriptionStatus = userInfo.subscription_status

    if (trialEndDate && subscriptionStatus === 'trialing' && userInfo.subscription_type !== 'free') {
      const timeDiff = trialEndDate.getTime() - now.getTime()
      const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

      setTrialInfo({
        isInTrial: true,
        trialEndDate,
        daysLeft: Math.max(0, daysLeft),
        isTrialExpired: daysLeft <= 0,
        isTrialEndingSoon: daysLeft <= 2 && daysLeft > 0
      })
    } else {
      setTrialInfo({
        isInTrial: false,
        trialEndDate,
        daysLeft: 0,
        isTrialExpired: false,
        isTrialEndingSoon: false
      })
    }
  }, [userInfo])

  return trialInfo
}

// Utility function to format trial end date
export function formatTrialEndDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Utility function to get trial progress percentage
export function getTrialProgress(trialStartDate: Date, trialEndDate: Date): number {
  const now = new Date()
  const totalTrialTime = trialEndDate.getTime() - trialStartDate.getTime()
  const timeElapsed = now.getTime() - trialStartDate.getTime()

  return Math.min(100, Math.max(0, (timeElapsed / totalTrialTime) * 100))
}
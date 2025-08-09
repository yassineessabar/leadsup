// Trial management utilities
export interface TrialStatus {
  isInTrial: boolean
  trialStartDate: Date | null
  trialEndDate: Date | null
  daysLeft: number
  isTrialExpired: boolean
  isTrialEndingSoon: boolean
  subscriptionStatus: string
  subscriptionType: string
}

// Calculate trial status from user data
export function calculateTrialStatus(user: any): TrialStatus {
  const now = new Date()
  const trialStartDate = user.trial_start_date ? new Date(user.trial_start_date) : null
  const trialEndDate = user.trial_end_date ? new Date(user.trial_end_date) : null
  const subscriptionStatus = user.subscription_status || 'free'
  const subscriptionType = user.subscription_type || 'free'

  const isInTrial = subscriptionStatus === 'trialing'

  let daysLeft = 0
  let isTrialExpired = false
  let isTrialEndingSoon = false

  if (trialEndDate && isInTrial) {
    const timeDiff = trialEndDate.getTime() - now.getTime()
    daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
    isTrialExpired = daysLeft <= 0
    isTrialEndingSoon = daysLeft <= 2 && daysLeft > 0
  }

  return {
    isInTrial,
    trialStartDate,
    trialEndDate,
    daysLeft: Math.max(0, daysLeft),
    isTrialExpired,
    isTrialEndingSoon,
    subscriptionStatus,
    subscriptionType
  }
}

// Check if user has access to premium features
export function hasTrialOrPaidAccess(trialStatus: TrialStatus): boolean {
  const { isInTrial, isTrialExpired, subscriptionStatus } = trialStatus

  // User has access if:
  // 1. They're in an active trial (not expired)
  // 2. They have an active paid subscription
  return (isInTrial && !isTrialExpired) ||
         ['active', 'past_due'].includes(subscriptionStatus)
}

// Get appropriate upgrade message based on trial status
export function getUpgradeMessage(trialStatus: TrialStatus): string {
  const { isInTrial, isTrialExpired, isTrialEndingSoon, daysLeft } = trialStatus

  if (isTrialExpired) {
    return "Your 7-day free trial has ended. Upgrade now to continue using all features."
  } else if (isTrialEndingSoon) {
    return `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade now to avoid interruption.`
  } else if (isInTrial) {
    return `You have ${daysLeft} days left in your free trial. Upgrade anytime!`
  } else {
    return "Start your 7-day free trial today!"
  }
}

// Format trial progress as percentage
export function getTrialProgressPercentage(trialStatus: TrialStatus): number {
  const { trialStartDate, trialEndDate } = trialStatus

  if (!trialStartDate || !trialEndDate) return 0

  const now = new Date()
  const totalTrialTime = trialEndDate.getTime() - trialStartDate.getTime()
  const timeElapsed = now.getTime() - trialStartDate.getTime()

  return Math.min(100, Math.max(0, (timeElapsed / totalTrialTime) * 100))
}

// Trial feature access control
export function canAccessFeature(trialStatus: TrialStatus, feature: string): boolean {
  // Define which features are available during trial/paid plans
  const trialFeatures = [
    'basic_analytics',
    'custom_review_page',
    'email_collection',
    'sms_collection',
    'basic_integrations'
  ]

  const proFeatures = [
    ...trialFeatures,
    'advanced_analytics',
    'csv_export',
    'whatsapp_integration',
    'multi_channel_followups',
    'dynamic_routing'
  ]

  const enterpriseFeatures = [
    ...proFeatures,
    'qr_code_reviews',
    'ai_responses',
    'automated_responses',
    'ai_suggestions',
    'custom_integrations'
  ]

  // During trial, users get access to their selected plan's features
  const hasAccess = hasTrialOrPaidAccess(trialStatus)
  if (!hasAccess) return false

  const { subscriptionType } = trialStatus

  switch (subscriptionType) {
    case 'basic':
      return trialFeatures.includes(feature)
    case 'pro':
      return proFeatures.includes(feature)
    case 'enterprise':
      return enterpriseFeatures.includes(feature)
    default:
      return trialFeatures.includes(feature)
  }
}

// Email templates for trial notifications
export const trialEmailTemplates = {
  trialStarted: (userEmail: string, planName: string) => ({
    to: userEmail,
    subject: "Welcome to your 7-day Loop trial!",
    html: `
      <h2>Your ${planName} trial has started!</h2>
      <p>You now have access to all ${planName} features for 7 days.</p>
      <p>No payment required until your trial ends.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard">Start using Loop →</a>
    `
  }),

  trialEnding: (userEmail: string, daysLeft: number, planName: string) => ({
    to: userEmail,
    subject: `Your Loop trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html: `
      <h2>Your ${planName} trial is ending soon</h2>
      <p>You have ${daysLeft} day${daysLeft === 1 ? '' : 's'} left to enjoy all premium features.</p>
      <p>Upgrade now to continue without interruption.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/upgrade">Upgrade Now →</a>
    `
  }),

  trialExpired: (userEmail: string, planName: string) => ({
    to: userEmail,
    subject: "Your Loop trial has ended",
    html: `
      <h2>Your ${planName} trial has ended</h2>
      <p>Thank you for trying Loop! Your account has been moved to the free plan.</p>
      <p>Upgrade anytime to regain access to premium features.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/upgrade">Upgrade Now →</a>
    `
  })
}
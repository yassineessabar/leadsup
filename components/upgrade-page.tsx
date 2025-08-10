"use client"

import { useState, useEffect } from "react"
import { Check, Star, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { TrialBanner } from "@/components/trial-banner"

interface UpgradePageProps {
  onTabChange?: (tab: string) => void
}

export function UpgradePage({ onTabChange }: UpgradePageProps = {}) {
  const [isYearly, setIsYearly] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<{
    email?: string;
    id?: string;
    subscription_type?: string;
    subscription_status?: string;
    trial_end_date?: string;
    trial_start_date?: string;
  }>({})

  // Fetch user information for payment links
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user) {
            setUserInfo({
              email: data.user.email,
              id: data.user.id,
              subscription_type: data.user.subscription_type,
              subscription_status: data.user.subscription_status,
              trial_end_date: data.user.trial_end_date,
              trial_start_date: data.user.trial_start_date,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching user info:", error)
      }
    }
    fetchUserInfo()
  }, [])

  // Handle upgrade button clicks
  const handleUpgrade = async (planName: string) => {
    if (isLoading) return

    setIsLoading(true)

    try {
      // Payment links for both monthly and yearly billing
      const paymentLinks = {
        basic: {
          monthly: "https://buy.stripe.com/dRm6oJ1O8cZh1Zr1zjf3a09",
          yearly: "https://buy.stripe.com/00waEZ1O88J1eMddi1f3a08"
        },
        pro: {
          monthly: "https://buy.stripe.com/cNibJ31O86AT9rTb9Tf3a07",
          yearly: "https://buy.stripe.com/5kQ00l50k9N57jLdi1f3a06"
        },
        enterprise: {
          monthly: "https://buy.stripe.com/cNidRb9gAbVdcE5cdXf3a05",
          yearly: "https://buy.stripe.com/00wfZjeAU9N533vdi1f3a04"
        }
      }

      const planKey = planName.toLowerCase() as keyof typeof paymentLinks
      const billingCycle = isYearly ? 'yearly' : 'monthly'
      const paymentLink = paymentLinks[planKey]?.[billingCycle]

      if (!paymentLink) {
        throw new Error("Invalid plan selected")
      }

      // Add user metadata to payment link
      const url = new URL(paymentLink)
      if (userInfo.email) {
        url.searchParams.set("prefilled_email", userInfo.email)
      }
      if (userInfo.id) {
        url.searchParams.set("client_reference_id", userInfo.id)
      }

      // Redirect to Stripe payment page
      window.location.href = url.toString()

    } catch (error) {
      console.error("Error initiating upgrade:", error)
      toast({
        title: "Error",
        description: "Failed to initiate upgrade. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const plans = [
    {
      name: "Basic",
      description: "Perfect for small teams and startups.",
      price: 39,
      yearlyPrice: 29,
      buttonText: "Start 7-day free trial",
      buttonVariant: "outline" as const,
      features: [
        "Multi-channel collection (SMS, Email)",
        "Custom review page",
        "Choice of action for each review",
        "Basic analytics dashboard",
        "Email support",
      ],
      highlighted: false,
    },
    {
      name: "Pro",
      description: "Ideal for growing teams and projects.",
      price: 79,
      yearlyPrice: 69,
      buttonText: "Start 7-day free trial",
      buttonVariant: "default" as const,
      features: [
        "Everything in Basic +",
        "CSV import & export",
        "WhatsApp integration",
        "Multi-channel follow-ups",
        "Dynamic routing of reviews",
        "Advanced analytics",
        "Priority support",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      description: "Built for large organization needs.",
      price: 180,
      yearlyPrice: 160,
      buttonText: "Start 7-day free trial",
      buttonVariant: "default" as const,
      features: [
        "Everything in Pro +",
        "Checkout & in-store QR code reviews",
        "AI responses to Google reviews",
        "Automated Trustpilot responses",
        "AI suggestions for negative reviews",
        "Monthly strategic review with success manager",
        "Custom integrations",
        "24/7 phone support",
      ],
      highlighted: false,
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => onTabChange?.("settings")}
            className="text-gray-600 hover:text-gray-900 p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-lg font-semibold hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Upgrade
          </Button>
        </div>
      </div>

      {/* Trial Banner */}
      <TrialBanner userInfo={userInfo} />

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
          Billed Monthly
        </span>
        <Switch
          checked={isYearly}
          onCheckedChange={setIsYearly}
          className="data-[state=checked]:bg-violet-600"
        />
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            Billed yearly
          </span>
          {isYearly && (
            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Save 20%
            </div>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <Card
            key={plan.name}
            className={`relative rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
              plan.highlighted
                ? "ring-2 ring-violet-500 scale-[1.02]"
                : "border-gray-200"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-violet-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  Most Popular
                </div>
              </div>
            )}

            <CardContent className="p-6 space-y-4">
              {/* Plan Info */}
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ${isYearly ? plan.yearlyPrice : plan.price}
                  </span>
                  <span className="text-gray-600 text-sm">per member / month</span>
                </div>

                <p className="text-gray-500 text-xs">
                  {isYearly ? "Billed annually" : "Billed monthly"}
                </p>

                {/* Trial indicator */}
                <div className="border rounded-lg p-2 mt-3" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', borderColor: 'rgba(87, 140, 255, 0.3)' }}>
                  <p className="font-medium text-xs" style={{ color: 'rgb(87, 140, 255)' }}>
                    🎉 7-day free trial included
                  </p>
                  <p className="text-xs" style={{ color: 'rgb(87, 140, 255)' }}>
                    No payment required to start
                  </p>
                </div>

                {isYearly && (
                  <p className="text-green-600 font-medium text-xs mt-1">
                    Save ${(plan.price - plan.yearlyPrice) * 12}/year
                  </p>
                )}
              </div>

              {/* Button */}
              <Button
                onClick={() => handleUpgrade(plan.name)}
                disabled={isLoading || userInfo.subscription_type === plan.name.toLowerCase()}
                className={`w-full ${
                  plan.buttonVariant === "default"
                    ? "bg-violet-600 hover:bg-violet-700 text-white disabled:bg-gray-400"
                    : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 disabled:bg-gray-100"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : userInfo.subscription_type === plan.name.toLowerCase() ? (
                  "Current Plan"
                ) : (
                  plan.buttonText
                )}
              </Button>

              {/* Features */}
              <div className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enterprise CTA */}
      <div className="mt-8">
        <Card className="bg-gray-50 border-gray-200 rounded-xl">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Need a custom solution?</h3>
              <p className="text-gray-600 text-sm">
                Contact our sales team for custom Enterprise pricing and features.
              </p>
            </div>
            <Button
              className="mt-4 md:mt-0 bg-violet-600 hover:bg-violet-700 text-white"
            >
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Check, Star, ArrowLeft, Sparkles, Shield, Zap, CreditCard, Users, TrendingUp, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
      icon: Users,
      popular: false,
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
      icon: TrendingUp,
      popular: true,
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
      icon: Crown,
      popular: false,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => {
              if (onTabChange) {
                onTabChange("settings")
              } else {
                window.history.back()
              }
            }}
            className="text-gray-600 hover:text-gray-900 p-2 h-auto"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Upgrade Plans</h1>
            <p className="text-gray-600">Choose the perfect plan for your team's growth</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Trial Banner */}
        <div className="mb-8">
          <TrialBanner userInfo={userInfo} />
        </div>

        {/* Features Overview */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl p-8 mb-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100/50 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-gray-600" />
              </div>
              <h2 className="text-2xl font-light text-gray-900">Why Upgrade?</h2>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Unlock powerful features designed to help you collect more reviews, gain valuable insights, and grow your business faster.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100/50">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-sm text-gray-600">Enterprise-grade security with 99.9% uptime guarantee</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100/50">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Proven Results</h3>
              <p className="text-sm text-gray-600">Customers see 3x more reviews within 30 days</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100/50">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Expert Support</h3>
              <p className="text-sm text-gray-600">Dedicated success manager and 24/7 support</p>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-gray-900"
          />
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
            </span>
            {isYearly && (
              <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">
                Save 20%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative bg-white/80 backdrop-blur-xl border rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                plan.highlighted
                  ? "border-gray-200/50 shadow-2xl ring-2 ring-gray-100/50"
                  : "border-gray-100/20 shadow-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-lg">
                    <Star className="w-3 h-3 fill-white" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8 space-y-6">
                {/* Plan Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100/50 flex items-center justify-center">
                      <plan.icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-light text-gray-900">{plan.name}</h3>
                      <p className="text-gray-600 text-sm">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-4xl font-light text-gray-900">
                        ${isYearly ? plan.yearlyPrice : plan.price}
                      </span>
                      <span className="text-gray-500 text-sm">per member / month</span>
                    </div>

                    <p className="text-gray-400 text-xs mb-4">
                      {isYearly ? "Billed annually" : "Billed monthly"}
                    </p>

                    {/* Trial indicator */}
                    <div className="bg-gray-50/50 border border-gray-100/50 rounded-2xl p-4 mb-4">
                      <p className="font-medium text-xs text-gray-700 mb-1">
                        🎉 7-day free trial included
                      </p>
                      <p className="text-xs text-gray-500">
                        No payment required to start
                      </p>
                    </div>

                    {isYearly && (
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Badge className="bg-gray-100 text-gray-700 text-xs">
                          Save ${(plan.price - plan.yearlyPrice) * 12}/year
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Button */}
                <Button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={isLoading || userInfo.subscription_type === plan.name.toLowerCase()}
                  className={`w-full h-12 text-base font-medium rounded-2xl transition-all duration-200 hover:scale-105 ${
                    plan.buttonVariant === "default"
                      ? "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                      : "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 disabled:bg-gray-100"
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
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Check className="w-5 h-5 text-gray-600" />
                    What's included
                  </h4>
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-12">
          <div className="relative bg-gradient-to-br from-gray-50 to-white border border-gray-100/50 rounded-3xl p-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100/30 to-transparent rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100/50 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-light text-gray-900">Need a custom solution?</h3>
                      <p className="text-gray-600">Perfect for enterprise organizations</p>
                    </div>
                  </div>
                  <p className="text-gray-600 max-w-md">
                    Contact our sales team for custom Enterprise pricing, dedicated support, and tailored features for your organization.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    className="h-12 px-6 rounded-2xl font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Schedule Demo
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 rounded-2xl font-medium transition-all duration-200 hover:scale-105"
                  >
                    Contact Sales
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
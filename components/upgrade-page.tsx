"use client"

import { useState, useEffect } from "react"
import { Check, Star, ArrowLeft, Sparkles, Shield, Zap, CreditCard, Users, TrendingUp, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { TrialBanner } from "@/components/trial-banner"
import { useI18n } from "@/hooks/use-i18n"

interface UpgradePageProps {
  onTabChange?: (tab: string) => void
}

export function UpgradePage({ onTabChange }: UpgradePageProps = {}) {
  const { t } = useI18n()
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

  // Debug logging to see current userInfo state
  useEffect(() => {
    console.log('🎯 UPGRADE PAGE userInfo updated:', userInfo)
  }, [userInfo])

  // Handle upgrade button clicks
  const handleUpgrade = async (planName: string) => {
    if (isLoading) return

    setIsLoading(true)

    try {
      // Payment links for both monthly and yearly billing
      // TEMPORARILY USING TEST MODE for development and testing
      const paymentLinks = {
        basic: {
          monthly: "https://buy.stripe.com/test_dRmbJ38cw9N55bDem5f3a02", // Basic monthly
          yearly: "https://buy.stripe.com/test_8x26oJeAU5wP1Zr91Lf3a03"   // Basic yearly
        },
        pro: {
          monthly: "https://buy.stripe.com/test_cNidRb9gAbVdcE5cdXf3a05", // Pro monthly
          yearly: "https://buy.stripe.com/test_5kQ00l50k9N57jLdi1f3a06"   // Pro yearly
        },
        enterprise: {
          monthly: "https://buy.stripe.com/test_cNibJ31O86AT9rTb9Tf3a07", // Enterprise monthly
          yearly: "https://buy.stripe.com/test_00waEZ1O88J1eMddi1f3a08"   // Enterprise yearly
        }
      }
      
      /* LIVE PAYMENT LINKS - Commented out for testing
      const paymentLinks = {
        basic: {
          monthly: "https://buy.stripe.com/dRm28t50k3oHgUl91Lf3a0c",
          yearly: "https://buy.stripe.com/5kQ3cx0K4bVdavXa5Pf3a0d"
        },
        pro: {
          monthly: "https://buy.stripe.com/4gM3cxakEgbt33vb9Tf3a0h",
          yearly: "https://buy.stripe.com/28EbJ3gJ29N57jL2Dnf3a0g"
        },
        enterprise: {
          monthly: "https://buy.stripe.com/6oUaEZ0K44sLdI93Hrf3a0f",
          yearly: "https://buy.stripe.com/aFa14p0K4aR9avX3Hrf3a0e"
        }
      }
      */

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
        title: t('upgrade.errors.error'),
        description: t('upgrade.errors.failedToInitiate'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const plans = [
    {
      name: "Basic",
      nameKey: "upgrade.plans.basic.name",
      descriptionKey: "upgrade.plans.basic.description",
      price: 39,
      yearlyPrice: 31,
      buttonText: "Start 7-day free trial",
      buttonVariant: "outline" as const,
      featuresKey: "upgrade.plans.basic.features",
      highlighted: false,
      icon: Users,
      popular: false,
    },
    {
      name: "Pro",
      nameKey: "upgrade.plans.pro.name",
      descriptionKey: "upgrade.plans.pro.description",
      price: 79,
      yearlyPrice: 63,
      buttonText: "Start 7-day free trial",
      buttonVariant: "default" as const,
      featuresKey: "upgrade.plans.pro.features",
      highlighted: true,
      icon: TrendingUp,
      popular: true,
    },
    {
      name: "Enterprise",
      nameKey: "upgrade.plans.enterprise.name",
      descriptionKey: "upgrade.plans.enterprise.description",
      price: 180,
      yearlyPrice: 128,
      buttonText: "Start 7-day free trial",
      buttonVariant: "default" as const,
      featuresKey: "upgrade.plans.enterprise.features",
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
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">{t('upgrade.title')}</h1>
            <p className="text-gray-600">{t('upgrade.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Trial Banner */}
        <div className="mb-8">
          <TrialBanner userInfo={userInfo} />
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            {t('upgrade.billing.monthly')}
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-gray-900"
          />
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
              {t('upgrade.billing.yearly')}
            </span>
            {isYearly && (
              <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">
                {t('upgrade.billing.save')}
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 pt-8">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative bg-white/80 backdrop-blur-xl border rounded-3xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                plan.highlighted
                  ? "border-gray-200/50 shadow-2xl ring-2 ring-gray-100/50"
                  : "border-gray-100/20 shadow-lg"
              } ${plan.popular ? 'mt-6' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-lg whitespace-nowrap">
                    <Star className="w-3 h-3 fill-white" />
                    {t('upgrade.plans.pro.mostPopular')}
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
                      <h3 className="text-2xl font-light text-gray-900">{t(plan.nameKey)}</h3>
                      <p className="text-gray-600 text-sm">{t(plan.descriptionKey)}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-4xl font-light text-gray-900">
                        ${isYearly ? plan.yearlyPrice : plan.price}
                      </span>
                      <span className="text-gray-500 text-sm">{t('upgrade.billing.perMember')}</span>
                    </div>

                    <p className="text-gray-400 text-xs mb-4">
                      {isYearly ? t('upgrade.billing.billedAnnually') : t('upgrade.billing.billedMonthly')}
                    </p>

                    {/* Trial indicator */}
                    <div className="bg-gray-50/50 border border-gray-100/50 rounded-2xl p-4 mb-4">
                      <p className="font-medium text-xs text-gray-700 mb-1">
                        {t('upgrade.trial.freeTrialIncluded')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('upgrade.trial.noPaymentRequired')}
                      </p>
                    </div>

                    {isYearly && (
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Badge className="bg-gray-100 text-gray-700 text-xs">
                          {t('upgrade.billing.saveAmount', { amount: (plan.price - plan.yearlyPrice) * 12 })}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Button */}
                <Button
                  onClick={() => {
                    console.log('🔍 Button click debug:', {
                      planName: plan.name,
                      planNameLower: plan.name.toLowerCase(),
                      userSubscriptionType: userInfo.subscription_type,
                      userSubscriptionStatus: userInfo.subscription_status,
                      isCurrentPlan: userInfo.subscription_type === plan.name.toLowerCase(),
                      isDisabled: userInfo.subscription_type === plan.name.toLowerCase() && (userInfo.subscription_status === 'active' || userInfo.subscription_status === 'trialing')
                    })
                    handleUpgrade(plan.name)
                  }}
                  disabled={isLoading || (userInfo.subscription_type === plan.name.toLowerCase() && (userInfo.subscription_status === 'active' || userInfo.subscription_status === 'trialing'))}
                  className={`w-full h-12 text-base font-medium rounded-2xl transition-all duration-200 hover:scale-105 ${
                    plan.buttonVariant === "default"
                      ? "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                      : "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 disabled:bg-gray-100"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('upgrade.buttons.processing')}
                    </div>
                  ) : (userInfo.subscription_type === plan.name.toLowerCase() && (userInfo.subscription_status === 'active' || userInfo.subscription_status === 'trialing')) ? (
                    userInfo.subscription_status === 'trialing' ? t('upgrade.buttons.currentPlan') + ' (Trial)' : t('upgrade.buttons.currentPlan')
                  ) : (
                    t('upgrade.buttons.startFreeTrial')
                  )}
                </Button>

                {/* Features */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Check className="w-5 h-5 text-gray-600" />
                    {t('upgrade.buttons.whatsIncluded')}
                  </h4>
                  <div className="space-y-3">
                    {t(plan.featuresKey, { returnObjects: true }).map((feature: string, featureIndex: number) => (
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

        {/* Features Overview - Why Upgrade? */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl p-8 mb-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100/50 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-gray-600" />
              </div>
              <h2 className="text-2xl font-light text-gray-900">{t('upgrade.whyUpgrade')}</h2>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t('upgrade.whyUpgradeDescription')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100/50">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{t('upgrade.features.secureReliable')}</h3>
              <p className="text-sm text-gray-600">{t('upgrade.features.secureDescription')}</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100/50">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{t('upgrade.features.provenResults')}</h3>
              <p className="text-sm text-gray-600">{t('upgrade.features.resultsDescription')}</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100/50">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{t('upgrade.features.expertSupport')}</h3>
              <p className="text-sm text-gray-600">{t('upgrade.features.supportDescription')}</p>
            </div>
          </div>
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
                      <h3 className="text-2xl font-light text-gray-900">{t('upgrade.enterprise.needCustomSolution')}</h3>
                      <p className="text-gray-600">{t('upgrade.enterprise.perfectForEnterprise')}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 max-w-md">
                    {t('upgrade.enterprise.contactDescription')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    className="h-12 px-6 rounded-2xl font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    {t('upgrade.enterprise.scheduleDemo')}
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 rounded-2xl font-medium transition-all duration-200 hover:scale-105"
                  >
                    {t('upgrade.enterprise.contactSales')}
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
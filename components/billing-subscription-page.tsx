"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, DollarSign, Calendar, CheckCircle, Download, ExternalLink, Info, ArrowRight, ArrowLeft, Sparkles, Shield, Clock, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/use-auth"
import { useI18n } from "@/hooks/use-i18n"
import type { Subscription, Invoice } from "@/types/db"

interface BillingSubscriptionPageProps {
  onTabChange?: (tab: string) => void
}

export function BillingSubscriptionPage({ onTabChange }: BillingSubscriptionPageProps = {}) {
  const { t } = useI18n()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [managingSubscription, setManagingSubscription] = useState(false)

  const fetchBillingData = useCallback(async () => {
    setLoading(true)
    try {
      const [subscriptionRes, invoicesRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/invoices"),
      ])

      const [subscriptionData, invoicesData] = await Promise.all([subscriptionRes.json(), invoicesRes.json()])

      if (subscriptionData.success) setSubscription(subscriptionData.data)
      if (invoicesData.success) setInvoices(invoicesData.data)
    } catch (error) {
      console.error("Error fetching billing data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (!authLoading && isAuthenticated) {
      fetchBillingData()
    }
  }, [fetchBillingData, authLoading, isAuthenticated, router])

  const handleManageSubscription = async () => {
    setManagingSubscription(true)
    try {
      const response = await fetch("/api/billing/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        console.error("Failed to create portal session:", data.error)
        setManagingSubscription(false)
      }
    } catch (error) {
      console.error("Error creating portal session:", error)
      setManagingSubscription(false)
    }
  }

  const handleDownloadInvoice = (url: string) => {
    window.open(url, "_blank")
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">{t('billingPage.loading')}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const isProOrEnterprise = user?.subscription_type === 'pro' || user?.subscription_type === 'enterprise'
  const hasActiveSubscription = subscription && subscription.status === 'active'

  return (
    <div className="max-w-6xl mx-auto">
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
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">{t('billingPage.title')}</h1>
            <p className="text-gray-600">{t('billingPage.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Upgrade Banner for non-pro/enterprise users */}
        {!isProOrEnterprise && (
          <div className="relative bg-gradient-to-br from-gray-50 to-white border border-gray-100/50 rounded-3xl p-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100/30 to-transparent rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-light text-gray-900">
                        {t('billingPage.upgrade.unlockPremiumFeatures')}
                      </h3>
                      <p className="text-gray-500 text-sm">{t('billingPage.upgrade.joinThousands')}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 max-w-md">
                    {t('billingPage.upgrade.getAccessDescription')}
                  </p>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>{t('billingPage.upgrade.securePayments')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{t('billingPage.upgrade.support247')}</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/?tab=upgrade")}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 h-12 px-8 rounded-2xl font-medium transition-all duration-200 hover:scale-105"
                >
                  {t('billingPage.upgrade.upgradeNow')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="p-8 border-b border-gray-100/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100/50 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-gray-900">{t('billingPage.currentPlan')}</h2>
                  <p className="text-gray-600">{t('billingPage.manageSubscriptionDetails')}</p>
                </div>
              </div>
              {hasActiveSubscription && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-2xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{t('billingPage.active')}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-8 p-8">
            {hasActiveSubscription ? (
              <>
                {/* Plan Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{t('billingPage.plan')}</h4>
                        <p className="text-2xl font-light text-gray-900">{subscription.plan_name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{t('billingPage.price')}</h4>
                        <p className="text-2xl font-light text-gray-900">
                          {subscription.currency} {subscription.price}<span className="text-sm text-gray-500">{t('billingPage.month')}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{t('billingPage.nextBilling')}</h4>
                        <p className="text-lg font-light text-gray-900">{subscription.end_date ? formatDate(subscription.end_date) : "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{t('billingPage.status')}</h4>
                        <Badge
                          className={
                            subscription.status === "active"
                              ? "bg-green-100 text-green-800"
                              : subscription.status === "trialing"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Info className="w-4 h-4 text-gray-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">{t('billingPage.planFeatures')}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {subscription.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                        <div className="w-6 h-6 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100/50">
                  <Button
                    onClick={() => router.push("/?tab=upgrade")}
                    variant="outline"
                    className="flex-1 h-12 rounded-2xl font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    {t('billingPage.changePlan')}
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 h-12 px-6 rounded-2xl font-medium transition-all duration-200 hover:scale-105"
                    onClick={handleManageSubscription}
                    disabled={managingSubscription}
                  >
                    {managingSubscription ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('billingPage.openingPortal')}
                      </div>
                    ) : (
                      t('billingPage.manageSubscription')
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-light text-gray-900 mb-2">
                  {user?.subscription_type === 'free' ? t('billingPage.noActiveSubscription') : t('billingPage.subscriptionNotFound')}
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {user?.subscription_type === 'free' 
                    ? t('billingPage.startJourneyText') 
                    : t('billingPage.couldNotFindSubscription')}
                </p>
                {!isProOrEnterprise && (
                  <Button
                   onClick={() => router.push("/?tab=upgrade")}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 rounded-2xl font-medium transition-all duration-200 hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('billingPage.viewPlansAndPricing')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Billing History - only show for Pro/Enterprise users */}
        {isProOrEnterprise && (
          <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="p-8 border-b border-gray-100/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100/50 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-light text-gray-900">{t('billingPage.billingHistory')}</h2>
                    <p className="text-gray-600">{t('billingPage.billingHistorySubtitle')}</p>
                  </div>
                </div>
                {invoices.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {t('billingPage.invoiceCount', { count: invoices.length })}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8">
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-light text-gray-900 mb-2">{t('billingPage.noInvoicesYet')}</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {t('billingPage.billingHistoryDescription')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="group bg-gray-50/50 border border-gray-100/50 rounded-2xl p-6 hover:bg-gray-50 transition-all duration-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-100 group-hover:shadow-sm transition-all duration-200">
                          <Calendar className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">{t('billingPage.invoice')} #{invoice.invoice_number}</h4>
                          <p className="text-sm text-gray-500 mb-1">
                            {formatDate(invoice.issue_date)}
                          </p>
                          <p className="text-lg font-light text-gray-900">
                            {invoice.currency} {invoice.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Badge className={getInvoiceStatusColor(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 p-0 border-gray-200 text-gray-600 hover:bg-gray-100 bg-white rounded-xl transition-all duration-200 hover:scale-105"
                            onClick={() => handleDownloadInvoice(invoice.download_url)}
                          >
                            <Download className="w-4 h-4" />
                            <span className="sr-only">{t('billingPage.downloadInvoice')}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 p-0 border-gray-200 text-gray-600 hover:bg-gray-100 bg-white rounded-xl transition-all duration-200 hover:scale-105"
                            onClick={() => window.open(invoice.download_url, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="sr-only">{t('billingPage.viewInvoice')}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
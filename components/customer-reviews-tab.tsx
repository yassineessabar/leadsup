"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Star, ExternalLink, Clock, MousePointer, Eye, RefreshCw, Info, ChevronDown, Crown, Zap, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { UpgradeProDialog } from "./upgrade-pro-dialog"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  type: string
  status: string
}

interface ClickEvent {
  id: string
  customer_id: string
  timestamp: string
  page: string
  event_type: string
  star_rating?: number
  redirect_platform?: string
  redirect_url?: string
  user_agent?: string
  ip_address?: string
  session_id?: string
}

interface CustomerClickData {
  customer: {
    id: string
    name: string
    email: string
  }
  clicks: ClickEvent[]
  sessions: Array<{
    session_id: string
    start_time: string
    events: ClickEvent[]
  }>
  summary: {
    total_visits: number
    star_selections: Array<{
      star_rating: number
      timestamp: string
    }>
    platform_redirects: Array<{
      redirect_platform: string
      redirect_url: string
      timestamp: string
    }>
    last_activity: string | null
  }
}

export function CustomerReviewsTab() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [clickData, setClickData] = useState<CustomerClickData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingClicks, setIsLoadingClicks] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch("/api/customers")
      if (!response.ok) throw new Error("Failed to fetch customers")

      const result = await response.json()
      if (result.success) {
        setCustomers(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast.error("Failed to load customers")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchCustomerClicks = useCallback(async (customerId: string) => {
    setIsLoadingClicks(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/clicks`)
      if (!response.ok) throw new Error("Failed to fetch click data")

      const result = await response.json()
      if (result.success) {
        setClickData(result.data)
      }
    } catch (error) {
      console.error("Error fetching clicks:", error)
      toast.error("Failed to load review data")
    } finally {
      setIsLoadingClicks(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  )

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    fetchCustomerClicks(customer.id)
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return format(date, "h:mm a")
    } else if (diffInHours < 168) { // 7 days
      return format(date, "EEE h:mm a")
    } else {
      return format(date, "MMM d, h:mm a")
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'google':
        return 'bg-blue-100 text-blue-800'
      case 'trustpilot':
        return 'bg-green-100 text-green-800'
      case 'facebook':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'page_visit':
        return <Eye className="h-4 w-4" />
      case 'star_selection':
        return <Star className="h-4 w-4" />
      case 'platform_redirect':
        return <ExternalLink className="h-4 w-4" />
      default:
        return <MousePointer className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-lg font-semibold hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Customer Reviews
            <Info className="h-4 w-4 text-gray-500" />
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <UpgradeProDialog>
            <Button
              variant="outline"
              className="rounded-full gap-2 bg-violet-50 text-violet-600 border-violet-300 hover:bg-violet-100 shadow-sm"
            >
              <Crown className="h-4 w-4" />
              Try Pro for free
            </Button>
          </UpgradeProDialog>
          {selectedCustomer && (
            <Button
              variant="outline"
              className="rounded-full gap-2 shadow-sm bg-white hover:bg-gray-50"
              onClick={() => fetchCustomerClicks(selectedCustomer.id)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Blue Banner */}
      <div className="relative flex items-center justify-between rounded-xl bg-blue-600 p-6 text-white mb-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">Track customer review interactions</h2>
          <p className="text-sm">Monitor how customers engage with your review requests on Pro</p>
          <UpgradeProDialog>
            <Button className="mt-4 w-fit rounded-full bg-black px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700">
              <Zap className="mr-2 h-5 w-5" />
              Try it for free
            </Button>
          </UpgradeProDialog>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="p-6 rounded-xl shadow-sm bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3">Customers</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-full"
              />
            </div>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto border rounded-lg p-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCustomer?.id === customer.id
                    ? "bg-violet-50 border-violet-300"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => handleCustomerSelect(customer)}
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">{customer.email || customer.phone}</div>
                <Badge variant="outline" className="mt-1 text-xs">
                  {customer.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Review Activity Details */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              {selectedCustomer ? `${selectedCustomer.name}'s Activity` : "Select a Customer"}
            </h3>
            {selectedCustomer && (
              <p className="text-sm text-gray-500">
                Review activity and interactions
              </p>
            )}
          </div>
          <div className="border rounded-lg p-4">
            {!selectedCustomer ? (
              <div className="text-center py-8 text-gray-500">
                Select a customer to view their review activity
              </div>
            ) : isLoadingClicks ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : clickData ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Visits</p>
                          <p className="text-2xl font-bold">{clickData.summary.total_visits}</p>
                        </div>
                        <Eye className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Latest Rating</p>
                          <div className="flex items-center mt-1">
                            {clickData.summary.star_selections.length > 0 ? (
                              <>
                                <span className="text-2xl font-bold mr-2">
                                  {clickData.summary.star_selections[0].star_rating}
                                </span>
                                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                              </>
                            ) : (
                              <span className="text-muted-foreground">No rating yet</span>
                            )}
                          </div>
                        </div>
                        <Star className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Platform Clicks</p>
                          <p className="text-2xl font-bold">{clickData.summary.platform_redirects.length}</p>
                        </div>
                        <ExternalLink className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Timeline */}
                <Tabs defaultValue="timeline" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="sessions">Sessions</TabsTrigger>
                    <TabsTrigger value="details">All Events</TabsTrigger>
                  </TabsList>

                  <TabsContent value="timeline" className="space-y-4">
                    {clickData.clicks.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No activity recorded yet</p>
                    ) : (
                      <div className="space-y-3">
                        {clickData.clicks.slice(0, 10).map((click) => (
                          <div key={click.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                            <div className="mt-1">{getEventTypeIcon(click.event_type)}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">
                                  {click.event_type === 'page_visit' && "Visited review page"}
                                  {click.event_type === 'star_selection' && `Selected ${click.star_rating} star${click.star_rating !== 1 ? 's' : ''}`}
                                  {click.event_type === 'platform_redirect' && `Clicked ${click.redirect_platform} link`}
                                </p>
                                <span className="text-sm text-muted-foreground">
                                  {formatTimeAgo(click.timestamp)}
                                </span>
                              </div>
                              {click.redirect_platform && (
                                <Badge className={`mt-1 ${getPlatformColor(click.redirect_platform)}`}>
                                  {click.redirect_platform}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sessions" className="space-y-4">
                    {clickData.sessions.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No sessions recorded yet</p>
                    ) : (
                      <div className="space-y-4">
                        {clickData.sessions.map((session, index) => (
                          <Card key={session.session_id}>
                            <CardHeader>
                              <CardTitle className="text-base">
                                Session {index + 1}
                              </CardTitle>
                              <CardDescription>
                                Started {formatTimeAgo(session.start_time)} • {session.events.length} events
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {session.events.map((event) => (
                                  <div key={event.id} className="flex items-center space-x-2 text-sm">
                                    {getEventTypeIcon(event.event_type)}
                                    <span>
                                      {event.event_type === 'page_visit' && "Page visit"}
                                      {event.event_type === 'star_selection' && `Rated ${event.star_rating} stars`}
                                      {event.event_type === 'platform_redirect' && `Redirected to ${event.redirect_platform}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="details">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clickData.clicks.map((click) => (
                          <TableRow key={click.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getEventTypeIcon(click.event_type)}
                                <span className="font-medium">
                                  {click.event_type.replace('_', ' ').charAt(0).toUpperCase() +
                                   click.event_type.replace('_', ' ').slice(1)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {click.star_rating && (
                                <div className="flex items-center space-x-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < click.star_rating!
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}
                              {click.redirect_platform && (
                                <Badge className={getPlatformColor(click.redirect_platform)}>
                                  {click.redirect_platform}
                                </Badge>
                              )}
                              {!click.star_rating && !click.redirect_platform && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(click.timestamp), "MMM d, h:mm a")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No review activity found for this customer
              </div>
            )}
          </div>
        </div>
        </div>
      </Card>
    </div>
  )
}
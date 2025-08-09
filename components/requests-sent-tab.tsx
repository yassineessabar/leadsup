"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Filter, Info, ChevronDown, Crown, Zap, Send, Mail, Phone, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import type { ReviewRequest } from "@/types/db"
import { useToast } from "@/hooks/use-toast"
import { UpgradeProDialog } from "./upgrade-pro-dialog"

export function RequestsSentTab() {
  const { toast } = useToast()
  const [searchName, setSearchName] = useState("")
  const [searchContact, setSearchContact] = useState("")
  const [searchDate, setSearchDate] = useState("All")
  const [sentRequests, setSentRequests] = useState<ReviewRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [userInfo, setUserInfo] = useState<{
    subscription_type?: string;
    subscription_status?: string;
  }>({})

  // Fetch user subscription info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" })
        const data = await response.json()
        if (data.success && data.user) {
          setUserInfo({
            subscription_type: data.user.subscription_type,
            subscription_status: data.user.subscription_status,
          })
        }
      } catch (error) {
        console.error("Error fetching user info:", error)
      }
    }
    fetchUserInfo()
  }, [])

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoadingRequests(true)
      try {
        const queryParams = new URLSearchParams()
        if (searchName) queryParams.set("query", searchName)
        if (searchContact) queryParams.set("query", searchContact)
        if (searchDate !== "All") queryParams.set("dateFilter", searchDate)

        const response = await fetch('/api/review-requests?' + queryParams)
        if (!response.ok) throw new Error("Failed to fetch data")

        const data = await response.json()
        if (data.success) {
          // Transform the data to match the component's expected format
          const transformedRequests = (data.data || []).map((request: any) => ({
            id: request.id,
            customer_name: request.contact_name,
            email: request.contact_email,
            phone: request.contact_phone,
            method: request.request_type,
            status: request.status,
            sent_at: new Date(request.sent_at),
            created_at: new Date(request.created_at),
            updated_at: new Date(request.updated_at),
            user_id: request.user_id,
            template_id: request.review_link_id, // Using review_link_id as template_id
          }))
          setSentRequests(transformedRequests)
        } else {
          throw new Error(data.error || "Failed to fetch requests")
        }
      } catch (error) {
        console.error("Error fetching requests:", error)
        toast({
          title: "Error",
          description: "Failed to load requests. Please try again.",
          variant: "destructive",
        })
        setSentRequests([])
      } finally {
        setLoadingRequests(false)
      }
    }

    fetchData()
  }, [searchName, searchContact, searchDate])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchName, searchContact, searchDate])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "sent":
        return <Badge variant="secondary">Sent</Badge>
      case "delivered":
        return <Badge variant="default" className="bg-green-100 text-green-800">Delivered</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "opened":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Opened</Badge>
      case "clicked":
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Clicked</Badge>
      default:
        return <Badge variant="secondary" className="capitalize">{status}</Badge>
    }
  }

  const filteredRequests = sentRequests.filter((request) => {
    const matchesName = request.customer_name.toLowerCase().includes(searchName.toLowerCase())
    const matchesContact =
      request.email?.toLowerCase().includes(searchContact.toLowerCase()) ||
      request.phone?.includes(searchContact)

    let matchesDate = true
    if (searchDate !== "All" && request.sent_at) {
      const requestDate = new Date(request.sent_at)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      switch (searchDate) {
        case "Today":
          matchesDate = requestDate >= today
          break
        case "Yesterday":
          matchesDate = requestDate >= yesterday && requestDate < today
          break
        case "Last 7 days":
          matchesDate = requestDate >= sevenDaysAgo
          break
        case "Last 30 days":
          matchesDate = requestDate >= thirtyDaysAgo
          break
        default:
          matchesDate = true
      }
    }

    return matchesName && matchesContact && matchesDate
  })

  const handleExportRequests = () => {
    const csvContent = [
      ["Name", "Contact", "Method", "Status", "Sent At"],
      ...filteredRequests.map(request => [
        request.customer_name,
        request.email || request.phone || "",
        request.method,
        request.status,
        request.sent_at ? format(request.sent_at, "MMM dd, yyyy HH:mm") : ""
      ])
    ].map(row => row.join(",")).join("\\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "review-requests.csv"
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Export Successful",
      description: "Review requests have been exported to CSV.",
    })
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex)

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-lg font-semibold hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Requests Sent
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {!(userInfo.subscription_type && userInfo.subscription_type !== 'free' && userInfo.subscription_status === 'active') && (
            <UpgradeProDialog>
              <Button
                variant="outline"
                className="rounded-full gap-2 bg-violet-50 text-violet-600 border-violet-300 hover:bg-violet-100 shadow-sm"
              >
                <Crown className="h-4 w-4" />
                Try Pro for free
              </Button>
            </UpgradeProDialog>
          )}
          <Button
            onClick={handleExportRequests}
            variant="outline"
            className="rounded-full gap-2 shadow-sm bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Gradient Banner - Hidden for Pro/Enterprise users */}
      {!(userInfo.subscription_type && userInfo.subscription_type !== 'free' && userInfo.subscription_status === 'active') && (
        <div className="relative flex items-center justify-between rounded-xl p-6 text-white mb-6" style={{ background: 'linear-gradient(90deg, hsla(31, 90%, 76%, 1) 0%, hsla(279, 92%, 90%, 1) 100%)' }}>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Monitor request delivery and engagement</h2>
            <p className="text-sm">Track delivery status, open rates, and customer interactions on Pro</p>
            <UpgradeProDialog>
              <Button className="mt-4 w-fit rounded-full bg-black px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700">
                <Zap className="mr-2 h-5 w-5" />
                Try it for free
              </Button>
            </UpgradeProDialog>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <Card className="p-6 rounded-xl shadow-sm bg-white dark:bg-gray-800">
        {/* Filter and Actions */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={searchDate} onValueChange={setSearchDate}>
            <SelectTrigger className="w-[150px] rounded-full">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Time</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Yesterday">Yesterday</SelectItem>
              <SelectItem value="Last 7 days">Last 7 days</SelectItem>
              <SelectItem value="Last 30 days">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name..."
              className="pl-9 rounded-full w-[200px]"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by contact..."
              className="pl-9 rounded-full"
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
            />
          </div>
        </div>

        {/* Table Headers */}
        <div className="grid grid-cols-5 gap-4 py-3 text-sm font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">
          <span className="col-span-2">Customer</span>
          <span>Method</span>
          <span>Status</span>
          <span>Sent At</span>
        </div>

        {loadingRequests ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading requests...</p>
            </div>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 dark:text-gray-400">
            <Send className="h-16 w-16 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold">
              {sentRequests.length === 0
                ? "No review requests sent yet"
                : "No requests match your filters"
              }
            </p>
            <p className="text-sm mt-1">
              {sentRequests.length === 0
                ? "Review requests will appear here once you start sending them to customers"
                : "Try adjusting your search criteria or date range"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedRequests.map((request) => (
              <div key={request.id} className="grid grid-cols-5 gap-4 py-4 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                {/* Customer Info */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {request.customer_name}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {request.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{request.email}</span>
                        </div>
                      )}
                      {request.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{request.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Method */}
                <div className="flex items-center">
                  <Badge variant="outline" className="capitalize">
                    {request.method}
                  </Badge>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  {getStatusBadge(request.status)}
                </div>

                {/* Sent At */}
                <div className="flex items-center text-gray-600">
                  {request.sent_at ? format(request.sent_at, "MMM dd, yyyy HH:mm") : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-transparent"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-transparent"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Items per page</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[70px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Star, RefreshCw, Search, MessageSquare, ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { toast } from "sonner"

interface Review {
  id: string
  customer_name: string
  customer_email: string
  rating: number
  comment: string
  platform: string
  status: string
  created_at: string
  updated_at: string
  is_linked_customer?: boolean
}

export function ReviewsDisplay() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRating, setFilterRating] = useState("all")
  const [filterPlatform, setFilterPlatform] = useState("all")

  const fetchReviews = async () => {
    if (!loading) {
      setRefreshing(true)
    }

    try {
      const params = new URLSearchParams()
      if (filterRating !== "all") params.append("rating", filterRating)
      if (filterPlatform !== "all") params.append("platform", filterPlatform)
      if (searchQuery) params.append("query", searchQuery)

      const response = await fetch(`/api/reviews?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setReviews(result.data || [])
      } else {
        toast.error(result.error || "Failed to fetch reviews")
      }
    } catch (error) {
      console.error("❌ Error fetching reviews:", error)
      toast.error(`Failed to fetch reviews: ${error.message}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [filterRating, filterPlatform])

  const handleSearch = () => {
    fetchReviews()
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Get unique platforms from reviews
  const platforms = Array.from(new Set(reviews.map(r => r.platform)))

  // Summary stats
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : "0"
  const internalReviews = reviews.filter(r => r.platform === "internal").length
  const externalReviews = totalReviews - internalReviews
  const linkedCustomerReviews = reviews.filter(r => r.is_linked_customer).length
  const anonymousReviews = totalReviews - linkedCustomerReviews

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="text-gray-500">All customer reviews including anonymous feedback</p>
        </div>
        <Button
          onClick={fetchReviews}
          disabled={refreshing}
          variant="outline"
          className="rounded-full gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Reviews</p>
                <p className="text-2xl font-bold">{totalReviews}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{averageRating}</p>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Known Customers</p>
                <p className="text-2xl font-bold">{linkedCustomerReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Anonymous</p>
                <p className="text-2xl font-bold">{anonymousReviews}</p>
              </div>
              <ExternalLink className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All Ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="internal">Your Form</SelectItem>
              {platforms.filter(p => p !== "internal").map(platform => (
                <SelectItem key={platform} value={platform}>{platform}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search reviews..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} variant="outline">
              Search
            </Button>
          </div>
        </div>
      </Card>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{review.customer_name}</p>
                            {!review.is_linked_customer && (
                              <Badge variant="outline" className="text-xs">Anonymous</Badge>
                            )}
                          </div>
                          {review.customer_email && (
                            <p className="text-sm text-gray-500">{review.customer_email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderStars(review.rating)}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2">{review.comment}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={review.platform === "internal" ? "default" : "secondary"}>
                          {review.platform === "internal" ? "Your Form" : review.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(review.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
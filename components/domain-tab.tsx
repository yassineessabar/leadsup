"use client"

import { useState } from "react"
import { Search, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { EnhancedDomainTab } from "@/components/enhanced-domain-tab"

const domains = [
  {
    id: 1,
    domain: "leadsup.io",
    status: "verified",
    description: "Domain is verified and ready to use",
    isTestDomain: false,
    stats: {
      sent: 1250,
      delivered: 1180,
      rejected: 70,
      received: 423,
    },
  },
  {
    id: 2,
    domain: "reply.leadsup.io",
    status: "verified",
    description: "Domain is verified and ready to use", 
    isTestDomain: false,
    stats: {
      sent: 3420,
      delivered: 3200,
      rejected: 220,
      received: 856,
    },
  },
  {
    id: 3,
    domain: "uboardmedia.com",
    status: "not-verified",
    description: "Domain is not verified",
    isTestDomain: false,
    stats: {
      sent: 0,
      delivered: 0,
      rejected: 0,
      received: 0,
    },
  },
  {
    id: 4,
    domain: "test-2p0347zxd1vlzdrn.mlsender.net",
    status: "verified",
    description: "Domain is verified and ready to use",
    isTestDomain: true,
    stats: {
      sent: 0,
      delivered: 0,
      rejected: 0,
      received: 0,
    },
  },
]

export function DomainTab() {
  // Import enhanced version
  return <EnhancedDomainTab />
}

// Keep original for reference
function OriginalDomainTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("date-created")
  const [viewCount, setViewCount] = useState("25")

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Domains</h1>
          <p className="text-sm text-gray-600 mt-1">
            Emails will be sent to your recipients from the verified domains.
          </p>
        </div>
        <Button variant="outline" className="text-gray-600 border-gray-300 bg-transparent">
          Add domain
        </Button>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Type to search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-created">Date created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Domain</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Status</th>
              <th className="text-center py-3 px-6 text-sm font-medium text-gray-600">
                <div>Sending</div>
                <div className="flex justify-center gap-8 mt-1 text-xs text-gray-500">
                  <span>Sent</span>
                  <span>Delivered</span>
                </div>
              </th>
              <th className="text-center py-3 px-6 text-sm font-medium text-gray-600">
                <div>Receiving</div>
                <div className="flex justify-center gap-8 mt-1 text-xs text-gray-500">
                  <span>Rejected</span>
                  <span>Received</span>
                </div>
              </th>
              <th className="text-right py-3 px-6 text-sm font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <tr key={domain.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        domain.status === "verified" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {domain.status === "verified" ? (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{domain.domain}</span>
                        {domain.isTestDomain && (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                            Test domain
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{domain.description}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <Badge
                    variant={domain.status === "verified" ? "default" : "destructive"}
                    className={
                      domain.status === "verified"
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-100"
                    }
                  >
                    {domain.status === "verified" ? "Verified" : "Not verified"}
                  </Badge>
                </td>
                <td className="py-4 px-6">
                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <div className="text-lg font-medium text-gray-900">{domain.stats.sent}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-medium text-gray-900">{domain.stats.delivered}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <div className="text-lg font-medium text-gray-900">{domain.stats.rejected}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-medium text-gray-900">{domain.stats.received}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">View</span>
          <Select value={viewCount} onValueChange={setViewCount}>
            <SelectTrigger className="w-16 h-8 border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutGrid } from "lucide-react"

export function WidgetsTab() {
  return (
    <div className="space-y-8">
      <Card className="bg-white border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            Widgets
          </CardTitle>
          <CardDescription className="text-gray-600">
            Manage your review widgets and embed them on your website.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-500 py-8">Widgets functionality coming soon!</div>
        </CardContent>
      </Card>
    </div>
  )
}

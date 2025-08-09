"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ChartData {
  date: string
  leads: number
  conversions: number
  calls: number
  emails: number
}

interface InsightsChartProps {
  data: ChartData[]
  activeTab: string
}

export function InsightsChart({ data, activeTab }: InsightsChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    leads: true,
    conversions: true,
    calls: false,
    emails: false,
  })

  const toggleMetric = (metric: keyof typeof selectedMetrics) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }))
  }

  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    })
  }))

  return (
    <div className="space-y-4">
      {/* Chart Legend - Interactive */}
      <div className="flex flex-wrap gap-4 text-sm">
        <button
          onClick={() => toggleMetric("leads")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            selectedMetrics.leads ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <div className={`w-3 h-3 rounded ${selectedMetrics.leads ? "bg-blue-500" : "bg-gray-300"}`}></div>
          Leads
        </button>
        <button
          onClick={() => toggleMetric("conversions")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            selectedMetrics.conversions ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <div className={`w-3 h-3 rounded ${selectedMetrics.conversions ? "bg-green-500" : "bg-gray-300"}`}></div>
          Conversions
        </button>
        <button
          onClick={() => toggleMetric("calls")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            selectedMetrics.calls ? "bg-orange-100 text-orange-700" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <div className={`w-3 h-3 rounded ${selectedMetrics.calls ? "bg-orange-500" : "bg-gray-300"}`}></div>
          Calls
        </button>
        <button
          onClick={() => toggleMetric("emails")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            selectedMetrics.emails ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <div className={`w-3 h-3 rounded ${selectedMetrics.emails ? "bg-purple-500" : "bg-gray-300"}`}></div>
          Emails
        </button>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280" 
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={12}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            {selectedMetrics.leads && (
              <Line 
                type="monotone" 
                dataKey="leads" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#3b82f6" }}
              />
            )}
            {selectedMetrics.conversions && (
              <Line 
                type="monotone" 
                dataKey="conversions" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#10b981" }}
              />
            )}
            {selectedMetrics.calls && (
              <Line 
                type="monotone" 
                dataKey="calls" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#f59e0b" }}
              />
            )}
            {selectedMetrics.emails && (
              <Line 
                type="monotone" 
                dataKey="emails" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#8b5cf6" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data.reduce((sum, item) => sum + item.leads, 0)}
          </div>
          <div className="text-xs text-gray-500">Total Leads</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {data.reduce((sum, item) => sum + item.conversions, 0)}
          </div>
          <div className="text-xs text-gray-500">Total Conversions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {data.reduce((sum, item) => sum + item.calls, 0)}
          </div>
          <div className="text-xs text-gray-500">Total Calls</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {data.reduce((sum, item) => sum + item.emails, 0)}
          </div>
          <div className="text-xs text-gray-500">Total Emails</div>
        </div>
      </div>
    </div>
  )
}
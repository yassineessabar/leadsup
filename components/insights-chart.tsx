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
            selectedMetrics.leads ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <div className={`w-3 h-3 rounded ${selectedMetrics.leads ? "bg-blue-500" : "bg-gray-300"}`}></div>
          Leads
        </button>
        <button
          onClick={() => toggleMetric("conversions")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            selectedMetrics.conversions ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <div className={`w-3 h-3 rounded ${selectedMetrics.conversions ? "bg-green-500" : "bg-gray-300"}`}></div>
          Conversions
        </button>
        <button
          onClick={() => toggleMetric("calls")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            selectedMetrics.calls ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <div className={`w-3 h-3 rounded ${selectedMetrics.calls ? "bg-orange-500" : "bg-gray-300"}`}></div>
          Calls
        </button>
        <button
          onClick={() => toggleMetric("emails")}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            selectedMetrics.emails ? "" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          style={selectedMetrics.emails ? { backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' } : {}}
        >
          <div className={`w-3 h-3 rounded ${selectedMetrics.emails ? "" : "bg-gray-300"}`} style={selectedMetrics.emails ? { backgroundColor: 'rgb(87, 140, 255)' } : {}}></div>
          Emails
        </button>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis 
              dataKey="date" 
              className="stroke-gray-500 dark:stroke-gray-400"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              className="stroke-gray-500 dark:stroke-gray-400"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                color: "var(--foreground)"
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
                stroke="rgb(87, 140, 255)" 
                strokeWidth={2}
                dot={{ fill: "rgb(87, 140, 255)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "rgb(87, 140, 255)" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data.reduce((sum, item) => sum + item.leads, 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Leads</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {data.reduce((sum, item) => sum + item.conversions, 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Conversions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {data.reduce((sum, item) => sum + item.calls, 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Calls</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: 'rgb(87, 140, 255)' }}>
            {data.reduce((sum, item) => sum + item.emails, 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Emails</div>
        </div>
      </div>
    </div>
  )
}
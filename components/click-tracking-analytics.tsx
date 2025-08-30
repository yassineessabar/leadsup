"use client"

import { useState, useEffect } from 'react'
import { useClickTracking } from '@/components/click-tracking'

interface ClickData {
  id: string
  customer_id: string
  timestamp: string
  page: string
  user_agent: string
  ip_address: string
  referrer: string
}

export function ClickTrackingAnalytics({ customerId }: { customerId?: string }) {
  const { getClickHistory } = useClickTracking()
  const [clicks, setClicks] = useState<ClickData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (customerId) {
      loadClickHistory(customerId)
    }
  }, [customerId])

  const loadClickHistory = async (cid: string) => {
    try {
      setLoading(true)
      setError(null)
      const history = await getClickHistory(cid, 100)
      setClicks(history || [])
    } catch (err) {
      setError('Failed to load click history')
      console.error('Error loading click history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4">Loading click history...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600 dark:text-red-400">{error}</div>
  }

  if (clicks.length === 0) {
    return <div className="p-4 text-gray-500 dark:text-gray-400">No clicks tracked yet.</div>
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Click History</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Page
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Device
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Referrer
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {clicks.map((click) => (
              <tr key={click.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {new Date(click.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {click.page}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {getDeviceType(click.user_agent)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {click.referrer || 'Direct'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function getDeviceType(userAgent: string): string {
  if (!userAgent) return 'Unknown'

  const ua = userAgent.toLowerCase()

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'Mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet'
  } else {
    return 'Desktop'
  }
}
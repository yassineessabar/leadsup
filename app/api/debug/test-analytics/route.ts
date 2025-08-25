import { NextRequest, NextResponse } from 'next/server'
import { getEmailTrackingMetrics } from '@/lib/email-tracking-analytics'

export async function GET(request: NextRequest) {
  const userId = '157004d8-201b-48ce-9610-af5b3ecbc820' // Your user ID from the tracking records
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  
  const startDate = thirtyDaysAgo.toISOString().split('T')[0]
  const endDate = today.toISOString().split('T')[0]
  
  console.log(`Testing analytics for user ${userId} from ${startDate} to ${endDate}`)
  
  const metrics = await getEmailTrackingMetrics(userId, startDate, endDate)
  
  return NextResponse.json({
    success: true,
    userId,
    dateRange: { startDate, endDate },
    metrics,
    summary: {
      emailsSent: metrics?.emailsSent || 0,
      openRate: metrics?.openRate || 0,
      clickRate: metrics?.clickRate || 0,
      uniqueOpens: metrics?.uniqueOpens || 0,
      uniqueClicks: metrics?.uniqueClicks || 0
    }
  })
}
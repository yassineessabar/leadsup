// Health Score Calculation Utilities

export interface HealthMetrics {
  warmupScore: number
  deliverabilityScore: number
  engagementScore: number
  volumeScore: number
  reputationScore: number
}

export interface HealthScoreResult {
  score: number
  breakdown: HealthMetrics
  lastUpdated: string
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  recommendations: string[]
}

// Get health score color class for UI display
export function getHealthScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 80) return 'text-green-500'
  if (score >= 70) return 'text-yellow-600'
  if (score >= 60) return 'text-orange-500'
  if (score >= 50) return 'text-orange-600'
  return 'text-red-600'
}

// Get health score background color for badges
export function getHealthScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-50 text-green-700 border-green-200'
  if (score >= 80) return 'bg-green-50 text-green-600 border-green-200'
  if (score >= 70) return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  if (score >= 60) return 'bg-orange-50 text-orange-600 border-orange-200'
  if (score >= 50) return 'bg-orange-50 text-orange-700 border-orange-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

// Get health status based on score
export function getHealthStatus(score: number): HealthScoreResult['status'] {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 70) return 'fair'
  if (score >= 60) return 'poor'
  return 'critical'
}

// Get health score icon
export function getHealthScoreIcon(score: number): string {
  if (score >= 90) return '🟢'
  if (score >= 80) return '🟡'
  if (score >= 70) return '🟠'
  if (score >= 60) return '🔴'
  return '⚫'
}

// Generate recommendations based on breakdown
export function generateRecommendations(breakdown: HealthMetrics): string[] {
  const recommendations: string[] = []

  if (breakdown.warmupScore < 70) {
    recommendations.push('Complete account warm-up process to improve sender reputation')
  }

  if (breakdown.deliverabilityScore < 80) {
    recommendations.push('Reduce bounce rate by cleaning email lists and validating addresses')
  }

  if (breakdown.engagementScore < 70) {
    recommendations.push('Improve email content to increase open and click rates')
  }

  if (breakdown.volumeScore < 60) {
    recommendations.push('Maintain consistent sending volume to build reputation')
  }

  if (breakdown.reputationScore < 70) {
    recommendations.push('Allow more time for account aging and reputation building')
  }

  if (recommendations.length === 0) {
    recommendations.push('Account is performing well! Continue current practices.')
  }

  return recommendations
}

// Fetch health scores for multiple senders
export async function fetchHealthScores(senderIds: string[], campaignId?: string): Promise<Record<string, HealthScoreResult>> {
  try {
    console.log('🔍 Fetching health scores for senders:', senderIds)
    
    const params = new URLSearchParams()
    if (senderIds.length > 0) {
      params.set('senderIds', senderIds.join(','))
    }
    if (campaignId) {
      params.set('campaignId', campaignId)
    }

    const url = `/api/sender-accounts/health-score?${params}`
    console.log('📡 Health score API URL:', url)

    const response = await fetch(url, {
      credentials: 'include'
    })

    console.log('📊 Health score API response status:', response.status)

    const result = await response.json()
    console.log('📋 Health score API result:', result)

    if (result.success) {
      // Transform the response to include status and recommendations
      const transformedScores: Record<string, HealthScoreResult> = {}
      
      for (const [senderId, scoreData] of Object.entries(result.healthScores)) {
        const typedScoreData = scoreData as { score: number; breakdown: HealthMetrics; lastUpdated: string }
        transformedScores[senderId] = {
          ...typedScoreData,
          status: getHealthStatus(typedScoreData.score),
          recommendations: generateRecommendations(typedScoreData.breakdown)
        }
      }

      console.log('✅ Successfully transformed health scores:', Object.keys(transformedScores))
      return transformedScores
    }

    console.error('❌ Health score API returned error:', result.error)
    return {}
  } catch (error) {
    console.error('❌ Error fetching health scores:', error)
    return {}
  }
}

// Update health scores for specific senders
export async function updateHealthScores(senderIds: string[]): Promise<boolean> {
  try {
    const response = await fetch('/api/sender-accounts/health-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        senderIds,
        forceRefresh: true
      })
    })

    const result = await response.json()
    return result.success
  } catch (error) {
    console.error('Error updating health scores:', error)
    return false
  }
}

// Format health score for display
export function formatHealthScore(score: number): string {
  return `${score}%`
}

// Get health trend indicator (for future use with historical data)
export function getHealthTrend(currentScore: number, previousScore?: number): 'up' | 'down' | 'stable' {
  if (!previousScore) return 'stable'
  
  const difference = currentScore - previousScore
  if (difference > 2) return 'up'
  if (difference < -2) return 'down'
  return 'stable'
}
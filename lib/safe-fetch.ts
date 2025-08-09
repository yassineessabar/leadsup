/**
 * Safely fetch and parse JSON responses, with proper error handling for non-JSON responses
 */
export async function safeFetch(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Check if response is JSON before attempting to parse
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, but got ${contentType || 'unknown content type'}`)
    }
    
    const data = await response.json()
    return { success: true, data, response }
  } catch (error) {
    console.error('SafeFetch error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null 
    }
  }
}

/**
 * Safely parse JSON with proper error handling
 */
export function safeJsonParse(text: string) {
  try {
    return { success: true, data: JSON.parse(text) }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to parse JSON',
      data: null 
    }
  }
}
/**
 * Email tracking utilities for adding open and click tracking to emails
 */

export interface TrackingOptions {
  trackingId: string
  baseUrl?: string
}

/**
 * Add tracking pixel to HTML email content
 */
export function addTrackingPixel(htmlContent: string, options: TrackingOptions): string {
  const { trackingId, baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadsup.io' } = options
  
  const trackingPixel = `<img src="${baseUrl}/api/track/open?id=${trackingId}" alt="" width="1" height="1" style="display: none;">`
  
  // Try to insert before closing body tag, or append to end
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${trackingPixel}</body>`)
  } else {
    return htmlContent + trackingPixel
  }
}

/**
 * Wrap all links in HTML content with click tracking
 */
export function addClickTracking(htmlContent: string, options: TrackingOptions): string {
  const { trackingId, baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadsup.io' } = options
  
  // Regular expression to find all href attributes
  const hrefRegex = /href="([^"]*(?:http[s]?:\/\/[^"]*))"/g
  
  return htmlContent.replace(hrefRegex, (match, url) => {
    // Skip if already a tracking URL
    if (url.includes('/api/track/click')) {
      return match
    }
    
    // Skip mailto: and tel: links
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      return match
    }
    
    // Create tracking URL
    const trackingUrl = `${baseUrl}/api/track/click?id=${trackingId}&url=${encodeURIComponent(url)}`
    return `href="${trackingUrl}"`
  })
}

/**
 * Add both tracking pixel and click tracking to HTML email content
 */
export function addEmailTracking(htmlContent: string, options: TrackingOptions): string {
  let trackedContent = addClickTracking(htmlContent, options)
  trackedContent = addTrackingPixel(trackedContent, options)
  return trackedContent
}

/**
 * Generate a unique tracking ID
 */
export function generateTrackingId(): string {
  return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
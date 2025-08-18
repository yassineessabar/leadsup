// Performance monitoring utilities

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private slowQueries: Array<{ query: string; duration: number; timestamp: Date }> = []
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTimer(label: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        console.warn(`🐌 Slow operation detected: ${label} took ${duration.toFixed(2)}ms`)
        this.slowQueries.push({
          query: label,
          duration,
          timestamp: new Date()
        })
        
        // Keep only last 50 slow queries
        if (this.slowQueries.length > 50) {
          this.slowQueries = this.slowQueries.slice(-50)
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`)
      }
    }
  }

  getSlowQueries(): Array<{ query: string; duration: number; timestamp: Date }> {
    return this.slowQueries
  }

  clearSlowQueries(): void {
    this.slowQueries = []
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// Wrapper for database queries with performance monitoring
export async function monitoredQuery<T>(
  label: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const stopTimer = performanceMonitor.startTimer(label)
  
  try {
    const result = await queryFn()
    stopTimer()
    return result
  } catch (error) {
    stopTimer()
    throw error
  }
}

// React hook for client-side performance monitoring
export function usePerformanceMonitor() {
  const startTimer = (label: string) => {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ Client: ${label}: ${duration.toFixed(2)}ms`)
      }
      
      if (duration > 500) {
        console.warn(`🐌 Slow client operation: ${label} took ${duration.toFixed(2)}ms`)
      }
    }
  }
  
  return { startTimer }
}
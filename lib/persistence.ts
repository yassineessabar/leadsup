// Local storage utilities for offline-first behavior
interface PersistedData {
  data: any
  timestamp: number
  version: string
}

const STORAGE_VERSION = '1.0.0'
const STORAGE_PREFIX = 'loop_'

export const persistenceKeys = {
  USER_INFO: `${STORAGE_PREFIX}user_info`,
  REVIEW_LINK: `${STORAGE_PREFIX}review_link`,
  CUSTOMIZATION: `${STORAGE_PREFIX}customization`,
  APPEARANCE: `${STORAGE_PREFIX}appearance_settings`,
  LINKS: `${STORAGE_PREFIX}links`
} as const

// Save data to localStorage with versioning
export function saveToStorage<T>(key: string, data: T): void {
  try {
    const persistedData: PersistedData = {
      data,
      timestamp: Date.now(),
      version: STORAGE_VERSION
    }
    localStorage.setItem(key, JSON.stringify(persistedData))
  } catch (error) {
    }
}

// Load data from localStorage with version checking
export function loadFromStorage<T>(key: string, maxAge?: number): T | null {
  try {
    const item = localStorage.getItem(key)
    if (!item) return null

    const persistedData: PersistedData = JSON.parse(item)

    // Check version compatibility
    if (persistedData.version !== STORAGE_VERSION) {
      localStorage.removeItem(key)
      return null
    }

    // Check age if specified
    if (maxAge && Date.now() - persistedData.timestamp > maxAge) {
      localStorage.removeItem(key)
      return null
    }

    return persistedData.data
  } catch (error) {
    localStorage.removeItem(key) // Clean up corrupted data
    return null
  }
}

// Clear specific storage key
export function clearStorage(key: string): void {
  localStorage.removeItem(key)
}

// Clear all app storage
export function clearAllStorage(): void {
  Object.values(persistenceKeys).forEach(key => {
    localStorage.removeItem(key)
  })
}

// Get storage usage info
export function getStorageInfo() {
  const info = Object.entries(persistenceKeys).map(([name, key]) => {
    const data = loadFromStorage(key)
    return {
      key: name,
      exists: !!data,
      size: data ? JSON.stringify(data).length : 0,
      age: data ? Date.now() - JSON.parse(localStorage.getItem(key) || '{}').timestamp : 0
    }
  })

  return {
    keys: info,
    totalSize: info.reduce((sum, item) => sum + item.size, 0)
  }
}
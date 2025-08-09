'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">An error occurred while loading this page.</p>
        <button
          onClick={() => reset()}
          className="bg-[#e66465] text-white px-6 py-2 rounded-lg hover:bg-[#d54546] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
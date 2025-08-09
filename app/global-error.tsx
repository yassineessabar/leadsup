'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Error</h2>
            <p className="text-gray-600 mb-6">A critical error occurred. Please try refreshing the page.</p>
            <button
              onClick={() => reset()}
              className="bg-[#e66465] text-white px-6 py-2 rounded-lg hover:bg-[#d54546] transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
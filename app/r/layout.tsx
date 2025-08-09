import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Share Your Experience',
  description: 'We value your feedback and would love to hear about your experience.',
  robots: 'noindex, nofollow', // Review pages shouldn't be indexed
}

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <head>
        {/* Preload critical resources */}
        <link rel="preload" href="/api/public/review" as="fetch" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* Performance optimizations */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />

        {/* Prevent zoom on mobile inputs */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      {children}
    </>
  )
}
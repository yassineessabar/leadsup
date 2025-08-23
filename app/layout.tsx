import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/hooks/use-auth'
import { OnboardingProvider } from '@/hooks/use-onboarding'

export const metadata: Metadata = {
  title: 'LeadsUp — Generate More Leads. Convert Better.',
  description: 'Transform your lead generation with LeadsUp. Capture, qualify, and convert leads automatically with AI-powered automation. Boost sales and grow your business.',
  keywords: 'lead generation, lead management, sales automation, CRM, lead capture, lead qualification, sales funnel, business growth, lead conversion',
  authors: [{ name: 'LeadsUp' }],
  robots: 'index, follow',
  generator: 'LeadsUp',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Switzer:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <OnboardingProvider>
            {children}
            <Toaster />
          </OnboardingProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

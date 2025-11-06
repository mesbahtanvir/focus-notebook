import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { DIProvider } from '@/contexts/DIContext'
import Layout from '@/components/Layout'
import { FirestoreSubscriber } from '@/components/FirestoreSubscriber'
import { initializeContainer } from '@/di/setup'
import { initializeFirebaseResilience } from '@/lib/firebase/initialize-resilience'

// Initialize dependency injection container
if (typeof window !== 'undefined') {
  initializeContainer()
  initializeFirebaseResilience()
}

export const metadata: Metadata = {
  title: 'Focus Notebook',
  description: 'Privacy-first productivity dashboard for personal growth',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', sizes: 'any' },
    ],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light">
      <body className="font-sans antialiased">
        <DIProvider>
          <AuthProvider>
            <FirestoreSubscriber />
            <Layout>
              {children}
            </Layout>
          </AuthProvider>
        </DIProvider>
      </body>
    </html>
  )
}
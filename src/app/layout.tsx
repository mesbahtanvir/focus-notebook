import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import { ThoughtProcessorDaemon } from '@/components/ThoughtProcessorDaemon'
import { FirestoreSubscriber } from '@/components/FirestoreSubscriber'

export const metadata: Metadata = {
  title: 'Focus Notebook',
  description: 'Privacy-first productivity dashboard for personal growth',
  manifest: '/manifest.json',
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
        <AuthProvider>
          <FirestoreSubscriber />
          <ThoughtProcessorDaemon />
          <Layout>
            {children}
          </Layout>
        </AuthProvider>
      </body>
    </html>
  )
}
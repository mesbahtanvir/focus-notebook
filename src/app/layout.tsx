import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import { AutoSync } from '@/components/AutoSync'
import { ThoughtProcessorDaemon } from '@/components/ThoughtProcessorDaemon'
import { SyncToast } from '@/components/SyncToast'

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
          <AutoSync />
          <ThoughtProcessorDaemon />
          <SyncToast />
          <Layout>
            {children}
          </Layout>
        </AuthProvider>
      </body>
    </html>
  )
}
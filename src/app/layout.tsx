import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import { AutoSync } from '@/components/AutoSync'
import { ThoughtProcessorDaemon } from '@/components/ThoughtProcessorDaemon'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        <AuthProvider>
          <AutoSync />
          <ThoughtProcessorDaemon />
          <Layout>
            {children}
          </Layout>
        </AuthProvider>
      </body>
    </html>
  )
}
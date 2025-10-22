"use client";

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, CloudOff, RefreshCw, CheckCircle2, XCircle, WifiOff } from 'lucide-react'
import { useSyncStatus } from '@/store/useSyncStatus'

/**
 * Toast notification for sync status
 * Shows real-time sync updates to the user
 */
export function SyncToast() {
  const { status, lastSyncTime, isOnline, error } = useSyncStatus()
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  useEffect(() => {
    // Handle offline status
    if (!isOnline) {
      setToastMessage('You are offline')
      setToastType('error')
      setShowToast(true)
      return
    }

    // Handle different sync statuses
    switch (status) {
      case 'syncing':
        setToastMessage('Syncing...')
        setToastType('info')
        setShowToast(true)
        break

      case 'synced':
        setToastMessage('All changes synced')
        setToastType('success')
        setShowToast(true)
        // Auto-hide success message after 2 seconds
        setTimeout(() => setShowToast(false), 2000)
        break

      case 'error':
        setToastMessage(error || 'Sync failed')
        setToastType('error')
        setShowToast(true)
        // Auto-hide error message after 5 seconds
        setTimeout(() => setShowToast(false), 5000)
        break

      case 'idle':
      case 'offline':
        // Don't show toast for these states
        break
    }
  }, [status, isOnline, error])

  const getIcon = () => {
    if (!isOnline) return <WifiOff className="h-5 w-5" />
    
    switch (status) {
      case 'syncing':
        return <RefreshCw className="h-5 w-5 animate-spin" />
      case 'synced':
        return <CheckCircle2 className="h-5 w-5" />
      case 'error':
        return <XCircle className="h-5 w-5" />
      default:
        return <Cloud className="h-5 w-5" />
    }
  }

  const getColorClass = () => {
    if (!isOnline || status === 'error' || status === 'offline') {
      return 'bg-red-500 text-white'
    }
    if (status === 'synced') {
      return 'bg-green-500 text-white'
    }
    return 'bg-blue-500 text-white'
  }

  const getRelativeTime = () => {
    if (!lastSyncTime) return null
    
    const seconds = Math.floor((Date.now() - lastSyncTime) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${getColorClass()} min-w-[200px]`}
          >
            {getIcon()}
            <div className="flex-1">
              <p className="font-medium text-sm">{toastMessage}</p>
              {lastSyncTime && status === 'synced' && (
                <p className="text-xs opacity-90">Last sync: {getRelativeTime()}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

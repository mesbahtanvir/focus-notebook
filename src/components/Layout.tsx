'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Sidebar from './Sidebar';
import OfflineBanner from './OfflineBanner';
import { UpgradeBanner } from './UpgradeBanner';
import { ConnectionHealthMonitor } from './ConnectionHealthMonitor';

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  
  // Note: Cloud sync is now automatic via FirestoreSubscriber in layout.tsx
  
  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-stone-50 via-amber-50/30 to-sky-50/40 bg-textured text-foreground" style={{
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)'
    }}>
      <OfflineBanner />
      <UpgradeBanner />
      <ConnectionHealthMonitor />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 md:p-12 lg:p-16 pt-12 lg:pt-8" role="main" aria-label="Main content area">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-card text-foreground rounded-xl px-4 py-2 shadow-lg">Skip to content</a>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 2 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="max-w-6xl mx-auto"
            id="main"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

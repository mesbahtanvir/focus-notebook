'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Sidebar from './Sidebar';
import Onboarding from './Onboarding';
import OfflineBanner from './OfflineBanner';
import { UpgradeBanner } from './UpgradeBanner';

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  
  // Note: Cloud sync is now automatic via FirestoreSubscriber in layout.tsx
  
  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-800">
      <OfflineBanner />
      <UpgradeBanner />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 pt-20 lg:pt-6" role="main" aria-label="Main content area">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white text-gray-900 rounded px-3 py-1 shadow-lg">Skip to content</a>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="max-w-7xl mx-auto"
            id="main"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <Onboarding />
    </div>
  );
}

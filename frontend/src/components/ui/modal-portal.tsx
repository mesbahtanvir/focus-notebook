/**
 * ModalPortal - Reusable portal wrapper for full-screen modals and overlays
 *
 * This component solves the issue where parent elements with overflow properties
 * (overflow-y-auto, overflow-hidden, etc.) create new containing blocks for
 * fixed-positioned children, preventing full-screen coverage.
 *
 * Usage:
 * ```tsx
 * import { ModalPortal } from '@/components/ui/modal-portal';
 *
 * export function MyModal({ isOpen, onClose, children }) {
 *   return (
 *     <ModalPortal isOpen={isOpen}>
 *       <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 *         <ModalPortal.Backdrop onClick={onClose} />
 *         <ModalPortal.Content>
 *           {children}
 *         </ModalPortal.Content>
 *       </div>
 *     </ModalPortal>
 *   );
 * }
 * ```
 *
 * Why this is needed:
 * - Parent elements with `overflow: auto/hidden` create new containing blocks
 * - This causes `position: fixed` to be relative to parent, not viewport
 * - Using createPortal renders directly to document.body, bypassing this constraint
 * - Ensures modals always cover the entire viewport including sidebar/header
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block
 */

'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalPortalProps {
  isOpen: boolean;
  children: ReactNode;
}

/**
 * Main portal wrapper - handles client-side mounting and portal creation
 */
export function ModalPortal({ isOpen, children }: ModalPortalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <AnimatePresence>{children}</AnimatePresence>,
    document.body
  );
}

interface BackdropProps {
  onClick?: () => void;
  className?: string;
  blur?: 'none' | 'sm' | 'md' | 'lg';
  opacity?: number;
}

/**
 * Backdrop component with consistent blur and opacity options
 * Should be rendered inside the fixed container
 */
ModalPortal.Backdrop = function Backdrop({
  onClick,
  className = '',
  blur = 'md',
  opacity = 50,
}: BackdropProps) {
  const blurClass = {
    none: '',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
  }[blur];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className={`absolute inset-0 bg-black/${opacity} ${blurClass} ${className}`.trim()}
      aria-hidden="true"
    />
  );
};

interface ContentProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Content wrapper - prevents click propagation to backdrop
 * Should be rendered inside the fixed container, after Backdrop
 */
ModalPortal.Content = function Content({
  children,
  onClick,
  className = '',
}: ContentProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
      onClick={handleClick}
      className={`relative ${className}`.trim()}
    >
      {children}
    </motion.div>
  );
};


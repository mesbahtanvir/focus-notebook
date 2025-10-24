"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Trash2, AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ReactNode;
}

const variantStyles = {
  danger: {
    iconBg: 'bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-950/30 dark:to-pink-950/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonGradient: 'bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 hover:from-red-600 hover:via-rose-600 hover:to-pink-600',
    border: 'border-red-200 dark:border-red-900/50',
  },
  warning: {
    iconBg: 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    buttonGradient: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600',
    border: 'border-orange-200 dark:border-orange-900/50',
  },
  info: {
    iconBg: 'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950/30 dark:to-cyan-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonGradient: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
    border: 'border-blue-200 dark:border-blue-900/50',
  },
};

const defaultIcons = {
  danger: <Trash2 className="h-8 w-8" />,
  warning: <AlertTriangle className="h-8 w-8" />,
  info: <AlertCircle className="h-8 w-8" />,
};

export function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'warning',
  icon,
}: ConfirmModalProps) {
  const styles = variantStyles[variant];
  const displayIcon = icon || defaultIcons[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 border-4 ${styles.border}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/20 to-pink-100/20 dark:from-purple-900/10 dark:to-pink-900/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-100/20 to-cyan-100/20 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-full blur-3xl -z-10" />

            {/* Icon */}
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", duration: 0.6 }}
              className="flex items-center justify-center"
            >
              <div className={`w-20 h-20 rounded-full ${styles.iconBg} flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-700`}>
                <div className={styles.iconColor}>
                  {displayIcon}
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                {title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all transform hover:scale-105 active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-5 py-3 rounded-xl ${styles.buttonGradient} text-white font-semibold transition-all shadow-lg transform hover:scale-105 active:scale-95`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Sparkles } from "lucide-react";

export function UpgradeBanner() {
  const { user, isAnonymous } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (isAnonymous && user) {
      // Check if banner was dismissed in last 24 hours
      const dismissedUntil = localStorage.getItem('upgradeBannerDismissedUntil');
      const now = Date.now();
      
      if (!dismissedUntil || now > parseInt(dismissedUntil)) {
        setIsVisible(true);
      }
    }
  }, [isAnonymous, user]);

  const handleDismiss = () => {
    const dismissedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    localStorage.setItem('upgradeBannerDismissedUntil', dismissedUntil.toString());
    setIsVisible(false);
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };

  if (!isAnonymous || !isVisible) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg"
          >
            {/* Account for sidebar width on different screen sizes */}
            <div className="ml-0 lg:ml-20 xl:ml-64">
              <div className="px-4 py-2 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-xs font-medium">
                    Temporary account active — <button onClick={handleUpgrade} className="underline font-semibold hover:no-underline">Create permanent account</button>
                  </p>
                  <button
                    onClick={handleDismiss}
                    className="ml-2 p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </>
  );
}

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { signInWithGoogle, linkAnonymousToEmail, signInWithEmail } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleUpgrade = async () => {
    try {
      setError(null);
      await signInWithGoogle();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to link with Google');
    }
  };

  const handleEmailUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Create email account and link
        await linkAnonymousToEmail(email, password);
      } else {
        // Sign in with email (will fail if email doesn't exist)
        try {
          await signInWithEmail(email, password);
        } catch (error: any) {
          if (error.message.includes('user-not-found')) {
            // Create account and link
            await linkAnonymousToEmail(email, password);
          } else {
            throw error;
          }
        }
      }
      onClose();
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to upgrade account';
      
      if (errorMessage.includes('email-already-in-use')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (errorMessage.includes('weak-password')) {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (errorMessage.includes('invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 p-6 border-b-4 border-yellow-400 dark:border-yellow-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Permanent Account
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              ✨ What you&apos;ll get:
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Keep your data forever - never lose your work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Access from any device - phone, tablet, computer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Priority support and new features first</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Email reminders and notifications</span>
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {!showEmailForm ? (
            /* Create Account Options */
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Choose how to create your account:
              </p>

              {/* Google Upgrade */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleUpgrade}
                className="w-full py-3 px-4 rounded-xl border-2 border-gray-300 hover:border-purple-300 flex items-center justify-center gap-3 transition-all"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-semibold">Continue with Google</span>
              </motion.button>

              {/* Email Upgrade */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowEmailForm(true)}
                className="w-full py-3 px-4 rounded-xl border-2 border-gray-300 hover:border-purple-300 flex items-center justify-center gap-3 transition-all"
              >
                <span className="text-2xl">📧</span>
                <span className="font-semibold">Use Email</span>
              </motion.button>
            </div>
          ) : (
            /* Email Form */
            <form onSubmit={handleEmailUpgrade} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setError(null);
                }}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  required
                  minLength={6}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}


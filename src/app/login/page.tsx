"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { LogIn, Zap } from "lucide-react";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Failed to sign in:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6 md:space-y-8"
      >
        {/* Logo/Header */}
        <div className="text-center space-y-3 md:space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl"
          >
            <Zap className="h-8 w-8 md:h-10 md:w-10" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            ✨ Focus Notebook
          </h1>
          <p className="text-gray-600 text-base md:text-lg px-4">
            Your personal companion for growth and productivity
          </p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 border-4 border-purple-200"
        >
          <div className="space-y-3 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              👋 Welcome Back!
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Sign in to sync your tasks, thoughts, and focus sessions across all your devices
            </p>
          </div>

          {/* Google Sign In Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleSignIn}
            className="w-full py-3 md:py-4 px-4 md:px-6 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-purple-300 transition-all shadow-md hover:shadow-lg"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </motion.button>

          {/* Features */}
          <div className="pt-6 border-t-2 border-purple-100 space-y-3">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="text-lg">🎁</span>
              What you&apos;ll get:
            </p>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3 p-2 rounded-lg bg-green-50 border border-green-200">
                <span className="text-green-600 font-bold text-lg">✓</span>
                <span className="font-medium">Sync across all your devices</span>
              </li>
              <li className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-blue-600 font-bold text-lg">✓</span>
                <span className="font-medium">Secure cloud backup</span>
              </li>
              <li className="flex items-center gap-3 p-2 rounded-lg bg-purple-50 border border-purple-200">
                <span className="text-purple-600 font-bold text-lg">✓</span>
                <span className="font-medium">Access from anywhere</span>
              </li>
              <li className="flex items-center gap-3 p-2 rounded-lg bg-pink-50 border border-pink-200">
                <span className="text-pink-600 font-bold text-lg">✓</span>
                <span className="font-medium">Never lose your data</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Privacy Note */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <span className="text-lg">🔐</span>
            We respect your privacy. Your data is encrypted and secure.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

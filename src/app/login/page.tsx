"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";

type AuthMode = 'select' | 'email' | 'google';

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInAnonymously, signInWithEmail, signUpWithEmail, sendPasswordResetEmail } = useAuth();
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>('select');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setError(null);
      await signInAnonymously();
      router.push('/');
    } catch (error: any) {
      setError(error.message || 'Failed to sign in anonymously');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setSuccessMessage('Account created successfully! Redirecting...');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Authentication failed';
      
      // User-friendly error messages
      if (errorMessage.includes('user-not-found')) {
        errorMessage = 'No account found with this email. Try signing up instead.';
      } else if (errorMessage.includes('wrong-password')) {
        errorMessage = 'Incorrect password. Try again or use "Forgot Password?".';
      } else if (errorMessage.includes('email-already-in-use')) {
        errorMessage = 'This email is already registered. Try signing in instead.';
      } else if (errorMessage.includes('weak-password')) {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (errorMessage.includes('invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      }
      
      setError(errorMessage);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      setError(null);
      await sendPasswordResetEmail(email);
      setSuccessMessage('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      setError(error.message || 'Failed to send password reset email');
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
          <AnimatePresence mode="wait">
            {authMode === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-3 text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                    👋 Welcome Back!
                  </h2>
                  <p className="text-gray-600 text-sm md:text-base">
                    Choose how you&apos;d like to sign in
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
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Recommended</span>
                </motion.button>

                {/* Email Sign In Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAuthMode('email')}
                  className="w-full py-3 md:py-4 px-4 md:px-6 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold flex items-center justify-center gap-3 hover:border-purple-300 transition-all"
                >
                  <Mail className="h-5 w-5" />
                  Continue with Email
                </motion.button>

                {/* Anonymous Sign In */}
                <div className="pt-4 border-t-2 border-gray-200">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAnonymousSignIn}
                    className="w-full py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    🚀 Try First (Anonymous)
                  </motion.button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Start immediately • Data synced temporarily • Upgrade anytime
                  </p>
                </div>
              </motion.div>
            )}

            {authMode === 'email' && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleEmailAuth}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('select');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {isSignUp ? 'Sign up to sync your data across devices' : 'Sign in to access your account'}
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    data-testid="email-auth-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2"
                  >
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </motion.div>
                )}

                {/* Success Message */}
                {successMessage && (
                  <motion.div
                    data-testid="email-auth-success"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-green-50 border border-green-200"
                  >
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </motion.div>
                )}

                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? "At least 6 characters" : "Your password"}
                      className="w-full pl-4 pr-10 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium text-right w-full"
                  >
                    Forgot Password?
                  </button>
                )}

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </motion.button>

                {/* Toggle Sign Up/Sign In */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don&apos;t have an account? Sign up"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Features */}
          {authMode === 'select' && (
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
          )}
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

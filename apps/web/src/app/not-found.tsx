'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-blue-950/20 p-4">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-300 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8 max-w-2xl">
        {/* 404 Number */}
        <div className="relative">
          <div className="text-9xl md:text-[12rem] font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent animate-pulse">
            404
          </div>
          <div className="absolute -top-4 -right-4 md:-top-8 md:-right-8">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
              <Search className="w-8 h-8 md:w-12 md:h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Oops! Page Not Found
          </h1>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-md mx-auto">
            The page you&apos;re looking for seems to have wandered off into the digital void. 
            Let&apos;s get you back on track!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link 
            href="/" 
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 active:scale-95"
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Return Home
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-white dark:bg-gray-800 border-4 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
        </div>

        {/* Helpful Links */}
        <div className="pt-8 space-y-3">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Popular pages:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/tools" className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 font-medium hover:shadow-lg transition-all border-2 border-blue-300 dark:border-blue-700">
              🛠️ Tools
            </Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 font-medium hover:shadow-lg transition-all border-2 border-green-300 dark:border-green-700">
              📊 Dashboard
            </Link>
            <Link href="/tools/focus" className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 font-medium hover:shadow-lg transition-all border-2 border-purple-300 dark:border-purple-700">
              ⚡ Focus
            </Link>
            <Link href="/settings" className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 text-orange-700 dark:text-orange-300 font-medium hover:shadow-lg transition-all border-2 border-orange-300 dark:border-orange-700">
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const viewport = {
  themeColor: '#1f2937',
};

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, ChevronLeft } from "lucide-react";

export default function MeditationPage() {
  return (
    <div className="w-full max-w-none px-4 py-4 md:py-8">
      {/* Main Content */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
        {/* Back Button */}
        <div className="flex items-center justify-between w-full mb-16">
          <Link
            href="/tools"
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="w-9" />
        </div>

        {/* Animated Icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-xl flex items-center justify-center mb-8"
        >
          <Sparkles className="h-12 w-12 text-white" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-light text-gray-900 dark:text-gray-100 mb-4"
        >
          Meditation
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-gray-600 dark:text-gray-400 mb-16 max-w-md"
        >
          10 minutes of guided breathing and body scan meditation
        </motion.p>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/tools/meditation/session"
            className="inline-block px-16 py-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-light text-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
          >
            Begin Meditation
          </Link>
        </motion.div>

        {/* Additional Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-8 mt-12"
        >
          <Link
            href="/tools/meditation/breathing"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-light"
          >
            Breathing
          </Link>
          <Link
            href="/tools/meditation/music"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-light"
          >
            Music
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

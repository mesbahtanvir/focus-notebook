"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Wind, Music, PlayCircle } from "lucide-react";
import { ToolPageLayout, ToolHeader, toolThemes } from "@/components/tools";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";

export default function MeditationPage() {
  useTrackToolUsage('meditation');

  const theme = toolThemes.blue;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Meditation"
        emoji="🧘"
        subtitle="Mindful breathing • Guided meditation • Inner peace"
        showBackButton
        theme={theme}
      />

      {/* Main Content */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Animated Icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 shadow-2xl flex items-center justify-center"
        >
          <Sparkles className="h-16 w-16 text-white" />
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Find Your Inner Calm
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg">
            Take 10 minutes for guided breathing and body scan meditation
          </p>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            href="/tools/meditation/session"
            className="inline-flex items-center gap-3 px-12 py-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
          >
            <PlayCircle className="h-6 w-6" />
            Begin Meditation
          </Link>
        </motion.div>

        {/* Additional Options Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-16"
        >
          <Link
            href="/tools/meditation/breathing"
            className="card p-6 border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all group"
          >
            <Wind className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Breathing Exercises
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Focused breathing techniques for relaxation
            </p>
          </Link>

          <Link
            href="/tools/meditation/music"
            className="card p-6 border-2 border-cyan-200 dark:border-cyan-800 hover:shadow-lg transition-all group"
          >
            <Music className="h-8 w-8 text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Meditation Music
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Calming soundscapes and ambient music
            </p>
          </Link>
        </motion.div>
      </div>
    </ToolPageLayout>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  Target,
  Heart,
  Plane,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  Rocket,
  Lock,
  Database,
  BarChart3,
  Calendar,
  Wallet
} from "lucide-react";

export function LandingPage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/30 dark:bg-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300/30 dark:bg-pink-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-16 sm:py-24 lg:py-32">
          <motion.div
            className="text-center space-y-8"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            {/* Main Headline */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 mb-4">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                  AI-Powered Life Management
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="block bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  Your Second Brain
                </span>
                <span className="block text-gray-900 dark:text-white mt-2">
                  for Life Management
                </span>
              </h1>

              <p className="max-w-3xl mx-auto text-lg sm:text-xl text-gray-600 dark:text-gray-300">
                Plan, track, and optimize your productivity, wellbeing, finances, and travel -
                all in one beautiful workspace powered by AI
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/login"
                className="group px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 text-gray-900 dark:text-white font-semibold text-lg shadow-lg transition-all"
              >
                Learn More
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span>Privacy-first</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                <span>15+ integrated tools</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Tool Categories Showcase */}
      <section id="features" className="relative py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need in One Place
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Four powerful tool suites designed to help you thrive in every aspect of life
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Productivity Suite */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group relative rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-800 p-8 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <div className="absolute top-4 right-4 p-3 rounded-xl bg-purple-100 dark:bg-purple-900/40">
                <Target className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-12">
                Productivity
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Master your workflow with intelligent task management
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  Smart task prioritization
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  Project tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  Goal management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  Focus sessions with breaks
                </li>
              </ul>
            </motion.div>

            {/* Soulful Suite */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group relative rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-2 border-pink-200 dark:border-pink-800 p-8 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <div className="absolute top-4 right-4 p-3 rounded-xl bg-pink-100 dark:bg-pink-900/40">
                <Heart className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-12">
                Soulful
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Nurture your mental and emotional wellbeing
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-pink-500" />
                  AI thought processing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-pink-500" />
                  Mood tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-pink-500" />
                  CBT framework
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-pink-500" />
                  Relationship management
                </li>
              </ul>
            </motion.div>

            {/* Finances Suite */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="group relative rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 p-8 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <div className="absolute top-4 right-4 p-3 rounded-xl bg-green-100 dark:bg-green-900/40">
                <Wallet className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-12">
                Finances
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Take control of your financial future
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Investment tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Spending analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Subscription management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Financial modeling
                </li>
              </ul>
            </motion.div>

            {/* Travel Suite */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="group relative rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 p-8 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <div className="absolute top-4 right-4 p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Plane className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-12">
                Travel
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Plan perfect trips with smart automation
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Trip planning
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Budget tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Smart packing lists
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Itinerary management
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Powered by Intelligence
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Advanced features that make life management effortless
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Thought Processing</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically analyze thoughts and get intelligent suggestions for actions, insights, and next steps
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Visual Analytics</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Beautiful dashboards showing your progress, trends, and insights across all areas of life
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/40">
                  <Database className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import/Export</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Full data portability with preview, conflict resolution, and progress tracking
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                  <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Focus Modes</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Scientifically-designed work sessions with built-in coffee and meditation breaks
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-pink-100 dark:bg-pink-900/40">
                  <Shield className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Privacy First</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Your data belongs to you. Encrypted, secure, and fully exportable at any time
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-teal-100 dark:bg-teal-900/40">
                  <TrendingUp className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Real-time Sync</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Seamlessly sync across all your devices with instant updates and offline support
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Capture Everything
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Quickly capture thoughts, tasks, and goals as they come to you. No friction, just flow.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                AI Assists
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Let AI suggest actions, detect patterns, and surface insights you might have missed.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Track & Grow
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Visualize progress with beautiful dashboards and celebrate your wins along the way.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Ready to Transform Your Life?
            </h2>
            <p className="text-xl text-purple-100">
              Join thousands using Focus Notebook to achieve more while staying balanced
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/login"
                className="group px-8 py-4 rounded-xl bg-white text-purple-600 hover:bg-gray-100 font-bold text-lg shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Rocket className="h-5 w-5" />
                Start Your Journey
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <p className="text-sm text-purple-100">
              No credit card required • Free to start • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-4">Focus Notebook</div>
            <p className="text-sm mb-6">Your intelligent companion for life management</p>
            <div className="flex justify-center gap-6 text-sm">
              <Link href="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
              <span>•</span>
              <Link href="/profile" className="hover:text-white transition-colors">
                Pricing
              </Link>
              <span>•</span>
              <Link href="/settings/data-management" className="hover:text-white transition-colors">
                Privacy
              </Link>
            </div>
            <p className="text-xs mt-6 text-gray-500">
              © 2025 Focus Notebook. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

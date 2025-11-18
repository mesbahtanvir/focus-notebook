"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Play, 
  Pause, 
  ChevronLeft,
  Volume2,
  Sparkles,
  Wind,
  Heart,
  Music
} from "lucide-react";

interface SessionPhase {
  id: string;
  name: string;
  duration: number; // in seconds
  script: string[];
  type: 'breathing' | 'bodyscan' | 'meditation';
  icon: React.ElementType;
  color: string;
}

const sessionPhases: SessionPhase[] = [
  {
    id: 'breathing',
    name: 'Breathing',
    duration: 120, // 2 minutes
    type: 'breathing',
    icon: Wind,
    color: 'from-blue-400 to-cyan-400',
    script: [
      "Find a comfortable position and gently close your eyes.",
      "Take a deep breath in through your nose, filling your belly completely.",
      "Slowly exhale through your mouth, letting go of all tension.",
      "Continue breathing deeply and naturally.",
      "Focus on the sensation of air entering and leaving your body.",
      "Each breath brings you deeper into relaxation.",
      "Notice the gentle rise and fall of your chest or belly.",
      "You are exactly where you need to be right now.",
      "Let each breath anchor you in the present moment.",
      "Your breathing becomes slower, deeper, more peaceful."
    ]
  },
  {
    id: 'bodyscan',
    name: 'Body Scan',
    duration: 480, // 8 minutes
    type: 'bodyscan',
    icon: Heart,
    color: 'from-purple-400 to-pink-400',
    script: [
      "Bring your awareness to the top of your head.",
      "Notice any sensations without trying to change them.",
      "Let your forehead and eyes soften and release tension.",
      "Relax your jaw, allowing your mouth to open slightly.",
      "Feel your neck and shoulders releasing any held stress.",
      "Your arms feel heavy and relaxed from shoulders to fingertips.",
      "Notice your breathing in your chest, gentle and natural.",
      "Your back feels supported and completely at ease.",
      "Your belly rises and falls with each peaceful breath.",
      "Hips and legs release tension, becoming heavy and relaxed.",
      "Feel the warmth and relaxation flowing down to your feet.",
      "Your entire body is sinking deeper into comfort.",
      "Every muscle, every cell, is letting go and relaxing.",
      "You are surrounded by a deep sense of peace and calm.",
      "Rest in this beautiful state of complete relaxation."
    ]
  },
  {
    id: 'meditation',
    name: 'Meditation',
    duration: 600, // 10 minutes total (we're already 10 minutes in)
    type: 'meditation',
    icon: Sparkles,
    color: 'from-indigo-400 to-purple-400',
    script: [
      "Allow your attention to rest on your breath.",
      "You don't need to change anything, just notice.",
      "Thoughts may come and go like clouds in the sky.",
      "You are the observer, not the thoughts themselves.",
      "Each breath brings you back to this peaceful moment.",
      "Feel the gentle rhythm of life within you.",
      "You are safe, you are peaceful, you are enough.",
      "Rest in the stillness between the breaths.",
      "This moment is perfect exactly as it is.",
      "You are experiencing deep peace and tranquility."
    ]
  }
];

export default function SessionPage() {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const [showComplete, setShowComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhase = sessionPhases[currentPhaseIndex];
  const totalDuration = 600; // 10 minutes in seconds
  const elapsedTime = sessionPhases
    .slice(0, currentPhaseIndex)
    .reduce((sum, phase) => sum + phase.duration, 0) + 
    (currentPhase.duration - timeRemaining);

  // Calculate time per script section
  const timePerSection = currentPhase.duration / currentPhase.script.length;

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    setTimeRemaining(timePerSection);

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCurrentScriptIndex((index) => {
            const nextIndex = index + 1;
            if (nextIndex >= currentPhase.script.length) {
              // Move to next phase or complete
              setCurrentPhaseIndex((phaseIndex) => {
                const nextPhaseIndex = phaseIndex + 1;
                if (nextPhaseIndex >= sessionPhases.length) {
                  // Session complete
                  setIsPlaying(false);
                  setShowComplete(true);
                  return phaseIndex;
                }
                return nextPhaseIndex;
              });
              return 0;
            }
            return nextIndex;
          });
          return timePerSection; // Reset for next section
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentPhase, timePerSection]);

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentPhaseIndex(0);
    setCurrentScriptIndex(0);
    setShowComplete(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPhaseIndex(0);
    setCurrentScriptIndex(0);
    setTimeRemaining(timePerSection);
    setShowComplete(false);
  };

  const progress = (elapsedTime / totalDuration) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-indigo-400/20 to-pink-400/20 blur-3xl"
            style={{
              width: `${200 + i * 40}px`,
              height: `${200 + i * 40}px`,
              left: `${15 + i * 10}%`,
              top: `${10 + i * 8}%`,
            }}
            animate={{
              x: [0, 25, -20, 0],
              y: [0, -20, 25, 0],
              scale: [1, 1.3, 0.8, 1],
            }}
            transition={{
              duration: 14 + i * 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            10-Minute Meditation
          </h1>
          <button className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-colors">
            <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Session Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')} / 10:00</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {/* Phase Indicators */}
          <div className="flex items-center justify-between mt-4">
            {sessionPhases.map((phase, index) => {
              const PhaseIcon = phase.icon;
              const isActive = index === currentPhaseIndex;
              const isCompleted = index < currentPhaseIndex;
              
              return (
                <div key={phase.id} className="flex flex-col items-center">
                  <motion.div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                        ? `bg-gradient-to-r ${phase.color} text-white shadow-lg scale-110` 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                    whileHover={{ scale: isActive ? 1.15 : 1.05 }}
                  >
                    <PhaseIcon className="h-6 w-6" />
                  </motion.div>
                  <span className={`text-xs mt-1 font-medium ${
                    isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {phase.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Session Area */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-gray-700/20 mb-8">
          <div className="flex flex-col items-center">
            {/* Breathing Visualizer for Breathing Phase */}
            {currentPhase.type === 'breathing' && (
              <div className="relative w-48 h-48 mb-8">
                <motion.div
                  className={`absolute inset-0 rounded-full bg-gradient-to-r ${currentPhase.color} opacity-20 blur-xl`}
                  animate={{
                    scale: isPlaying ? [1, 1.3, 1] : 1,
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className={`absolute inset-4 rounded-full bg-gradient-to-r ${currentPhase.color} opacity-40 blur-lg`}
                  animate={{
                    scale: isPlaying ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className={`absolute inset-8 rounded-full bg-gradient-to-r ${currentPhase.color} shadow-xl flex items-center justify-center`}
                  animate={{
                    scale: isPlaying ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <currentPhase.icon className="h-8 w-8 text-white" />
                </motion.div>
              </div>
            )}

            {/* Meditation Visualizer for Other Phases */}
            {currentPhase.type !== 'breathing' && (
              <div className="relative w-48 h-48 mb-8">
                <motion.div
                  className={`absolute inset-0 rounded-full bg-gradient-to-r ${currentPhase.color} opacity-20 blur-xl`}
                  animate={{
                    scale: isPlaying ? [1, 1.4, 1] : 1,
                    rotate: isPlaying ? 360 : 0,
                  }}
                  transition={{
                    scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 30, repeat: Infinity, ease: "linear" }
                  }}
                />
                <motion.div
                  className={`absolute inset-4 rounded-full bg-gradient-to-r ${currentPhase.color} opacity-40 blur-lg`}
                  animate={{
                    scale: isPlaying ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className={`absolute inset-8 rounded-full bg-gradient-to-r ${currentPhase.color} shadow-xl flex items-center justify-center`}
                  animate={{
                    scale: isPlaying ? [1, 1.05, 1] : 1,
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <currentPhase.icon className="h-8 w-8 text-white" />
                </motion.div>
              </div>
            )}

            {/* Current Script Text */}
            <div className="w-full max-w-2xl mb-8 min-h-[80px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentPhaseIndex}-${currentScriptIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                    {currentPhase.script[currentScriptIndex]}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {!isPlaying ? (
                <button
                  onClick={handleStart}
                  className={`px-8 py-3 rounded-xl bg-gradient-to-r ${currentPhase.color} text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2`}
                >
                  <Play className="h-5 w-5" />
                  {showComplete ? 'Start Again' : 'Begin Session'}
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <Pause className="h-5 w-5" />
                  Pause
                </button>
              )}
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
              >
                Reset
              </button>
            </div>

            {/* Completion Message */}
            <AnimatePresence>
              {showComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-medium">
                      Session complete! Take a moment to notice how you feel.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Simple Tips */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Find a quiet space, get comfortable, and let the guidance lead you through a peaceful 10-minute journey.
          </p>
        </div>
      </div>
    </div>
  );
}

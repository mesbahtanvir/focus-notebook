"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Wind, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  ChevronLeft,
  Heart,
  Activity,
  Volume2,
  VolumeX
} from "lucide-react";

interface BreathingPattern {
  id: string;
  name: string;
  description: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  cycles?: number;
  color: string;
}

const breathingPatterns: BreathingPattern[] = [
  {
    id: "box",
    name: "Box Breathing",
    description: "Balanced breathing for focus and calm",
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
    color: "from-blue-400 to-cyan-400"
  },
  {
    id: "478",
    name: "4-7-8 Breathing",
    description: "Deep relaxation and stress relief",
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0,
    color: "from-purple-400 to-pink-400"
  },
  {
    id: "coherent",
    name: "Coherent Breathing",
    description: "Heart rate variability and balance",
    inhale: 5,
    hold1: 0,
    exhale: 5,
    hold2: 0,
    color: "from-green-400 to-teal-400"
  },
  {
    id: "wimhof",
    name: "Wim Hof Method",
    description: "Energizing and immune-boosting",
    inhale: 2,
    hold1: 0,
    exhale: 1,
    hold2: 15,
    cycles: 3,
    color: "from-orange-400 to-red-400"
  }
];

export default function BreathingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>(breathingPatterns[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.3);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPhaseRef = useRef<string>('');

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play sound for phase transitions
  const playPhaseSound = (phase: string) => {
    if (!soundEnabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Different tones for different phases
    switch (phase) {
      case 'inhale':
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4 - gentle rising
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        break;
      case 'hold1':
      case 'hold2':
        oscillator.frequency.setValueAtTime(528, ctx.currentTime); // C5 - soft hold
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        break;
      case 'exhale':
        oscillator.frequency.setValueAtTime(349, ctx.currentTime); // F4 - gentle falling
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        break;
    }

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1);
  };

  // Play continuous background tone
  const playBackgroundTone = () => {
    if (!soundEnabled || !audioContextRef.current || !isPlaying) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(174, ctx.currentTime); // Low F3 - very subtle
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.05, ctx.currentTime + 2);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 10);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 10);
  };

  // Play sound when phase changes
  useEffect(() => {
    if (currentPhase !== lastPhaseRef.current) {
      playPhaseSound(currentPhase);
      lastPhaseRef.current = currentPhase;
    }
  }, [currentPhase, soundEnabled, volume]);

  // Play background tone periodically
  useEffect(() => {
    if (!isPlaying) return;

    const toneInterval = setInterval(() => {
      playBackgroundTone();
    }, 12000); // Every 12 seconds

    // Play initial tone
    playBackgroundTone();

    return () => clearInterval(toneInterval);
  }, [isPlaying, soundEnabled, volume]);

  // Default to box breathing for simplicity
  useEffect(() => {
    setSelectedPattern(breathingPatterns[0]);
  }, []);

  // Breathing logic
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    let phaseTime = 0;
    switch (currentPhase) {
      case 'inhale':
        phaseTime = selectedPattern.inhale;
        break;
      case 'hold1':
        phaseTime = selectedPattern.hold1;
        break;
      case 'exhale':
        phaseTime = selectedPattern.exhale;
        break;
      case 'hold2':
        phaseTime = selectedPattern.hold2;
        break;
    }

    if (phaseTime === 0) {
      moveToNextPhase();
      return;
    }

    setTimeRemaining(phaseTime);

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          moveToNextPhase();
          return phaseTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentPhase, selectedPattern]);

  const moveToNextPhase = () => {
    setCurrentPhase((prev) => {
      switch (prev) {
        case 'inhale':
          return selectedPattern.hold1 > 0 ? 'hold1' : 'exhale';
        case 'hold1':
          return 'exhale';
        case 'exhale':
          return selectedPattern.hold2 > 0 ? 'hold2' : 'inhale';
        case 'hold2':
          setCurrentCycle((cycle) => {
            const nextCycle = cycle + 1;
            if (selectedPattern.cycles && nextCycle >= selectedPattern.cycles) {
              setIsPlaying(false);
              setCompletedCycles(nextCycle);
              return 0;
            }
            return nextCycle;
          });
          return 'inhale';
        default:
          return 'inhale';
      }
    });
  };

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentCycle(0);
    setCompletedCycles(0);
    setCurrentPhase('inhale');
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPhase('inhale');
    setCurrentCycle(0);
    setCompletedCycles(0);
    setTimeRemaining(selectedPattern.inhale);
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'inhale':
        return 'Breathe In';
      case 'hold1':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
      case 'hold2':
        return 'Hold';
      default:
        return 'Ready';
    }
  };

  const getCircleScale = () => {
    let phaseProgress = 0;
    let targetScale = 1;
    
    switch (currentPhase) {
      case 'inhale':
        phaseProgress = (selectedPattern.inhale - timeRemaining) / selectedPattern.inhale;
        targetScale = 1 + phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
        break;
      case 'hold1':
        targetScale = 2;
        break;
      case 'exhale':
        phaseProgress = (selectedPattern.exhale - timeRemaining) / selectedPattern.exhale;
        targetScale = 2 - phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
        break;
      case 'hold2':
        targetScale = 1;
        break;
      default:
        targetScale = 1;
    }
    
    return targetScale;
  };

  const getAnimationDuration = () => {
    // Even longer, more natural duration for ultra-smooth transitions
    switch (currentPhase) {
      case 'inhale':
      case 'exhale':
        return 2.0; // Much slower transitions for breathing
      case 'hold1':
      case 'hold2':
        return 2.5; // Extra gentle during holds
      default:
        return 1.5;
    }
  };

  const getAnimationEasing = () => {
    switch (currentPhase) {
      case 'inhale':
        return [0.1, 0.3, 0.4, 0.96]; // Ultra-gentle ease-out for inhale
      case 'exhale':
        return [0.7, 0.1, 0.8, 0.4]; // Ultra-gentle ease-in for exhale
      case 'hold1':
      case 'hold2':
        return [0.3, 0.05, 0.7, 0.96]; // Extra gentle ease-in-out for holds
      default:
        return "easeInOut";
    }
  };

  return (
    <div className="w-full max-w-none px-4 py-4 md:py-8">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] max-w-2xl mx-auto">
        {/* Minimal Header */}
        <div className="flex items-center justify-between w-full mb-16">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-light text-gray-700 dark:text-gray-300">
            Box Breathing
          </h1>
          <div className="w-9" />
        </div>

        {/* Main Breathing Circle */}
        <div className="flex flex-col items-center">
          <div className="relative w-96 h-96 mb-12">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 blur-xl"
              animate={{
                scale: getCircleScale(),
              }}
              transition={{
                duration: getAnimationDuration(),
                ease: getAnimationEasing(),
                type: "tween"
              }}
            />
            <motion.div
              className="absolute inset-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-40 blur-lg"
              animate={{
                scale: getCircleScale(),
              }}
              transition={{
                duration: getAnimationDuration() * 0.85, // Slightly faster for inner layer
                ease: getAnimationEasing(),
                type: "tween"
              }}
            />
            <motion.div
              className="absolute inset-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-2xl flex items-center justify-center"
              animate={{
                scale: getCircleScale(),
              }}
              transition={{
                duration: getAnimationDuration() * 0.7, // Faster for center layer
                ease: getAnimationEasing(),
                type: "tween"
              }}
            >
              <div className="text-center text-white">
                <motion.div 
                  className="text-3xl font-light mb-2"
                  animate={{
                    opacity: currentPhase === 'hold1' || currentPhase === 'hold2' ? 0.6 : 1
                  }}
                  transition={{ duration: 0.8 }} // Slower text transition
                >
                  {getPhaseText()}
                </motion.div>
                <motion.div 
                  className="text-7xl font-thin"
                  animate={{
                    scale: currentPhase === 'inhale' ? 1.05 : currentPhase === 'exhale' ? 0.95 : 1
                  }}
                  transition={{ duration: 0.5 }} // Slower timer animation
                >
                  {timeRemaining}
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Minimal Controls */}
          <div className="flex items-center gap-6 mb-8">
            {!isPlaying ? (
              <button
                onClick={handleStart}
                className="px-12 py-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-light text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                Begin
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-12 py-4 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-light text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                Pause
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-8 py-4 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-light hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Reset
            </button>
          </div>

          {/* Sound Controls */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-3 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              )}
            </button>
            {soundEnabled && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Simple Completion Message */}
          <AnimatePresence>
            {completedCycles > 0 && !isPlaying && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-600 dark:text-gray-400 font-light">
                  Complete. Take a moment to notice how you feel.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

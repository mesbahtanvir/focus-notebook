"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Brain, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft,
  Volume2,
  Heart,
  Moon,
  Sun,
  Sparkles
} from "lucide-react";

interface GuidedSession {
  id: string;
  name: string;
  description: string;
  duration: number;
  type: 'mindfulness' | 'bodyscan' | 'sleep' | 'lovingkindness' | 'walking';
  script: string[];
  color: string;
  icon: React.ElementType;
}

const guidedSessions: GuidedSession[] = [
  {
    id: "mindfulness",
    name: "Mindfulness Meditation",
    description: "Present moment awareness and non-judgmental observation",
    duration: 15,
    type: "mindfulness",
    color: "from-blue-400 to-cyan-400",
    icon: Brain,
    script: [
      "Find a comfortable position, either sitting on a cushion or chair.",
      "Gently close your eyes or lower your gaze.",
      "Take three deep breaths, inhaling through your nose and exhaling through your mouth.",
      "Bring your attention to the sensation of breathing in your body.",
      "Notice the rise and fall of your chest or belly with each breath.",
      "When your mind wanders, gently return your attention to your breath.",
      "Observe your thoughts without judgment, letting them come and go.",
      "Notice any sensations in your body without trying to change them.",
      "If emotions arise, acknowledge them with kindness and let them pass.",
      "Return again and again to the present moment through your breath.",
      "You are doing perfectly. There is no way to fail at meditation.",
      "Simply being here, aware, is enough.",
      "Take one more deep breath and gently open your eyes when ready."
    ]
  },
  {
    id: "bodyscan",
    name: "Body Scan Meditation",
    description: "Progressive relaxation and body awareness",
    duration: 20,
    type: "bodyscan",
    color: "from-purple-400 to-pink-400",
    icon: Heart,
    script: [
      "Lie down comfortably on your back with your arms at your sides.",
      "Take a few deep breaths to settle into your body.",
      "Bring your awareness to the top of your head.",
      "Notice any sensations without trying to change them.",
      "Slowly move your attention down to your forehead and eyes.",
      "Soften the muscles around your eyes and jaw.",
      "Bring awareness to your neck and shoulders, allowing them to relax.",
      "Feel the breath moving in your chest and belly.",
      "Notice your arms and hands, from shoulders to fingertips.",
      "Bring attention to your hips, legs, and feet.",
      "Scan your entire body, noticing areas of tension and ease.",
      "Breathe into any areas of tension, allowing them to soften.",
      "Feel your whole body breathing as one unit.",
      "When you're ready, slowly wiggle your fingers and toes.",
      "Gently open your eyes and take a moment before moving."
    ]
  },
  {
    id: "sleep",
    name: "Sleep Story",
    description: "Gentle guidance into restful sleep",
    duration: 25,
    type: "sleep",
    color: "from-indigo-400 to-purple-400",
    icon: Moon,
    script: [
      "Lie down in your most comfortable position.",
      "Take a deep breath in and a long sigh out.",
      "Imagine yourself in a peaceful garden at twilight.",
      "The air is warm and fragrant with night-blooming flowers.",
      "You can hear crickets beginning their evening song.",
      "Find a soft patch of grass and let your body fully relax.",
      "Feel the earth supporting you completely.",
      "Watch as the first stars begin to appear in the darkening sky.",
      "Each breath helps you sink deeper into relaxation.",
      "Your thoughts become like clouds drifting across the night sky.",
      "You are safe, you are peaceful, you are ready for rest.",
      "The garden fades away as you drift toward sleep.",
      "Sweet dreams await you in this peaceful state.",
      "Let go completely into the comfort of rest."
    ]
  },
  {
    id: "lovingkindness",
    name: "Loving-Kindness Meditation",
    description: "Cultivating compassion for yourself and others",
    duration: 18,
    type: "lovingkindness",
    color: "from-pink-400 to-rose-400",
    icon: Heart,
    script: [
      "Sit comfortably and take a few gentle breaths.",
      "Bring to mind someone you love unconditionally.",
      "Silently repeat: May you be happy, may you be healthy.",
      "May you be safe, may you live with ease.",
      "Now bring these wishes to yourself.",
      "May I be happy, may I be healthy.",
      "May I be safe, may I live with ease.",
      "Think of someone neutral in your life.",
      "May you be happy, may you be healthy.",
      "May you be safe, may you live with ease.",
      "Now bring to mind someone with whom you have difficulty.",
      "May you be happy, may you be healthy.",
      "May you be safe, may you live with ease.",
      "Finally, extend these wishes to all beings everywhere.",
      "May all beings be happy, may all beings be peaceful.",
      "Take a deep breath and feel the warmth of compassion in your heart."
    ]
  },
  {
    id: "walking",
    name: "Walking Meditation",
    description: "Mindful movement and body awareness",
    duration: 12,
    type: "walking",
    color: "from-green-400 to-teal-400",
    icon: Sun,
    script: [
      "Find a space where you can walk 10-15 steps in one direction.",
      "Stand still for a moment and feel your feet on the ground.",
      "Take a deep breath and bring awareness to your body.",
      "Begin walking slowly, paying attention to each step.",
      "Notice the lifting of your foot, the movement through air.",
      "Feel the contact of your foot with the ground.",
      "Walk with intention, each step a complete movement.",
      "When your mind wanders, gently return to the sensation of walking.",
      "Notice the sounds around you without getting caught in them.",
      "Feel the air on your skin and the temperature of the environment.",
      "At the end of your path, pause mindfully before turning.",
      "Each step is an opportunity to arrive in the present moment.",
      "You are practicing mindfulness with every movement.",
      "After your final step, stand still and notice how you feel."
    ]
  }
];

function GuidedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSession, setSelectedSession] = useState<GuidedSession>(guidedSessions[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const type = searchParams.get('type');
    const duration = searchParams.get('duration');
    
    if (type) {
      const foundSession = guidedSessions.find(s => s.id === type);
      if (foundSession) {
        setSelectedSession(foundSession);
      }
    }
  }, [searchParams]);

  // Calculate time per script section
  const timePerSection = selectedSession.duration * 60 / selectedSession.script.length;

  // Session logic
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
            if (nextIndex >= selectedSession.script.length) {
              // Session complete
              setIsPlaying(false);
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
  }, [isPlaying, selectedSession, timePerSection]);

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentScriptIndex(0);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentScriptIndex(0);
    setTimeRemaining(timePerSection);
  };

  const progress = ((currentScriptIndex + 1) / selectedSession.script.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-indigo-950/20">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-3xl"
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
            Guided Meditation
          </h1>
          <button className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-colors">
            <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Session Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {guidedSessions.map((session) => {
            const IconComponent = session.icon;
            return (
              <button
                key={session.id}
                onClick={() => {
                  setSelectedSession(session);
                  handleReset();
                }}
                disabled={isPlaying}
                className={`p-4 rounded-xl font-medium transition-all transform hover:scale-105 ${
                  selectedSession.id === session.id
                    ? `bg-gradient-to-r ${session.color} text-white shadow-lg`
                    : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <IconComponent className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-bold">{session.name}</div>
                    <div className="text-xs opacity-80">{session.duration} minutes</div>
                  </div>
                </div>
                <div className="text-xs opacity-80 text-left">{session.description}</div>
              </button>
            );
          })}
        </div>

        {/* Main Session Player */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-gray-700/20 mb-8">
          <div className="flex flex-col items-center">
            {/* Session Visual */}
            <div className="relative w-48 h-48 mb-8">
              <motion.div
                className={`absolute inset-0 rounded-full bg-gradient-to-r ${selectedSession.color} opacity-20 blur-xl`}
                animate={{
                  scale: isPlaying ? [1, 1.2, 1] : 1,
                  rotate: isPlaying ? 360 : 0,
                }}
                transition={{
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                }}
              />
              <motion.div
                className={`absolute inset-4 rounded-full bg-gradient-to-r ${selectedSession.color} opacity-40 blur-lg`}
                animate={{
                  scale: isPlaying ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className={`absolute inset-8 rounded-full bg-gradient-to-r ${selectedSession.color} shadow-xl flex items-center justify-center`}
                animate={{
                  scale: isPlaying ? [1, 1.05, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <selectedSession.icon className="h-12 w-12 text-white" />
              </motion.div>
            </div>

            {/* Current Script Text */}
            <div className="w-full max-w-2xl mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScriptIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedSession.script[currentScriptIndex]}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mb-6">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>{currentScriptIndex + 1} of {selectedSession.script.length}</span>
                <span>{Math.floor(progress)}% complete</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Time Remaining */}
            <div className="text-center mb-6">
              <div className="text-3xl font-mono text-gray-700 dark:text-gray-300">
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {Math.floor((selectedSession.duration * 60 - (currentScriptIndex * timePerSection + (timePerSection - timeRemaining))) / 60)} minutes remaining
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {!isPlaying ? (
                <button
                  onClick={handleStart}
                  className={`px-8 py-3 rounded-xl bg-gradient-to-r ${selectedSession.color} text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2`}
                >
                  <Play className="h-5 w-5" />
                  Start Session
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
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>

            {/* Completion Message */}
            <AnimatePresence>
              {currentScriptIndex >= selectedSession.script.length - 1 && !isPlaying && (
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

        {/* Tips */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Meditation Tips
          </h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Find a quiet space where you won&apos;t be disturbed</li>
            <li>• Turn off notifications on your devices</li>
            <li>• Sit or lie in a comfortable but alert position</li>
            <li>• It&apos;s normal for your mind to wander - gently return to the guidance</li>
            <li>• Be patient and kind with yourself throughout the practice</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function GuidedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <GuidedPageContent />
    </Suspense>
  );
}

"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMoods } from "@/store/useMoods";

// Comprehensive emotions based on "Feeling Good" book by David Burns and CBT principles
const FEELING_GOOD_EMOTIONS = [
  // Sadness & Depression
  { id: 'sad', label: '😢 Sad', color: 'from-blue-400 to-blue-600' },
  { id: 'depressed', label: '😔 Depressed', color: 'from-blue-500 to-indigo-600' },
  { id: 'hopeless', label: '😞 Hopeless', color: 'from-gray-500 to-gray-700' },
  { id: 'empty', label: '😶 Empty', color: 'from-gray-400 to-slate-500' },
  { id: 'lonely', label: '🥺 Lonely', color: 'from-indigo-400 to-blue-500' },
  { id: 'isolated', label: '😔 Isolated', color: 'from-blue-400 to-purple-500' },
  
  // Anxiety & Fear
  { id: 'anxious', label: '😰 Anxious', color: 'from-yellow-400 to-orange-500' },
  { id: 'worried', label: '😟 Worried', color: 'from-amber-400 to-yellow-500' },
  { id: 'stressed', label: '😓 Stressed', color: 'from-orange-400 to-amber-500' },
  { id: 'nervous', label: '😬 Nervous', color: 'from-yellow-500 to-orange-400' },
  { id: 'scared', label: '😨 Scared', color: 'from-yellow-300 to-orange-400' },
  { id: 'panicked', label: '😱 Panicked', color: 'from-red-300 to-orange-400' },
  { id: 'overwhelmed', label: '😵 Overwhelmed', color: 'from-orange-500 to-red-400' },
  
  // Anger & Frustration
  { id: 'angry', label: '😠 Angry', color: 'from-red-500 to-red-700' },
  { id: 'frustrated', label: '😤 Frustrated', color: 'from-orange-500 to-red-500' },
  { id: 'irritated', label: '😒 Irritated', color: 'from-orange-400 to-red-400' },
  { id: 'annoyed', label: '😑 Annoyed', color: 'from-amber-500 to-orange-500' },
  { id: 'resentful', label: '😾 Resentful', color: 'from-red-600 to-purple-600' },
  
  // Guilt & Shame
  { id: 'guilty', label: '😔 Guilty', color: 'from-purple-500 to-indigo-600' },
  { id: 'ashamed', label: '😳 Ashamed', color: 'from-pink-500 to-red-500' },
  { id: 'embarrassed', label: '😖 Embarrassed', color: 'from-pink-400 to-red-400' },
  { id: 'regretful', label: '😣 Regretful', color: 'from-purple-400 to-pink-500' },
  
  // Low Energy & Fatigue
  { id: 'tired', label: '😴 Tired', color: 'from-slate-400 to-gray-500' },
  { id: 'exhausted', label: '😫 Exhausted', color: 'from-gray-500 to-slate-600' },
  { id: 'low-energy', label: '🔋 Low Energy', color: 'from-gray-400 to-blue-400' },
  { id: 'burned-out', label: '🥱 Burned Out', color: 'from-slate-500 to-gray-600' },
  { id: 'unmotivated', label: '😪 Unmotivated', color: 'from-gray-400 to-indigo-400' },
  
  // Confusion & Uncertainty
  { id: 'confused', label: '😕 Confused', color: 'from-amber-400 to-orange-400' },
  { id: 'uncertain', label: '🤔 Uncertain', color: 'from-yellow-400 to-amber-400' },
  { id: 'doubtful', label: '😐 Doubtful', color: 'from-gray-400 to-yellow-400' },
  
  // Positive Emotions
  { id: 'happy', label: '😊 Happy', color: 'from-green-400 to-emerald-500' },
  { id: 'joyful', label: '😄 Joyful', color: 'from-green-500 to-lime-500' },
  { id: 'excited', label: '🤩 Excited', color: 'from-yellow-400 to-orange-400' },
  { id: 'content', label: '😌 Content', color: 'from-teal-400 to-cyan-500' },
  { id: 'peaceful', label: '😇 Peaceful', color: 'from-blue-300 to-teal-400' },
  { id: 'grateful', label: '🙏 Grateful', color: 'from-emerald-400 to-green-500' },
  { id: 'proud', label: '😊 Proud', color: 'from-purple-400 to-pink-400' },
  { id: 'hopeful', label: '🌟 Hopeful', color: 'from-cyan-400 to-blue-400' },
  { id: 'optimistic', label: '✨ Optimistic', color: 'from-yellow-300 to-green-400' },
  { id: 'energized', label: '⚡ Energized', color: 'from-orange-300 to-yellow-400' },
  { id: 'confident', label: '💪 Confident', color: 'from-indigo-400 to-purple-500' },
  { id: 'calm', label: '🧘 Calm', color: 'from-blue-400 to-cyan-400' },
];

export default function MoodTracker() {
  const moods = useMoods((s) => s.moods);
  const addMood = useMoods((s) => s.add);

  const [value, setValue] = useState(5);
  const [note, setNote] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);

  const recent = useMemo(() => moods.slice(0, 5), [moods]);

  const toggleEmotion = (emotionId: string) => {
    setSelectedEmotions(prev => 
      prev.includes(emotionId) 
        ? prev.filter(id => id !== emotionId)
        : [...prev, emotionId]
    );
  };

  const save = async () => {
    setSaving(true);
    const emotionLabels = selectedEmotions.map(id => 
      FEELING_GOOD_EMOTIONS.find(e => e.id === id)?.label
    ).filter(Boolean).join(', ');
    
    const noteWithEmotions = selectedEmotions.length > 0 
      ? `Emotions: ${emotionLabels}\n${note}`.trim()
      : note;
    
    await addMood({ value, note: noteWithEmotions, createdAt: new Date().toISOString() });
    setSaving(false);
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 500);
    setNote("");
    setSelectedEmotions([]);
  };

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/30">
      <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/50 dark:to-pink-950/50 border-b-2 border-purple-200 dark:border-purple-800">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          💭 Mood Tracker
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400 font-medium">
          Track your emotional state based on Feeling Good principles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Emotions Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              🎭 What emotions are you feeling? ({FEELING_GOOD_EMOTIONS.length} options)
            </label>
            {selectedEmotions.length > 0 && (
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                {selectedEmotions.length} selected
              </span>
            )}
          </div>
          
          {/* Scrollable emotions container with visible scrollbar */}
          <div className="relative">
            <div 
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[500px] overflow-y-scroll p-3 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-2 border-purple-200 dark:border-purple-800 shadow-inner"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#9333ea #e5e7eb'
              }}
            >
              {FEELING_GOOD_EMOTIONS.map((emotion, index) => (
                <motion.button
                  key={emotion.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.01 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleEmotion(emotion.id)}
                  className={`p-2.5 rounded-lg border-2 transition-all text-xs font-semibold ${
                    selectedEmotions.includes(emotion.id)
                      ? `bg-gradient-to-r ${emotion.color} text-white border-transparent shadow-md`
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-600'
                  }`}
                >
                  {emotion.label}
                </motion.button>
              ))}
            </div>
            
            {/* Scroll indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none rounded-b-xl flex items-end justify-center pb-1">
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium animate-bounce">
                ↓ Scroll to see more ↓
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <p className="text-gray-500 dark:text-gray-400">
              💡 Tip: Select multiple emotions to better capture how you&apos;re feeling
            </p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {FEELING_GOOD_EMOTIONS.length} total emotions
            </p>
          </div>
        </div>

        <div className="space-y-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            📊 Mood Intensity: <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{value}/10</span>
          </label>
          <motion.input
            type="range"
            min={1}
            max={10}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full h-3 rounded-lg cursor-pointer"
            whileTap={{ scale: 0.98 }}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>😔 Low</span>
            <span>😐 Neutral</span>
            <span>😊 High</span>
          </div>
        </div>

        <div className="space-y-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="home-mood-note">
            📝 Additional Notes (optional)
          </label>
          <textarea
            id="home-mood-note"
            className="input w-full min-h-[100px] bg-white dark:bg-gray-800"
            placeholder="What's affecting your mood? What thoughts are you having?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={save} 
            disabled={saving}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg"
          >
            {saving ? '💾 Saving…' : '✨ Save Mood'}
          </Button>
          <AnimatePresence>
            {savedPulse && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="text-sm font-semibold text-green-600 dark:text-green-400"
              >
                ✅ Saved!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            📜 Recent Entries
          </h3>
          {recent.length === 0 ? (
            <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600 dark:text-gray-400">No mood entries yet</p>
              <p className="text-sm text-gray-500">Start tracking to see your patterns!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recent.map((m, index) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-lg text-purple-600 dark:text-purple-400">
                      {m.value}/10
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {m.note && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      {m.note}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

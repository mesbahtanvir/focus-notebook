"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMoods, type MoodEntry } from "@/store/useMoods";
import { useThoughts } from "@/store/useThoughts";
import { X, Trash2, ExternalLink, Brain, Plus, Smile, CheckCircle2, ArrowLeft } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import Link from "next/link";

// Emotion definitions with categories
type Emotion = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  category: string;
  isCommon?: boolean;
};

const EMOTIONS: Emotion[] = [
  // Common emotions (shown by default)
  { id: 'anxious', label: 'Anxious', emoji: '😰', color: 'from-yellow-400 to-orange-500', category: 'Anxiety', isCommon: true },
  { id: 'sad', label: 'Sad', emoji: '😢', color: 'from-blue-400 to-blue-600', category: 'Sadness', isCommon: true },
  { id: 'stressed', label: 'Stressed', emoji: '😓', color: 'from-orange-400 to-amber-500', category: 'Anxiety', isCommon: true },
  { id: 'angry', label: 'Angry', emoji: '😠', color: 'from-red-500 to-red-700', category: 'Anger', isCommon: true },
  { id: 'tired', label: 'Tired', emoji: '😴', color: 'from-slate-400 to-gray-500', category: 'Fatigue', isCommon: true },
  { id: 'happy', label: 'Happy', emoji: '😊', color: 'from-green-400 to-emerald-500', category: 'Positive', isCommon: true },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😵', color: 'from-orange-500 to-red-400', category: 'Anxiety', isCommon: true },
  { id: 'low-energy', label: 'Low Energy', emoji: '🔋', color: 'from-gray-400 to-blue-400', category: 'Fatigue', isCommon: true },
  
  // Additional emotions (shown when expanded)
  { id: 'depressed', label: 'Depressed', emoji: '😔', color: 'from-blue-500 to-indigo-600', category: 'Sadness' },
  { id: 'hopeless', label: 'Hopeless', emoji: '😞', color: 'from-gray-500 to-gray-700', category: 'Sadness' },
  { id: 'empty', label: 'Empty', emoji: '😶', color: 'from-gray-400 to-slate-500', category: 'Sadness' },
  { id: 'lonely', label: 'Lonely', emoji: '🥺', color: 'from-indigo-400 to-blue-500', category: 'Sadness' },
  { id: 'isolated', label: 'Isolated', emoji: '😔', color: 'from-blue-400 to-purple-500', category: 'Sadness' },
  { id: 'worried', label: 'Worried', emoji: '😟', color: 'from-amber-400 to-yellow-500', category: 'Anxiety' },
  { id: 'nervous', label: 'Nervous', emoji: '😬', color: 'from-yellow-500 to-orange-400', category: 'Anxiety' },
  { id: 'scared', label: 'Scared', emoji: '😨', color: 'from-yellow-300 to-orange-400', category: 'Anxiety' },
  { id: 'panicked', label: 'Panicked', emoji: '😱', color: 'from-red-300 to-orange-400', category: 'Anxiety' },
  { id: 'frustrated', label: 'Frustrated', emoji: '😤', color: 'from-orange-500 to-red-500', category: 'Anger' },
  { id: 'irritated', label: 'Irritated', emoji: '😒', color: 'from-orange-400 to-red-400', category: 'Anger' },
  { id: 'annoyed', label: 'Annoyed', emoji: '😑', color: 'from-amber-500 to-orange-500', category: 'Anger' },
  { id: 'resentful', label: 'Resentful', emoji: '😾', color: 'from-red-600 to-purple-600', category: 'Anger' },
  { id: 'guilty', label: 'Guilty', emoji: '😔', color: 'from-purple-500 to-indigo-600', category: 'Guilt' },
  { id: 'ashamed', label: 'Ashamed', emoji: '😳', color: 'from-pink-500 to-red-500', category: 'Shame' },
  { id: 'embarrassed', label: 'Embarrassed', emoji: '😖', color: 'from-pink-400 to-red-400', category: 'Shame' },
  { id: 'regretful', label: 'Regretful', emoji: '😣', color: 'from-purple-400 to-pink-500', category: 'Guilt' },
  { id: 'exhausted', label: 'Exhausted', emoji: '😫', color: 'from-gray-500 to-slate-600', category: 'Fatigue' },
  { id: 'burned-out', label: 'Burned Out', emoji: '🥱', color: 'from-slate-500 to-gray-600', category: 'Fatigue' },
  { id: 'unmotivated', label: 'Unmotivated', emoji: '😪', color: 'from-gray-400 to-indigo-400', category: 'Fatigue' },
  { id: 'confused', label: 'Confused', emoji: '😕', color: 'from-amber-400 to-orange-400', category: 'Confusion' },
  { id: 'uncertain', label: 'Uncertain', emoji: '🤔', color: 'from-yellow-400 to-amber-400', category: 'Confusion' },
  { id: 'doubtful', label: 'Doubtful', emoji: '😐', color: 'from-gray-400 to-yellow-400', category: 'Confusion' },
  { id: 'joyful', label: 'Joyful', emoji: '😄', color: 'from-green-500 to-lime-500', category: 'Positive' },
  { id: 'excited', label: 'Excited', emoji: '🤩', color: 'from-yellow-400 to-orange-400', category: 'Positive' },
  { id: 'content', label: 'Content', emoji: '😌', color: 'from-teal-400 to-cyan-500', category: 'Positive' },
  { id: 'peaceful', label: 'Peaceful', emoji: '😇', color: 'from-blue-300 to-teal-400', category: 'Positive' },
  { id: 'grateful', label: 'Grateful', emoji: '🙏', color: 'from-emerald-400 to-green-500', category: 'Positive' },
  { id: 'proud', label: 'Proud', emoji: '😊', color: 'from-purple-400 to-pink-400', category: 'Positive' },
  { id: 'hopeful', label: 'Hopeful', emoji: '🌟', color: 'from-cyan-400 to-blue-400', category: 'Positive' },
  { id: 'optimistic', label: 'Optimistic', emoji: '✨', color: 'from-yellow-300 to-green-400', category: 'Positive' },
  { id: 'energized', label: 'Energized', emoji: '⚡', color: 'from-orange-300 to-yellow-400', category: 'Positive' },
  { id: 'confident', label: 'Confident', emoji: '💪', color: 'from-indigo-400 to-purple-500', category: 'Positive' },
  { id: 'calm', label: 'Calm', emoji: '🧘', color: 'from-blue-400 to-cyan-400', category: 'Positive' },
];

const COMMON_EMOTIONS = EMOTIONS.filter(e => e.isCommon);
const ALL_EMOTIONS = EMOTIONS;

export default function MoodTrackerPage() {
  useTrackToolUsage('moodtracker');

  const router = useRouter();
  const moodsFromStore = useMoods((s) => s.moods);
  const addMood = useMoods((s) => s.add);

  const [emotionLevels, setEmotionLevels] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [showAllEmotions, setShowAllEmotions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodEntry | null>(null);

  const displayedEmotions = showAllEmotions ? ALL_EMOTIONS : COMMON_EMOTIONS;

  const moods = useMemo(() => moodsFromStore || [], [moodsFromStore]);
  const recent = useMemo(() => Array.isArray(moods) ? moods.slice(0, 5) : [], [moods]);

  const updateEmotionLevel = (emotionId: string, level: number) => {
    setEmotionLevels(prev => ({
      ...prev,
      [emotionId]: level
    }));
  };

  const getEmotionLevel = (emotionId: string) => emotionLevels[emotionId] || 0;

  const save = async () => {
    setSaving(true);
    
    // Get emotions with non-zero values
    const activeEmotions = Object.entries(emotionLevels)
      .filter(([_, level]) => level > 0)
      .map(([id, level]) => {
        const emotion = ALL_EMOTIONS.find(e => e.id === id);
        return emotion ? `${emotion.emoji} ${emotion.label}: ${level}%` : null;
      })
      .filter(Boolean);
    
    // Calculate average mood value (for the overall mood score)
    const avgValue = activeEmotions.length > 0
      ? Math.round(Object.values(emotionLevels).reduce((sum, val) => sum + val, 0) / Object.values(emotionLevels).filter(v => v > 0).length / 10)
      : 5;
    
    const emotionsSummary = activeEmotions.length > 0
      ? `Emotions:\n${activeEmotions.join('\n')}\n\n${note}`.trim()
      : note;
    
    // Get non-zero emotion dimensions
    const dimensions = Object.fromEntries(
      Object.entries(emotionLevels).filter(([_, level]) => level > 0)
    );
    
    await addMood({ 
      value: avgValue, 
      note: emotionsSummary, 
      metadata: {
        createdBy: 'manual',
        dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined
      }
    });
    
    setSaving(false);
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 500);
    setNote("");
    setEmotionLevels({});
  };

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/30">
      <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/50 dark:to-pink-950/50 border-b-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="group flex items-center justify-center p-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors" />
          </button>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              💭 Mood Tracker
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-medium">
              Track your emotional state based on Feeling Good principles
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Emotion Sliders */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            🎭 Rate Your Emotions
          </h3>
          
          {/* Compact emotion sliders - 2 columns on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {displayedEmotions.map((emotion) => {
              const level = getEmotionLevel(emotion.id);
              return (
                <motion.div
                  key={emotion.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                    level > 0 
                      ? 'bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-800' 
                      : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-lg">{emotion.emoji}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-20 truncate">
                    {emotion.label}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={level}
                    onChange={(e) => updateEmotionLevel(emotion.id, Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none 
                      [&::-webkit-slider-thumb]:w-3 
                      [&::-webkit-slider-thumb]:h-3 
                      [&::-webkit-slider-thumb]:rounded-full 
                      [&::-webkit-slider-thumb]:bg-purple-600 
                      [&::-webkit-slider-thumb]:cursor-pointer 
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-125
                      [&::-webkit-slider-thumb]:shadow-md
                      [&::-moz-range-thumb]:w-3 
                      [&::-moz-range-thumb]:h-3 
                      [&::-moz-range-thumb]:rounded-full 
                      [&::-moz-range-thumb]:bg-purple-600 
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:cursor-pointer"
                    style={{
                      background: level > 0 
                        ? `linear-gradient(to right, #9333ea 0%, #9333ea ${level}%, #e5e7eb ${level}%, #e5e7eb 100%)` 
                        : '#e5e7eb'
                    }}
                  />
                  <span className={`text-xs font-bold w-8 text-right ${
                    level > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'
                  }`}>
                    {level}
                  </span>
                </motion.div>
              );
            })}
          </div>
          
          {/* Expand/Collapse button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAllEmotions(!showAllEmotions)}
            className="w-full py-3 px-4 rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 text-purple-700 dark:text-purple-300 font-semibold flex items-center justify-center gap-2 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all"
          >
            {showAllEmotions ? (
              <>
                <span>▲</span>
                <span>Show Less ({COMMON_EMOTIONS.length} common emotions)</span>
              </>
            ) : (
              <>
                <span>▼</span>
                <span>Show All Emotions ({ALL_EMOTIONS.length} total)</span>
              </>
            )}
          </motion.button>
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

        <div className="flex items-center justify-center">
          <button
            onClick={save}
            disabled={saving}
            className="w-full max-w-md px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  💾
                </motion.div>
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Smile className="h-6 w-6" />
                <span className="text-lg">Save Mood Entry</span>
              </>
            )}
          </button>
        </div>

        {savedPulse && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold shadow-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span>Saved Successfully!</span>
            </div>
          </motion.div>
        )}

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
                  onClick={() => setSelectedMood(m)}
                  className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
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
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg line-clamp-2">
                      {m.note}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      Click for details →
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Mood Detail Modal */}
      {selectedMood && (
        <MoodDetailModal
          mood={selectedMood}
          onClose={() => setSelectedMood(null)}
        />
      )}

      {/* Quick FAB for scrolling to top / quick entry */}
      <FloatingActionButton
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Track New Mood"
        icon={<Smile className="h-6 w-6" />}
      />
    </Card>
  );
}

// Mood Detail Modal Component
function MoodDetailModal({ mood, onClose }: { mood: MoodEntry; onClose: () => void }) {
  const deleteMood = useMoods((s) => s.delete);
  const thoughts = useThoughts((s) => s.thoughts);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sourceThought = mood.metadata?.sourceThoughtId
    ? thoughts.find(t => t.id === mood.metadata?.sourceThoughtId)
    : null;

  const handleDelete = async () => {
    setDeleting(true);
    await deleteMood(mood.id);
    onClose();
  };

  // Parse dimensions from note if available
  const dimensions: { emotionId: string; label: string; emoji: string; value: number }[] = [];
  
  if (mood.metadata?.dimensions) {
    // Use stored dimensions
    Object.entries(mood.metadata.dimensions).forEach(([emotionId, value]) => {
      const emotion = EMOTIONS.find(e => e.id === emotionId);
      if (emotion && value > 0) {
        dimensions.push({
          emotionId,
          label: emotion.label,
          emoji: emotion.emoji,
          value
        });
      }
    });
  } else if (mood.note) {
    // Try to parse from note format "😰 Anxious: 80%"
    const lines = mood.note.split('\n');
    for (const line of lines) {
      const match = line.match(/([^:]+):\s*(\d+)%/);
      if (match) {
        const label = match[1].trim().split(' ').pop() || '';
        const value = parseInt(match[2]);
        const emotion = EMOTIONS.find(e => e.label.toLowerCase() === label.toLowerCase());
        if (emotion) {
          dimensions.push({
            emotionId: emotion.id,
            label: emotion.label,
            emoji: emotion.emoji,
            value
          });
        }
      }
    }
  }

  // Extract clean note (without emotion data)
  const cleanNote = mood.note
    ? mood.note.split('\n\n').slice(1).join('\n\n').trim() ||
      mood.note.split('\n').filter(line => !line.match(/([^:]+):\s*(\d+)%/)).join('\n').trim()
    : '';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Mood Entry Details
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overall Mood Score */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 rounded-xl border-2 border-purple-200 dark:border-purple-800">
            <div className="text-center">
              <div className="text-6xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {mood.value}/10
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {(() => {
                  try {
                    if (!mood.createdAt) return 'No date';
                    if (typeof mood.createdAt === 'object' && 'toDate' in mood.createdAt) {
                      return mood.createdAt.toDate().toLocaleString();
                    }
                    if (typeof mood.createdAt === 'string') {
                      return new Date(mood.createdAt).toLocaleString();
                    }
                    if (typeof mood.createdAt === 'object' && 'seconds' in mood.createdAt) {
                      return new Date(mood.createdAt.seconds * 1000).toLocaleString();
                    }
                    return new Date(mood.createdAt).toLocaleString();
                  } catch {
                    return 'Invalid date';
                  }
                })()}
              </div>
            </div>
          </div>

          {/* Source Information */}
          {mood.metadata?.sourceThoughtId && sourceThought && (
            <Link
              href={`/tools/thoughts?id=${sourceThought.id}`}
              className="block p-4 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border-2 border-indigo-300 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                      Created from Thought
                    </span>
                    <ExternalLink className="h-3 w-3 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-indigo-900 dark:text-indigo-100 line-clamp-3 leading-relaxed">
                    {sourceThought.text}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {mood.metadata?.createdBy && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Source:</strong> {mood.metadata.createdBy === 'manual' ? '✋ Manual Entry' : '🤖 AI Processing'}
            </div>
          )}

          {/* Emotion Dimensions */}
          {dimensions.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                🎭 Emotion Breakdown
              </h3>
              <div className="space-y-2">
                {dimensions
                  .sort((a, b) => b.value - a.value)
                  .map(({ emotionId, label, emoji, value }) => (
                    <div
                      key={emotionId}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <span className="text-2xl">{emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {label}
                          </span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {value}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {cleanNote && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                📝 Additional Notes
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {cleanNote}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t-4 border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <Trash2 className="h-5 w-5" />
              {deleting ? 'Deleting...' : 'Delete Entry'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-900 dark:text-gray-100 font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Mood Entry?"
        message="This will permanently delete this mood entry. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Delete"
      />
    </div>
  );
}

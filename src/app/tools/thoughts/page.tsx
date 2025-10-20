"use client";

import { useState, useMemo } from "react";
import { useThoughts, Thought, ThoughtType } from "@/store/useThoughts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Filter, 
  Brain,
  Heart,
  Frown,
  Smile,
  CheckCircle2,
  Tag,
  TrendingUp,
  Calendar
} from "lucide-react";
import { ThoughtDetailModal } from "@/components/ThoughtDetailModal";

export default function ThoughtsPage() {
  const thoughts = useThoughts((s) => s.thoughts);
  const [showNewThought, setShowNewThought] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [filterType, setFilterType] = useState<ThoughtType | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const filteredThoughts = useMemo(() => {
    let filtered = thoughts.filter(thought => {
      if (filterType !== 'all' && thought.type !== filterType) return false;
      if (!showCompleted && thought.done) return false;
      return true;
    });

    // Sort by created date, newest first
    filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return filtered;
  }, [thoughts, filterType, showCompleted]);

  const thoughtStats = useMemo(() => {
    const total = thoughts.length;
    const completed = thoughts.filter(t => t.done).length;
    const tasks = thoughts.filter(t => t.type === 'task' && !t.done).length;
    const feelingBad = thoughts.filter(t => t.type === 'feeling-bad' && !t.done).length;
    const analyzed = thoughts.filter(t => t.cbtAnalysis).length;

    return { total, completed, tasks, feelingBad, analyzed };
  }, [thoughts]);

  const getTypeIcon = (type: ThoughtType) => {
    switch (type) {
      case 'task': return <CheckCircle2 className="h-4 w-4" />;
      case 'feeling-good': return <Smile className="h-4 w-4" />;
      case 'feeling-bad': return <Frown className="h-4 w-4" />;
      case 'neutral': return <Brain className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: ThoughtType) => {
    switch (type) {
      case 'task': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'feeling-good': return 'text-green-600 bg-green-50 border-green-200';
      case 'feeling-bad': return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral': return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-2xl border-4 border-indigo-200 shadow-lg">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            💭 Thoughts
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Capture and analyze what&apos;s on your mind</p>
        </div>
        <button
          onClick={() => setShowNewThought(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:scale-105 whitespace-nowrap"
        >
          <Plus className="h-5 w-5" />
          New Thought
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <div className="rounded-xl p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 shadow-md">
          <div className="text-xs md:text-sm text-gray-600 font-medium">📊 Total</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-gray-800">{thoughtStats.total}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-md">
          <div className="text-xs md:text-sm text-blue-600 font-medium">✅ Tasks</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-blue-600">{thoughtStats.tasks}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 shadow-md">
          <div className="text-xs md:text-sm text-red-600 font-medium">🤔 Need Processing</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-red-600">{thoughtStats.feelingBad}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 shadow-md">
          <div className="text-xs md:text-sm text-purple-600 font-medium">🧠 Analyzed</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-purple-600">{thoughtStats.analyzed}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-md col-span-2 md:col-span-1">
          <div className="text-xs md:text-sm text-green-600 font-medium">✓ Completed</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-green-600">{thoughtStats.completed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 md:p-6 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">Filters</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ThoughtType | 'all')}
            className="px-4 py-2 rounded-lg border-2 border-purple-200 bg-white text-sm font-medium focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="feeling-good">Good Feelings</option>
            <option value="feeling-bad">Bad Feelings</option>
            <option value="neutral">Neutral</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer bg-white px-4 py-2 rounded-lg border-2 border-purple-200 hover:bg-purple-50 transition-colors">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-200"
            />
            Show completed
          </label>
        </div>
      </div>

      {/* Thoughts List */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg border-2 border-gray-200 inline-block">
          📝 Showing {filteredThoughts.length} of {thoughts.length} thoughts
        </div>
        <AnimatePresence>
          {filteredThoughts.map((thought) => (
            <motion.div
              key={thought.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-xl p-4 md:p-6 bg-white border-2 border-purple-200 cursor-pointer hover:shadow-lg hover:border-purple-300 transition-all transform hover:scale-[1.01]"
              onClick={() => setSelectedThought(thought)}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={thought.done}
                  onChange={(e) => {
                    e.stopPropagation();
                    useThoughts.getState().toggle(thought.id);
                  }}
                  className="h-5 w-5 rounded mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-gray-800 ${thought.done ? 'line-through text-gray-400' : ''}`}>
                    {thought.text}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${getTypeColor(thought.type)}`}>
                      {getTypeIcon(thought.type)}
                      {thought.type.replace('-', ' ')}
                    </span>
                    {thought.intensity && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Heart className="h-3 w-3 inline mr-1" />
                        Intensity: {thought.intensity}/10
                      </span>
                    )}
                    {thought.cbtAnalysis && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        <Brain className="h-3 w-3 inline mr-1" />
                        CBT Analyzed
                      </span>
                    )}
                    {thought.tags && thought.tags.length > 0 && (
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {thought.tags.join(', ')}
                      </span>
                    )}
                    <span className="text-xs text-gray-600 flex items-center gap-1 ml-auto">
                      <Calendar className="h-3 w-3" />
                      {new Date(thought.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredThoughts.length === 0 && (
          <div className="rounded-2xl p-12 text-center bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-200 shadow-lg">
            <Brain className="h-16 w-16 mx-auto text-purple-400 mb-4" />
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">No thoughts found</h3>
            <p className="text-gray-600 mb-6">
              {thoughts.length === 0 
                ? "💭 Capture your first thought to get started"
                : "🔍 Try adjusting your filters"
              }
            </p>
            {thoughts.length === 0 && (
              <button
                onClick={() => setShowNewThought(true)}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              >
                ✨ Create Thought
              </button>
            )}
          </div>
        )}
      </div>

      {/* New Thought Modal */}
      {showNewThought && (
        <NewThoughtModal onClose={() => setShowNewThought(false)} />
      )}

      {/* Thought Detail Modal */}
      {selectedThought && (
        <ThoughtDetailModal
          thought={selectedThought}
          onClose={() => setSelectedThought(null)}
        />
      )}
    </div>
  );
}

function NewThoughtModal({ onClose }: { onClose: () => void }) {
  const addThought = useThoughts((s) => s.add);
  const [text, setText] = useState("");
  const [type, setType] = useState<ThoughtType>('neutral');
  const [intensity, setIntensity] = useState<number>(5);
  const [tags, setTags] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const tagsList = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await addThought({
      text: text.trim(),
      type,
      createdAt: new Date().toISOString(),
      intensity: type.includes('feeling') ? intensity : undefined,
      tags: tagsList.length > 0 ? tagsList : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 border-4 border-purple-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-purple-100">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">💭 New Thought</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">What&apos;s on your mind?</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe your thought..."
              className="input w-full min-h-[100px]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ThoughtType)}
              className="input w-full"
            >
              <option value="neutral">Neutral</option>
              <option value="task">Task (something I need to do)</option>
              <option value="feeling-good">Good Feeling</option>
              <option value="feeling-bad">Bad Feeling (needs processing)</option>
            </select>
          </div>

          {type.includes('feeling') && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Intensity: {intensity}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Tags (optional)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="work, family, health (comma separated)"
              className="input w-full"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold rounded-full hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:scale-105"
            >
              💾 Save Thought
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

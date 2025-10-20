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
      case 'task': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900';
      case 'feeling-good': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900';
      case 'feeling-bad': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900';
      case 'neutral': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/40 border-gray-200 dark:border-gray-900';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thoughts</h1>
          <p className="text-muted-foreground mt-1">Capture and analyze what&apos;s on your mind</p>
        </div>
        <button
          onClick={() => setShowNewThought(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Thought
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold mt-1">{thoughtStats.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Tasks</div>
          <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{thoughtStats.tasks}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Need Processing</div>
          <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{thoughtStats.feelingBad}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Analyzed</div>
          <div className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{thoughtStats.analyzed}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{thoughtStats.completed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ThoughtType | 'all')}
            className="input py-1 text-sm"
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="feeling-good">Good Feelings</option>
            <option value="feeling-bad">Bad Feelings</option>
            <option value="neutral">Neutral</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Show completed
          </label>
        </div>
      </div>

      {/* Thoughts List */}
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Showing {filteredThoughts.length} of {thoughts.length} thoughts
        </div>
        <AnimatePresence>
          {filteredThoughts.map((thought) => (
            <motion.div
              key={thought.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
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
                  <p className={`font-medium ${thought.done ? 'line-through text-muted-foreground' : ''}`}>
                    {thought.text}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${getTypeColor(thought.type)}`}>
                      {getTypeIcon(thought.type)}
                      {thought.type.replace('-', ' ')}
                    </span>
                    {thought.intensity && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                        <Heart className="h-3 w-3 inline mr-1" />
                        Intensity: {thought.intensity}/10
                      </span>
                    )}
                    {thought.cbtAnalysis && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900">
                        <Brain className="h-3 w-3 inline mr-1" />
                        CBT Analyzed
                      </span>
                    )}
                    {thought.tags && thought.tags.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {thought.tags.join(', ')}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
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
          <div className="card p-12 text-center">
            <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No thoughts found</h3>
            <p className="text-muted-foreground mb-4">
              {thoughts.length === 0 
                ? "Capture your first thought to get started"
                : "Try adjusting your filters"
              }
            </p>
            {thoughts.length === 0 && (
              <button
                onClick={() => setShowNewThought(true)}
                className="btn-primary mx-auto"
              >
                Create Thought
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
        className="bg-background rounded-lg shadow-xl max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">New Thought</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
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

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Thought
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

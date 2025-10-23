"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Brain,
  Sparkles,
  Calendar,
  Tag,
  Trash2,
  Edit2,
  X,
  Save
} from "lucide-react";

interface DeepThought {
  id: string;
  content: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function DeepThoughtPage() {
  const [thoughts, setThoughts] = useState<DeepThought[]>([]);
  const [showNewThought, setShowNewThought] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newThought, setNewThought] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTags, setNewTags] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set(thoughts.map(t => t.category).filter(Boolean) as string[]);
    return Array.from(cats);
  }, [thoughts]);

  const filteredThoughts = useMemo(() => {
    if (categoryFilter === "all") return thoughts;
    return thoughts.filter(t => t.category === categoryFilter);
  }, [thoughts, categoryFilter]);

  const handleAddThought = () => {
    if (!newThought.trim()) return;

    const thought: DeepThought = {
      id: Date.now().toString(),
      content: newThought,
      category: newCategory || undefined,
      tags: newTags ? newTags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setThoughts([thought, ...thoughts]);
    setNewThought("");
    setNewCategory("");
    setNewTags("");
    setShowNewThought(false);
  };

  const handleDeleteThought = (id: string) => {
    setThoughts(thoughts.filter(t => t.id !== id));
  };

  const handleUpdateThought = (id: string, content: string) => {
    setThoughts(thoughts.map(t => 
      t.id === id 
        ? { ...t, content, updatedAt: new Date().toISOString() }
        : t
    ));
    setEditingId(null);
  };

  const thoughtStats = useMemo(() => {
    const total = thoughts.length;
    const categorized = thoughts.filter(t => t.category).length;
    const tagged = thoughts.filter(t => t.tags && t.tags.length > 0).length;

    return { total, categorized, tagged };
  }, [thoughts]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border-4 border-teal-200 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">🤔 Deep Thought</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Profound reflections and philosophical explorations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-100 to-cyan-100 border-2 border-teal-300">
              <div className="text-2xl font-bold text-teal-600">{thoughtStats.total}</div>
              <div className="text-xs text-teal-700 font-medium">Thoughts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border-4 border-teal-200 shadow-xl">
          <div className="text-sm font-medium text-teal-700">Total Thoughts</div>
          <div className="text-3xl font-bold mt-2 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">{thoughtStats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-4 border-purple-200 shadow-xl">
          <div className="text-sm font-medium text-purple-700">Categorized</div>
          <div className="text-3xl font-bold mt-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{thoughtStats.categorized}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-4 border-blue-200 shadow-xl">
          <div className="text-sm font-medium text-blue-700">Tagged</div>
          <div className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{thoughtStats.tagged}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-4 border-green-200 shadow-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border-2 border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={() => setShowNewThought(!showNewThought)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-md"
          >
            {showNewThought ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showNewThought ? "Cancel" : "New Thought"}
          </button>
        </div>
      </div>

      {/* New Thought Form */}
      <AnimatePresence>
        {showNewThought && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-teal-300 space-y-4">
              <textarea
                value={newThought}
                onChange={(e) => setNewThought(e.target.value)}
                placeholder="What's on your mind? Share a profound thought..."
                className="w-full p-4 rounded-lg border-2 border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none min-h-[120px] resize-none"
                autoFocus
              />
              
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Category (e.g., Philosophy, Life, Nature)"
                  className="px-4 py-2 rounded-lg border-2 border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className="px-4 py-2 rounded-lg border-2 border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>

              <button
                onClick={handleAddThought}
                disabled={!newThought.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                Save Thought
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thoughts List */}
      <div className="space-y-4">
        {filteredThoughts.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border-2 border-gray-200">
            <Brain className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">No deep thoughts yet</h3>
            <p className="text-gray-600">
              Start capturing your profound reflections and philosophical explorations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredThoughts.map((thought) => (
              <motion.div
                key={thought.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-xl p-6 border-2 border-teal-200 hover:border-teal-400 transition-all shadow-md hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    {editingId === thought.id ? (
                      <textarea
                        defaultValue={thought.content}
                        onBlur={(e) => handleUpdateThought(thought.id, e.target.value)}
                        className="w-full p-3 rounded-lg border-2 border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none min-h-[80px] resize-none"
                        autoFocus
                      />
                    ) : (
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {thought.content}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(editingId === thought.id ? null : thought.id)}
                      className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteThought(thought.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-3 items-center text-sm">
                  {thought.category && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                      <Sparkles className="h-3 w-3" />
                      {thought.category}
                    </div>
                  )}
                  
                  {thought.tags && thought.tags.map(tag => (
                    <div key={tag} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </div>
                  ))}

                  <div className="flex items-center gap-1 text-gray-500 ml-auto">
                    <Calendar className="h-3 w-3" />
                    {new Date(thought.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

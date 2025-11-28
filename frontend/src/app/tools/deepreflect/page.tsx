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
  Search,
  Filter,
  ChevronDown,
  X,
  Save
} from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import {
  ToolPageLayout,
  ToolHeader,
  ToolContent,
  ToolList,
  ToolCard,
  EmptyState
} from "@/components/tools";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";

interface DeepThought {
  id: string;
  content: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function DeepThoughtPage() {
  useTrackToolUsage('deepreflect');

  const [thoughts, setThoughts] = useState<DeepThought[]>([]);
  const [showNewThought, setShowNewThought] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newThought, setNewThought] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTags, setNewTags] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(thoughts.map(t => t.category).filter(Boolean) as string[]);
    return Array.from(cats);
  }, [thoughts]);

  const filteredThoughts = useMemo(() => {
    let filtered = thoughts.filter(t => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (searchQuery && !t.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    return filtered;
  }, [thoughts, categoryFilter, searchQuery]);

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

  const reflectionStats = useMemo(() => {
    const total = thoughts.length;
    const categorized = thoughts.filter(t => t.category).length;
    const tagged = thoughts.filter(t => t.tags && t.tags.length > 0).length;

    return { total, categorized, tagged };
  }, [thoughts]);

  return (
    <>
    <ToolPageLayout>
      <ToolHeader
        title="Deep Reflection"
        subtitle="Profound reflections and philosophical explorations for deeper understanding"
        showBackButton={true}
        stats={[
          { label: 'total', value: reflectionStats.total },
          { label: 'categorized', value: reflectionStats.categorized, variant: 'info' },
          { label: 'tagged', value: reflectionStats.tagged, variant: 'success' }
        ]}
      />

      {/* Search & Filters Section */}
        <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border-4 border-teal-200 dark:border-teal-800 shadow-xl p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reflections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing {filteredThoughts.length} of {thoughts.length} reflections
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-4 pt-4 border-t border-teal-200 dark:border-teal-700"
            >
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-teal-200 dark:border-teal-800 focus:border-teal-400 dark:focus:border-teal-600 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </div>

      {/* Reflections List */}
      <ToolContent>
        {filteredThoughts.length === 0 ? (
          <EmptyState
            icon={<Brain className="h-12 w-12" />}
            title="No reflections yet"
            description="Start capturing your profound reflections and philosophical explorations"
            action={{
              label: 'New Reflection',
              onClick: () => setShowNewThought(true)
            }}
          />
        ) : (
          <ToolList>
            <AnimatePresence>
              {filteredThoughts.map((thought) => (
                <motion.div
                  key={thought.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ToolCard>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex-shrink-0">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {editingId === thought.id ? (
                          <textarea
                            defaultValue={thought.content}
                            onBlur={(e) => handleUpdateThought(thought.id, e.target.value)}
                            className="w-full p-3 rounded-lg border-2 border-teal-200 dark:border-teal-800 focus:border-teal-400 dark:focus:border-teal-600 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900 outline-none min-h-[80px] resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                        ) : (
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
                            {thought.content}
                          </p>
                        )}
                        
                        {/* Metadata */}
                        <div className="flex flex-wrap gap-2 items-center mt-3">
                          {thought.category && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                              <Sparkles className="h-3 w-3" />
                              {thought.category}
                            </div>
                          )}
                          
                          {thought.tags && thought.tags.map(tag => (
                            <div key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                              <Tag className="h-3 w-3" />
                              {tag}
                            </div>
                          ))}

                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs ml-auto">
                            <Calendar className="h-3 w-3" />
                            {new Date(thought.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditingId(editingId === thought.id ? null : thought.id)}
                          className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/40 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteThought(thought.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </ToolCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </ToolList>
        )}
      </ToolContent>
    </ToolPageLayout>

    {/* New Reflection Modal */}
    <AnimatePresence>
      {showNewThought && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowNewThought(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-white to-teal-50 dark:from-gray-800 dark:to-teal-950/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl border-4 border-teal-200 dark:border-teal-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                New Reflection
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  What&apos;s on your mind?
                </label>
                <textarea
                  value={newThought}
                  onChange={(e) => setNewThought(e.target.value)}
                  placeholder="Share a profound thought or philosophical exploration..."
                  className="w-full min-h-[120px] p-3 border-2 border-teal-200 dark:border-teal-800 rounded-lg focus:border-teal-400 dark:focus:border-teal-600 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 resize-none bg-white dark:bg-gray-800 transition-all"
                  autoFocus
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g., Philosophy, Life"
                    className="w-full px-4 py-2 rounded-lg border-2 border-teal-200 dark:border-teal-800 focus:border-teal-400 dark:focus:border-teal-600 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="comma-separated"
                    className="w-full px-4 py-2 rounded-lg border-2 border-teal-200 dark:border-teal-800 focus:border-teal-400 dark:focus:border-teal-600 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowNewThought(false);
                    setNewThought("");
                    setNewCategory("");
                    setNewTags("");
                  }}
                  className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddThought}
                  disabled={!newThought.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  <Save className="h-4 w-4" />
                  Save Reflection
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* FAB for creating new reflection */}
    <FloatingActionButton
      onClick={() => setShowNewThought(true)}
      title="New Reflection"
      icon={<Plus className="h-6 w-6" />}
    />
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useThoughts, Thought } from "@/store/useThoughts";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle, ArrowLeft, Lightbulb, AlertCircle, TrendingUp, Heart, Plus, Search, Filter, ChevronDown, Trash2 } from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import {
  ToolPageLayout,
  ToolHeader,
  ToolContent,
  ToolList,
  ToolCard,
  EmptyState
} from "@/components/tools";
import { 
  filterUnprocessedThoughts, 
  filterProcessedThoughts, 
  calculateCBTStats,
  formatDate,
  formatDetailedDate,
  addCBTProcessedTag 
} from "@/lib/cbtUtils";

export default function CBTPage() {
  useTrackToolUsage('cbt');

  const thoughts = useThoughts((s) => s.thoughts);
  const addThought = useThoughts((s) => s.add);
  const updateThought = useThoughts((s) => s.updateThought);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [showNewCBTPrompt, setShowNewCBTPrompt] = useState(false);
  const [newCBTText, setNewCBTText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter thoughts with "cbt" tag but not "cbt-processed"
  const unprocessedThoughts = useMemo(() => {
    return filterUnprocessedThoughts(thoughts, searchQuery);
  }, [thoughts, searchQuery]);

  // Filter thoughts that have been processed with CBT
  const processedThoughts = useMemo(() => {
    return filterProcessedThoughts(thoughts, searchQuery);
  }, [thoughts, searchQuery]);

  const handleProcessComplete = (thought: Thought, cbtData: any) => {
    // Update thought with CBT analysis and add "cbt-processed" tag
    const updatedTags = addCBTProcessedTag(thought.tags || []);

    updateThought(thought.id, {
      cbtAnalysis: cbtData,
      tags: updatedTags,
    });

    setSelectedThought(null);
  };

  const handleDeleteProcessedThought = async (thoughtId: string) => {
    const thought = thoughts.find(t => t.id === thoughtId);
    if (!thought) return;

    // Remove cbt-processed tag and clear cbtAnalysis
    const updatedTags = (thought.tags || []).filter(tag => tag !== 'cbt-processed');
    
    await updateThought(thoughtId, {
      cbtAnalysis: undefined,
      tags: updatedTags,
    });
  };

  const cbtStats = useMemo(() => {
    return calculateCBTStats(thoughts, unprocessedThoughts.length);
  }, [thoughts, unprocessedThoughts.length]);

  if (selectedThought) {
    return (
      <CBTProcessing
        thought={selectedThought}
        onBack={() => setSelectedThought(null)}
        onComplete={handleProcessComplete}
      />
    );
  }

  return (
    <>
    <ToolPageLayout>
      <ToolHeader
        title="CBT Processing"
        subtitle="Cognitive Behavioral Therapy - Process your thoughts through the CBT framework"
        showBackButton={true}
        stats={[
          { label: 'to process', value: cbtStats.toProcess, variant: 'warning' },
          { label: 'processed', value: cbtStats.processed, variant: 'success' },
          { label: 'total', value: cbtStats.total }
        ]}
      />

      {/* Search & Filters */}
      <div className="px-4 py-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search CBT thoughts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing {unprocessedThoughts.length + processedThoughts.length} CBT thoughts
          </div>
        </div>

        {/* Filter Options (placeholder) */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-4 pt-4 border-t border-blue-200 dark:border-blue-700"
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">
              No additional filters available
            </div>
          </motion.div>
        )}
        </div>
      </div>

      <ToolContent>
        {unprocessedThoughts.length === 0 ? (
          <EmptyState
            icon={<Brain className="h-12 w-12" />}
            title="No thoughts to process"
            description="Add the &quot;cbt&quot; tag to your thoughts in the Thoughts page to process them here."
            action={{
              label: 'Create CBT Thought',
              onClick: () => setShowNewCBTPrompt(true)
            }}
          />
        ) : (
          <ToolList>
            <AnimatePresence>
              {unprocessedThoughts.map((thought) => (
                <motion.div
                  key={thought.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ToolCard onClick={() => setSelectedThought(thought)}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex-shrink-0">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">
                          {thought.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-600">
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                            {formatDate(thought.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold whitespace-nowrap">
                          Process →
                        </div>
                      </div>
                    </div>
                  </ToolCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </ToolList>
        )}
      </ToolContent>

      {/* Processed Thoughts List */}
      <div className="space-y-4 px-4 pb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          CBT-Processed Thoughts History
        </h2>

        {processedThoughts.length === 0 ? (
          <div className="rounded-2xl p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800">
            <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No processed thoughts yet. Complete the CBT process above to see your history here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {processedThoughts.map((thought) => (
                <motion.div
                  key={thought.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-xl p-4 md:p-6 bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all"
                >
                  <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-4 pb-4 border-b border-green-100 dark:border-green-800">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        {thought.text}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Processed: {formatDetailedDate(thought.cbtAnalysis?.analyzedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteProcessedThought(thought.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                      title="Delete CBT analysis"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-500" />
                    </button>
                  </div>

                    {/* CBT Analysis Summary */}
                    {thought.cbtAnalysis && (
                      <div className="grid gap-3 text-sm">
                        {/* Situation */}
                        {thought.cbtAnalysis.situation && (
                          <div className="rounded-lg p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                            <div className="font-semibold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-white text-xs">1</span>
                              Situation
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{thought.cbtAnalysis.situation}</p>
                          </div>
                        )}

                        {/* Automatic Thought */}
                        {thought.cbtAnalysis.automaticThought && (
                          <div className="rounded-lg p-3 bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800">
                            <div className="font-semibold text-pink-700 dark:text-pink-300 mb-1 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500 text-white text-xs">2</span>
                              Automatic Thought
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 italic">&quot;{thought.cbtAnalysis.automaticThought}&quot;</p>
                          </div>
                        )}

                        {/* Emotions */}
                        {thought.cbtAnalysis.emotion && (
                          <div className="rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                            <div className="font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">3</span>
                              Emotions
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{thought.cbtAnalysis.emotion}</p>
                          </div>
                        )}

                        {/* Cognitive Distortions */}
                        {(thought.cbtAnalysis as any).cognitiveDistortions && (thought.cbtAnalysis as any).cognitiveDistortions.length > 0 && (
                          <div className="rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                            <div className="font-semibold text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs">4</span>
                              Cognitive Distortions
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(thought.cbtAnalysis as any).cognitiveDistortions.map((distortion: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium border border-orange-300 dark:border-orange-700">
                                  {distortion}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rational Response */}
                        {(thought.cbtAnalysis as any).rationalResponse && (
                          <div className="rounded-lg p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                            <div className="font-semibold text-green-700 dark:text-green-300 mb-1 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs">5</span>
                              Rational Response
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{(thought.cbtAnalysis as any).rationalResponse}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ToolPageLayout>

    {/* New CBT Thought Modal */}
    <AnimatePresence>
      {showNewCBTPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowNewCBTPrompt(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl border-4 border-purple-200 dark:border-purple-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                New CBT Analysis
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  What thought would you like to analyze?
                </label>
                <textarea
                  value={newCBTText}
                  onChange={(e) => setNewCBTText(e.target.value)}
                  placeholder="Enter a negative or challenging thought you'd like to work through..."
                  className="w-full min-h-[120px] p-3 border-2 border-purple-200 dark:border-purple-800 rounded-lg focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 resize-none bg-white dark:bg-gray-800 transition-all"
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  💡 CBT works best with specific thoughts like &quot;I&apos;m a failure&quot; or &quot;Nobody likes me&quot;
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowNewCBTPrompt(false);
                    setNewCBTText("");
                  }}
                  className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newCBTText.trim()) return;

                    const newThought = await addThought({
                      text: newCBTText.trim(),
                      tags: ['cbt'],
                    });

                    setShowNewCBTPrompt(false);
                    setNewCBTText("");
                    
                    // Auto-select the new thought for processing
                    setTimeout(() => {
                      const addedThought = thoughts.find(t => t.text === newCBTText.trim());
                      if (addedThought) {
                        setSelectedThought(addedThought);
                      }
                    }, 100);
                  }}
                  disabled={!newCBTText.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  <Brain className="h-4 w-4" />
                  Start CBT Analysis
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* FAB for creating new CBT analysis */}
    <FloatingActionButton
      onClick={() => setShowNewCBTPrompt(true)}
      title="New CBT Analysis"
      icon={<Plus className="h-6 w-6" />}
    />
    </>
  );
}

function CBTProcessing({ 
  thought, 
  onBack, 
  onComplete 
}: { 
  thought: Thought; 
  onBack: () => void;
  onComplete: (thought: Thought, cbtData: any) => void;
}) {
  const [situation, setSituation] = useState("");
  const [automaticThought, setAutomaticThought] = useState(thought.text);
  const [emotions, setEmotions] = useState("");
  const [cognitiveDistortions, setCognitiveDistortions] = useState<string[]>([]);
  const [rationalResponse, setRationalResponse] = useState("");

  // Common cognitive distortions from Feeling Good
  const distortionsList = [
    "All-or-Nothing Thinking",
    "Overgeneralization",
    "Mental Filter",
    "Disqualifying the Positive",
    "Jumping to Conclusions",
    "Magnification/Minimization",
    "Emotional Reasoning",
    "Should Statements",
    "Labeling",
    "Personalization"
  ];

  const toggleDistortion = (distortion: string) => {
    if (cognitiveDistortions.includes(distortion)) {
      setCognitiveDistortions(cognitiveDistortions.filter(d => d !== distortion));
    } else {
      setCognitiveDistortions([...cognitiveDistortions, distortion]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cbtData = {
      situation,
      automaticThought,
      emotions,
      cognitiveDistortions,
      rationalResponse,
      processedAt: new Date().toISOString(),
    };

    onComplete(thought, cbtData);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 p-6 rounded-2xl border-4 border-purple-200 shadow-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to List
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              CBT Framework Processing
            </h1>
            <p className="text-sm text-gray-600">Compact format from &quot;Feeling Good&quot; by Dr. David Burns</p>
          </div>
        </div>
      </div>

      {/* Original Thought */}
      <div className="rounded-xl p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
        <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Original Thought
        </h3>
        <p className="text-gray-800 italic">&quot;{thought.text}&quot;</p>
      </div>

      {/* CBT Form - Compact Layout */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Situation */}
        <div className="rounded-xl p-6 bg-white border-2 border-purple-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500 text-white text-sm">1</span>
              📍 Situation
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              Briefly describe the upsetting event
            </span>
          </label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
            rows={2}
            placeholder="e.g., My boss criticized my work in front of colleagues"
            required
          />
        </div>

        {/* 2. Automatic Thought */}
        <div className="rounded-xl p-6 bg-white border-2 border-pink-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-pink-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-500 text-white text-sm">2</span>
              💭 Automatic Thought(s)
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              What negative thoughts went through your mind?
            </span>
          </label>
          <textarea
            value={automaticThought}
            onChange={(e) => setAutomaticThought(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
            rows={2}
            placeholder="e.g., I'm incompetent. I'll get fired."
            required
          />
        </div>

        {/* 3. Emotions */}
        <div className="rounded-xl p-6 bg-white border-2 border-red-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-red-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-sm">3</span>
              ❤️ Emotions
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              What emotions did you feel? Rate 0-100%
            </span>
          </label>
          <textarea
            value={emotions}
            onChange={(e) => setEmotions(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
            rows={2}
            placeholder="e.g., Sad 80%, Anxious 90%, Ashamed 75%"
            required
          />
        </div>

        {/* 4. Cognitive Distortions */}
        <div className="rounded-xl p-6 bg-white border-2 border-orange-200 shadow-md lg:col-span-2">
          <label className="block mb-3">
            <span className="text-lg font-bold text-orange-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm">4</span>
              🧩 Cognitive Distortions
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              Which thinking errors are present? (Select all that apply)
            </span>
          </label>
          
          {/* Learn About Cognitive Distortions */}
          <div className="rounded-lg p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-700">
                <strong className="text-blue-600">New to cognitive distortions?</strong>{' '}
                <a 
                  href="https://positivepsychology.com/cognitive-distortions/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-semibold"
                >
                  Learn about the 10 common thinking errors →
                </a>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {distortionsList.map((distortion) => (
              <button
                key={distortion}
                type="button"
                onClick={() => toggleDistortion(distortion)}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all text-left ${
                  cognitiveDistortions.includes(distortion)
                    ? 'bg-orange-500 border-orange-600 text-white shadow-lg'
                    : 'bg-white border-orange-200 text-orange-700 hover:border-orange-400'
                }`}
              >
                {cognitiveDistortions.includes(distortion) && '✓ '}{distortion}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Rational Response */}
        <div className="rounded-xl p-6 bg-white border-2 border-green-200 shadow-md lg:col-span-2">
          <label className="block mb-2">
            <span className="text-lg font-bold text-green-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm">5</span>
              💡 Rational Response
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              Write a more balanced, realistic response to the automatic thought
            </span>
          </label>
          <textarea
            value={rationalResponse}
            onChange={(e) => setRationalResponse(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none"
            rows={4}
            placeholder="e.g., Making mistakes is human. My boss gave feedback to help me improve, not to attack me personally. I've done good work before and can learn from this."
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 justify-end pt-4 lg:col-span-2">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <CheckCircle className="h-5 w-5" />
            Complete Processing
          </button>
        </div>
      </form>
    </div>
  );
}

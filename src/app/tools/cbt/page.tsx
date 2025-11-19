"use client";

import { useState, useMemo } from "react";
import { useThoughts, Thought } from "@/store/useThoughts";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle, ArrowLeft, Lightbulb, AlertCircle, TrendingUp, Heart, Plus, Search, Filter, ChevronDown, Trash2 } from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { toolThemes, SearchAndFilters } from "@/components/tools";
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

  const theme = toolThemes.purple;

  const content = selectedThought ? (
    <CBTProcessing
      thought={selectedThought}
      onBack={() => setSelectedThought(null)}
      onComplete={handleProcessComplete}
    />
  ) : (
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
        theme={theme}
      />

      <SearchAndFilters
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search CBT thoughts..."
        totalCount={unprocessedThoughts.length + processedThoughts.length}
        theme={theme}
      />

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
      <div className="space-y-4 px-4 pb-4 mt-8">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
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

  return content;
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
  const [currentStep, setCurrentStep] = useState(0);
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

  const totalSteps = 5;

  const canProceed = () => {
    switch (currentStep) {
      case 0: return situation.trim().length > 0;
      case 1: return automaticThought.trim().length > 0;
      case 2: return emotions.trim().length > 0;
      case 3: return cognitiveDistortions.length > 0;
      case 4: return rationalResponse.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleComplete = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-indigo-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress Header */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              {currentStep === 0 ? 'Back' : 'Previous'}
            </button>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {totalSteps}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Original Thought - Always visible */}
        <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm font-medium mb-2">
            <Lightbulb className="h-4 w-4" />
            Your Thought
          </div>
          <p className="text-gray-800 dark:text-gray-200 italic">&quot;{thought.text}&quot;</p>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl space-y-6"
          >
            {/* Step 0: Situation */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    What happened?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Briefly describe the situation that triggered these thoughts
                  </p>
                </div>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                  rows={4}
                  placeholder="e.g., My boss criticized my work in front of colleagues..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                  Example: &quot;I received critical feedback during a team meeting&quot;
                </p>
              </div>
            )}

            {/* Step 1: Automatic Thought */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-2">
                    What went through your mind?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    What negative or distressing thoughts did you have?
                  </p>
                </div>
                <textarea
                  value={automaticThought}
                  onChange={(e) => setAutomaticThought(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border-2 border-pink-200 dark:border-pink-800 focus:border-pink-400 dark:focus:border-pink-600 focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                  rows={4}
                  placeholder="e.g., I'm incompetent. I'll probably get fired..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                  Example: &quot;I&apos;m not good enough. Everyone thinks I&apos;m a failure.&quot;
                </p>
              </div>
            )}

            {/* Step 2: Emotions */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                    How did you feel?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Name your emotions and rate their intensity (0-100%)
                  </p>
                </div>
                <textarea
                  value={emotions}
                  onChange={(e) => setEmotions(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border-2 border-red-200 dark:border-red-800 focus:border-red-400 dark:focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                  rows={4}
                  placeholder="e.g., Anxious 90%, Sad 75%, Ashamed 60%..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                  Example: &quot;Anxious 85%, Sad 70%, Frustrated 60%&quot;
                </p>
              </div>
            )}

            {/* Step 3: Cognitive Distortions */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                    What thinking errors are present?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Select all cognitive distortions that apply
                  </p>
                  <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        <strong className="text-blue-600 dark:text-blue-400">Need help?</strong>{' '}
                        <a
                          href="https://positivepsychology.com/cognitive-distortions/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                        >
                          Learn about cognitive distortions →
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {distortionsList.map((distortion) => (
                    <button
                      key={distortion}
                      type="button"
                      onClick={() => toggleDistortion(distortion)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                        cognitiveDistortions.includes(distortion)
                          ? 'bg-orange-500 border-orange-600 text-white shadow-lg'
                          : 'bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 hover:border-orange-400 dark:hover:border-orange-600'
                      }`}
                    >
                      {cognitiveDistortions.includes(distortion) && '✓ '}{distortion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Rational Response */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                    What&apos;s a more balanced perspective?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Challenge the automatic thought with a rational, compassionate response
                  </p>
                </div>
                <textarea
                  value={rationalResponse}
                  onChange={(e) => setRationalResponse(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border-2 border-green-200 dark:border-green-800 focus:border-green-400 dark:focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                  rows={6}
                  placeholder="e.g., Mistakes are opportunities to learn. My boss gave feedback to help me improve, not to attack me. I've succeeded before and can grow from this experience..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                  Example: &quot;Everyone makes mistakes. This is one setback, not a pattern. I can learn from this.&quot;
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep < totalSteps - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                >
                  Continue
                  <ArrowLeft className="h-5 w-5 rotate-180" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={!canProceed()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                >
                  <CheckCircle className="h-5 w-5" />
                  Complete
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

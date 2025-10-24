"use client";

import { useState, useMemo } from "react";
import { useThoughts, Thought } from "@/store/useThoughts";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle, ArrowLeft, Lightbulb, AlertCircle, TrendingUp, Heart } from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";

export default function CBTPage() {
  useTrackToolUsage('cbt');

  const thoughts = useThoughts((s) => s.thoughts);
  const updateThought = useThoughts((s) => s.updateThought);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);

  // Filter thoughts with "cbt" tag but not "cbt-processed"
  const unprocessedThoughts = useMemo(() => {
    return thoughts.filter(thought => {
      const tags = thought.tags || [];
      return tags.includes('cbt') && !tags.includes('cbt-processed');
    });
  }, [thoughts]);

  // Filter thoughts that have been processed with CBT
  const processedThoughts = useMemo(() => {
    return thoughts.filter(thought => {
      const tags = thought.tags || [];
      return tags.includes('cbt-processed') && thought.cbtAnalysis;
    }).sort((a, b) => {
      const dateA = a.cbtAnalysis?.analyzedAt ? new Date(a.cbtAnalysis.analyzedAt).getTime() : 0;
      const dateB = b.cbtAnalysis?.analyzedAt ? new Date(b.cbtAnalysis.analyzedAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  }, [thoughts]);

  const handleProcessComplete = (thought: Thought, cbtData: any) => {
    // Update thought with CBT analysis and add "cbt-processed" tag
    const updatedTags = [...(thought.tags || [])];
    if (!updatedTags.includes('cbt-processed')) {
      updatedTags.push('cbt-processed');
    }

    updateThought(thought.id, {
      cbtAnalysis: cbtData,
      tags: updatedTags,
    });

    setSelectedThought(null);
  };

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
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 p-6 md:p-8 rounded-2xl border-4 border-purple-200 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              🧠 CBT Processing
            </h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">
              Cognitive Behavioral Therapy - Process your thoughts
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
          <p className="text-sm text-gray-700">
            <strong className="text-purple-600">💡 How it works:</strong> Select a thought below to process it through the CBT framework. 
            You&apos;ll work through identifying situations, thoughts, emotions, and behaviors to gain insight and develop healthier perspectives.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl p-4 md:p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 shadow-md">
          <div className="text-xs md:text-sm text-purple-600 font-medium">🎯 To Process</div>
          <div className="text-2xl md:text-3xl font-bold mt-1 text-purple-600">
            {unprocessedThoughts.length}
          </div>
        </div>
        <div className="rounded-xl p-4 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-md">
          <div className="text-xs md:text-sm text-green-600 font-medium">✅ Processed</div>
          <div className="text-2xl md:text-3xl font-bold mt-1 text-green-600">
            {thoughts.filter(t => t.tags?.includes('cbt-processed')).length}
          </div>
        </div>
        <div className="rounded-xl p-4 md:p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-md col-span-2 md:col-span-1">
          <div className="text-xs md:text-sm text-blue-600 font-medium">📊 Total CBT</div>
          <div className="text-2xl md:text-3xl font-bold mt-1 text-blue-600">
            {thoughts.filter(t => t.tags?.includes('cbt')).length}
          </div>
        </div>
      </div>

      {/* Thoughts List */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Thoughts Ready for Processing
        </h2>

        {unprocessedThoughts.length === 0 ? (
          <div className="rounded-2xl p-12 text-center bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-200 shadow-lg">
            <Brain className="h-16 w-16 mx-auto text-purple-400 mb-4" />
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
              No thoughts to process
            </h3>
            <p className="text-gray-600 mb-4">
              Add the &quot;cbt&quot; tag to your thoughts in the Thoughts page to process them here.
            </p>
            <p className="text-sm text-gray-500">
              💡 Tip: Use CBT for challenging negative thoughts or difficult emotions
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {unprocessedThoughts.map((thought) => (
                <motion.div
                  key={thought.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-xl p-4 md:p-6 bg-white border-2 border-purple-200 cursor-pointer hover:shadow-lg hover:border-purple-400 transition-all transform hover:scale-[1.02]"
                  onClick={() => setSelectedThought(thought)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex-shrink-0">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-base md:text-lg mb-2">
                        {thought.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-600">
                        <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                          📅 {(() => {
                            try {
                              if (typeof thought.createdAt === 'object' && 'toDate' in thought.createdAt) {
                                return thought.createdAt.toDate().toLocaleDateString();
                              }
                              if (typeof thought.createdAt === 'string') {
                                return new Date(thought.createdAt).toLocaleDateString();
                              }
                              if (typeof thought.createdAt === 'object' && 'seconds' in thought.createdAt) {
                                return new Date(thought.createdAt.seconds * 1000).toLocaleDateString();
                              }
                              return new Date(thought.createdAt).toLocaleDateString();
                            } catch {
                              return 'N/A';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold">
                        Process →
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Processed Thoughts List */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          CBT-Processed Thoughts History
        </h2>

        {processedThoughts.length === 0 ? (
          <div className="rounded-2xl p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-3" />
            <p className="text-gray-600">
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
                  className="rounded-xl p-4 md:p-6 bg-white border-2 border-green-200 shadow-md hover:shadow-lg transition-all"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start gap-4 pb-4 border-b border-green-100">
                      <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-base">
                          {thought.text}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Processed: {(() => {
                            try {
                              const date = thought.cbtAnalysis?.analyzedAt;
                              if (!date) return 'N/A';
                              return new Date(date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            } catch {
                              return 'N/A';
                            }
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* CBT Analysis Summary */}
                    {thought.cbtAnalysis && (
                      <div className="grid gap-3 text-sm">
                        {/* Situation */}
                        {thought.cbtAnalysis.situation && (
                          <div className="rounded-lg p-3 bg-purple-50 border border-purple-200">
                            <div className="font-semibold text-purple-700 mb-1 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-white text-xs">1</span>
                              Situation
                            </div>
                            <p className="text-gray-700">{thought.cbtAnalysis.situation}</p>
                          </div>
                        )}

                        {/* Automatic Thought */}
                        {thought.cbtAnalysis.automaticThought && (
                          <div className="rounded-lg p-3 bg-pink-50 border border-pink-200">
                            <div className="font-semibold text-pink-700 mb-1 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500 text-white text-xs">2</span>
                              Automatic Thought
                            </div>
                            <p className="text-gray-700 italic">&quot;{thought.cbtAnalysis.automaticThought}&quot;</p>
                          </div>
                        )}

                        {/* Emotions */}
                        {thought.cbtAnalysis.emotion && (
                          <div className="rounded-lg p-3 bg-red-50 border border-red-200">
                            <div className="font-semibold text-red-700 mb-1 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">3</span>
                              Emotions
                            </div>
                            <p className="text-gray-700">{thought.cbtAnalysis.emotion}</p>
                          </div>
                        )}

                        {/* Cognitive Distortions */}
                        {(thought.cbtAnalysis as any).cognitiveDistortions && (thought.cbtAnalysis as any).cognitiveDistortions.length > 0 && (
                          <div className="rounded-lg p-3 bg-orange-50 border border-orange-200">
                            <div className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs">4</span>
                              Cognitive Distortions
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(thought.cbtAnalysis as any).cognitiveDistortions.map((distortion: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium border border-orange-300">
                                  {distortion}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rational Response */}
                        {(thought.cbtAnalysis as any).rationalResponse && (
                          <div className="rounded-lg p-3 bg-green-50 border border-green-200">
                            <div className="font-semibold text-green-700 mb-1 flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs">5</span>
                              Rational Response
                            </div>
                            <p className="text-gray-700">{(thought.cbtAnalysis as any).rationalResponse}</p>
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
    </div>
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

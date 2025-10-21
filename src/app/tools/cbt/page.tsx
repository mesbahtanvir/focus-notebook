"use client";

import { useState, useMemo } from "react";
import { useThoughts, Thought } from "@/store/useThoughts";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle, ArrowLeft, Lightbulb, AlertCircle, TrendingUp, Heart } from "lucide-react";

export default function CBTPage() {
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
                        {thought.intensity && (
                          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            Intensity: {thought.intensity}/10
                          </span>
                        )}
                        {thought.intensity && (
                          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            💪 Intensity: {thought.intensity}/10
                          </span>
                        )}
                        <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                          📅 {new Date(thought.createdAt).toLocaleDateString()}
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
  const [physicalSensations, setPhysicalSensations] = useState("");
  const [behaviors, setBehaviors] = useState("");
  const [evidence, setEvidence] = useState("");
  const [alternativeThought, setAlternativeThought] = useState("");
  const [outcome, setOutcome] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cbtData = {
      situation,
      automaticThought,
      emotions,
      physicalSensations,
      behaviors,
      evidence,
      alternativeThought,
      outcome,
      processedAt: new Date().toISOString(),
    };

    onComplete(thought, cbtData);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
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
            <p className="text-sm text-gray-600">ABC Model - Situation, Thoughts, Emotions, Behavior</p>
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

      {/* CBT Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Situation */}
        <div className="rounded-xl p-6 bg-white border-2 border-purple-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500 text-white text-sm">1</span>
              📍 Situation
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              What was happening? Where were you? Who was involved?
            </span>
          </label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
            rows={3}
            placeholder="Describe the situation objectively..."
            required
          />
        </div>

        {/* 2. Automatic Thought */}
        <div className="rounded-xl p-6 bg-white border-2 border-pink-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-pink-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-500 text-white text-sm">2</span>
              💭 Automatic Thought
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              What went through your mind? What did you think?
            </span>
          </label>
          <textarea
            value={automaticThought}
            onChange={(e) => setAutomaticThought(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
            rows={3}
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
              What emotions did you feel? Rate intensity (0-100%)
            </span>
          </label>
          <textarea
            value={emotions}
            onChange={(e) => setEmotions(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
            rows={2}
            placeholder="e.g., Anxiety (80%), Sadness (60%)"
            required
          />
        </div>

        {/* 4. Physical Sensations */}
        <div className="rounded-xl p-6 bg-white border-2 border-orange-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-orange-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm">4</span>
              💪 Physical Sensations
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              What did you notice in your body?
            </span>
          </label>
          <textarea
            value={physicalSensations}
            onChange={(e) => setPhysicalSensations(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
            rows={2}
            placeholder="e.g., Racing heart, tense shoulders, stomach knot..."
          />
        </div>

        {/* 5. Behaviors */}
        <div className="rounded-xl p-6 bg-white border-2 border-blue-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-blue-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm">5</span>
              🏃 Behaviors/Actions
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              What did you do? How did you respond?
            </span>
          </label>
          <textarea
            value={behaviors}
            onChange={(e) => setBehaviors(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
            rows={2}
            placeholder="e.g., Avoided the situation, snapped at someone..."
          />
        </div>

        {/* 6. Evidence */}
        <div className="rounded-xl p-6 bg-white border-2 border-green-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-green-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm">6</span>
              🔍 Evidence Check
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              What evidence supports or challenges this thought?
            </span>
          </label>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none"
            rows={3}
            placeholder="List facts that support or contradict the automatic thought..."
            required
          />
        </div>

        {/* 7. Alternative Thought */}
        <div className="rounded-xl p-6 bg-white border-2 border-teal-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-teal-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500 text-white text-sm">7</span>
              💡 Alternative Thought
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              What&apos;s a more balanced or realistic way to think about this?
            </span>
          </label>
          <textarea
            value={alternativeThought}
            onChange={(e) => setAlternativeThought(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            rows={3}
            placeholder="Reframe the thought based on evidence..."
            required
          />
        </div>

        {/* 8. Outcome */}
        <div className="rounded-xl p-6 bg-white border-2 border-indigo-200 shadow-md">
          <label className="block mb-2">
            <span className="text-lg font-bold text-indigo-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white text-sm">8</span>
              🎯 Outcome & Action Plan
            </span>
            <span className="text-sm text-gray-600 mt-1 block">
              How do you feel now? What will you do differently next time?
            </span>
          </label>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            rows={3}
            placeholder="Reflect on your current emotions and plan future actions..."
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 justify-end pt-4">
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

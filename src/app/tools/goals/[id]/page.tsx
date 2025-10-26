"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/store/useGoals";
import { useProjects } from "@/store/useProjects";
import { useThoughts } from "@/store/useThoughts";
import { useLLMQueue } from "@/store/useLLMQueue";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, ArrowLeft, Edit2, Trash2, CheckCircle2, PauseCircle, Archive,
  Calendar, Clock, Flag, Brain, Lightbulb, Plus, X, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Link as LinkIcon
} from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GoalFormModal } from "@/components/GoalFormModal";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";

// Helper function to format time until deadline
function formatTimeUntil(targetDate: string): { value: number; unit: string; isOverdue: boolean } {
  const target = new Date(targetDate);
  const today = new Date();
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isOverdue = diffDays < 0;
  const absDays = Math.abs(diffDays);
  
  // Calculate years, months, days
  if (absDays >= 365) {
    const years = Math.floor(absDays / 365);
    return { value: years, unit: years === 1 ? 'year' : 'years', isOverdue };
  } else if (absDays >= 30) {
    const months = Math.floor(absDays / 30);
    return { value: months, unit: months === 1 ? 'month' : 'months', isOverdue };
  } else {
    return { value: absDays, unit: absDays === 1 ? 'day' : 'days', isOverdue };
  }
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const goalId = params.id as string;

  const goals = useGoals((s) => s.goals);
  const subscribe = useGoals((s) => s.subscribe);
  const updateGoal = useGoals((s) => s.updateGoal);
  const deleteGoal = useGoals((s) => s.deleteGoal);
  const toggleStatus = useGoals((s) => s.toggleStatus);

  const projects = useProjects((s) => s.projects);
  const subscribeProjects = useProjects((s) => s.subscribe);
  const getProjectsByGoal = useProjects((s) => s.getProjectsByGoal);

  const thoughts = useThoughts((s) => s.thoughts);
  const subscribeThoughts = useThoughts((s) => s.subscribe);

  const { addRequest } = useLLMQueue();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProjects, setShowProjects] = useState(true);
  const [showThoughts, setShowThoughts] = useState(true);
  const [showBrainstorming, setShowBrainstorming] = useState(false);
  const [brainstormingInput, setBrainstormingInput] = useState("");
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormingResults, setBrainstormingResults] = useState<string[]>([]);

  const goal = goals.find(g => g.id === goalId);
  const linkedProjects = getProjectsByGoal(goalId);
  const linkedThoughts = thoughts.filter(thought => 
    thought.tags?.includes(goalId) || 
    thought.text.toLowerCase().includes(goal?.title.toLowerCase() || '') ||
    thought.notes?.toLowerCase().includes(goal?.title.toLowerCase() || '')
  );

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
      subscribeProjects(user.uid);
      subscribeThoughts(user.uid);
    }
  }, [user?.uid, subscribe, subscribeProjects, subscribeThoughts]);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleSubmitEdit = async (data: {
    title: string;
    objective: string;
    timeframe: 'immediate' | 'short-term' | 'long-term';
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }) => {
    if (goal) {
      await updateGoal(goal.id, data);
    }
    setIsEditModalOpen(false);
  };

  const handleDelete = async () => {
    if (goal) {
      await deleteGoal(goal.id);
      router.push('/tools/goals');
    }
    setShowDeleteConfirm(false);
  };

  const handleBrainstorming = async () => {
    if (!brainstormingInput.trim() || !goal) return;
    
    setIsBrainstorming(true);
    try {
      const requestId = addRequest({
        type: 'brainstorming',
        input: {
          text: `Goal: ${goal.title}\nObjective: ${goal.objective}\n\nBrainstorming prompt: ${brainstormingInput}`,
        },
        userId: user?.uid,
      });
      
      // Wait for the request to complete
      const checkStatus = () => {
        const request = useLLMQueue.getState().getRequest(requestId);
        if (request?.status === 'completed' && request.output?.result) {
          const response = request.output.result.response || request.output.result;
          // Parse the response to extract individual ideas
          const ideas = response.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.match(/^\d+\.?\s*$/)) // Remove empty lines and just numbers
            .map((line: string) => line.replace(/^\d+\.?\s*/, '')); // Remove leading numbers
          
          setBrainstormingResults(ideas);
          setBrainstormingInput("");
          setIsBrainstorming(false);
        } else if (request?.status === 'failed') {
          console.error('Brainstorming failed:', request.error);
          setIsBrainstorming(false);
        } else {
          // Check again in 1 second
          setTimeout(checkStatus, 1000);
        }
      };
      
      checkStatus();
    } catch (error) {
      console.error('Brainstorming failed:', error);
      setIsBrainstorming(false);
    }
  };

  if (!goal) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-2">Goal Not Found</h1>
          <p className="text-gray-500 dark:text-gray-500 mb-6">The goal you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <Link
            href="/tools/goals"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Goals
          </Link>
        </div>
      </div>
    );
  }

  const timeInfo = goal.targetDate ? formatTimeUntil(goal.targetDate) : null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/tools/goals"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="h-8 w-8 text-purple-600" />
              {goal.title}
            </h1>
            <p className="text-muted-foreground mt-1">{goal.objective}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-600 transition-colors"
            title="Edit Goal"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => toggleStatus(goal.id)}
            className={`p-2 rounded-lg transition-colors ${
              goal.status === 'completed'
                ? "hover:bg-yellow-100 dark:hover:bg-yellow-950/40 text-yellow-600"
                : "hover:bg-green-100 dark:hover:bg-green-950/40 text-green-600"
            }`}
            title={goal.status === 'completed' ? "Reopen Goal" : "Mark as Completed"}
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors"
            title="Delete Goal"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Goal Status and Priority */}
      <div className="flex items-center gap-4">
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
          goal.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
          goal.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
          goal.status === 'paused' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
          'bg-gray-100 text-gray-700 dark:bg-gray-950/40 dark:text-gray-400'
        }`}>
          {goal.status}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
          goal.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
          goal.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' :
          goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
          'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
        }`}>
          {goal.priority} priority
        </span>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {goal.timeframe === 'immediate' && '⚡ Immediate'}
          {goal.timeframe === 'short-term' && '🎯 Short-term'}
          {goal.timeframe === 'long-term' && '🌟 Long-term'}
          {!goal.timeframe && '🎯 Short-term'}
        </span>
      </div>

      {/* Goal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Target Date */}
        {goal.targetDate && (
          <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div className="text-xs font-semibold text-green-600 dark:text-green-400">Target Date</div>
            </div>
            {timeInfo && (
              <>
                <div className={`text-2xl font-bold ${
                  timeInfo.isOverdue
                    ? "text-red-700 dark:text-red-300"
                    : timeInfo.value === 0 || (timeInfo.unit === 'days' && timeInfo.value < 7)
                    ? "text-orange-700 dark:text-orange-300"
                    : "text-green-700 dark:text-green-300"
                }`}>
                  {timeInfo.value}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {timeInfo.unit} {timeInfo.isOverdue ? "overdue" : "left"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(goal.targetDate).toLocaleDateString()}
                </div>
              </>
            )}
          </div>
        )}

        {/* Projects Count */}
        <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Projects</div>
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {linkedProjects.length}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">linked projects</div>
        </div>

        {/* Thoughts Count */}
        <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">Thoughts</div>
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {linkedThoughts.length}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">related thoughts</div>
        </div>
      </div>

      {/* Linked Projects Section */}
      <div className="card p-6">
        <button
          onClick={() => setShowProjects(!showProjects)}
          className="flex items-center gap-2 text-xl font-bold mb-4 w-full text-left hover:text-blue-700 dark:hover:text-blue-500 transition-colors"
        >
          <Flag className="h-6 w-6 text-blue-600" />
          Linked Projects ({linkedProjects.length})
          {showProjects ? <ChevronUp className="h-5 w-5 ml-auto" /> : <ChevronDown className="h-5 w-5 ml-auto" />}
        </button>
        
        <AnimatePresence>
          {showProjects && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {linkedProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/tools/projects/${project.id}`}
                  className="block p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-lg group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-bold text-blue-700 dark:text-blue-300 text-lg group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-colors">
                        {project.title}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.objective}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                          project.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                          project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-950/40 dark:text-gray-400'
                        }`}>
                          {project.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                          project.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' :
                          project.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                        }`}>
                          {project.priority}
                        </span>
                      </div>
                    </div>
                    <div className="text-blue-400 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <ExternalLink className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              ))}
              {linkedProjects.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Flag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No projects linked to this goal yet.</p>
                  <p className="text-sm mt-1">Create projects from the main goals page to get started.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Linked Thoughts Section */}
      <div className="card p-6">
        <button
          onClick={() => setShowThoughts(!showThoughts)}
          className="flex items-center gap-2 text-xl font-bold mb-4 w-full text-left hover:text-purple-700 dark:hover:text-purple-500 transition-colors"
        >
          <Brain className="h-6 w-6 text-purple-600" />
          Related Thoughts ({linkedThoughts.length})
          {showThoughts ? <ChevronUp className="h-5 w-5 ml-auto" /> : <ChevronDown className="h-5 w-5 ml-auto" />}
        </button>
        
        <AnimatePresence>
          {showThoughts && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {linkedThoughts.map((thought) => (
                <Link
                  key={thought.id}
                  href={`/tools/thoughts`}
                  className="block p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-bold text-purple-700 dark:text-purple-300 text-lg group-hover:text-purple-800 dark:group-hover:text-purple-200 transition-colors">
                        {thought.text.substring(0, 100)}{thought.text.length > 100 ? '...' : ''}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(thought.createdAt).toLocaleDateString()}
                      </div>
                      {thought.tags && thought.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {thought.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-purple-400 dark:text-purple-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      <ExternalLink className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              ))}
              {linkedThoughts.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No thoughts linked to this goal yet.</p>
                  <p className="text-sm mt-1">Link thoughts to goals when creating or editing them.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Brainstorming Section */}
      <div className="card p-6">
        <button
          onClick={() => setShowBrainstorming(!showBrainstorming)}
          className="flex items-center gap-2 text-xl font-bold mb-4 w-full text-left hover:text-orange-700 dark:hover:text-orange-500 transition-colors"
        >
          <Lightbulb className="h-6 w-6 text-orange-600" />
          AI Brainstorming
          {showBrainstorming ? <ChevronUp className="h-5 w-5 ml-auto" /> : <ChevronDown className="h-5 w-5 ml-auto" />}
        </button>
        
        <AnimatePresence>
          {showBrainstorming && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg p-4 border-2 border-orange-200 dark:border-orange-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={brainstormingInput}
                    onChange={(e) => setBrainstormingInput(e.target.value)}
                    placeholder="What would you like to brainstorm about this goal?"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-800"
                    onKeyPress={(e) => e.key === 'Enter' && handleBrainstorming()}
                  />
                  <button
                    onClick={handleBrainstorming}
                    disabled={!brainstormingInput.trim() || isBrainstorming}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isBrainstorming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lightbulb className="h-4 w-4" />
                    )}
                    Brainstorm
                  </button>
                </div>
              </div>

              {brainstormingResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-300">Ideas:</h4>
                  {brainstormingResults.map((idea, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-sm mt-0.5">
                          {index + 1}.
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">{idea}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <GoalFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSubmitEdit}
        editingGoal={goal}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Goal"
        message={`Are you sure you want to delete "${goal.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

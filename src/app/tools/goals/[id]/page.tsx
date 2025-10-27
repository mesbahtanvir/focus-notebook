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
  Target, ArrowLeft, Edit3, Trash2, CheckCircle2,
  Calendar, Flag, Brain, Lightbulb, Loader2,
  ExternalLink, Link as LinkIcon, Plus, X
} from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GoalFormModal } from "@/components/GoalFormModal";

// Helper function to format time until deadline
function formatTimeUntil(targetDate: string): { value: number; unit: string; isOverdue: boolean } {
  const target = new Date(targetDate);
  const today = new Date();
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isOverdue = diffDays < 0;
  const absDays = Math.abs(diffDays);
  
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

  const addProject = useProjects((s) => s.add);
  const updateProject = useProjects((s) => s.update);
  const addThought = useThoughts((s) => s.add);
  const updateThought = useThoughts((s) => s.updateThought);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBrainstorming, setShowBrainstorming] = useState(false);
  const [brainstormingInput, setBrainstormingInput] = useState("");
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormingResults, setBrainstormingResults] = useState<string[]>([]);
  const [showAttachProjectModal, setShowAttachProjectModal] = useState(false);
  const [showAttachThoughtModal, setShowAttachThoughtModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateThoughtModal, setShowCreateThoughtModal] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedThoughts, setSelectedThoughts] = useState<Set<string>>(new Set());

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
      
      const checkStatus = () => {
        const request = useLLMQueue.getState().getRequest(requestId);
        if (request?.status === 'completed' && request.output?.result) {
          // Handle both new structure (with actions) and old structure (direct response)
          const result = request.output.result as any;
          
          // Check if this is the new thought-processing structure
          if (result.actions && Array.isArray(result.actions)) {
            // This is thought-processing type - skip for brainstorming
            setIsBrainstorming(false);
            return;
          }
          
          // Handle brainstorming response
          let response: string;
          if (typeof result === 'string') {
            response = result;
          } else if (result.response) {
            response = result.response;
          } else {
            response = String(result);
          }
          
          const ideas = response.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.match(/^\d+\.?\s*$/))
            .map((line: string) => line.replace(/^\d+\.?\s*/, ''));
          
          setBrainstormingResults(ideas);
          setBrainstormingInput("");
          setIsBrainstorming(false);
        } else if (request?.status === 'failed') {
          console.error('Brainstorming failed:', request.error);
          setIsBrainstorming(false);
        } else {
          setTimeout(checkStatus, 1000);
        }
      };
      
      checkStatus();
    } catch (error) {
      console.error('Brainstorming failed:', error);
      setIsBrainstorming(false);
    }
  };

  const handleLinkProjects = async () => {
    for (const projectId of selectedProjects) {
      await updateProject(projectId, { goalId: goalId });
    }
    setSelectedProjects(new Set());
    setShowAttachProjectModal(false);
  };

  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleCreateProject = async (data: {
    title: string;
    objective: string;
    category: 'health' | 'wealth' | 'mastery' | 'connection';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    timeframe: 'short-term' | 'long-term';
  }) => {
    await addProject({
      ...data,
      status: 'active',
      goalId: goalId,
      actionPlan: [],
    });
    setShowCreateProjectModal(false);
  };

  const handleLinkThoughts = async () => {
    for (const thoughtId of selectedThoughts) {
      const thought = thoughts.find(t => t.id === thoughtId);
      if (thought) {
        const currentTags = thought.tags || [];
        if (!currentTags.includes(goalId)) {
          await updateThought(thoughtId, {
            tags: [...currentTags, goalId],
          });
        }
      }
    }
    setSelectedThoughts(new Set());
    setShowAttachThoughtModal(false);
  };

  const toggleThoughtSelection = (thoughtId: string) => {
    const newSelected = new Set(selectedThoughts);
    if (newSelected.has(thoughtId)) {
      newSelected.delete(thoughtId);
    } else {
      newSelected.add(thoughtId);
    }
    setSelectedThoughts(newSelected);
  };

  const handleCreateThought = async (text: string) => {
    await addThought({
      text,
      tags: [goalId],
    });
    setShowCreateThoughtModal(false);
  };

  // Get unlinked projects and thoughts
  const unlinkedProjects = useMemo(() => {
    return projects.filter(p => !p.goalId || p.goalId !== goalId);
  }, [projects, goalId]);

  const unlinkedThoughts = useMemo(() => {
    return thoughts.filter(t => !t.tags?.includes(goalId));
  }, [thoughts, goalId]);

  if (!goal) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Goal Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The goal you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <button
            onClick={() => router.push("/tools/goals")}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Back to Goals
          </button>
        </div>
      </div>
    );
  }

  const timeInfo = goal.targetDate ? formatTimeUntil(goal.targetDate) : null;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-rose-950/20 p-6 rounded-2xl border-4 border-purple-200 dark:border-purple-800 shadow-xl">
        <button
          onClick={() => router.push("/tools/goals")}
          className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 font-semibold mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Goals
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {goal.title}
              </h1>
              <p className="text-gray-700 dark:text-gray-300 text-lg mb-3">{goal.objective}</p>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`px-3 py-1 rounded-full font-semibold ${
                  goal.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : goal.status === "completed"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}>
                  {goal.status}
                </span>

                <span className={`px-3 py-1 rounded-full font-semibold ${
                  goal.priority === "urgent"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : goal.priority === "high"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                    : goal.priority === "medium"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                }`}>
                  {goal.priority} priority
                </span>

                <span className="px-3 py-1 rounded-full font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                  {goal.timeframe === 'immediate' && '⚡ Immediate'}
                  {goal.timeframe === 'short-term' && '🎯 Short-term'}
                  {goal.timeframe === 'long-term' && '🌟 Long-term'}
                  {!goal.timeframe && '🎯 Short-term'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="p-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
              title="Edit Goal"
            >
              <Edit3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
              title="Delete Goal"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Projects Count */}
        <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Projects</div>
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {linkedProjects.length}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">linked</div>
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
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">related</div>
        </div>

        {/* Priority Level */}
        <div className="rounded-xl p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">Priority</div>
          </div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 capitalize">
            {goal.priority}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">level</div>
        </div>

        {/* Target Date or Timeframe */}
        <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="text-xs font-semibold text-green-600 dark:text-green-400">
              {goal.targetDate ? 'Deadline' : 'Timeframe'}
            </div>
          </div>
          {goal.targetDate ? (
            (() => {
              const timeInfo = formatTimeUntil(goal.targetDate);
              return (
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
                </>
              );
            })()
          ) : (
            <>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {goal.timeframe || 'short-term'}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">goal</div>
            </>
          )}
        </div>
      </div>

      {/* Split Layout: Projects (Left) and Thoughts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Projects */}
        <div className="space-y-6">
          {/* Linked Projects */}
          <div className="rounded-xl p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Projects ({linkedProjects.length})</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAttachProjectModal(true)}
                  className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                  title="Attach Existing Project"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  title="Create New Project"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {linkedProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No projects linked to this goal yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create projects from the projects page</p>
                </div>
              ) : (
                linkedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/tools/projects/${project.id}`}
                    className="block p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-lg group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-bold text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-colors">
                          {project.title}
                        </div>
                        {project.objective && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.objective}</div>
                        )}
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
                      <ExternalLink className="h-5 w-5 text-blue-400 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Thoughts & Brainstorming */}
        <div className="space-y-6">
          {/* Related Thoughts */}
          <div className="rounded-xl p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Related Thoughts ({linkedThoughts.length})</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAttachThoughtModal(true)}
                  className="p-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg transition-colors"
                  title="Attach Existing Thought"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowCreateThoughtModal(true)}
                  className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  title="Create New Thought"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {linkedThoughts.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No thoughts linked to this goal yet</p>
                </div>
              ) : (
                linkedThoughts.slice(0, 5).map((thought) => (
                  <Link
                    key={thought.id}
                    href={`/tools/thoughts?id=${thought.id}`}
                    className="block p-3 rounded-lg bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg group text-sm"
                  >
                    <div className="font-medium text-purple-700 dark:text-purple-300 group-hover:text-purple-800 dark:group-hover:text-purple-200 transition-colors line-clamp-2">
                      {thought.text}
                    </div>
                    {thought.tags && thought.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {thought.tags.slice(0, 2).map((tag, index) => (
                          <span key={index} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))
              )}
              {linkedThoughts.length > 5 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                  +{linkedThoughts.length - 5} more thoughts
                </div>
              )}
            </div>
          </div>

          {/* AI Brainstorming */}
          <div className="rounded-xl p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">AI Brainstorming</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={brainstormingInput}
                    onChange={(e) => setBrainstormingInput(e.target.value)}
                    placeholder="What would you like to brainstorm?"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-800 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleBrainstorming()}
                  />
                  <button
                    onClick={handleBrainstorming}
                    disabled={!brainstormingInput.trim() || isBrainstorming}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
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
                  <h4 className="font-semibold text-orange-700 dark:text-orange-300 text-sm">Ideas:</h4>
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {brainstormingResults.map((idea, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-orange-600 dark:text-orange-400 font-bold text-sm mt-0.5">
                            {index + 1}.
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{idea}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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

      {/* Attach Project Modal */}
      <AnimatePresence>
        {showAttachProjectModal && unlinkedProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAttachProjectModal(false);
              setSelectedProjects(new Set());
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Attach Projects ({selectedProjects.size} selected)
                </h2>
                <button
                  onClick={() => {
                    setShowAttachProjectModal(false);
                    setSelectedProjects(new Set());
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {unlinkedProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => toggleProjectSelection(project.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md group ${
                      selectedProjects.has(project.id)
                        ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedProjects.has(project.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedProjects.has(project.id) && (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {project.title}
                        </div>
                        {project.objective && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.objective}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button
                  onClick={() => {
                    setShowAttachProjectModal(false);
                    setSelectedProjects(new Set());
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkProjects}
                  disabled={selectedProjects.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Attach {selectedProjects.size} {selectedProjects.size === 1 ? 'Project' : 'Projects'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateProjectModal && (
          <NewProjectModal 
            isOpen={showCreateProjectModal}
            onClose={() => setShowCreateProjectModal(false)}
            onCreate={handleCreateProject}
          />
        )}
      </AnimatePresence>

      {/* Attach Thought Modal */}
      <AnimatePresence>
        {showAttachThoughtModal && unlinkedThoughts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAttachThoughtModal(false);
              setSelectedThoughts(new Set());
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Attach Thoughts ({selectedThoughts.size} selected)
                </h2>
                <button
                  onClick={() => {
                    setShowAttachThoughtModal(false);
                    setSelectedThoughts(new Set());
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {unlinkedThoughts.map((thought) => (
                  <button
                    key={thought.id}
                    onClick={() => toggleThoughtSelection(thought.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md group ${
                      selectedThoughts.has(thought.id)
                        ? 'border-purple-500 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedThoughts.has(thought.id)
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedThoughts.has(thought.id) && (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                          {thought.text}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button
                  onClick={() => {
                    setShowAttachThoughtModal(false);
                    setSelectedThoughts(new Set());
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkThoughts}
                  disabled={selectedThoughts.size === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Attach {selectedThoughts.size} {selectedThoughts.size === 1 ? 'Thought' : 'Thoughts'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Thought Modal */}
      <AnimatePresence>
        {showCreateThoughtModal && (
          <NewThoughtModal
            isOpen={showCreateThoughtModal}
            onClose={() => setShowCreateThoughtModal(false)}
            onCreate={handleCreateThought}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// New Project Modal Component
function NewProjectModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (data: any) => void }) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [category, setCategory] = useState<'health' | 'wealth' | 'mastery' | 'connection'>('mastery');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [timeframe, setTimeframe] = useState<'short-term' | 'long-term'>('long-term');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ title, objective, category, priority, timeframe });
    setTitle("");
    setObjective("");
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Objective..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            rows={3}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="health">Health</option>
                <option value="wealth">Wealth</option>
                <option value="mastery">Mastery</option>
                <option value="connection">Connection</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="short-term">Short-term</option>
              <option value="long-term">Long-term</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// New Thought Modal Component
function NewThoughtModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (text: string) => void }) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(text);
    setText("");
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Create New Thought</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What are you thinking..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
            rows={5}
            required
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Thought
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjects, Project } from "@/store/useProjects";
import { useTasks, Task } from "@/store/useTasks";
import { useGoals } from "@/store/useGoals";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useEntityGraph } from "@/store/useEntityGraph";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  Target,
  ArrowLeft,
  Clock,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Circle,
  Edit3,
  Trash2,
  Plus,
  Link as LinkIcon,
  Flag,
  Zap,
  ListChecks,
  BarChart3,
  User,
  Save,
  X as XIcon
} from "lucide-react";
import { TaskModal } from "@/components/TaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import Link from "next/link";

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

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;

  const projects = useProjects((s) => s.projects);
  const isLoading = useProjects((s) => s.isLoading);
  const subscribe = useProjects((s) => s.subscribe);
  const updateProject = useProjects((s) => s.update);
  const deleteProject = useProjects((s) => s.delete);
  const linkTask = useProjects((s) => s.linkTask);

  const tasks = useTasks((s) => s.tasks);
  const subscribeTasks = useTasks((s) => s.subscribe);
  const updateTask = useTasks((s) => s.updateTask);

  const goals = useGoals((s) => s.goals);
  const thoughts = useThoughts((s) => s.thoughts);
  const subscribeThoughts = useThoughts((s) => s.subscribe);
  const relationships = useEntityGraph((s) => s.relationships);
  const subscribeRelationships = useEntityGraph((s) => s.subscribe);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    objective: string;
    status: 'active' | 'completed' | 'on-hold' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timeframe: 'short-term' | 'long-term';
    category: 'mastery' | 'health' | 'wealth' | 'connection';
    targetDate: string;
  }>({
    title: '',
    description: '',
    objective: '',
    status: 'active',
    priority: 'medium',
    timeframe: 'short-term',
    category: 'mastery',
    targetDate: '',
  });

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
      subscribeTasks(user.uid);
      subscribeThoughts(user.uid);
      subscribeRelationships(user.uid);
    }
  }, [user?.uid, subscribe, subscribeTasks, subscribeThoughts, subscribeRelationships]);

  const project = projects.find((p) => p.id === projectId);

  // Populate edit form when project loads or edit mode is entered
  useEffect(() => {
    if (project && isEditing) {
      setEditForm({
        title: project.title,
        description: project.description || '',
        objective: project.objective || '',
        status: project.status,
        priority: project.priority,
        timeframe: project.timeframe,
        category: project.category,
        targetDate: project.targetDate || '',
      });
    }
  }, [project, isEditing]);

  const linkedTasks = useMemo(() => {
    if (!project) return [];
    // Include tasks that are either in linkedTaskIds OR have projectId matching this project
    return tasks.filter((t) =>
      project.linkedTaskIds.includes(t.id) || t.projectId === project.id
    );
  }, [project, tasks]);

  const linkedGoal = useMemo(() => {
    if (!project?.goalId) return null;
    return goals.find((g) => g.id === project.goalId);
  }, [project, goals]);

  const relationshipLinkedThoughts = useMemo(() => {
    if (!projectId) return [];
    const thoughtMap = new Map(thoughts.map((t) => [t.id, t]));
    const relevant = relationships.filter(
      (rel) =>
        rel.status === 'active' &&
        rel.sourceType === 'thought' &&
        rel.targetType === 'project' &&
        rel.targetId === projectId
    );
    return relevant
      .map((rel) => thoughtMap.get(rel.sourceId))
      .filter((thought): thought is Thought => Boolean(thought));
  }, [relationships, thoughts, projectId]);

  const linkedThoughts = useMemo(() => {
    if (relationshipLinkedThoughts.length > 0) {
      return relationshipLinkedThoughts;
    }
    if (!project) return [];

    return thoughts.filter((t) => {
      if (project.linkedThoughtIds.includes(t.id)) return true;

      try {
        const projectNotes = project.notes ? JSON.parse(project.notes) : null;
        if (projectNotes?.sourceThoughtId === t.id) return true;
      } catch {}

      return false;
    });
  }, [relationshipLinkedThoughts, project, thoughts]);

  const stats = useMemo(() => {
    const totalTasks = linkedTasks.length;
    const completedTasks = linkedTasks.filter((t) => t.done).length;
    const incompleteTasks = totalTasks - completedTasks;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate estimated time to finish (sum of incomplete tasks)
    const estimatedMinutes = linkedTasks
      .filter((t) => !t.done)
      .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

    const estimatedHours = Math.floor(estimatedMinutes / 60);
    const remainingMinutes = estimatedMinutes % 60;

    // Days until target date
    let daysUntilTarget: number | null = null;
    if (project?.targetDate) {
      const target = new Date(project.targetDate);
      const today = new Date();
      const diffTime = target.getTime() - today.getTime();
      daysUntilTarget = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      totalTasks,
      completedTasks,
      incompleteTasks,
      completionPercentage,
      estimatedMinutes,
      estimatedHours,
      remainingMinutes,
      daysUntilTarget,
    };
  }, [linkedTasks, project]);

  const handleToggleTaskComplete = async (taskId: string, done: boolean) => {
    await updateTask(taskId, { done: !done });
  };

  const handleTaskCreated = async (taskId: string) => {
    // Link the newly created task to this project
    await linkTask(projectId, taskId);
  };

  const handleDeleteProject = async () => {
    await deleteProject(projectId);
    setShowDeleteConfirm(false);
    router.push("/tools/projects");
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) return;

    await updateProject(projectId, {
      title: editForm.title,
      description: editForm.description,
      objective: editForm.objective,
      status: editForm.status,
      priority: editForm.priority,
      timeframe: editForm.timeframe,
      category: editForm.category,
      targetDate: editForm.targetDate || undefined,
    });

    setIsEditing(false);
  };

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Loading project...
          </h2>
        </div>
      </div>
    );
  }

  // Show not found only after loading is complete
  if (!project) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Project Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The project you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <button
            onClick={() => router.push("/tools/projects")}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 p-6 rounded-2xl border-4 border-green-200 dark:border-green-800 shadow-xl">
        <button
          onClick={() => router.push("/tools/projects")}
          className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 font-semibold mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Projects
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-3xl font-bold bg-transparent border-b-2 border-green-300 dark:border-green-700 focus:border-green-500 dark:focus:border-green-500 outline-none w-full text-gray-900 dark:text-white pb-1"
                    placeholder="Project Title"
                  />
                  <textarea
                    value={editForm.objective}
                    onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })}
                    className="text-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 w-full focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Objective"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="input text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                      className="input text-sm"
                    >
                      <option value="mastery">Mastery</option>
                      <option value="health">Health</option>
                      <option value="wealth">Wealth</option>
                      <option value="connection">Connection</option>
                    </select>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                      className="input text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <select
                      value={editForm.timeframe}
                      onChange={(e) => setEditForm({ ...editForm, timeframe: e.target.value as any })}
                      className="input text-sm"
                    >
                      <option value="short-term">Short-term</option>
                      <option value="long-term">Long-term</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    {project.title}
                  </h1>
                  <p className="text-gray-700 dark:text-gray-300 text-lg mb-3">{project.objective}</p>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={`px-3 py-1 rounded-full font-semibold ${
                      project.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : project.status === "completed"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}>
                      {project.status}
                    </span>

                    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-semibold">
                      {project.category}
                    </span>

                    <span className={`px-3 py-1 rounded-full font-semibold ${
                      project.priority === "urgent"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : project.priority === "high"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                        : project.priority === "medium"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    }`}>
                      {project.priority}
                    </span>

                    <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 font-semibold">
                      {project.timeframe}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg transition-colors font-medium flex items-center gap-2"
                  title="Save Changes"
                >
                  <Save className="h-5 w-5" />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium flex items-center gap-2"
                  title="Cancel"
                >
                  <XIcon className="h-5 w-5" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartEdit}
                  className="p-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                  title="Edit Project"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Tasks</div>
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {stats.completedTasks}/{stats.totalTasks}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">completed</div>
        </div>

        <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">Progress</div>
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {stats.completionPercentage}%
          </div>
          <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-1.5 mt-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">Time Left</div>
          </div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {stats.estimatedHours > 0 ? `${stats.estimatedHours}h` : ""}
            {stats.remainingMinutes > 0 ? ` ${stats.remainingMinutes}m` : stats.estimatedHours === 0 ? "0m" : ""}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">estimated</div>
        </div>

        <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="text-xs font-semibold text-green-600 dark:text-green-400">Deadline</div>
          </div>
          {project.targetDate ? (
            (() => {
              const timeInfo = formatTimeUntil(project.targetDate);
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
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">No deadline</div>
          )}
        </div>
      </div>

      {/* Split Layout: Project Details (Left) and Tasks (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Project Details */}
        <div className="space-y-6">
          {/* Linked Goal */}
          {linkedGoal && (
            <div className="rounded-xl p-6 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/30 border-2 border-purple-200 dark:border-purple-800 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Linked Goal</h3>
              </div>
              <Link
                href="/tools/goals"
                className="block p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-bold text-purple-700 dark:text-purple-300 text-lg group-hover:text-purple-800 dark:group-hover:text-purple-200 transition-colors">
                      {linkedGoal.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{linkedGoal.objective}</div>
                  </div>
                  <div className="text-purple-400 dark:text-purple-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    <Flag className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-3 flex items-center gap-1 font-medium">
                  Click to view goal →
                </div>
              </Link>
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div className="rounded-xl p-6 bg-white dark:bg-gray-900 border-2 border-green-200 dark:border-green-800 shadow-md">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-3">Description</h3>
              <p className="text-gray-700 dark:text-gray-300">{project.description}</p>
            </div>
          )}

          {/* Action Plan */}
          {project.actionPlan && project.actionPlan.length > 0 && (
            <div className="rounded-xl p-6 bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-800 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Action Plan</h3>
              </div>
              <ol className="space-y-2">
                {project.actionPlan.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Linked Thoughts */}
          {linkedThoughts.length > 0 && (
            <div className="rounded-xl p-6 bg-white dark:bg-gray-900 border-2 border-pink-200 dark:border-pink-800 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                  Related Thoughts ({linkedThoughts.length})
                </h3>
              </div>
              <div className="space-y-2">
                {linkedThoughts.slice(0, 3).map((thought) => (
                  <div
                    key={thought.id}
                    className="p-3 rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 text-sm"
                  >
                    {thought.text}
                  </div>
                ))}
                {linkedThoughts.length > 3 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
                    +{linkedThoughts.length - 3} more thoughts
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Tasks List */}
        <div className="rounded-xl p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border-2 border-cyan-200 dark:border-cyan-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">Project Tasks</h3>
            </div>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              title="Add Task"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {linkedTasks.length === 0 ? (
            <div className="text-center py-12">
              <ListChecks className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No tasks linked to this project yet</p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
              >
                Add First Task
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {linkedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedTask(task)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    task.done
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {task.done && (
                      <div className="mt-1 flex-shrink-0 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-semibold ${
                          task.done
                            ? "text-gray-500 dark:text-gray-400 line-through"
                            : "text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {task.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                        <span className={`px-2 py-1 rounded-full font-semibold ${
                          task.priority === "urgent"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            : task.priority === "high"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                            : task.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        }`}>
                          {task.priority}
                        </span>

                        {task.estimatedMinutes && (
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {task.estimatedMinutes}m
                          </span>
                        )}

                        <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-semibold">
                          {task.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={handleTaskCreated}
        projectId={projectId}
        projectTitle={project.title}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Delete Project Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Project?"
        message={`Are you sure you want to delete "${project.title}"? All linked tasks and data will remain, but this project will be permanently removed.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

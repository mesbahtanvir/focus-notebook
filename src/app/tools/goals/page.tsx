"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals, Goal, GoalTimeframe } from "@/store/useGoals";
import { useProjects } from "@/store/useProjects";
import { useTasks } from "@/store/useTasks";
import { TimeTrackingService } from "@/services/TimeTrackingService";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, CheckCircle2, Trash2, Edit2, PlayCircle, PauseCircle, Archive, ChevronDown, ChevronUp
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { GoalFormModal } from "@/components/GoalFormModal";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { toolThemes, ToolHeader, SearchAndFilters, ToolPageLayout } from "@/components/tools";

export default function GoalsPage() {
  useTrackToolUsage('goals');

  const { user } = useAuth();
  const router = useRouter();
  const goals = useGoals((s) => s.goals);
  const subscribe = useGoals((s) => s.subscribe);
  const addGoal = useGoals((s) => s.add);
  const updateGoal = useGoals((s) => s.updateGoal);
  const deleteGoal = useGoals((s) => s.deleteGoal);
  const toggleStatus = useGoals((s) => s.toggleStatus);

  const projects = useProjects((s) => s.projects);
  const subscribeProjects = useProjects((s) => s.subscribe);
  const tasks = useTasks((s) => s.tasks);
  const subscribeTasks = useTasks((s) => s.subscribe);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
      subscribeProjects(user.uid);
      subscribeTasks(user.uid);
    }
  }, [user?.uid, subscribe, subscribeProjects, subscribeTasks]);

  const handleSubmit = async (data: {
    title: string;
    objective: string;
    timeframe: GoalTimeframe;
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }) => {
    const goalData = {
      ...data,
      status: 'active' as const,
    };

    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData);
    } else {
      await addGoal(goalData);
    }

    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const filterGoals = (goalsList: Goal[]) => {
    if (!searchQuery.trim()) return goalsList;
    const query = searchQuery.toLowerCase();
    return goalsList.filter(g => 
      g.title.toLowerCase().includes(query) ||
      g.objective.toLowerCase().includes(query)
    );
  };

  const activeGoals = filterGoals(goals.filter(g => g.status === 'active'));
  const completedGoals = filterGoals(goals.filter(g => g.status === 'completed'));
  const pausedGoals = filterGoals(goals.filter(g => g.status === 'paused'));
  const archivedGoals = filterGoals(goals.filter(g => g.status === 'archived'));

  // Separate by timeframe
  const shortTermGoals = activeGoals.filter(g => g.timeframe === 'short-term' || g.timeframe === 'immediate');
  const longTermGoals = activeGoals.filter(g => g.timeframe === 'long-term' || !g.timeframe);

  const stats = useMemo(() => {
    return {
      total: goals.length,
      active: activeGoals.length,
      shortTerm: shortTermGoals.length,
      longTerm: longTermGoals.length,
      completed: completedGoals.length,
      paused: pausedGoals.length,
    };
  }, [goals.length, activeGoals.length, shortTermGoals.length, longTermGoals.length, completedGoals.length, pausedGoals.length]);

  const theme = toolThemes.purple;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Goals"
        emoji="🎯"
        showBackButton
        stats={[
          { label: 'Active', value: stats.active, variant: 'info' },
          { label: 'Done', value: stats.completed, variant: 'success' },
          { label: 'Short Term', value: stats.shortTerm, variant: 'warning' },
          { label: 'Long Term', value: stats.longTerm }
        ]}
        theme={theme}
      />

      <SearchAndFilters
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search goals..."
        totalCount={goals.length}
        filteredCount={activeGoals.length + completedGoals.length}
        showFilterToggle
        filterContent={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                showCompleted
                  ? 'bg-green-200 dark:bg-green-700 text-green-700 dark:text-green-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              } hover:bg-green-300 dark:hover:bg-green-600`}
            >
              {showCompleted ? 'Hiding' : 'Show'} Completed
            </button>
            <button
              onClick={() => setShowPaused(!showPaused)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                showPaused
                  ? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-700 dark:text-yellow-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              } hover:bg-yellow-300 dark:hover:bg-yellow-600`}
            >
              {showPaused ? 'Hiding' : 'Show'} Paused
            </button>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                showArchived
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              } hover:bg-gray-300 dark:hover:bg-gray-600`}
            >
              {showArchived ? 'Hiding' : 'Show'} Archived
            </button>
          </div>
        }
        theme={theme}
      />

      {/* Goal Form Modal */}
      <GoalFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        editingGoal={editingGoal}
      />

      {/* Short Term Goals */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <PlayCircle className="h-5 w-5 text-orange-600" />
          Short Term Goals ({shortTermGoals.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence>
            {shortTermGoals.map((goal) => {
              const goalTime = TimeTrackingService.calculateGoalTime(goal, projects, tasks);

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card p-4 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                  onClick={() => router.push(`/tools/goals/${goal.id}`)}
                >
                  {/* Gradient background accent */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/10 dark:to-yellow-950/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative">
                    {/* Header with title and actions */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold flex-1 pr-2 line-clamp-2">{goal.title}</h3>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleStatus(goal.id)}
                          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-950/40 text-green-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Complete"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateGoal(goal.id, { status: 'paused' })}
                          className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-950/40 text-yellow-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Pause"
                        >
                          <PauseCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Badges inline */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        goal.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                        goal.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' :
                        goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                        'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                      }`}>
                        {goal.priority}
                      </span>
                      {goalTime.totalMinutes > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          ⏱️ {TimeTrackingService.formatTime(goalTime.totalMinutes)}
                        </span>
                      )}
                    </div>

                    {/* Objective text */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-sm text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: goal.objective }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        {shortTermGoals.length === 0 && (
          <div className="card p-6 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No short term goals yet. Create one to get started!</p>
          </div>
        )}
      </div>

      {/* Long Term Goals */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <PlayCircle className="h-5 w-5 text-purple-600" />
          Long Term Goals ({longTermGoals.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence>
            {longTermGoals.map((goal) => {
              const goalTime = TimeTrackingService.calculateGoalTime(goal, projects, tasks);

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card p-4 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                  onClick={() => router.push(`/tools/goals/${goal.id}`)}
                >
                  {/* Gradient background accent */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative">
                    {/* Header with title and actions */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold flex-1 pr-2 line-clamp-2">{goal.title}</h3>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleStatus(goal.id)}
                          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-950/40 text-green-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Complete"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateGoal(goal.id, { status: 'paused' })}
                          className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-950/40 text-yellow-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Pause"
                        >
                          <PauseCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Badges inline */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        goal.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                        goal.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' :
                        goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                        'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                      }`}>
                        {goal.priority}
                      </span>
                      {goalTime.totalMinutes > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          ⏱️ {TimeTrackingService.formatTime(goalTime.totalMinutes)}
                        </span>
                      )}
                    </div>

                    {/* Objective text */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-sm text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: goal.objective }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        {longTermGoals.length === 0 && (
          <div className="card p-6 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No long term goals yet. Create one to get started!</p>
          </div>
        )}
      </div>

      {/* Paused Goals */}
      {pausedGoals.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowPaused(!showPaused)}
            className="flex items-center gap-2 text-2xl font-bold hover:text-yellow-700 dark:hover:text-yellow-500 transition-colors w-full"
          >
            <PauseCircle className="h-6 w-6 text-yellow-600" />
            Paused Goals ({pausedGoals.length})
            {showPaused ? <ChevronUp className="h-5 w-5 ml-auto" /> : <ChevronDown className="h-5 w-5 ml-auto" />}
          </button>
          <AnimatePresence>
            {showPaused && pausedGoals.map((goal) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="card p-4 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{goal.title}</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: goal.objective }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateGoal(goal.id, { status: 'active' })}
                      className="text-sm px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-400 transition-colors"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => updateGoal(goal.id, { status: 'archived' })}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-2xl font-bold hover:text-green-700 dark:hover:text-green-500 transition-colors w-full"
          >
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Completed Goals ({completedGoals.length})
            {showCompleted ? <ChevronUp className="h-5 w-5 ml-auto" /> : <ChevronDown className="h-5 w-5 ml-auto" />}
          </button>
          <AnimatePresence>
            {showCompleted && completedGoals.map((goal) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="card p-4 bg-green-50 dark:bg-green-950/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold line-through text-muted-foreground">{goal.title}</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: goal.objective }} />
                    </div>
                    {goal.completedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed: {new Date(goal.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(goal.id)}
                      className="text-sm px-3 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 transition-colors"
                      title="Mark as active"
                    >
                      Reopen
                    </button>
                    <button
                      onClick={() => updateGoal(goal.id, { status: 'archived' })}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Archived Goals */}
      {archivedGoals.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-2xl font-bold hover:text-gray-700 dark:hover:text-gray-500 transition-colors w-full"
          >
            <Archive className="h-6 w-6 text-gray-600" />
            Archived Goals ({archivedGoals.length})
            {showArchived ? <ChevronUp className="h-5 w-5 ml-auto" /> : <ChevronDown className="h-5 w-5 ml-auto" />}
          </button>
          <AnimatePresence>
            {showArchived && archivedGoals.map((goal) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="card p-4 bg-gray-50 dark:bg-gray-900/50 opacity-50 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-muted-foreground">{goal.title}</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: goal.objective }} />
                    </div>
                    {goal.completedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Archived: {new Date(goal.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateGoal(goal.id, { status: 'active' })}
                      className="text-sm px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-400 transition-colors"
                      title="Restore"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => { if (confirm('Permanently delete this goal?')) deleteGoal(goal.id); }}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <FloatingActionButton
        onClick={() => setIsModalOpen(true)}
        title="New Goal"
      />
    </ToolPageLayout>
  );
}

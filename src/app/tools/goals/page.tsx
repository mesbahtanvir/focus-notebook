"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals, Goal, GoalTimeframe } from "@/store/useGoals";
import { useProjects } from "@/store/useProjects";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, CheckCircle2, Trash2, Edit2, PlayCircle, PauseCircle, Archive, ChevronDown, ChevronUp, Search
} from "lucide-react";
import Link from "next/link";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { GoalFormModal } from "@/components/GoalFormModal";

export default function GoalsPage() {
  const { user } = useAuth();
  const goals = useGoals((s) => s.goals);
  const subscribe = useGoals((s) => s.subscribe);
  const addGoal = useGoals((s) => s.add);
  const updateGoal = useGoals((s) => s.updateGoal);
  const deleteGoal = useGoals((s) => s.deleteGoal);
  const toggleStatus = useGoals((s) => s.toggleStatus);
  
  const getProjectsByGoal = useProjects((s) => s.getProjectsByGoal);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Target className="h-8 w-8 text-purple-600" />
          Goals
        </h1>
        <p className="text-muted-foreground mt-1">Define and achieve your long-term objectives</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search goals..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Goal Form Modal */}
      <GoalFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        editingGoal={editingGoal}
      />

      {/* Active Goals */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <PlayCircle className="h-6 w-6 text-green-600" />
          Active Goals ({activeGoals.length})
        </h2>
        <AnimatePresence>
          {activeGoals.map((goal) => {
            const relatedProjects = getProjectsByGoal(goal.id);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{goal.title}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        goal.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                        goal.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' :
                        goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                        'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                      }`}>
                        {goal.priority}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {goal.timeframe === 'immediate' && '⚡ Immediate'}
                        {goal.timeframe === 'short-term' && '🎯 Short-term'}
                        {goal.timeframe === 'long-term' && '🌟 Long-term'}
                        {!goal.timeframe && '🎯 Short-term'}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">{goal.objective}</p>

                    {/* Projects Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <h4 className="font-semibold text-sm mb-2">Projects ({relatedProjects.length}):</h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {relatedProjects.map((project) => (
                          <Link
                            key={project.id}
                            href={`/tools/projects/${project.id}`}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm flex items-center gap-1"
                          >
                            <Target className="h-3 w-3" />
                            {project.title}
                          </Link>
                        ))}
                        {relatedProjects.length === 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No projects yet. Create one below.</p>
                        )}
                      </div>
                      {/* Quick Project Creation */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New project name..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              const projectName = input.value.trim();
                              if (projectName) {
                                useProjects.getState().add({
                                  title: projectName,
                                  objective: `Project for ${goal.title}`,
                                  actionPlan: [],
                                  goalId: goal.id,
                                  timeframe: 'long-term',
                                  status: 'active',
                                  category: 'mastery',
                                  priority: 'medium',
                                });
                                input.value = '';
                              }
                            }
                          }}
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            const projectName = input.value.trim();
                            if (projectName) {
                              useProjects.getState().add({
                                title: projectName,
                                objective: `Project for ${goal.title}`,
                                actionPlan: [],
                                goalId: goal.id,
                                timeframe: 'long-term',
                                status: 'active',
                                category: 'mastery',
                                priority: 'medium',
                              });
                              input.value = '';
                            }
                          }}
                          className="px-3 py-1.5 text-sm rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:hover:bg-purple-950/60 transition-colors font-medium"
                        >
                          + Add Project
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleStatus(goal.id)}
                      className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/40 text-green-600 transition-colors"
                      title="Mark as completed"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(goal)}
                      className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => updateGoal(goal.id, { status: 'paused' })}
                      className="p-2 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-950/40 text-yellow-600 transition-colors"
                      title="Pause"
                    >
                      <PauseCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {activeGoals.length === 0 && (
          <div className="card p-8 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No active goals. Create one to get started!</p>
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
                    <p className="text-sm text-muted-foreground">{goal.objective}</p>
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
                    <p className="text-sm text-muted-foreground">{goal.objective}</p>
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
                    <p className="text-sm text-muted-foreground">{goal.objective}</p>
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
    </div>
  );
}

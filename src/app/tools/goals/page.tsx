"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals, Goal, GoalTimeframe } from "@/store/useGoals";
import { useProjects } from "@/store/useProjects";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Target, CheckCircle2, Clock, ChevronRight, 
  Trash2, Edit2, PlayCircle, PauseCircle, Archive, ChevronDown, ChevronUp, Search, Save 
} from "lucide-react";
import Link from "next/link";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";

export default function GoalsPage() {
  const { user } = useAuth();
  const goals = useGoals((s) => s.goals);
  const subscribe = useGoals((s) => s.subscribe);
  const addGoal = useGoals((s) => s.add);
  const updateGoal = useGoals((s) => s.updateGoal);
  const deleteGoal = useGoals((s) => s.deleteGoal);
  const toggleStatus = useGoals((s) => s.toggleStatus);
  
  const projects = useProjects((s) => s.projects);
  const getProjectsByGoal = useProjects((s) => s.getProjectsByGoal);
  
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('short-term');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [newProjectName, setNewProjectName] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !objective.trim()) return;

    const goalData = {
      title: title.trim(),
      objective: objective.trim(),
      timeframe,
      status: 'active' as const,
      priority,
    };

    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData);
    } else {
      await addGoal(goalData);
    }

    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setObjective("");
    setTimeframe('short-term');
    setPriority('medium');
    setNewProjectName("");
    setShowForm(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setObjective(goal.objective);
    setTimeframe(goal.timeframe || 'short-term');
    setPriority(goal.priority);
    setShowForm(true);
  };

  const handleCreateProject = async (goalId: string, goalTitle: string) => {
    if (!newProjectName.trim()) return;
    
    const projectId = await useProjects.getState().add({
      title: newProjectName.trim(),
      objective: `Project for ${goalTitle}`,
      actionPlan: [],
      goalId: goalId,
      timeframe: 'long-term',
      status: 'active',
      category: 'mastery',
      priority: 'medium',
    });
    
    setNewProjectName("");
    return projectId;
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

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-3xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/30 shadow-2xl border-4 border-purple-200 dark:border-purple-800 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 border-b-4 border-purple-300 dark:border-purple-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                </h3>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white dark:bg-gray-900">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 bg-white dark:bg-gray-800 transition-all"
                  placeholder="e.g., Launch my own business"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Objective *</label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 bg-white dark:bg-gray-800 transition-all"
                  rows={3}
                  placeholder="Why is this goal important? What will achieving it mean to you?"
                  required
                />
              </div>

              {/* Info about projects */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> After creating your goal, you can attach existing projects or create new projects directly from the goal card below.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Timeframe *</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as GoalTimeframe)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  >
                    <option value="immediate">⚡ Immediate (Days-Weeks)</option>
                    <option value="short-term">🎯 Short-term (Months)</option>
                    <option value="long-term">🌟 Long-term (Years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-purple-200 dark:border-purple-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
                            href={`/tools/projects#${project.id}`}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-950/60 transition-colors"
                          >
                            {project.title}
                          </Link>
                        ))}
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
        onClick={() => setShowForm(true)}
        title="New Goal"
      />
    </div>
  );
}

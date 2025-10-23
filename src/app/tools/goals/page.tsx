"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals, Goal } from "@/store/useGoals";
import { useProjects } from "@/store/useProjects";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Target, CheckCircle2, Clock, ChevronRight, 
  Trash2, Edit2, PlayCircle, PauseCircle, Archive, ChevronDown, ChevronUp 
} from "lucide-react";
import Link from "next/link";

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
  const [actionPlan, setActionPlan] = useState<string[]>([""]);
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [targetDate, setTargetDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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
      actionPlan: actionPlan.filter(ap => ap.trim()),
      status: 'active' as const,
      priority,
      targetDate: targetDate || undefined,
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
    setActionPlan([""]);
    setPriority('medium');
    setTargetDate("");
    setShowForm(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setObjective(goal.objective);
    setActionPlan(goal.actionPlan.length > 0 ? goal.actionPlan : [""]);
    setPriority(goal.priority);
    setTargetDate(goal.targetDate || "");
    setShowForm(true);
  };

  const updateActionPlan = (index: number, value: string) => {
    const newPlan = [...actionPlan];
    newPlan[index] = value;
    setActionPlan(newPlan);
  };

  const addActionStep = () => {
    setActionPlan([...actionPlan, ""]);
  };

  const removeActionStep = (index: number) => {
    setActionPlan(actionPlan.filter((_, i) => i !== index));
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const pausedGoals = goals.filter(g => g.status === 'paused');
  const archivedGoals = goals.filter(g => g.status === 'archived');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-purple-600" />
            Goals
          </h1>
          <p className="text-muted-foreground mt-1">Define and achieve your long-term objectives</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus className="h-5 w-5" />
          New Goal
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-6"
          >
            <h3 className="text-xl font-bold mb-4">{editingGoal ? 'Edit Goal' : 'Create New Goal'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="e.g., Launch my own business"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Objective *</label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  rows={3}
                  placeholder="Why is this goal important? What will achieving it mean to you?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Action Plan</label>
                {actionPlan.map((step, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => updateActionPlan(index, e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder={`Step ${index + 1}`}
                    />
                    {actionPlan.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeActionStep(index)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addActionStep}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  + Add Step
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
                >
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  Cancel
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
                      {goal.targetDate && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-4">{goal.objective}</p>
                    
                    {goal.actionPlan && goal.actionPlan.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-2">Action Plan:</h4>
                        <ul className="space-y-1">
                          {goal.actionPlan.map((step, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {relatedProjects.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <h4 className="font-semibold text-sm mb-2">Related Projects ({relatedProjects.length}):</h4>
                        <div className="flex flex-wrap gap-2">
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
                      </div>
                    )}
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
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { useProjects, Project, ProjectTimeframe, ProjectStatus } from "@/store/useProjects";
import { useGoals } from "@/store/useGoals";
import { useThoughts } from "@/store/useThoughts";
import { useTasks } from "@/store/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { 
  Target, 
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Link as LinkIcon,
  TrendingUp,
  Flag,
  X,
  Save,
  MessageSquare,
  ListChecks,
  Milestone,
  Search
} from "lucide-react";

export default function ProjectsPage() {
  const { user } = useAuth();
  const projects = useProjects((s) => s.projects);
  const subscribe = useProjects((s) => s.subscribe);
  const addProject = useProjects((s) => s.add);
  const updateProject = useProjects((s) => s.update);
  const deleteProject = useProjects((s) => s.delete);
  const thoughts = useThoughts((s) => s.thoughts);
  const tasks = useTasks((s) => s.tasks);
  
  // Subscribe to Firebase projects
  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);
  
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filterTimeframe, setFilterTimeframe] = useState<'all' | ProjectTimeframe>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ProjectStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filterTimeframe !== 'all' && p.timeframe !== filterTimeframe) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesObjective = p.objective?.toLowerCase().includes(query);
        const matchesDescription = p.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesObjective && !matchesDescription) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projects, filterTimeframe, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const shortTerm = projects.filter(p => p.timeframe === 'short-term').length;
    const longTerm = projects.filter(p => p.timeframe === 'long-term').length;
    
    return { total, active, completed, shortTerm, longTerm };
  }, [projects]);

  const getProjectThoughts = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];
    return thoughts.filter(t => project.linkedThoughtIds.includes(t.id));
  };

  const getProjectTasks = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];
    return tasks.filter(t => project.linkedTaskIds.includes(t.id));
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 md:p-6">
      {/* Compact Header with inline stats */}
      <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-4 border-green-200 dark:border-green-800 shadow-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">🎯 Projects</h1>
            <div className="flex items-center gap-3 mt-2 text-sm font-medium">
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">{stats.active} active</span>
              <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300">{stats.completed} done</span>
              <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">{stats.shortTerm} short-term</span>
              <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">{stats.longTerm} long-term</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
        <select
          value={filterTimeframe}
          onChange={(e) => setFilterTimeframe(e.target.value as any)}
          className="input py-2 text-sm"
        >
          <option value="all">All Timeframes</option>
          <option value="short-term">Short-term</option>
          <option value="long-term">Long-term</option>
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="input py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="on-hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </select>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 && (
          <div className="card p-12 text-center">
            <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Start planning your goals and projects
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="btn-primary mx-auto"
            >
              Create First Project
            </button>
          </div>
        )}

        <AnimatePresence>
          {filteredProjects.map((project) => {
            const linkedThoughts = getProjectThoughts(project.id);
            const linkedTasks = getProjectTasks(project.id);
            
            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => setSelectedProject(project)}
                className="card p-6 space-y-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Project Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      <h3 className="text-xl font-bold">{project.title}</h3>
                    </div>
                    
                    {project.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {project.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.timeframe === 'short-term'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {project.timeframe === 'short-term' ? '⏱️ Short-term' : '🎯 Long-term'}
                      </span>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status}
                      </span>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.category === 'health' ? 'bg-red-100 text-red-700' :
                        project.category === 'wealth' ? 'bg-green-100 text-green-700' :
                        project.category === 'mastery' ? 'bg-blue-100 text-blue-700' :
                        'bg-pink-100 text-pink-700'
                      }`}>
                        {project.category}
                      </span>
                      
                      {project.targetDate && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Target: {new Date(project.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {typeof project.progress === 'number' && (
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">{project.progress}%</div>
                      <div className="text-xs text-muted-foreground">Progress</div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {typeof project.progress === 'number' && (
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                )}

                {/* Linked Items */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {linkedThoughts.length} thought(s)
                  </div>
                  <div className="flex items-center gap-1">
                    <ListChecks className="h-4 w-4" />
                    {linkedTasks.length} task(s)
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} />
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal 
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      <FloatingActionButton
        onClick={() => setShowNewProject(true)}
        title="New Project"
      />
    </div>
  );
}

// New Project Modal Component
function NewProjectModal({ onClose }: { onClose: () => void }) {
  const addProject = useProjects ((s) => s.add);
  const goals = useGoals((s) => s.goals);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [actionPlan, setActionPlan] = useState<string[]>([""]);
  const [timeframe, setTimeframe] = useState<ProjectTimeframe>('short-term');
  const [category, setCategory] = useState<'health' | 'wealth' | 'mastery' | 'connection'>('mastery');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [targetDate, setTargetDate] = useState("");
  const [goalId, setGoalId] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !objective.trim()) return;

    addProject({
      title: title.trim(),
      objective: objective.trim(),
      actionPlan: actionPlan.filter(ap => ap.trim()),
      description: description.trim() || undefined,
      timeframe,
      category,
      priority,
      status: 'active',
      targetDate: targetDate || undefined,
      progress: 0,
      goalId: goalId || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">🎯 New Project</h2>
            <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Project Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Better Physique, Learn Spanish"
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Objective *</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What is the purpose of this project?"
              className="input w-full min-h-[80px]"
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
                  onChange={(e) => {
                    const newPlan = [...actionPlan];
                    newPlan[index] = e.target.value;
                    setActionPlan(newPlan);
                  }}
                  className="flex-1 input"
                  placeholder={`Step ${index + 1}`}
                />
                {actionPlan.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActionPlan(actionPlan.filter((_, i) => i !== index))}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setActionPlan([...actionPlan, ""])}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              + Add Step
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details (optional)"
              className="input w-full min-h-[60px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Link to Goal (Optional)</label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="input w-full"
            >
              <option value="">No goal (standalone project)</option>
              {goals.filter(g => g.status === 'active').map(goal => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Timeframe *</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as ProjectTimeframe)}
                className="input w-full"
              >
                <option value="short-term">Short-term (weeks-months)</option>
                <option value="long-term">Long-term (months-years)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="input w-full"
              >
                <option value="health">Health</option>
                <option value="wealth">Wealth</option>
                <option value="mastery">Mastery</option>
                <option value="connection">Connection</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="input w-full"
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
                className="input w-full"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border hover:bg-accent">
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Project Detail Modal Component (placeholder for now)
function ProjectDetailModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const updateProject = useProjects((s) => s.update);
  const deleteProject = useProjects((s) => s.delete);
  const thoughts = useThoughts((s) => s.thoughts);
  const tasks = useTasks((s) => s.tasks);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const linkedThoughts = thoughts.filter(t => project.linkedThoughtIds.includes(t.id));
  const linkedTasks = tasks.filter(t => project.linkedTaskIds.includes(t.id));

  const handleDelete = () => {
    deleteProject(project.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{project.title}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          title="Delete Project?"
          message={`Are you sure you want to delete "${project.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />

        <div className="p-6 space-y-6">
          {project.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
            </div>
          )}

          {/* Linked Thoughts */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Linked Thoughts ({linkedThoughts.length})
            </h3>
            {linkedThoughts.length > 0 ? (
              <div className="space-y-2">
                {linkedThoughts.map(t => (
                  <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {t.text}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No thoughts linked yet</p>
            )}
          </div>

          {/* Linked Tasks */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Linked Tasks ({linkedTasks.length})
            </h3>
            {linkedTasks.length > 0 ? (
              <div className="space-y-2">
                {linkedTasks.map(t => (
                  <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-2">
                    <input type="checkbox" checked={t.done} readOnly className="rounded" />
                    <span className={t.done ? 'line-through text-gray-500' : ''}>{t.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks linked yet</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

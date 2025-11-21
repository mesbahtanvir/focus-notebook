"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjects, Project, ProjectTimeframe, ProjectStatus } from "@/store/useProjects";
import { useGoals } from "@/store/useGoals";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useTasks } from "@/store/useTasks";
import { useEntityGraph } from "@/store/useEntityGraph";
import { useAuth } from "@/contexts/AuthContext";
import { TimeTrackingService } from "@/services/TimeTrackingService";
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
  Search,
  Filter,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";
import { toolThemes, ToolHeader, SearchAndFilters, ToolPageLayout } from "@/components/tools";
import { getLinkedThoughtsForEntity } from "@/lib/entityGraph/thoughtLinks";

const getSourceThoughtIdFromNotes = (notes?: string | null) => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed?.sourceThoughtId || null;
  } catch {
    return null;
  }
};

export default function ProjectsPage() {
  useTrackToolUsage('projects');

  const router = useRouter();
  const { user } = useAuth();
  const projects = useProjects((s) => s.projects);
  const subscribe = useProjects((s) => s.subscribe);
  const addProject = useProjects((s) => s.add);
  const updateProject = useProjects((s) => s.update);
  const deleteProject = useProjects((s) => s.delete);
  const thoughts = useThoughts((s) => s.thoughts);
  const tasks = useTasks((s) => s.tasks);
  const relationships = useEntityGraph((s) => s.relationships);
  const subscribeRelationships = useEntityGraph((s) => s.subscribe);
  
  // Subscribe to Firebase projects
  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
      subscribeRelationships(user.uid);
    }
  }, [user?.uid, subscribe, subscribeRelationships]);
  
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filterTimeframe, setFilterTimeframe] = useState<'all' | ProjectTimeframe>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ProjectStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  // Use infinite scroll
  const { displayedItems, hasMore, observerTarget } = useInfiniteScroll(filteredProjects, {
    initialItemsPerPage: 10,
    threshold: 0.8
  });

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const shortTerm = projects.filter(p => p.timeframe === 'short-term').length;
    const longTerm = projects.filter(p => p.timeframe === 'long-term').length;
    
    return { total, active, completed, shortTerm, longTerm };
  }, [projects]);

  const projectThoughtMap = useMemo(() => {
    const map = new Map<string, Thought[]>();

    projects.forEach((project) => {
      const sourceThoughtId = getSourceThoughtIdFromNotes(project.notes);
      const additionalThoughtIds = sourceThoughtId ? [sourceThoughtId] : [];

      map.set(project.id, getLinkedThoughtsForEntity({
        relationships,
        thoughts,
        entityType: 'project',
        entityId: project.id,
        additionalThoughtIds,
      }));
    });

    return map;
  }, [projects, relationships, thoughts]);

  const getProjectThoughts = (projectId: string) => {
    return projectThoughtMap.get(projectId) || [];
  };

  const getProjectTasks = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  };

  const theme = toolThemes.green;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Projects"
        emoji="🎯"
        showBackButton
        stats={[
          { label: 'active', value: stats.active, variant: 'info' },
          { label: 'done', value: stats.completed, variant: 'success' },
          { label: 'short-term', value: stats.shortTerm },
          { label: 'long-term', value: stats.longTerm }
        ]}
        theme={theme}
      />

      <SearchAndFilters
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search projects..."
        totalCount={projects.length}
        filteredCount={filteredProjects.length}
        showFilterToggle
        filterContent={
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timeframe</label>
              <select
                value={filterTimeframe}
                onChange={(e) => setFilterTimeframe(e.target.value as any)}
                className="input py-1 text-sm min-w-[150px]"
              >
                <option value="all">All Timeframes</option>
                <option value="short-term">Short-term</option>
                <option value="long-term">Long-term</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="input py-1 text-sm min-w-[150px]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </>
        }
        theme={theme}
      />

      {/* Projects List */}
      <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
        {filteredProjects.length === 0 && (
          <div className="col-span-full card p-12 text-center">
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
          {displayedItems.map((project) => {
            const linkedThoughts = getProjectThoughts(project.id);
            const linkedTasks = getProjectTasks(project.id);
            const projectTime = TimeTrackingService.calculateProjectTime(project, tasks);

            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => router.push(`/tools/projects/${project.id}`)}
                className="card p-4 hover:shadow-md transition-all cursor-pointer group"
              >
                {/* Header with Progress */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <h3 className="text-sm font-bold truncate">{project.title}</h3>
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {typeof project.progress === 'number' && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-blue-600">{project.progress}%</div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {typeof project.progress === 'number' && (
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    project.status === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' :
                    project.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300' :
                    project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {project.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    project.timeframe === 'short-term'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300'
                  }`}>
                    {project.timeframe === 'short-term' ? 'Short' : 'Long'}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ListChecks className="h-3 w-3" />
                    {linkedTasks.length}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {linkedThoughts.length}
                  </div>
                  {projectTime.totalMinutes > 0 && (
                    <div className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                      <Clock className="h-3 w-3" />
                      {TimeTrackingService.formatTime(projectTime.totalMinutes)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>


        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={observerTarget} className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        )}
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
    </ToolPageLayout>
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
      progress: 0,
      goalId: goalId || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-white to-green-50 dark:from-gray-900 dark:to-green-950/30 rounded-3xl shadow-2xl border-4 border-green-200 dark:border-green-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 border-b-4 border-green-300 dark:border-green-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">New Project</h2>
            </div>
            <button onClick={onClose} className="p-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white dark:bg-gray-900">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Project Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Better Physique, Learn Spanish"
              className="w-full p-3 rounded-xl border-2 border-green-200 dark:border-green-800 focus:border-green-400 dark:focus:border-green-600 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 bg-white dark:bg-gray-800 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Objective *</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What is the purpose of this project?"
              className="w-full p-3 rounded-xl border-2 border-green-200 dark:border-green-800 focus:border-green-400 dark:focus:border-green-600 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 bg-white dark:bg-gray-800 transition-all min-h-[80px]"
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

          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-green-200 dark:border-green-800">
            <button type="button" onClick={onClose} className="flex-1 px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              <Save className="h-4 w-4" />
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
  const relationships = useEntityGraph((s) => s.relationships);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const linkedThoughts = useMemo(() => {
    const sourceThoughtId = getSourceThoughtIdFromNotes(project.notes);
    const additionalThoughtIds = sourceThoughtId ? [sourceThoughtId] : [];

    return getLinkedThoughtsForEntity({
      relationships,
      thoughts,
      entityType: 'project',
      entityId: project.id,
      additionalThoughtIds,
    });
  }, [project, relationships, thoughts]);
  const linkedTasks = tasks.filter(t => t.projectId === project.id);

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

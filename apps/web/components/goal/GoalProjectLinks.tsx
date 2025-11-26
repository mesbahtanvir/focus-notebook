"use client";

import { useState, useMemo } from "react";
import { Flag, LinkIcon, Plus, X, CheckCircle2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { NewProjectModal } from "./NewProjectModal";
import type { Project } from "@/store/useProjects";

interface GoalProjectLinksProps {
  goalId: string;
  linkedProjects: Project[];
  allProjects: Project[];
  onLinkProjects: (projectIds: string[]) => Promise<void>;
  onCreateProject: (data: {
    title: string;
    objective: string;
    category: 'health' | 'wealth' | 'mastery' | 'connection';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    timeframe: 'short-term' | 'long-term';
  }) => Promise<void>;
}

/**
 * Component for managing project links to a goal
 */
export function GoalProjectLinks({
  goalId,
  linkedProjects,
  allProjects,
  onLinkProjects,
  onCreateProject,
}: GoalProjectLinksProps) {
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  const unlinkedProjects = useMemo(() => {
    return allProjects.filter(p => !p.goalId || p.goalId !== goalId);
  }, [allProjects, goalId]);

  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleLinkProjects = async () => {
    await onLinkProjects(Array.from(selectedProjects));
    setSelectedProjects(new Set());
    setShowAttachModal(false);
  };

  const handleCreateProject = async (data: Parameters<typeof onCreateProject>[0]) => {
    await onCreateProject(data);
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="rounded-xl p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
              Projects ({linkedProjects.length})
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAttachModal(true)}
              className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
              title="Attach Existing Project"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
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
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 prose prose-sm dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: project.objective }} />
                      </div>
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

      {/* Attach Project Modal */}
      <AnimatePresence>
        {showAttachModal && unlinkedProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAttachModal(false);
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
                    setShowAttachModal(false);
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
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 prose prose-sm dark:prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: project.objective }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button
                  onClick={() => {
                    setShowAttachModal(false);
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
      <NewProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
      />
    </>
  );
}

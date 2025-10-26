"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useTasks } from "@/store/useTasks";
import { useProjects } from "@/store/useProjects";
import { useMoods } from "@/store/useMoods";
import { useFriends } from "@/store/useFriends";
import { ThoughtProcessingService } from "@/services/thoughtProcessingService";
import { ConfirmModal } from "@/components/ConfirmModal";
import Link from "next/link";
import {
  X,
  Trash2,
  Save,
  Brain,
  Edit3,
  Calendar,
  Tag,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ListChecks,
  Target,
  Smile,
} from "lucide-react";

interface ThoughtDetailModalProps {
  thought: Thought;
  onClose: () => void;
}

export function ThoughtDetailModal({ thought, onClose }: ThoughtDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(thought.text);
  const [tagsInput, setTagsInput] = useState(() => {
    if (!thought.tags) return '';
    if (Array.isArray(thought.tags)) return thought.tags.join(', ');
    if (typeof thought.tags === 'string') return thought.tags;
    return '';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAIResources, setShowAIResources] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  const updateThought = useThoughts((s) => s.updateThought);
  const deleteThought = useThoughts((s) => s.deleteThought);
  
  const tasks = useTasks((s) => s.tasks);
  const deleteTask = useTasks((s) => s.deleteTask);
  const projects = useProjects((s) => s.projects);
  const deleteProject = useProjects((s) => s.delete);
  const moods = useMoods((s) => s.moods);
  const deleteMood = useMoods((s) => s.delete);
  const friends = useFriends((s) => s.friends);
  
  const isProcessed = Array.isArray(thought.tags) && thought.tags.includes('processed');

  // Helper function to get shortname from full name
  const getShortName = (name: string): string => {
    const firstName = name.split(' ')[0];
    return firstName.toLowerCase().trim();
  };

  // Render tag component - makes person tags clickable and shows person name
  const renderTag = (tag: string) => {
    if (tag.startsWith('person-')) {
      const shortNameFromTag = tag.replace('person-', '');
      const taggedFriend = friends.find(f => getShortName(f.name) === shortNameFromTag);
      
      if (taggedFriend) {
        return (
          <Link
            key={tag}
            href={`/tools/relationships/${taggedFriend.id}`}
            className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 hover:underline transition-colors"
          >
            {taggedFriend.name}
          </Link>
        );
      }
    }
    return (
      <span key={tag} className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm rounded-full">
        {tag}
      </span>
    );
  };

  // Find AI-created resources linked to this thought
  const aiCreatedResources = useMemo(() => {
    const linkedTasks = tasks.filter(t => t.thoughtId === thought.id);
    const linkedProjects = projects.filter(p => {
      // Check if project was created from this thought
      try {
        const projectNotes = p.notes ? JSON.parse(p.notes) : null;
        return projectNotes?.sourceThoughtId === thought.id;
      } catch {
        return false;
      }
    });
    const linkedMoods = moods.filter(m => m.metadata?.sourceThoughtId === thought.id);
    
    return {
      tasks: linkedTasks,
      projects: linkedProjects,
      moods: linkedMoods,
      total: linkedTasks.length + linkedProjects.length + linkedMoods.length,
    };
  }, [thought.id, tasks, projects, moods]);

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await updateThought(thought.id, {
      text,
      tags: tags.length > 0 ? tags : undefined,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteThought(thought.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleRevertProcessing = async () => {
    // Delete all AI-created resources
    for (const task of aiCreatedResources.tasks) {
      await deleteTask(task.id);
    }
    for (const project of aiCreatedResources.projects) {
      await deleteProject(project.id);
    }
    for (const mood of aiCreatedResources.moods) {
      await deleteMood(mood.id);
    }

    // Remove 'processed' tag from thought
    const updatedTags = (thought.tags || []).filter(t => t !== 'processed');
    await updateThought(thought.id, { tags: updatedTags });

    setShowRevertConfirm(false);
    // Close the modal to refresh the view
    onClose();
  };

  const handleProcessNow = async () => {
    if (isProcessed) {
      setErrorMessage('This thought has already been processed');
      setShowErrorModal(true);
      return;
    }

    setIsProcessing(true);

    const result = await ThoughtProcessingService.processThought(thought.id);

    if (result.success) {
      setShowSuccessModal(true);
      setSuccessMessage('Thought processed successfully! Actions have been executed automatically.');
    } else {
      const needsApiKey = result.error === 'OpenAI API key not configured';
      setErrorMessage(needsApiKey
        ? 'Please configure your OpenAI API key in Settings to enable AI-powered thought processing.'
        : `Failed to process: ${result.error || 'Unknown error'}`);
      setShowErrorModal(true);
    }

    setIsProcessing(false);
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    try {
      // Handle Firebase Timestamp
      if (typeof date === 'object' && 'toDate' in date) {
        return date.toDate().toLocaleDateString();
      }
      // Handle ISO string
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString();
      }
      // Handle timestamp in seconds
      if (typeof date === 'object' && 'seconds' in date) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      return 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/30 rounded-3xl shadow-2xl border-4 border-purple-200 dark:border-purple-800 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border-b-4 border-purple-300 dark:border-purple-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-xl">
                <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Thought Details
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(thought.createdAt)}</span>
                  {isProcessed && (
                    <>
                      <span>•</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Processed
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isProcessed && (
                <button
                  onClick={handleProcessNow}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                  title="Process this thought with AI"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      Process Now
                    </>
                  )}
                </button>
              )}
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setText(thought.text);
                      setTagsInput(() => {
                        if (!thought.tags) return '';
                        if (Array.isArray(thought.tags)) return thought.tags.join(', ');
                        if (typeof thought.tags === 'string') return thought.tags;
                        return '';
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                  title="Edit thought"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="p-6 bg-white dark:bg-gray-900 overflow-y-auto h-full">
            <div className="space-y-6">
              {/* Thought Text */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Thought Content
                </h3>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={4}
                      placeholder="Enter your thought..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setText(thought.text);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                      {thought.text}
                    </p>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <Tag className="h-5 w-5 text-purple-600" />
                  Tags
                </h3>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter tags separated by commas..."
                    />
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Separate multiple tags with commas
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {thought.tags && thought.tags.length > 0 ? (
                      thought.tags.map((tag) => renderTag(tag))
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 italic">
                        No tags
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Processing Status Summary */}
              {isProcessed && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="p-5 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-md">
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-green-800 dark:text-green-200">
                            AI Processing Complete
                          </h3>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            {aiCreatedResources.total > 0 
                              ? `Created ${aiCreatedResources.tasks.length} task(s), ${aiCreatedResources.projects.length} project(s), ${aiCreatedResources.moods.length} mood(s)`
                              : 'This thought has been analyzed'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowRevertConfirm(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg transition-all text-sm transform hover:scale-105 active:scale-95"
                        title="Delete all AI-created resources and mark as unprocessed"
                      >
                        Revert All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI-Created Resources Section */}
              {aiCreatedResources.total > 0 && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowAIResources(!showAIResources)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          AI-Created Resources
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {aiCreatedResources.total} item{aiCreatedResources.total !== 1 ? 's' : ''} created from this thought
                        </p>
                      </div>
                    </div>
                    {showAIResources ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {showAIResources && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4"
                    >
                      {/* Tasks */}
                      {aiCreatedResources.tasks.length > 0 && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-4">
                          <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                            <ListChecks className="h-4 w-4" />
                            Tasks ({aiCreatedResources.tasks.length})
                          </h4>
                          <div className="space-y-2">
                            {aiCreatedResources.tasks.map((task) => (
                              <Link
                                key={task.id}
                                href={`/tools/tasks?id=${task.id}`}
                                className="block p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-md"
                              >
                                <div className="flex items-center gap-2">
                                  {task.done ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
                                  )}
                                  <span className={`text-sm font-medium ${task.done ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {task.title}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projects */}
                      {aiCreatedResources.projects.length > 0 && (
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 p-4">
                          <h4 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Projects ({aiCreatedResources.projects.length})
                          </h4>
                          <div className="space-y-2">
                            {aiCreatedResources.projects.map((project) => (
                              <Link
                                key={project.id}
                                href={`/tools/projects/${project.id}`}
                                className="block p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 transition-all hover:shadow-md"
                              >
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {project.title}
                                </div>
                                {project.objective && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                    {project.objective}
                                  </div>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Moods */}
                      {aiCreatedResources.moods.length > 0 && (
                        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-200 dark:border-yellow-800 p-4">
                          <h4 className="font-bold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
                            <Smile className="h-4 w-4" />
                            Mood Entries ({aiCreatedResources.moods.length})
                          </h4>
                          <div className="space-y-2">
                            {aiCreatedResources.moods.map((mood) => (
                              <div
                                key={mood.id}
                                className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                    {mood.value}/10
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {(() => {
                                      try {
                                        if (!mood.createdAt) return 'N/A';
                                        if (typeof mood.createdAt === 'object' && 'toDate' in mood.createdAt) {
                                          return mood.createdAt.toDate().toLocaleDateString();
                                        }
                                        return new Date(mood.createdAt).toLocaleDateString();
                                      } catch {
                                        return 'N/A';
                                      }
                                    })()}
                                  </span>
                                </div>
                                {mood.note && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                    {mood.note}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setShowSuccessModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Success!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {successMessage}
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setShowErrorModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Error
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {errorMessage}
              </p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Thought?"
        message={`Are you sure you want to delete this thought? This action cannot be undone.`}
        confirmText="Delete Thought"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Revert Processing Confirmation Modal */}
      <ConfirmModal
        isOpen={showRevertConfirm}
        onConfirm={handleRevertProcessing}
        onCancel={() => setShowRevertConfirm(false)}
        title="Revert AI Processing?"
        message={`This will delete ${aiCreatedResources.total} AI-created resource(s) (${aiCreatedResources.tasks.length} tasks, ${aiCreatedResources.projects.length} projects, ${aiCreatedResources.moods.length} moods) and mark this thought as unprocessed. This action cannot be undone.`}
        confirmText="Revert & Delete All"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}
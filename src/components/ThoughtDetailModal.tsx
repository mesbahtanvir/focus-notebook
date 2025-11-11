"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useTasks } from "@/store/useTasks";
import { useProjects } from "@/store/useProjects";
import { useMoods } from "@/store/useMoods";
import { useFriends } from "@/store/useFriends";
import { useGoals } from "@/store/useGoals";
import { useEntityGraph } from "@/store/useEntityGraph";
import { ThoughtProcessingService } from "@/services/thoughtProcessingService";
import { ConfirmModal } from "@/components/ConfirmModal";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
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
  Link2,
  Plus,
} from "lucide-react";

interface ThoughtDetailModalProps {
  thought: Thought;
  onClose: () => void;
}

type ThoughtPromptLog = {
  id: string;
  createdAt?: string;
  trigger?: string;
  status: 'completed' | 'failed';
  promptSnippet: string;
  error?: string | null;
};

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
  const [isProcessingSuggestion, setIsProcessingSuggestion] = useState(false);
  const [thoughtPromptLogs, setThoughtPromptLogs] = useState<ThoughtPromptLog[]>([]);
  const [isThoughtPromptLoading, setIsThoughtPromptLoading] = useState(false);
  const [thoughtPromptError, setThoughtPromptError] = useState<string | null>(null);
  // Manual linking removed - now handled via relationship store

  const updateThought = useThoughts((s) => s.updateThought);
  const deleteThought = useThoughts((s) => s.deleteThought);

  const tasks = useTasks((s) => s.tasks);
  const deleteTask = useTasks((s) => s.deleteTask);
  const projects = useProjects((s) => s.projects);
  const deleteProject = useProjects((s) => s.delete);
  const moods = useMoods((s) => s.moods);
  const deleteMood = useMoods((s) => s.delete);
  const friends = useFriends((s) => s.friends);
  const goals = useGoals((s) => s.goals);
  const relationships = useEntityGraph((s) => s.relationships);
  const { user, isAnonymous, isAnonymousAiAllowed } = useAuth();
  
  const isProcessed = Array.isArray(thought.tags) && thought.tags.includes('processed');

  // Check if button should be shown - hide if processed or currently processing
  const shouldShowProcessButton = !isProcessed &&
    thought.aiProcessingStatus !== 'pending' &&
    thought.aiProcessingStatus !== 'processing' &&
    thought.aiProcessingStatus !== 'completed';

  const formatPromptTimestamp = (value?: string) => {
    if (!value) return 'Unknown time';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  };

  const getPromptStatusBadge = (status: 'completed' | 'failed') => {
    return status === 'failed'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200'
      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200';
  };

  // Render tag component without special linking behavior
  const renderTag = (tag: string) => (
    <span key={tag} className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm rounded-full">
      {tag}
    </span>
  );

  // Find all items linked to this thought via relationships
  const linkedItems = useMemo(() => {
    // Get all relationships for this thought
    const thoughtRels = relationships.filter(
      r => (r.sourceType === 'thought' && r.sourceId === thought.id) ||
           (r.targetType === 'thought' && r.targetId === thought.id)
    );

    // Filter by relationship type - created vs linked
    const createdRels = thoughtRels.filter(r =>
      r.sourceType === 'thought' &&
      r.sourceId === thought.id &&
      r.relationshipType === 'created-from'
    );
    const linkedRels = thoughtRels.filter(r =>
      r.sourceType === 'thought' &&
      r.sourceId === thought.id &&
      (r.relationshipType === 'linked-to' || r.relationshipType === 'mentions')
    );

    // Map relationships to actual entities
    const getEntityFromRel = (rel: any, entityList: any[], type: string) => {
      const id = rel.targetId;
      return entityList.find(e => e.id === id);
    };

    // AI-created items
    const createdTasks = createdRels
      .filter(r => r.targetType === 'task')
      .map(r => getEntityFromRel(r, tasks, 'task'))
      .filter(Boolean);
    const createdProjects = createdRels
      .filter(r => r.targetType === 'project')
      .map(r => getEntityFromRel(r, projects, 'project'))
      .filter(Boolean);
    const createdGoals = createdRels
      .filter(r => r.targetType === 'goal')
      .map(r => getEntityFromRel(r, goals, 'goal'))
      .filter(Boolean);
    const createdMoods = createdRels
      .filter(r => r.targetType === 'mood')
      .map(r => getEntityFromRel(r, moods, 'mood'))
      .filter(Boolean);

    // Linked items
    const linkedTasks = linkedRels
      .filter(r => r.targetType === 'task')
      .map(r => getEntityFromRel(r, tasks, 'task'))
      .filter(Boolean);
    const linkedProjects = linkedRels
      .filter(r => r.targetType === 'project')
      .map(r => getEntityFromRel(r, projects, 'project'))
      .filter(Boolean);
    const linkedGoals = linkedRels
      .filter(r => r.targetType === 'goal')
      .map(r => getEntityFromRel(r, goals, 'goal'))
      .filter(Boolean);
    const linkedPersons = linkedRels
      .filter(r => r.targetType === 'person')
      .map(r => getEntityFromRel(r, friends, 'person'))
      .filter(Boolean);
    const linkedMoods = linkedRels
      .filter(r => r.targetType === 'mood')
      .map(r => getEntityFromRel(r, moods, 'mood'))
      .filter(Boolean);

    return {
      created: {
        tasks: createdTasks,
        projects: createdProjects,
        goals: createdGoals,
        moods: createdMoods,
        total: createdTasks.length + createdProjects.length + createdGoals.length + createdMoods.length,
      },
      linked: {
        tasks: linkedTasks,
        projects: linkedProjects,
        goals: linkedGoals,
        persons: linkedPersons,
        moods: linkedMoods,
        total: linkedTasks.length + linkedProjects.length + linkedGoals.length + linkedPersons.length + linkedMoods.length,
      },
    };
  }, [thought.id, relationships, tasks, projects, goals, moods, friends]);

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

  // Manual linking handlers removed - will use relationship creation in future

  const handleDelete = async () => {
    await deleteThought(thought.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleRevertProcessing = async () => {
    // Delete all AI-created resources
    for (const task of linkedItems.created.tasks) {
      await deleteTask(task.id);
    }
    for (const project of linkedItems.created.projects) {
      await deleteProject(project.id);
    }
    for (const mood of linkedItems.created.moods) {
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
    if (isAnonymous && !isAnonymousAiAllowed) {
      setErrorMessage('Anonymous sessions cannot run AI processing. Create an account or sign in with Google to continue.');
      setShowErrorModal(true);
      return;
    }

    if (isProcessed) {
      setErrorMessage('This thought has already been processed');
      setShowErrorModal(true);
      return;
    }

    setIsProcessing(true);

    const result = await ThoughtProcessingService.processThought(thought.id);

    if (result.success) {
      setShowSuccessModal(true);
      setSuccessMessage(
        result.queued
          ? 'Thought queued for AI processing. We will update this thought when analysis completes.'
          : 'This thought is already queued for AI processing.'
      );
    } else {
      setErrorMessage(result.error ? `Failed to process: ${result.error}` : 'Failed to process thought');
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

  // Handle suggestion actions
  const handleAcceptSuggestion = async (suggestionId: string) => {
    setIsProcessingSuggestion(true);
    try {
      await ThoughtProcessingService.applySuggestion(thought.id, suggestionId, {
        source: 'modal',
      });
      const updatedThought = useThoughts.getState().thoughts.find(t => t.id === thought.id);
      if (updatedThought) {
        setSuccessMessage('Suggestion applied successfully');
        setShowSuccessModal(true);
      }
    } catch (error) {
      setErrorMessage('Failed to apply suggestion');
      setShowErrorModal(true);
    } finally {
      setIsProcessingSuggestion(false);
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    setIsProcessingSuggestion(true);
    try {
      await ThoughtProcessingService.rejectSuggestion(thought.id, suggestionId, {
        source: 'modal',
      });
    } catch (error) {
      setErrorMessage('Failed to reject suggestion');
      setShowErrorModal(true);
    } finally {
      setIsProcessingSuggestion(false);
    }
  };

  const formatActionType = (type: string) => {
    const typeMap: Record<string, string> = {
      createTask: 'Create Task',
      enhanceTask: 'Enhance Task',
      createMood: 'Create Mood Entry',
      addTag: 'Add Tag',
      createProject: 'Create Project',
      createGoal: 'Create Goal',
      linkToProject: 'Link to Project',
      linkToGoal: 'Link to Goal',
      linkToTask: 'Link to Task',
      linkToPerson: 'Link to Person',
      linkToRelationship: 'Link to Relationship',
      createRelationship: 'Create Relationship',
      linkToMood: 'Link to Mood',
      linkToNote: 'Link to Note',
      enhanceProject: 'Enhance Project',
      enhanceGoal: 'Enhance Goal',
      enhanceRelationship: 'Enhance Relationship',
      createErrand: 'Create Errand',
      createNote: 'Create Note',
    };
    return typeMap[type] || type;
  };

  // Helper to render entity details for linking suggestions
  const renderSuggestionEntityDetails = (suggestion: any) => {
    switch (suggestion.type) {
      case 'linkToGoal':
        const goal = goals.find(g => g.id === suggestion.data.goalId);
        if (goal) {
          return (
            <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-700">
              <Link
                href={`/tools/goals/${goal.id}`}
                className="text-sm font-medium text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1"
              >
                <Target className="h-3 w-3" />
                Goal: {goal.title}
              </Link>
            </div>
          );
        }
        break;

      case 'linkToProject':
        const project = projects.find(p => p.id === suggestion.data.projectId);
        if (project) {
          return (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
              <Link
                href={`/tools/projects/${project.id}`}
                className="text-sm font-medium text-green-700 dark:text-green-300 hover:underline flex items-center gap-1"
              >
                <Target className="h-3 w-3" />
                Project: {project.title}
              </Link>
            </div>
          );
        }
        break;

      case 'linkToTask':
        const task = tasks.find(t => t.id === suggestion.data.taskId);
        if (task) {
          return (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
              <Link
                href={`/tools/tasks?id=${task.id}`}
                className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
              >
                <ListChecks className="h-3 w-3" />
                Task: {task.title}
              </Link>
            </div>
          );
        }
        break;

      case 'linkToPerson':
        const person = friends.find(f => f.id === suggestion.data.personId);
        if (person) {
          return (
            <div className="mt-2 p-2 bg-pink-50 dark:bg-pink-900/20 rounded border border-pink-200 dark:border-pink-700">
              <Link
                href={`/tools/relationships/${person.id}`}
                className="text-sm font-medium text-pink-700 dark:text-pink-300 hover:underline flex items-center gap-1"
              >
                <Smile className="h-3 w-3" />
                Person: {person.name}
              </Link>
            </div>
          );
        }
        break;
    }
    return null;
  };

  const pendingSuggestions = thought.aiSuggestions?.filter(s => s.status === 'pending') || [];

  useEffect(() => {
    let isMounted = true;
    const loadPromptLogs = async () => {
      const userId = user?.uid;
      if (!userId) {
        setThoughtPromptLogs([]);
        return;
      }

      setIsThoughtPromptLoading(true);
      setThoughtPromptError(null);

      try {
        const logsQuery = query(
          collection(db, `users/${userId}/llmLogs`),
          where('thoughtId', '==', thought.id),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snapshot = await getDocs(logsQuery);
        if (!isMounted) return;
        const entries: ThoughtPromptLog[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          const createdAt = data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt;
          const promptText = typeof data.prompt === 'string' ? data.prompt : '';
          const snippet = promptText.length > 200 ? `${promptText.slice(0, 200)}…` : promptText;
          const status: 'completed' | 'failed' = data.error ? 'failed' : data.status ?? 'completed';
          return {
            id: doc.id,
            createdAt,
            trigger: data.trigger,
            status,
            promptSnippet: snippet,
            error: data.error ?? null,
          };
        });
        setThoughtPromptLogs(entries);
      } catch (error) {
        if (isMounted) {
          console.log('Error loading thought prompt logs:', error);
          setThoughtPromptError('Unable to load recent AI requests');
        }
      } finally {
        if (isMounted) {
          setIsThoughtPromptLoading(false);
        }
      }
    };

    loadPromptLogs();

    return () => {
      isMounted = false;
    };
  }, [thought.id, user?.uid]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative min-h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/30 rounded-3xl shadow-2xl border-4 border-purple-200 dark:border-purple-800 max-w-4xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border-b-4 border-purple-300 dark:border-purple-700 p-6 rounded-t-3xl">
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
              {shouldShowProcessButton && (
                <button
                  onClick={handleProcessNow}
                  disabled={isProcessing || (isAnonymous && !isAnonymousAiAllowed)}
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
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900 space-y-6 overscroll-contain rounded-b-3xl" style={{ WebkitOverflowScrolling: 'touch' }}>
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

              {/* AI Suggestions */}
              {pendingSuggestions.length > 0 && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        AI Suggestions
                      </h3>
                      <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                        {pendingSuggestions.length} pending
                      </span>
                    </div>

                    <div className="space-y-3">
                      {pendingSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatActionType(suggestion.type)}
                            </span>
                            <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-full font-medium">
                              {suggestion.confidence}% confidence
                            </span>
                          </div>

                          {renderSuggestionEntityDetails(suggestion)}

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 mt-2">
                            {suggestion.reasoning}
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptSuggestion(suggestion.id)}
                              disabled={isProcessingSuggestion}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectSuggestion(suggestion.id)}
                              disabled={isProcessingSuggestion}
                              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                        <Brain className="h-5 w-5 text-purple-700 dark:text-purple-200" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">AI Processing History</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Latest debug logs for this thought</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <Link
                        href={`/admin/prompts?thoughtId=${thought.id}`}
                        className="text-purple-700 dark:text-purple-300 hover:underline"
                      >
                        Open AI History ↗
                      </Link>
                      <span className="text-gray-400">•</span>
                      <Link
                        href={`/admin?thoughtId=${thought.id}`}
                        className="text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Debug Console ↗
                      </Link>
                    </div>
                  </div>

                  {isThoughtPromptLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading recent AI requests...
                    </div>
                  )}

                  {thoughtPromptError && (
                    <div className="text-sm text-red-600 dark:text-red-300 space-y-1">
                      <p>{thoughtPromptError}</p>
                      <Link
                        href={`/admin/prompts?thoughtId=${thought.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline dark:text-purple-300"
                      >
                        View AI history ↗
                      </Link>
                    </div>
                  )}

                  {!isThoughtPromptLoading && !thoughtPromptError && thoughtPromptLogs.length === 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No AI requests recorded yet.</p>
                  )}

                  <div className="mt-3 space-y-3">
                    {thoughtPromptLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-gray-900"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2 text-gray-600 dark:text-gray-300">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatPromptTimestamp(log.createdAt)}
                            </span>
                            {log.trigger && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 font-semibold uppercase tracking-wide">
                                {log.trigger}
                              </span>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${getPromptStatusBadge(log.status)}`}>
                            {log.status === 'failed' ? 'Failed' : 'Completed'}
                          </span>
                        </div>
                        {log.promptSnippet && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {log.promptSnippet}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                          {log.error ? (
                            <span className="text-red-600 dark:text-red-300 truncate">⚠ {log.error}</span>
                          ) : (
                            <span></span>
                          )}
                          <Link
                            href={`/admin/prompts/${log.id}`}
                            className="text-purple-600 dark:text-purple-300 font-semibold hover:underline"
                          >
                            View log ↗
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                            {linkedItems.created.total > 0 
                              ? `Created ${linkedItems.created.tasks.length} task(s), ${linkedItems.created.projects.length} project(s), ${linkedItems.created.moods.length} mood(s)`
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
              {linkedItems.created.total > 0 && (
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
                          {linkedItems.created.total} item{linkedItems.created.total !== 1 ? 's' : ''} created from this thought
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
                      {linkedItems.created.tasks.length > 0 && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-4">
                          <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                            <ListChecks className="h-4 w-4" />
                            Tasks ({linkedItems.created.tasks.length})
                          </h4>
                          <div className="space-y-2">
                            {linkedItems.created.tasks.map((task) => (
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
                      {linkedItems.created.projects.length > 0 && (
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 p-4">
                          <h4 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Projects ({linkedItems.created.projects.length})
                          </h4>
                          <div className="space-y-2">
                            {linkedItems.created.projects.map((project) => (
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
                      {linkedItems.created.moods.length > 0 && (
                        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-200 dark:border-yellow-800 p-4">
                          <h4 className="font-bold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
                            <Smile className="h-4 w-4" />
                            Mood Entries ({linkedItems.created.moods.length})
                          </h4>
                          <div className="space-y-2">
                            {linkedItems.created.moods.map((mood) => (
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

              {/* Manually Linked Items Section */}
              {linkedItems.linked.total > 0 && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border-2 border-teal-200 dark:border-teal-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg">
                        <Link2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          Linked Items
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {linkedItems.linked.total} item{linkedItems.linked.total !== 1 ? 's' : ''} linked to this thought
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Linked Goals */}
                      {linkedItems.linked.goals.length > 0 && (
                        <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-700 p-3">
                          <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2 text-sm">
                            <Target className="h-4 w-4" />
                            Goals ({linkedItems.linked.goals.length})
                          </h4>
                          <div className="space-y-2">
                            {linkedItems.linked.goals.map((goal) => (
                              <Link
                                key={goal.id}
                                href={`/tools/goals/${goal.id}`}
                                className="block p-2 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all hover:shadow-sm"
                              >
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {goal.title}
                                </div>
                                {goal.objective && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                    {goal.objective}
                                  </div>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Linked Tasks */}
                      {linkedItems.linked.tasks.length > 0 && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700 p-3">
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2 text-sm">
                            <ListChecks className="h-4 w-4" />
                            Tasks ({linkedItems.linked.tasks.length})
                          </h4>
                          <div className="space-y-2">
                            {linkedItems.linked.tasks.map((task) => (
                              <Link
                                key={task.id}
                                href={`/tools/tasks?id=${task.id}`}
                                className="block p-2 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-sm"
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

                      {/* Linked Projects */}
                      {linkedItems.linked.projects.length > 0 && (
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700 p-3">
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2 text-sm">
                            <Target className="h-4 w-4" />
                            Projects ({linkedItems.linked.projects.length})
                          </h4>
                          <div className="space-y-2">
                            {linkedItems.linked.projects.map((project) => (
                              <Link
                                key={project.id}
                                href={`/tools/projects/${project.id}`}
                                className="block p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 transition-all hover:shadow-sm"
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

                      {/* Linked People */}
                      {linkedItems.linked.persons.length > 0 && (
                        <div className="rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-700 p-3">
                          <h4 className="font-semibold text-pink-800 dark:text-pink-200 mb-2 flex items-center gap-2 text-sm">
                            <Smile className="h-4 w-4" />
                            People ({linkedItems.linked.persons.length})
                          </h4>
                          <div className="space-y-2">
                            {linkedItems.linked.persons.map((person) => (
                              <Link
                                key={person.id}
                                href={`/tools/relationships/${person.id}`}
                                className="block p-2 bg-white dark:bg-gray-800 rounded border border-pink-200 dark:border-pink-700 hover:border-pink-400 dark:hover:border-pink-500 transition-all hover:shadow-sm"
                              >
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {person.name}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Linked Moods */}
                      {linkedItems.linked.moods.length > 0 && (
                        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-700 p-3">
                          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2 text-sm">
                            <Smile className="h-4 w-4" />
                            Moods ({linkedItems.linked.moods.length})
                          </h4>
                          <div className="space-y-2">
                            {linkedItems.linked.moods.map((mood) => (
                              <div
                                key={mood.id}
                                className="p-2 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-700"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
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
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                    {mood.note}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
        </motion.div>
      </div>

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
              <div className="flex gap-2 justify-center">
                {errorMessage?.includes('Focus Notebook Pro is required') ? (
                  <>
                    <Link
                      href="/profile"
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                      onClick={() => setShowErrorModal(false)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Subscribe to Pro
                    </Link>
                    <button
                      onClick={() => setShowErrorModal(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    OK
                  </button>
                )}
              </div>
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
        message={`This will delete ${linkedItems.created.total} AI-created resource(s) (${linkedItems.created.tasks.length} tasks, ${linkedItems.created.projects.length} projects, ${linkedItems.created.moods.length} moods) and mark this thought as unprocessed. This action cannot be undone.`}
        confirmText="Revert & Delete All"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}

import { useState, useCallback, useRef } from 'react';
import { ImportService } from '@/services/import-export/ImportService';
import { ExportService } from '@/services/import-export/ExportService';
import {
  ParsedImportData,
  ImportSelection,
  ImportOptions,
  ImportResult,
  ImportProgress,
  ExportFilterOptions,
  EntityType,
} from '@/types/import-export';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useThoughts } from '@/store/useThoughts';
import { useMoods } from '@/store/useMoods';
import { useFocus } from '@/store/useFocus';
import { useRelationships } from '@/store/useRelationships';
import { useInvestments } from '@/store/useInvestments';
import { auth, db } from '@/lib/firebaseClient';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function sanitizeForFirestore(value: any): any {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeForFirestore(entry))
      .filter((entry) => entry !== undefined);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    if (
      Object.prototype.hasOwnProperty.call(value, 'seconds') &&
      Object.prototype.hasOwnProperty.call(value, 'nanoseconds') &&
      typeof (value as any).seconds === 'number' &&
      typeof (value as any).nanoseconds === 'number'
    ) {
      return new Timestamp((value as any).seconds, (value as any).nanoseconds);
    }

    const sanitized: Record<string, any> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      const nestedSanitized = sanitizeForFirestore(nestedValue);
      if (nestedSanitized !== undefined) {
        sanitized[key] = nestedSanitized;
      }
    }
    return sanitized;
  }

  return value;
}

function withBaseMetadata(entity: any, userId: string, prefix: string) {
  const nowIso = new Date().toISOString();
  const id =
    entity?.id && String(entity.id).trim().length > 0
      ? String(entity.id)
      : generateId(prefix);
  const createdAt = entity?.createdAt ?? nowIso;

  return {
    ...entity,
    id,
    createdAt,
    updatedAt: entity?.updatedAt ?? createdAt,
    updatedBy: entity?.updatedBy ?? userId,
    version: entity?.version ?? 1,
  };
}

function normalizeTask(task: any, userId: string) {
  const base = withBaseMetadata(task ?? {}, userId, 'task');

  return {
    ...base,
    title: base.title ?? 'Untitled Task',
    done: base.done ?? false,
    status: base.status ?? 'active',
    priority: base.priority ?? 'medium',
    focusEligible:
      base.focusEligible !== undefined ? base.focusEligible : true,
    steps: Array.isArray(base.steps) ? base.steps : [],
    tags: Array.isArray(base.tags) ? base.tags : [],
    completionHistory: Array.isArray(base.completionHistory)
      ? base.completionHistory
      : [],
  };
}

function normalizeProject(project: any, userId: string) {
  const base = withBaseMetadata(project ?? {}, userId, 'project');

  return {
    ...base,
    title: base.title ?? 'Untitled Project',
    status: base.status ?? 'active',
    priority: base.priority ?? 'medium',
    progress:
      typeof base.progress === 'number' ? base.progress : base.progress ? Number(base.progress) || 0 : 0,
    linkedTaskIds: Array.isArray(base.linkedTaskIds)
      ? base.linkedTaskIds
      : [],
    linkedThoughtIds: Array.isArray(base.linkedThoughtIds)
      ? base.linkedThoughtIds
      : [],
  };
}

function normalizeGoal(goal: any, userId: string) {
  const base = withBaseMetadata(goal ?? {}, userId, 'goal');

  return {
    ...base,
    progress:
      typeof base.progress === 'number' ? base.progress : base.progress ? Number(base.progress) || 0 : 0,
    tags: Array.isArray(base.tags) ? base.tags : base.tags ? [base.tags] : [],
  };
}

function normalizeThought(thought: any, userId: string) {
  const base = withBaseMetadata(thought ?? {}, userId, 'thought');

  return {
    ...base,
    linkedTaskIds: Array.isArray(base.linkedTaskIds)
      ? base.linkedTaskIds
      : [],
    linkedProjectIds: Array.isArray(base.linkedProjectIds)
      ? base.linkedProjectIds
      : [],
    linkedMoodIds: Array.isArray(base.linkedMoodIds)
      ? base.linkedMoodIds
      : [],
  };
}

function normalizeMood(mood: any, userId: string) {
  const base = withBaseMetadata(mood ?? {}, userId, 'mood');

  return {
    ...base,
    metadata: base.metadata ?? null,
  };
}

function normalizePerson(person: any, userId: string) {
  const base = withBaseMetadata(person ?? {}, userId, 'person');

  return {
    ...base,
    linkedThoughtIds: Array.isArray(base.linkedThoughtIds)
      ? base.linkedThoughtIds
      : [],
    interactionLogs: Array.isArray(base.interactionLogs)
      ? base.interactionLogs
      : [],
  };
}

function normalizeFocusSession(
  session: any,
  userId: string,
  taskLookup: (taskId: string) => any
) {
  const base = withBaseMetadata(session ?? {}, userId, 'session');
  const rawTasks = Array.isArray(session?.tasks)
    ? session.tasks
    : session?.tasksData
    ? (() => {
        try {
          return JSON.parse(session.tasksData);
        } catch {
          return [];
        }
      })()
    : [];

  const normalizedTasks = rawTasks.map((entry: any) => {
    if (entry?.task) {
      const normalizedTask = normalizeTask(entry.task, userId);
      return {
        timeSpent: entry.timeSpent ?? 0,
        completed: entry.completed ?? false,
        notes: entry.notes ?? '',
        followUpTaskIds: Array.isArray(entry.followUpTaskIds)
          ? entry.followUpTaskIds
          : [],
        task: normalizedTask,
      };
    }

    const referencedTask =
      entry?.id && typeof entry.id === 'string'
        ? taskLookup(entry.id)
        : undefined;

    const fallbackTask = referencedTask
      ? referencedTask
      : normalizeTask(
          {
            id: entry?.id ?? generateId('task'),
            title: entry?.title ?? 'Imported Task',
            done: entry?.completed ?? false,
            status: entry?.status ?? 'active',
            priority: entry?.priority ?? 'medium',
            category: entry?.category,
            tags: entry?.tags,
          },
          userId
        );

    return {
      timeSpent: entry?.timeSpent ?? 0,
      completed: entry?.completed ?? false,
      notes: entry?.notes ?? '',
      followUpTaskIds: Array.isArray(entry?.followUpTaskIds)
        ? entry.followUpTaskIds
        : [],
      task: fallbackTask,
    };
  });

  const clampedIndex =
    normalizedTasks.length === 0
      ? 0
      : Math.min(
          Math.max(base.currentTaskIndex ?? 0, 0),
          normalizedTasks.length - 1
        );

  return {
    ...base,
    duration: base.duration ?? 0,
    startTime: base.startTime ?? new Date().toISOString(),
    endTime: base.endTime ?? null,
    isActive: base.isActive ?? false,
    isOnBreak: base.isOnBreak ?? false,
    currentTaskIndex: clampedIndex,
    breaks: Array.isArray(base.breaks) ? base.breaks : [],
    tasks: normalizedTasks,
    tasksData: JSON.stringify(normalizedTasks),
  };
}

export function useImportExport() {
  const [importService] = useState(() => new ImportService());
  const [exportService] = useState(() => new ExportService());

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Get stores
  const tasks = useTasks();
  const projects = useProjects();
  const goals = useGoals();
  const thoughts = useThoughts();
  const moods = useMoods();
  const focus = useFocus();
  const relationships = useRelationships();
  const investments = useInvestments();

  const importedTasksRef = useRef<Map<string, any>>(new Map());

  const getUserId = useCallback((): string => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('Not authenticated');
    }
    return userId;
  }, []);

  const writeDocument = useCallback(
    async (userId: string, collection: string, payload: any) => {
      const docRef = doc(db, `users/${userId}/${collection}/${payload.id}`);
      await setDoc(docRef, sanitizeForFirestore(payload));
    },
    []
  );

  /**
   * Parse an import file
   */
  const parseFile = useCallback(
    async (file: File) => {
      try {
        setIsImporting(true);
        const parsed = await importService.parseImportFile(file, (progress) => {
          setImportProgress(progress);
        });
        setParsedData(parsed);
        return parsed;
      } catch (error) {
        console.error('Failed to parse import file:', error);
        throw error;
      } finally {
        setIsImporting(false);
      }
    },
    [importService]
  );

  /**
   * Execute import with selection and options
   */
  const executeImport = useCallback(
    async (
      data: ParsedImportData,
      selection: ImportSelection,
      options: ImportOptions
    ) => {
      try {
        setIsImporting(true);
        setImportProgress(null);

        // Get existing data for conflict detection
        const existingData = {
          tasks: tasks.tasks,
          projects: projects.projects,
          goals: goals.goals,
          thoughts: thoughts.thoughts,
          moods: moods.moods,
          focusSessions: focus.sessions,
          people: relationships.people,
          portfolios: investments.portfolios,
        };

        // Re-detect conflicts with existing data
        const conflictService = importService['conflictService'];
        data.conflicts = await conflictService.detectConflicts(
          data.entities,
          existingData
        );

        // Prepare runtime helpers
        importedTasksRef.current.clear();

        const taskLookup = (taskId: string) =>
          importedTasksRef.current.get(taskId) ||
          tasks.tasks.find((t) => t.id === taskId);

        // Execute import
        const result = await importService.executeImport(
          data,
          selection,
          options,
          {
            tasks: {
              add: async (task: any) => {
                const userId = getUserId();
                const normalized = normalizeTask(task, userId);
                await writeDocument(userId, 'tasks', normalized);
                importedTasksRef.current.set(normalized.id, normalized);
              },
            },
            projects: {
              add: async (project: any) => {
                const userId = getUserId();
                const normalized = normalizeProject(project, userId);
                await writeDocument(userId, 'projects', normalized);
              },
            },
            goals: {
              add: async (goal: any) => {
                const userId = getUserId();
                const normalized = normalizeGoal(goal, userId);
                await writeDocument(userId, 'goals', normalized);
              },
            },
            thoughts: {
              add: async (thought: any) => {
                const userId = getUserId();
                const normalized = normalizeThought(thought, userId);
                await writeDocument(userId, 'thoughts', normalized);
              },
            },
            moods: {
              add: async (mood: any) => {
                const userId = getUserId();
                const normalized = normalizeMood(mood, userId);
                await writeDocument(userId, 'moods', normalized);
              },
            },
            focusSessions: {
              add: async (session: any) => {
                const userId = getUserId();
                const normalized = normalizeFocusSession(
                  session,
                  userId,
                  taskLookup
                );
                await writeDocument(userId, 'focusSessions', normalized);
              },
            },
            people: {
              add: async (person: any) => {
                const userId = getUserId();
                const normalized = normalizePerson(person, userId);
                await writeDocument(userId, 'people', normalized);
              },
            },
            portfolios: {
              add: async (portfolio: any) => {
                await investments.importPortfolios([portfolio], {
                  preserveIds: options.preserveIds,
                  overwriteExisting: options.strategy === 'replace',
                });
              },
            },
          },
          (progress) => {
            setImportProgress(progress);
          }
        );

        setImportResult(result);
        return result;
      } catch (error) {
        console.error('Failed to execute import:', error);
        throw error;
      } finally {
        setIsImporting(false);
        importedTasksRef.current.clear();
      }
    },
    [importService, tasks, projects, goals, thoughts, moods, focus, relationships, investments, getUserId, writeDocument]
  );

  /**
   * Cancel ongoing import
   */
  const cancelImport = useCallback(() => {
    importService.cancelImport();
  }, [importService]);

  /**
   * Export data with filters
   */
  const exportData = useCallback(
    async (filters: ExportFilterOptions) => {
      try {
        setIsExporting(true);

        const userId = auth.currentUser?.uid || 'unknown';

        // Collect all data
        const allData = {
          tasks: tasks.tasks,
          projects: projects.projects,
          goals: goals.goals,
          thoughts: thoughts.thoughts,
          moods: moods.moods,
          focusSessions: focus.sessions,
          people: relationships.people,
          portfolios: investments.getPortfoliosForExport
            ? investments.getPortfoliosForExport()
            : investments.portfolios,
        };

        // Export with filters
        const exported = await exportService.exportWithFilters(
          allData,
          userId,
          filters
        );

        // Download as JSON
        exportService.downloadAsJson(exported);

        return exported;
      } catch (error) {
        console.error('Failed to export data:', error);
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    [exportService, tasks, projects, goals, thoughts, moods, focus, relationships, investments]
  );

  /**
   * Export all data
   */
  const exportAll = useCallback(async () => {
    try {
      setIsExporting(true);

      const userId = auth.currentUser?.uid || 'unknown';

      const allData = {
        tasks: tasks.tasks,
        projects: projects.projects,
        goals: goals.goals,
        thoughts: thoughts.thoughts,
        moods: moods.moods,
        focusSessions: focus.sessions,
        people: relationships.people,
        portfolios: investments.getPortfoliosForExport
          ? investments.getPortfoliosForExport()
          : investments.portfolios,
      };

      const exported = await exportService.exportAll(allData, userId);
      exportService.downloadAsJson(exported);

      return exported;
    } catch (error) {
      console.error('Failed to export all data:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [exportService, tasks, projects, goals, thoughts, moods, focus, relationships, investments]);

  /**
   * Get available entity counts for export
   */
  const getAvailableCounts = useCallback((): Record<EntityType, number> => {
    return {
      tasks: tasks.tasks.length,
      projects: projects.projects.length,
      goals: goals.goals.length,
      thoughts: thoughts.thoughts.length,
      moods: moods.moods.length,
      focusSessions: focus.sessions.length,
      people: relationships.people.length,
      portfolios: investments.portfolios.length,
    };
  }, [tasks, projects, goals, thoughts, moods, focus, relationships, investments]);

  /**
   * Reset import state
   */
  const resetImport = useCallback(() => {
    setParsedData(null);
    setImportProgress(null);
    setImportResult(null);
  }, []);

  return {
    // Import
    parseFile,
    executeImport,
    cancelImport,
    resetImport,
    parsedData,
    importProgress,
    importResult,
    isImporting,

    // Export
    exportData,
    exportAll,
    getAvailableCounts,
    isExporting,
  };
}

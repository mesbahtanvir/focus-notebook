import { useState, useCallback } from 'react';
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
import { auth } from '@/lib/firebaseClient';

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
          focusSessions: focus.focusSessions,
          people: relationships.people,
        };

        // Re-detect conflicts with existing data
        const conflictService = importService['conflictService'];
        data.conflicts = await conflictService.detectConflicts(
          data.entities,
          existingData
        );

        // Execute import
        const result = await importService.executeImport(
          data,
          selection,
          options,
          {
            tasks: { add: (task) => tasks.add(task) },
            projects: { add: (project) => projects.add(project) },
            goals: { add: (goal) => goals.add(goal) },
            thoughts: { add: (thought) => thoughts.add(thought) },
            moods: { add: (mood) => moods.add(mood) },
            focusSessions: { add: (session) => focus.addSession(session) },
            people: { add: (person) => relationships.add(person) },
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
      }
    },
    [importService, tasks, projects, goals, thoughts, moods, focus, relationships]
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
          focusSessions: focus.focusSessions,
          people: relationships.people,
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
    [exportService, tasks, projects, goals, thoughts, moods, focus, relationships]
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
        focusSessions: focus.focusSessions,
        people: relationships.people,
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
  }, [exportService, tasks, projects, goals, thoughts, moods, focus, relationships]);

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
      focusSessions: focus.focusSessions.length,
      people: relationships.people.length,
    };
  }, [tasks, projects, goals, thoughts, moods, focus, relationships]);

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

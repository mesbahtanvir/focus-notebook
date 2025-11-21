import { auth, db } from '@/lib/firebaseClient';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { createAt } from '@/lib/data/gateway';
import { useTasks } from '@/store/useTasks';
import { useGoals } from '@/store/useGoals';
import { useProjects } from '@/store/useProjects';
import { useThoughts } from '@/store/useThoughts';
import { useMoods } from '@/store/useMoods';
import { useFocus } from '@/store/useFocus';

export interface ExportedData {
  version: string;
  exportedAt: string;
  userId: string;
  data: {
    tasks: any[];
    goals: any[];
    projects: any[];
    thoughts: any[];
    moods: any[];
    focusSessions: any[];
  };
}

export interface ExportOptions {
  tasks?: boolean;
  goals?: boolean;
  projects?: boolean;
  thoughts?: boolean;
  moods?: boolean;
  focusSessions?: boolean;
}

/**
 * Export all user data to a JSON file
 */
export async function exportAllData(): Promise<ExportedData> {
  return exportData({ tasks: true, goals: true, projects: true, thoughts: true, moods: true, focusSessions: true });
}

/**
 * Export selected user data to a JSON file
 */
export async function exportData(options: ExportOptions): Promise<ExportedData> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  // Get data from stores (which are already subscribed to Firestore)
  const tasksState = useTasks.getState();
  const goalsState = useGoals.getState();
  const projectsState = useProjects.getState();
  const thoughtsState = useThoughts.getState();
  const moodsState = useMoods.getState();
  const focusState = useFocus.getState();

  const exportData: ExportedData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    userId,
    data: {
      tasks: options.tasks ? tasksState.tasks : [],
      goals: options.goals ? goalsState.goals : [],
      projects: options.projects ? projectsState.projects : [],
      thoughts: options.thoughts ? thoughtsState.thoughts : [],
      moods: options.moods ? moodsState.moods : [],
      focusSessions: options.focusSessions ? focusState.sessions : [],
    },
  };

  return exportData;
}

/**
 * Download exported data as a JSON file
 */
export function downloadDataAsFile(data: ExportedData, filename?: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `focus-notebook-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Delete all user data from Firestore
 */
export async function deleteAllUserData(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  const collections = ['tasks', 'goals', 'projects', 'thoughts', 'moods', 'focusSessions', 'portfolios'];

  try {
    // Delete all documents in each collection
    for (const collectionName of collections) {
      const collectionRef = collection(db, `users/${userId}/${collectionName}`);
      const snapshot = await getDocs(collectionRef);

      const deletePromises = snapshot.docs.map(document =>
        deleteDoc(doc(db, `users/${userId}/${collectionName}`, document.id))
      );

      await Promise.all(deletePromises);
    }
    
    // Clear local storage related to app settings
    const keysToRemove = [
      'appSettings',
      'lastThoughtProcessTime',
      'processQueue',
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw new Error('Failed to delete all data. Please try again.');
  }
}

/**
 * Get data statistics for display
 */
export function getDataStats() {
  const tasksState = useTasks.getState();
  const goalsState = useGoals.getState();
  const projectsState = useProjects.getState();
  const thoughtsState = useThoughts.getState();
  const moodsState = useMoods.getState();
  const focusState = useFocus.getState();

  return {
    tasks: tasksState.tasks.length,
    goals: goalsState.goals.length,
    projects: projectsState.projects.length,
    thoughts: thoughtsState.thoughts.length,
    moods: moodsState.moods.length,
    focusSessions: focusState.sessions.length,
    total:
      tasksState.tasks.length +
      goalsState.goals.length +
      projectsState.projects.length +
      thoughtsState.thoughts.length +
      moodsState.moods.length +
      focusState.sessions.length,
  };
}

/**
 * Validate imported data structure
 */
function validateImportData(data: any): data is ExportedData {
  if (!data || typeof data !== 'object') return false;
  if (!data.version || !data.exportedAt || !data.userId) return false;
  if (!data.data || typeof data.data !== 'object') return false;

  const requiredCollections = ['tasks', 'goals', 'projects', 'thoughts', 'moods'];
  for (const collection of requiredCollections) {
    if (!Array.isArray(data.data[collection])) return false;
  }

  // focusSessions is optional for backward compatibility
  if (data.data.focusSessions && !Array.isArray(data.data.focusSessions)) return false;

  return true;
}

export interface ImportProgress {
  currentCollection: string;
  currentItem: number;
  totalItems: number;
  percentage: number;
}

/**
 * Import data from a JSON file
 */
export async function importDataFromFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<{ success: boolean; stats: any; error?: string }> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        const importedData = JSON.parse(jsonString);

        // Validate data structure
        if (!validateImportData(importedData)) {
          resolve({
            success: false,
            stats: null,
            error: 'Invalid data format. Please use a valid Focus Notebook export file.',
          });
          return;
        }

        // Import data to Firestore with progress tracking
        const stats = await importAllData(importedData, userId, onProgress);

        resolve({
          success: true,
          stats,
        });
      } catch (error) {
        console.error('Import error:', error);
        resolve({
          success: false,
          stats: null,
          error: error instanceof Error ? error.message : 'Failed to parse JSON file',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        stats: null,
        error: 'Failed to read file',
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Import all data to Firestore
 */
async function importAllData(
  importedData: ExportedData,
  userId: string,
  onProgress?: (progress: ImportProgress) => void
) {
  const { data } = importedData;
  const stats = {
    tasks: 0,
    goals: 0,
    projects: 0,
    thoughts: 0,
    moods: 0,
    focusSessions: 0,
  };

  // Calculate total items for progress tracking
  const totalItems =
    data.tasks.length +
    data.goals.length +
    data.projects.length +
    data.thoughts.length +
    data.moods.length +
    (data.focusSessions?.length || 0);

  let processedItems = 0;

  const reportProgress = (collection: string, itemCount: number) => {
    processedItems += itemCount;
    if (onProgress) {
      onProgress({
        currentCollection: collection,
        currentItem: processedItems,
        totalItems,
        percentage: Math.round((processedItems / totalItems) * 100),
      });
    }
  };

  try {
    // Import tasks
    onProgress?.({
      currentCollection: 'tasks',
      currentItem: 0,
      totalItems,
      percentage: 0,
    });

    for (const task of data.tasks) {
      const taskId = task.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const taskData = { ...task };
      delete taskData.id; // Remove id as it will be the document ID

      await createAt(`users/${userId}/tasks/${taskId}`, taskData);
      stats.tasks++;
      reportProgress('tasks', 1);
    }

    // Import goals
    for (const goal of data.goals) {
      const goalId = goal.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const goalData = { ...goal };
      delete goalData.id;

      await createAt(`users/${userId}/goals/${goalId}`, goalData);
      stats.goals++;
      reportProgress('goals', 1);
    }

    // Import projects
    for (const project of data.projects) {
      const projectId = project.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const projectData = { ...project };
      delete projectData.id;

      await createAt(`users/${userId}/projects/${projectId}`, projectData);
      stats.projects++;
      reportProgress('projects', 1);
    }

    // Import thoughts
    for (const thought of data.thoughts) {
      const thoughtId = thought.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const thoughtData = { ...thought };
      delete thoughtData.id;

      await createAt(`users/${userId}/thoughts/${thoughtId}`, thoughtData);
      stats.thoughts++;
      reportProgress('thoughts', 1);
    }

    // Import moods
    for (const mood of data.moods) {
      const moodId = mood.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const moodData = { ...mood };
      delete moodData.id;

      await createAt(`users/${userId}/moods/${moodId}`, moodData);
      stats.moods++;
      reportProgress('moods', 1);
    }

    // Import focus sessions (if available)
    if (data.focusSessions && Array.isArray(data.focusSessions)) {
      for (const session of data.focusSessions) {
        const sessionId = session.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const sessionData = { ...session };
        delete sessionData.id;

        // Convert tasks array to JSON string if needed (as stored in Firestore)
        if (sessionData.tasks && Array.isArray(sessionData.tasks)) {
          sessionData.tasksData = JSON.stringify(sessionData.tasks);
          delete sessionData.tasks;
        }

        await createAt(`users/${userId}/focusSessions/${sessionId}`, sessionData);
        stats.focusSessions++;
        reportProgress('focusSessions', 1);
      }
    }

    return stats;
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Failed to import data. Some items may have been imported.');
  }
}

/**
 * Read and parse a file
 */
export async function readImportFile(file: File): Promise<ExportedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!validateImportData(data)) {
          reject(new Error('Invalid data format'));
          return;
        }
        resolve(data);
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

import { auth, db } from '@/lib/firebaseClient';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { createAt } from '@/lib/data/gateway';
import { useTasks } from '@/store/useTasks';
import { useGoals } from '@/store/useGoals';
import { useProjects } from '@/store/useProjects';
import { useThoughts } from '@/store/useThoughts';
import { useMoods } from '@/store/useMoods';

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
  };
}

/**
 * Export all user data to a JSON file
 */
export async function exportAllData(): Promise<ExportedData> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  // Get data from stores (which are already subscribed to Firestore)
  const tasksState = useTasks.getState();
  const goalsState = useGoals.getState();
  const projectsState = useProjects.getState();
  const thoughtsState = useThoughts.getState();
  const moodsState = useMoods.getState();

  const exportData: ExportedData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    userId,
    data: {
      tasks: tasksState.tasks,
      goals: goalsState.goals,
      projects: projectsState.projects,
      thoughts: thoughtsState.thoughts,
      moods: moodsState.moods,
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

  const collections = ['tasks', 'goals', 'projects', 'thoughts', 'moods'];
  
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

  return {
    tasks: tasksState.tasks.length,
    goals: goalsState.goals.length,
    projects: projectsState.projects.length,
    thoughts: thoughtsState.thoughts.length,
    moods: moodsState.moods.length,
    total: 
      tasksState.tasks.length +
      goalsState.goals.length +
      projectsState.projects.length +
      thoughtsState.thoughts.length +
      moodsState.moods.length,
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
  
  return true;
}

/**
 * Import data from a JSON file
 */
export async function importDataFromFile(file: File): Promise<{ success: boolean; stats: any; error?: string }> {
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
        
        // Import data to Firestore
        const stats = await importAllData(importedData, userId);
        
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
async function importAllData(importedData: ExportedData, userId: string) {
  const { data } = importedData;
  const stats = {
    tasks: 0,
    goals: 0,
    projects: 0,
    thoughts: 0,
    moods: 0,
  };
  
  try {
    // Import tasks
    for (const task of data.tasks) {
      const taskId = task.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const taskData = { ...task };
      delete taskData.id; // Remove id as it will be the document ID
      
      await createAt(`users/${userId}/tasks/${taskId}`, taskData);
      stats.tasks++;
    }
    
    // Import goals
    for (const goal of data.goals) {
      const goalId = goal.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const goalData = { ...goal };
      delete goalData.id;
      
      await createAt(`users/${userId}/goals/${goalId}`, goalData);
      stats.goals++;
    }
    
    // Import projects
    for (const project of data.projects) {
      const projectId = project.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const projectData = { ...project };
      delete projectData.id;
      
      await createAt(`users/${userId}/projects/${projectId}`, projectData);
      stats.projects++;
    }
    
    // Import thoughts
    for (const thought of data.thoughts) {
      const thoughtId = thought.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const thoughtData = { ...thought };
      delete thoughtData.id;
      
      await createAt(`users/${userId}/thoughts/${thoughtId}`, thoughtData);
      stats.thoughts++;
    }
    
    // Import moods
    for (const mood of data.moods) {
      const moodId = mood.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const moodData = { ...mood };
      delete moodData.id;
      
      await createAt(`users/${userId}/moods/${moodId}`, moodData);
      stats.moods++;
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

"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createAt } from '@/lib/data/gateway';
import Dexie from 'dexie';

/**
 * One-time migration page to move data from Dexie (IndexedDB) to Firestore
 * After successful migration, Dexie can be removed from the project
 */
export default function MigratePage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const runMigration = async () => {
    if (!user) {
      setStatus('❌ Please log in first');
      return;
    }

    setIsRunning(true);
    setStatus('🚀 Starting migration...');
    setProgress(0);

    const migrationStats = {
      tasks: 0,
      thoughts: 0,
      moods: 0,
      focusSessions: 0,
      errors: [] as string[],
    };

    try {
      // Open old Dexie database
      setStatus('📂 Opening Dexie database...');
      const oldDb = new Dexie('personal-notebook');
      
      oldDb.version(12).stores({
        tasks: '&id, title, done, category, status, priority, createdAt, updatedAt, dueDate, completedAt, parentTaskId, focusEligible',
        thoughts: '&id, text, type, done, createdAt, updatedAt',
        moods: '&id, value, createdAt, updatedAt',
        focusSessions: '&id, startTime, endTime, isActive, updatedAt',
        syncHistory: '&id, timestamp, operation, status',
      });

      const userId = user.uid;

      // Migrate tasks
      setStatus('📋 Migrating tasks...');
      const tasks = await oldDb.table('tasks').toArray();
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        try {
          await createAt(`users/${userId}/tasks/${task.id}`, {
            ...task,
            createdAt: task.createdAt || new Date().toISOString(),
          });
          migrationStats.tasks++;
        } catch (error: any) {
          migrationStats.errors.push(`Task ${task.id}: ${error.message}`);
        }
        setProgress(Math.round((i + 1) / tasks.length * 25));
      }

      // Migrate thoughts
      setStatus('💭 Migrating thoughts...');
      const thoughts = await oldDb.table('thoughts').toArray();
      for (let i = 0; i < thoughts.length; i++) {
        const thought = thoughts[i];
        try {
          await createAt(`users/${userId}/thoughts/${thought.id}`, {
            ...thought,
            createdAt: thought.createdAt || new Date().toISOString(),
          });
          migrationStats.thoughts++;
        } catch (error: any) {
          migrationStats.errors.push(`Thought ${thought.id}: ${error.message}`);
        }
        setProgress(25 + Math.round((i + 1) / thoughts.length * 25));
      }

      // Migrate moods
      setStatus('😊 Migrating moods...');
      const moods = await oldDb.table('moods').toArray();
      for (let i = 0; i < moods.length; i++) {
        const mood = moods[i];
        try {
          await createAt(`users/${userId}/moods/${mood.id}`, {
            ...mood,
            createdAt: mood.createdAt || new Date().toISOString(),
          });
          migrationStats.moods++;
        } catch (error: any) {
          migrationStats.errors.push(`Mood ${mood.id}: ${error.message}`);
        }
        setProgress(50 + Math.round((i + 1) / moods.length * 25));
      }

      // Migrate focus sessions
      setStatus('🎯 Migrating focus sessions...');
      const sessions = await oldDb.table('focusSessions').toArray();
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        try {
          await createAt(`users/${userId}/focusSessions/${session.id}`, {
            ...session,
            createdAt: session.startTime || new Date().toISOString(),
          });
          migrationStats.focusSessions++;
        } catch (error: any) {
          migrationStats.errors.push(`Session ${session.id}: ${error.message}`);
        }
        setProgress(75 + Math.round((i + 1) / sessions.length * 25));
      }

      setProgress(100);
      setStatus('✅ Migration complete!');
      setStats(migrationStats);
      setIsDone(true);

      // Close Dexie database
      oldDb.close();

    } catch (error: any) {
      setStatus(`❌ Migration failed: ${error.message}`);
      console.error('Migration error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
          <p className="text-yellow-800 font-semibold">⚠️ Please log in to run the migration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-blue-50 border-4 border-blue-300 rounded-xl p-8 mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">
          🔄 Data Migration: Dexie → Firestore
        </h1>
        <p className="text-blue-700 mb-4">
          This is a one-time migration to move your data from the old IndexedDB (Dexie) system
          to the new Firestore-only architecture with real-time sync.
        </p>
        <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
          <h2 className="font-bold text-blue-900 mb-2">⚠️ Important Notes:</h2>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>This migration only needs to be run <strong>once</strong></li>
            <li>All your tasks, thoughts, moods, and focus sessions will be copied to Firestore</li>
            <li>Your local data in IndexedDB will remain unchanged (safe to run)</li>
            <li>After successful migration, the old Dexie system can be removed</li>
            <li>Make sure you have a stable internet connection</li>
          </ul>
        </div>
      </div>

      {!isDone && (
        <button
          onClick={runMigration}
          disabled={isRunning}
          className={`w-full py-4 px-6 rounded-lg text-white font-bold text-lg shadow-lg transition-all ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
          }`}
        >
          {isRunning ? '⏳ Running Migration...' : '🚀 Start Migration'}
        </button>
      )}

      {(status || progress > 0) && (
        <div className="mt-6 bg-white rounded-lg border-2 border-gray-300 p-6">
          <p className="font-semibold text-lg mb-4">{status}</p>
          
          {progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-6 rounded-full transition-all duration-300 flex items-center justify-center text-white text-sm font-bold"
                style={{ width: `${progress}%` }}
              >
                {progress}%
              </div>
            </div>
          )}

          {stats && (
            <div className="mt-4 bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mb-2">📊 Migration Results:</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded p-2 border border-green-200">
                  <span className="font-semibold">📋 Tasks:</span> {stats.tasks}
                </div>
                <div className="bg-white rounded p-2 border border-green-200">
                  <span className="font-semibold">💭 Thoughts:</span> {stats.thoughts}
                </div>
                <div className="bg-white rounded p-2 border border-green-200">
                  <span className="font-semibold">😊 Moods:</span> {stats.moods}
                </div>
                <div className="bg-white rounded p-2 border border-green-200">
                  <span className="font-semibold">🎯 Sessions:</span> {stats.focusSessions}
                </div>
              </div>

              {stats.errors.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-300 rounded p-3">
                  <p className="font-semibold text-red-900 mb-2">⚠️ Errors ({stats.errors.length}):</p>
                  <div className="text-xs text-red-800 max-h-40 overflow-y-auto">
                    {stats.errors.map((err: string, i: number) => (
                      <div key={i} className="mb-1">{err}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-900">
                  ✅ <strong>Next steps:</strong> Your data is now in Firestore. The app will automatically
                  use the new sync system. You can safely close this page.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {isDone && (
        <div className="mt-6">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full py-3 px-6 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 transition-all"
          >
            ✅ Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

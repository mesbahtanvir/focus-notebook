'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Database, RefreshCw, Wrench } from 'lucide-react';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface DiagnosticIssue {
  type: 'stuck-session' | 'completion-mismatch' | 'missing-field';
  severity: 'error' | 'warning' | 'info';
  entity: string;
  entityId: string;
  description: string;
  fix?: () => Promise<void>;
}

interface DiagnosticResults {
  stuckSessions: number;
  completionMismatches: number;
  totalIssues: number;
  issues: DiagnosticIssue[];
}

export function DataDiagnostics() {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [fixedCount, setFixedCount] = useState(0);

  const runDiagnostics = useCallback(async () => {
    if (!user?.uid) return;

    setIsScanning(true);
    setFixedCount(0);

    try {
      const userId = user.uid;
      const issues: DiagnosticIssue[] = [];

      // 1. Check for stuck focus sessions
      const sessionsRef = collection(db, `users/${userId}/focusSessions`);
      const activeSessionsQuery = query(sessionsRef, where('isActive', '==', true));
      const activeSessionsSnapshot = await getDocs(activeSessionsQuery);

      activeSessionsSnapshot.docs.forEach((docSnap) => {
        const session = docSnap.data();
        const startTime = new Date(session.startTime).getTime();
        const now = Date.now();
        const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);

        // If session has been active for more than 12 hours, it's likely stuck
        if (hoursSinceStart > 12) {
          issues.push({
            type: 'stuck-session',
            severity: 'error',
            entity: 'Focus Session',
            entityId: docSnap.id,
            description: `Session stuck in active state for ${Math.round(hoursSinceStart)} hours (started: ${new Date(session.startTime).toLocaleString()})`,
            fix: async () => {
              const sessionDocRef = doc(db, `users/${userId}/focusSessions`, docSnap.id);
              await updateDoc(sessionDocRef, {
                isActive: false,
                endTime: session.endTime || new Date().toISOString(),
              });
            },
          });
        }
      });

      // 2. Check for completion count mismatches in tasks
      const tasksRef = collection(db, `users/${userId}/tasks`);
      const tasksSnapshot = await getDocs(tasksRef);

      tasksSnapshot.docs.forEach((docSnap) => {
        const task = docSnap.data();
        const completionHistory = task.completionHistory || [];
        const completionCount = task.completionCount || 0;
        const actualCount = completionHistory.length;

        if (completionCount !== actualCount) {
          issues.push({
            type: 'completion-mismatch',
            severity: 'warning',
            entity: 'Task',
            entityId: docSnap.id,
            description: `Completion count mismatch: stored=${completionCount}, actual=${actualCount} (task: "${task.title?.substring(0, 50) || 'Untitled'}")`,
            fix: async () => {
              const taskDocRef = doc(db, `users/${userId}/tasks`, docSnap.id);
              await updateDoc(taskDocRef, {
                completionCount: actualCount,
              });
            },
          });
        }

        // Check if task has recurrence but no completion history array
        if (task.recurrence && task.recurrence.type !== 'none' && !Array.isArray(task.completionHistory)) {
          issues.push({
            type: 'missing-field',
            severity: 'warning',
            entity: 'Task',
            entityId: docSnap.id,
            description: `Recurring task missing completionHistory array (task: "${task.title?.substring(0, 50) || 'Untitled'}")`,
            fix: async () => {
              const taskDocRef = doc(db, `users/${userId}/tasks`, docSnap.id);
              await updateDoc(taskDocRef, {
                completionHistory: [],
                completionCount: 0,
              });
            },
          });
        }
      });

      setResults({
        stuckSessions: issues.filter(i => i.type === 'stuck-session').length,
        completionMismatches: issues.filter(i => i.type === 'completion-mismatch').length,
        totalIssues: issues.length,
        issues,
      });
    } catch (error) {
      console.error('Diagnostic scan failed:', error);
      alert('Failed to run diagnostics. Check console for details.');
    } finally {
      setIsScanning(false);
    }
  }, [user]);

  const fixAllIssues = useCallback(async () => {
    if (!results || results.issues.length === 0) return;

    setIsFixing(true);
    setFixedCount(0);

    let successCount = 0;

    for (const issue of results.issues) {
      if (issue.fix) {
        try {
          await issue.fix();
          successCount++;
          setFixedCount(successCount);
        } catch (error) {
          console.error(`Failed to fix issue ${issue.entityId}:`, error);
        }
      }
    }

    setIsFixing(false);
    alert(`Fixed ${successCount} of ${results.issues.length} issues. Re-run diagnostics to verify.`);

    // Re-run diagnostics to show updated state
    setTimeout(() => runDiagnostics(), 1000);
  }, [results, runDiagnostics]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-2xl border-4 border-red-200 dark:border-red-800 shadow-lg p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <Wrench className="h-6 w-6 text-red-600 dark:text-red-400" />
            🔧 Data Diagnostics & Migration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Scan for and fix data integrity issues
          </p>
        </div>
        <Button
          onClick={runDiagnostics}
          disabled={isScanning || isFixing}
          className="gap-2"
        >
          <Database className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Run Diagnostics'}
        </Button>
      </div>

      {isScanning && (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 border-2 border-red-300 dark:border-red-700 text-center">
          <RefreshCw className="h-8 w-8 mx-auto text-red-600 dark:text-red-400 animate-spin mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Scanning your data for issues...</p>
        </div>
      )}

      {!isScanning && results && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-red-300 dark:border-red-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{results.stuckSessions}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Stuck Sessions</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-yellow-300 dark:border-yellow-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Database className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{results.completionMismatches}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Completion Mismatches</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-emerald-300 dark:border-emerald-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{results.totalIssues}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Issues</div>
                </div>
              </div>
            </div>
          </div>

          {/* Fix All Button */}
          {results.totalIssues > 0 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-orange-300 dark:border-orange-700">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Found {results.totalIssues} issue{results.totalIssues !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to automatically fix all detected issues
                </p>
              </div>
              <Button
                onClick={fixAllIssues}
                disabled={isFixing}
                variant="default"
                className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Wrench className={`h-4 w-4 ${isFixing ? 'animate-spin' : ''}`} />
                {isFixing ? `Fixing... (${fixedCount}/${results.totalIssues})` : 'Fix All Issues'}
              </Button>
            </div>
          )}

          {results.totalIssues === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 border-2 border-emerald-300 dark:border-emerald-700 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600 dark:text-emerald-400 mb-3" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">All Clear!</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">No data integrity issues detected</p>
            </div>
          )}

          {/* Issues List */}
          {results.totalIssues > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Issue Details:</h3>
              {results.issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase">{issue.entity}</span>
                        <span className="text-xs font-mono opacity-75">{issue.entityId.substring(0, 8)}...</span>
                      </div>
                      <p className="text-sm">{issue.description}</p>
                    </div>
                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                      issue.severity === 'error' ? 'bg-red-200 dark:bg-red-900/40' :
                      issue.severity === 'warning' ? 'bg-yellow-200 dark:bg-yellow-900/40' :
                      'bg-blue-200 dark:bg-blue-900/40'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 dark:text-blue-400 text-lg">💡</div>
          <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <p className="font-semibold">What does this tool do?</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Detects focus sessions stuck in active state (missing notes issue)</li>
              <li>Finds tasks with completion count mismatches (recurring task issue)</li>
              <li>Identifies missing fields in recurring tasks</li>
              <li>Provides one-click fix for all detected issues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

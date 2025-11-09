"use client";

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/store/useTasks';
import { useGoals } from '@/store/useGoals';
import { useProjects } from '@/store/useProjects';
import { useThoughts } from '@/store/useThoughts';
import { useMoods } from '@/store/useMoods';
import { useFocus } from '@/store/useFocus';
import { EnhancedDataManagement } from '@/components/EnhancedDataManagement';
import { ArrowLeft, Database, ShieldCheck, Zap } from 'lucide-react';

export default function DataManagementPage() {
  const { user } = useAuth();

  const tasksSubscribe = useTasks((s) => s.subscribe);
  const goalsSubscribe = useGoals((s) => s.subscribe);
  const projectsSubscribe = useProjects((s) => s.subscribe);
  const thoughtsSubscribe = useThoughts((s) => s.subscribe);
  const moodsSubscribe = useMoods((s) => s.subscribe);
  const focusSubscribe = useFocus((s) => s.subscribe);

  const refreshAllStores = () => {
    if (!user?.uid) {
      return;
    }
    tasksSubscribe(user.uid);
    goalsSubscribe(user.uid);
    projectsSubscribe(user.uid);
    thoughtsSubscribe(user.uid);
    moodsSubscribe(user.uid);
    focusSubscribe(user.uid);
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/settings" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium">Data Management</span>
      </div>

      {/* Page Header */}
      <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-900/20">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-b-4 border-purple-200 dark:border-purple-700">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Data Management
                </CardTitle>
              </div>
              <CardDescription className="text-gray-600 dark:text-gray-300 font-medium text-base">
                Import, export, and manage your Focus Notebook data with advanced controls
              </CardDescription>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Settings
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800">
              <div className="p-2 bg-blue-500 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  Conflict Detection
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Automatically detect and resolve data conflicts during import
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
              <div className="p-2 bg-green-500 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100">
                  Preview & Select
                </div>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Preview all items before importing and choose what to include
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-purple-900 dark:text-purple-100">
                  Real-time Progress
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  Track import progress with detailed status for each data type
                </p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 mb-6">
            <div className="flex items-start gap-2">
              <div className="text-yellow-600 dark:text-yellow-400 text-lg">💡</div>
              <div>
                <div className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm mb-1">
                  Data Safety Tips
                </div>
                <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                  <li>• Always export a backup before making major changes</li>
                  <li>• Preview imported data carefully to avoid duplicates</li>
                  <li>• Use conflict resolution to handle duplicate items</li>
                  <li>• All relationships between items are preserved during import/export</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Data Management Component */}
      <EnhancedDataManagement onDataChanged={refreshAllStores} />
    </div>
  );
}

/**
 * Body Progress Tool Page
 * Track body composition changes with Dexa scan analysis
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useBodyProgress } from '@/store/useBodyProgress';
import { useTrackToolUsage } from '@/hooks/useTrackToolUsage';
import {
  Activity,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Calendar,
  FileText,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DexaScanUpload from '@/components/body-progress/DexaScanUpload';
import BodyProgressChart from '@/components/body-progress/BodyProgressChart';

export default function BodyProgressPage() {
  useTrackToolUsage('body-progress');

  const { user } = useAuth();
  const router = useRouter();
  const { subscribe, scans, isLoading } = useBodyProgress();
  const [activeTab, setActiveTab] = useState('upload');

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  // Switch to progress tab if scans exist
  useEffect(() => {
    if (scans.length > 0 && activeTab === 'upload') {
      setActiveTab('progress');
    }
  }, [scans.length]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading your body progress data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-600" />
              Body Progress Tracker
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track body composition changes with AI-powered Dexa scan analysis
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {scans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Scans</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {scans.length}
                </div>
              </div>
            </div>
          </div>

          {scans[0]?.weight && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Current Weight</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {scans[0].weight.toFixed(1)} lbs
                  </div>
                </div>
              </div>
            </div>
          )}

          {scans[0]?.bodyFatPercentage && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Body Fat %</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {scans[0].bodyFatPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {scans[0]?.leanMass && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Lean Mass</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {scans[0].leanMass.toFixed(1)} lbs
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Upload Scan
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progress Charts
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scan History
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <DexaScanUpload />
          </div>
        </TabsContent>

        {/* Progress Charts Tab */}
        <TabsContent value="progress" className="space-y-6">
          <BodyProgressChart />
        </TabsContent>

        {/* Scan History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Scan History
            </h3>
            {scans.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No scans uploaded yet. Upload your first Dexa scan to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {new Date(scan.scanDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {scan.fileName}
                        </div>

                        {/* Key Metrics */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          {scan.weight && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Weight: </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {scan.weight.toFixed(1)} lbs
                              </span>
                            </div>
                          )}
                          {scan.bodyFatPercentage && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Body Fat: </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {scan.bodyFatPercentage.toFixed(1)}%
                              </span>
                            </div>
                          )}
                          {scan.leanMass && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Lean Mass: </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {scan.leanMass.toFixed(1)} lbs
                              </span>
                            </div>
                          )}
                          {scan.fatMass && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Fat Mass: </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {scan.fatMass.toFixed(1)} lbs
                              </span>
                            </div>
                          )}
                        </div>

                        {/* AI Summary */}
                        {scan.aiSummary && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                              AI Summary
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {scan.aiSummary}
                            </div>
                          </div>
                        )}

                        {/* AI Insights */}
                        {scan.aiInsights && scan.aiInsights.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-400 mb-2">
                              Key Insights
                            </div>
                            <ul className="space-y-1">
                              {scan.aiInsights.map((insight, idx) => (
                                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Getting Started Guide (shown when no scans) */}
      {scans.length === 0 && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Get Started with Body Progress Tracking
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                1
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Upload Your Dexa Scan</div>
                <div>Get a Dexa scan from your local facility and upload the PDF or image results</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                2
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">AI Extracts Your Data</div>
                <div>Our AI automatically parses your scan and extracts all body composition metrics</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                3
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Track Your Progress</div>
                <div>View charts, trends, and AI-powered insights as you upload more scans over time</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

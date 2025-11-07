"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRequestLog } from "@/store/useRequestLog";
import { useLLMLogs } from "@/store/useLLMLogs";
import {
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
  Cloud,
  Brain,
  Copy,
} from "lucide-react";
import { db as firestore } from "@/lib/firebaseClient";
import { collection, getDocs } from "firebase/firestore";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { logs, getPendingRequests, getInProgressRequests } = useRequestLog();
  const { logs: llmLogs, isLoading: llmLogsLoading, subscribe: subscribeLLMLogs } = useLLMLogs(
    (state) => ({
      logs: state.logs,
      isLoading: state.isLoading,
      subscribe: state.subscribe,
    })
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [showCloudData, setShowCloudData] = useState(false);
  const [selectedCloudDataType, setSelectedCloudDataType] = useState<string>('tasks');
  const [cloudData, setCloudData] = useState<any>({
    tasks: [],
    thoughts: [],
    moods: [],
    focusSessions: [],
    goals: [],
    projects: [],
    notes: [],
    errands: [],
    brainstorming: [],
    cbt: []
  });
  const [loadingCloudData, setLoadingCloudData] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'failed'>('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'firebase' | 'api' | 'sync'>('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [promptTriggerFilter, setPromptTriggerFilter] = useState<'all' | 'auto' | 'manual' | 'reprocess'>('all');
  const [promptStatusFilter, setPromptStatusFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [promptSearch, setPromptSearch] = useState('');
  
  const pendingRequests = getPendingRequests();
  const inProgressRequests = getInProgressRequests();


  const loadCloudData = useCallback(async () => {
    if (!user) return;
    setLoadingCloudData(true);
    try {
      const userId = user.uid;
      const collections = ['tasks', 'thoughts', 'moods', 'focusSessions', 'goals', 'projects', 'notes', 'errands', 'brainstorming', 'cbt'];
      const data: any = {};

      for (const collectionName of collections) {
        const collectionRef = collection(firestore, `users/${userId}/${collectionName}`);
        const snapshot = await getDocs(collectionRef);
        data[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      setCloudData(data);
    } catch (error) {
      console.error('Failed to load cloud data:', error);
    } finally {
      setLoadingCloudData(false);
    }
  }, [user]);

  useEffect(() => {
    if (showCloudData && user) {
      loadCloudData();
    }
  }, [showCloudData, user, loadCloudData]);

  useEffect(() => {
    if (user?.uid) {
      subscribeLLMLogs(user.uid);
    }
    return () => {
      useLLMLogs.getState().clear();
    };
  }, [user?.uid, subscribeLLMLogs]);

  const getStatusColor = (status?: number) => {
    if (!status) return "text-gray-600 bg-gray-100";
    if (status >= 200 && status < 300) return "text-green-600 bg-green-100";
    if (status >= 400 && status < 500) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "firebase": return "text-orange-600 bg-orange-100";
      case "sync": return "text-blue-600 bg-blue-100";
      case "api": return "text-purple-600 bg-purple-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-700 bg-yellow-100 border-yellow-300";
      case "in-progress": return "text-blue-700 bg-blue-100 border-blue-300";
      case "completed": return "text-green-700 bg-green-100 border-green-300";
      case "failed": return "text-red-700 bg-red-100 border-red-300";
      default: return "text-gray-700 bg-gray-100 border-gray-300";
    }
  };

  const getPromptStatusColor = (status: 'completed' | 'failed') => {
    if (status === 'failed') {
      return "text-red-700 bg-red-100 border-red-200";
    }
    return "text-green-700 bg-green-100 border-green-200";
  };

  const resolvePromptStatus = (status?: 'completed' | 'failed', error?: string): 'completed' | 'failed' => {
    if (status) return status;
    return error ? 'failed' : 'completed';
  };

  const getPromptPreview = (text?: string) => {
    if (!text) return "—";
    const singleLine = text.replace(/\s+/g, " ").trim();
    return singleLine.length > 110 ? `${singleLine.slice(0, 110)}…` : singleLine;
  };

  const copyToClipboard = (value?: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(value);
  };

  const logDate = (value?: string) => {
    if (!value) return 0;
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  };

  const filteredLogs = useMemo(() => {
    const search = requestSearch.trim().toLowerCase();
    return logs.filter((log) => {
      if (requestStatusFilter !== 'all' && log.requestStatus !== requestStatusFilter) {
        return false;
      }
      if (requestTypeFilter !== 'all' && log.type !== requestTypeFilter) {
        return false;
      }
      if (search) {
        const haystack = `${log.method} ${log.url ?? ''} ${log.id}`.toLowerCase();
        return haystack.includes(search);
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, requestStatusFilter, requestTypeFilter, requestSearch]);

  const filteredPromptLogs = useMemo(() => {
    const search = promptSearch.trim().toLowerCase();
    return llmLogs.filter((log) => {
      const status = resolvePromptStatus(log.status, log.error);
      if (promptStatusFilter !== 'all' && status !== promptStatusFilter) {
        return false;
      }
      if (promptTriggerFilter !== 'all' && log.trigger !== promptTriggerFilter) {
        return false;
      }
      if (search) {
        const haystack = `${log.prompt ?? ''} ${log.rawResponse ?? ''} ${(log.toolSpecIds ?? []).join(' ')}`.toLowerCase();
        return haystack.includes(search);
      }
      return true;
    }).sort((a, b) => {
      const aDate = logDate(a.createdAt);
      const bDate = logDate(b.createdAt);
      return bDate - aDate;
    });
  }, [llmLogs, promptStatusFilter, promptTriggerFilter, promptSearch]);

  // Note: Force sync removed - real-time Firestore listeners handle all syncing automatically

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 md:p-8 rounded-2xl border-4 border-blue-200 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
              🔍 Debug Dashboard
            </h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">
              View your cloud sync requests & responses
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
          <p className="text-sm text-gray-700">
            <strong className="text-blue-600">👤 Logged in as:</strong> {user?.email || "Guest"}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            💡 This page shows all your Firebase sync operations and local data for debugging purposes
          </p>
        </div>
      </div>

      {/* Request Queue */}
      {(pendingRequests.length > 0 || inProgressRequests.length > 0) && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 md:p-6 border-4 border-yellow-300 shadow-lg">
          <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
            ⏳ Request Queue
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pending */}
            {pendingRequests.length > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-yellow-300">
                <h3 className="font-bold text-yellow-700 mb-3 flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                  </span>
                  Pending ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
                      <div className="font-mono font-bold text-yellow-800">{req.method}</div>
                      <div className="text-xs text-gray-600 truncate">{req.url}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(req.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* In Progress */}
            {inProgressRequests.length > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  In Progress ({inProgressRequests.length})
                </h3>
                <div className="space-y-2">
                  {inProgressRequests.map((req) => (
                    <div key={req.id} className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
                      <div className="font-mono font-bold text-blue-800">{req.method}</div>
                      <div className="text-xs text-gray-600 truncate">{req.url}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Started {req.startTime ? `${Math.round((Date.now() - req.startTime) / 1000)}s ago` : 'now'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cloud Database (Firebase) */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 md:p-6 border-4 border-orange-300 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
            <Cloud className="h-6 w-6 text-orange-600" />
            ☁️ Cloud Database (Firebase)
          </h2>
          <button
            onClick={() => setShowCloudData(!showCloudData)}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-orange-600 text-white hover:bg-orange-700 shadow-md flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {showCloudData ? "Hide" : "Show"} Cloud Data
            <ChevronDown className={`h-4 w-4 transition-transform ${showCloudData ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showCloudData && (
          <div className="space-y-4">
            {!user ? (
              <div className="bg-white rounded-lg p-8 border-2 border-orange-300 text-center">
                <Cloud className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">Sign in to view cloud database</p>
              </div>
            ) : loadingCloudData ? (
              <div className="bg-white rounded-lg p-8 border-2 border-orange-300 text-center">
                <RefreshCw className="h-8 w-8 mx-auto text-orange-600 animate-spin mb-3" />
                <p className="text-gray-600">Loading cloud data...</p>
              </div>
            ) : (
              <>
                {/* Data Type Selector */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCloudDataType('tasks')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'tasks'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Tasks ({cloudData.tasks?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('thoughts')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'thoughts'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Thoughts ({cloudData.thoughts?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('moods')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'moods'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Moods ({cloudData.moods?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('focusSessions')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'focusSessions'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Focus Sessions ({cloudData.focusSessions?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('goals')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'goals'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Goals ({cloudData.goals?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('projects')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'projects'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Projects ({cloudData.projects?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('notes')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'notes'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Notes ({cloudData.notes?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('errands')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'errands'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Errands ({cloudData.errands?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('brainstorming')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'brainstorming'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    Brainstorming ({cloudData.brainstorming?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCloudDataType('cbt')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedCloudDataType === 'cbt'
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-orange-50 border-2 border-orange-300"
                    }`}
                  >
                    CBT ({cloudData.cbt?.length || 0})
                  </button>
                  <button
                    onClick={loadCloudData}
                    className="px-4 py-2 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                {/* Data Display */}
                <div className="bg-white rounded-lg p-4 border-2 border-orange-300 max-h-[600px] overflow-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(
                      cloudData[selectedCloudDataType] || [],
                      null,
                      2
                    )}
                  </pre>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-orange-600">{cloudData.tasks?.length || 0}</div>
                    <div className="text-xs text-gray-600">Tasks</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-purple-600">{cloudData.thoughts?.length || 0}</div>
                    <div className="text-xs text-gray-600">Thoughts</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{cloudData.moods?.length || 0}</div>
                    <div className="text-xs text-gray-600">Moods</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-indigo-600">{cloudData.focusSessions?.length || 0}</div>
                    <div className="text-xs text-gray-600">Sessions</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-green-600">{cloudData.goals?.length || 0}</div>
                    <div className="text-xs text-gray-600">Goals</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-blue-600">{cloudData.projects?.length || 0}</div>
                    <div className="text-xs text-gray-600">Projects</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-pink-600">{cloudData.notes?.length || 0}</div>
                    <div className="text-xs text-gray-600">Notes</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-red-600">{cloudData.errands?.length || 0}</div>
                    <div className="text-xs text-gray-600">Errands</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-cyan-600">{cloudData.brainstorming?.length || 0}</div>
                    <div className="text-xs text-gray-600">Brainstorming</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-300 text-center">
                    <div className="text-2xl font-bold text-teal-600">{cloudData.cbt?.length || 0}</div>
                    <div className="text-xs text-gray-600">CBT</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Note: Cloud Sync Monitor removed - use Firestore Console for monitoring */}

      {/* AI Prompt History */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 rounded-2xl border-4 border-purple-200 shadow-lg p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              🧠 AI Prompt History
            </h2>
            <p className="text-sm text-gray-600">See exactly what we sent to the LLM and how it responded.</p>
          </div>
          <div className="text-sm text-gray-500">
            Showing {filteredPromptLogs.length} of {llmLogs.length} entries
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-gray-600 font-semibold flex flex-col">
              Trigger
              <select
                value={promptTriggerFilter}
                onChange={(e) => setPromptTriggerFilter(e.target.value as 'all' | 'auto' | 'manual' | 'reprocess')}
                className="mt-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">All triggers</option>
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
                <option value="reprocess">Reprocess</option>
              </select>
            </label>
            <label className="text-xs text-gray-600 font-semibold flex flex-col">
              Status
              <select
                value={promptStatusFilter}
                onChange={(e) => setPromptStatusFilter(e.target.value as 'all' | 'completed' | 'failed')}
                className="mt-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>
          <div className="w-full md:max-w-xs">
            <label className="text-xs text-gray-600 font-semibold flex flex-col">
              Search
              <input
                type="search"
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                placeholder="Prompt, response, or tool"
                className="mt-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {llmLogsLoading && (
            <div className="flex justify-center py-6">
              <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
                <RefreshCw className="h-5 w-5 animate-spin text-purple-500" />
                Loading prompt history...
              </div>
            </div>
          )}

          {!llmLogsLoading && filteredPromptLogs.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-purple-200 p-8 text-center">
              <p className="text-base font-semibold text-purple-700 mb-1">No prompts match your filters</p>
              <p className="text-sm text-gray-600">Try changing the trigger, status, or search term.</p>
            </div>
          )}

          {filteredPromptLogs.map((log) => {
            const status = resolvePromptStatus(log.status, log.error);
            return (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-purple-50 transition-colors"
                  onClick={() => setExpandedPromptId(expandedPromptId === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Brain className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {getPromptPreview(log.prompt)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {log.toolSpecIds && log.toolSpecIds.length > 0
                          ? `Tools: ${log.toolSpecIds.join(', ')}`
                          : getPromptPreview(log.rawResponse)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold uppercase">
                      {log.trigger}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${getPromptStatusColor(status)}`}>
                      {status === 'failed' ? 'Failed' : 'Completed'}
                    </span>
                    <span className="hidden sm:inline-block">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
                    </span>
                    {expandedPromptId === log.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedPromptId === log.id && (
                  <div className="border-t border-purple-100 bg-gray-50 p-4 space-y-4">
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      <span>ID: {log.id}</span>
                      {log.thoughtId && <span>Thought: {log.thoughtId}</span>}
                      {log.createdAt && <span>{new Date(log.createdAt).toLocaleString()}</span>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => copyToClipboard(log.prompt)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200"
                      >
                        <Copy className="h-3 w-3" />
                        Copy Prompt
                      </button>
                      <button
                        onClick={() => copyToClipboard(log.rawResponse)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      >
                        <Copy className="h-3 w-3" />
                        Copy Response
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1">Prompt</h4>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-gray-200 max-h-64 overflow-auto whitespace-pre-wrap">
                        {log.prompt || '—'}
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1">Response</h4>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-gray-200 max-h-64 overflow-auto whitespace-pre-wrap">
                        {log.rawResponse || '—'}
                      </pre>
                    </div>

                    {log.actions && log.actions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-1">Actions</h4>
                        <pre className="text-xs bg-white p-3 rounded-lg border border-gray-200 max-h-64 overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(log.actions, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.usage && (
                      <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                        {log.usage.prompt_tokens !== undefined && <span>Prompt tokens: {log.usage.prompt_tokens}</span>}
                        {log.usage.completion_tokens !== undefined && <span>Completion tokens: {log.usage.completion_tokens}</span>}
                        {log.usage.total_tokens !== undefined && <span>Total tokens: {log.usage.total_tokens}</span>}
                      </div>
                    )}

                    {log.error && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        Error: {log.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Update History (Request Logs) */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-2xl border-4 border-blue-200 shadow-lg p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🔄 Update History
          </h2>
          <div className="text-sm text-gray-500">
            Showing {filteredLogs.length} of {logs.length} requests
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-gray-600 font-semibold flex flex-col">
              Status
              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value as 'all' | 'pending' | 'in-progress' | 'completed' | 'failed')}
                className="mt-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label className="text-xs text-gray-600 font-semibold flex flex-col">
              Type
              <select
                value={requestTypeFilter}
                onChange={(e) => setRequestTypeFilter(e.target.value as 'all' | 'firebase' | 'api' | 'sync')}
                className="mt-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All types</option>
                <option value="firebase">Firebase</option>
                <option value="api">API</option>
                <option value="sync">Sync</option>
              </select>
            </label>
          </div>
          <div className="w-full md:max-w-xs">
            <label className="text-xs text-gray-600 font-semibold flex flex-col">
              Search
              <input
                type="search"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                placeholder="Method, URL, or ID"
                className="mt-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-blue-200">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-bold text-gray-800 mb-1">No matching requests</h3>
              <p className="text-gray-600 text-sm">Adjust the filters above to see more results.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden"
              >
                <button
                  className="w-full flex flex-col gap-2 px-4 py-3 text-left hover:bg-blue-50 transition-colors md:flex-row md:items-center"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-bold uppercase text-gray-500">{log.method}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getTypeColor(log.type)}`}>
                      {log.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-600 font-mono truncate flex-1">
                      {log.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full border font-semibold ${getRequestStatusColor(log.requestStatus)}`}>
                      {log.requestStatus === 'in-progress' && '⏳ '}
                      {log.requestStatus === 'completed' && '✓ '}
                      {log.requestStatus === 'failed' && '✗ '}
                      {log.requestStatus === 'pending' && '⏸ '}
                      {log.requestStatus.toUpperCase().replace('-', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(log.status)}`}>
                      {log.status || "N/A"}
                    </span>
                    <span>{log.duration ? `${log.duration}ms` : ''}</span>
                    <span className="hidden sm:inline-block">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {expandedId === log.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedId === log.id && (
                  <div className="border-t border-blue-100 bg-gray-50 p-4 space-y-4">
                    {log.error && (
                      <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        ⚠️ {log.error}
                      </div>
                    )}
                    {log.request && (
                      <div>
                        <h4 className="font-bold text-sm text-gray-800 mb-2">📤 Request</h4>
                        <pre className="text-xs bg-white p-3 rounded-lg border border-gray-200 overflow-x-auto">
                          {JSON.stringify(log.request, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.response && (
                      <div>
                        <h4 className="font-bold text-sm text-gray-800 mb-2">📥 Response</h4>
                        <pre className="text-xs bg-white p-3 rounded-lg border border-gray-200 overflow-x-auto">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="text-xs bg-white p-3 rounded-lg border border-gray-200 grid gap-1">
                      <p><strong>ID:</strong> {log.id}</p>
                      <p><strong>Timestamp:</strong> {new Date(log.timestamp).toISOString()}</p>
                      {log.duration && <p><strong>Duration:</strong> {log.duration}ms</p>}
                      {log.startTime && <p><strong>Started:</strong> {new Date(log.startTime).toLocaleTimeString()}</p>}
                      {log.endTime && <p><strong>Ended:</strong> {new Date(log.endTime).toLocaleTimeString()}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

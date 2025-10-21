"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRequestLog, RequestLog } from "@/store/useRequestLog";
import { useTasks } from "@/store/useTasks";
import { useThoughts } from "@/store/useThoughts";
import { useMoods } from "@/store/useMoods";
import { useProjects } from "@/store/useProjects";
import { useFocus } from "@/store/useFocus";
import { Shield, RefreshCw, Trash2, Search, Filter, ChevronDown, ChevronUp, Database, Cloud } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { logs, queue, clearLogs, getPendingRequests, getInProgressRequests } = useRequestLog();
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showLocalData, setShowLocalData] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<string>('tasks');
  
  // Get all local data
  const tasks = useTasks((s) => s.tasks);
  const thoughts = useThoughts((s) => s.thoughts);
  const moods = useMoods((s) => s.moods);
  const projects = useProjects((s) => s.projects);
  const sessions = useFocus((s) => s.sessions);
  
  const pendingRequests = getPendingRequests();
  const inProgressRequests = getInProgressRequests();

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // Force re-render to show latest logs
      setExpandedId(null);
    }, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

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

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === "all" || log.type === filter;
    const matchesSearch = !searchTerm || 
      log.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.error?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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

        <div className="bg-white rounded-xl p-4 border-2 border-blue-200 space-y-3">
          <p className="text-sm text-gray-700">
            <strong className="text-blue-600">👤 Logged in as:</strong> {user?.email || "Guest"}
          </p>
          <p className="text-xs text-gray-600">
            💡 This page shows all your Firebase sync operations for debugging purposes
          </p>
          <Link
            href="/admin/sync-monitor"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
          >
            <Cloud className="h-4 w-4" />
            Cloud Sync Monitor
          </Link>
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

      {/* Controls */}
      <div className="bg-white rounded-xl p-4 md:p-6 border-2 border-purple-200 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter("sync")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === "sync"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Sync ({logs.filter(l => l.type === "sync").length})
            </button>
            <button
              onClick={() => setFilter("firebase")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === "firebase"
                  ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Firebase ({logs.filter(l => l.type === "firebase").length})
            </button>
            <button
              onClick={() => setFilter("api")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === "api"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              API ({logs.filter(l => l.type === "api").length})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                autoRefresh
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
              Auto Refresh
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-all text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by method, URL, or error..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
          />
        </div>
      </div>

      {/* Local Database Viewer */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 md:p-6 border-4 border-green-300 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            <Database className="h-6 w-6 text-green-600" />
            Local Database
          </h2>
          <button
            onClick={() => setShowLocalData(!showLocalData)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              showLocalData
                ? "bg-green-500 text-white"
                : "bg-white text-green-700 border-2 border-green-300 hover:bg-green-50"
            }`}
          >
            {showLocalData ? 'Hide' : 'Show'} Data
          </button>
        </div>

        {showLocalData && (
          <div className="space-y-4">
            {/* Data Type Selector */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDataType('tasks')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedDataType === 'tasks'
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-green-50 border-2 border-green-300"
                }`}
              >
                Tasks ({tasks.length})
              </button>
              <button
                onClick={() => setSelectedDataType('thoughts')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedDataType === 'thoughts'
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-green-50 border-2 border-green-300"
                }`}
              >
                Thoughts ({thoughts.length})
              </button>
              <button
                onClick={() => setSelectedDataType('moods')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedDataType === 'moods'
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-green-50 border-2 border-green-300"
                }`}
              >
                Moods ({moods.length})
              </button>
              <button
                onClick={() => setSelectedDataType('projects')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedDataType === 'projects'
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-green-50 border-2 border-green-300"
                }`}
              >
                Projects ({projects.length})
              </button>
              <button
                onClick={() => setSelectedDataType('sessions')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedDataType === 'sessions'
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-green-50 border-2 border-green-300"
                }`}
              >
                Focus Sessions ({sessions.length})
              </button>
            </div>

            {/* Data Display */}
            <div className="bg-white rounded-lg p-4 border-2 border-green-300 max-h-[600px] overflow-auto">
              <pre className="text-xs font-mono">
                {JSON.stringify(
                  selectedDataType === 'tasks' ? tasks :
                  selectedDataType === 'thoughts' ? thoughts :
                  selectedDataType === 'moods' ? moods :
                  selectedDataType === 'projects' ? projects :
                  sessions,
                  null,
                  2
                )}
              </pre>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white rounded-lg p-3 border-2 border-green-300 text-center">
                <div className="text-2xl font-bold text-green-600">{tasks.length}</div>
                <div className="text-xs text-gray-600">Tasks</div>
              </div>
              <div className="bg-white rounded-lg p-3 border-2 border-green-300 text-center">
                <div className="text-2xl font-bold text-purple-600">{thoughts.length}</div>
                <div className="text-xs text-gray-600">Thoughts</div>
              </div>
              <div className="bg-white rounded-lg p-3 border-2 border-green-300 text-center">
                <div className="text-2xl font-bold text-yellow-600">{moods.length}</div>
                <div className="text-xs text-gray-600">Moods</div>
              </div>
              <div className="bg-white rounded-lg p-3 border-2 border-green-300 text-center">
                <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
                <div className="text-xs text-gray-600">Projects</div>
              </div>
              <div className="bg-white rounded-lg p-3 border-2 border-green-300 text-center">
                <div className="text-2xl font-bold text-indigo-600">{sessions.length}</div>
                <div className="text-xs text-gray-600">Sessions</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border-2 border-gray-200">
            <Filter className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">No logs found</h3>
            <p className="text-gray-600">
              {logs.length === 0
                ? "No requests have been logged yet. Activity will appear here automatically."
                : "No logs match your current filter criteria."}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-xl border-2 border-purple-200 shadow-md overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer hover:bg-purple-50 transition-colors"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTypeColor(log.type)}`}>
                        {log.type.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold border-2 ${getRequestStatusColor(log.requestStatus)}`}>
                        {log.requestStatus === 'in-progress' && '⏳ '}
                        {log.requestStatus === 'completed' && '✓ '}
                        {log.requestStatus === 'failed' && '✗ '}
                        {log.requestStatus === 'pending' && '⏸ '}
                        {log.requestStatus.toUpperCase().replace('-', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(log.status)}`}>
                        {log.status || "N/A"}
                      </span>
                      <span className="text-xs text-gray-600">
                        {log.duration ? `${log.duration}ms` : ""}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold text-gray-800 mb-1">
                      {log.method}
                    </div>
                    <div className="font-mono text-xs text-gray-600 truncate">
                      {log.url}
                    </div>
                    {log.error && (
                      <div className="mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-xs font-medium text-red-600">⚠️ Error: {log.error}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {expandedId === log.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === log.id && (
                <div className="border-t-2 border-purple-200 p-4 bg-gray-50 space-y-4">
                  {log.request && (
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 mb-2">📤 Request:</h4>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-gray-200 overflow-x-auto">
                        {JSON.stringify(log.request, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.response && (
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 mb-2">📥 Response:</h4>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-gray-200 overflow-x-auto">
                        {JSON.stringify(log.response, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 mb-2">ℹ️ Metadata:</h4>
                    <div className="text-xs bg-white p-3 rounded-lg border border-gray-200 space-y-1">
                      <p><strong>ID:</strong> {log.id}</p>
                      <p><strong>Timestamp:</strong> {new Date(log.timestamp).toISOString()}</p>
                      <p><strong>Type:</strong> {log.type}</p>
                      {log.duration && <p><strong>Duration:</strong> {log.duration}ms</p>}
                      {log.status && <p><strong>Status:</strong> {log.status}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

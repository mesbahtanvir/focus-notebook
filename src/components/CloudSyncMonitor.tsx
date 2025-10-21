"use client";

import { useState, useEffect } from "react";
import { db, SyncHistoryRow } from "@/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  GitMerge,
  Upload,
  Download,
  TrendingUp,
  Activity,
  Database,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function CloudSyncMonitor() {
  const { user } = useAuth();
  const [syncHistory, setSyncHistory] = useState<SyncHistoryRow[]>([]);
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    conflicts: 0,
    pendingOps: 0,
  });
  const [filter, setFilter] = useState<"all" | "success" | "failed" | "conflict">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSyncHistory();
    const interval = setInterval(loadSyncHistory, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSyncHistory = async () => {
    try {
      const history = await db.syncHistory
        .orderBy("timestamp")
        .reverse()
        .limit(100)
        .toArray();

      setSyncHistory(history);

      // Calculate stats
      const stats = {
        totalSyncs: history.length,
        successfulSyncs: history.filter((h) => h.status === "success").length,
        failedSyncs: history.filter((h) => h.status === "failed").length,
        conflicts: history.filter((h) => h.operation === "conflict").length,
        pendingOps: history.filter((h) => h.status === "pending").length,
      };
      setStats(stats);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load sync history:", error);
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Clear all sync history? This cannot be undone.")) return;
    await db.syncHistory.clear();
    loadSyncHistory();
  };

  const filteredHistory = syncHistory.filter((h) => {
    if (filter === "all") return true;
    if (filter === "success") return h.status === "success";
    if (filter === "failed") return h.status === "failed";
    if (filter === "conflict") return h.operation === "conflict";
    return true;
  });

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case "push":
        return <Upload className="h-4 w-4" />;
      case "pull":
        return <Download className="h-4 w-4" />;
      case "conflict":
        return <AlertCircle className="h-4 w-4" />;
      case "merge":
        return <GitMerge className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/30";
      case "failed":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/30";
      case "pending":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
    }
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case "push":
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/30";
      case "pull":
        return "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30";
      case "conflict":
        return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/30";
      case "merge":
        return "text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-950/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <CloudOff className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Not Connected
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Sign in to view cloud sync activity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 rounded-xl">
            <Cloud className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              ☁️ Cloud Sync Monitor
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track all synchronization activity
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSyncHistory}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={clearHistory}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatsCard
          icon={<Activity className="h-5 w-5" />}
          title="Total Syncs"
          value={stats.totalSyncs}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatsCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Successful"
          value={stats.successfulSyncs}
          gradient="from-green-500 to-emerald-500"
        />
        <StatsCard
          icon={<XCircle className="h-5 w-5" />}
          title="Failed"
          value={stats.failedSyncs}
          gradient="from-red-500 to-pink-500"
        />
        <StatsCard
          icon={<GitMerge className="h-5 w-5" />}
          title="Conflicts"
          value={stats.conflicts}
          gradient="from-orange-500 to-amber-500"
        />
        <StatsCard
          icon={<Clock className="h-5 w-5" />}
          title="Pending"
          value={stats.pendingOps}
          gradient="from-yellow-500 to-orange-500"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "success", "failed", "conflict"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === f
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Sync History List */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border-4 border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-b-4 border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            <Database className="h-5 w-5 inline mr-2" />
            Sync History
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto text-gray-400 animate-spin mb-2" />
              <p className="text-gray-500">Loading sync history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <Cloud className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No sync activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredHistory.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2 rounded-lg ${getOperationColor(
                            entry.operation
                          )}`}
                        >
                          {getOperationIcon(entry.operation)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                              {entry.operation}
                            </span>
                            {entry.collection && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
                                {entry.collection}
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(
                                entry.status
                              )}`}
                            >
                              {entry.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {entry.itemsAffected && (
                              <div className="text-xs text-gray-500">
                                Affected items: {entry.itemsAffected}
                              </div>
                            )}
                            {entry.conflictResolution && (
                              <div className="text-xs flex items-center gap-1">
                                <GitMerge className="h-3 w-3" />
                                <span>
                                  Resolved: {entry.conflictResolution}
                                </span>
                              </div>
                            )}
                            {entry.errorMessage && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Error: {entry.errorMessage}
                              </div>
                            )}
                            {entry.details && (
                              <details className="text-xs text-gray-500 mt-1">
                                <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                                  Details
                                </summary>
                                <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
                                  {entry.details}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  icon,
  title,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  gradient: string;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg p-4">
      <div
        className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${gradient} bg-opacity-10 mb-2`}
      >
        <div className="text-white">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
    </div>
  );
}

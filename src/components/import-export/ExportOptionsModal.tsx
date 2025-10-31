'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Download,
  FileText,
  Folder,
  Target,
  Lightbulb,
  Smile,
  Timer,
  Users,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Briefcase,
} from 'lucide-react';
import { ExportFilterOptions, EntityType } from '@/types/import-export';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (filters: ExportFilterOptions) => void;
  availableCounts: Record<EntityType, number>;
}

const entityIcons: Record<EntityType, React.ComponentType<any>> = {
  tasks: FileText,
  projects: Folder,
  goals: Target,
  thoughts: Lightbulb,
  moods: Smile,
  focusSessions: Timer,
  people: Users,
  portfolios: Briefcase,
};

const entityLabels: Record<EntityType, string> = {
  tasks: 'Tasks',
  projects: 'Projects',
  goals: 'Goals',
  thoughts: 'Thoughts',
  moods: 'Moods',
  focusSessions: 'Focus Sessions',
  people: 'People',
  portfolios: 'Portfolios',
};

export function ExportOptionsModal({
  isOpen,
  onClose,
  onExport,
  availableCounts,
}: ExportOptionsModalProps) {
  const [selectedEntities, setSelectedEntities] = useState<Set<EntityType>>(
    new Set(['tasks', 'projects', 'goals', 'thoughts', 'moods', 'focusSessions', 'people', 'portfolios'])
  );
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useFilters, setUseFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [includeCompleted, setIncludeCompleted] = useState(true);

  if (!isOpen) return null;

  const entityTypes: EntityType[] = [
    'tasks',
    'projects',
    'goals',
    'thoughts',
    'moods',
    'focusSessions',
    'people',
    'portfolios',
  ];

  const availableEntityTypes = entityTypes.filter(
    (type) => availableCounts[type] > 0
  );

  const toggleEntity = (entityType: EntityType) => {
    const newSet = new Set(selectedEntities);
    if (newSet.has(entityType)) {
      newSet.delete(entityType);
    } else {
      newSet.add(entityType);
    }
    setSelectedEntities(newSet);
  };

  const selectAll = () => {
    setSelectedEntities(new Set(availableEntityTypes));
  };

  const deselectAll = () => {
    setSelectedEntities(new Set());
  };

  const handleExport = () => {
    const filters: ExportFilterOptions = {
      entities: Array.from(selectedEntities),
      includeCompleted,
    };

    if (useDateRange && startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    if (useFilters && statusFilter.length > 0) {
      filters.status = statusFilter;
    }

    onExport(filters);
  };

  const totalSelected = Array.from(selectedEntities).reduce(
    (sum, type) => sum + availableCounts[type],
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 shadow-2xl border border-purple-500/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <Download className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Export Data</h2>
              <p className="text-sm text-gray-400">Choose what to export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Select Entities */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-white">
                Select Data Types
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs px-3 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {availableEntityTypes.map((entityType) => {
                const Icon = entityIcons[entityType];
                const label = entityLabels[entityType];
                const count = availableCounts[entityType];
                const isSelected = selectedEntities.has(entityType);

                return (
                  <button
                    key={entityType}
                    onClick={() => toggleEntity(entityType)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-purple-400" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-500" />
                    )}
                    <Icon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-gray-400">{count} items</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="useDateRange"
                checked={useDateRange}
                onChange={(e) => setUseDateRange(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="useDateRange" className="text-sm font-medium text-white">
                  Filter by date range
                </label>
                <p className="text-xs text-gray-400">
                  Only export items created within a specific time period
                </p>
              </div>
            </div>

            {useDateRange && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Filters */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="includeCompleted"
                checked={includeCompleted}
                onChange={(e) => setIncludeCompleted(e.target.checked)}
                className="mt-1"
              />
              <div>
                <label htmlFor="includeCompleted" className="text-sm font-medium text-white">
                  Include completed items
                </label>
                <p className="text-xs text-gray-400">
                  Export tasks and projects marked as completed
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-300 text-sm mb-2">
              <FileText className="h-4 w-4" />
              <span className="font-medium">Export Summary</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Selected entity types:</span>
                <span className="text-white font-medium">
                  {selectedEntities.size}
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Total items:</span>
                <span className="text-white font-medium">{totalSelected}</span>
              </div>
              {useDateRange && startDate && endDate && (
                <div className="flex justify-between text-gray-300">
                  <span>Date range:</span>
                  <span className="text-white font-medium text-xs">
                    {new Date(startDate).toLocaleDateString()} -{' '}
                    {new Date(endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-purple-500/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={selectedEntities.size === 0}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Download className="h-4 w-4" />
            Export {totalSelected} Items
          </button>
        </div>
      </motion.div>
    </div>
  );
}

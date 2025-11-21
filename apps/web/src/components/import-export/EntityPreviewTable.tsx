'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Square,
  Search,
  FileText,
  Folder,
  Target,
  Lightbulb,
  Smile,
  Timer,
  Users,
  AlertTriangle,
  Filter,
  Briefcase,
  DollarSign,
  Link2,
  MessagesSquare,
} from 'lucide-react';
import { EntityType, EntityCollection, Conflict } from '@/types/import-export';

interface EntityPreviewTableProps {
  entityType: EntityType;
  entities: any[];
  selectedIds: Set<string>;
  conflicts: Conflict[];
  onToggle: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
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
  spending: DollarSign,
  relationships: Link2,
  llmLogs: MessagesSquare,
};

export function EntityPreviewTable({
  entityType,
  entities,
  selectedIds,
  conflicts,
  onToggle,
  onToggleAll,
}: EntityPreviewTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);

  const Icon = entityIcons[entityType];

  // Get conflicts for this entity type
  const entityConflicts = useMemo(() => {
    return new Map(
      conflicts
        .filter((c) => c.entityType === entityType)
        .map((c) => [c.entityId, c])
    );
  }, [conflicts, entityType]);

  // Filter entities based on search and conflict filter
  const filteredEntities = useMemo(() => {
    let filtered = entities;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entity) => {
        const searchableText = getSearchableText(entityType, entity).toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Apply conflict filter
    if (showOnlyConflicts) {
      filtered = filtered.filter((entity) => entityConflicts.has(entity.id));
    }

    return filtered;
  }, [entities, searchQuery, showOnlyConflicts, entityConflicts, entityType]);

  const allSelected = filteredEntities.length > 0 && filteredEntities.every((e) => selectedIds.has(e.id));
  const someSelected = filteredEntities.some((e) => selectedIds.has(e.id)) && !allSelected;

  const handleToggleAll = () => {
    onToggleAll(!allSelected);
  };

  if (entities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No {entityType} to import</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${entityType}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Conflict filter */}
        {entityConflicts.size > 0 && (
          <button
            onClick={() => setShowOnlyConflicts(!showOnlyConflicts)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showOnlyConflicts
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Conflicts ({entityConflicts.size})</span>
          </button>
        )}

        {/* Select all */}
        <button
          onClick={handleToggleAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600 transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4 text-purple-400" />
          ) : someSelected ? (
            <div className="h-4 w-4 border-2 border-purple-400 bg-purple-400/50 rounded" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          <span className="text-sm">
            {allSelected ? 'Deselect All' : 'Select All'}
          </span>
        </button>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-400">
        Showing {filteredEntities.length} of {entities.length} items
        {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
      </div>

      {/* Table */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700 overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-800 sticky top-0 z-10">
              <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                <th className="p-3 w-12"></th>
                <th className="p-3">Name</th>
                <th className="p-3">Details</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((entity) => {
                const isSelected = selectedIds.has(entity.id);
                const conflict = entityConflicts.get(entity.id);

                return (
                  <motion.tr
                    key={entity.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                      conflict ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3">
                      <button
                        onClick={() => onToggle(entity.id)}
                        className="hover:scale-110 transition-transform"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-purple-400" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </td>

                    {/* Name */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-white font-medium truncate">
                          {getEntityName(entityType, entity)}
                        </span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {getEntityDetails(entityType, entity).map((detail, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300"
                          >
                            {detail}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {conflict ? (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs">Conflict</span>
                        </div>
                      ) : (
                        <span className="text-xs text-green-400">Ready</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredEntities.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No items match your filters</p>
        </div>
      )}
    </div>
  );
}

// Helper functions

function getEntityName(entityType: EntityType, entity: any): string {
  switch (entityType) {
    case 'tasks':
    case 'projects':
    case 'goals':
      return entity.title || 'Untitled';
    case 'thoughts':
      return entity.text?.substring(0, 100) || 'No text';
    case 'moods':
      return `Mood: ${entity.value}/10`;
    case 'focusSessions':
      return `${entity.duration} min session`;
    case 'people':
      return entity.name || 'Unnamed';
    case 'portfolios':
      return entity.name || 'Untitled Portfolio';
    default:
      return 'Unknown';
  }
}

function getEntityDetails(entityType: EntityType, entity: any): string[] {
  const details: string[] = [];

  switch (entityType) {
    case 'tasks':
      if (entity.category) details.push(entity.category);
      if (entity.priority) details.push(entity.priority);
      if (entity.status) details.push(entity.status);
      if (entity.tags?.length) details.push(...entity.tags.slice(0, 3).map((t: string) => `#${t}`));
      break;
    case 'projects':
      if (entity.status) details.push(entity.status);
      if (entity.priority) details.push(entity.priority);
      if (entity.tags?.length) details.push(...entity.tags.slice(0, 3).map((t: string) => `#${t}`));
      break;
    case 'goals':
      if (entity.timeframe) details.push(entity.timeframe);
      if (entity.status) details.push(entity.status);
      if (entity.tags?.length) details.push(...entity.tags.slice(0, 3).map((t: string) => `#${t}`));
      break;
    case 'thoughts':
      if (entity.isDeepThought) details.push('deep thought');
      if (entity.tags?.length) details.push(...entity.tags.slice(0, 3).map((t: string) => `#${t}`));
      break;
    case 'moods':
      if (entity.note) details.push(entity.note.substring(0, 30));
      break;
    case 'focusSessions':
      if (entity.tasks?.length) details.push(`${entity.tasks.length} tasks`);
      if (entity.rating) details.push(`★${entity.rating}`);
      break;
    case 'people':
      if (entity.relationshipType) details.push(entity.relationshipType);
      if (entity.tags?.length) details.push(...entity.tags.slice(0, 3).map((t: string) => `#${t}`));
      break;
    case 'portfolios':
      if (entity.status) details.push(entity.status);
      if (entity.baseCurrency) details.push(`Base: ${entity.baseCurrency}`);
      if (Array.isArray(entity.investments)) {
        details.push(`${entity.investments.length} investments`);
      }
      break;
  }

  return details;
}

function getSearchableText(entityType: EntityType, entity: any): string {
  const parts: string[] = [getEntityName(entityType, entity)];

  // Add additional searchable fields
  if (entity.tags) parts.push(...entity.tags);
  if (entity.category) parts.push(entity.category);
  if (entity.status) parts.push(entity.status);
  if (entity.notes) parts.push(entity.notes);
  if (entity.description) parts.push(entity.description);
  if (entityType === 'portfolios' && Array.isArray(entity.investments)) {
    parts.push(...entity.investments.map((inv: any) => inv.name || inv.ticker || ''));
  }

  return parts.join(' ');
}

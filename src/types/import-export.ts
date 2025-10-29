import { Task } from "@/store/useTasks";
import { Project } from "@/store/useProjects";
import { Goal } from "@/store/useGoals";
import { Thought } from "@/store/useThoughts";
import { MoodEntry } from "@/store/useMoods";
import { FocusSession } from "@/store/useFocus";
import { Person } from "@/store/useRelationships";

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type EntityType =
  | 'tasks'
  | 'projects'
  | 'goals'
  | 'thoughts'
  | 'moods'
  | 'focusSessions'
  | 'people';

export interface EntityCollection {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  thoughts: Thought[];
  moods: MoodEntry[];
  focusSessions: FocusSession[];
  people: Person[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportMetadata {
  version: string;
  exportedAt: string;
  userId: string;
  appVersion?: string;
  totalItems: number;
  entityCounts: Record<EntityType, number>;
}

export interface ExportedData {
  metadata: ExportMetadata;
  data: Partial<EntityCollection>;
}

export interface ExportFilterOptions {
  entities: EntityType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  categories?: string[];
  tags?: string[];
  includeCompleted?: boolean;
  includeArchived?: boolean;
}

export interface ExportSelection {
  [key: string]: Set<string>; // EntityType -> Set of IDs
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ParsedImportData {
  metadata: ExportMetadata;
  entities: EntityCollection;
  isValid: boolean;
  validationErrors: ValidationError[];
  conflicts: ConflictReport;
  relationships: RelationshipMap;
  stats: ImportStats;
}

export interface ValidationError {
  type: 'missing_field' | 'invalid_type' | 'invalid_reference' | 'schema_version';
  entityType: EntityType;
  entityId: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportStats {
  totalItems: number;
  itemsByType: Record<EntityType, number>;
  estimatedImportTime?: number; // in milliseconds
  dataSize: number; // in bytes
  schemaVersion: string;
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

export enum ConflictType {
  DUPLICATE_ID = 'duplicate_id',
  BROKEN_REFERENCE = 'broken_reference',
  VERSION_MISMATCH = 'version_mismatch',
  DATA_CONSTRAINT = 'data_constraint'
}

export enum ConflictResolution {
  SKIP = 'skip',           // Skip importing this item
  REPLACE = 'replace',     // Replace existing with imported
  MERGE = 'merge',         // Merge fields (keep newer)
  CREATE_NEW = 'create_new', // Generate new ID and import
  ASK_USER = 'ask_user'    // User decides
}

export interface Conflict {
  id: string;
  type: ConflictType;
  entityType: EntityType;
  entityId: string;
  itemTitle?: string;
  existingItem?: any;
  importedItem?: any;
  message: string;
  suggestedResolution: ConflictResolution;
  resolution?: ConflictResolution;
  details?: {
    referencedEntity?: string;
    referencedId?: string;
    fieldName?: string;
  };
}

export interface ConflictReport {
  totalConflicts: number;
  conflictsByType: Record<ConflictType, number>;
  conflicts: Conflict[];
  hasBlockingConflicts: boolean;
}

// ============================================================================
// RELATIONSHIP MAPPING
// ============================================================================

export interface RelationshipMap {
  taskToProject: Map<string, string>;      // taskId -> projectId
  taskToThought: Map<string, string>;      // taskId -> thoughtId
  projectToGoal: Map<string, string>;      // projectId -> goalId
  projectToParent: Map<string, string>;    // projectId -> parentProjectId
  thoughtToTasks: Map<string, string[]>;   // thoughtId -> taskIds[]
  thoughtToProjects: Map<string, string[]>; // thoughtId -> projectIds[]
  thoughtToMoods: Map<string, string[]>;   // thoughtId -> moodIds[]
  thoughtToPeople: Map<string, string[]>;  // thoughtId -> personIds[]
  dependencyGraph: DependencyGraph;
  importOrder: EntityType[];
}

export interface DependencyGraph {
  nodes: Set<string>; // Entity IDs
  edges: Map<string, Set<string>>; // Entity ID -> Set of dependent entity IDs
  entityTypes: Map<string, EntityType>; // Entity ID -> EntityType
}

// ============================================================================
// IMPORT SELECTION
// ============================================================================

export interface ImportSelection {
  selectedItems: Map<EntityType, Set<string>>; // Items to import
  skippedItems: Map<EntityType, Set<string>>;  // Items to skip
  conflictResolutions: Map<string, ConflictResolution>; // conflictId -> resolution
  totalSelected: number;
  totalSkipped: number;
}

export interface ImportOptions {
  strategy: 'merge' | 'replace' | 'skip-existing';
  preserveIds: boolean;
  updateReferences: boolean;
  createBackup: boolean;
  autoResolveConflicts: boolean;
  defaultConflictResolution: ConflictResolution;
}

// ============================================================================
// IMPORT PROGRESS
// ============================================================================

export enum ImportPhase {
  PARSING = 'parsing',
  VALIDATING = 'validating',
  DETECTING_CONFLICTS = 'detecting_conflicts',
  PREPARING = 'preparing',
  IMPORTING_GOALS = 'importing_goals',
  IMPORTING_PROJECTS = 'importing_projects',
  IMPORTING_TASKS = 'importing_tasks',
  IMPORTING_THOUGHTS = 'importing_thoughts',
  IMPORTING_MOODS = 'importing_moods',
  IMPORTING_FOCUS_SESSIONS = 'importing_focus_sessions',
  IMPORTING_PEOPLE = 'importing_people',
  UPDATING_REFERENCES = 'updating_references',
  COMPLETING = 'completing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ImportProgress {
  phase: ImportPhase;
  overallProgress: number; // 0-100
  currentEntityType?: EntityType;
  currentEntityName?: string; // Title/name of item being imported
  currentEntityDetails?: {
    id?: string;
    title?: string;
    category?: string;
    tags?: string[];
    type?: string;
  };
  itemsProcessed: number;
  itemsTotal: number;
  itemsByType: Record<EntityType, {
    processed: number;
    total: number;
    progress: number;
  }>;
  startTime: number;
  elapsedTime: number;
  estimatedTimeRemaining?: number;
  speed?: number; // items per second
  logs: ImportLogEntry[];
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportLogEntry {
  timestamp: number;
  phase: ImportPhase;
  entityType?: EntityType;
  entityId?: string;
  entityName?: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

export interface ImportError {
  timestamp: number;
  entityType?: EntityType;
  entityId?: string;
  entityName?: string;
  message: string;
  error: Error;
  canContinue: boolean;
}

export interface ImportWarning {
  timestamp: number;
  entityType?: EntityType;
  entityId?: string;
  entityName?: string;
  message: string;
  details?: string;
}

export interface ImportResult {
  success: boolean;
  completed: boolean;
  cancelled: boolean;
  totalImported: number;
  importedByType: Record<EntityType, number>;
  skippedByType: Record<EntityType, number>;
  errors: ImportError[];
  warnings: ImportWarning[];
  duration: number;
  backupId?: string;
  logs: ImportLogEntry[];
}

// ============================================================================
// ID MAPPING
// ============================================================================

export interface IdMapping {
  oldToNew: Map<string, string>; // old ID -> new ID
  newToOld: Map<string, string>; // new ID -> old ID
  preserved: Set<string>; // IDs that were preserved
  generated: Set<string>; // IDs that were newly generated
}

// ============================================================================
// BACKUP
// ============================================================================

export interface BackupSnapshot {
  id: string;
  createdAt: string;
  userId: string;
  reason: 'pre_import' | 'manual';
  data: EntityCollection;
  metadata: {
    totalItems: number;
    itemsByType: Record<EntityType, number>;
  };
}

// ============================================================================
// PROGRESS CALLBACKS
// ============================================================================

export type ProgressCallback = (progress: ImportProgress) => void;
export type CompletionCallback = (result: ImportResult) => void;
export type ErrorCallback = (error: ImportError) => void;

export interface Migration {
  id: string; // Format: YYYYMMDD-HH-description (e.g., "20250113-01-archive-status-field")
  version: number; // Sequential version number (1, 2, 3, etc.)
  name: string;
  description: string;
  execute: (userId: string) => Promise<MigrationResult>;
}

export interface MigrationResult {
  success: boolean;
  itemsProcessed: number;
  error?: string;
}

export interface MigrationRecord {
  id: string;
  version: number;
  name: string;
  executedAt: string; // ISO timestamp
  success: boolean;
  itemsProcessed: number;
  error?: string;
}

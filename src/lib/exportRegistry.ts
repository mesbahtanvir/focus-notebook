/**
 * Export/Import Registry System
 * Allows tools to subscribe and automatically be included in export/import operations
 */

export interface ExportableDataSource<T = any> {
  /**
   * Unique identifier for this data source
   */
  id: string;

  /**
   * Display name for the data source
   */
  name: string;

  /**
   * Description of what data this source provides
   */
  description?: string;

  /**
   * Export data from this source
   * @param userId - The user ID to export data for
   * @returns Promise of the data to export
   */
  export: (userId: string) => Promise<T[]>;

  /**
   * Import data into this source
   * @param userId - The user ID to import data for
   * @param data - The data to import
   * @returns Promise of imported item IDs or count
   */
  import: (userId: string, data: T[]) => Promise<string[] | number>;

  /**
   * Validate data before import
   * @param data - The data to validate
   * @returns Array of validation errors, empty if valid
   */
  validate?: (data: T[]) => string[];

  /**
   * Transform data during export (e.g., remove sensitive fields)
   */
  transformExport?: (data: T[]) => T[];

  /**
   * Transform data during import (e.g., add default values)
   */
  transformImport?: (data: T[]) => T[];

  /**
   * Priority for export/import order (higher = earlier)
   * Default: 0
   */
  priority?: number;
}

/**
 * Global registry of exportable data sources
 */
class ExportRegistry {
  private sources: Map<string, ExportableDataSource> = new Map();

  /**
   * Register a new data source
   */
  register<T>(source: ExportableDataSource<T>): void {
    if (this.sources.has(source.id)) {
      console.warn(`Export source "${source.id}" is already registered. Overwriting.`);
    }
    this.sources.set(source.id, source);
    console.log(`✅ Registered export source: ${source.id}`);
  }

  /**
   * Unregister a data source
   */
  unregister(sourceId: string): boolean {
    const result = this.sources.delete(sourceId);
    if (result) {
      console.log(`❌ Unregistered export source: ${sourceId}`);
    }
    return result;
  }

  /**
   * Get a specific data source
   */
  getSource(sourceId: string): ExportableDataSource | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Get all registered data sources
   */
  getAllSources(): ExportableDataSource[] {
    return Array.from(this.sources.values()).sort((a, b) =>
      (b.priority || 0) - (a.priority || 0)
    );
  }

  /**
   * Get all source IDs
   */
  getSourceIds(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Export data from all registered sources
   */
  async exportAll(userId: string): Promise<Record<string, any[]>> {
    const sources = this.getAllSources();
    const result: Record<string, any[]> = {};

    for (const source of sources) {
      try {
        console.log(`📤 Exporting from source: ${source.id}`);
        let data = await source.export(userId);

        // Apply export transformation if defined
        if (source.transformExport) {
          data = source.transformExport(data);
        }

        result[source.id] = data;
        console.log(`✅ Exported ${data.length} items from ${source.id}`);
      } catch (error) {
        console.error(`❌ Failed to export from ${source.id}:`, error);
        result[source.id] = [];
      }
    }

    return result;
  }

  /**
   * Export data from specific sources
   */
  async exportSelected(userId: string, sourceIds: string[]): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};

    for (const sourceId of sourceIds) {
      const source = this.sources.get(sourceId);
      if (!source) {
        console.warn(`Source "${sourceId}" not found in registry`);
        continue;
      }

      try {
        console.log(`📤 Exporting from source: ${sourceId}`);
        let data = await source.export(userId);

        // Apply export transformation if defined
        if (source.transformExport) {
          data = source.transformExport(data);
        }

        result[sourceId] = data;
        console.log(`✅ Exported ${data.length} items from ${sourceId}`);
      } catch (error) {
        console.error(`❌ Failed to export from ${sourceId}:`, error);
        result[sourceId] = [];
      }
    }

    return result;
  }

  /**
   * Import data to all registered sources
   */
  async importAll(userId: string, data: Record<string, any[]>): Promise<Record<string, string[] | number>> {
    const sources = this.getAllSources();
    const result: Record<string, string[] | number> = {};

    for (const source of sources) {
      const sourceData = data[source.id];
      if (!sourceData || !Array.isArray(sourceData)) {
        console.log(`⏭️  Skipping source ${source.id} - no data provided`);
        continue;
      }

      try {
        console.log(`📥 Importing to source: ${source.id}`);

        // Validate data if validation function exists
        if (source.validate) {
          const errors = source.validate(sourceData);
          if (errors.length > 0) {
            console.error(`❌ Validation failed for ${source.id}:`, errors);
            result[source.id] = 0;
            continue;
          }
        }

        // Apply import transformation if defined
        let transformedData = sourceData;
        if (source.transformImport) {
          transformedData = source.transformImport(sourceData);
        }

        // Import the data
        const imported = await source.import(userId, transformedData);
        result[source.id] = imported;

        const count = Array.isArray(imported) ? imported.length : imported;
        console.log(`✅ Imported ${count} items to ${source.id}`);
      } catch (error) {
        console.error(`❌ Failed to import to ${source.id}:`, error);
        result[source.id] = 0;
      }
    }

    return result;
  }

  /**
   * Check if a source is registered
   */
  hasSource(sourceId: string): boolean {
    return this.sources.has(sourceId);
  }

  /**
   * Get count of registered sources
   */
  getSourceCount(): number {
    return this.sources.size;
  }

  /**
   * Clear all registered sources (useful for testing)
   */
  clear(): void {
    this.sources.clear();
    console.log('🗑️  Cleared all export sources');
  }
}

// Global singleton instance
export const exportRegistry = new ExportRegistry();

/**
 * Helper function to register a data source
 * Can be called from any tool to register itself
 */
export function registerExportSource<T>(source: ExportableDataSource<T>): void {
  exportRegistry.register(source);
}

/**
 * Helper function to create a simple export source from a Zustand store
 */
export function createStoreExportSource<T>(config: {
  id: string;
  name: string;
  description?: string;
  getItems: (userId: string) => Promise<T[]>;
  addItem: (userId: string, item: T) => Promise<string | void>;
  priority?: number;
}): ExportableDataSource<T> {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    priority: config.priority,
    export: config.getItems,
    import: async (userId: string, data: T[]) => {
      const imported: string[] = [];
      for (const item of data) {
        try {
          const id = await config.addItem(userId, item);
          if (id) imported.push(id);
        } catch (error) {
          console.error(`Failed to import item to ${config.id}:`, error);
        }
      }
      return imported;
    },
  };
}

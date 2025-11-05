import {
  ExportedData,
  ExportMetadata,
  ExportFilterOptions,
  EntityType,
  EntityCollection,
} from "@/types/import-export";

/**
 * ExportService
 *
 * Handles exporting data with filtering options.
 * Supports exporting all data or specific entities with filters.
 */
export class ExportService {
  private readonly VERSION = "1.0.0";

  /**
   * Export all data without filters
   */
  async exportAll(
    data: Partial<EntityCollection>,
    userId: string
  ): Promise<ExportedData> {
    const metadata = this.createMetadata(data, userId);

    return {
      metadata,
      data,
    };
  }

  /**
   * Export data with filters
   */
  async exportWithFilters(
    data: Partial<EntityCollection>,
    userId: string,
    filters: ExportFilterOptions
  ): Promise<ExportedData> {
    const filtered = this.applyFilters(data, filters);
    const metadata = this.createMetadata(filtered, userId);

    return {
      metadata,
      data: filtered,
    };
  }

  /**
   * Export specific items by IDs
   */
  async exportSelected(
    data: Partial<EntityCollection>,
    userId: string,
    selectedIds: Map<EntityType, Set<string>>
  ): Promise<ExportedData> {
    const filtered: Partial<EntityCollection> = {};

    // Filter each entity type by selected IDs
    for (const [entityType, ids] of selectedIds.entries()) {
      const collection = data[entityType] || [];
      filtered[entityType] = collection.filter((item: any) =>
        ids.has(item.id)
      ) as any;
    }

    const metadata = this.createMetadata(filtered, userId);

    return {
      metadata,
      data: filtered,
    };
  }

  /**
   * Export by date range
   */
  async exportByDateRange(
    data: Partial<EntityCollection>,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExportedData> {
    const filtered: Partial<EntityCollection> = {};

    // Filter tasks by date
    if (data.tasks) {
      filtered.tasks = data.tasks.filter((task: any) => {
        if (!task.createdAt) return false;
        const createdDate = new Date(task.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    // Filter projects by date
    if (data.projects) {
      filtered.projects = data.projects.filter((project: any) => {
        if (!project.createdAt) return false;
        const createdDate = new Date(project.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    // Filter goals by date
    if (data.goals) {
      filtered.goals = data.goals.filter((goal: any) => {
        if (!goal.createdAt) return false;
        const createdDate = new Date(goal.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    // Filter thoughts by date
    if (data.thoughts) {
      filtered.thoughts = data.thoughts.filter((thought: any) => {
        if (!thought.createdAt) return false;
        const createdDate = new Date(thought.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    // Filter moods by date
    if (data.moods) {
      filtered.moods = data.moods.filter((mood: any) => {
        if (!mood.createdAt) return false;
        const createdDate = new Date(mood.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    // Filter focus sessions by date
    if (data.focusSessions) {
      filtered.focusSessions = data.focusSessions.filter((session: any) => {
        if (!session.startTime) return false;
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startDate && sessionDate <= endDate;
      });
    }

    // Filter people by date
    if (data.people) {
      filtered.people = data.people.filter((person: any) => {
        if (!person.createdAt) return false;
        const createdDate = new Date(person.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    const metadata = this.createMetadata(filtered, userId);

    return {
      metadata,
      data: filtered,
    };
  }

  /**
   * Download exported data as JSON file
   */
  downloadAsJson(exportedData: ExportedData, filename?: string): void {
    const json = JSON.stringify(exportedData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `focus-notebook-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Private helper methods

  private applyFilters(
    data: Partial<EntityCollection>,
    filters: ExportFilterOptions
  ): Partial<EntityCollection> {
    const filtered: Partial<EntityCollection> = {};

    // Only include specified entity types
    for (const entityType of filters.entities) {
      const collection = data[entityType] || [];

      // Apply entity-specific filters
      switch (entityType) {
        case 'tasks':
          filtered.tasks = this.filterTasks(collection as any[], filters);
          break;
        case 'projects':
          filtered.projects = this.filterProjects(collection as any[], filters);
          break;
        case 'goals':
          filtered.goals = this.filterGoals(collection as any[], filters);
          break;
        case 'thoughts':
          filtered.thoughts = this.filterThoughts(collection as any[], filters);
          break;
        case 'moods':
          filtered.moods = collection as any;
          break;
        case 'focusSessions':
          filtered.focusSessions = collection as any;
          break;
        case 'people':
          filtered.people = this.filterPeople(collection as any[], filters);
          break;
        case 'portfolios':
          filtered.portfolios = collection as any;
          break;
      }
    }

    return filtered;
  }

  private filterTasks(tasks: any[], filters: ExportFilterOptions): any[] {
    let filtered = tasks;

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status!.includes(task.status));
    }

    // Filter by category
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(task =>
        task.category && filters.categories!.includes(task.category)
      );
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(task =>
        task.tags && task.tags.some((tag: string) => filters.tags!.includes(tag))
      );
    }

    // Filter by completion status
    if (filters.includeCompleted === false) {
      filtered = filtered.filter(task => !task.done);
    }

    // Filter by date range
    if (filters.dateRange) {
      filtered = filtered.filter(task => {
        if (!task.createdAt) return false;
        const createdDate = new Date(task.createdAt);
        return createdDate >= filters.dateRange!.start && createdDate <= filters.dateRange!.end;
      });
    }

    return filtered;
  }

  private filterProjects(projects: any[], filters: ExportFilterOptions): any[] {
    let filtered = projects;

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(project => filters.status!.includes(project.status));
    }

    // Filter by category
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(project =>
        project.category && filters.categories!.includes(project.category)
      );
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(project =>
        project.tags && project.tags.some((tag: string) => filters.tags!.includes(tag))
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      filtered = filtered.filter(project => {
        if (!project.createdAt) return false;
        const createdDate = new Date(project.createdAt);
        return createdDate >= filters.dateRange!.start && createdDate <= filters.dateRange!.end;
      });
    }

    return filtered;
  }

  private filterGoals(goals: any[], filters: ExportFilterOptions): any[] {
    let filtered = goals;

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(goal => filters.status!.includes(goal.status));
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(goal =>
        goal.tags && goal.tags.some((tag: string) => filters.tags!.includes(tag))
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      filtered = filtered.filter(goal => {
        if (!goal.createdAt) return false;
        const createdDate = new Date(goal.createdAt);
        return createdDate >= filters.dateRange!.start && createdDate <= filters.dateRange!.end;
      });
    }

    return filtered;
  }

  private filterThoughts(thoughts: any[], filters: ExportFilterOptions): any[] {
    let filtered = thoughts;

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(thought =>
        thought.tags && thought.tags.some((tag: string) => filters.tags!.includes(tag))
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      filtered = filtered.filter(thought => {
        if (!thought.createdAt) return false;
        const createdDate = new Date(thought.createdAt);
        return createdDate >= filters.dateRange!.start && createdDate <= filters.dateRange!.end;
      });
    }

    return filtered;
  }

  private filterPeople(people: any[], filters: ExportFilterOptions): any[] {
    let filtered = people;

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(person =>
        person.tags && person.tags.some((tag: string) => filters.tags!.includes(tag))
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      filtered = filtered.filter(person => {
        if (!person.createdAt) return false;
        const createdDate = new Date(person.createdAt);
        return createdDate >= filters.dateRange!.start && createdDate <= filters.dateRange!.end;
      });
    }

    return filtered;
  }

  private createMetadata(
    data: Partial<EntityCollection>,
    userId: string
  ): ExportMetadata {
    const entityCounts: Record<EntityType, number> = {
      tasks: data.tasks?.length || 0,
      projects: data.projects?.length || 0,
      goals: data.goals?.length || 0,
      thoughts: data.thoughts?.length || 0,
      moods: data.moods?.length || 0,
      focusSessions: data.focusSessions?.length || 0,
      people: data.people?.length || 0,
      portfolios: data.portfolios?.length || 0,
      spending: data.spending?.length || 0,
    };

    const totalItems = Object.values(entityCounts).reduce((sum, count) => sum + count, 0);

    return {
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      userId,
      appVersion: typeof window !== 'undefined' ? (window as any).__APP_VERSION__ : undefined,
      totalItems,
      entityCounts,
    };
  }
}

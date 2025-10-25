/**
 * Dependency Injection Setup
 * Configure all services and repositories for production
 */

import { appContainer } from './Container';
import { ServiceKeys } from './ServiceKeys';

// Auth
import { FirebaseAuthService } from '@/repositories/firebase/FirebaseAuthService';

// Repositories
import { FirebaseTaskRepository } from '@/repositories/firebase/FirebaseTaskRepository';

// Services
import { RecurringTaskService } from '@/services/RecurringTaskService';

/**
 * Setup production dependencies
 */
export function setupProductionDependencies(): void {
  // Clear existing (useful for HMR)
  appContainer.clear();

  // Register Auth Service (singleton)
  appContainer.registerSingleton(
    ServiceKeys.AUTH_SERVICE,
    () => new FirebaseAuthService()
  );

  // Register Task Repository (singleton)
  appContainer.registerSingleton(
    ServiceKeys.TASK_REPOSITORY,
    () => {
      const authService = appContainer.resolve(ServiceKeys.AUTH_SERVICE);
      return new FirebaseTaskRepository(authService);
    }
  );

  // Register Recurring Task Service (singleton)
  appContainer.registerSingleton(
    ServiceKeys.RECURRING_TASK_SERVICE,
    () => {
      const taskRepository = appContainer.resolve(ServiceKeys.TASK_REPOSITORY);
      return new RecurringTaskService(taskRepository);
    }
  );

  // TODO: Register other repositories as they are migrated
  // appContainer.registerSingleton(ServiceKeys.THOUGHT_REPOSITORY, ...)
  // appContainer.registerSingleton(ServiceKeys.MOOD_REPOSITORY, ...)
  // etc.
}

/**
 * Initialize DI container for production
 * Call this once at app startup
 */
export function initializeContainer(): void {
  setupProductionDependencies();
  console.log('✅ Dependency injection container initialized');
}

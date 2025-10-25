/**
 * Test Dependency Injection Setup
 * Configure mock services for testing
 */

import { Container } from './Container';
import { ServiceKeys } from './ServiceKeys';

// Mock implementations
import { MockAuthService } from '@/repositories/mock/MockAuthService';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { RecurringTaskService } from '@/services/RecurringTaskService';

/**
 * Create a test container with mock dependencies
 */
export function createTestContainer(): Container {
  const container = new Container();

  // Register Mock Auth Service
  const mockAuthService = new MockAuthService();
  container.registerInstance(ServiceKeys.AUTH_SERVICE, mockAuthService);

  // Register Mock Task Repository
  const mockTaskRepository = new MockTaskRepository(mockAuthService);
  container.registerInstance(ServiceKeys.TASK_REPOSITORY, mockTaskRepository);

  // Register Recurring Task Service (uses mock repository)
  container.registerSingleton(
    ServiceKeys.RECURRING_TASK_SERVICE,
    () => new RecurringTaskService(mockTaskRepository)
  );

  return container;
}

/**
 * Setup test dependencies in the app container
 * Useful for component tests
 */
export function setupTestDependencies(): {
  container: Container;
  mockAuthService: MockAuthService;
  mockTaskRepository: MockTaskRepository;
} {
  const container = createTestContainer();
  
  const mockAuthService = container.resolve<MockAuthService>(ServiceKeys.AUTH_SERVICE);
  const mockTaskRepository = container.resolve<MockTaskRepository>(ServiceKeys.TASK_REPOSITORY);

  return {
    container,
    mockAuthService,
    mockTaskRepository,
  };
}


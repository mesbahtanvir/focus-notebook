/**
 * Dependency Injection Container
 * Manages service lifecycle and dependencies
 */

type ServiceFactory<T> = () => T;
type ServiceInstance<T> = T;

export class Container {
  private services = new Map<string, ServiceFactory<any>>();
  private singletons = new Map<string, ServiceInstance<any>>();

  /**
   * Register a service with a factory function
   */
  register<T>(key: string, factory: ServiceFactory<T>): void {
    this.services.set(key, factory);
  }

  /**
   * Register a singleton service (created once and reused)
   */
  registerSingleton<T>(key: string, factory: ServiceFactory<T>): void {
    this.register(key, () => {
      if (!this.singletons.has(key)) {
        this.singletons.set(key, factory());
      }
      return this.singletons.get(key)!;
    });
  }

  /**
   * Register an existing instance as a singleton
   */
  registerInstance<T>(key: string, instance: T): void {
    this.singletons.set(key, instance);
    this.register(key, () => instance);
  }

  /**
   * Resolve a service by key
   */
  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service not registered: ${key}`);
    }
    return factory();
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Create a child container (inherits parent services)
   */
  createChild(): Container {
    const child = new Container();
    // Copy parent services
    this.services.forEach((factory, key) => {
      child.services.set(key, factory);
    });
    return child;
  }
}

// Default app container
export const appContainer = new Container();

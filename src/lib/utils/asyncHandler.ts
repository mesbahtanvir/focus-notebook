/**
 * Async Handler Utility
 *
 * Provides reusable wrappers for async operations with consistent error handling,
 * toast notifications, and loading state management.
 *
 * This eliminates the need for repetitive try/catch/finally blocks across components.
 */

import { toastSuccess, toastError } from '@/lib/toast-presets';

interface AsyncHandlerOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

/**
 * Wraps an async function with error handling and toast notifications
 *
 * @example
 * const result = await withAsyncHandler(
 *   async () => await updateItem(id, data),
 *   {
 *     successMessage: 'Item updated successfully!',
 *     errorMessage: 'Failed to update item',
 *     onSuccess: () => onClose(),
 *   }
 * );
 */
export async function withAsyncHandler<T>(
  fn: () => Promise<T>,
  options: AsyncHandlerOptions = {}
): Promise<T | null> {
  const {
    successMessage,
    errorMessage = 'Operation failed',
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  try {
    const result = await fn();

    if (successMessage && showSuccessToast) {
      toastSuccess({
        title: 'Success',
        description: successMessage
      });
    }

    onSuccess?.();
    return result;
  } catch (error) {
    console.error('Async operation error:', error);

    if (showErrorToast) {
      toastError({
        title: 'Error',
        description: errorMessage
      });
    }

    onError?.(error as Error);
    return null;
  }
}

interface AsyncHandlerWithLoadingOptions extends AsyncHandlerOptions {
  setLoading: (loading: boolean) => void;
}

/**
 * Wraps an async function with loading state management, error handling, and toast notifications
 *
 * @example
 * await withAsyncHandlerAndLoading(
 *   async () => await deleteItem(id),
 *   {
 *     setLoading: setIsDeleting,
 *     successMessage: 'Item deleted successfully!',
 *     errorMessage: 'Failed to delete item',
 *     onSuccess: () => router.push('/items'),
 *   }
 * );
 */
export async function withAsyncHandlerAndLoading<T>(
  fn: () => Promise<T>,
  options: AsyncHandlerWithLoadingOptions
): Promise<T | null> {
  const { setLoading, ...handlerOptions } = options;

  setLoading(true);

  try {
    return await withAsyncHandler(fn, handlerOptions);
  } finally {
    setLoading(false);
  }
}

interface FormSubmitHandlerOptions extends AsyncHandlerOptions {
  setIsSubmitting: (submitting: boolean) => void;
  onClose?: () => void;
  resetForm?: () => void;
}

/**
 * Specialized handler for form submissions with common patterns:
 * - Loading state management
 * - Success/error toasts
 * - Form reset on success
 * - Modal close on success
 *
 * @example
 * const handleSubmit = async (data: FormData) => {
 *   await withFormSubmitHandler(
 *     async () => await createItem(data),
 *     {
 *       setIsSubmitting,
 *       successMessage: 'Item created successfully!',
 *       errorMessage: 'Failed to create item',
 *       resetForm: () => methods.reset(),
 *       onClose,
 *     }
 *   );
 * };
 */
export async function withFormSubmitHandler<T>(
  fn: () => Promise<T>,
  options: FormSubmitHandlerOptions
): Promise<T | null> {
  const {
    setIsSubmitting,
    onClose,
    resetForm,
    ...handlerOptions
  } = options;

  setIsSubmitting(true);

  try {
    const result = await withAsyncHandler(fn, {
      ...handlerOptions,
      onSuccess: () => {
        resetForm?.();
        onClose?.();
        handlerOptions.onSuccess?.();
      },
    });

    return result;
  } finally {
    setIsSubmitting(false);
  }
}

/**
 * Wraps an async function with error handling but no toast notifications
 * Useful for operations where you want to handle UI feedback manually
 *
 * @example
 * const result = await withSilentErrorHandler(
 *   async () => await fetchData(),
 *   (error) => setError(error.message)
 * );
 */
export async function withSilentErrorHandler<T>(
  fn: () => Promise<T>,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error('Operation error:', error);
    onError?.(error as Error);
    return null;
  }
}

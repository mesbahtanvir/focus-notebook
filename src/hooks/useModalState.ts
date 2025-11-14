import { useState, useCallback } from 'react';

/**
 * Generic hook for managing modal state and edit mode
 * Eliminates duplication across all CRUD modals
 */

export interface UseModalStateReturn<T> {
  /** Whether modal is open */
  isOpen: boolean;

  /** Open modal (optionally with item to edit) */
  open: (item?: T) => void;

  /** Close modal and clear editing state */
  close: () => void;

  /** Toggle modal open/closed */
  toggle: () => void;

  /** Item being edited (null if creating new) */
  editingItem: T | null;

  /** Whether we're in edit mode */
  isEditing: boolean;

  /** Set the item being edited */
  setEditingItem: (item: T | null) => void;

  /** Handle edit click (opens modal with item) */
  handleEdit: (item: T) => void;

  /** Handle create click (opens modal without item) */
  handleCreate: () => void;

  /** Handle close (resets state) */
  handleClose: () => void;
}

export function useModalState<T = any>(): UseModalStateReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const open = useCallback((item?: T) => {
    if (item) {
      setEditingItem(item);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing editing item to allow exit animation
    setTimeout(() => setEditingItem(null), 200);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleEdit = useCallback((item: T) => {
    setEditingItem(item);
    setIsOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingItem(null);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setEditingItem(null), 200);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    editingItem,
    isEditing: editingItem !== null,
    setEditingItem,
    handleEdit,
    handleCreate,
    handleClose,
  };
}

/**
 * Specialized version for delete confirmations
 */
export interface UseDeleteConfirmReturn {
  /** ID of item to delete */
  deleteId: string | null;

  /** Show confirmation for deleting item */
  confirmDelete: (id: string) => void;

  /** Cancel deletion */
  cancelDelete: () => void;

  /** Execute deletion and clear state */
  executeDelete: (deleteFn: (id: string) => Promise<void>) => Promise<void>;

  /** Whether delete confirmation is showing */
  isConfirming: boolean;
}

export function useDeleteConfirm(): UseDeleteConfirmReturn {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteId(null);
  }, []);

  const executeDelete = useCallback(async (deleteFn: (id: string) => Promise<void>) => {
    if (deleteId) {
      await deleteFn(deleteId);
      setDeleteId(null);
    }
  }, [deleteId]);

  return {
    deleteId,
    confirmDelete,
    cancelDelete,
    executeDelete,
    isConfirming: deleteId !== null,
  };
}

/**
 * Combined hook for common CRUD modal patterns
 */
export interface UseCRUDModalReturn<T> extends UseModalStateReturn<T> {
  /** Handle form submission (create or update) */
  handleSubmit: (
    data: Partial<T>,
    createFn: (data: Partial<T>) => Promise<any>,
    updateFn: (id: string, data: Partial<T>) => Promise<void>,
    getItemId: (item: T) => string
  ) => Promise<void>;

  /** Whether submission is in progress */
  isSubmitting: boolean;
}

export function useCRUDModal<T = any>(): UseCRUDModalReturn<T> {
  const modalState = useModalState<T>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (
      data: Partial<T>,
      createFn: (data: Partial<T>) => Promise<any>,
      updateFn: (id: string, data: Partial<T>) => Promise<void>,
      getItemId: (item: T) => string
    ) => {
      setIsSubmitting(true);
      try {
        if (modalState.editingItem) {
          const id = getItemId(modalState.editingItem);
          await updateFn(id, data);
        } else {
          await createFn(data);
        }
        modalState.close();
      } finally {
        setIsSubmitting(false);
      }
    },
    [modalState]
  );

  return {
    ...modalState,
    handleSubmit,
    isSubmitting,
  };
}

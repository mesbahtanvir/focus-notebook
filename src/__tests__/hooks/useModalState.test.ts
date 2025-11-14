import { renderHook, act } from '@testing-library/react';
import { useModalState, useDeleteConfirm, useCRUDModal } from '@/hooks/useModalState';

interface TestItem {
  id: string;
  name: string;
  value: number;
}

describe('useModalState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Modal State', () => {
    it('should initialize with modal closed', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.editingItem).toBe(null);
      expect(result.current.isEditing).toBe(false);
    });

    it('should open modal', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingItem).toBe(null);
    });

    it('should open modal with item for editing', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

      act(() => {
        result.current.open(testItem);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingItem).toBe(testItem);
      expect(result.current.isEditing).toBe(true);
    });

    it('should close modal', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

      act(() => {
        result.current.open(testItem);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);

      // Editing item should be cleared after animation delay (200ms)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current.editingItem).toBe(null);
    });

    it('should toggle modal state', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Convenience Methods', () => {
    it('should handle edit action', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

      act(() => {
        result.current.handleEdit(testItem);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingItem).toBe(testItem);
      expect(result.current.isEditing).toBe(true);
    });

    it('should handle create action', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingItem).toBe(null);
      expect(result.current.isEditing).toBe(false);
    });

    it('should handle close action', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

      act(() => {
        result.current.open(testItem);
      });

      act(() => {
        result.current.handleClose();
      });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current.editingItem).toBe(null);
    });
  });

  describe('Editing Item Management', () => {
    it('should set editing item', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

      act(() => {
        result.current.setEditingItem(testItem);
      });

      expect(result.current.editingItem).toBe(testItem);
      expect(result.current.isEditing).toBe(true);
    });

    it('should clear editing item', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

      act(() => {
        result.current.setEditingItem(testItem);
      });

      expect(result.current.editingItem).toBe(testItem);

      act(() => {
        result.current.setEditingItem(null);
      });

      expect(result.current.editingItem).toBe(null);
      expect(result.current.isEditing).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should transition from create to edit', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.isEditing).toBe(false);

      const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

      act(() => {
        result.current.handleEdit(testItem);
      });

      expect(result.current.isEditing).toBe(true);
      expect(result.current.editingItem).toBe(testItem);
    });

    it('should transition from edit to create', () => {
      const { result } = renderHook(() => useModalState<TestItem>());

      const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

      act(() => {
        result.current.handleEdit(testItem);
      });

      expect(result.current.isEditing).toBe(true);

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.isEditing).toBe(false);
      expect(result.current.editingItem).toBe(null);
    });
  });
});

describe('useDeleteConfirm', () => {
  it('should initialize with no deletion pending', () => {
    const { result } = renderHook(() => useDeleteConfirm());

    expect(result.current.deleteId).toBe(null);
    expect(result.current.isConfirming).toBe(false);
  });

  it('should set delete confirmation', () => {
    const { result } = renderHook(() => useDeleteConfirm());

    act(() => {
      result.current.confirmDelete('test-id');
    });

    expect(result.current.deleteId).toBe('test-id');
    expect(result.current.isConfirming).toBe(true);
  });

  it('should cancel deletion', () => {
    const { result } = renderHook(() => useDeleteConfirm());

    act(() => {
      result.current.confirmDelete('test-id');
    });

    expect(result.current.deleteId).toBe('test-id');

    act(() => {
      result.current.cancelDelete();
    });

    expect(result.current.deleteId).toBe(null);
    expect(result.current.isConfirming).toBe(false);
  });

  it('should execute deletion and clear state', async () => {
    const { result } = renderHook(() => useDeleteConfirm());

    const deleteFn = jest.fn().mockResolvedValue(undefined);

    act(() => {
      result.current.confirmDelete('test-id');
    });

    expect(result.current.deleteId).toBe('test-id');

    await act(async () => {
      await result.current.executeDelete(deleteFn);
    });

    expect(deleteFn).toHaveBeenCalledWith('test-id');
    expect(result.current.deleteId).toBe(null);
    expect(result.current.isConfirming).toBe(false);
  });

  it('should not execute deletion if no id is set', async () => {
    const { result } = renderHook(() => useDeleteConfirm());

    const deleteFn = jest.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.executeDelete(deleteFn);
    });

    expect(deleteFn).not.toHaveBeenCalled();
  });
});

describe('useCRUDModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with modal closed and not submitting', () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.editingItem).toBe(null);
  });

  it('should handle create submission', async () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    const createFn = jest.fn().mockResolvedValue('new-id');
    const updateFn = jest.fn().mockResolvedValue(undefined);
    const getItemId = (item: TestItem) => item.id;

    act(() => {
      result.current.handleCreate();
    });

    expect(result.current.isOpen).toBe(true);

    const newData = { name: 'New Item', value: 42 };

    await act(async () => {
      await result.current.handleSubmit(newData, createFn, updateFn, getItemId);
    });

    expect(createFn).toHaveBeenCalledWith(newData);
    expect(updateFn).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it('should handle update submission', async () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    const createFn = jest.fn().mockResolvedValue('new-id');
    const updateFn = jest.fn().mockResolvedValue(undefined);
    const getItemId = (item: TestItem) => item.id;

    const existingItem: TestItem = { id: 'existing-id', name: 'Existing', value: 10 };

    act(() => {
      result.current.handleEdit(existingItem);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.editingItem).toBe(existingItem);

    const updates = { name: 'Updated Item', value: 99 };

    await act(async () => {
      await result.current.handleSubmit(updates, createFn, updateFn, getItemId);
    });

    expect(updateFn).toHaveBeenCalledWith('existing-id', updates);
    expect(createFn).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it('should set submitting state during submission', async () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    let resolveCreate: (value: string) => void;
    const createPromise = new Promise<string>((resolve) => {
      resolveCreate = resolve;
    });

    const createFn = jest.fn().mockReturnValue(createPromise);
    const updateFn = jest.fn().mockResolvedValue(undefined);
    const getItemId = (item: TestItem) => item.id;

    act(() => {
      result.current.handleCreate();
    });

    const submissionPromise = act(async () => {
      await result.current.handleSubmit({ name: 'Test', value: 1 }, createFn, updateFn, getItemId);
    });

    // Should be submitting now
    expect(result.current.isSubmitting).toBe(true);

    // Resolve the create
    await act(async () => {
      resolveCreate!('new-id');
      await submissionPromise;
    });

    // Should not be submitting anymore
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should reset submitting state on error', async () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    const createFn = jest.fn().mockRejectedValue(new Error('Create failed'));
    const updateFn = jest.fn().mockResolvedValue(undefined);
    const getItemId = (item: TestItem) => item.id;

    act(() => {
      result.current.handleCreate();
    });

    await expect(
      act(async () => {
        await result.current.handleSubmit({ name: 'Test', value: 1 }, createFn, updateFn, getItemId);
      })
    ).rejects.toThrow('Create failed');

    expect(result.current.isSubmitting).toBe(false);
  });

  it('should combine modal state and CRUD functionality', async () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    // Test modal methods exist
    expect(result.current.open).toBeDefined();
    expect(result.current.close).toBeDefined();
    expect(result.current.toggle).toBeDefined();
    expect(result.current.handleEdit).toBeDefined();
    expect(result.current.handleCreate).toBeDefined();
    expect(result.current.handleClose).toBeDefined();

    // Test CRUD method exists
    expect(result.current.handleSubmit).toBeDefined();

    // Test state properties exist
    expect(result.current.isOpen).toBeDefined();
    expect(result.current.editingItem).toBeDefined();
    expect(result.current.isEditing).toBeDefined();
    expect(result.current.isSubmitting).toBeDefined();
  });
});

describe('Integration Scenarios', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should handle complete create workflow', async () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    const createFn = jest.fn().mockResolvedValue('new-id');
    const updateFn = jest.fn();
    const getItemId = (item: TestItem) => item.id;

    // Step 1: Open modal for creation
    act(() => {
      result.current.handleCreate();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isEditing).toBe(false);

    // Step 2: Submit new item
    await act(async () => {
      await result.current.handleSubmit({ name: 'New', value: 1 }, createFn, updateFn, getItemId);
    });

    expect(createFn).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it('should handle complete edit workflow', async () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    const createFn = jest.fn();
    const updateFn = jest.fn().mockResolvedValue(undefined);
    const getItemId = (item: TestItem) => item.id;

    const existingItem: TestItem = { id: 'test-id', name: 'Existing', value: 10 };

    // Step 1: Open modal for editing
    act(() => {
      result.current.handleEdit(existingItem);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isEditing).toBe(true);
    expect(result.current.editingItem).toBe(existingItem);

    // Step 2: Submit updates
    await act(async () => {
      await result.current.handleSubmit({ name: 'Updated', value: 99 }, createFn, updateFn, getItemId);
    });

    expect(updateFn).toHaveBeenCalledWith('test-id', { name: 'Updated', value: 99 });
    expect(result.current.isOpen).toBe(false);

    // Step 3: Editing item should be cleared after delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.editingItem).toBe(null);
  });

  it('should handle user cancellation', () => {
    const { result } = renderHook(() => useCRUDModal<TestItem>());

    const testItem: TestItem = { id: '1', name: 'Test', value: 10 };

    // Open for editing
    act(() => {
      result.current.handleEdit(testItem);
    });

    expect(result.current.isOpen).toBe(true);

    // User cancels
    act(() => {
      result.current.handleClose();
    });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.editingItem).toBe(null);
  });
});

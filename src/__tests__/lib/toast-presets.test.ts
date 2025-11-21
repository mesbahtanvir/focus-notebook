/**
 * Tests for toast preset utilities
 */

import {
  toastSuccess,
  toastError,
  toastInfo,
  toastWarning,
  TOAST_DURATIONS,
} from '@/lib/toast-presets';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const { toast: mockToast } = require('@/hooks/use-toast');

describe('toast-presets utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TOAST_DURATIONS', () => {
    it('should export duration constants', () => {
      expect(TOAST_DURATIONS.short).toBe(3500);
      expect(TOAST_DURATIONS.medium).toBe(6000);
      expect(TOAST_DURATIONS.long).toBe(8000);
    });
  });

  describe('toastSuccess', () => {
    it('should call toast with description', () => {
      toastSuccess({ description: 'Operation successful' });

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Operation successful',
        duration: 3500,
      });
    });

    it('should use short duration by default', () => {
      toastSuccess({ description: 'Success' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 3500,
        })
      );
    });

    it('should accept custom title', () => {
      toastSuccess({
        title: 'Great!',
        description: 'Task completed',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Great!',
        description: 'Task completed',
        duration: 3500,
      });
    });

    it('should accept custom duration', () => {
      toastSuccess({
        description: 'Success',
        duration: 5000,
      });

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Success',
        duration: 5000,
      });
    });

    it('should accept action element', () => {
      const action = { altText: 'Undo', onClick: jest.fn() } as any;
      toastSuccess({
        description: 'Success',
        action,
      });

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Success',
        action,
        duration: 3500,
      });
    });

    it('should accept all parameters together', () => {
      const action = { altText: 'View', onClick: jest.fn() } as any;
      toastSuccess({
        title: 'Success!',
        description: 'Item saved',
        duration: 4000,
        action,
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success!',
        description: 'Item saved',
        duration: 4000,
        action,
      });
    });
  });

  describe('toastError', () => {
    it('should call toast with description and destructive variant', () => {
      toastError({ description: 'Operation failed' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Something went wrong',
        description: 'Operation failed',
        duration: 6000,
        variant: 'destructive',
      });
    });

    it('should use default title "Something went wrong"', () => {
      toastError({ description: 'Error message' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Something went wrong',
        })
      );
    });

    it('should accept custom title', () => {
      toastError({
        title: 'Network Error',
        description: 'Could not connect to server',
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Network Error',
          description: 'Could not connect to server',
        })
      );
    });

    it('should use medium duration by default', () => {
      toastError({ description: 'Error' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 6000,
        })
      );
    });

    it('should accept custom duration', () => {
      toastError({
        description: 'Error',
        duration: 10000,
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 10000,
        })
      );
    });

    it('should always set variant to destructive', () => {
      toastError({ description: 'Error' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      );
    });

    it('should accept action element', () => {
      const action = { altText: 'Retry', onClick: jest.fn() } as any;
      toastError({
        description: 'Upload failed',
        action,
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
        })
      );
    });
  });

  describe('toastInfo', () => {
    it('should call toast with description', () => {
      toastInfo({ description: 'Information message' });

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Information message',
        duration: 6000,
      });
    });

    it('should use medium duration by default', () => {
      toastInfo({ description: 'Info' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 6000,
        })
      );
    });

    it('should accept custom title', () => {
      toastInfo({
        title: 'Did you know?',
        description: 'Useful information',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Did you know?',
        description: 'Useful information',
        duration: 6000,
      });
    });

    it('should accept custom duration', () => {
      toastInfo({
        description: 'Info',
        duration: 8000,
      });

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Info',
        duration: 8000,
      });
    });

    it('should accept action element', () => {
      const action = { altText: 'Learn more', onClick: jest.fn() } as any;
      toastInfo({
        description: 'New feature available',
        action,
      });

      expect(mockToast).toHaveBeenCalledWith({
        description: 'New feature available',
        action,
        duration: 6000,
      });
    });
  });

  describe('toastWarning', () => {
    it('should call toast with description', () => {
      toastWarning({ description: 'Warning message' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Check this',
        description: 'Warning message',
        duration: 6000,
      });
    });

    it('should use default title "Check this"', () => {
      toastWarning({ description: 'Be careful' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Check this',
        })
      );
    });

    it('should accept custom title', () => {
      toastWarning({
        title: 'Attention',
        description: 'Action required',
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Attention',
          description: 'Action required',
        })
      );
    });

    it('should use medium duration by default', () => {
      toastWarning({ description: 'Warning' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 6000,
        })
      );
    });

    it('should accept custom duration', () => {
      toastWarning({
        description: 'Warning',
        duration: 7000,
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 7000,
        })
      );
    });

    it('should accept action element', () => {
      const action = { altText: 'Dismiss', onClick: jest.fn() } as any;
      toastWarning({
        description: 'Low battery',
        action,
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
        })
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle empty description', () => {
      toastSuccess({ description: '' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '',
        })
      );
    });

    it('should handle long descriptions', () => {
      const longDescription = 'A'.repeat(500);
      toastInfo({ description: longDescription });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: longDescription,
        })
      );
    });

    it('should handle special characters in description', () => {
      const description = 'Test <>&"\'';
      toastSuccess({ description });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description,
        })
      );
    });

    it('should handle zero duration', () => {
      toastSuccess({
        description: 'Test',
        duration: 0,
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 0,
        })
      );
    });
  });

  describe('comparison of toast types', () => {
    it('should have different default titles for error and warning', () => {
      toastError({ description: 'Test' });
      toastWarning({ description: 'Test' });

      expect(mockToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ title: 'Something went wrong' })
      );
      expect(mockToast).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ title: 'Check this' })
      );
    });

    it('should have different default durations for success vs info', () => {
      toastSuccess({ description: 'Test' });
      toastInfo({ description: 'Test' });

      expect(mockToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ duration: 3500 })
      );
      expect(mockToast).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ duration: 6000 })
      );
    });

    it('should only error toast have destructive variant', () => {
      toastSuccess({ description: 'Test' });
      toastError({ description: 'Test' });
      toastInfo({ description: 'Test' });
      toastWarning({ description: 'Test' });

      expect(mockToast).toHaveBeenNthCalledWith(
        1,
        expect.not.objectContaining({ variant: 'destructive' })
      );
      expect(mockToast).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ variant: 'destructive' })
      );
      expect(mockToast).toHaveBeenNthCalledWith(
        3,
        expect.not.objectContaining({ variant: 'destructive' })
      );
      expect(mockToast).toHaveBeenNthCalledWith(
        4,
        expect.not.objectContaining({ variant: 'destructive' })
      );
    });
  });
});

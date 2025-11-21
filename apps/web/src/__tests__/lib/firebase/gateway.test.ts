/**
 * Tests for enhanced Firebase gateway layer
 */

import {
  resilientGetDoc,
  resilientGetDocs,
  resilientSetDoc,
  resilientUpdateDoc,
  resilientDeleteDoc,
  resilientAddDoc,
  resilientBatch,
  resilientOperation,
  safeOperation,
  configureGateway,
  getGatewayConfig,
} from '@/lib/firebase/gateway';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  addDoc: jest.fn(),
}));

describe('Enhanced Firebase Gateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset gateway config
    configureGateway({
      defaultRetryOptions: {
        maxAttempts: 3,
        initialDelay: 10,
        enableLogging: false,
      },
      timeouts: {
        read: 10000,
        write: 15000,
        delete: 10000,
      },
      enableLogging: false,
    });
  });

  describe('configureGateway', () => {
    it('should update gateway configuration', () => {
      configureGateway({
        defaultRetryOptions: { maxAttempts: 5 },
        enableLogging: true,
      });

      const config = getGatewayConfig();
      expect(config.defaultRetryOptions?.maxAttempts).toBe(5);
      expect(config.enableLogging).toBe(true);
    });

    it('should merge configuration with defaults', () => {
      configureGateway({
        timeouts: { read: 5000 },
      });

      const config = getGatewayConfig();
      expect(config.timeouts?.read).toBe(5000);
      expect(config.timeouts?.write).toBe(15000); // Should keep default
    });
  });

  describe('resilientGetDoc', () => {
    it('should successfully get document', async () => {
      const mockDoc = { data: () => ({ name: 'test' }) };
      (firestore.getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const ref = { path: 'users/123' } as any;
      const result = await resilientGetDoc(ref);

      expect(result).toBe(mockDoc);
      expect(firestore.getDoc).toHaveBeenCalledWith(ref);
    });

    it('should retry on network error', async () => {
      const mockDoc = { data: () => ({ name: 'test' }) };
      (firestore.getDoc as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(mockDoc);

      const ref = { path: 'users/123' } as any;
      const result = await resilientGetDoc(ref);

      expect(result).toBe(mockDoc);
      expect(firestore.getDoc).toHaveBeenCalledTimes(2);
    });

    it('should throw on non-retryable error', async () => {
      const error = new Error('permission denied');
      (error as any).code = 'permission-denied';
      (firestore.getDoc as jest.Mock).mockRejectedValue(error);

      const ref = { path: 'users/123' } as any;

      await expect(resilientGetDoc(ref)).rejects.toThrow('permission denied');
      expect(firestore.getDoc).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry options', async () => {
      const mockDoc = { data: () => ({ name: 'test' }) };
      (firestore.getDoc as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(mockDoc);

      const ref = { path: 'users/123' } as any;
      await resilientGetDoc(ref, { maxAttempts: 5 });

      expect(firestore.getDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('resilientGetDocs', () => {
    it('should successfully get documents', async () => {
      const mockDocs = { docs: [{ id: '1' }, { id: '2' }] };
      (firestore.getDocs as jest.Mock).mockResolvedValue(mockDocs);

      const query = {} as any;
      const result = await resilientGetDocs(query);

      expect(result).toBe(mockDocs);
      expect(firestore.getDocs).toHaveBeenCalledWith(query);
    });

    it('should retry on transient error', async () => {
      const mockDocs = { docs: [] };
      (firestore.getDocs as jest.Mock)
        .mockRejectedValueOnce(new Error('internal error'))
        .mockResolvedValueOnce(mockDocs);

      const query = {} as any;
      const result = await resilientGetDocs(query);

      expect(result).toBe(mockDocs);
      expect(firestore.getDocs).toHaveBeenCalledTimes(2);
    });
  });

  describe('resilientSetDoc', () => {
    it('should successfully set document', async () => {
      (firestore.setDoc as jest.Mock).mockResolvedValue(undefined);

      const ref = { path: 'users/123' } as any;
      const data = { name: 'John' };

      await resilientSetDoc(ref, data);

      expect(firestore.setDoc).toHaveBeenCalledWith(ref, data, {});
    });

    it('should retry on network error', async () => {
      (firestore.setDoc as jest.Mock)
        .mockRejectedValueOnce(new Error('connection failed'))
        .mockResolvedValueOnce(undefined);

      const ref = { path: 'users/123' } as any;
      await resilientSetDoc(ref, { name: 'John' });

      expect(firestore.setDoc).toHaveBeenCalledTimes(2);
    });

    it('should pass setOptions correctly', async () => {
      (firestore.setDoc as jest.Mock).mockResolvedValue(undefined);

      const ref = { path: 'users/123' } as any;
      await resilientSetDoc(ref, { name: 'John' }, { merge: true });

      expect(firestore.setDoc).toHaveBeenCalledWith(
        ref,
        { name: 'John' },
        { merge: true }
      );
    });
  });

  describe('resilientUpdateDoc', () => {
    it('should successfully update document', async () => {
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const ref = { path: 'users/123' } as any;
      const data = { name: 'Jane' };

      await resilientUpdateDoc(ref, data);

      expect(firestore.updateDoc).toHaveBeenCalledWith(ref, data);
    });

    it('should retry on transient error', async () => {
      (firestore.updateDoc as jest.Mock)
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(undefined);

      const ref = { path: 'users/123' } as any;
      await resilientUpdateDoc(ref, { name: 'Jane' });

      expect(firestore.updateDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('resilientDeleteDoc', () => {
    it('should successfully delete document', async () => {
      (firestore.deleteDoc as jest.Mock).mockResolvedValue(undefined);

      const ref = { path: 'users/123' } as any;

      await resilientDeleteDoc(ref);

      expect(firestore.deleteDoc).toHaveBeenCalledWith(ref);
    });

    it('should retry on network error', async () => {
      (firestore.deleteDoc as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(undefined);

      const ref = { path: 'users/123' } as any;
      await resilientDeleteDoc(ref);

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('resilientAddDoc', () => {
    it('should successfully add document', async () => {
      const mockRef = { id: 'new-doc' };
      (firestore.addDoc as jest.Mock).mockResolvedValue(mockRef);

      const collectionRef = { path: 'users' } as any;
      const data = { name: 'New User' };

      const result = await resilientAddDoc(collectionRef, data);

      expect(result).toBe(mockRef);
      expect(firestore.addDoc).toHaveBeenCalledWith(collectionRef, data);
    });

    it('should retry on transient error', async () => {
      const mockRef = { id: 'new-doc' };
      (firestore.addDoc as jest.Mock)
        .mockRejectedValueOnce(new Error('internal error'))
        .mockResolvedValueOnce(mockRef);

      const collectionRef = { path: 'users' } as any;
      const result = await resilientAddDoc(collectionRef, { name: 'New User' });

      expect(result).toBe(mockRef);
      expect(firestore.addDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('resilientBatch', () => {
    it('should execute all operations in batch', async () => {
      const op1 = jest.fn().mockResolvedValue('result1');
      const op2 = jest.fn().mockResolvedValue('result2');
      const op3 = jest.fn().mockResolvedValue('result3');

      const results = await resilientBatch([op1, op2, op3]);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(op1).toHaveBeenCalledTimes(1);
      expect(op2).toHaveBeenCalledTimes(1);
      expect(op3).toHaveBeenCalledTimes(1);
    });

    it('should retry entire batch on failure', async () => {
      const op1 = jest.fn().mockResolvedValue('result1');
      const op2 = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('result2');

      const results = await resilientBatch([op1, op2], {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(results).toEqual(['result1', 'result2']);
      // Both operations should be retried
      expect(op1).toHaveBeenCalledTimes(2);
      expect(op2).toHaveBeenCalledTimes(2);
    });

    it('should throw if batch fails after retries', async () => {
      const op1 = jest.fn().mockRejectedValue(new Error('persistent error'));

      await expect(
        resilientBatch([op1], { maxAttempts: 2, initialDelay: 10 })
      ).rejects.toThrow();

      expect(op1).toHaveBeenCalledTimes(2);
    });
  });

  describe('resilientOperation', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await resilientOperation(operation, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const result = await resilientOperation(
        operation,
        'test-operation',
        { maxAttempts: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('safeOperation', () => {
    it('should return success result', async () => {
      const operation = jest.fn().mockResolvedValue('data');

      const result = await safeOperation(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('data');
      expect(result.error).toBeUndefined();
    });

    it('should classify network error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('network error'));

      const result = await safeOperation(operation);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toBeDefined();
    });

    it('should classify auth error', async () => {
      const error = new Error('permission denied');
      (error as any).code = 'permission-denied';
      const operation = jest.fn().mockRejectedValue(error);

      const result = await safeOperation(operation);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');
    });

    it('should classify rate limit error', async () => {
      const error = new Error('too many requests');
      (error as any).code = 'resource-exhausted';
      const operation = jest.fn().mockRejectedValue(error);

      const result = await safeOperation(operation);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate-limit');
    });

    it('should use fallback value on error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failed'));

      const result = await safeOperation(operation, 'fallback');

      expect(result.success).toBe(false);
      expect(result.data).toBe('fallback');
    });
  });

  describe('Integration', () => {
    it('should handle multiple retries with backoff', async () => {
      const mockDoc = { data: () => ({ name: 'test' }) };
      (firestore.getDoc as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(mockDoc);

      const ref = { path: 'users/123' } as any;
      const startTime = Date.now();

      const result = await resilientGetDoc(ref, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        enableJitter: false,
      });

      const duration = Date.now() - startTime;

      expect(result).toBe(mockDoc);
      expect(firestore.getDoc).toHaveBeenCalledTimes(3);
      // Should have waited ~300ms (100 + 200)
      expect(duration).toBeGreaterThanOrEqual(300);
    });

    it('should respect global configuration', async () => {
      configureGateway({
        defaultRetryOptions: {
          maxAttempts: 1, // Only 1 attempt
        },
      });

      const error = new Error('network error');
      (firestore.getDoc as jest.Mock).mockRejectedValue(error);

      const ref = { path: 'users/123' } as any;

      await expect(resilientGetDoc(ref)).rejects.toThrow();
      expect(firestore.getDoc).toHaveBeenCalledTimes(1);
    });
  });
});

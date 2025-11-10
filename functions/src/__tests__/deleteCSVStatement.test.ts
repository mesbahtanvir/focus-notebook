const onCallMock = jest.fn((handler: any) => handler);

class MockHttpsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

jest.mock('firebase-functions/v1', () => ({
  https: {
    onCall: (handler: any) => onCallMock(handler),
    HttpsError: MockHttpsError,
  },
}));

const firestoreMock = jest.fn();
const storageMock = jest.fn();

jest.mock('firebase-admin', () => ({
  firestore: (...args: any[]) => firestoreMock(...args),
  storage: (...args: any[]) => storageMock(...args),
}));

import { deleteCSVStatement } from '../deleteCSVStatement';

const invokeDelete = deleteCSVStatement as unknown as (
  data: any,
  context: any
) => Promise<any>;

describe('deleteCSVStatement cloud function', () => {
  let firestoreInstance: any;
  let transactionsCollection: any;
  let statusCollection: any;
  let bucketMock: any;
  let deleteFileMock: jest.Mock;
  let batchDeleteMock: jest.Mock;
  let batchCommitMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const transactionsDocs = [
      { ref: { id: 'txn-1' } },
      { ref: { id: 'txn-2' } },
    ];

    transactionsCollection = {
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ docs: transactionsDocs }),
      })),
    };

    const statusDocDeleteMock = jest.fn().mockResolvedValue(undefined);
    statusCollection = {
      doc: jest.fn(() => ({
        delete: statusDocDeleteMock,
      })),
    };

    batchDeleteMock = jest.fn();
    batchCommitMock = jest.fn().mockResolvedValue(undefined);

    firestoreInstance = {
      collection: jest.fn((path: string) => {
        if (path.endsWith('/transactions')) {
          return transactionsCollection;
        }
        if (path.endsWith('/csvProcessingStatus')) {
          return statusCollection;
        }
        return {};
      }),
      batch: jest.fn(() => ({
        delete: batchDeleteMock,
        commit: batchCommitMock,
      })),
    };

    (firestoreMock as jest.Mock).mockReturnValue(firestoreInstance);

    deleteFileMock = jest.fn().mockResolvedValue(undefined);
    bucketMock = {
      file: jest.fn(() => ({
        delete: deleteFileMock,
      })),
    };

    (storageMock as jest.Mock).mockReturnValue({
      bucket: jest.fn(() => bucketMock),
    });
  });

  it('throws when user is unauthenticated', async () => {
    await expect(
      invokeDelete({ fileName: 'statement.csv' }, { auth: null })
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('validates required fileName argument', async () => {
    await expect(
      invokeDelete({}, { auth: { uid: 'user-123' } })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('deletes transactions, storage file, and status docs', async () => {
    const result = await invokeDelete(
      { fileName: 'statement.csv', storagePath: 'users/user-123/statements/statement.csv' },
      { auth: { uid: 'user-123' } }
    );

    expect(transactionsCollection.where).toHaveBeenCalledWith('csvFileName', '==', 'statement.csv');
    expect(batchDeleteMock).toHaveBeenCalledTimes(2);
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
    expect(bucketMock.file).toHaveBeenCalledWith('users/user-123/statements/statement.csv');
    expect(deleteFileMock).toHaveBeenCalled();
    expect(statusCollection.doc).toHaveBeenCalledWith('statement.csv');
    expect(result).toEqual({
      success: true,
      deletedTransactions: 2,
      fileName: 'statement.csv',
    });
  });

  it('continues even if storage deletion fails', async () => {
    deleteFileMock.mockRejectedValueOnce(new Error('missing file'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await invokeDelete(
      { fileName: 'statement.csv', storagePath: 'users/user-123/statements/statement.csv' },
      { auth: { uid: 'user-123' } }
    );

    expect(deleteFileMock).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(result.success).toBe(true);

    warnSpy.mockRestore();
  });
});

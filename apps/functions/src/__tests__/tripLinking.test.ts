const onCallMock = jest.fn((handler: any) => handler);

class MockHttpsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const scheduleMock = jest.fn(() => ({ onRun: jest.fn() }));

jest.mock('firebase-functions/v1', () => ({
  https: {
    onCall: (handler: any) => onCallMock(handler),
    HttpsError: MockHttpsError,
  },
  pubsub: {
    schedule: scheduleMock,
  },
}));

const deleteSentinel = Symbol('delete');

const firestoreInstance: any = {
  collection: jest.fn(),
};

const firestoreMock: any = jest.fn(() => firestoreInstance);
firestoreMock.FieldValue = {
  delete: jest.fn(() => deleteSentinel),
};

jest.mock('firebase-admin', () => ({
  firestore: firestoreMock,
}));

import {
  linkTransactionToTrip,
  dismissTransactionTripSuggestion,
  __testables,
} from '../tripLinking';

const invokeLink = linkTransactionToTrip as unknown as (
  data: any,
  context: any
) => Promise<any>;
const invokeDismiss = dismissTransactionTripSuggestion as unknown as (
  data: any,
  context: any
) => Promise<any>;

const buildDocRef = (overrides: Partial<{ get: jest.Mock; update: jest.Mock }>) => ({
  get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ uid: 'user-123' }) }),
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('tripLinking callables', () => {
  let transactionsCollection: any;
  let tripsCollection: any;
  let transactionDoc: any;
  let tripDoc: any;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionDoc = buildDocRef({});
    tripDoc = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ name: 'Paris', destination: 'FR' }) }),
    };

    transactionsCollection = { doc: jest.fn(() => transactionDoc) };
    tripsCollection = { doc: jest.fn(() => tripDoc) };

    firestoreInstance.collection.mockImplementation((path: string) => {
      if (path === 'transactions') return transactionsCollection;
      if (path === 'users/user-123/trips') return tripsCollection;
      return { doc: jest.fn() };
    });
  });

  describe('linkTransactionToTrip', () => {
    it('requires authentication', async () => {
      await expect(
        invokeLink({ transactionId: 'txn', tripId: 'trip' }, { auth: null })
      ).rejects.toMatchObject({ code: 'unauthenticated' });
    });

    it('validates required params', async () => {
      await expect(
        invokeLink({ transactionId: 'txn' }, { auth: { uid: 'user-123' } })
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    it('throws if transaction missing', async () => {
      transactionDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(
        invokeLink({ transactionId: 'txn', tripId: 'trip' }, { auth: { uid: 'user-123' } })
      ).rejects.toMatchObject({ code: 'not-found' });
    });

    it('throws if transaction belongs to another user', async () => {
      transactionDoc.get.mockResolvedValueOnce({ exists: true, data: () => ({ uid: 'other' }) });
      await expect(
        invokeLink({ transactionId: 'txn', tripId: 'trip' }, { auth: { uid: 'user-123' } })
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });

    it('throws if trip missing', async () => {
      tripDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(
        invokeLink({ transactionId: 'txn', tripId: 'trip' }, { auth: { uid: 'user-123' } })
      ).rejects.toMatchObject({ code: 'not-found' });
    });

    it('updates transaction with linked trip metadata', async () => {
      const result = await invokeLink(
        { transactionId: 'txn', tripId: 'trip', reasoning: 'match', confidence: 0.9 },
        { auth: { uid: 'user-123' } }
      );

      expect(transactionDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tripLinkStatus: 'linked',
          tripLink: expect.objectContaining({ tripId: 'trip', method: 'manual' }),
          tripLinkSuggestion: deleteSentinel,
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('dismissTransactionTripSuggestion', () => {
    it('requires authentication', async () => {
      await expect(invokeDismiss({ transactionId: 'txn' }, { auth: null })).rejects.toMatchObject({
        code: 'unauthenticated',
      });
    });

    it('validates transactionId', async () => {
      await expect(invokeDismiss({}, { auth: { uid: 'user-123' } })).rejects.toMatchObject({
        code: 'invalid-argument',
      });
    });

    it('throws if transaction not found', async () => {
      transactionDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(
        invokeDismiss({ transactionId: 'missing' }, { auth: { uid: 'user-123' } })
      ).rejects.toMatchObject({ code: 'not-found' });
    });

    it('skips suggestion and clears metadata', async () => {
      const result = await invokeDismiss({ transactionId: 'txn' }, { auth: { uid: 'user-123' } });

      expect(transactionDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tripLinkStatus: 'skipped',
          tripLinkSuggestion: deleteSentinel,
        })
      );
      expect(result).toEqual({ success: true });
    });
  });
});

describe('tripLinking helpers', () => {
  const { extractJsonBlock, extractTextContent } = __testables;

  it('parses JSON inside fenced block', () => {
    const json = extractJsonBlock('```json\n{"results":[]}\n```');
    expect(json).toBe('{"results":[]}');
  });

  it('falls back to raw braces when no fence', () => {
    const json = extractJsonBlock('\n fluff {"foo":1} tail ');
    expect(json).toBe('{"foo":1}');
  });

  it('extracts text segments from message payload', () => {
    const text = extractTextContent({
      content: [
        { type: 'text', text: 'first' },
        { type: 'image', text: 'ignored' },
        { type: 'text', text: 'second' },
      ],
    });
    expect(text).toBe('first\nsecond');
  });
});

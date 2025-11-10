const firestoreDocumentMock = jest.fn(() => ({
  onCreate: jest.fn(),
}));
const onCallMock = jest.fn((handler: any) => handler);

class MockHttpsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

jest.mock('firebase-functions/v1', () => ({
  firestore: {
    document: () => firestoreDocumentMock(),
  },
  https: {
    onCall: (handler: any) => onCallMock(handler),
    HttpsError: MockHttpsError,
  },
}));

const firestoreInstanceMock = jest.fn(() => ({
  doc: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
  })),
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      update: jest.fn(),
    })),
  })),
  batch: jest.fn(),
}));

const firestoreFn = () => firestoreInstanceMock();
firestoreFn.FieldValue = {
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
};

jest.mock('firebase-admin', () => ({
  firestore: firestoreFn,
}));

jest.mock('../../../shared/toolSpecUtils', () => ({
  resolveToolSpecIds: jest.fn(() => ['tool-1']),
}));

jest.mock('../../../shared/toolSpecs', () => ({
  getToolSpecById: jest.fn(),
}));

jest.mock('../../../shared/subscription', () => ({
  evaluateAiEntitlement: jest.fn(),
  SUBSCRIPTION_STATUS_COLLECTION: 'subscriptionStatus',
  SUBSCRIPTION_STATUS_DOC_ID: 'status',
}));

jest.mock('../stripeBilling', () => ({
  incrementUsageStats: jest.fn(),
}));

jest.mock('../utils/contextGatherer', () => ({
  getProcessingContext: jest.fn(),
}));

jest.mock('../utils/openaiClient', () => ({
  callOpenAI: jest.fn(),
}));

jest.mock('../utils/actionProcessor', () => ({
  processActions: jest.fn(),
  buildThoughtUpdate: jest.fn(),
}));

import { __testables } from '../processThought';

const { getSubscriptionBlockMessage, normalizeSubscriptionSnapshot } = __testables;

describe('processThought helper exports', () => {
  it('provides user-friendly subscription block messages', () => {
    expect(getSubscriptionBlockMessage('inactive')).toContain('inactive');
    expect(getSubscriptionBlockMessage('disabled')).toContain('disabled');
    expect(getSubscriptionBlockMessage('exhausted')).toContain('used all');
    expect(getSubscriptionBlockMessage('tier-mismatch')).toContain('Focus Notebook Pro');
  });

  it('normalizes subscription snapshots with defaults', () => {
    const input: any = {
      tier: 'pro',
      status: 'active',
      entitlements: { ai: { limit: 10 } },
      currentPeriodEnd: 'date',
      cancelAtPeriodEnd: true,
      updatedAt: 'now',
      trialEndsAt: 'later',
    };

    const normalized = normalizeSubscriptionSnapshot(input, 'snapshot-id');

    expect(normalized).toEqual({
      id: 'snapshot-id',
      tier: 'pro',
      status: 'active',
      entitlements: { ai: { limit: 10 } },
      currentPeriodEnd: 'date',
      cancelAtPeriodEnd: true,
      updatedAt: 'now',
      trialEndsAt: 'later',
    });
  });

  it('fills missing snapshot fields with nulls', () => {
    const normalized = normalizeSubscriptionSnapshot({}, 'missing');

    expect(normalized).toEqual({
      id: 'missing',
      tier: null,
      status: null,
      entitlements: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: null,
      updatedAt: null,
      trialEndsAt: null,
    });
  });
});

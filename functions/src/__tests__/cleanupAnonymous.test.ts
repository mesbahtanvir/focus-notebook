process.env.ANONYMOUS_AI_OVERRIDE_KEY = 'ci-override-key';

const listUsersMock = jest.fn();
const deleteUserMock = jest.fn();
let sessionCollection: any;
let userDocRef: any;
let userDocMap: Record<string, any> = {};
let sessionDocMap: Record<string, any> = {};
let latestBatch: any;
let batches: any[] = [];

const firestoreInstance: any = {
  collection: jest.fn(() => sessionCollection),
  doc: jest.fn((path: string) => {
    const uid = path.replace('users/', '');
    return userDocMap[uid];
  }),
  batch: jest.fn(() => {
    latestBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    batches.push(latestBatch);
    return latestBatch;
  }),
  recursiveDelete: jest.fn(),
};

const firestoreMock: any = jest.fn(() => firestoreInstance);
(firestoreMock as any).Timestamp = {
  now: jest.fn(() => 'mock-timestamp'),
};

jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    listUsers: listUsersMock,
    deleteUser: deleteUserMock,
  })),
  firestore: firestoreMock,
}));

jest.mock('firebase-functions/v1', () => ({
  pubsub: {
    schedule: jest.fn(() => ({
      onRun: jest.fn(),
    })),
  },
}));

import { cleanupExpiredAnonymousUsersHandler, __private__ } from '../cleanupAnonymous';

const buildSessionDoc = (data: any = {}) => ({
  get: jest.fn(async () => ({
    data: () => data,
  })),
  set: jest.fn(async () => undefined),
  delete: jest.fn(async () => undefined),
});

const buildUserDoc = () => ({
  listCollections: jest.fn(async () => []),
  delete: jest.fn(async () => undefined),
});

const mockListUsersResponse = (users: any[], pageToken?: string) => {
  listUsersMock.mockResolvedValueOnce({ users, pageToken });
};

describe('cleanupExpiredAnonymousUsersHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestBatch = undefined;
    batches = [];
    sessionDocMap = {};
    userDocMap = {};
    sessionCollection = {
      doc: jest.fn((uid: string) => {
        if (!sessionDocMap[uid]) {
          sessionDocMap[uid] = buildSessionDoc();
        }
        return sessionDocMap[uid];
      }),
    };
    firestoreInstance.collection.mockReturnValue(sessionCollection);
  });

  it('deletes expired anonymous users and their data', async () => {
    const uid = 'anon-user';
    const expiresAt = { toMillis: jest.fn(() => Date.now() - 1) };
    sessionDocMap[uid] = buildSessionDoc({
      expiresAt,
      cleanupPending: true,
    });

    const userDoc = buildUserDoc();
    userDocMap[uid] = userDoc;
    firestoreInstance.doc.mockReturnValue(userDoc);
    firestoreInstance.recursiveDelete.mockResolvedValueOnce(undefined);

    mockListUsersResponse([
      {
        uid,
        providerData: [],
        metadata: { creationTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
      },
    ]);

    await cleanupExpiredAnonymousUsersHandler();

    const sessionDocInstance = sessionDocMap[uid];
    expect(sessionDocInstance.set).toHaveBeenCalledWith(
      {
        cleanupPending: true,
        status: 'deleting',
        updatedAt: 'mock-timestamp',
      },
      { merge: true }
    );
    expect(firestoreInstance.recursiveDelete).toHaveBeenCalledWith(userDoc);
    expect(sessionDocInstance.delete).toHaveBeenCalled();
    expect(deleteUserMock).toHaveBeenCalledWith(uid);
  });

  it('skips anonymous users carrying the override key', async () => {
    const uid = 'ci-anon';
    sessionDocMap[uid] = buildSessionDoc({
      ciOverrideKey: 'ci-override-key',
      expiresAt: { toMillis: jest.fn(() => Date.now() - 1000) },
    });

    userDocMap[uid] = buildUserDoc();
    firestoreInstance.doc.mockReturnValue(userDocMap[uid]);

    mockListUsersResponse([
      {
        uid,
        providerData: [],
        metadata: { creationTime: new Date().toISOString() },
      },
    ]);

    await cleanupExpiredAnonymousUsersHandler();

    expect(sessionDocMap[uid].set).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('skips non-anonymous users', async () => {
    mockListUsersResponse([
      {
        uid: 'regular-user',
        providerData: [{}],
        metadata: { creationTime: new Date().toISOString() },
      },
    ]);

    await cleanupExpiredAnonymousUsersHandler();

    expect(sessionCollection.doc).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('ignores active anonymous sessions that are not expired', async () => {
    const uid = 'active-anon';
    sessionDocMap[uid] = buildSessionDoc({
      expiresAt: { toMillis: jest.fn(() => Date.now() + 60_000) },
    });

    mockListUsersResponse([
      {
        uid,
        providerData: [],
        metadata: { creationTime: new Date().toISOString() },
      },
    ]);

    await cleanupExpiredAnonymousUsersHandler();

    expect(sessionDocMap[uid].set).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('continues cleanup when deleting session or auth records fails', async () => {
    const uid = 'flaky-anon';
    const sessionDoc = buildSessionDoc({ cleanupPending: true });
    sessionDoc.delete.mockRejectedValueOnce(new Error('session-delete-failed'));
    sessionDocMap[uid] = sessionDoc;

    const userDoc = buildUserDoc();
    userDocMap[uid] = userDoc;
    firestoreInstance.doc.mockReturnValue(userDoc);
    firestoreInstance.recursiveDelete.mockResolvedValueOnce(undefined);
    deleteUserMock.mockRejectedValueOnce(new Error('auth-delete-failed'));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockListUsersResponse([
      {
        uid,
        providerData: [],
        metadata: { creationTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
      },
    ]);

    await cleanupExpiredAnonymousUsersHandler();

    expect(sessionDoc.set).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete session document for'),
      expect.any(Error)
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete auth user'),
      expect.any(Error)
    );

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('__private__ helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestBatch = undefined;
    batches = [];
    sessionDocMap = {};
    sessionCollection = {
      doc: jest.fn((uid: string) => {
        if (!sessionDocMap[uid]) {
          sessionDocMap[uid] = buildSessionDoc();
        }
        return sessionDocMap[uid];
      }),
    };
    userDocRef = buildUserDoc();
    userDocMap = { 'anon-user': userDocRef };
    firestoreInstance.doc.mockImplementation((path: string) => {
      const uid = path.replace('users/', '');
      return userDocMap[uid];
    });
    firestoreInstance.collection.mockReturnValue(sessionCollection);
  });

  it('removes nested collections when recursive delete is unavailable', async () => {
    // Remove recursiveDelete so the fallback path is executed
    const originalRecursiveDelete = firestoreInstance.recursiveDelete;
    delete firestoreInstance.recursiveDelete;

    const nestedDocRef = {
      listCollections: jest.fn(async () => []),
    };

    const nestedCollection = {
      get: jest.fn(async () => ({
        empty: false,
        docs: [{ ref: nestedDocRef }],
      })),
    };

    const primaryDocRef = {
      listCollections: jest.fn(async () => [nestedCollection]),
    };

    const primaryCollection = {
      get: jest.fn(async () => ({
        empty: false,
        docs: [{ ref: primaryDocRef }],
      })),
    };

    userDocRef.listCollections.mockResolvedValue([primaryCollection]);

    await __private__.deleteUserData('anon-user');

    expect(batches[0].delete).toHaveBeenCalledWith(primaryDocRef);
    expect(batches[0].commit).toHaveBeenCalled();
    expect(batches[1].delete).toHaveBeenCalledWith(nestedDocRef);
    expect(batches[1].commit).toHaveBeenCalled();
    expect(primaryDocRef.listCollections).toHaveBeenCalled();
    expect(nestedCollection.get).toHaveBeenCalled();
    expect(userDocRef.delete).toHaveBeenCalled();

    firestoreInstance.recursiveDelete = originalRecursiveDelete;
  });

  it('falls back to manual deletion when recursive delete throws', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    firestoreInstance.recursiveDelete = jest.fn().mockRejectedValue(new Error('recursive-fail'));

    const emptyCollection = {
      get: jest.fn(async () => ({ empty: true, docs: [] })),
    };

    userDocRef.listCollections.mockResolvedValue([emptyCollection]);

    await __private__.deleteUserData('anon-user');

    expect(emptyCollection.get).toHaveBeenCalled();
    expect(userDocRef.delete).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Recursive delete failed for'),
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it('commits intermediate batches when hitting the chunk threshold', async () => {
    const docRefs = Array.from({ length: 400 }, () => ({
      ref: {
        listCollections: jest.fn(async () => []),
      },
    }));

    const heavyCollection = {
      get: jest.fn(async () => ({ empty: false, docs: docRefs })),
    };

    await __private__.deleteCollection(heavyCollection as any);

    expect(batches.length).toBeGreaterThan(1);
    expect(batches[0].commit).toHaveBeenCalledTimes(1);
  });
});

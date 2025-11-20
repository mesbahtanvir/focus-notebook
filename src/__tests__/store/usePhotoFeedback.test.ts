import { act } from "@testing-library/react";

jest.mock("@/lib/firebaseClient", () => ({
  auth: { currentUser: { uid: "user-123", isAnonymous: false } },
  db: {},
  storage: {},
  functionsClient: {},
}));

const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock("firebase/firestore", () => {
  class MockTimestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds = 0, nanoseconds = 0) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }

    toDate() {
      return new Date(this.seconds * 1000);
    }

    static fromDate(date: Date) {
      return new MockTimestamp(Math.floor(date.getTime() / 1000), 0);
    }
  }

  return {
    collection: jest.fn(() => "collection-ref"),
    doc: jest.fn((...segments: string[]) => ({ path: segments.join("/") })),
    query: jest.fn(() => "query-ref"),
    where: jest.fn(() => "where-ref"),
    orderBy: jest.fn(() => "order-ref"),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    Timestamp: MockTimestamp,
    updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
    deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
    increment: (val: number) => ({ __op: "increment", val }),
    arrayUnion: (...values: unknown[]) => values,
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  };
});

const mockUploadBytes = jest.fn();
const mockUploadBytesResumable = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockDeleteObject = jest.fn();
const mockHttpsCallable = jest.fn();

jest.mock("firebase/storage", () => ({
  ref: jest.fn((_storage, path) => ({ path })),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  uploadBytesResumable: (...args: unknown[]) => mockUploadBytesResumable(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

import { auth } from "@/lib/firebaseClient";
import { usePhotoFeedback } from "@/store/usePhotoFeedback";

describe("usePhotoFeedback gallery + session flow", () => {
  const resetStore = () => {
    usePhotoFeedback.setState({
      currentSession: null,
      results: [],
      isLoading: false,
      sessionsLoading: false,
      libraryLoading: false,
      error: null,
      userSessions: [],
      library: [],
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    (auth as { currentUser: any }).currentUser = { uid: "user-123", isAnonymous: false };
    mockGetDocs.mockResolvedValue({ docs: [] });

    mockUploadBytesResumable.mockImplementation((_ref, file: File) => {
      return {
        on: (_event: string, progress?: (snapshot: { bytesTransferred: number; totalBytes: number }) => void, error?: (err: Error) => void, complete?: () => void) => {
          progress?.({ bytesTransferred: file.size || 1, totalBytes: file.size || 1 });
          complete?.();
          return () => {};
        },
      };
    });

    mockHttpsCallable.mockImplementation(() => {
      return jest.fn(async ({ path }: { path: string }) => ({
        data: { url: `https://signed.example.com/${path}` },
      }));
    });

    mockGetDoc.mockResolvedValue({ exists: () => false });

    mockRunTransaction.mockImplementation(async (_db, updater: any) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ownerId: "user-123",
            photos: [
              { id: "winner", rating: 1200, wins: 0, losses: 0, totalVotes: 0 },
              { id: "loser", rating: 1200, wins: 0, losses: 0, totalVotes: 0 },
            ],
          }),
        }),
        update: jest.fn(),
      };
      return updater(transaction);
    });
  });

  it("uploads images to the gallery and tracks them in state", async () => {
    const file = new File(["A"], "gallery-photo.jpg", { type: "image/jpeg" });
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/gallery-photo.jpg");
    mockSetDoc.mockResolvedValue(undefined);

    await act(async () => {
      await usePhotoFeedback.getState().uploadToLibrary([file]);
    });

    expect(mockUploadBytesResumable).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [latest] = usePhotoFeedback.getState().library;
    expect(latest).toMatchObject({
      ownerId: "user-123",
      url: expect.stringContaining("https://signed.example.com/images/original"),
    });
  });

  it("creates sessions from gallery selections and stamps library ids", async () => {
    const galleryItem = {
      id: "lib-photo-1",
      ownerId: "user-123",
      url: "https://example.com/photo-1.jpg",
      storagePath: "users/user-123/photo-library/lib-photo-1",
      createdAt: new Date("2024-01-01").toISOString(),
    };
    usePhotoFeedback.setState({
      library: [galleryItem],
      userSessions: [],
    });
    mockSetDoc.mockResolvedValue(undefined);

    let sessionResult: { sessionId: string; secretKey: string } | undefined;
    await act(async () => {
      sessionResult = await usePhotoFeedback
        .getState()
        .createSessionFromLibrary(["lib-photo-1"], "Alex");
    });

    expect(sessionResult).toBeDefined();
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("photoBattles") }),
      expect.objectContaining({
        creatorName: "Alex",
        isPublic: false,
        linkExpiresAt: expect.any(String),
        linkHistory: [],
        photos: [
          expect.objectContaining({
            libraryId: "lib-photo-1",
            url: "https://example.com/photo-1.jpg",
            rating: 1200,
          }),
        ],
      })
    );
    expect(usePhotoFeedback.getState().userSessions[0].photos[0].libraryId).toBe("lib-photo-1");
  });

  it("renews link when no selection is provided", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: "user-123",
        ownerId: "user-123",
        creatorName: "Alex",
        photos: [],
        secretKey: "old-secret",
        linkExpiresAt: new Date("2024-01-01").toISOString(),
        linkHistory: [],
      }),
    });

    usePhotoFeedback.setState(state => ({
      ...state,
      library: [
        {
          id: "lib-photo-1",
          ownerId: "user-123",
          url: "https://example.com/photo-1.jpg",
          storagePath: "users/user-123/photo-library/lib-photo-1",
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    await act(async () => {
      await usePhotoFeedback.getState().createSessionFromLibrary([], "Alex");
    });

    const [refArg, payloadArg, optionsArg] = mockSetDoc.mock.calls.find(call => call[2]?.merge) || [];
    expect(refArg).toMatchObject({ path: expect.stringContaining("photoBattles") });
    expect(payloadArg).toMatchObject({
      secretKey: expect.any(String),
      linkExpiresAt: expect.any(String),
      linkHistory: expect.arrayContaining([
        expect.objectContaining({ secretKey: "old-secret" }),
      ]),
    });
    expect(optionsArg).toMatchObject({ merge: true });
  });

  it("loads gallery items from Firestore for the current user", async () => {
    const docData = {
      id: "lib-123",
      ownerId: "user-123",
      url: "https://example.com/loaded.jpg",
      storagePath: "users/user-123/photo-library/lib-123",
      createdAt: new Date("2024-02-02").toISOString(),
    };
    mockGetDocs.mockResolvedValue({
      docs: [{ data: () => docData }],
    });

    await act(async () => {
      const items = await usePhotoFeedback.getState().loadLibrary();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ id: "lib-123", url: "https://example.com/loaded.jpg" });
    });

    expect(usePhotoFeedback.getState().library[0]).toMatchObject({
      id: "lib-123",
      ownerId: "user-123",
    });
  });

  it("updates session visibility via setSessionPublic", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    usePhotoFeedback.setState(state => ({
      ...state,
      userSessions: [
        {
          id: "session-abc",
          ownerId: "user-123",
          creatorName: "Alex",
          photos: [],
          secretKey: "secret",
          createdAt: new Date().toISOString(),
          isPublic: false,
        },
      ],
    }));

    await act(async () => {
      await usePhotoFeedback.getState().setSessionPublic("session-abc", true);
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("photoBattles/session-abc") }),
      { isPublic: true }
    );
    expect(usePhotoFeedback.getState().userSessions[0].isPublic).toBe(true);
  });

  it("updates ratings via submitVote transactions", async () => {
    let capturedPayload: any = null;
    mockRunTransaction.mockImplementationOnce(async (_db, updater: any) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ownerId: "user-123",
            photos: [
              { id: "winner", rating: 1200, wins: 5, losses: 2, totalVotes: 7 },
              { id: "loser", rating: 1200, wins: 2, losses: 5, totalVotes: 7 },
            ],
          }),
        }),
        update: jest.fn((_, payload) => {
          capturedPayload = payload;
        }),
      };
      await updater(transaction);
    });

    await act(async () => {
      await usePhotoFeedback.getState().submitVote("user-123", "winner", "loser");
    });

    expect(capturedPayload).not.toBeNull();
    const winner = capturedPayload.photos.find((photo: any) => photo.id === "winner");
    const loser = capturedPayload.photos.find((photo: any) => photo.id === "loser");
    expect(winner.rating).toBeGreaterThan(1200);
    expect(winner.wins).toBe(6);
    expect(loser.rating).toBeLessThan(1200);
    expect(loser.losses).toBe(6);
  });

  it("returns sorted results for valid secret key", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        secretKey: "secret",
        photos: [
          { id: "b", url: "b.jpg", rating: 900, wins: 1, losses: 4, totalVotes: 5 },
          { id: "a", url: "a.jpg", rating: 1400, wins: 5, losses: 1, totalVotes: 6 },
        ],
      }),
    });

    let results: any;
    await act(async () => {
      results = await usePhotoFeedback.getState().loadResults("session-1", "secret");
    });

    expect(results[0].id).toBe("a");
    expect(usePhotoFeedback.getState().results[0].id).toBe("a");
  });

  it("deletes battle photos and cleans up linked resources", async () => {
    const buildPhoto = (id: string, libraryId: string) => ({
      id,
      url: `${id}.jpg`,
      storagePath: `images/original/${libraryId}.jpg`,
      libraryId,
      rating: 1200,
      wins: 0,
      losses: 0,
      totalVotes: 0,
    });
    const sessionPhotos = [buildPhoto("photo-1", "lib-1"), buildPhoto("photo-2", "lib-2")];

    usePhotoFeedback.setState(state => ({
      ...state,
      currentSession: {
        id: "session-1",
        ownerId: "user-123",
        creatorName: "Alex",
        photos: sessionPhotos.map(photo => ({ ...photo })),
        secretKey: "secret",
        createdAt: new Date().toISOString(),
      },
      results: sessionPhotos.map(photo => ({ ...photo })),
      userSessions: [
        {
          id: "session-1",
          ownerId: "user-123",
          creatorName: "Alex",
          photos: sessionPhotos.map(photo => ({ ...photo })),
          secretKey: "secret",
          createdAt: new Date().toISOString(),
        },
      ],
      library: sessionPhotos.map(photo => ({
        id: photo.libraryId!,
        ownerId: "user-123",
        url: photo.url,
        storagePath: photo.storagePath,
        createdAt: new Date().toISOString(),
      })),
    }));

    mockDeleteObject.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
    mockRunTransaction.mockImplementationOnce(async (_db, updater: any) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ownerId: "user-123",
            photos: sessionPhotos.map(photo => ({ ...photo })),
          }),
        }),
        update: jest.fn(),
      };
      await updater(transaction);
      expect(transaction.update).toHaveBeenCalled();
      const [, payload] = transaction.update.mock.calls[0];
      expect(payload.photos).toHaveLength(1);
      expect(payload.photos[0].id).toBe("photo-2");
    });

    await act(async () => {
      await usePhotoFeedback.getState().deleteSessionPhoto("session-1", "photo-1");
    });

    expect(mockDeleteObject).toHaveBeenCalledWith(expect.objectContaining({ path: "images/original/lib-1.jpg" }));
    expect(mockDeleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("users/user-123/photoLibrary/lib-1") })
    );

    const state = usePhotoFeedback.getState();
    expect(state.currentSession?.photos).toHaveLength(1);
    expect(state.results).toHaveLength(1);
    expect(state.userSessions[0].photos).toHaveLength(1);
    expect(state.library.find(photo => photo.id === "lib-1")).toBeUndefined();
  });

  it("throws when attempting to delete a photo from another user's session", async () => {
    mockRunTransaction.mockImplementationOnce(async (_db, updater: any) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ownerId: "other-user",
            photos: [{ id: "photo-1", rating: 1200, wins: 0, losses: 0, totalVotes: 0 }],
          }),
        }),
        update: jest.fn(),
      };
      await updater(transaction);
    });

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        usePhotoFeedback.getState().deleteSessionPhoto("session-1", "photo-1")
      ).rejects.toThrow("You do not have permission to update this session.");
    } finally {
      consoleErrorSpy.mockRestore();
    }

    expect(mockDeleteObject).not.toHaveBeenCalled();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  it("updates ratings via submitVote transactions", async () => {
    let updatedPayload: any = null;
    mockRunTransaction.mockImplementation(async (_db, updater: any) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            id: "session-1",
            ownerId: "user-123",
            photos: [
              { id: "winner", rating: 1200, wins: 2, losses: 1, totalVotes: 3 },
              { id: "loser", rating: 1200, wins: 1, losses: 2, totalVotes: 3 },
            ],
          }),
        }),
        update: jest.fn((_, payload) => {
          updatedPayload = payload;
        }),
      };
      await updater(transaction);
    });

    await act(async () => {
      await usePhotoFeedback.getState().submitVote("session-1", "winner", "loser");
    });

    expect(mockRunTransaction).toHaveBeenCalled();
    expect(updatedPayload).not.toBeNull();
    const winner = updatedPayload.photos.find((photo: any) => photo.id === "winner");
    const loser = updatedPayload.photos.find((photo: any) => photo.id === "loser");
    expect(winner.rating).toBeGreaterThan(1200);
    expect(loser.rating).toBeLessThan(1200);
    expect(winner.wins).toBe(3);
    expect(loser.losses).toBe(3);
  });

  it("returns sorted results for a valid secret key", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        secretKey: "abc",
        photos: [
          { id: "photo-a", url: "a.jpg", rating: 1400, wins: 4, losses: 1, totalVotes: 5 },
          { id: "photo-b", url: "b.jpg", rating: 1000, wins: 1, losses: 4, totalVotes: 5 },
        ],
      }),
    });

    let results: any;
    await act(async () => {
      results = await usePhotoFeedback.getState().loadResults("session-1", "abc");
    });

    expect(results[0].rating).toBeGreaterThan(results[1].rating);
    expect(usePhotoFeedback.getState().results[0].id).toBe("photo-a");
  });
});

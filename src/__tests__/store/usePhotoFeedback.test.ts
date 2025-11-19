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

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "collection-ref"),
  doc: jest.fn((...segments: string[]) => ({ path: segments.join("/") })),
  query: jest.fn(() => "query-ref"),
  where: jest.fn(() => "where-ref"),
  orderBy: jest.fn(() => "order-ref"),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  Timestamp: {
    fromDate: () => ({ seconds: 0, nanoseconds: 0 }),
  },
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  increment: (val: number) => ({ __op: "increment", val }),
  arrayUnion: (...values: unknown[]) => values,
}));

const mockUploadBytes = jest.fn();
const mockUploadBytesResumable = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockHttpsCallable = jest.fn();

jest.mock("firebase/storage", () => ({
  ref: jest.fn((_storage, path) => ({ path })),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  uploadBytesResumable: (...args: unknown[]) => mockUploadBytesResumable(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
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
      votes: [],
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
      expect.objectContaining({ path: expect.stringContaining("photoSessions") }),
      expect.objectContaining({
        creatorName: "Alex",
        isPublic: false,
        photos: [
          expect.objectContaining({
            libraryId: "lib-photo-1",
            url: "https://example.com/photo-1.jpg",
          }),
        ],
      })
    );
    expect(usePhotoFeedback.getState().userSessions[0].photos[0].libraryId).toBe("lib-photo-1");
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
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isPublic: false,
        },
      ],
    }));

    await act(async () => {
      await usePhotoFeedback.getState().setSessionPublic("session-abc", true);
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("photoSessions/session-abc") }),
      { isPublic: true }
    );
    expect(usePhotoFeedback.getState().userSessions[0].isPublic).toBe(true);
  });

  it("stores comments when submitting votes", async () => {
    mockSetDoc.mockResolvedValue(undefined);
    usePhotoFeedback.setState(state => ({
      ...state,
      currentSession: {
        id: "session-1",
        ownerId: "user-123",
        creatorName: "Alex",
        photos: [{ id: "photo-1", url: "https://example.com/photo.jpg", storagePath: "path/photo-1" }],
        secretKey: "secret",
        expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
        createdAt: new Date().toISOString(),
      },
    }));

    await act(async () => {
      await usePhotoFeedback.getState().submitVote("session-1", "photo-1", "yes", "voter-9", "Great smile!");
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("photoSessions/session-1/votes") }),
      expect.objectContaining({ comment: "Great smile!" })
    );
  });
});

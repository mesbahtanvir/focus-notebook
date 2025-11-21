import { useUploadQueue, resetUploadQueueForTests } from "../../../../mobile/upload/useUploadQueue";
import type { UploadJob } from "../../../../mobile/upload/types";

const buildJob = (overrides: Partial<UploadJob> = {}): UploadJob => ({
  id: `job-${Math.random().toString(36).slice(2, 8)}`,
  localUri: "file:///tmp/photo.jpg",
  storagePath: "images/original/user-1/photo.jpg",
  mimeType: "image/jpeg",
  status: "pending",
  attempts: 0,
  progress: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  nextRetryAt: null,
  metadata: { userId: "user-1" },
  ...overrides,
});

describe("useUploadQueue", () => {
  afterEach(() => {
    resetUploadQueueForTests();
  });

  it("returns the next pending job", () => {
    const job = buildJob();
    useUploadQueue.getState().enqueue(job);

    const next = useUploadQueue.getState().getNextJob();
    expect(next?.id).toBe(job.id);
  });

  it("applies exponential backoff on failures", () => {
    const job = buildJob({ attempts: 1, status: "failed", nextRetryAt: Date.now() + 10_000 });
    useUploadQueue.getState().enqueue(job);
    const now = Date.now();
    useUploadQueue.getState().markFailed(job.id, "network", 5_000);
    const updated = useUploadQueue.getState().jobs[job.id];
    expect(updated?.status).toBe("failed");
    expect(updated?.nextRetryAt).toBeGreaterThanOrEqual(now + 5_000);
  });
});

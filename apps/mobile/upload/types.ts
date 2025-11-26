export type UploadJobStatus = 'pending' | 'uploading' | 'paused' | 'failed' | 'completed';

export interface UploadJobMetadata {
  userId: string;
  sessionId?: string;
  visibility?: 'private' | 'shared';
  [key: string]: string | number | boolean | undefined;
}

export interface UploadJob {
  id: string;
  localUri: string;
  storagePath: string;
  thumbnailPath?: string;
  mimeType: string;
  status: UploadJobStatus;
  attempts: number;
  nextRetryAt?: number | null;
  error?: string | null;
  progress: number;
  createdAt: number;
  updatedAt: number;
  metadata?: UploadJobMetadata;
}

export interface UploadQueueState {
  jobs: Record<string, UploadJob>;
  order: string[];
  activeJobId: string | null;
  enqueue(job: UploadJob): void;
  remove(jobId: string): void;
  update(jobId: string, updates: Partial<UploadJob>): void;
  markCompleted(jobId: string): void;
  markFailed(jobId: string, error: string, retryInMs?: number): void;
  pause(jobId: string): void;
  resume(jobId: string): void;
  getNextJob(): UploadJob | null;
  setActiveJob(jobId: string | null): void;
  reset(): void;
}

export interface FileLoader {
  (job: UploadJob): Promise<Blob>;
}

export interface UploadManagerOptions {
  fileLoader?: FileLoader;
  retryDelaysMs?: number[];
  onJobComplete?: (job: UploadJob, downloadUrl: string) => Promise<void> | void;
  getSignedUrl?: (storagePath: string) => Promise<string>;
}

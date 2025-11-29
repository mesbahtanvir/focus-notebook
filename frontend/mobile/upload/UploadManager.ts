import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTask,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { useUploadQueue } from './useUploadQueue';
import type { FileLoader, UploadJob, UploadJobMetadata, UploadManagerOptions } from './types';

const DEFAULT_RETRY_DELAYS = [5_000, 15_000, 60_000, 5 * 60_000];

const defaultFileLoader: FileLoader = async job => {
  const response = await fetch(job.localUri);
  if (!response.ok) {
    throw new Error(`Unable to read local file (${response.status})`);
  }
  return response.blob();
};

export interface EnqueueUploadParams {
  localUri: string;
  storagePath: string;
  thumbnailPath?: string;
  mimeType: string;
  metadata: UploadJobMetadata;
}

export function enqueueUploadJob(params: EnqueueUploadParams) {
  const now = Date.now();
  const job: UploadJob = {
    id: `${params.metadata.userId}_${now}`,
    localUri: params.localUri,
    storagePath: params.storagePath,
    thumbnailPath: params.thumbnailPath,
    mimeType: params.mimeType,
    status: 'pending',
    attempts: 0,
    progress: 0,
    nextRetryAt: null,
    createdAt: now,
    updatedAt: now,
    metadata: params.metadata,
  };
  useUploadQueue.getState().enqueue(job);
  return job.id;
}

export class UploadManager {
  private processing = false;
  private unsubscribe?: () => void;
  private readonly retryDelays: number[];
  private readonly fileLoader: FileLoader;

  constructor(private readonly options: UploadManagerOptions = {}) {
    this.retryDelays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS;
    this.fileLoader = options.fileLoader ?? defaultFileLoader;
  }

  start() {
    if (this.unsubscribe) return;
    this.unsubscribe = useUploadQueue.subscribe(() => {
      void this.tick();
    });
    void this.tick();
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  private async tick() {
    if (this.processing) {
      return;
    }
    const nextJob = useUploadQueue.getState().getNextJob();
    if (!nextJob) return;
    this.processing = true;
    useUploadQueue.getState().setActiveJob(nextJob.id);
    await this.processJob(nextJob).catch(error => {
      console.error('Upload job failed', error);
    });
    this.processing = false;
    useUploadQueue.getState().setActiveJob(null);
    setTimeout(() => {
      void this.tick();
    }, 100);
  }

  private async processJob(job: UploadJob) {
    const queue = useUploadQueue.getState();
    queue.update(job.id, {
      status: 'uploading',
      attempts: job.attempts + 1,
      progress: 0,
      error: null,
      nextRetryAt: null,
    });

    try {
      const blob = await this.fileLoader(job);
      const storageRef = ref(getStorage(), job.storagePath);
      const metadata = {
        contentType: job.mimeType,
        customMetadata: {
          ...job.metadata,
          uploadedAt: new Date().toISOString(),
        },
      };

      const task = uploadBytesResumable(storageRef, blob, metadata);
      const snapshot = await this.monitorTask(job, task);

      queue.markCompleted(job.id);

      const downloadUrl = this.options.getSignedUrl
        ? await this.options.getSignedUrl(job.storagePath)
        : await getDownloadURL(snapshot.ref);

      if (this.options.onJobComplete) {
        await this.options.onJobComplete({ ...job, status: 'completed', progress: 1 }, downloadUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      const attempts = job.attempts + 1;
      const delay = this.retryDelays[Math.min(attempts - 1, this.retryDelays.length - 1)];
      queue.markFailed(job.id, message, delay);
    }
  }

  private monitorTask(job: UploadJob, task: UploadTask) {
    const queue = useUploadQueue.getState();
    return new Promise<UploadTaskSnapshot>((resolve, reject) => {
      const unsubscribe = task.on(
        'state_changed',
        snapshot => {
          const progress = snapshot.totalBytes > 0 ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
          queue.update(job.id, { progress });
        },
        error => {
          unsubscribe();
          reject(error);
        },
        () => {
          unsubscribe();
          resolve(task.snapshot);
        }
      );
    });
  }
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { queueStateStorage } from './queueStorage';
import type { UploadJob, UploadQueueState } from './types';

const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 5 * 60_000];

function nextRetryDelay(attempt: number, custom?: number[]) {
  const source = custom?.length ? custom : RETRY_DELAYS_MS;
  const index = Math.min(attempt, source.length - 1);
  return source[index];
}

export const useUploadQueue = create<UploadQueueState>()(
  persist(
    (set, get) => ({
      jobs: {},
      order: [],
      activeJobId: null,
      enqueue: (job: UploadJob) =>
        set(state => {
          if (state.jobs[job.id]) {
            return state;
          }
          return {
            ...state,
            jobs: { ...state.jobs, [job.id]: job },
            order: [...state.order, job.id],
          };
        }),
      remove: (jobId: string) =>
        set(state => {
          const { [jobId]: _removed, ...rest } = state.jobs;
          return {
            ...state,
            jobs: rest,
            order: state.order.filter(id => id !== jobId),
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
          };
        }),
      update: (jobId, updates) =>
        set(state => {
          const job = state.jobs[jobId];
          if (!job) return state;
          return {
            ...state,
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                ...updates,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      markCompleted: jobId =>
        set(state => {
          if (!state.jobs[jobId]) return state;
          return {
            ...state,
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...state.jobs[jobId],
                status: 'completed',
                progress: 1,
                updatedAt: Date.now(),
                nextRetryAt: null,
                error: null,
              },
            },
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
          };
        }),
      markFailed: (jobId, error, retryInMs) =>
        set(state => {
          const job = state.jobs[jobId];
          if (!job) return state;
          const delay = retryInMs ?? nextRetryDelay(job.attempts);
          return {
            ...state,
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                status: 'failed',
                error,
                nextRetryAt: Date.now() + delay,
                updatedAt: Date.now(),
              },
            },
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
          };
        }),
      pause: jobId =>
        set(state => {
          const job = state.jobs[jobId];
          if (!job) return state;
          return {
            ...state,
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                status: 'paused',
                updatedAt: Date.now(),
              },
            },
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
          };
        }),
      resume: jobId =>
        set(state => {
          const job = state.jobs[jobId];
          if (!job) return state;
          return {
            ...state,
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                status: 'pending',
                error: null,
                nextRetryAt: null,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      getNextJob: () => {
        const { order, jobs } = get();
        const now = Date.now();
        for (const id of order) {
          const job = jobs[id];
          if (!job) continue;
          if (job.status === 'pending') {
            return job;
          }
          if (job.status === 'failed' && job.nextRetryAt && job.nextRetryAt <= now) {
            return job;
          }
        }
        return null;
      },
      setActiveJob: jobId => set({ activeJobId: jobId }),
      reset: () => set({ jobs: {}, order: [], activeJobId: null }),
    }),
    {
      name: 'upload-queue-v1',
      storage: createJSONStorage(() => queueStateStorage),
      version: 1,
      partialize: state => ({
        jobs: state.jobs,
        order: state.order,
      }),
      onRehydrateStorage: () => state => {
        if (!state) return;
        state.activeJobId = null;
      },
    }
  )
);

export const resetUploadQueueForTests = () => {
  const { reset } = useUploadQueue.getState();
  reset();
};

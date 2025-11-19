import type { StateStorage } from 'zustand/middleware';

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let asyncStorage: AsyncStorageLike | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  asyncStorage = require('@react-native-async-storage/async-storage').default as AsyncStorageLike;
} catch {
  asyncStorage = null;
}

const memoryStore: Record<string, string> = {};

export const queueStateStorage: StateStorage = {
  getItem: async (name: string) => {
    if (asyncStorage) {
      return asyncStorage.getItem(name);
    }
    return memoryStore[name] ?? null;
  },
  setItem: async (name: string, value: string) => {
    if (asyncStorage) {
      await asyncStorage.setItem(name, value);
      return;
    }
    memoryStore[name] = value;
  },
  removeItem: async (name: string) => {
    if (asyncStorage) {
      await asyncStorage.removeItem(name);
      return;
    }
    delete memoryStore[name];
  },
};

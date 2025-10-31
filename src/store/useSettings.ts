import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIModel = 'gpt-3.5-turbo' | 'gpt-4-turbo-preview' | 'gpt-4o' | 'gpt-4o-mini';

export interface UserSettings {
  openaiApiKey?: string;
  theme?: 'light' | 'dark' | 'system';
  aiModel?: AIModel; // Default: gpt-4o (best overall)
}

type SettingsState = {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  clearApiKey: () => void;
  hasApiKey: () => boolean;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        theme: 'system',
        aiModel: 'gpt-4o', // Default to best overall ChatGPT model
      },

      updateSettings: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...updates,
          },
        }));
      },

      clearApiKey: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            openaiApiKey: undefined,
          },
        }));
      },

      hasApiKey: () => {
        const { settings } = get();
        return Boolean(settings.openaiApiKey && settings.openaiApiKey.trim().length > 0);
      },
    }),
    {
      name: 'user-settings',
    }
  )
);

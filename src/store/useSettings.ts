import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSettings {
  openaiApiKey?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
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
        notifications: true,
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

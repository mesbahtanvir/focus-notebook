import { renderHook, act } from '@testing-library/react';
import { useSettings, AIModel } from '@/store/useSettings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const resetStore = () => {
  useSettings.setState({
    settings: {
      theme: 'system',
      aiModel: 'gpt-4o',
    },
  });
  localStorage.clear();
};

describe('useSettings store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('should have default settings', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.settings.theme).toBe('system');
      expect(result.current.settings.aiModel).toBe('gpt-4o');
    });
  });

  describe('updateSettings', () => {
    it('should update theme to light', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      expect(result.current.settings.theme).toBe('light');
    });

    it('should update theme to dark', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ theme: 'dark' });
      });

      expect(result.current.settings.theme).toBe('dark');
    });

    it('should update theme to system', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ theme: 'system' });
      });

      expect(result.current.settings.theme).toBe('system');
    });

    it('should update aiModel to gpt-3.5-turbo', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ aiModel: 'gpt-3.5-turbo' });
      });

      expect(result.current.settings.aiModel).toBe('gpt-3.5-turbo');
    });

    it('should update aiModel to gpt-4-turbo-preview', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ aiModel: 'gpt-4-turbo-preview' });
      });

      expect(result.current.settings.aiModel).toBe('gpt-4-turbo-preview');
    });

    it('should update aiModel to gpt-4o', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ aiModel: 'gpt-4o' });
      });

      expect(result.current.settings.aiModel).toBe('gpt-4o');
    });

    it('should update aiModel to gpt-4o-mini', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ aiModel: 'gpt-4o-mini' });
      });

      expect(result.current.settings.aiModel).toBe('gpt-4o-mini');
    });

    it('should update both theme and aiModel together', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({
          theme: 'dark',
          aiModel: 'gpt-4o-mini',
        });
      });

      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.aiModel).toBe('gpt-4o-mini');
    });

    it('should preserve existing settings when updating partial settings', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      expect(result.current.settings.theme).toBe('light');
      expect(result.current.settings.aiModel).toBe('gpt-4o'); // Should remain unchanged

      act(() => {
        result.current.updateSettings({ aiModel: 'gpt-3.5-turbo' });
      });

      expect(result.current.settings.theme).toBe('light'); // Should remain unchanged
      expect(result.current.settings.aiModel).toBe('gpt-3.5-turbo');
    });

    it('should handle multiple sequential updates', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ theme: 'dark' });
      });
      expect(result.current.settings.theme).toBe('dark');

      act(() => {
        result.current.updateSettings({ aiModel: 'gpt-4-turbo-preview' });
      });
      expect(result.current.settings.aiModel).toBe('gpt-4-turbo-preview');

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });
      expect(result.current.settings.theme).toBe('light');
    });

    it('should persist settings across hook instances', () => {
      const { result: result1 } = renderHook(() => useSettings());

      act(() => {
        result1.current.updateSettings({
          theme: 'dark',
          aiModel: 'gpt-4o-mini',
        });
      });

      const { result: result2 } = renderHook(() => useSettings());
      expect(result2.current.settings.theme).toBe('dark');
      expect(result2.current.settings.aiModel).toBe('gpt-4o-mini');
    });
  });

  describe('theme variations', () => {
    it('should handle all theme options', () => {
      const { result } = renderHook(() => useSettings());
      const themes = ['light', 'dark', 'system'] as const;

      themes.forEach((theme) => {
        act(() => {
          result.current.updateSettings({ theme });
        });
        expect(result.current.settings.theme).toBe(theme);
      });
    });
  });

  describe('AI model variations', () => {
    it('should handle all AI model options', () => {
      const { result } = renderHook(() => useSettings());
      const models: AIModel[] = [
        'gpt-3.5-turbo',
        'gpt-4-turbo-preview',
        'gpt-4o',
        'gpt-4o-mini',
      ];

      models.forEach((model) => {
        act(() => {
          result.current.updateSettings({ aiModel: model });
        });
        expect(result.current.settings.aiModel).toBe(model);
      });
    });
  });
});

import { renderHook, act } from '@testing-library/react';
import { useCurrency } from '@/store/useCurrency';
import { DEFAULT_DISPLAY_CURRENCY } from '@/lib/utils/currency';

const resetStore = () => {
  useCurrency.setState({
    currency: DEFAULT_DISPLAY_CURRENCY,
  });
};

describe('useCurrency store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('should have default display currency', () => {
      const { result } = renderHook(() => useCurrency());

      expect(result.current.currency).toBe(DEFAULT_DISPLAY_CURRENCY);
    });
  });

  describe('setCurrency', () => {
    it('should update currency to USD', () => {
      const { result } = renderHook(() => useCurrency());

      act(() => {
        result.current.setCurrency('USD');
      });

      expect(result.current.currency).toBe('USD');
    });

    it('should update currency to EUR', () => {
      const { result } = renderHook(() => useCurrency());

      act(() => {
        result.current.setCurrency('EUR');
      });

      expect(result.current.currency).toBe('EUR');
    });

    it('should update currency to CAD', () => {
      const { result } = renderHook(() => useCurrency());

      act(() => {
        result.current.setCurrency('CAD');
      });

      expect(result.current.currency).toBe('CAD');
    });

    it('should update currency to GBP', () => {
      const { result } = renderHook(() => useCurrency());

      act(() => {
        result.current.setCurrency('GBP');
      });

      expect(result.current.currency).toBe('GBP');
    });

    it('should update currency to JPY', () => {
      const { result } = renderHook(() => useCurrency());

      act(() => {
        result.current.setCurrency('JPY');
      });

      expect(result.current.currency).toBe('JPY');
    });

    it('should update currency to AUD', () => {
      const { result } = renderHook(() => useCurrency());

      act(() => {
        result.current.setCurrency('AUD');
      });

      expect(result.current.currency).toBe('AUD');
    });

    it('should allow multiple currency changes', () => {
      const { result } = renderHook(() => useCurrency());

      act(() => {
        result.current.setCurrency('USD');
      });
      expect(result.current.currency).toBe('USD');

      act(() => {
        result.current.setCurrency('EUR');
      });
      expect(result.current.currency).toBe('EUR');

      act(() => {
        result.current.setCurrency('CAD');
      });
      expect(result.current.currency).toBe('CAD');
    });

    it('should persist currency across hook instances', () => {
      const { result: result1 } = renderHook(() => useCurrency());

      act(() => {
        result1.current.setCurrency('USD');
      });

      const { result: result2 } = renderHook(() => useCurrency());
      expect(result2.current.currency).toBe('USD');
    });
  });
});

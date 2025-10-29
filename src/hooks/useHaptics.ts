import { useState, useEffect } from 'react';

// Check if running in Capacitor environment
const isCapacitorAvailable = typeof window !== 'undefined' && (window as any).Capacitor;

// Lazy load haptics module
let Haptics: any = null;
if (isCapacitorAvailable) {
  import('@capacitor/haptics').then(module => {
    Haptics = module.Haptics;
  });
}

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

export function useHaptics() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Haptics) {
      setIsAvailable(true);
    }
  }, []);

  const impact = async (style: ImpactStyle = 'medium') => {
    if (!Haptics) return;
    
    try {
      switch (style) {
        case 'light':
          await Haptics.impact({ style: 'LIGHT' });
          break;
        case 'medium':
          await Haptics.impact({ style: 'MEDIUM' });
          break;
        case 'heavy':
          await Haptics.impact({ style: 'HEAVY' });
          break;
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  };

  const selection = async () => {
    if (!Haptics) return;
    
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  };

  const notification = async (type: NotificationType) => {
    if (!Haptics) return;
    
    try {
      switch (type) {
        case 'success':
          await Haptics.notification({ type: 'SUCCESS' });
          break;
        case 'warning':
          await Haptics.notification({ type: 'WARNING' });
          break;
        case 'error':
          await Haptics.notification({ type: 'ERROR' });
          break;
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  };

  const vibrate = async (duration = 50) => {
    if (!Haptics) return;
    
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  };

  return {
    isAvailable,
    impact,
    selection,
    notification,
    vibrate,
  };
}


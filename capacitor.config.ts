import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mesbah.personalnotebook',
  appName: 'Personal Notebook',
  webDir: 'frontend/web/out', // ✅ this should match your Next.js export folder
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true,
    scrollEnabled: true,
  },
};

export default config;

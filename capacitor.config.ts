import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mesbah.personalnotebook',
  appName: 'Personal Notebook',
  webDir: 'out', // ✅ this should match your Next.js export folder
};

export default config;

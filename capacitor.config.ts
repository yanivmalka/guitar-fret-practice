import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guitarfretpractice.app',
  appName: 'Guitar Fret Practice',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

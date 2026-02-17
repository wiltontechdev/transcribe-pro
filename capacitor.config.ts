import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.transcribepro.app',
  appName: 'Transcription Pro',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;

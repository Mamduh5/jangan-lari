import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mamduh5.janganlari',
  appName: 'Jangan Lari',
  webDir: 'dist',
  backgroundColor: '#0b1020',
  android: {
    backgroundColor: '#0b1020',
    webContentsDebuggingEnabled: true,
  },
};

export default config;

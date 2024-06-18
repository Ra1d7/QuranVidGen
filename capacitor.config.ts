import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'qurangen.pixelpigeon.com',
  appName: 'Quran Video Generator',
  webDir: 'dist/quran-vid-gen',
  server:{
    hostname:'127.0.0.1',
    cleartext:true,
    allowNavigation:['*']
  }
};

export default config;

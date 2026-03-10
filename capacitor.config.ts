import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rushhour.puzzle',
  appName: 'Rush Hour',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a0f00',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#1a0f00',
    },
  },
};

export default config;

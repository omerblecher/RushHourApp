import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.otis.brooke.rushhour.puzzle',
  appName: 'Rush Hour',
  webDir: 'dist',
  android: {
    backgroundColor: '#1a0f00',
  },
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

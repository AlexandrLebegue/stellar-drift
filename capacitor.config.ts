import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alexandrelebegue.stellardrift',
  appName: 'Stellar Drift',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#000000',
    zoomEnabled: false,
  },
};

export default config;

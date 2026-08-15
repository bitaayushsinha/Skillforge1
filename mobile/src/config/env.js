import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Default configuration for different environments
const getDefaultApiUrl = () => {
  // If explicitly set in app.json/expoConfig extra
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  // Check Expo manifest debuggerHost to automatically derive LAN IP during local development
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  // Fallback for Android emulator vs iOS simulator / Web
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getDefaultApiUrl();
export const APP_NAME = 'SkillForge LMS';

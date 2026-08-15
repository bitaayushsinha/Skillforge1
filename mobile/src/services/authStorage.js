import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'skillforge_jwt_token';
const USER_KEY = 'skillforge_user_data';

/**
 * Secure storage wrapper using Expo SecureStore for native platforms.
 * Falls back safely for web if needed during development testing.
 */
export const authStorage = {
  async getToken() {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token from SecureStore:', error);
      return null;
    }
  },

  async setToken(token) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(TOKEN_KEY, token);
        return;
      }
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token to SecureStore:', error);
    }
  },

  async removeToken() {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(TOKEN_KEY);
        return;
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token from SecureStore:', error);
    }
  },

  async getUser() {
    try {
      let userData = null;
      if (Platform.OS === 'web') {
        userData = localStorage.getItem(USER_KEY);
      } else {
        userData = await SecureStore.getItemAsync(USER_KEY);
      }
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user from SecureStore:', error);
      return null;
    }
  },

  async setUser(user) {
    try {
      const userStr = JSON.stringify(user);
      if (Platform.OS === 'web') {
        localStorage.setItem(USER_KEY, userStr);
        return;
      }
      await SecureStore.setItemAsync(USER_KEY, userStr);
    } catch (error) {
      console.error('Error saving user to SecureStore:', error);
    }
  },

  async removeUser() {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(USER_KEY);
        return;
      }
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error removing user from SecureStore:', error);
    }
  },

  async clearAll() {
    await this.removeToken();
    await this.removeUser();
  }
};
export default authStorage;

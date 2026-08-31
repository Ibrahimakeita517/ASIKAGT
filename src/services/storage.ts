import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import localforage from 'localforage';

// Configuration de localforage pour utiliser IndexedDB en priorité sur le Web
if (Platform.OS === 'web') {
  localforage.config({
    driver: localforage.INDEXEDDB,
    name: 'ASIKA_PWA',
    version: 1.0,
    storeName: 'asika_store',
    description: 'Stockage persistant pour ASIKA Offline-First'
  });
}

export const storage = {
  setItem: async (key: string, value: any) => {
    if (Platform.OS === 'web') {
      try {
        await localforage.setItem(key, value);
      } catch (err) {
        console.error("Erreur localforage setItem:", err);
      }
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    }
  },

  getItem: async (key: string): Promise<any | null> => {
    if (Platform.OS === 'web') {
      try {
        return await localforage.getItem(key);
      } catch (err) {
        console.error("Erreur localforage getItem:", err);
        return null;
      }
    } else {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  },

  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        await localforage.removeItem(key);
      } catch (err) {
        console.error("Erreur localforage removeItem:", err);
      }
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
};

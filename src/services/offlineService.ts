import { storage } from './storage';
import { Transaction, Product } from '../models/types';

const getKeys = (userId: string) => ({
  TRANSACTIONS: `@asika_${userId}_transactions`,
  PRODUCTS: `@asika_${userId}_products`,
  SYNC_QUEUE: `@asika_${userId}_sync_queue`
});

export interface SyncItem {
  id: string;
  type: 'ADD_TRANSACTION' | 'UPDATE_DEBT' | 'DELETE_TRANSACTION' | 'ADD_PRODUCT' | 'UPDATE_PRODUCT' | 'DECREMENT_STOCK';
  payload: any;
  timestamp: number;
}

export const offlineService = {
  // --- Stockage des données ---
  saveTransactions: async (userId: string, transactions: Transaction[]) => {
    const keys = getKeys(userId);
    await storage.setItem(keys.TRANSACTIONS, transactions);
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const keys = getKeys(userId);
    return await storage.getItem(keys.TRANSACTIONS) || [];
  },

  saveProducts: async (userId: string, products: Product[]) => {
    const keys = getKeys(userId);
    await storage.setItem(keys.PRODUCTS, products);
  },

  getProducts: async (userId: string): Promise<Product[]> => {
    const keys = getKeys(userId);
    return await storage.getItem(keys.PRODUCTS) || [];
  },

  // --- Gestion de la file de synchronisation ---
  addToSyncQueue: async (userId: string, item: Omit<SyncItem, 'timestamp'>) => {
    const keys = getKeys(userId);
    const queue = await offlineService.getSyncQueue(userId);
    const newItem: SyncItem = { ...item, timestamp: Date.now() };
    queue.push(newItem);
    await storage.setItem(keys.SYNC_QUEUE, queue);
  },

  getSyncQueue: async (userId: string): Promise<SyncItem[]> => {
    const keys = getKeys(userId);
    return await storage.getItem(keys.SYNC_QUEUE) || [];
  },

  removeFromSyncQueue: async (userId: string, id: string) => {
    const keys = getKeys(userId);
    const queue = await offlineService.getSyncQueue(userId);
    const filtered = queue.filter(item => item.id !== id);
    await storage.setItem(keys.SYNC_QUEUE, filtered);
  }
};

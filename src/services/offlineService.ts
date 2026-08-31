import { storage } from './storage';
import { Transaction, Product } from '../models/types';

const KEYS = {
  TRANSACTIONS: '@asika_offline_transactions',
  PRODUCTS: '@asika_offline_products',
  SYNC_QUEUE: '@asika_sync_queue'
};

export interface SyncItem {
  id: string;
  type: 'ADD_TRANSACTION' | 'UPDATE_DEBT' | 'DELETE_TRANSACTION' | 'ADD_PRODUCT' | 'UPDATE_PRODUCT' | 'DECREMENT_STOCK';
  payload: any;
  timestamp: number;
}

export const offlineService = {
  // --- Stockage des données ---
  saveTransactions: async (transactions: Transaction[]) => {
    await storage.setItem(KEYS.TRANSACTIONS, transactions);
  },

  getTransactions: async (): Promise<Transaction[]> => {
    return await storage.getItem(KEYS.TRANSACTIONS) || [];
  },

  saveProducts: async (products: Product[]) => {
    await storage.setItem(KEYS.PRODUCTS, products);
  },

  getProducts: async (): Promise<Product[]> => {
    return await storage.getItem(KEYS.PRODUCTS) || [];
  },

  // --- Gestion de la file de synchronisation ---
  addToSyncQueue: async (item: Omit<SyncItem, 'timestamp'>) => {
    const queue = await offlineService.getSyncQueue();
    const newItem: SyncItem = { ...item, timestamp: Date.now() };
    queue.push(newItem);
    await storage.setItem(KEYS.SYNC_QUEUE, queue);
  },

  getSyncQueue: async (): Promise<SyncItem[]> => {
    return await storage.getItem(KEYS.SYNC_QUEUE) || [];
  },

  removeFromSyncQueue: async (id: string) => {
    const queue = await offlineService.getSyncQueue();
    const filtered = queue.filter(item => item.id !== id);
    await storage.setItem(KEYS.SYNC_QUEUE, filtered);
  }
};

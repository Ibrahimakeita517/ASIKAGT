import { Transaction, FinancialSummary } from '../models/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { apiFetch } from '../services/supabase';
import { offlineService } from '../services/offlineService';

export const transactionService = {
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    if (!userId) return [];

    // 1. Retour local immédiat (Vitesse Pro)
    const localTransactions = await offlineService.getTransactions(userId);

    // 2. Mise à jour silencieuse depuis Laragon
    apiFetch(`get_transactions.php?user_id=${userId}`).then(({ data, error }) => {
      if (!error && data) {
        // Fusion intelligente : on garde les locaux non synchronisés
        offlineService.getSyncQueue(userId).then(queue => {
          const pendingIds = queue.map(q => q.payload?.id || q.payload?.transactionId);
          const localPending = localTransactions.filter(lt => pendingIds.includes(lt.id));

          // On évite les doublons si Laragon a déjà reçu les données
          const remoteOnly = data.filter((rt: any) => !localPending.find(lp => lp.id === rt.id));
          offlineService.saveTransactions(userId, [...localPending, ...remoteOnly]);
        });
      }
    }).catch(() => {});

    return localTransactions;
  },

  addTransaction: async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    const userId = transaction.userId;
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };

    // 1. Sauvegarde locale immédiate
    const localTransactions = await offlineService.getTransactions(userId);
    await offlineService.saveTransactions(userId, [newTransaction, ...localTransactions]);

    // 2. File de synchro
    await offlineService.addToSyncQueue(userId, {
      id: newTransaction.id,
      type: 'ADD_TRANSACTION',
      payload: newTransaction
    });

    // 3. Déclenchement synchro immédiat
    try {
      const { SyncManager } = require('../services/SyncManager');
      SyncManager.sync(userId);
    } catch (e) {}

    return newTransaction;
  },

  updateDebt: async (transactionId: string, paidAmount: number, userId: string) => {
    const localTransactions = await offlineService.getTransactions(userId);
    const index = localTransactions.findIndex(t => t.id === transactionId);

    if (index !== -1) {
      const trans = localTransactions[index];
      const newRemaining = Math.max(0, (trans.remainingAmount || 0) - paidAmount);

      localTransactions[index] = {
        ...trans,
        remainingAmount: newRemaining,
        status: newRemaining <= 0 ? 'paid' : 'partially_paid'
      };

      await offlineService.saveTransactions(userId, localTransactions);

      await offlineService.addToSyncQueue(userId, {
        id: uuidv4(),
        type: 'UPDATE_DEBT',
        payload: { transactionId, paidAmount }
      });

      try {
        const { SyncManager } = require('../services/SyncManager');
        SyncManager.sync(userId);
      } catch (e) {}
    }
  },

  getFinancialSummary: async (userId: string): Promise<FinancialSummary> => {
    const transactions = await offlineService.getTransactions(userId);
    let totalSales = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
      if (t.type === 'sale' || t.type === 'debt') totalSales += t.amount;
      else if (t.type === 'expense') totalExpenses += t.amount;
    });

    return {
      totalSales,
      totalExpenses,
      balance: totalSales - totalExpenses,
      periodLabel: "Global"
    };
  }
};

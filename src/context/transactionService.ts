import { Transaction, FinancialSummary } from '../models/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';
import { mapSupabaseTransactionToAppTransaction } from '../utils/supabaseMappers';
import { offlineService } from '../services/offlineService';

export const transactionService = {
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    if (!userId) return [];

    // 1. Retourner les données locales de CET utilisateur
    const localTransactions = await offlineService.getTransactions(userId);

    // Mise à jour réseau en arrière-plan
    (async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(100);

        if (!error && data) {
          const remoteTransactions = data.map(mapSupabaseTransactionToAppTransaction);

          // On protège les transactions locales non synchronisées
          const queue = await offlineService.getSyncQueue(userId);
          const pendingIds = queue.map(q => q.payload?.id || q.payload?.transactionId);

          // FUSION INTELLIGENTE :
          // 1. On prend tout ce qui est sur le serveur
          // 2. On ajoute ce qui est local et en attente de synchro (mais pas encore sur le serveur)
          const localPending = localTransactions.filter(lt => pendingIds.includes(lt.id) && !remoteTransactions.find(rt => rt.id === lt.id));
          const finalTransactions = [...localPending, ...remoteTransactions];

          await offlineService.saveTransactions(userId, finalTransactions);
        }
      } catch (e) {}
    })();

    return localTransactions;
  },

  addTransaction: async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    const userId = transaction.userId;
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };

    // 1. Sauvegarde locale isolée
    const localTransactions = await offlineService.getTransactions(userId);
    await offlineService.saveTransactions(userId, [newTransaction, ...localTransactions]);

    // 2. File de synchro isolée
    await offlineService.addToSyncQueue(userId, {
      id: newTransaction.id,
      type: 'ADD_TRANSACTION',
      payload: newTransaction
    });

    // 3. Synchro
    import('../services/SyncManager').then(({ SyncManager }) => {
      SyncManager.sync(userId);
    });

    return newTransaction;
  },

  updateDebt: async (transactionId: string, paidAmount: number, userId: string): Promise<Transaction | null> => {
    const localTransactions = await offlineService.getTransactions(userId);
    const index = localTransactions.findIndex(t => t.id === transactionId);

    if (index !== -1) {
      const current = localTransactions[index];
      const newRemaining = (current.remainingAmount || 0) - paidAmount;
      const updatedTransaction: Transaction = {
        ...current,
        remainingAmount: newRemaining > 0 ? newRemaining : 0,
        amount: current.amount + paidAmount,
        status: (newRemaining <= 0 ? 'paid' : 'partially_paid') as any
      };

      localTransactions[index] = updatedTransaction;
      await offlineService.saveTransactions(userId, localTransactions);

      await offlineService.addToSyncQueue(userId, {
        id: uuidv4(),
        type: 'UPDATE_DEBT',
        payload: { transactionId, paidAmount }
      });

      import('../services/SyncManager').then(({ SyncManager }) => {
        SyncManager.sync(userId);
      });

      return updatedTransaction;
    }
    return null;
  },

  deleteTransaction: async (transactionId: string, userId: string): Promise<void> => {
    const localTransactions = await offlineService.getTransactions(userId);
    const transactionToDelete = localTransactions.find(t => t.id === transactionId);

    const filtered = localTransactions.filter(t => t.id !== transactionId);
    await offlineService.saveTransactions(userId, filtered);

    // Restauration du stock local
    if (transactionToDelete?.productId && transactionToDelete?.quantity) {
      const products = await offlineService.getProducts(userId);
      const updatedProducts = products.map(p =>
        p.id === transactionToDelete.productId ? { ...p, quantity: p.quantity + (transactionToDelete.quantity || 0) } : p
      );
      await offlineService.saveProducts(userId, updatedProducts);
    }

    await offlineService.addToSyncQueue(userId, {
      id: uuidv4(),
      type: 'DELETE_TRANSACTION',
      payload: {
        transactionId,
        productId: transactionToDelete?.productId,
        quantity: transactionToDelete?.quantity
      }
    });

    import('../services/SyncManager').then(({ SyncManager }) => {
      SyncManager.sync(userId);
    });
  },

  getFinancialSummary: async (userId: string): Promise<FinancialSummary> => {
    const transactions = await offlineService.getTransactions(userId);
    let totalSales = 0, totalExpenses = 0;

    transactions.forEach(t => {
      if (t.type === 'sale' || t.type === 'debt') totalSales += t.amount;
      else if (t.type === 'expense') totalExpenses += t.amount;
    });

    return { totalSales, totalExpenses, balance: totalSales - totalExpenses, periodLabel: "Global" };
  },

  getDailyStats: async (userId: string, days: number = 7) => {
    const transactions = await offlineService.getTransactions(userId);
    const now = new Date();
    const stats: { [key: string]: { sales: number, expenses: number } } = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      stats[label] = { sales: 0, expenses: 0 };
    }

    transactions.forEach(t => {
      const dateLabel = new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      if (stats[dateLabel]) {
        if (t.type === 'sale' || t.type === 'debt') stats[dateLabel].sales += t.amount;
        else if (t.type === 'expense') stats[dateLabel].expenses += t.amount;
      }
    });

    return {
      labels: Object.keys(stats),
      sales: Object.values(stats).map(s => s.sales),
      expenses: Object.values(stats).map(s => s.expenses)
    };
  }
};

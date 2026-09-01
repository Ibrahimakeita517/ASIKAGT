import { Transaction, FinancialSummary } from '../models/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';
import { mapSupabaseTransactionToAppTransaction } from '../utils/supabaseMappers';
import { offlineService } from '../services/offlineService';

export const transactionService = {
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    try {
      // 1. Tenter de récupérer les dernières données depuis Supabase
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (!error && data) {
        const transactions = data.map(mapSupabaseTransactionToAppTransaction);
        // Sauvegarder en local pour le mode hors ligne futur
        await offlineService.saveTransactions(transactions);
        return transactions;
      }
    } catch (e) {
      console.log("Mode hors ligne : chargement des transactions locales");
    }

    // 2. Si échec (pas d'internet), retourner les données locales
    return await offlineService.getTransactions();
  },

  addTransaction: async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };

    // 1. Sauvegarde locale immédiate
    const localTransactions = await offlineService.getTransactions();
    await offlineService.saveTransactions([newTransaction, ...localTransactions]);

    // 2. Ajout à la file de synchronisation
    await offlineService.addToSyncQueue({
      id: newTransaction.id,
      type: 'ADD_TRANSACTION',
      payload: newTransaction
    });

    // 3. Déclenchement immédiat de la synchro en arrière-plan
    const { SyncManager } = require('../services/SyncManager');
    SyncManager.sync();

    return newTransaction;
  },

  // ... (Je vais implémenter le reste dans la suite)

  updateDebt: async (transactionId: string, paidAmount: number): Promise<void> => {
    // 1. Mise à jour locale immédiate
    const localTransactions = await offlineService.getTransactions();
    const transactionIndex = localTransactions.findIndex(t => t.id === transactionId);

    if (transactionIndex !== -1) {
      const current = localTransactions[transactionIndex];
      const newRemaining = (current.remainingAmount || 0) - paidAmount;
      const newStatus = newRemaining <= 0 ? 'paid' : 'partially_paid';

      localTransactions[transactionIndex] = {
        ...current,
        remainingAmount: newRemaining > 0 ? newRemaining : 0,
        amount: current.amount + paidAmount,
        status: newStatus as any
      };

      await offlineService.saveTransactions(localTransactions);

      // 2. Ajout à la file de synchronisation
      await offlineService.addToSyncQueue({
        id: uuidv4(),
        type: 'UPDATE_DEBT',
        payload: { transactionId, paidAmount }
      });
      SyncManager.sync();
    }
  },

  deleteTransaction: async (transactionId: string): Promise<void> => {
    // 1. Suppression locale immédiate
    const localTransactions = await offlineService.getTransactions();
    const filtered = localTransactions.filter(t => t.id !== transactionId);
    await offlineService.saveTransactions(filtered);

    // 2. Ajout à la file de synchronisation
    await offlineService.addToSyncQueue({
      id: uuidv4(),
      type: 'DELETE_TRANSACTION',
      payload: { transactionId }
    });

    // 3. Déclenchement immédiat de la synchro
    const { SyncManager } = require('../services/SyncManager');
    SyncManager.sync();
  },

  getFinancialSummary: async (userId: string): Promise<FinancialSummary> => {
    const transactions = await transactionService.getTransactions(userId);
    
    let totalSales = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
      if (t.type === 'sale' || t.type === 'debt') totalSales += t.amount;
      else if (t.type === 'expense') totalExpenses += t.amount;
    });

    const balance = totalSales - totalExpenses;

    return {
      totalSales,
      totalExpenses,
      balance,
      periodLabel: "Global"
    };
  },

  getDailyStats: async (userId: string, days: number = 7): Promise<{labels: string[], sales: number[], expenses: number[]}> => {
    const transactions = await transactionService.getTransactions(userId);
    const now = new Date();
    const stats: { [key: string]: { sales: number, expenses: number } } = {};

    // Initialiser les derniers X jours
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
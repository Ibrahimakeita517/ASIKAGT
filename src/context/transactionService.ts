import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, FinancialSummary, TransactionType } from '../models/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';
import { mapSupabaseTransactionToAppTransaction } from '../utils/supabaseMappers';

const TRANSACTIONS_KEY = '@asika_transactions';

export const transactionService = {
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false });
    if (error) throw error;
    // Map snake_case from Supabase to camelCase for our app's Transaction type
    return (data || []).map(mapSupabaseTransactionToAppTransaction);
  },

  addTransaction: async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: newTransaction.userId,
        type: newTransaction.type,
        amount: newTransaction.amount,
        description: newTransaction.description,
        category: newTransaction.category,
        date: newTransaction.date,
        created_at: newTransaction.createdAt,
        customer_name: newTransaction.customerName,
        customer_phone: newTransaction.customerPhone,
        total_amount: newTransaction.totalAmount,
        remaining_amount: newTransaction.remainingAmount,
        status: newTransaction.status,
      })
      .select()
      .single();
    if (error) throw error;
    return mapSupabaseTransactionToAppTransaction(data);
  },

  updateDebt: async (transactionId: string, paidAmount: number): Promise<void> => {
    // 1. Récupérer la transaction actuelle
    const { data: current, error: getError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (getError || !current) throw new Error("Dette introuvable");

    const newRemaining = current.remaining_amount - paidAmount;
    const newStatus = newRemaining <= 0 ? 'paid' : 'partially_paid';

    // 2. Mettre à jour dans Supabase
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        remaining_amount: newRemaining > 0 ? newRemaining : 0,
        amount: current.amount + paidAmount, // Le montant "encaissé" augmente
        status: newStatus
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;
  },

  deleteTransaction: async (transactionId: string): Promise<void> => {
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) throw error;
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
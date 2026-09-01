import { supabase } from '../services/supabase';
import { User, Message, Transaction } from '../models/types';
import { notificationService } from './notificationService';
import { mapSupabaseMessageToAppMessage, mapSupabaseTransactionToAppTransaction } from '../utils/supabaseMappers';

export interface GlobalStats {
  totalSales: number;
  totalMerchants: number;
  totalDebt: number;
  activeSubscriptions: number;
  expiringSoon: number;
  topMerchants: { name: string, amount: number }[];
}

export interface ActivityLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  targetName?: string;
  timestamp: string;
}

export const adminService = {
  sendMessage: async (messageData: { senderId: string, receiverId: string | 'all', content: string, type?: any }): Promise<void> => {
    const { senderId, receiverId, content, type = 'info' } = messageData;
    try {
      if (receiverId === 'all') {
        await notificationService.sendMessage(senderId, 'all', content, type);
      } else {
        await notificationService.sendMessage(senderId, receiverId, content, type);
      }

      // Log l'action
      await adminService.logActivity(senderId, `Envoi de message à ${receiverId}`);
    } catch (e) {
      console.log("Erreur envoi message admin (ignorée)");
    }
  },

  async getIncomingMessages(): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', 'admin')
        .order('sent_at', { ascending: false });

      if (error) {
        console.log("Erreur récupération messages Admin:", error);
        return [];
      }
      return (data || []).map(mapSupabaseMessageToAppMessage);
    } catch (e) {
      console.log("Exception récupération messages Admin:", e);
      return [];
    }
  },

  async getGlobalStats(): Promise<GlobalStats> {
    try {
      const { data: users, error: userError } = await supabase.from('users').select('*');
      const { data: transactions, error: transError } = await supabase.from('transactions').select('*');

      if (userError || transError) throw new Error("Erreur lors de la récupération des données globales");

      const merchants = (users || []).filter(u => u.role === 'proprietaire' || u.role === 'merchant');
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      let totalDebt = 0;
      let expiringSoon = 0;
      let activeSubscriptions = 0;

      merchants.forEach(u => {
        totalDebt += (u.debt || 0);
        const expiry = new Date(u.subscription_expiry);
        if (expiry > now) {
          activeSubscriptions++;
          if (expiry <= nextWeek) expiringSoon++;
        }
      });

      const merchantSales: { [key: string]: { name: string, amount: number } } = {};
      let totalSales = 0;

      (transactions || []).forEach(t => {
        const appT = mapSupabaseTransactionToAppTransaction(t);
        if (appT.type === 'sale' || appT.type === 'debt') {
          totalSales += appT.amount;
          if (!merchantSales[appT.userId]) {
            const user = merchants.find(m => m.id === appT.userId);
            merchantSales[appT.userId] = {
              name: user ? `${user.first_name} ${user.last_name}` : 'Inconnu',
              amount: 0
            };
          }
          merchantSales[appT.userId].amount += appT.amount;
        }
      });

      const topMerchants = Object.values(merchantSales)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        totalSales,
        totalMerchants: merchants.length,
        totalDebt,
        activeSubscriptions,
        expiringSoon,
        topMerchants
      };
    } catch (e) {
      console.error("Erreur getGlobalStats:", e);
      return {
        totalSales: 0,
        totalMerchants: 0,
        totalDebt: 0,
        activeSubscriptions: 0,
        expiringSoon: 0,
        topMerchants: []
      };
    }
  },

  async logActivity(adminId: string, action: string, targetId?: string, targetName?: string): Promise<void> {
    try {
      await supabase.from('activity_logs').insert([
        {
          admin_id: adminId,
          action,
          target_id: targetId,
          target_name: targetName,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (e) {
      console.log("Erreur logging activité:", e);
    }
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) return [];
      return (data || []).map(d => ({
        id: d.id,
        adminId: d.admin_id,
        action: d.action,
        targetId: d.target_id,
        targetName: d.target_name,
        timestamp: d.timestamp
      }));
    } catch (e) {
      return [];
    }
  }
};

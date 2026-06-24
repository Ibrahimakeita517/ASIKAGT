import { supabase } from '../services/supabase';
import { User, Message } from '../models/types';
import { notificationService } from './notificationService';
import { mapSupabaseMessageToAppMessage } from '../utils/supabaseMappers';

export const adminService = {
  sendMessage: async (messageData: { senderId: string, receiverId: string | 'all', content: string, type?: any }): Promise<void> => {
    const { senderId, receiverId, content, type = 'info' } = messageData;
    try {
      if (receiverId === 'all') {
        await notificationService.sendMessage(senderId, 'all', content, type);
      } else {
        await notificationService.sendMessage(senderId, receiverId, content, type);
      }
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
  }
};

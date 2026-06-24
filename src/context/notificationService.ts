import { supabase } from '../services/supabase';
import { Message } from '../models/types';
import { mapSupabaseMessageToAppMessage } from '../utils/supabaseMappers';

export const notificationService = {
  // Récupérer les messages sans JAMAIS bloquer l'application
  async getMessages(userId: string): Promise<Message[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`receiver_id.eq.${userId},receiver_id.eq.all,sender_id.eq.${userId}`)
        .order('sent_at', { ascending: false });

      if (error) {
        // On utilise log au lieu de error pour ne pas afficher l'écran rouge
        console.log("Note: Table messages non accessible actuellement.");
        return [];
      }
      return (data || []).map(mapSupabaseMessageToAppMessage);
    } catch (e) {
      return [];
    }
  },

  // Compter les messages sans faire de bruit
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .in('receiver_id', [userId, 'all']);

      if (error) return 0;
      return count || 0;
    } catch (e) {
      return 0;
    }
  },

  async markAsRead(messageId: string): Promise<void> {
    try {
      await supabase.from('messages').update({ is_read: true }).eq('id', messageId);
    } catch (e) {}
  },

  // Récupérer les messages destinés à l'admin
  async getAdminMessages(): Promise<Message[]> {
    try {
      // On cherche tout ce qui est adressé à 'admin' ou qui est de type support/reclamation
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or('receiver_id.eq.admin,type.eq.support,type.eq.reclamation')
        .order('sent_at', { ascending: false });

      if (error) {
        console.log("Erreur getAdminMessages:", error);
        return [];
      }
      return (data || []).map(mapSupabaseMessageToAppMessage);
    } catch (e) {
      return [];
    }
  },

  async sendMessage(senderId: string, receiverId: string | 'all' | 'admin', content: string, type: 'support' | 'info' | 'reclamation' = 'info'): Promise<boolean> {
    try {
      const { error } = await supabase.from('messages').insert([{
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        type,
        sent_at: new Date().toISOString(),
        is_read: false
      }]);
      return !error;
    } catch (e) {
      return false;
    }
  }
};

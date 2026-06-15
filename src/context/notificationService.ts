import { supabase } from '../services/supabase';
import { Message } from '../models/types';

export const notificationService = {
  // Récupérer les messages pour un utilisateur (reçus ou envoyés)
  async getMessages(userId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`receiverId.eq.${userId},receiverId.eq.all,senderId.eq.${userId}`)
      .order('sentAt', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  },

  // Récupérer tous les messages pour l'admin (reçus de n'importe qui)
  async getAdminMessages(): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('receiverId', 'admin')
        .order('sentAt', { ascending: false });

      if (error) {
        console.warn('Détail erreur Admin Messages:', error.message, error.details);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('Crash lors du fetch admin messages:', e);
      return [];
    }
  },

  // Marquer un message comme lu
  async markAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ isRead: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
    }
  },

  // Envoyer un message
  async sendMessage(senderId: string, receiverId: string | 'all' | 'admin', content: string, type: 'support' | 'info' | 'reclamation' = 'info'): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          senderId,
          receiverId,
          content,
          type,
          sentAt: new Date().toISOString(),
          isRead: false
        }
      ]);

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }
    return true;
  },

  // Compter les messages non lus pour un utilisateur
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('isRead', false)
        .in('receiverId', [userId, 'all']);

      if (error) {
        console.warn('Notification query error:', error.message);
        return 0;
      }
      return count || 0;
    } catch (e) {
      return 0;
    }
  },

  // Compter les messages non lus pour l'admin
  async getAdminUnreadCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiverId', 'admin')
        .eq('isRead', false);

      if (error) return 0;
      return count || 0;
    } catch (e) {
      return 0;
    }
  }
};

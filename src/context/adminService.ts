import { supabase } from '../services/supabase';
import { User, Message } from '../models/types';
import { notificationService } from './notificationService';

export const adminService = {
  // Envoyer un message (Broadcast ou individuel)
  sendMessage: async (messageData: { senderId: string, receiverId: string | 'all', content: string, type?: any }): Promise<void> => {
    const { senderId, receiverId, content, type = 'info' } = messageData;
    
    if (receiverId === 'all') {
      // Pour un broadcast, on peut soit créer une seule entrée avec receiverId = 'all'
      // Le notificationService.getMessages gère déjà le cas receiverId = 'all'
      await notificationService.sendMessage(senderId, 'all', content, type);
    } else {
      await notificationService.sendMessage(senderId, receiverId, content, type);
    }
  },

  // Récupérer toutes les réclamations et demandes de support
  async getIncomingMessages(): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('receiverId', 'admin')
      .order('sentAt', { ascending: false });

    if (error) {
      console.error('Error fetching incoming messages:', error);
      return [];
    }
    return data || [];
  }
};

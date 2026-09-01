import { supabase } from './supabase';

export const adminService = {
  sendMessage: async ({ senderId, receiverId, content }: { senderId: string, receiverId: string, content: string }): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: senderId,
          receiver_id: receiverId,
          content: content,
          sent_at: new Date().toISOString(),
          is_read: false,
          type: 'info'
        }
      ]);

    if (error) throw error;
  }
};

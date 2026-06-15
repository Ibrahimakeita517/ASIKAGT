import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AccountStatus } from '../models/types';
import { supabase } from '../services/supabase';
import { mapSupabaseUserToAppUser, mapAppUserToSupabaseInsert } from '../utils/supabaseMappers';

const USERS_KEY = '@asika_users';

export const authService = {
  getAllUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Erreur getAllUsers:', error.message);
      throw error;
    }
    return (data || []).map(mapSupabaseUserToAppUser);
  },

  saveUser: async (user: User): Promise<void> => {
    // Normaliser l'email en minuscules pour éviter les erreurs de connexion
    const normalizedUser = { ...user, email: user.email.toLowerCase() };
    const { error } = await supabase.from('users').upsert(mapAppUserToSupabaseInsert(normalizedUser));
    if (error) throw error;
  },

  findUserById: async (userId: string, retries = 3): Promise<User | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.warn(`Profil non trouvé (tentative ${i + 1}/${retries}) pour l'ID:`, userId);
            if (i < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s avant de réessayer
              continue;
            }
            return null;
          }
          throw error;
        }
        return data ? mapSupabaseUserToAppUser(data) : null;
      } catch (e) {
        console.error(`Erreur findUserById (tentative ${i + 1}):`, e);
        if (i === retries - 1) return null;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return null;
  },

  findUserByEmail: async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapSupabaseUserToAppUser(data) : null;
  },

  updateUserStatus: async (userId: string, status: AccountStatus): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ status: status })
      .eq('id', userId);
    if (error) throw error;
  },

  updateUserDebt: async (userId: string, amount: number): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ debt: amount })
      .eq('id', userId);
    if (error) throw error;
  },

  updateUserSubscription: async (userId: string, expiryDate: string): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ subscription_expiry: expiryDate })
      .eq('id', userId);
    if (error) throw error;
  }
};
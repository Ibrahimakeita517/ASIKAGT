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

  findUserById: async (userId: string, retries = 5): Promise<User | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[AuthService] Recherche profil tentative ${i + 1}/${retries} pour:`, userId);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.warn("[AuthService] Erreur Supabase:", error.message);
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
          return null;
        }
        return data ? mapSupabaseUserToAppUser(data) : null;
      } catch (e) {
        if (i === retries - 1) return null;
        await new Promise(resolve => setTimeout(resolve, 1500));
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
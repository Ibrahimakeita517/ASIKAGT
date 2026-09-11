import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AccountStatus } from '../models/types';
import { supabase } from '../services/supabase';
import { mapSupabaseUserToAppUser, mapAppUserToSupabaseInsert } from '../utils/supabaseMappers';

const USERS_KEY = '@asika_users';
const CURRENT_USER_KEY = '@asika_current_user';

export const authService = {
  // ... (autres méthodes)
  saveUser: async (user: User): Promise<void> => {
    const normalizedUser = { ...user, email: user.email.toLowerCase() };
    // Sauvegarde locale immédiate
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizedUser));

    try {
      const { error } = await supabase.from('users').upsert(mapAppUserToSupabaseInsert(normalizedUser));
      if (error) throw error;
    } catch (e) {
      console.log("Erreur sync profil (sera fait plus tard)");
    }
  },

  findUserById: async (userId: string, retries = 3): Promise<User | null> => {
    // 1. D'abord vérifier le cache local
    try {
      const localUser = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (localUser) {
        const parsed = JSON.parse(localUser);
        if (parsed.id === userId) return parsed;
      }
    } catch (e) {}

    // 2. Sinon chercher en ligne
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (data) {
          const user = mapSupabaseUserToAppUser(data);
          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
          return user;
        }
      } catch (e) {
        if (i === retries - 1) break;
        await new Promise(r => setTimeout(r, 1000));
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
  },

  updateUserPremium: async (userId: string, isPremium: boolean): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ is_premium: isPremium })
      .eq('id', userId);
    if (error) throw error;
  }
};
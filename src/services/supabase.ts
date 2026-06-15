import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT : Remplace 'TON_URL_SUPABASE_ICI' par l'URL qui se trouve dans ton dashboard Supabase
// Elle ressemble à https://xyz.supabase.co
const supabaseUrl = 'https://atjobutvfemziqjfttxu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0am9idXR2ZmVtemlxamZ0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjYwMzQsImV4cCI6MjA5NjQ0MjAzNH0.ynrV_2mXZuHY-D0eNFbY3SqIkl2R2sV5OFfYJjfRCM0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
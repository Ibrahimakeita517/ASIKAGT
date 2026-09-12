import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/**
 * Vérifie la connexion vers le serveur Laragon local.
 */
export const checkConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Test sur le ping.php de Laragon
    const response = await fetch('http://localhost/asika-api/ping.php', { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    return false;
  }
};

/**
 * Fonction universelle pour communiquer avec l'API Laragon.
 * Intègre un timeout et une gestion d'erreurs standardisée.
 */
export const apiFetch = async (endpoint: string, options: any = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes de timeout

  const baseUrl = 'http://localhost/asika-api/';

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || `Erreur HTTP: ${response.status}` };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return { data: null, error: error.name === 'AbortError' ? 'Timeout réseau' : error.message };
  }
};

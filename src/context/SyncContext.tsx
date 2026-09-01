import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { SyncManager } from '../services/SyncManager';
import { offlineService } from '../services/offlineService';
import { supabase } from '../services/supabase';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  deferredPrompt: any;
  installApp: () => void;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Fonction pour vérifier réellement si Supabase est joignable
  const checkRealConnection = async () => {
    if (Platform.OS === 'web' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    try {
      // On tente un micro-appel à Supabase pour vérifier le vrai accès internet
      const { error } = await supabase.from('users').select('id').limit(1);
      const online = !error || error.code !== 'PGRST301'; // PGRST301 est souvent lié à l'auth, mais indique que le serveur a répondu
      setIsOnline(true);
      return true;
    } catch (e) {
      setIsOnline(false);
      return false;
    }
  };

  useEffect(() => {
    const updatePendingCount = async () => {
      const queue = await offlineService.getSyncQueue();
      setPendingCount(queue.length);

      // AUTO-SYNC : Si on a des trucs en attente et qu'on est en ligne, on synchronise !
      if (queue.length > 0 && isOnline && !isSyncing) {
        syncNow();
      }
    };

    updatePendingCount();
    const interval = setInterval(async () => {
      await checkRealConnection();
      await updatePendingCount();
    }, 5000); // Vérifie toutes les 5 secondes

    if (Platform.OS === 'web') {
      const handleOnline = () => {
        setIsOnline(true);
        syncNow(); // Synchro immédiate quand le réseau revient
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      });

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
    return () => clearInterval(interval);
  }, [isOnline]); // On rajoute isOnline dans les dépendances pour réagir au changement

  const syncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await SyncManager.sync();
      const queue = await offlineService.getSyncQueue();
      setPendingCount(queue.length);
    } catch (e) {
      console.log("Echec synchro auto");
    } finally {
      setIsSyncing(false);
    }
  };

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingCount, deferredPrompt, installApp, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};

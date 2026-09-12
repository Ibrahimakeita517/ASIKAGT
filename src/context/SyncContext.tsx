import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { SyncManager } from '../services/SyncManager';
import { offlineService } from '../services/offlineService';
import { checkConnection } from '../services/supabase';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const checkRealConnection = async () => {
    if (Platform.OS === 'web' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    // On utilise maintenant le checkConnection qui pointe vers Laragon (ping.php)
    const online = await checkConnection();
    setIsOnline(online);
    return online;
  };

  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      return;
    }

    const updatePendingCount = async () => {
      const queue = await offlineService.getSyncQueue(user.id);
      setPendingCount(queue.length);

      if (queue.length > 0 && isOnline && !isSyncing) {
        syncNow();
      }
    };

    updatePendingCount();
    const interval = setInterval(async () => {
      await checkRealConnection();
      await updatePendingCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, isOnline]);

  const syncNow = async () => {
    if (isSyncing || !user) return;
    setIsSyncing(true);
    try {
      await SyncManager.sync(user.id);
      const queue = await offlineService.getSyncQueue(user.id);
      setPendingCount(queue.length);
    } catch (e) {
      console.log("Echec synchro auto");
    } finally {
      setIsSyncing(false);
    }
  };

  // ... reste du code (installApp, etc.)
  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
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

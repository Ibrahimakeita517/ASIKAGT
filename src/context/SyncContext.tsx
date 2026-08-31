import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { SyncManager } from '../services/SyncManager';
import { offlineService } from '../services/offlineService';

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

  useEffect(() => {
    const updatePendingCount = async () => {
      const queue = await offlineService.getSyncQueue();
      setPendingCount(queue.length);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    if (Platform.OS === 'web') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      });

      return () => {
        window.removeEventListener('online', () => {});
        window.removeEventListener('offline', () => {});
        window.removeEventListener('beforeinstallprompt', () => {});
        clearInterval(interval);
      };
    }
    return () => clearInterval(interval);
  }, []);

  const syncNow = async () => {
    setIsSyncing(true);
    await SyncManager.sync();
    const queue = await offlineService.getSyncQueue();
    setPendingCount(queue.length);
    setIsSyncing(false);
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

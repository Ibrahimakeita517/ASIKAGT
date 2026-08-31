import React, { useEffect, useState } from 'react';
import { LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/models/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { SyncManager } from './src/services/SyncManager';
import { SyncProvider } from './src/context/SyncContext';
import { ConnectivityBanner } from './src/components/common/ConnectivityBanner';

// Garder l'écran de démarrage visible pendant le chargement des ressources
SplashScreen.preventAutoHideAsync();

LogBox.ignoreAllLogs(true);

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pré-charger les ressources
        const images = [
          require('./assets/icon.png'),
          require('./assets/adaptive-icon.png'),
        ];
        await Promise.all(images.map(image => Asset.fromModule(image).downloadAsync()));

        // Tenter une première synchro au démarrage
        SyncManager.sync();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();

    // Ecouter le retour de connexion et enregistrer le Service Worker sur le Web
    if (Platform.OS === 'web') {
      // 1. Enregistrement du Service Worker Workbox
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/service-worker.js').then(reg => {
            console.log('ASIKA PWA: Service Worker enregistré.');
          }).catch(err => {
            console.error('ASIKA PWA: Échec SW:', err);
          });
        });
      }

      // 2. Gestion de la synchronisation
      const handleOnline = () => SyncManager.sync();
      window.addEventListener('online', handleOnline);
      const interval = setInterval(() => SyncManager.sync(), 30000);
      return () => {
        window.removeEventListener('online', handleOnline);
        clearInterval(interval);
      };
    }
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <SyncProvider>
            <ConnectivityBanner />
            <AppNavigator />
            <StatusBar style="auto" />
          </SyncProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

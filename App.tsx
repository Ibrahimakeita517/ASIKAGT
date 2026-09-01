import React, { useEffect, useState } from 'react';
import { LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/models/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { SyncManager } from './src/services/SyncManager';
import { SyncProvider } from './src/context/SyncContext';
import { ConnectivityBanner } from './src/components/common/ConnectivityBanner';
import * as Font from 'expo-font';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome,
  MaterialIcons
} from '@expo/vector-icons';

// Empêcher l'écran de démarrage de se cacher automatiquement
SplashScreen.preventAutoHideAsync();
LogBox.ignoreAllLogs(true);

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 1. Charger les polices d'icônes via expo-font
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
          ...FontAwesome.font,
          ...MaterialIcons.font,
        });

        // 2. Injection CSS Ultra-Robuste pour le Web (Correction Icônes Vercel)
        if (Platform.OS === 'web') {
          const styleId = 'expo-icons-fallback';
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.type = 'text/css';
            style.appendChild(document.createTextNode(`
              /* Aliases pour les différentes versions d'Expo Vector Icons */
              @font-face {
                font-family: 'Ionicons';
                src: url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/7.1.2/fonts/ionicons.ttf') format('truetype');
              }
              @font-face {
                font-family: 'ionicons';
                src: url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/7.1.2/fonts/ionicons.ttf') format('truetype');
              }
              @font-face {
                font-family: 'MaterialCommunityIcons';
                src: url('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/fonts/materialdesignicons-webfont.ttf') format('truetype');
              }
              @font-face {
                font-family: 'material-community';
                src: url('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/fonts/materialdesignicons-webfont.ttf') format('truetype');
              }
              @font-face {
                font-family: 'FontAwesome';
                src: url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.ttf') format('truetype');
              }
              @font-face {
                font-family: 'MaterialIcons';
                src: url('https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.ttf') format('truetype');
              }
              @font-face {
                font-family: 'material';
                src: url('https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.ttf') format('truetype');
              }

              /* Forcer l'affichage global */
              [data-expo-vector-icons], .ionicon, .material-community-icons, .fontawesome, .material-icons {
                font-family: inherit !important;
              }
            `));
            document.head.appendChild(style);
          }
        }

        // 3. Pré-charger les ressources images
        try {
          const images = [
            require('./assets/icon.png'),
            require('./assets/adaptive-icon.png'),
          ];
          await Promise.all(images.map(image => Asset.fromModule(image).downloadAsync()));
        } catch (err) {
          console.log("Assets non chargés:", err);
        }

        // 4. Initialiser la synchro
        SyncManager.sync();
      } catch (e) {
        console.warn('Erreur préparation:', e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();

    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
          console.error('ASIKA PWA: Échec SW:', err);
        });
      });
    }
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}

import React, { useEffect, useState } from 'react';
import { LogBox, Platform, View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/models/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
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

// Empêcher l'écran de démarrage de se cacher trop vite
SplashScreen.preventAutoHideAsync();

// Ignorer les avertissements mineurs qui polluent la console
LogBox.ignoreLogs(['shadow*', 'pointerEvents', 'ViewPropTypes']);

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Charger les polices sans bloquer si une échoue
        try {
          await Font.loadAsync({
            ...Ionicons.font,
            ...MaterialCommunityIcons.font,
            ...FontAwesome.font,
            ...MaterialIcons.font,
          });
        } catch (e) {
          console.warn("Certaines polices n'ont pas pu être chargées", e);
        }

        // Initialiser la synchro en arrière-plan
        SyncManager.sync().catch(err => console.log("Erreur synchro initiale:", err));
      } catch (e) {
        console.warn('Erreur préparation globale:', e);
      } finally {
        setAppIsReady(true);
        // Cacher le splash screen après un court délai pour laisser le temps au rendu
        setTimeout(async () => {
          await SplashScreen.hideAsync();
        }, 500);
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null; // Ou un écran de chargement très simple
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <GestureHandlerRootView style={styles.container}>
        <ThemeProvider>
          <AuthProvider>
            <SyncProvider>
              <View style={styles.content}>
                <ConnectivityBanner />
                <AppNavigator />
                <StatusBar style="auto" />
              </View>
            </SyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Sur le web, flex: 1 peut ne pas suffire si le parent n'a pas de hauteur
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: '100%',
  }
});

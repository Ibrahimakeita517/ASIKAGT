import React, { useEffect, useState } from 'react';
import { LogBox, Image, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/models/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';

// Garder l'écran de démarrage visible pendant le chargement des ressources
SplashScreen.preventAutoHideAsync();

LogBox.ignoreAllLogs(true);

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pré-charger les images pour qu'elles apparaissent instantanément
        const images = [
          require('./assets/icon.png'),
          require('./assets/adaptive-icon.png'),
        ];

        const cacheImages = images.map(image => {
          return Asset.fromModule(image).downloadAsync();
        });

        await Promise.all(cacheImages);
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { AdminNavigator } from './AdminNavigator';
import BlockedScreen from '../screens/blocked/BlockedScreen';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../models/ThemeContext';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const { user, isLoading, isAdmin, signOut } = useAuth() as any;
  const { colors } = useTheme();
  const [timedOut, setTimedOut] = React.useState(false);

  // Sécurité anti-blocage : si après 7 secondes on charge toujours sans utilisateur
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading && !user) {
      timer = setTimeout(() => {
        console.warn("AppNavigator: Temps de chargement trop long, déblocage forcé.");
        setTimedOut(true);
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [isLoading, user]);

  // Si on est bloqué trop longtemps, on propose de se déconnecter ou de réessayer
  if (timedOut && isLoading && !user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 20 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 20, textAlign: 'center' }}>
          Le chargement de votre profil prend plus de temps que prévu...
        </Text>
        <TouchableOpacity
          onPress={() => {
            setTimedOut(false);
            if (signOut) signOut();
          }}
          style={{ marginTop: 20, padding: 15, backgroundColor: colors.primary, borderRadius: 10 }}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // On ne bloque l'écran que SI on charge ET qu'on n'a pas encore d'utilisateur
  if (isLoading && !user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isExpired = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry) < new Date() : false;
  const isBlocked = user && (user.status === 'inactive' || isExpired) && !isAdmin;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="AuthStack" component={AuthNavigator} />
        ) : isBlocked ? (
          <Stack.Screen name="Blocked" component={BlockedScreen} />
        ) : isAdmin ? (
          <Stack.Screen name="AdminStack" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="MainStack" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

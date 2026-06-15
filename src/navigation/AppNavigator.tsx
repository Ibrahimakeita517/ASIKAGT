import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { AdminNavigator } from './AdminNavigator';
import BlockedScreen from '../screens/blocked/BlockedScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../models/ThemeContext';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const { user, isLoading, isAdmin } = useAuth();
  const { colors } = useTheme();

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

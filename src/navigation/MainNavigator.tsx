import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/main/HomeScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import StatsScreen from '../screens/main/StatsScreen';
import StockScreen from '../screens/main/StockScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationScreen from '../screens/main/NotificationScreen';
import { View, Platform } from 'react-native';
import { useTheme } from '../models/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export const MainNavigator = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Accueil"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // Adaptation dynamique pour Android et iOS (encoches et boutons système)
          height: Platform.OS === 'android' ? 75 + (insets.bottom > 0 ? insets.bottom : 10) : 85,
          paddingBottom: Platform.OS === 'android' ? (insets.bottom > 0 ? insets.bottom : 15) : 30,
          paddingTop: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Accueil') {
            iconName = focused ? 'home' : 'home-outline';
            return (
              <View style={{
                backgroundColor: focused ? colors.primary : colors.primary + '20',
                width: 58,
                height: 58,
                borderRadius: 29,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Platform.OS === 'android' ? 35 : 25, // Remonte le bouton central
                borderWidth: 4,
                borderColor: colors.surface,
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3
              }}>
                <Ionicons name={iconName} size={30} color={focused ? '#FFF' : colors.primary} />
              </View>
            );
          }

          if (route.name === 'Historique') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Stock') iconName = focused ? 'cube' : 'cube-outline';
          else if (route.name === 'Analyses') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'Paramètres') iconName = focused ? 'settings' : 'settings-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Analyses" component={StatsScreen} options={{ tabBarLabel: 'Analyses' }} />
      <Tab.Screen name="Stock" component={StockScreen} />
      <Tab.Screen name="Accueil" component={HomeScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="Historique" component={HistoryScreen} />
      <Tab.Screen name="Paramètres" component={SettingsScreen} />
      <Tab.Screen name="Notifications" component={NotificationScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
};
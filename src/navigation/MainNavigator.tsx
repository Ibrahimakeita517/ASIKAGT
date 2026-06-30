import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/main/HomeScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import StatsScreen from '../screens/main/StatsScreen';
import StockScreen from '../screens/main/StockScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationScreen from '../screens/main/NotificationScreen';
import { View } from 'react-native';
import { useTheme } from '../models/ThemeContext';

const Tab = createBottomTabNavigator();

export const MainNavigator = () => {
  const { colors } = useTheme();

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
          height: 60,
          paddingBottom: 8
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Accueil') {
            iconName = focused ? 'home' : 'home-outline';
            return (
              <View style={{
                backgroundColor: focused ? colors.primary : colors.primary + '20',
                width: 55,
                height: 55,
                borderRadius: 28,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                borderWidth: 4,
                borderColor: colors.surface,
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3
              }}>
                <Ionicons name={iconName} size={28} color={focused ? '#FFF' : colors.primary} />
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
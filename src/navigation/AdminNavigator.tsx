import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboard from '../screens/admin/AdminDashboard';
import MessagingScreen from '../screens/admin/MessagingScreen';
import AccountDetail from '../screens/admin/AccountDetail';
import SettingsScreen from '../screens/main/SettingsScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../models/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DashboardStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="AccountDetail" component={AccountDetail} />
    </Stack.Navigator>
  );
};

export const AdminNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Dashboard') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Messages') iconName = focused ? 'chatbox' : 'chatbox-outline';
          else if (route.name === 'Paramètres') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Messages" component={MessagingScreen} />
      <Tab.Screen name="Paramètres" component={SettingsScreen} />
    </Tab.Navigator>
  );
};
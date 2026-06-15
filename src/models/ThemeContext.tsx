import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeColors } from '../models/types';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const LIGHT_COLORS: ThemeColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  primary: '#1e3a8a', // Bleu marine assorti à votre nouveau logo
  secondary: '#10B981',
  danger: '#EF4444',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  card: '#FFFFFF',
};

const DARK_COLORS: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  primary: '#3B82F6', // On garde un bleu plus clair pour le mode sombre pour la lisibilité
  secondary: '#34D399',
  danger: '#F87171',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#334155',
  card: '#1E293B',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@asika_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          setMode(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme', error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newMode = mode === 'light' ? 'dark' : 'light';
      setMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme', error);
    }
  };

  const colors = mode === 'light' ? LIGHT_COLORS : DARK_COLORS;

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
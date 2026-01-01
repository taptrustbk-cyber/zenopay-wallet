import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    card: string;
    cardSecondary: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    success: string;
    error: string;
    icon: string;
  };
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardSecondary: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    primary: '#3B82F6',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
    icon: '#3B82F6',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#050B18',
    surface: '#0B1220',
    card: '#0B1A3A',
    cardSecondary: '#0B1220',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    primary: '#60A5FA',
    border: '#111827',
    success: '#34D399',
    error: '#F87171',
    icon: '#60A5FA',
  },
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_mode');
      if (saved === 'light' || saved === 'dark') {
        setThemeMode(saved);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    StatusBar.setBarStyle(newMode === 'dark' ? 'light-content' : 'dark-content');
    try {
      await AsyncStorage.setItem('theme_mode', newMode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    StatusBar.setBarStyle(mode === 'dark' ? 'light-content' : 'dark-content');
    try {
      await AsyncStorage.setItem('theme_mode', mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      StatusBar.setBarStyle(themeMode === 'dark' ? 'light-content' : 'dark-content');
    }
  }, [themeMode, isLoading]);

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  return {
    theme,
    themeMode,
    toggleTheme,
    setTheme,
    isLoading,
  };
});

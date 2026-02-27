import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar, Platform } from 'react-native';

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

    // ✅ extra useful tokens (optional)
    inputBg: string;
    green: string;
    greenSoft: string;
  };
}

// ✅ Light theme (white + green + black)
const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardSecondary: '#F5F6FA',
    text: '#111827',
    textSecondary: '#6B7280',
    primary: '#16A34A', // ✅ green as primary
    border: '#E5E7EB',
    success: '#16A34A',
    error: '#EF4444',
    icon: '#16A34A',

    inputBg: '#F3FBF6',
    green: '#16A34A',
    greenSoft: '#EAF7EF',
  },
};

// ✅ Dark theme (modern, readable)
const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0B1220',
    surface: '#0F1A2B',
    card: '#0F1A2B',
    cardSecondary: '#0B1220',
    text: '#E5E7EB',
    textSecondary: '#9CA3AF',
    primary: '#22C55E', // green
    border: '#1F2A3D',
    success: '#22C55E',
    error: '#F87171',
    icon: '#22C55E',

    inputBg: '#0F1A2B',
    green: '#22C55E',
    greenSoft: '#12301E',
  },
};

const STORAGE_KEY = 'theme_mode';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  const applyStatusBar = (mode: ThemeMode) => {
    // For Android, StatusBar.setBarStyle works but can be ignored on older versions.
    // Expo StatusBar in _layout will handle it too; this is extra safety.
    if (Platform.OS !== 'web') {
      StatusBar.setBarStyle(mode === 'dark' ? 'light-content' : 'dark-content');
    }
  };

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setThemeMode(saved);
        applyStatusBar(saved);
      } else {
        applyStatusBar('light');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      applyStatusBar('light');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    applyStatusBar(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    await setTheme(newMode);
  };

  useEffect(() => {
    if (!isLoading) applyStatusBar(themeMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeMode, isLoading]);

  const theme = useMemo(() => (themeMode === 'dark' ? darkTheme : lightTheme), [themeMode]);

  // ✅ used by _layout.tsx
  const scheme: 'light' | 'dark' = themeMode;

  return {
    theme,        // { mode, colors }
    themeMode,    // 'light' | 'dark'
    scheme,       // ✅ 'light' | 'dark' (for StatusBar)
    toggleTheme,  // toggle
    setTheme,     // setTheme('dark')
    isLoading,
  };
});

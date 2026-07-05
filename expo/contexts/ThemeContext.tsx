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

// ✅ Light theme (Scandinavian white + blue + gold)
const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardSecondary: '#F4F7FB',
    text: '#0F1B33',
    textSecondary: '#5B6B82',
    primary: '#0F2A5C', // ✅ Swedish bank blue as primary
    border: '#E3E8F0',
    success: '#1F8A4C',
    error: '#D4302A',
    icon: '#0F2A5C',

    inputBg: '#F4F7FB',
    green: '#1F8A4C',
    greenSoft: '#EAF5EE',
  },
};

// ✅ Dark theme (Scandinavian blue + gold, readable)
const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0B1A33',
    surface: '#112544',
    card: '#112544',
    cardSecondary: '#0B1A33',
    text: '#E8EEF6',
    textSecondary: '#9FB0C7',
    primary: '#C9A961', // muted gold accent
    border: '#1F3257',
    success: '#3FB27F',
    error: '#F87171',
    icon: '#C9A961',

    inputBg: '#112544',
    green: '#3FB27F',
    greenSoft: '#123023',
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

import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import ar from './locales/ar.json';
import ckb from './locales/ckb.json';
import kmr from './locales/kmr.json';

const STORAGE_KEY = 'language';
const SUPPORTED_LANGUAGES = ['en', 'ar', 'ckb', 'kmr'] as const;

type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function normalizeLanguage(locale?: string | null): AppLanguage {
  const value = String(locale || '')
    .trim()
    .toLowerCase()
    .replace('_', '-');

  if (!value) return 'en';

  if (value === 'en' || value.startsWith('en-')) return 'en';
  if (value === 'ar' || value.startsWith('ar-')) return 'ar';

  // fix old typo/support old saved value
  if (value === 'cbk' || value === 'ckb' || value.startsWith('ckb-')) return 'ckb';

  if (value === 'kmr' || value.startsWith('kmr-')) return 'kmr';

  return 'en';
}

const i18n = new I18n({
  en,
  ar,
  ckb,
  kmr,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = 'en';

export const loadStoredLanguage = async (): Promise<AppLanguage> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);

    if (stored) {
      const normalizedStored = normalizeLanguage(stored);
      i18n.locale = normalizedStored;

      if (stored !== normalizedStored) {
        await AsyncStorage.setItem(STORAGE_KEY, normalizedStored);
      }

      console.log('🌍 Loaded stored language:', normalizedStored);
      return normalizedStored;
    }

    const locales = Localization.getLocales?.() || [];
    const deviceLanguageCode = locales[0]?.languageCode || locales[0]?.languageTag || 'en';
    const normalizedDeviceLanguage = normalizeLanguage(deviceLanguageCode);

    i18n.locale = normalizedDeviceLanguage;
    await AsyncStorage.setItem(STORAGE_KEY, normalizedDeviceLanguage);

    console.log('🌍 Using device language:', normalizedDeviceLanguage);
    return normalizedDeviceLanguage;
  } catch (error) {
    console.error('Error loading language:', error);
    i18n.locale = 'en';
    return 'en';
  }
};

export const setLanguage = async (locale: string): Promise<AppLanguage> => {
  try {
    const normalizedLocale = normalizeLanguage(locale);
    i18n.locale = normalizedLocale;
    await AsyncStorage.setItem(STORAGE_KEY, normalizedLocale);

    console.log('🌍 Language changed to:', normalizedLocale);
    return normalizedLocale;
  } catch (error) {
    console.error('Error saving language:', error);
    const fallback = normalizeLanguage(i18n.locale);
    i18n.locale = fallback;
    return fallback;
  }
};

export const getCurrentLanguage = (): AppLanguage => {
  return normalizeLanguage(i18n.locale);
};

export const getSupportedLanguages = (): AppLanguage[] => {
  return [...SUPPORTED_LANGUAGES];
};

console.log('🌍 i18n initialized');

export default i18n;
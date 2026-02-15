import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import ar from './locales/ar.json';
import ckb from './locales/ckb.json';
import kmr from './locales/kmr.json';

const i18n = new I18n({
  en,
  ar,
  ckb,
  kmr,
});

i18n.locale = 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export const loadStoredLanguage = async () => {
  try {
    const stored = await AsyncStorage.getItem('language');
    if (stored) {
      i18n.locale = stored;
      console.log('🌍 Loaded language:', stored);
    } else {
      const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
      const supportedLocale = ['en', 'ar', 'ckb', 'kmr'].includes(deviceLocale) ? deviceLocale : 'en';
      i18n.locale = supportedLocale;
      console.log('🌍 Using device language:', supportedLocale);
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }
};

export const setLanguage = async (locale: string) => {
  try {
    i18n.locale = locale;
    await AsyncStorage.setItem('language', locale);
    console.log('🌍 Language changed to:', locale);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

export const getCurrentLanguage = () => i18n.locale;

console.log('🌍 i18n initialized');

export default i18n;

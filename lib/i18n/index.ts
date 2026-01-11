import i18n from 'i18n-js';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import ar from './locales/ar.json';
import ckb from './locales/ckb.json';

i18n.translations = {
  en,
  ar,
  ckb,
};

i18n.locale = Localization.locale.split('-')[0]; // en-US → en
i18n.fallbacks = true;

console.log('🌍 i18n locale:', i18n.locale);
console.log('🧩 market.topup =', i18n.t('market.topup'));

export default i18n;

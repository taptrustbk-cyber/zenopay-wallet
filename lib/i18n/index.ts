import i18n from 'i18n-js';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
// if you have others later:
// import ar from './locales/ar.json';
// import ku from './locales/ku.json';

i18n.translations = {
  en
  // ar,
  // ku
};

i18n.locale = Localization.locale.split('-')[0]; // "en-US" → "en"
i18n.fallbacks = true;

// DEBUG (temporary – helps confirm loading)
console.log('🌍 i18n locale:', i18n.locale);
console.log('🧩 market.topup =', i18n.t('market.topup'));

export default i18n;

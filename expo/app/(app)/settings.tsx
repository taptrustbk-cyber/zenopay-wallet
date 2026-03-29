import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  I18nManager,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';

export const options = { headerShown: false };

const UI = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  cardMuted: '#F3F7FD',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',

  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  red: '#EF4444',
  redSoft: '#FEECEC',
  overlay: 'rgba(15, 23, 42, 0.28)',
};

const SHADOWS = {
  card: {
    shadowColor: '#7DA8E6',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#8BA9D6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

function getText(value: any, fallback: string) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return fallback;

  const text = String(value).trim();
  const lower = text.toLowerCase();

  if (
    !text ||
    lower === '[object object]' ||
    lower.includes('missing translation') ||
    lower.includes('missing "') ||
    text.includes('[missing') ||
    text.includes('"')
  ) {
    return fallback;
  }

  return text;
}

function tSafe(key: string, fallback: string) {
  try {
    const value = i18n.t(key as any);
    if (value === key) return fallback;
    return getText(value, fallback);
  } catch {
    return fallback;
  }
}

function tOne(keys: string[], fallback: string) {
  for (const key of keys) {
    try {
      const value = i18n.t(key as any);
      const text = getText(value, '__INVALID__');
      if (text !== '__INVALID__' && text !== key) return text;
    } catch {}
  }
  return fallback;
}

export default function SettingsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const isRTL = I18nManager.isRTL;

  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const currentLanguageLabel = useMemo(() => {
    const lang = String(i18n.language || '').toLowerCase();

    if (lang === 'ar') return tSafe('common.languageArabic', 'العربية');
    if (lang === 'cbk' || lang === 'ckb') {
      return tSafe('common.languageSorani', 'کوردی سۆرانی');
    }
    if (lang === 'kmr') return tSafe('common.languageBadini', 'کوردی بادینی');

    return tSafe('common.languageEnglish', 'English');
  }, [showLanguageModal, pathname]);

  const changeLanguage = async (lang: 'en' | 'ar' | 'cbk' | 'kmr') => {
    try {
      await i18n.changeLanguage(lang);
      setShowLanguageModal(false);

      Alert.alert(
        tSafe('common.success', 'Success'),
        tOne(['settingsLanguageChanged', 'settings.languageChanged'], 'Language changed successfully')
      );
    } catch {
      Alert.alert(
        tSafe('common.error', 'Error'),
        tOne(
          ['settingsLanguageChangeFailed', 'settings.languageChangeFailed'],
          'Failed to change language'
        )
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      tOne(['logout', 'settings.logout'], 'Logout'),
      tOne(
        ['settingsLogoutConfirm', 'settings.logoutConfirm'],
        'Are you sure you want to logout?'
      ),
      [
        {
          text: tSafe('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: tOne(['logout', 'settings.logout'], 'Logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch {
              Alert.alert(
                tSafe('common.error', 'Error'),
                tSafe('common.somethingWentWrong', 'Something went wrong')
              );
            }
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      key: 'language',
      title: tOne(['language', 'settings.language', 'settingsLanguage'], 'Language'),
      subtitle: currentLanguageLabel,
      icon: 'language-outline' as const,
      onPress: () => setShowLanguageModal(true),
    },
    {
      key: 'security',
      title: tOne(['security', 'settings.security', 'security.title'], 'Security'),
      icon: 'lock-closed-outline' as const,
      onPress: () => router.push('/(app)/security' as any),
    },
    {
      key: 'privacy',
      title: tOne(
        ['privacyPolicy.title', 'privacyPolicy', 'privacyPolicyData.title'],
        'Privacy Policy'
      ),
      icon: 'document-text-outline' as const,
      onPress: () => router.push('/(app)/privacy-policy' as any),
    },
    {
      key: 'terms',
      title: tOne(['terms.headerTitle', 'terms.mainTitle', 'termsConditions'], 'Terms & Conditions'),
      icon: 'clipboard-outline' as const,
      onPress: () => router.push('/(app)/terms-conditions' as any),
    },
    {
      key: 'support',
      title: tOne(['support', 'settings.support'], 'Support'),
      icon: 'mail-outline' as const,
      onPress: () => router.push('/(app)/contact' as any),
    },
    {
      key: 'admin',
      title: tOne(['adminPanel', 'settings.adminPanel'], 'Admin Panel'),
      icon: 'shield-checkmark-outline' as const,
      onPress: () => router.push('/(app)/admin' as any),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.9}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color={UI.blueDark}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {tOne(['settings.title', 'settings'], 'Settings')}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {settingsItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.menuCard, isRTL && styles.menuCardRTL]}
            onPress={item.onPress}
            activeOpacity={0.92}
          >
            <View style={[styles.menuLeft, isRTL && styles.menuLeftRTL]}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={24} color={UI.blue} />
              </View>

              <View style={styles.titleWrap}>
                <Text style={[styles.menuTitle, isRTL && styles.textRTL]}>
                  {item.title}
                </Text>

                {'subtitle' in item && item.subtitle ? (
                  <Text style={[styles.menuSubtitle, isRTL && styles.textRTL]}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>

            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={24}
              color={UI.text2}
            />
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.logoutCard, isRTL && styles.menuCardRTL]}
          onPress={handleLogout}
          activeOpacity={0.92}
        >
          <View style={[styles.menuLeft, isRTL && styles.menuLeftRTL]}>
            <View style={[styles.iconWrap, styles.logoutIconWrap]}>
              <Ionicons name="log-out-outline" size={22} color={UI.red} />
            </View>

            <Text style={[styles.logoutText, isRTL && styles.textRTL]}>
              {tOne(['logout', 'settings.logout'], 'Logout')}
            </Text>
          </View>

          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={24}
            color={UI.text2}
          />
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLanguageModal(false)} />

        <View style={styles.languageSheet}>
          <View style={styles.sheetGrabber} />

          <Text style={styles.languageSheetTitle}>
            {tOne(['language', 'settings.language', 'settingsLanguage'], 'Language')}
          </Text>

          {[
            {
              key: 'en',
              label: tSafe('common.languageEnglish', 'English'),
            },
            {
              key: 'ar',
              label: tSafe('common.languageArabic', 'العربية'),
            },
            {
              key: 'cbk',
              label: tSafe('common.languageSorani', 'کوردی سۆرانی'),
            },
            {
              key: 'kmr',
              label: tSafe('common.languageBadini', 'کوردی بادینی'),
            },
          ].map((lang) => {
            const selected = String(i18n.language || '').toLowerCase() === lang.key;

            return (
              <TouchableOpacity
                key={lang.key}
                style={[styles.languageRow, selected && styles.languageRowActive]}
                activeOpacity={0.92}
                onPress={() => changeLanguage(lang.key as 'en' | 'ar' | 'cbk' | 'kmr')}
              >
                <View style={styles.languageRowLeft}>
                  <View style={[styles.languageIconCircle, selected && styles.languageIconCircleActive]}>
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={selected ? UI.blueDark : UI.blue}
                    />
                  </View>

                  <Text style={[styles.languageRowText, selected && styles.languageRowTextActive]}>
                    {lang.label}
                  </Text>
                </View>

                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={UI.blue} />
                ) : (
                  <View style={styles.languageRadio} />
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.9}
            onPress={() => setShowLanguageModal(false)}
          >
            <Text style={styles.cancelText}>
              {tSafe('common.cancel', 'Cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 14,
    backgroundColor: UI.bg,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: UI.text,
  },
  headerSpacer: {
    width: 46,
    height: 46,
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  menuCard: {
    backgroundColor: UI.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  menuCardRTL: {
    flexDirection: 'row-reverse',
  },

  menuLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  menuLeftRTL: {
    flexDirection: 'row-reverse',
  },

  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  titleWrap: {
    flex: 1,
    minWidth: 0,
  },

  menuTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },
  menuSubtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '800',
    color: UI.text2,
  },
  textRTL: {
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: UI.border,
    marginTop: 6,
    marginBottom: 16,
  },

  logoutCard: {
    backgroundColor: UI.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  logoutIconWrap: {
    backgroundColor: UI.redSoft,
  },
  logoutText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: '#D85B5B',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: UI.overlay,
  },

  languageSheet: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: UI.card,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    ...SHADOWS.card,
  },
  sheetGrabber: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D5DEEB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  languageSheetTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 10,
  },

  languageRow: {
    minHeight: 74,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageRowActive: {
    backgroundColor: '#F4F8FF',
    borderColor: '#BFD4FF',
  },
  languageRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  languageIconCircleActive: {
    backgroundColor: UI.blueSoft,
  },
  languageRowText: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
  },
  languageRowTextActive: {
    color: UI.blueDark,
  },
  languageRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CFD9E8',
  },

  cancelBtn: {
    height: 58,
    borderRadius: 20,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7FF',
    borderWidth: 1,
    borderColor: UI.border,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.blueDark,
  },
});
import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  I18nManager,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/lib/i18n';

export const options = { headerShown: false };

const UI = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',

  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',

  red: '#EF4444',
  redSoft: '#FEECEC',
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

/**
 * IMPORTANT:
 * Put your real links here.
 * If you already had old URLs in your previous settings file,
 * paste them here exactly.
 */
const SUPPORT_LINKS = {
  email: 'mailto:info@zenopay.bond',
  facebook: 'https://facebook.com/',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/',
};

function tSafe(key: string, fallback: string) {
  try {
    const value = i18n.t(key as any);

    if (
      value === null ||
      value === undefined ||
      typeof value === 'object' ||
      String(value).trim() === '' ||
      String(value) === key ||
      String(value).includes('[missing') ||
      String(value).includes('missing translation') ||
      String(value).includes(`"${key}"`)
    ) {
      return fallback;
    }

    return String(value);
  } catch {
    return fallback;
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const isRTL = I18nManager.isRTL;

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const currentLanguageLabel = useMemo(() => {
    const lang = String(i18n.language || '').toLowerCase();

    if (lang === 'ar') return tSafe('common.languageArabic', 'العربية');
    if (lang === 'cbk' || lang === 'ckb') {
      return tSafe('common.languageSorani', 'کوردی سۆرانی');
    }
    if (lang === 'kmr') return tSafe('common.languageBadini', 'کوردی بادینی');

    return tSafe('common.languageEnglish', 'English');
  }, []);

  const changeLanguage = async (lang: 'en' | 'ar' | 'cbk' | 'kmr') => {
    try {
      await i18n.changeLanguage(lang);
      setShowLanguageModal(false);

      Alert.alert(
        tSafe('common.success', 'Success'),
        tSafe('settingsLanguageChanged', 'Language changed successfully')
      );
    } catch {
      Alert.alert(
        tSafe('common.error', 'Error'),
        tSafe('settingsLanguageChangeFailed', 'Failed to change language')
      );
    }
  };

  const openSupportLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          tSafe('common.error', 'Error'),
          tSafe('settingsCannotOpenLink', 'Cannot open this link')
        );
        return;
      }

      await Linking.openURL(url);
      setShowSupportModal(false);
    } catch {
      Alert.alert(
        tSafe('common.error', 'Error'),
        tSafe('settingsOpenLinkFailed', 'Failed to open link')
      );
    }
  };

  const settingsItems = [
    {
      key: 'profile',
      title: tSafe('profile.title', 'Profile'),
      icon: 'person-outline' as const,
      onPress: () => router.push('/(app)/profile' as any),
    },
    {
      key: 'language',
      title: tSafe('language', 'Language'),
      subtitle: currentLanguageLabel,
      icon: 'language-outline' as const,
      onPress: () => setShowLanguageModal(true),
    },
    {
      key: 'security',
      title: tSafe('security', 'Security'),
      icon: 'lock-closed-outline' as const,
      onPress: () => router.push('/(app)/security' as any),
    },
    {
      key: 'privacy',
      title: tSafe('privacyPolicy.title', 'Privacy Policy'),
      icon: 'document-text-outline' as const,
      onPress: () => router.push('/(app)/privacy-policy' as any),
    },
    {
      key: 'terms',
      title: tSafe('terms.headerTitle', 'Terms & Conditions'),
      icon: 'clipboard-outline' as const,
      onPress: () => router.push('/(app)/terms-conditions' as any),
    },
    {
      key: 'support',
      title: tSafe('support', 'Support'),
      icon: 'mail-outline' as const,
      onPress: () => setShowSupportModal(true),
    },
    {
      key: 'admin',
      title: tSafe('adminPanel', 'Admin Panel'),
      icon: 'shield-checkmark-outline' as const,
      onPress: () => router.push('/(app)/admin' as any),
    },
  ];

  const supportItems = [
    {
      key: 'email',
      title: tSafe('settingsSupportEmail', 'Email Support'),
      subtitle: 'info@zenopay.bond',
      icon: 'mail-outline' as const,
      color: UI.blue,
      onPress: () => openSupportLink(SUPPORT_LINKS.email),
    },
    {
      key: 'facebook',
      title: tSafe('settingsSupportFacebook', 'Facebook'),
      subtitle: SUPPORT_LINKS.facebook,
      icon: 'logo-facebook' as const,
      color: '#1877F2',
      onPress: () => openSupportLink(SUPPORT_LINKS.facebook),
    },
    {
      key: 'instagram',
      title: tSafe('settingsSupportInstagram', 'Instagram'),
      subtitle: SUPPORT_LINKS.instagram,
      icon: 'logo-instagram' as const,
      color: '#E1306C',
      onPress: () => openSupportLink(SUPPORT_LINKS.instagram),
    },
    {
      key: 'tiktok',
      title: tSafe('settingsSupportTiktok', 'TikTok'),
      subtitle: SUPPORT_LINKS.tiktok,
      icon: 'logo-tiktok' as const,
      color: '#111111',
      onPress: () => openSupportLink(SUPPORT_LINKS.tiktok),
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      tSafe('logout', 'Logout'),
      tSafe('settingsLogoutConfirm', 'Are you sure you want to logout?'),
      [
        {
          text: tSafe('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: tSafe('logout', 'Logout'),
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.88}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color={UI.blueDark}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {tSafe('settings.title', tSafe('settings', 'Settings'))}
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
            activeOpacity={0.9}
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
          activeOpacity={0.9}
        >
          <View style={[styles.menuLeft, isRTL && styles.menuLeftRTL]}>
            <View style={[styles.iconWrap, styles.logoutIconWrap]}>
              <Ionicons name="log-out-outline" size={22} color={UI.red} />
            </View>

            <Text style={[styles.logoutText, isRTL && styles.textRTL]}>
              {tSafe('logout', 'Logout')}
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
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            {tSafe('language', 'Language')}
          </Text>

          <TouchableOpacity
            style={styles.sheetButton}
            activeOpacity={0.9}
            onPress={() => changeLanguage('en')}
          >
            <Ionicons name="globe-outline" size={18} color={UI.blueDark} />
            <Text style={styles.sheetButtonText}>
              {tSafe('common.languageEnglish', 'English')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetButton}
            activeOpacity={0.9}
            onPress={() => changeLanguage('ar')}
          >
            <Ionicons name="globe-outline" size={18} color={UI.blueDark} />
            <Text style={styles.sheetButtonText}>
              {tSafe('common.languageArabic', 'العربية')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetButton}
            activeOpacity={0.9}
            onPress={() => changeLanguage('cbk')}
          >
            <Ionicons name="globe-outline" size={18} color={UI.blueDark} />
            <Text style={styles.sheetButtonText}>
              {tSafe('common.languageSorani', 'کوردی سۆرانی')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetButton}
            activeOpacity={0.9}
            onPress={() => changeLanguage('kmr')}
          >
            <Ionicons name="globe-outline" size={18} color={UI.blueDark} />
            <Text style={styles.sheetButtonText}>
              {tSafe('common.languageBadini', 'کوردی بادینی')}
            </Text>
          </TouchableOpacity>

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

      <Modal
        visible={showSupportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSupportModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            {tSafe('support', 'Support')}
          </Text>

          {supportItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.sheetButtonLarge}
              activeOpacity={0.9}
              onPress={item.onPress}
            >
              <View style={[styles.supportIconCircle, { backgroundColor: '#F3F7FF' }]}>
                <Ionicons name={item.icon} size={19} color={item.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sheetButtonText}>{item.title}</Text>
                <Text style={styles.supportSubText} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={UI.text2}
              />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.9}
            onPress={() => setShowSupportModal(false)}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },
  headerSpacer: {
    width: 40,
    height: 40,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    minHeight: 92,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 92,
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
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  modalSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: UI.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    ...SHADOWS.card,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 10,
  },

  sheetButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginTop: 10,
    ...SHADOWS.soft,
  },

  sheetButtonLarge: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginTop: 10,
    ...SHADOWS.soft,
  },

  supportIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
  },

  supportSubText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
  },

  cancelBtn: {
    height: 52,
    borderRadius: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7FF',
    borderWidth: 1,
    borderColor: UI.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.blueDark,
  },
});
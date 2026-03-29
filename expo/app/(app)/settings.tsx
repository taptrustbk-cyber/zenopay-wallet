import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Modal,
  Pressable,
  I18nManager,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import i18n, { setLanguage, getCurrentLanguage } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';

const UI = {
  bg: '#EEF4FF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  border: '#D9E5F6',

  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',

  danger: '#DC2626',
  dangerSoft: '#FEECEC',
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

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'ckb', name: 'کوردی سۆرانی' },
  { code: 'kmr', name: 'کوردی بادینی' },
] as const;

const SUPPORT_LINKS = {
  email: 'mailto:info@zenopay.bond',
  facebook: 'https://www.facebook.com/share/16feV1MMSC/?mibextid=wwXIfr',
  instagram: 'https://www.instagram.com/zenopaywallet?igsh=czRlM2FsZXVxMmkw',
  tiktok: 'https://www.tiktok.com/@zenopaywallet?_r=1&_t=ZS-955lFybRHAg',
};

function normalizeLang(code?: string | null) {
  const lang = String(code || '').trim().toLowerCase();
  if (!lang) return 'en';
  if (lang === 'cbk') return 'ckb';
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ar')) return 'ar';
  if (lang.startsWith('ckb')) return 'ckb';
  if (lang.startsWith('kmr')) return 'kmr';
  return 'en';
}

function safeString(value: any, fallback: string) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return fallback;

  const text = String(value).trim();
  const lower = text.toLowerCase();

  if (
    !text ||
    text === '[object Object]' ||
    text === 'undefined' ||
    text === 'null' ||
    lower.includes('missing translation') ||
    lower.includes('[missing') ||
    lower.includes('missing "') ||
    lower.includes('object object')
  ) {
    return fallback;
  }

  return text;
}

function tSafe(key: string, fallback: string) {
  try {
    const value = i18n.t(key as any);
    if (String(value) === key) return fallback;
    return safeString(value, fallback);
  } catch {
    return fallback;
  }
}

function tOne(keys: string[], fallback: string) {
  for (const key of keys) {
    try {
      const value = i18n.t(key as any);
      const text = safeString(value, '__INVALID__');
      if (text !== '__INVALID__' && text !== key) {
        return text;
      }
    } catch {}
  }
  return fallback;
}

function getLanguageDisplayName(code: string) {
  const lang = normalizeLang(code);
  if (lang === 'ar') return 'العربية';
  if (lang === 'ckb') return 'کوردی سۆرانی';
  if (lang === 'kmr') return 'کوردی بادینی';
  return 'English';
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  const [showLanguages, setShowLanguages] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [, forceUpdate] = useState({});
  const [logoutOpen, setLogoutOpen] = useState(false);

  const isAdmin = !!(user && ADMIN_EMAILS.includes(user.email || ''));

  useEffect(() => {
    const current = normalizeLang(getCurrentLanguage());
    setSelectedLanguage(current);
  }, []);

  const currentLanguageName = useMemo(() => {
    return getLanguageDisplayName(selectedLanguage);
  }, [selectedLanguage]);

  const handleLanguageSelect = async (code: string) => {
    try {
      const normalized = normalizeLang(code);

      await setLanguage(normalized);
      i18n.locale = normalized;

      setSelectedLanguage(normalized);
      forceUpdate({});
      setShowLanguages(false);
    } catch (error) {
      console.error('Language change error:', error);
    }
  };

  const handleLogout = () => {
    setLogoutOpen(true);
  };

  const supportItems = [
    {
      id: 'email',
      label: tOne(['settingsSupportEmail', 'support.email', 'supportEmail'], 'Email Support'),
      icon: 'mail' as const,
      url: SUPPORT_LINKS.email,
      color: UI.blueSoft,
      iconColor: UI.blue,
    },
    {
      id: 'facebook',
      label: tOne(['settingsSupportFacebook', 'support.facebook', 'supportFacebook'], 'Facebook'),
      icon: 'logo-facebook' as const,
      url: SUPPORT_LINKS.facebook,
      color: UI.blueSoft,
      iconColor: UI.blue,
    },
    {
      id: 'instagram',
      label: tOne(
        ['settingsSupportInstagram', 'support.instagram', 'supportInstagram'],
        'Instagram'
      ),
      icon: 'logo-instagram' as const,
      url: SUPPORT_LINKS.instagram,
      color: UI.blueSoft,
      iconColor: UI.blue,
    },
    {
      id: 'tiktok',
      label: tOne(['settingsSupportTiktok', 'support.tiktok', 'supportTiktok'], 'TikTok'),
      icon: 'logo-tiktok' as const,
      url: SUPPORT_LINKS.tiktok,
      color: UI.blueSoft,
      iconColor: UI.blue,
    },
  ];

  const handleSupportItemPress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          tSafe('common.error', 'Error'),
          tOne(
            ['settingsCannotOpenLink', 'settings.cannotOpenLink', 'cannotOpenLink'],
            'Cannot open this link'
          )
        );
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(
        tSafe('common.error', 'Error'),
        tOne(
          ['settingsOpenLinkFailed', 'settings.openLinkFailed', 'failedToOpenLink'],
          'Failed to open link'
        )
      );
    }
  };

  const settingsTitle = tOne(['settings.title', 'settings'], 'Settings');
  const profileTitle = tOne(['profile.title', 'profile'], 'Profile');
  const languageTitle = tOne(['language', 'settings.language'], 'Language');
  const securityTitle = tOne(['security', 'settings.security', 'securityPage.title'], 'Security');
  const privacyTitle = tOne(
    ['privacyPolicy.title', 'privacyPolicyData.title', 'privacyPolicy'],
    'Privacy Policy'
  );
  const termsTitle = tOne(
    ['terms.headerTitle', 'terms.mainTitle', 'termsConditions'],
    'Terms & Conditions'
  );
  const supportTitle = tOne(['support', 'settings.support'], 'Support');
  const adminTitle = tOne(['adminPanel', 'settings.adminPanel'], 'Admin Panel');
  const logoutTitle = tOne(['logout', 'settings.logout'], 'Logout');

  if (showSupport) {
    return (
      <View style={[styles.container, { backgroundColor: UI.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.subHeader, { borderBottomColor: UI.border, backgroundColor: UI.bg }]}>
          <TouchableOpacity onPress={() => setShowSupport(false)} style={styles.backButton}>
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={22}
              color={UI.text}
            />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: UI.text }]}>{supportTitle}</Text>

          <View style={{ width: 42 }} />
        </View>

        <ScrollView style={styles.supportList} contentContainerStyle={{ paddingBottom: 24 }}>
          {supportItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.supportItem, { backgroundColor: UI.card, borderColor: UI.border }]}
              onPress={() => handleSupportItemPress(item.url)}
              activeOpacity={0.9}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={22} color={item.iconColor} />
              </View>

              <Text style={[styles.supportItemText, { color: UI.text }]}>{item.label}</Text>

              <Ionicons
                name={isRTL ? 'chevron-back' : 'open-outline'}
                size={20}
                color={UI.text2}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (showLanguages) {
    return (
      <View style={[styles.container, { backgroundColor: UI.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.subHeader, { borderBottomColor: UI.border, backgroundColor: UI.bg }]}>
          <TouchableOpacity onPress={() => setShowLanguages(false)} style={styles.backButton}>
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={22}
              color={UI.text}
            />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: UI.text }]}>{languageTitle}</Text>

          <View style={{ width: 42 }} />
        </View>

        <ScrollView style={styles.languageList} contentContainerStyle={{ paddingBottom: 24 }}>
          {LANGUAGES.map((language) => {
            const active = normalizeLang(selectedLanguage) === normalizeLang(language.code);

            return (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageItem,
                  { backgroundColor: UI.card, borderColor: UI.border },
                  active && styles.languageItemActive,
                ]}
                onPress={() => handleLanguageSelect(language.code)}
                activeOpacity={0.9}
              >
                <View style={styles.languageInfo}>
                  <View style={[styles.menuIconContainer, styles.languageGlobe]}>
                    <Ionicons name="language" size={20} color={UI.blue} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.languageName, { color: UI.text }]}>
                      {language.name}
                    </Text>
                  </View>
                </View>

                {active ? (
                  <Ionicons name="checkmark-circle" size={24} color={UI.blue} />
                ) : (
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={20}
                    color={UI.text2}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: UI.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.mainHeader, { backgroundColor: UI.bg }]}>
        <View style={{ width: 42 }} />
        <Text style={[styles.headerTitle, { color: UI.text }]}>{settingsTitle}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => router.push('/(app)/profile' as any)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.blueSoft }]}>
            <Ionicons name="person" size={22} color={UI.blue} />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={[styles.menuText, { color: UI.text }]}>{profileTitle}</Text>
          </View>

          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={UI.text2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => setShowLanguages(true)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.blueSoft }]}>
            <Ionicons name="language" size={22} color={UI.blue} />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={[styles.menuText, { color: UI.text }]}>{languageTitle}</Text>
            <Text style={[styles.menuSubText, { color: UI.text2 }]}>{currentLanguageName}</Text>
          </View>

          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={UI.text2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => router.push('/(app)/security' as any)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.blueSoft }]}>
            <Ionicons name="lock-closed" size={22} color={UI.blue} />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={[styles.menuText, { color: UI.text }]}>{securityTitle}</Text>
          </View>

          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={UI.text2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => router.push('/(app)/privacy-policy' as any)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.blueSoft }]}>
            <Ionicons name="document-text" size={22} color={UI.blue} />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={[styles.menuText, { color: UI.text }]}>{privacyTitle}</Text>
          </View>

          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={UI.text2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => router.push('/(app)/terms-conditions' as any)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.blueSoft }]}>
            <Ionicons name="clipboard" size={22} color={UI.blue} />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={[styles.menuText, { color: UI.text }]}>{termsTitle}</Text>
          </View>

          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={UI.text2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => setShowSupport(true)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.blueSoft }]}>
            <Ionicons name="mail" size={22} color={UI.blue} />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={[styles.menuText, { color: UI.text }]}>{supportTitle}</Text>
          </View>

          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={UI.text2}
          />
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
            onPress={() => router.push('/(app)/admin' as any)}
            activeOpacity={0.9}
          >
            <View style={[styles.menuIconContainer, styles.adminIcon]}>
              <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
            </View>

            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuText, { color: UI.text }]}>{adminTitle}</Text>
            </View>

            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={UI.text2}
            />
          </TouchableOpacity>
        )}

        <View style={[styles.divider, { backgroundColor: UI.border }]} />

        <TouchableOpacity
          style={[
            styles.menuItem,
            styles.logoutItem,
            { backgroundColor: UI.card, borderColor: UI.border },
          ]}
          onPress={handleLogout}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, styles.logoutIcon]}>
            <Ionicons name="log-out" size={22} color={theme.colors.error} />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={[styles.menuText, { color: theme.colors.error }]}>{logoutTitle}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={logoutOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutOpen(false)}
      >
        <Pressable style={stylesLogout.backdrop} onPress={() => setLogoutOpen(false)}>
          <Pressable style={stylesLogout.card} onPress={() => {}}>
            <Text style={stylesLogout.title}>{logoutTitle}</Text>
            <Text style={stylesLogout.message}>
              {tOne(
                ['settingsLogoutConfirm', 'settings.logoutConfirm'],
                'Are you sure you want to logout?'
              )}
            </Text>

            <View style={stylesLogout.row}>
              <TouchableOpacity
                style={[stylesLogout.btn, stylesLogout.cancelBtn]}
                onPress={() => setLogoutOpen(false)}
                activeOpacity={0.9}
              >
                <Text style={[stylesLogout.btnText, stylesLogout.cancelText]}>
                  {tSafe('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[stylesLogout.btn, stylesLogout.confirmBtn]}
                onPress={() => {
                  setLogoutOpen(false);
                  signOut();
                }}
                activeOpacity={0.9}
              >
                <Text style={[stylesLogout.btnText, stylesLogout.confirmText]}>
                  {logoutTitle}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  },

  content: { flex: 1 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    ...SHADOWS.soft,
  },

  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  menuTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  adminIcon: { backgroundColor: UI.blueDark },
  logoutIcon: { backgroundColor: UI.dangerSoft },
  languageGlobe: { marginRight: 14 },

  menuText: {
    fontSize: 15,
    fontWeight: '900',
  },

  menuSubText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },

  logoutItem: {
    marginTop: 20,
    marginBottom: 30,
  },

  divider: {
    height: 1,
    marginHorizontal: 16,
    marginTop: 26,
  },

  languageList: { flex: 1, padding: 16 },

  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    ...SHADOWS.soft,
  },
  languageItemActive: {
    borderWidth: 1,
    borderColor: UI.blue,
    backgroundColor: UI.cardSoft,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageName: {
    fontSize: 15,
    fontWeight: '900',
  },

  supportList: { flex: 1, padding: 16 },

  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    ...SHADOWS.soft,
  },
  supportItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
});

const stylesLogout = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'left',
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 14,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#111827',
  },
  confirmBtn: {
    backgroundColor: '#2563EB',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '900',
  },
  cancelText: {
    color: '#FFFFFF',
  },
  confirmText: {
    color: '#FFFFFF',
  },
});
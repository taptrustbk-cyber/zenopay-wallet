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
  Platform,
  I18nManager,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
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
];

const tSafe = (key: string, fallback: string) => {
  try {
    const value = i18n.t(key as any);
    if (!value) return fallback;

    const text = String(value);
    const lower = text.toLowerCase();

    if (
      text === key ||
      lower.includes('missing translation') ||
      lower.includes('missing "') ||
      text.includes(`"${key}"`)
    ) {
      return fallback;
    }

    return text;
  } catch {
    return fallback;
  }
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  const [showLanguages, setShowLanguages] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [, forceUpdate] = useState({});
  const isAdmin = !!(user && ADMIN_EMAILS.includes(user.email || ''));
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    setSelectedLanguage(getCurrentLanguage());
  }, []);

  const handleLanguageSelect = async (code: string) => {
    try {
      setSelectedLanguage(code);
      await setLanguage(code);
      setShowLanguages(false);
      forceUpdate({});

      Alert.alert(
        tSafe('success', 'Success'),
        tSafe('settingsLanguageChanged', 'Language changed successfully'),
        [
          {
            text: tSafe('ok', 'OK'),
            onPress: () => {
              router.replace('/(app)/dashboard' as any);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        tSafe('error', 'Error'),
        tSafe('settingsLanguageChangeFailed', 'Failed to change language')
      );
    }
  };

  const handleLogout = () => {
    setLogoutOpen(true);
  };

  const supportItems = [
    {
      id: 'email',
      label: tSafe('settingsSupportEmail', 'Email Support'),
      icon: 'mail' as const,
      url: 'mailto:info@zenopay.bond',
      color: UI.blueSoft,
      iconColor: UI.blue,
    },
    {
      id: 'facebook',
      label: tSafe('settingsSupportFacebook', 'Facebook'),
      icon: 'logo-facebook' as const,
      url: 'https://www.facebook.com/profile.php?id=61586118897855',
      color: UI.blueSoft,
      iconColor: UI.blue,
    },
    {
      id: 'instagram',
      label: tSafe('settingsSupportInstagram', 'Instagram'),
      icon: 'logo-instagram' as const,
      url: 'https://www.instagram.com/zenopaywallet/',
      color: UI.blueSoft,
      iconColor: UI.blue,
    },
    {
      id: 'tiktok',
      label: tSafe('settingsSupportTiktok', 'TikTok'),
      icon: 'logo-tiktok' as const,
      url: 'https://www.tiktok.com/@zenopaywallet?lang=en',
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
          tSafe('error', 'Error'),
          tSafe('settingsCannotOpenLink', 'Cannot open this link')
        );
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(
        tSafe('error', 'Error'),
        tSafe('settingsOpenLinkFailed', 'Failed to open link')
      );
    }
  };

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
          <Text style={[styles.headerTitle, { color: UI.text }]}>
            {tSafe('support', 'Support')}
          </Text>
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
                name={isRTL ? 'open-outline' : 'open-outline'}
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
          <Text style={[styles.headerTitle, { color: UI.text }]}>
            {tSafe('language', 'Language')}
          </Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView style={styles.languageList} contentContainerStyle={{ paddingBottom: 24 }}>
          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                { backgroundColor: UI.card, borderColor: UI.border },
                selectedLanguage === language.code && styles.languageItemActive,
              ]}
              onPress={() => handleLanguageSelect(language.code)}
              activeOpacity={0.9}
            >
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: UI.text }]}>{language.name}</Text>
              </View>
              {selectedLanguage === language.code && (
                <Ionicons name="checkmark-circle" size={24} color={UI.blue} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: UI.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.mainHeader, { backgroundColor: UI.bg }]}>
        <View style={{ width: 42 }} />
        <Text style={[styles.headerTitle, { color: UI.text }]}>
          {tSafe('settings', 'Settings')}
        </Text>
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
          <Text style={[styles.menuText, { color: UI.text }]}>{tSafe('profile', 'Profile')}</Text>
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
          <Text style={[styles.menuText, { color: UI.text }]}>{tSafe('language', 'Language')}</Text>
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
          <Text style={[styles.menuText, { color: UI.text }]}>{tSafe('security', 'Security')}</Text>
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
          <Text style={[styles.menuText, { color: UI.text }]}>
            {tSafe('privacyPolicy', 'Privacy Policy')}
          </Text>
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
          <Text style={[styles.menuText, { color: UI.text }]}>
            {tSafe('termsConditions', 'Terms & Conditions')}
          </Text>
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
          <Text style={[styles.menuText, { color: UI.text }]}>{tSafe('support', 'Support')}</Text>
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
            <Text style={[styles.menuText, { color: UI.text }]}>
              {tSafe('adminPanel', 'Admin Panel')}
            </Text>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={UI.text2}
            />
          </TouchableOpacity>
        )}

        <View style={[styles.divider, { backgroundColor: UI.border }]} />

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={handleLogout}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, styles.logoutIcon]}>
            <Ionicons name="log-out" size={22} color={theme.colors.error} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.error }]}>
            {tSafe('logout', 'Logout')}
          </Text>
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
            <Text style={stylesLogout.title}>{tSafe('logout', 'Logout')}</Text>
            <Text style={stylesLogout.message}>
              {tSafe('settingsLogoutConfirm', 'Are you sure you want to logout?')}
            </Text>

            <View style={stylesLogout.row}>
              <TouchableOpacity
                style={[stylesLogout.btn, stylesLogout.cancelBtn]}
                onPress={() => setLogoutOpen(false)}
                activeOpacity={0.9}
              >
                <Text style={[stylesLogout.btnText, stylesLogout.cancelText]}>
                  {tSafe('cancel', 'Cancel')}
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
                  {tSafe('logout', 'Logout')}
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
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingBottom: 14,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 42,
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

  adminIcon: { backgroundColor: UI.blueDark },
  logoutIcon: { backgroundColor: UI.dangerSoft },

  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
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
    gap: 14,
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
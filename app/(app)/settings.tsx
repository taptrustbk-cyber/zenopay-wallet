import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import i18n, { setLanguage, getCurrentLanguage } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';

const UI = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#47B08A',
  greenSoft: '#EAF7F1',
};

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'ckb', name: 'کوردی سۆرانی' },
  { code: 'kmr', name: 'کوردی بادینی' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, themeMode, toggleTheme, setTheme } = useTheme(); // ✅ added setTheme (no other changes)
  const [showLanguages, setShowLanguages] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [, forceUpdate] = useState({});
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  // ✅ prevent double-tap flicker
  const [togglingTheme, setTogglingTheme] = useState(false);

  useEffect(() => {
    setSelectedLanguage(getCurrentLanguage());
  }, []);

  const handleLanguageSelect = async (code: string) => {
    setSelectedLanguage(code);
    await setLanguage(code);
    setShowLanguages(false);
    forceUpdate({});
    Alert.alert(i18n.t('success'), i18n.t('success'), [
      {
        text: 'OK',
        onPress: () => {
          router.replace('/(app)/dashboard' as any);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(i18n.t('logout'), i18n.t('logout') + '?', [
      { text: 'Cancel', style: 'cancel' },
      { text: i18n.t('logout'), style: 'destructive', onPress: signOut },
    ]);
  };

  const supportItems = [
    {
      id: 'email',
      label: 'Email Support',
      icon: 'mail' as const,
      url: 'mailto:info@zenopay.bond',
      color: UI.greenSoft,
      iconColor: UI.green,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: 'logo-facebook' as const,
      url: 'https://www.facebook.com/profile.php?id=61586118897855',
      color: UI.greenSoft,
      iconColor: UI.green,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: 'logo-instagram' as const,
      url: 'https://www.instagram.com/zenopaywallet/',
      color: UI.greenSoft,
      iconColor: UI.green,
    },
    {
      id: 'tiktok',
      label: 'TikTok',
      icon: 'logo-tiktok' as const,
      url: 'https://www.tiktok.com/@zenopaywallet?lang=en',
      color: UI.greenSoft,
      iconColor: UI.green,
    },
  ];

  const handleSupportItemPress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  // ✅ FIX: stable theme toggle (no auto revert / flicker)
  const handleToggleTheme = async () => {
    if (togglingTheme) return;
    setTogglingTheme(true);
    try {
      // Use explicit setTheme to avoid any race conditions in UI
      const next = themeMode === 'dark' ? 'light' : 'dark';
      if (typeof setTheme === 'function') {
        await setTheme(next);
      } else {
        // fallback if setTheme not available for any reason
        await toggleTheme();
      }
    } finally {
      setTogglingTheme(false);
    }
  };

  // =========================
  // Support screen
  // =========================
  if (showSupport) {
    return (
      <View style={[styles.container, { backgroundColor: UI.bg }]}>
        <View style={[styles.header, { borderBottomColor: UI.border, backgroundColor: UI.bg }]}>
          <TouchableOpacity onPress={() => setShowSupport(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={UI.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: UI.text }]}>{i18n.t('support')}</Text>
          <View style={{ width: 24 }} />
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
              <Ionicons name="open-outline" size={20} color={UI.text2} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // =========================
  // Language screen
  // =========================
  if (showLanguages) {
    return (
      <View style={[styles.container, { backgroundColor: UI.bg }]}>
        <View style={[styles.header, { borderBottomColor: UI.border, backgroundColor: UI.bg }]}>
          <TouchableOpacity onPress={() => setShowLanguages(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={UI.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: UI.text }]}>{i18n.t('language')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.languageList} contentContainerStyle={{ paddingBottom: 24 }}>
          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                { backgroundColor: UI.card, borderColor: UI.border },
                selectedLanguage === language.code && [
                  styles.languageItemActive,
                  { backgroundColor: UI.card, borderColor: UI.green },
                ],
              ]}
              onPress={() => handleLanguageSelect(language.code)}
              activeOpacity={0.9}
            >
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: UI.text }]}>{language.name}</Text>
              </View>
              {selectedLanguage === language.code && (
                <Ionicons name="checkmark-circle" size={24} color={UI.green} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // =========================
  // Main screen
  // =========================
  return (
    <View style={[styles.container, { backgroundColor: UI.bg }]}>
      <View style={[styles.header, { backgroundColor: UI.bg, borderBottomColor: UI.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={UI.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: UI.text }]}>{i18n.t('settings')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => router.push('/(app)/profile' as any)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.greenSoft }]}>
            <Ionicons name="person" size={22} color={UI.green} />
          </View>
          <Text style={[styles.menuText, { color: UI.text }]}>{i18n.t('profile')}</Text>
          <Ionicons name="chevron-forward" size={20} color={UI.text2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => setShowLanguages(true)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.greenSoft }]}>
            <Ionicons name="language" size={22} color={UI.green} />
          </View>
          <Text style={[styles.menuText, { color: UI.text }]}>{i18n.t('language')}</Text>
          <Ionicons name="chevron-forward" size={20} color={UI.text2} />
        </TouchableOpacity>

        {/* ✅ ONLY UPDATED THIS ITEM (Dark Mode) */}
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={handleToggleTheme}
          activeOpacity={0.9}
          disabled={togglingTheme}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.greenSoft }]}>
            <Ionicons name={themeMode === 'dark' ? 'moon' : 'sunny'} size={22} color={UI.green} />
          </View>
          <Text style={[styles.menuText, { color: UI.text }]}>
            {themeMode === 'dark' ? i18n.t('darkMode') : i18n.t('lightMode')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={UI.text2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => router.push('/(app)/security' as any)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.greenSoft }]}>
            <Ionicons name="lock-closed" size={22} color={UI.green} />
          </View>
          <Text style={[styles.menuText, { color: UI.text }]}>{i18n.t('security')}</Text>
          <Ionicons name="chevron-forward" size={20} color={UI.text2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => router.push('/(app)/privacy-policy' as any)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.greenSoft }]}>
            <Ionicons name="document-text" size={22} color={UI.green} />
          </View>
          <Text style={[styles.menuText, { color: UI.text }]}>{i18n.t('privacyPolicy')}</Text>
          <Ionicons name="chevron-forward" size={20} color={UI.text2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => router.push('/(app)/terms-conditions' as any)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.greenSoft }]}>
            <Ionicons name="clipboard" size={22} color={UI.green} />
          </View>
          <Text style={[styles.menuText, { color: UI.text }]}>{i18n.t('termsConditions')}</Text>
          <Ionicons name="chevron-forward" size={20} color={UI.text2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
          onPress={() => setShowSupport(true)}
          activeOpacity={0.9}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: UI.greenSoft }]}>
            <Ionicons name="mail" size={22} color={UI.green} />
          </View>
          <Text style={[styles.menuText, { color: UI.text }]}>{i18n.t('support')}</Text>
          <Ionicons name="chevron-forward" size={20} color={UI.text2} />
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: UI.card, borderColor: UI.border }]}
            onPress={() => router.push('/(app)/admin' as any)}
            activeOpacity={0.9}
          >
            <View style={[styles.menuIconContainer, styles.adminIcon]}>
              <Ionicons name="shield-checkmark" size={22} color="#A78BFA" />
            </View>
            <Text style={[styles.menuText, { color: UI.text }]}>{i18n.t('adminPanel')}</Text>
            <Ionicons name="chevron-forward" size={20} color={UI.text2} />
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
          <Text style={[styles.menuText, { color: theme.colors.error }]}>{i18n.t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
  },

  content: { flex: 1 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },

  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  adminIcon: { backgroundColor: '#5B21B6' },
  logoutIcon: { backgroundColor: '#7F1D1D' },

  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900' as const,
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
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  languageItemActive: {
    borderWidth: 1,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  languageName: {
    fontSize: 15,
    fontWeight: '900' as const,
  },

  supportList: { flex: 1, padding: 16 },

  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  supportItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900' as const,
  },
});

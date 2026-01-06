import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import i18n, { setLanguage, getCurrentLanguage } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'ckb', name: 'کوردی سۆرانی' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, themeMode, toggleTheme } = useTheme();
  const [showLanguages, setShowLanguages] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [, forceUpdate] = useState({});
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  useEffect(() => {
    setSelectedLanguage(getCurrentLanguage());
  }, []);

  const handleLanguageSelect = async (code: string) => {
    setSelectedLanguage(code);
    await setLanguage(code);
    setShowLanguages(false);
    forceUpdate({});
    Alert.alert(
      i18n.t('success'), 
      i18n.t('success'),
      [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(app)/dashboard' as any);
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      i18n.t('logout'),
      i18n.t('logout') + '?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: i18n.t('logout'), style: 'destructive', onPress: signOut },
      ]
    );
  };

  const supportItems = [
    {
      id: 'email',
      label: 'Email Support',
      icon: 'mail' as const,
      url: 'mailto:info@zenopay.bond',
      color: themeMode === 'dark' ? '#7C2D12' : '#FED7AA',
      iconColor: themeMode === 'dark' ? '#FB923C' : '#EA580C',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: 'logo-facebook' as const,
      url: 'https://www.facebook.com/profile.php?id=61586118897855',
      color: themeMode === 'dark' ? '#1E3A8A' : '#DBEAFE',
      iconColor: theme.colors.primary,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: 'logo-instagram' as const,
      url: 'https://www.instagram.com/zenopaywallet/',
      color: themeMode === 'dark' ? '#7C2D12' : '#FED7AA',
      iconColor: themeMode === 'dark' ? '#FB923C' : '#EA580C',
    },
    {
      id: 'tiktok',
      label: 'TikTok',
      icon: 'logo-tiktok' as const,
      url: 'https://www.tiktok.com/@zenopaywallet?lang=en',
      color: themeMode === 'dark' ? '#1E3A8A' : '#DBEAFE',
      iconColor: theme.colors.primary,
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

  if (showSupport) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => setShowSupport(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{i18n.t('support')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.supportList}>
          {supportItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.supportItem, { backgroundColor: theme.colors.cardSecondary }]}
              onPress={() => handleSupportItemPress(item.url)}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={22} color={item.iconColor} />
              </View>
              <Text style={[styles.supportItemText, { color: theme.colors.text }]}>{item.label}</Text>
              <Ionicons name="open-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (showLanguages) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => setShowLanguages(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{i18n.t('language')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.languageList}>
          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                { backgroundColor: theme.colors.cardSecondary },
                selectedLanguage === language.code && [styles.languageItemActive, { backgroundColor: theme.colors.card, borderColor: theme.colors.success }],
              ]}
              onPress={() => handleLanguageSelect(language.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: theme.colors.text }]}>{language.name}</Text>
              </View>
              {selectedLanguage === language.code && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{i18n.t('settings')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.cardSecondary }]}
          onPress={() => router.push('/(app)/profile' as any)}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: themeMode === 'dark' ? '#1E3A8A' : '#DBEAFE' }]}>
            <Ionicons name="person" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>{i18n.t('profile')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.cardSecondary }]}
          onPress={() => setShowLanguages(true)}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: themeMode === 'dark' ? '#1E3A8A' : '#DBEAFE' }]}>
            <Ionicons name="language" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>{i18n.t('language')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.cardSecondary }]}
          onPress={toggleTheme}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: themeMode === 'dark' ? '#1E3A8A' : '#DBEAFE' }]}>
            <Ionicons name={themeMode === 'dark' ? 'moon' : 'sunny'} size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>
            {themeMode === 'dark' ? i18n.t('darkMode') : i18n.t('lightMode')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.cardSecondary }]}
          onPress={() => router.push('/(app)/security' as any)}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: themeMode === 'dark' ? '#7C2D12' : '#FED7AA' }]}>
            <Ionicons name="lock-closed" size={22} color={themeMode === 'dark' ? '#FB923C' : '#EA580C'} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>{i18n.t('security')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.cardSecondary }]}
          onPress={() => router.push('/(app)/privacy-policy' as any)}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: themeMode === 'dark' ? '#134E4A' : '#CCFBF1' }]}>
            <Ionicons name="document-text" size={22} color={themeMode === 'dark' ? '#5EEAD4' : '#0F766E'} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>{i18n.t('privacyPolicy')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.cardSecondary }]}
          onPress={() => router.push('/(app)/terms-conditions' as any)}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: themeMode === 'dark' ? '#1E3A8A' : '#DBEAFE' }]}>
            <Ionicons name="clipboard" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>{i18n.t('termsConditions')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.cardSecondary }]}
          onPress={() => setShowSupport(true)}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: themeMode === 'dark' ? '#7C2D12' : '#FED7AA' }]}>
            <Ionicons name="mail" size={22} color={themeMode === 'dark' ? '#FB923C' : '#EA580C'} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>{i18n.t('support')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.colors.cardSecondary }]}
            onPress={() => router.push('/(app)/admin' as any)}
          >
            <View style={[styles.menuIconContainer, styles.adminIcon]}>
              <Ionicons name="shield-checkmark" size={22} color="#A78BFA" />
            </View>
            <Text style={[styles.menuText, { color: theme.colors.text }]}>{i18n.t('adminPanel')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem, { backgroundColor: theme.colors.cardSecondary }]}
          onPress={handleLogout}
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  content: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  adminIcon: {
    backgroundColor: '#5B21B6',
  },
  logoutIcon: {
    backgroundColor: '#7F1D1D',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  logoutItem: {
    marginTop: 20,
    marginBottom: 30,
  },

  divider: {
    height: 1,
    marginHorizontal: 20,
    marginTop: 30,
  },
  languageList: {
    flex: 1,
    padding: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600' as const,
  },
  supportList: {
    flex: 1,
    padding: 20,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  supportItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

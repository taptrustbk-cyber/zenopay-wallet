import React, { useMemo } from 'react';
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

  const settingsItems = useMemo(
    () => [
      {
        key: 'profile',
        title: tSafe('profile.title', 'Profile'),
        icon: 'person-outline' as const,
        onPress: () => router.push('/(app)/profile' as any),
      },
      {
        key: 'language',
        title: tSafe('language', 'Language'),
        icon: 'language-outline' as const,
        onPress: () => {
          Alert.alert(
            tSafe('language', 'Language'),
            [
              `• ${tSafe('common.languageEnglish', 'English')}`,
              `• ${tSafe('common.languageArabic', 'العربية')}`,
              `• ${tSafe('common.languageSorani', 'کوردی سۆرانی')}`,
              `• ${tSafe('common.languageBadini', 'کوردی بادینی')}`,
            ].join('\n')
          );
        },
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
        onPress: async () => {
          try {
            const url = 'mailto:info@zenopay.bond';
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
              Alert.alert(
                tSafe('common.error', 'Error'),
                tSafe('settingsCannotOpenLink', 'Cannot open this link')
              );
              return;
            }
            await Linking.openURL(url);
          } catch {
            Alert.alert(
              tSafe('common.error', 'Error'),
              tSafe('settingsOpenLinkFailed', 'Failed to open link')
            );
          }
        },
      },
      {
        key: 'admin',
        title: tSafe('adminPanel', 'Admin Panel'),
        icon: 'shield-checkmark-outline' as const,
        onPress: () => router.push('/(app)/admin' as any),
      },
    ],
    [router]
  );

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

              <Text style={[styles.menuTitle, isRTL && styles.textRTL]}>
                {item.title}
              </Text>
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

  menuTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
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
});
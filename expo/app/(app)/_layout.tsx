import { Stack, usePathname, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import i18n, { getCurrentLanguage } from '@/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UI = {
  bg: '#EEF4FF',
  bgSoft: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',

  blue: '#2563EB',
  blue2: '#3B82F6',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',

  danger: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
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
      String(value).toLowerCase().includes('missing translation') ||
      String(value).toLowerCase().includes('object object')
    ) {
      return fallback;
    }

    return String(value);
  } catch {
    return fallback;
  }
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>{tSafe('common.error', 'Error')}</Text>
      <Text style={styles.errorMessage}>
        {error?.message || tSafe('common.somethingWentWrong', 'Something went wrong')}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={resetErrorBoundary}
        activeOpacity={0.88}
      >
        <Text style={styles.retryText}>{tSafe('common.retry', 'Retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function KycPendingScreen() {
  const { signOut } = useAuth();
  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.kycContainer}>
      <View style={styles.kycContent}>
        <View style={styles.kycIconContainer}>
          <Ionicons name="shield-checkmark-outline" size={64} color={UI.warning} />
        </View>

        <Text style={[styles.kycTitle, isRTL && styles.textRTL]}>
          {tSafe('kycVerificationRequired', 'KYC Verification Required')}
        </Text>

        <Text style={[styles.kycSubtitle, isRTL && styles.textRTL]}>
          {tSafe('kycPendingMessage', 'Your account is under review.')}
        </Text>

        <View style={[styles.kycInfoBox, isRTL && styles.kycInfoBoxRTL]}>
          <Ionicons
            name="time-outline"
            size={20}
            color={UI.text3}
            style={[styles.kycInfoIcon, isRTL && styles.kycInfoIconRTL]}
          />
          <View style={styles.kycInfoContent}>
            <Text style={[styles.kycInfoTitle, isRTL && styles.textRTL]}>
              {tSafe('whatsNext', 'What is next?')}
            </Text>
            <Text style={[styles.kycInfoText, isRTL && styles.textRTL]}>
              {tSafe('kycNextSteps', 'Please wait while we review your submitted documents.')}
            </Text>
          </View>
        </View>

        <View style={styles.kycSecurityNote}>
          <Text style={[styles.kycSecurityText, isRTL && styles.textRTL]}>
            {tSafe('documentsSecure', 'Your documents are stored securely.')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.kycSignOutButton}
          onPress={signOut}
          activeOpacity={0.88}
        >
          <Text style={styles.kycSignOutText}>{tSafe('auth.signOut', 'Sign Out')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MainBottomNav({ localeKey }: { localeKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const insets = useSafeAreaInsets();

  const tabs = [
    {
      key: 'dashboard',
      label: tSafe('home', 'Home'),
      icon: 'home' as const,
      path: '/dashboard',
      active: pathname === '/dashboard' || pathname === '/(app)/dashboard',
    },
    {
      key: 'Cards',
      label: tSafe('cards.title', 'Cards'),
      icon: 'card' as const,
      path: '/Cards',
      active: pathname === '/Cards',
    },
    {
      key: 'consulate',
      label: tSafe('consulateInfo.title', 'Consulate Info'),
      icon: 'chatbox' as const,
      path: '/consulate',
      active: pathname === '/consulate' || pathname === '/(app)/consulate',
    },
    {
      key: 'settings',
      label: tSafe('settings.title', tSafe('settings', 'Settings')),
      icon: 'settings' as const,
      path: '/settings',
      active: pathname === '/settings' || pathname === '/(app)/settings',
    },
  ];

  return (
    <View
      key={localeKey}
      style={[
        styles.bottomNavWrap,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.bottomNav}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={`${localeKey}-${tab.key}`}
            style={styles.navItem}
            activeOpacity={0.88}
            onPress={() => router.replace(tab.path as any)}
          >
            <View style={[styles.navIconBubble, tab.active && styles.navIconBubbleActive]}>
              <Ionicons
                name={tab.icon}
                size={22}
                color={tab.active ? UI.blue : '#9CA3AF'}
              />
            </View>

            <Text
              style={[styles.navText, tab.active && styles.navTextActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function HeaderBackButton({
  onPress,
  label,
}: {
  onPress: () => void;
  label: string;
}) {
  const isRTL = I18nManager.isRTL;

  return (
    <TouchableOpacity onPress={onPress} style={styles.headerBackBtn} activeOpacity={0.85}>
      <Ionicons
        name={isRTL ? 'arrow-forward' : 'arrow-back'}
        size={22}
        color={UI.text}
      />
      <Text style={[styles.headerBackText, isRTL && styles.headerBackTextRTL]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { profile, loading } = useAuth();
  const pathname = usePathname();

  const [localeKey, setLocaleKey] = useState(getCurrentLanguage() || i18n.locale || 'en');

  useEffect(() => {
    const syncLocale = () => {
    const notificationListener = useRef<any>();
const responseListener = useRef<any>();

useEffect(() => {
  // when notification received (app open)
  notificationListener.current =
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification received:', notification);
    });

  // when user clicks notification
  responseListener.current =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👉 Notification clicked:', response);

      const data = response.notification.request.content.data;

      // مثال navigation
      if (data?.screen) {
        try {
          router.push(data.screen);
        } catch {}
      }
    });

  return () => {
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
    }
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
    }
  };
}, []);
      const current = getCurrentLanguage() || i18n.locale || 'en';
      setLocaleKey((prev) => (prev === current ? prev : current));
    };

    syncLocale();

    const interval = setInterval(syncLocale, 250);
    return () => clearInterval(interval);
  }, []);

  const mainNavPaths = [
    '/dashboard',
    '/Cards',
    '/consulate',
    '/settings',
    '/(app)/dashboard',
    '/(app)/consulate',
    '/(app)/settings',
  ];

  const showMainBottomNav = mainNavPaths.includes(pathname);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={UI.blue} />
      </View>
    );
  }

  if (profile && profile.kyc_status !== 'approved') {
    return <KycPendingScreen />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <View style={styles.appShell}>
        <View style={styles.stackWrap}>
          <Stack
            screenOptions={{
              headerBackTitle: '',
              headerTitleAlign: 'center',
              headerTintColor: UI.text,
              headerStyle: {
                backgroundColor: UI.bg,
              },
              headerTitleStyle: {
                color: UI.text,
                fontWeight: '800',
              },
              headerShadowVisible: false,
              contentStyle: {
                backgroundColor: UI.bg,
              },
            }}
          >
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="Cards" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />

            <Stack.Screen
              name="consulate"
              options={({ navigation }) => ({
                title: tSafe('consulateInfo.title', 'Consulate Info'),
                headerLeft: () => (
                  <HeaderBackButton
                    onPress={() => navigation.navigate('dashboard')}
                    label={tSafe('common.back', 'Back')}
                  />
                ),
              })}
            />

            <Stack.Screen
              name="profile"
              options={{
                title: tSafe('profile.title', 'Profile'),
              }}
            />

            <Stack.Screen
              name="kyc"
              options={{
                title: tSafe('kyc.kycDocuments', 'KYC Verification'),
              }}
            />

            <Stack.Screen
              name="send"
              options={({ navigation }) => ({
                title: tSafe('sendMoney', 'Send Money'),
                headerLeft: () => (
                  <HeaderBackButton
                    onPress={() => navigation.navigate('dashboard')}
                    label={tSafe('common.back', 'Back')}
                  />
                ),
              })}
            />

            <Stack.Screen
              name="receive"
              options={({ navigation }) => ({
                title: tSafe('deposit.depositMoney', 'Deposit'),
                headerLeft: () => (
                  <HeaderBackButton
                    onPress={() => navigation.navigate('dashboard')}
                    label={tSafe('common.back', 'Back')}
                  />
                ),
              })}
            />

            <Stack.Screen
              name="transactions"
              options={{
                title: tSafe('transactions.title', 'Transactions'),
              }}
            />

            <Stack.Screen
              name="withdraw"
              options={({ navigation }) => ({
                title: tSafe('withdrawPage.withdrawRequest', 'Withdraw'),
                headerLeft: () => (
                  <HeaderBackButton
                    onPress={() => navigation.navigate('dashboard')}
                    label={tSafe('common.back', 'Back')}
                  />
                ),
              })}
            />

            <Stack.Screen
              name="admin"
              options={{
                title: tSafe('adminPanel', 'Admin Panel'),
              }}
            />

            <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
            <Stack.Screen name="terms-conditions" options={{ headerShown: false }} />
            <Stack.Screen name="security" options={{ headerShown: false }} />

            <Stack.Screen
              name="sim-cards"
              options={({ navigation }) => ({
                title: tSafe('simCards.pageTitle', 'Buy Mobile Cards'),
                headerShown: true,
                headerLeft: () => (
                  <HeaderBackButton
                    onPress={() => navigation.navigate('dashboard')}
                    label={tSafe('common.back', 'Back')}
                  />
                ),
              })}
            />

            <Stack.Screen
              name="gift-cards"
              options={({ navigation }) => ({
                title: tSafe('giftCards.pageTitle', 'Online Gift Cards'),
                headerShown: true,
                headerLeft: () => (
                  <HeaderBackButton
                    onPress={() => navigation.navigate('dashboard')}
                    label={tSafe('common.back', 'Back')}
                  />
                ),
              })}
            />

            <Stack.Screen
              name="mobile-shop"
              options={({ navigation }) => ({
                title: tSafe('zenopayMobileShop', 'Zenopay Mobile Shop'),
                headerShown: true,
                headerLeft: () => (
                  <HeaderBackButton
                    onPress={() => navigation.navigate('dashboard')}
                    label={tSafe('common.back', 'Back')}
                  />
                ),
              })}
            />

            <Stack.Screen
              name="travel-booking"
              options={({ navigation }) => ({
                title: tSafe('travelBooking', 'Travel Booking'),
                headerShown: true,
                headerLeft: () => (
                  <HeaderBackButton
                    onPress={() => navigation.navigate('dashboard')}
                    label={tSafe('common.back', 'Back')}
                  />
                ),
              })}
            />
          </Stack>
        </View>

        {showMainBottomNav ? <MainBottomNav localeKey={localeKey} /> : null}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  stackWrap: {
    flex: 1,
  },

  bottomNavWrap: {
    backgroundColor: UI.card,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    paddingTop: 8,
    paddingHorizontal: 10,
    ...SHADOWS.card,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    minHeight: 70,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  navIconBubbleActive: {
    backgroundColor: UI.blueSoft,
  },
  navText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  navTextActive: {
    color: UI.blue,
  },

  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  headerBackText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerBackTextRTL: {
    marginLeft: 0,
    marginRight: 4,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: UI.bg,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI.danger,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: UI.text2,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: UI.blue2,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI.bg,
  },

  kycContainer: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  kycContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycIconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.24)',
  },
  kycTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  kycSubtitle: {
    fontSize: 15,
    color: UI.text2,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  kycInfoBox: {
    flexDirection: 'row',
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: UI.border,
    width: '100%',
    alignItems: 'flex-start',
  },
  kycInfoBoxRTL: {
    flexDirection: 'row-reverse',
  },
  kycInfoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  kycInfoIconRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  kycInfoContent: {
    flex: 1,
  },
  kycInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: UI.text,
    marginBottom: 8,
  },
  kycInfoText: {
    fontSize: 14,
    color: UI.text2,
    lineHeight: 22,
  },
  kycSecurityNote: {
    backgroundColor: UI.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: UI.border,
  },
  kycSecurityText: {
    fontSize: 14,
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 22,
  },
  kycSignOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  kycSignOutText: {
    color: UI.text2,
    fontSize: 15,
    fontWeight: '600',
  },
  textRTL: {
    textAlign: 'right',
  },
});
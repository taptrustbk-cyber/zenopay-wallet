import { Stack, usePathname, useRouter } from 'expo-router';
import { ErrorBoundary } from 'react-error-boundary';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';
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

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error?.message || 'Unknown error'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={resetErrorBoundary}>
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

function KycPendingScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.kycContainer}>
      <View style={styles.kycContent}>
        <View style={styles.kycIconContainer}>
          <Ionicons name="shield-checkmark-outline" size={64} color={UI.warning} />
        </View>

        <Text style={styles.kycTitle}>{i18n.t('kycVerificationRequired')}</Text>
        <Text style={styles.kycSubtitle}>{i18n.t('kycPendingMessage')}</Text>

        <View style={styles.kycInfoBox}>
          <Ionicons name="time-outline" size={20} color={UI.text3} style={styles.kycInfoIcon} />
          <View style={styles.kycInfoContent}>
            <Text style={styles.kycInfoTitle}>{i18n.t('whatsNext')}</Text>
            <Text style={styles.kycInfoText}>{i18n.t('kycNextSteps')}</Text>
          </View>
        </View>

        <View style={styles.kycSecurityNote}>
          <Text style={styles.kycSecurityText}>{i18n.t('documentsSecure')}</Text>
        </View>

        <TouchableOpacity style={styles.kycSignOutButton} onPress={signOut}>
          <Text style={styles.kycSignOutText}>{i18n.t('signOut')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MainBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const tabs = [
    {
      key: 'dashboard',
      label: i18n.t('home'),
      icon: 'home' as const,
      path: '/(app)/dashboard',
      active:
        pathname === '/(app)/dashboard' ||
        pathname === '/dashboard',
    },
    {
      key: 'Cards',
      label: i18n.t('Cards'),
      icon: 'card' as const,
      path: '/Cards',
      active:
         pathname === '/Cards',
    },
    {
      key: 'consulate',
      label: i18n.t('consulateInfo'),
      icon: 'chatbox' as const,
      path: '/(app)/consulate',
      active:
        pathname === '/(app)/consulate' ||
        pathname === '/consulate',
    },
    {
      key: 'settings',
      label: i18n.t('settings'),
      icon: 'settings' as const,
      path: '/(app)/settings',
      active:
        pathname === '/(app)/settings' ||
        pathname === '/settings',
    },
  ];

  return (
    <View
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
            key={tab.key}
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
            <Text style={[styles.navText, tab.active && styles.navTextActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { profile, loading } = useAuth();
  const pathname = usePathname();

  const mainNavPaths = [
  '/dashboard',
  '/Cards',
  '/consulate',
  '/settings',
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
                title: i18n.t('consulateInfo'),
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('dashboard')}
                    style={styles.headerBackBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-back" size={22} color={UI.text} />
                    <Text style={styles.headerBackText}>{i18n.t('back')}</Text>
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen name="profile" options={{ title: 'Profile' }} />
            <Stack.Screen name="kyc" options={{ title: 'KYC Verification' }} />

            <Stack.Screen
              name="send"
              options={({ navigation }) => ({
                title: i18n.t('sendMoney'),
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('dashboard')}
                    style={styles.headerBackBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-back" size={22} color={UI.text} />
                    <Text style={styles.headerBackText}>{i18n.t('back')}</Text>
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen
              name="receive"
              options={({ navigation }) => ({
                title: i18n.t('deposit'),
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('dashboard')}
                    style={styles.headerBackBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-back" size={22} color={UI.text} />
                    <Text style={styles.headerBackText}>{i18n.t('back')}</Text>
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />

            <Stack.Screen
              name="withdraw"
              options={({ navigation }) => ({
                title: i18n.t('withdraw'),
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('dashboard')}
                    style={styles.headerBackBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-back" size={22} color={UI.text} />
                    <Text style={styles.headerBackText}>{i18n.t('back')}</Text>
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen name="admin" options={{ title: 'Admin Panel' }} />
            <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
            <Stack.Screen name="terms-conditions" options={{ headerShown: false }} />
            <Stack.Screen name="security" options={{ headerShown: false }} />

            <Stack.Screen
              name="sim-cards"
              options={({ navigation }) => ({
                title: i18n.t('simCards'),
                headerShown: true,
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('dashboard')}
                    style={styles.headerBackBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-back" size={22} color={UI.text} />
                    <Text style={styles.headerBackText}>{i18n.t('back')}</Text>
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen
              name="gift-cards"
              options={({ navigation }) => ({
                title: i18n.t('giftCards'),
                headerShown: true,
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('dashboard')}
                    style={styles.headerBackBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-back" size={22} color={UI.text} />
                    <Text style={styles.headerBackText}>{i18n.t('back')}</Text>
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen
              name="mobile-shop"
              options={({ navigation }) => ({
                title: i18n.t('mobileShop'),
                headerShown: true,
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('dashboard')}
                    style={styles.headerBackBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-back" size={22} color={UI.text} />
                    <Text style={styles.headerBackText}>{i18n.t('back')}</Text>
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen
              name="travel-booking"
              options={({ navigation }) => ({
                title: i18n.t('travelBooking'),
                headerShown: true,
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('dashboard')}
                    style={styles.headerBackBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-back" size={22} color={UI.text} />
                    <Text style={styles.headerBackText}>{i18n.t('back')}</Text>
                  </TouchableOpacity>
                ),
              })}
            />
          </Stack>
        </View>

        {showMainBottomNav ? <MainBottomNav /> : null}
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
  kycInfoIcon: {
    marginRight: 12,
    marginTop: 2,
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
});
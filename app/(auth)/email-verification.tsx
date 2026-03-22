import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  AppState,
} from 'react-native';
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import i18n from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const COLORS = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#D9E5F6',
  inputBg: '#F8FBFF',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',
  success: '#16A34A',
  successSoft: '#EAF8EF',
  danger: '#DC2626',
  white: '#FFFFFF',
  shadow: '#7DA8E6',
};

const SHADOWS = {
  card: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

const PENDING_PROFILE_KEY = 'zenopay_pending_profile_v1';

function safeStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

type PendingProfile = {
  email?: string;
  full_name?: string;
  city?: string;
  country?: string;
  phone?: string;
  date_of_brith?: string;
  pending_profile_created_at?: string;
};

export default function EmailVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const emailParam = safeStr(params.email);

  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [userEmail, setUserEmail] = useState<string>(emailParam || '');
  const [resending, setResending] = useState(false);

  const redirectedRef = useRef(false);
  const savingProfileRef = useRef(false);
  const mountedRef = useRef(true);

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    const loadEmail = async () => {
      if (emailParam) {
        setUserEmail(emailParam);
        return;
      }
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.email) setUserEmail(data.user.email);
      } catch {
        // ignore
      }
    };
    loadEmail();
  }, [emailParam]);

  const goToLoginWithSuccess = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    router.replace({
      pathname: '/(auth)/login' as any,
      params: {
        confirmed: '1',
        applyPendingProfile: '1',
        email: userEmail || emailParam || '',
      },
    } as any);
  }, [router, userEmail, emailParam]);

  function isUserConfirmed(user: any): boolean {
    return Boolean(user?.email_confirmed_at || user?.confirmed_at);
  }

  async function checkIfVerifiedWithSession(): Promise<boolean> {
    try {
      await supabase.auth.refreshSession().catch(() => null);

      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      return isUserConfirmed(user);
    } catch {
      return false;
    }
  }

  async function checkIfVerifiedFromServer(email: string): Promise<boolean> {
    if (!email) return false;

    const { data, error } = await supabase.functions.invoke('check-email-confirmed', {
      body: { email },
    });

    if (error) {
      console.log('Edge function error:', error.message);
      return false;
    }

    return !!data?.confirmed;
  }

  async function tryUpsertPendingProfileIfSession(): Promise<boolean> {
    if (savingProfileRef.current) return false;
    savingProfileRef.current = true;

    try {
      const pendingRaw = await AsyncStorage.getItem(PENDING_PROFILE_KEY);
      const pending: PendingProfile | null = pendingRaw ? JSON.parse(pendingRaw) : null;
      if (!pending) return false;

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) return false;

      const payload = {
        id: userId,
        full_name: pending.full_name ?? null,
        city: pending.city ?? null,
        country: pending.country ?? null,
        phone: pending.phone ?? null,
        date_of_brith: pending.date_of_brith ?? null,
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

      if (error) {
        console.log('profiles upsert error:', error.message);
        return false;
      }

      await AsyncStorage.removeItem(PENDING_PROFILE_KEY).catch(() => null);
      return true;
    } catch (e: any) {
      console.log('tryUpsertPendingProfileIfSession error:', e?.message);
      return false;
    } finally {
      savingProfileRef.current = false;
    }
  }

  async function handleConfirmedFlow(source: 'session' | 'server') {
    if (verified) return;

    setVerified(true);

    await tryUpsertPendingProfileIfSession();

    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      await sleep(250);
      await supabase.auth.signOut();
      await sleep(150);
    }

    goToLoginWithSuccess();
  }

  const runCheck = useCallback(
    async (showNotConfirmedAlert: boolean) => {
      const emailToCheck = userEmail || emailParam;

      const okSession = await checkIfVerifiedWithSession();
      if (!mountedRef.current) return;
      if (okSession) {
        await handleConfirmedFlow('session');
        return;
      }

      if (emailToCheck) {
        const okServer = await checkIfVerifiedFromServer(emailToCheck);
        if (!mountedRef.current) return;
        if (okServer) {
          await handleConfirmedFlow('server');
          return;
        }
      }

      if (showNotConfirmedAlert) {
        Alert.alert(
          i18n.t('emailNotVerifiedYet') || 'Not verified',
          i18n.t('stillNotConfirmedPleaseCheckEmail') ||
            'Still not confirmed. Please confirm in your email app.',
          [{ text: 'OK' }]
        );
      }
    },
    [userEmail, emailParam, verified, goToLoginWithSuccess]
  );

  useEffect(() => {
    mountedRef.current = true;

    let pollingInterval: ReturnType<typeof setInterval> | undefined;

    runCheck(false);

    pollingInterval = setInterval(() => {
      if (!verified) runCheck(false);
    }, 6000);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !verified) {
        runCheck(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;
      if (
        (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') &&
        session?.user &&
        isUserConfirmed(session.user) &&
        !verified
      ) {
        await handleConfirmedFlow('session');
      }
    });

    return () => {
      mountedRef.current = false;
      if (pollingInterval) clearInterval(pollingInterval);
      appStateSub.remove();
      subscription.unsubscribe();
    };
  }, [runCheck, verified]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      await runCheck(true);
    } catch (error: any) {
      Alert.alert(i18n.t('error') || 'Error', error?.message || 'Failed to check status');
    } finally {
      setChecking(false);
    }
  };

  const resendEmail = async () => {
    try {
      if (cooldown > 0) return;

      setResending(true);
      const emailToUse = userEmail || emailParam;

      if (!emailToUse) {
        Alert.alert(
          i18n.t('error') || 'Error',
          i18n.t('noEmailFound') || 'No email address found'
        );
        return;
      }

      const emailRedirectTo = Linking.createURL('confirm');

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse,
        options: { emailRedirectTo },
      });

      if (error) throw error;

      setCooldown(30);
      Alert.alert(
        i18n.t('success') || 'Success',
        i18n.t('verificationEmailResent') || 'Verification email resent.'
      );
    } catch (error: any) {
      Alert.alert(i18n.t('error') || 'Error', error?.message || 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('verifyYourEmail')}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.iconContainer}>
            {verified ? (
              <CheckCircle2 size={56} color="#FFFFFF" strokeWidth={1.8} />
            ) : (
              <Mail size={56} color="#FFFFFF" strokeWidth={1.8} />
            )}
          </View>

          <Text style={styles.title}>
            {verified ? i18n.t('emailVerified') : i18n.t('verifyYourEmail')}
          </Text>

          <Text style={styles.subtitle}>
            {verified
              ? i18n.t('redirectingToLogin') || 'Redirecting to login...'
              : i18n.t('verificationEmailSent')}
          </Text>

          {!!userEmail && !verified ? <Text style={styles.emailText}>{userEmail}</Text> : null}
        </View>

        <View style={styles.card}>
          {!verified ? (
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, styles.infoRow]}>• {i18n.t('checkEmailInbox')}</Text>
              <Text style={[styles.infoText, styles.infoRow]}>• {i18n.t('checkSpamFolder')}</Text>
              <Text style={[styles.infoText, styles.infoRow]}>• {i18n.t('autoCheckingStatus')}</Text>
              <Text style={styles.infoText}>• {i18n.t('afterConfirmOpenApp')}</Text>
            </View>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                {i18n.t('accountSuccessfullyConfirmed') || 'Your account successfully confirmed.'}
              </Text>
            </View>
          )}

          {!verified ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, (checking || resending) && styles.primaryButtonDisabled]}
                onPress={checkStatus}
                disabled={checking || resending}
                activeOpacity={0.9}
              >
                {checking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <RefreshCw size={18} color="#fff" style={styles.primaryButtonIcon} />
                    <Text style={styles.primaryButtonText}>{i18n.t('checkStatus')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, (resending || cooldown > 0) && styles.secondaryButtonDisabled]}
                onPress={resendEmail}
                disabled={resending || cooldown > 0}
                activeOpacity={0.9}
              >
                {resending ? (
                  <ActivityIndicator color={COLORS.blue} />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    {cooldown > 0 ? `${i18n.t('resendEmail')} (${cooldown}s)` : i18n.t('resendEmail')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={async () => {
                  await supabase.auth.signOut().catch(() => null);
                  router.replace('/(auth)/login' as any);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.backText}>{i18n.t('backToLogin')}</Text>
              </TouchableOpacity>

              <Text style={styles.hintText}>
                {Platform.OS === 'ios' || Platform.OS === 'android'
                  ? i18n.t('openEmailAppHint')
                  : i18n.t('openEmailWebHint')}
              </Text>
            </>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={goToLoginWithSuccess} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>
                {i18n.t('continueToLogin') || 'Continue to login'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: COLORS.text,
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    justifyContent: 'center',
  },

  heroCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: COLORS.blue,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.14)',
    left: -45,
    bottom: -80,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.10)',
    right: -35,
    top: -45,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },

  iconContainer: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  title: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.86)',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 10,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
  },

  infoBox: {
    backgroundColor: COLORS.blueSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },
  infoRow: {
    marginBottom: 8,
  },

  successBox: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    marginBottom: 14,
  },
  successText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: COLORS.success,
    textAlign: 'center' as const,
  },

  primaryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.blue,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...SHADOWS.soft,
  },
  primaryButtonIcon: {
    marginRight: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900' as const,
  },

  secondaryButton: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.blueSoft,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: '900' as const,
  },

  backButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '800' as const,
  },

  hintText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});
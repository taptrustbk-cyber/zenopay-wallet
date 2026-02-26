import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import i18n from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ remove default header
export const options = { headerShown: false };

// 🎨 white + green + black
const COLORS = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F3FBF6',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  danger: '#DC2626',
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

export default function EmailVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const emailParam = safeStr(params.email);

  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [userEmail, setUserEmail] = useState<string>(emailParam || '');
  const [resending, setResending] = useState(false);

  // prevent double redirects
  const redirectedRef = useRef(false);

  // Cooldown to avoid resend spam
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Load email if missing
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

  async function goToLoginWithSuccess() {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    router.replace({
      pathname: '/auth/login' as any,
      params: { created: '1' },
    } as any);
  }

  /**
   * ✅ New correct behavior:
   * Email verification happens by clicking the link → it opens /auth/confirm.
   * Confirm screen sets the session + saves profile + redirects to login.
   *
   * This screen only:
   * - helps the user resend / check status
   * - if user somehow already has session and confirmed, redirect to login
   */
  async function checkIfVerifiedWithSession() {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (user?.email_confirmed_at) return true;
    return false;
  }

  // ✅ Auto check (if session exists and email confirmed)
  useEffect(() => {
    let mounted = true;
    let pollingInterval: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      try {
        const ok = await checkIfVerifiedWithSession();
        if (!mounted) return;

        if (ok) {
          setVerified(true);

          // pending profile will be saved by /auth/confirm, but if user is verified already,
          // we can clean pending data to avoid keeping it
          await AsyncStorage.removeItem(PENDING_PROFILE_KEY).catch(() => null);

          await sleep(700);
          await supabase.auth.signOut();
          if (!mounted) return;
          await sleep(200);
          await goToLoginWithSuccess();
        }
      } catch (e: any) {
        console.log('verification tick error:', e?.message);
      }
    };

    tick();

    pollingInterval = setInterval(() => {
      if (!verified) tick();
    }, 4000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (session?.user?.email_confirmed_at && !verified) {
          setVerified(true);
          await AsyncStorage.removeItem(PENDING_PROFILE_KEY).catch(() => null);
          await sleep(700);
          await supabase.auth.signOut();
          if (!mounted) return;
          await sleep(200);
          await goToLoginWithSuccess();
        }
      }
    });

    return () => {
      mounted = false;
      if (pollingInterval) clearInterval(pollingInterval);
      subscription.unsubscribe();
    };
  }, [verified, router]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const ok = await checkIfVerifiedWithSession();

      if (ok) {
        setVerified(true);
        await AsyncStorage.removeItem(PENDING_PROFILE_KEY).catch(() => null);
        await sleep(700);
        await supabase.auth.signOut();
        await sleep(200);
        await goToLoginWithSuccess();
      } else {
        Alert.alert(i18n.t('emailNotVerifiedYet'), i18n.t('pleaseConfirmEmail'), [{ text: 'OK' }]);
      }
    } catch (error: any) {
      Alert.alert(i18n.t('error'), error?.message || 'Failed to check status');
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
        Alert.alert(i18n.t('error'), i18n.t('noEmailFound') || 'No email address found');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse,
        options: {
          emailRedirectTo: 'zenopay://confirm',
        },
      });

      if (error) throw error;

      setCooldown(30);
      Alert.alert(i18n.t('success'), i18n.t('verificationEmailResent'));
    } catch (error: any) {
      Alert.alert(i18n.t('error'), error?.message || 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('verifyYourEmail')}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, verified ? styles.iconContainerVerified : null]}>
            {verified ? (
              <CheckCircle2 size={56} color={COLORS.green} strokeWidth={1.8} />
            ) : (
              <Mail size={56} color={COLORS.green} strokeWidth={1.8} />
            )}
          </View>

          <Text style={styles.title}>{verified ? i18n.t('emailVerified') : i18n.t('verifyYourEmail')}</Text>

          <Text style={styles.subtitle}>
            {verified ? i18n.t('redirectingToLogin') : i18n.t('verificationEmailSent')}
          </Text>

          {!!userEmail && !verified ? <Text style={styles.emailText}>{userEmail}</Text> : null}

          {!verified ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>• {i18n.t('checkEmailInbox')}</Text>
              <Text style={styles.infoText}>• {i18n.t('checkSpamFolder')}</Text>
              <Text style={styles.infoText}>• {i18n.t('autoCheckingStatus')}</Text>
              <Text style={styles.infoText}>• {i18n.t('afterConfirmOpenApp') || 'After clicking confirm, Zenopay will open automatically.'}</Text>
            </View>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                {i18n.t('accountCreatedSuccessfully') || 'Account created successfully'}
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
                    <RefreshCw size={18} color="#fff" />
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
                  <ActivityIndicator color={COLORS.green} />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    {cooldown > 0 ? `${i18n.t('resendEmail')} (${cooldown}s)` : i18n.t('resendEmail')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={async () => {
                  await supabase.auth.signOut();
                  router.replace('/auth/login' as any);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.backText}>{i18n.t('backToLogin')}</Text>
              </TouchableOpacity>

              <Text style={styles.hintText}>
                {Platform.OS === 'ios' || Platform.OS === 'android'
                  ? i18n.t('openEmailAppHint') || 'After clicking confirm in your email, the app will open automatically.'
                  : i18n.t('openEmailWebHint') || 'Click the confirm link in your email, then return to the app.'}
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
  screen: { flex: 1, backgroundColor: COLORS.bg },

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
  headerTitle: { fontSize: 18, fontWeight: '900' as const, color: COLORS.text },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    justifyContent: 'center',
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  iconContainer: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.22)',
  },
  iconContainerVerified: {
    backgroundColor: COLORS.greenSoft,
    borderColor: 'rgba(22,163,74,0.28)',
  },

  title: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: COLORS.text,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 10,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: COLORS.text,
    textAlign: 'center' as const,
    marginBottom: 14,
  },

  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },

  successBox: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    marginBottom: 14,
  },
  successText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: COLORS.text,
    textAlign: 'center' as const,
  },

  primaryButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' as const },

  secondaryButton: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.35)',
    backgroundColor: COLORS.bg,
  },
  secondaryButtonDisabled: { opacity: 0.6 },
  secondaryButtonText: { color: COLORS.green, fontSize: 14, fontWeight: '900' as const },

  backButton: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  backText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '800' as const },

  hintText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});

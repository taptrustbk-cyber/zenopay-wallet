import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect, useRef, useMemo } from 'react';
import i18n from '@/lib/i18n';

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

type PendingProfile = {
  pending_full_name?: string;
  pending_city?: string;
  pending_country?: string;
  pending_phone?: string;
  pending_dob?: string;
};

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
  const pendingProfile: PendingProfile = useMemo(
    () => ({
      pending_full_name: safeStr(params.pending_full_name),
      pending_city: safeStr(params.pending_city),
      pending_country: safeStr(params.pending_country),
      pending_phone: safeStr(params.pending_phone),
      pending_dob: safeStr(params.pending_dob),
    }),
    [params]
  );

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

  async function finalizeProfileIfPossible() {
    // ✅ Only possible when the user has a session (signed in after clicking email confirm deep link)
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    const user = session?.user;

    if (!user) return false;

    // If email verified, and we have pending fields, save them now
    if (user.email_confirmed_at) {
      const hasPending =
        !!pendingProfile.pending_full_name ||
        !!pendingProfile.pending_city ||
        !!pendingProfile.pending_country ||
        !!pendingProfile.pending_phone ||
        !!pendingProfile.pending_dob;

      if (hasPending) {
        const payload: any = {
          id: user.id,
          email: user.email,
        };

        if (pendingProfile.pending_full_name) payload.full_name = pendingProfile.pending_full_name;
        if (pendingProfile.pending_city) payload.city = pendingProfile.pending_city;
        if (pendingProfile.pending_country) payload.country = pendingProfile.pending_country;
        if (pendingProfile.pending_phone) payload.phone = pendingProfile.pending_phone;
        if (pendingProfile.pending_dob) payload.date_of_birth = pendingProfile.pending_dob;

        const { error: upsertError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

        if (upsertError) {
          // Do NOT block the user forever; show message and continue login redirect.
          console.log('profiles upsert error:', upsertError.message);
        }
      }

      return true;
    }

    return false;
  }

  async function goToLoginWithSuccess() {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    // ✅ show success message on login screen
    router.replace({
      pathname: '/(auth)/login' as any,
      params: {
        created: '1',
      },
    } as any);
  }

  // ✅ Auto check verification (works when user comes back to app via deep link and is signed-in)
  useEffect(() => {
    let mounted = true;
    let pollingInterval: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      try {
        // Try finalize with session
        const ok = await finalizeProfileIfPossible();
        if (!mounted) return;

        if (ok) {
          setVerified(true);

          // Optional: small pause then sign out and go login
          await sleep(900);
          await supabase.auth.signOut();

          if (!mounted) return;
          await sleep(300);
          await goToLoginWithSuccess();
        }
      } catch (e: any) {
        console.log('verification tick error:', e?.message);
      }
    };

    // Run once quickly
    tick();

    pollingInterval = setInterval(() => {
      if (!verified) tick();
    }, 4000);

    // Listen to auth changes (best for deep-link confirmed flows)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // After email confirm deep link, many times you get SIGNED_IN or USER_UPDATED
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (session?.user?.email_confirmed_at && !verified) {
          const ok = await finalizeProfileIfPossible();
          if (!mounted) return;
          if (ok) {
            setVerified(true);
            await sleep(900);
            await supabase.auth.signOut();
            if (!mounted) return;
            await sleep(300);
            await goToLoginWithSuccess();
          }
        }
      }
    });

    return () => {
      mounted = false;
      if (pollingInterval) clearInterval(pollingInterval);
      subscription.unsubscribe();
    };
  }, [verified, pendingProfile, router]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const ok = await finalizeProfileIfPossible();

      if (ok) {
        setVerified(true);
        await sleep(900);
        await supabase.auth.signOut();
        await sleep(300);
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

      setCooldown(30); // 30 sec cooldown
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

          <Text style={styles.title}>
            {verified ? i18n.t('emailVerified') : i18n.t('verifyYourEmail')}
          </Text>

          <Text style={styles.subtitle}>
            {verified ? i18n.t('redirectingToLogin') : i18n.t('verificationEmailSent')}
          </Text>

          {!!userEmail && !verified ? <Text style={styles.emailText}>{userEmail}</Text> : null}

          {!verified ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>• {i18n.t('checkEmailInbox')}</Text>
              <Text style={styles.infoText}>• {i18n.t('checkSpamFolder')}</Text>
              <Text style={styles.infoText}>• {i18n.t('autoCheckingStatus')}</Text>
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
                style={[
                  styles.secondaryButton,
                  (resending || cooldown > 0) && styles.secondaryButtonDisabled,
                ]}
                onPress={resendEmail}
                disabled={resending || cooldown > 0}
                activeOpacity={0.9}
              >
                {resending ? (
                  <ActivityIndicator color={COLORS.green} />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    {cooldown > 0
                      ? `${i18n.t('resendEmail')} (${cooldown}s)`
                      : i18n.t('resendEmail')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={async () => {
                  await supabase.auth.signOut();
                  router.replace('/(auth)/login' as any);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.backText}>{i18n.t('backToLogin')}</Text>
              </TouchableOpacity>

              <Text style={styles.hintText}>
                {Platform.OS === 'ios' || Platform.OS === 'android'
                  ? i18n.t('openEmailAppHint') || 'After clicking confirm in your email, you will return here automatically.'
                  : i18n.t('openEmailWebHint') || 'Click the confirm link in your email, then return here to continue.'}
              </Text>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={goToLoginWithSuccess}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>{i18n.t('continueToLogin') || 'Continue to login'}</Text>
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

import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react-native';
import * as ExpoLinking from 'expo-linking';
import { supabase } from '@/lib/supabase';
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
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  danger: '#DC2626',
};

function safeStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

type PendingProfile = {
  email?: string;
  full_name?: string;
  city?: string;
  country?: string;
  phone?: string;
  date_of_birth?: string;
};

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const onceRef = useRef(false);
  const redirectedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');

  // read possible params (sometimes they come as query, sometimes not)
  const localParams = useMemo(() => {
    return {
      code: safeStr(params.code),
      token_hash: safeStr(params.token_hash),
      type: safeStr(params.type), // usually "signup"
      access_token: safeStr(params.access_token),
      refresh_token: safeStr(params.refresh_token),
    };
  }, [params]);

  const goAccountCreated = (pending?: PendingProfile) => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    router.replace({
      pathname: '/(auth)/account-created' as any,
      params: {
        // pass pending fields if we have them (optional)
        pending_full_name: pending?.full_name || '',
        pending_city: pending?.city || '',
        pending_country: pending?.country || '',
        pending_phone: pending?.phone || '',
        pending_dob: pending?.date_of_birth || '',
      },
    } as any);
  };

  const tryUpsertProfile = async (pending?: PendingProfile) => {
    if (!pending) return;

    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) return;

    const hasAny =
      !!pending.full_name || !!pending.city || !!pending.country || !!pending.phone || !!pending.date_of_birth;

    if (!hasAny) return;

    const payload: any = {
      id: user.id,
      email: user.email,
    };

    if (pending.full_name) payload.full_name = pending.full_name;
    if (pending.city) payload.city = pending.city;
    if (pending.country) payload.country = pending.country;
    if (pending.phone) payload.phone = pending.phone;
    if (pending.date_of_birth) payload.date_of_birth = pending.date_of_birth;

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      // don’t block user; just show note in console
      console.log('profiles upsert error:', error.message);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (onceRef.current) return;
      onceRef.current = true;

      try {
        setStatus('loading');
        setMessage(i18n.t('confirmingEmail') || 'Confirming your email...');

        // 1) Try to get full URL (sometimes tokens are in the URL fragment)
        let merged = { ...localParams } as any;

        const initialUrl = await ExpoLinking.getInitialURL();
        if (initialUrl) {
          const parsed = ExpoLinking.parse(initialUrl);
          const q = (parsed.queryParams || {}) as Record<string, any>;

          merged.code = merged.code || safeStr(q.code);
          merged.token_hash = merged.token_hash || safeStr(q.token_hash);
          merged.type = merged.type || safeStr(q.type);
          merged.access_token = merged.access_token || safeStr(q.access_token);
          merged.refresh_token = merged.refresh_token || safeStr(q.refresh_token);
        }

        // 2) Establish session from the link (support multiple Supabase link formats)
        if (merged.access_token && merged.refresh_token) {
          setMessage(i18n.t('signingYouIn') || 'Signing you in...');
          const { error } = await supabase.auth.setSession({
            access_token: merged.access_token,
            refresh_token: merged.refresh_token,
          });
          if (error) throw error;
        } else if (merged.code) {
          setMessage(i18n.t('signingYouIn') || 'Signing you in...');
          const { error } = await supabase.auth.exchangeCodeForSession(merged.code);
          if (error) throw error;
        } else if (merged.token_hash && merged.type) {
          setMessage(i18n.t('verifyingLink') || 'Verifying link...');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: merged.token_hash,
            type: merged.type as any, // usually "signup"
          });
          if (error) throw error;
        } else {
          // If no params, maybe session already exists
          const { data } = await supabase.auth.getSession();
          if (!data?.session) {
            throw new Error('Missing confirmation parameters. Please open the confirm link again.');
          }
        }

        // 3) Get pending profile info (optional)
        // ✅ Recommended: from CreateAccount, set this global variable before navigating to email verification:
        // (globalThis as any).__ZENO_PENDING_PROFILE__ = { full_name, city, country, phone, date_of_birth, email }
        const pending = ((globalThis as any).__ZENO_PENDING_PROFILE__ || null) as PendingProfile | null;

        // 4) Save profile now that we have a session (RLS allowed)
        setMessage(i18n.t('preparingAccount') || 'Preparing your account...');
        await tryUpsertProfile(pending || undefined);

        // 5) Clear pending to avoid reuse
        if ((globalThis as any).__ZENO_PENDING_PROFILE__) {
          delete (globalThis as any).__ZENO_PENDING_PROFILE__;
        }

        setStatus('success');
        setMessage(i18n.t('emailVerified') || 'Email verified successfully');

        // 6) Go to account created screen
        setTimeout(() => {
          goAccountCreated(pending || undefined);
        }, 650);
      } catch (e: any) {
        setStatus('error');
        setErrorText(e?.message || 'Verification failed');
      }
    };

    run();
  }, [localParams, router]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('confirmEmail') || 'Confirm Email'}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, status === 'error' && styles.iconWrapError]}>
            {status === 'loading' ? (
              <ShieldCheck size={56} color={COLORS.green} strokeWidth={1.8} />
            ) : status === 'success' ? (
              <CheckCircle2 size={56} color={COLORS.green} strokeWidth={1.8} />
            ) : (
              <XCircle size={56} color={COLORS.danger} strokeWidth={1.8} />
            )}
          </View>

          <Text style={styles.title}>
            {status === 'loading'
              ? i18n.t('workingOnIt') || 'Working on it...'
              : status === 'success'
              ? i18n.t('success') || 'Success'
              : i18n.t('error') || 'Error'}
          </Text>

          {status === 'error' ? (
            <Text style={styles.subtitleError}>{errorText}</Text>
          ) : (
            <Text style={styles.subtitle}>{message}</Text>
          )}

          {status === 'loading' ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>{i18n.t('pleaseWait') || 'Please wait...'}</Text>
            </View>
          ) : null}

          {status === 'error' ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/(auth)/login' as any)}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonText}>{i18n.t('goToLogin') || 'Go to Login'}</Text>
              </TouchableOpacity>

              <Text style={styles.hintText}>
                {Platform.OS === 'ios' || Platform.OS === 'android'
                  ? i18n.t('openEmailAgainHint') || 'Open the confirm link again from your email.'
                  : i18n.t('openEmailAgainHintWeb') || 'Open the confirm link again from your email, then return here.'}
              </Text>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, status !== 'success' && styles.primaryButtonDisabled]}
              disabled={status !== 'success'}
              onPress={() => router.replace('/(auth)/account-created' as any)}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>
                {i18n.t('continue') || 'Continue'}
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

  container: { flex: 1, paddingHorizontal: 20, paddingTop: 18, justifyContent: 'center' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  iconWrap: {
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    marginBottom: 14,
  },
  iconWrapError: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(220,38,38,0.25)',
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
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 12,
  },
  subtitleError: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: COLORS.danger,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 12,
  },

  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 },
  loadingText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' as const },

  primaryButton: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' as const },

  hintText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});

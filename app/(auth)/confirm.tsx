import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as ExpoLinking from 'expo-linking';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/lib/i18n';

export const options = { headerShown: false };

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

const PENDING_PROFILE_KEY = 'zenopay_pending_profile_v1';

function safeStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

// Some providers put tokens in #hash, some in ?query
function parseAllParams(url: string) {
  const out: Record<string, string> = {};
  const [beforeHash, hashPart] = url.split('#');

  const qIndex = beforeHash.indexOf('?');
  if (qIndex !== -1) {
    const qs = beforeHash.slice(qIndex + 1);
    const sp = new URLSearchParams(qs);
    sp.forEach((v, k) => (out[k] = v));
  }

  if (hashPart) {
    const sp = new URLSearchParams(hashPart);
    sp.forEach((v, k) => (out[k] = v));
  }

  return out;
}

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState(i18n.t('confirmingEmail') || 'Confirming your email...');
  const [errorText, setErrorText] = useState('');

  // Prevent running the same confirmation twice
  const doneRef = useRef(false);

  // Local route params (sometimes Expo Router puts them here)
  const local = useMemo(() => {
    return {
      code: safeStr(params.code),
      token_hash: safeStr(params.token_hash),
      type: safeStr(params.type),
      access_token: safeStr(params.access_token),
      refresh_token: safeStr(params.refresh_token),
    };
  }, [params]);

  async function ensureSessionFromMerged(merged: Record<string, string>) {
    // 1) Create session from link
    if (merged.access_token && merged.refresh_token) {
      setMessage(i18n.t('signingYouIn') || 'Signing you in...');
      const { error } = await supabase.auth.setSession({
        access_token: merged.access_token,
        refresh_token: merged.refresh_token,
      });
      if (error) throw error;
      return;
    }

    if (merged.code) {
      setMessage(i18n.t('signingYouIn') || 'Signing you in...');
      const { error } = await supabase.auth.exchangeCodeForSession(merged.code);
      if (error) throw error;
      return;
    }

    if (merged.token_hash && merged.type) {
      setMessage(i18n.t('verifyingLink') || 'Verifying link...');
      const { error } = await supabase.auth.verifyOtp({
        token_hash: merged.token_hash,
        type: merged.type as any,
      } as any);
      if (error) throw error;
      return;
    }

    // If no params, maybe session already exists
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      throw new Error(
        i18n.t('missingConfirmParams') ||
          'Missing confirmation parameters. Please open the confirm link again.'
      );
    }
  }

  async function upsertProfileFromPending() {
    setMessage(i18n.t('preparingAccount') || 'Preparing your account...');

    const raw = await AsyncStorage.getItem(PENDING_PROFILE_KEY);
    const pending = raw ? JSON.parse(raw) : null;

    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;

    if (!user) return;

    // If no pending profile, still succeed (maybe user confirmed from another device)
    if (!pending) return;

    // ✅ FIX: accept both spellings, but store using your DB column name "date_of_brith"
    const dob =
      pending.date_of_brith ?? pending.date_of_birth ?? pending.dob ?? null;

    const payload: any = {
      id: user.id,
      email: user.email,
      full_name: pending.full_name ?? null,
      city: pending.city ?? null,
      country: pending.country ?? null,
      phone: pending.phone ?? null,

      // ✅ FIX: match YOUR column typo
      date_of_brith: dob,
    };

    const { error: upsertError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (upsertError) {
      console.log('Profile upsert error:', upsertError.message);
      // don’t throw; still allow login flow
    }

    await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
  }

  async function finalizeAndGoLogin() {
    setState('success');
    setMessage(i18n.t('accountCreatedSuccessfully') || 'Account successfully created');

    setTimeout(async () => {
      await supabase.auth.signOut();
      router.replace({
        pathname: '/auth/login' as any,
        params: { created: '1' },
      } as any);
    }, 1200);
  }

  async function runConfirmFlow(urlFromEvent?: string | null) {
    if (doneRef.current) return;

    try {
      setState('loading');
      setErrorText('');
      setMessage(i18n.t('confirmingEmail') || 'Confirming your email...');

      // Merge params from:
      // - event URL (if provided)
      // - initial URL (cold start)
      // - router params (expo-router)
      let merged: Record<string, string> = { ...local } as any;

      if (urlFromEvent) {
        const all = parseAllParams(urlFromEvent);
        merged = { ...all, ...merged };
      } else {
        const initialUrl = await ExpoLinking.getInitialURL();
        if (initialUrl) {
          const all = parseAllParams(initialUrl);
          merged = { ...all, ...merged };
        }
      }

      await ensureSessionFromMerged(merged);
      await upsertProfileFromPending();

      doneRef.current = true;
      await finalizeAndGoLogin();
    } catch (e: any) {
      setState('error');
      setErrorText(e?.message || 'Verification failed');
    }
  }

  useEffect(() => {
    // Run once for cold start
    runConfirmFlow(null);

    // ✅ FIX: also handle links when app is already open
    const sub = ExpoLinking.addEventListener('url', (event) => {
      // If confirmation already finished, ignore
      if (doneRef.current) return;
      runConfirmFlow(event?.url ?? null);
    });

    return () => {
      sub?.remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('confirmEmail') || 'Confirm Email'}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, state === 'error' && styles.iconWrapError]}>
            {state === 'success' ? (
              <CheckCircle2 size={62} color={COLORS.green} strokeWidth={1.8} />
            ) : state === 'error' ? (
              <XCircle size={62} color={COLORS.danger} strokeWidth={1.8} />
            ) : (
              <ActivityIndicator />
            )}
          </View>

          <Text style={styles.title}>
            {state === 'success'
              ? (i18n.t('success') || 'Success')
              : state === 'error'
              ? (i18n.t('error') || 'Error')
              : (i18n.t('workingOnIt') || 'Working on it...')}
          </Text>

          {state === 'error' ? (
            <Text style={styles.subtitleError}>{errorText}</Text>
          ) : (
            <Text style={styles.subtitle}>{message}</Text>
          )}

          {state === 'error' ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/auth/login' as any)}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>{i18n.t('backToLogin') || 'Back to Login'}</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.hintText}>
            {Platform.OS === 'web'
              ? (i18n.t('webConfirmHint') || 'If you confirmed on web, return to the app.')
              : (i18n.t('mobileConfirmHint') || 'After confirming, Zenopay verifies automatically.')}
          </Text>
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
  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border },

  iconWrap: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    marginBottom: 14,
  },
  iconWrapError: { backgroundColor: '#FEF2F2', borderColor: 'rgba(220,38,38,0.25)' },

  title: { fontSize: 22, fontWeight: '900' as const, color: COLORS.text, textAlign: 'center' as const, marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '800' as const, color: COLORS.textSecondary, textAlign: 'center' as const, lineHeight: 20 },
  subtitleError: { fontSize: 13, fontWeight: '900' as const, color: COLORS.danger, textAlign: 'center' as const, lineHeight: 20 },

  primaryButton: { backgroundColor: COLORS.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' as const },

  hintText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' as const, textAlign: 'center' as const, lineHeight: 18 },
});

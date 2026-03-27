import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import i18n from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

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
  success: '#16A34A',
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

const PENDING_PROFILE_KEY = 'zenopay_pending_profile_v3';
const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

function safeStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function maskEmail(email: string) {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;

  const name = parts[0];
  const domain = parts[1];

  if (name.length <= 2) return `${name[0] || ''}***@${domain}`;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

type PendingProfile = {
  email?: string;
  password?: string;
  full_name?: string;
  city?: string;
  country?: string;
  phone?: string;
  gender?: string;
  date_of_brith?: string;
  pending_profile_created_at?: string;
};

function t(key: string, fallback: string) {
  const value = i18n.t(key) as string;
  if (!value) return fallback;

  const lower = String(value).toLowerCase();
  if (
    lower.includes('missing "') ||
    lower.includes('missing translation') ||
    lower === key.toLowerCase()
  ) {
    return fallback;
  }

  return value;
}

export default function EmailVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const email = safeStr(params.email).trim().toLowerCase();
  const mode = safeStr(params.mode) || 'signup';

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [autoFocusing, setAutoFocusing] = useState(false);

  const hiddenInputRef = useRef<TextInput>(null);
  const didAutoFocusRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (didAutoFocusRef.current) return;
    didAutoFocusRef.current = true;

    const timer = setTimeout(() => {
      setAutoFocusing(true);
      hiddenInputRef.current?.focus();
      setTimeout(() => setAutoFocusing(false), 400);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  const handleCodeChange = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, '').slice(0, CODE_LENGTH);
    setCode(digitsOnly);
  };

  const focusCodeInput = () => {
    hiddenInputRef.current?.focus();
  };

  async function getPendingProfile(): Promise<PendingProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function clearPendingProfile() {
    try {
      await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
    } catch {
      // ignore
    }
  }

  async function upsertPendingProfileForCurrentUser() {
    const pending = await getPendingProfile();
    if (!pending) {
      throw new Error(
        t(
          'auth.pendingProfileNotFound',
          'Your temporary signup data was not found. Please create your account again.'
        )
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user;
    if (!user?.id) {
      throw new Error(
        t(
          'auth.sessionNotFoundAfterVerification',
          'Could not create a session after verification. Please try again.'
        )
      );
    }

    const payload = {
      id: user.id,
      email: user.email ?? pending.email ?? null,
      full_name: pending.full_name ?? null,
      city: pending.city ?? null,
      country: pending.country ?? null,
      phone: pending.phone ?? null,
      gender: pending.gender ?? null,
      date_of_brith: pending.date_of_brith ?? null,
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    await clearPendingProfile();
  }

  function getOtpErrorMessage(error: unknown) {
    const fallback = t('common.somethingWentWrong', 'Something went wrong');

    if (!error || typeof error !== 'object') return fallback;

    const message = String((error as any)?.message || '');
    const lower = message.toLowerCase();

    if (
      lower.includes('invalid token') ||
      lower.includes('otp') ||
      lower.includes('token') ||
      lower.includes('code verifier') ||
      lower.includes('verification code')
    ) {
      if (
        lower.includes('expired') ||
        lower.includes('token has expired') ||
        lower.includes('otp_expired')
      ) {
        return t(
          'auth.verificationCodeExpired',
          'This verification code has expired. Please request a new one.'
        );
      }

      return t(
        'auth.invalidVerificationCode',
        'Incorrect code. Please try again and enter the correct 6-digit code.'
      );
    }

    return message || fallback;
  }

  const verifyCode = async () => {
    if (!email) {
      Alert.alert(
        t('common.error', 'Error'),
        t('auth.missingEmail', 'Email is missing')
      );
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert(
        t('common.error', 'Error'),
        t('auth.invalidEmail', 'Invalid email')
      );
      return;
    }

    if (code.length !== CODE_LENGTH) {
      Alert.alert(
        t('common.error', 'Error'),
        t('auth.enterSixDigitCode', 'Please enter the 6-digit verification code')
      );
      return;
    }

    setVerifying(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });

      if (error) {
        Alert.alert(t('common.error', 'Error'), getOtpErrorMessage(error));
        return;
      }

      await upsertPendingProfileForCurrentUser();

      await supabase.auth.signOut().catch(() => null);

      Alert.alert(
        t('common.success', 'Success'),
        t(
          'auth.accountSuccessfullyConfirmed',
          'Your account has been successfully confirmed.'
        ),
        [
          {
            text: t('common.ok', 'OK'),
            onPress: () => {
              router.replace({
                pathname: '/(auth)/login' as any,
                params: {
                  confirmed: '1',
                  email,
                },
              } as any);
            },
          },
        ]
      );
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as any).message || '')
          : t('common.somethingWentWrong', 'Something went wrong');

      Alert.alert(t('common.error', 'Error'), message);
    } finally {
      setVerifying(false);
    }
  };

  const resendCode = async () => {
    if (!email) {
      Alert.alert(
        t('common.error', 'Error'),
        t('auth.missingEmail', 'Email is missing')
      );
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert(
        t('common.error', 'Error'),
        t('auth.invalidEmail', 'Invalid email')
      );
      return;
    }

    if (cooldown > 0) return;

    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode('');

      Alert.alert(
        t('common.success', 'Success'),
        t(
          'auth.newVerificationCodeSent',
          'A new 6-digit verification code has been sent to your email.'
        )
      );
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as any).message || '')
          : t('common.somethingWentWrong', 'Something went wrong');

      Alert.alert(t('common.error', 'Error'), message);
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backIconBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.blueDark} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {t('auth.verifyYourEmail', 'Verify Your Email')}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={30} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>
            {t('auth.enterVerificationCode', 'Enter Verification Code')}
          </Text>

          <Text style={styles.description}>
            {t(
              'auth.verificationCodeDesc',
              'Enter the 6-digit verification code we sent to your email address.'
            )}
          </Text>

          {!!maskedEmail ? <Text style={styles.emailText}>{maskedEmail}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>
            {t('auth.verificationCode', 'Verification Code')}
          </Text>

          <Pressable onPress={focusCodeInput} style={styles.codeWrap}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => {
              const digit = code[index] || '';
              const isActive =
                (index === code.length && code.length < CODE_LENGTH) ||
                (code.length === CODE_LENGTH && index === CODE_LENGTH - 1 && autoFocusing);

              return (
                <View
                  key={index}
                  style={[
                    styles.codeBox,
                    digit ? styles.codeBoxFilled : null,
                    isActive ? styles.codeBoxActive : null,
                  ]}
                >
                  <Text style={styles.codeDigit}>{digit}</Text>
                </View>
              );
            })}

            <TextInput
              ref={hiddenInputRef}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              importantForAutofill="yes"
              maxLength={CODE_LENGTH}
              style={styles.hiddenInput}
              autoFocus={false}
            />
          </Pressable>

          <Text style={styles.hintText}>
            {t(
              'auth.enterSixDigitCodeHint',
              'Please enter the 6-digit code sent to your email.'
            )}
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, verifying && styles.primaryButtonDisabled]}
            onPress={verifyCode}
            disabled={verifying}
            activeOpacity={0.9}
          >
            {verifying ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {t('auth.confirmAccount', 'Confirm Account')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (resending || cooldown > 0) && styles.secondaryButtonDisabled,
            ]}
            onPress={resendCode}
            disabled={resending || cooldown > 0}
            activeOpacity={0.9}
          >
            {resending ? (
              <ActivityIndicator color={COLORS.blue} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color={COLORS.blueDark} />
                <Text style={styles.secondaryButtonText}>
                  {cooldown > 0
                    ? `${t('auth.resendCode', 'Resend Code')} (${cooldown}s)`
                    : t('auth.resendCodeToEmail', 'Resend Code to Email')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.9}
          >
            <Text style={styles.backText}>
              {t('auth.backToCreateAccount', 'Back')}
            </Text>
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>
              {t('common.important', 'Important')}
            </Text>

            <Text style={styles.helpText}>
              {t(
                'auth.verifyCodeHelpText',
                'If the code is incorrect or expired, request a new code and try again.'
              )}
            </Text>

            <View style={styles.supportRow}>
              <View style={styles.supportIconWrap}>
                <Ionicons name="mail-outline" size={18} color={COLORS.blue} />
              </View>

              <View style={styles.supportTextWrap}>
                <Text style={styles.supportTextTop}>
                  {t(
                    'auth.needHelpVerifyCode',
                    'Need help with the verification code? Contact support.'
                  )}
                </Text>
                <Text style={styles.supportEmail}>info@zenopay.bond</Text>
              </View>
            </View>

            {mode === 'signup' ? (
              <Text style={styles.bottomInfoText}>
                {t(
                  'auth.signupProfileSaveAfterVerify',
                  'Your account information will be saved only after the verification code is confirmed successfully.'
                )}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 24 : 18,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 28 : 18,
    paddingBottom: 16,
  },
  backIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },

  heroCard: {
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: COLORS.blue,
    ...SHADOWS.card,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
    left: -55,
    bottom: -70,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.10)',
    right: -40,
    top: -40,
  },
  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 21,
  },
  emailText: {
    marginTop: 10,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 10,
  },

  codeWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    position: 'relative',
  },
  codeBox: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  codeBoxFilled: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.blueSoft,
  },
  codeBoxActive: {
    borderColor: COLORS.blueDark,
  },
  codeDigit: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },

  hintText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },

  primaryButton: {
    backgroundColor: COLORS.blue,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    ...SHADOWS.soft,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },

  secondaryButton: {
    backgroundColor: COLORS.blueSoft,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.blueDark,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButtonDisabled: {
    opacity: 0.65,
  },

  backButton: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  backText: {
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  helpBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },

  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  supportTextWrap: {
    flexShrink: 1,
  },
  supportTextTop: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
    fontWeight: '700',
  },
  supportEmail: {
    marginTop: 2,
    fontSize: 13.5,
    color: COLORS.blue,
    fontWeight: '900',
  },
  bottomInfoText: {
    marginTop: 14,
    fontSize: 12.5,
    lineHeight: 19,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
});
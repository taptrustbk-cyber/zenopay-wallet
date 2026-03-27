import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useState, useRef } from 'react';
import i18n from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#D9E5F6',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  white: '#FFFFFF',
  success: '#16A34A',
  successSoft: '#EAF8EF',
  danger: '#DC2626',
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
const CODE_LENGTH = 6;

type PendingProfile = {
  email?: string;
  full_name?: string;
  city?: string;
  country?: string;
  phone?: string;
  gender?: string;
  date_of_brith?: string;
  pending_profile_created_at?: string;
};

function safeStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function EmailVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const emailParam = safeStr(params.email).trim().toLowerCase();

  const [userEmail] = useState<string>(emailParam || '');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const hiddenInputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const maskedEmail = userEmail
    ? userEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => {
        const hidden = String(b || '')
          .split('')
          .map(() => '*')
          .join('');
        return `${a}${hidden}${c}`;
      })
    : '';

  const handleCodeChange = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, '').slice(0, CODE_LENGTH);
    setCode(digitsOnly);
  };

  const focusCodeInput = () => {
    hiddenInputRef.current?.focus();
  };

  async function applyPendingProfileIfExists() {
    const pendingRaw = await AsyncStorage.getItem(PENDING_PROFILE_KEY);
    if (!pendingRaw) return;

    const pending: PendingProfile | null = JSON.parse(pendingRaw);
    if (!pending) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) return;

    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        full_name: pending.full_name ?? null,
        city: pending.city ?? null,
        country: pending.country ?? null,
        phone: pending.phone ?? null,
        gender: pending.gender ?? null,
        date_of_brith: pending.date_of_brith ?? null,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.log('profiles upsert error:', error.message);
      return;
    }

    await AsyncStorage.removeItem(PENDING_PROFILE_KEY).catch(() => null);
  }

  const verifyCode = async () => {
    const cleanEmail = userEmail.trim().toLowerCase();
    const cleanCode = code.replace(/[^\d]/g, '');

    if (!cleanEmail) {
      Alert.alert(
        i18n.t('error') || 'Error',
        i18n.t('missingEmail') || 'Email is missing'
      );
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert(
        i18n.t('error') || 'Error',
        i18n.t('invalidEmail') || 'Invalid email'
      );
      return;
    }

    if (cleanCode.length !== CODE_LENGTH) {
      Alert.alert(
        i18n.t('error') || 'Error',
        i18n.t('enterSixDigitCode') || 'Please enter the 6-digit verification code'
      );
      return;
    }

    try {
      setVerifying(true);

      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'signup',
      });

      if (error) {
        const msg = String(error.message || '').toLowerCase();

        if (
          msg.includes('expired') ||
          msg.includes('otp_expired') ||
          msg.includes('token has expired')
        ) {
          Alert.alert(
            i18n.t('error') || 'Error',
            i18n.t('verificationCodeExpired') ||
              'This code has expired. Please request a new one.'
          );
          return;
        }

        if (
          msg.includes('invalid') ||
          msg.includes('token') ||
          msg.includes('otp')
        ) {
          Alert.alert(
            i18n.t('error') || 'Error',
            i18n.t('invalidVerificationCode') ||
              'The verification code is invalid.'
          );
          return;
        }

        throw error;
      }

      if (!data?.session?.user && !data?.user) {
        Alert.alert(
          i18n.t('error') || 'Error',
          i18n.t('somethingWentWrong') || 'Something went wrong'
        );
        return;
      }

      await applyPendingProfileIfExists();

      Alert.alert(
        i18n.t('success') || 'Success',
        i18n.t('accountSuccessfullyConfirmed') ||
          'Your account has been successfully confirmed.',
        [
          {
            text: i18n.t('continueToLogin') || 'Continue to login',
            onPress: async () => {
              await supabase.auth.signOut().catch(() => null);
              router.replace('/(auth)/login' as any);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        i18n.t('error') || 'Error',
        error?.message || i18n.t('somethingWentWrong') || 'Something went wrong'
      );
    } finally {
      setVerifying(false);
    }
  };

  const resendCode = async () => {
    const cleanEmail = userEmail.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        i18n.t('error') || 'Error',
        i18n.t('noEmailFound') || 'No email address found'
      );
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert(
        i18n.t('error') || 'Error',
        i18n.t('invalidEmail') || 'Invalid email'
      );
      return;
    }

    if (cooldown > 0) return;

    try {
      setResending(true);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });

      if (error) throw error;

      setCooldown(30);

      Alert.alert(
        i18n.t('success') || 'Success',
        i18n.t('newVerificationCodeSent') ||
          'A new 6-digit verification code has been sent to your email.'
      );
    } catch (error: any) {
      Alert.alert(
        i18n.t('error') || 'Error',
        error?.message || i18n.t('somethingWentWrong') || 'Something went wrong'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={[COLORS.bg, COLORS.page, COLORS.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topGlowOne} />
        <View style={styles.topGlowTwo} />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backIconBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.blueDark} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{i18n.t('verifyYourEmail')}</Text>

          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerWrap}>
            <LinearGradient
              colors={['#4B8DFF', '#2563EB', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />

              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={30} color="#FFFFFF" />
              </View>

              <Text style={styles.title}>{i18n.t('verifyYourEmail')}</Text>

              <Text style={styles.description}>
                {i18n.t('verificationCodeDesc') ||
                  'Enter the 6-digit code we sent to your email address.'}
              </Text>

              {!!maskedEmail ? <Text style={styles.emailText}>{maskedEmail}</Text> : null}
            </LinearGradient>

            <View style={styles.card}>
              <Text style={styles.label}>
                {i18n.t('verificationCode') || 'Verification Code'}
              </Text>

              <Pressable onPress={focusCodeInput} style={styles.codeWrap}>
                {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                  const digit = code[index] || '';
                  const isActive = index === code.length && code.length < CODE_LENGTH;

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
                />
              </Pressable>

              <Text style={styles.hintText}>
                {i18n.t('enterSixDigitCodeHint') ||
                  'Please enter the 6-digit code sent to your email.'}
              </Text>

              <View style={styles.infoBox}>
                <Text style={[styles.infoText, styles.infoRow]}>
                  • {i18n.t('checkEmailInbox') || 'Check your email inbox'}
                </Text>
                <Text style={[styles.infoText, styles.infoRow]}>
                  • {i18n.t('checkSpamFolder') || 'Check spam folder if not found'}
                </Text>
                <Text style={styles.infoText}>
                  • {i18n.t('verifyCodeHelpText') ||
                    'If the code is wrong or expired, request a new code and try again.'}
                </Text>
              </View>

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
                      {i18n.t('verifyCode') || 'Verify Code'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, (resending || cooldown > 0) && styles.secondaryButtonDisabled]}
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
                        ? `${i18n.t('resendCode') || 'Resend Code'} (${cooldown}s)`
                        : i18n.t('resendCode') || 'Resend Code'}
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
                  {i18n.t('backToLogin') || 'Back to Login'}
                </Text>
              </TouchableOpacity>

              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>
                  {i18n.t('needHelp') || 'Need Help?'}
                </Text>

                <View style={styles.supportRow}>
                  <View style={styles.supportIconWrap}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.blue} />
                  </View>

                  <View style={styles.supportTextWrap}>
                    <Text style={styles.supportTextTop}>
                      {i18n.t('contactUsAt') || 'Contact us at'}
                    </Text>
                    <Text style={styles.supportEmail}>info@zenopay.bond</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  gradient: {
    flex: 1,
  },

  topGlowOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37,99,235,0.08)',
    top: -40,
    left: -70,
  },

  topGlowTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(37,99,235,0.06)',
    top: 90,
    right: -50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  backIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: COLORS.text,
  },
  headerRightSpacer: {
    width: 44,
    height: 44,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },

  centerWrap: {
    flex: 1,
    justifyContent: 'center',
  },

  heroCard: {
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
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
    fontWeight: '900' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },

  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    fontWeight: '700' as const,
    lineHeight: 21,
  },

  emailText: {
    marginTop: 10,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900' as const,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },

  label: {
    fontSize: 14,
    fontWeight: '900' as const,
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
    backgroundColor: COLORS.cardSoft,
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
    fontWeight: '900' as const,
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
    fontWeight: '700' as const,
    textAlign: 'center',
  },

  infoBox: {
    backgroundColor: COLORS.blueSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 14,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },
  infoRow: {
    marginBottom: 8,
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
    fontWeight: '900' as const,
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
    fontWeight: '900' as const,
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
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '800' as const,
  },

  helpBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
  },

  helpTitle: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
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
    fontWeight: '700' as const,
  },

  supportEmail: {
    marginTop: 2,
    fontSize: 13.5,
    color: COLORS.blue,
    fontWeight: '900' as const,
  },
});
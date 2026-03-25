import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  I18nManager,
  Pressable,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';
import { LinearGradient } from 'expo-linear-gradient';

const CODE_LENGTH = 6;

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
  blueSoft2: '#DCEBFF',

  white: '#FFFFFF',
  success: '#16A34A',
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

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function VerifyResetCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const isRTL = I18nManager.isRTL;

  const email = String(params?.email || '').trim().toLowerCase();
  const [code, setCode] = useState('');
  const hiddenInputRef = useRef<TextInput>(null);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.replace(/[^\d]/g, '');

      if (!cleanEmail) {
        throw new Error(i18n.t('missingEmail') || 'Email is missing');
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error(i18n.t('invalidEmail') || 'Invalid email');
      }

      if (cleanCode.length !== CODE_LENGTH) {
        throw new Error(
          i18n.t('enterSixDigitCode') || 'Please enter the 6-digit verification code'
        );
      }

      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'recovery',
      });

      if (error) throw error;
      return { cleanEmail };
    },
    onSuccess: ({ cleanEmail }) => {
      router.replace({
        pathname: '/(auth)/reset-password' as any,
        params: { email: cleanEmail },
      });
    },
    onError: (error: any) => {
      const msg = String(error?.message || '').toLowerCase();

      if (
        msg.includes('expired') ||
        msg.includes('otp_expired') ||
        msg.includes('token has expired')
      ) {
        Alert.alert(
          i18n.t('error') || 'Error',
          i18n.t('verificationCodeExpired') || 'This code has expired. Please request a new one.'
        );
        return;
      }

      if (
        msg.includes('invalid') ||
        msg.includes('otp') ||
        msg.includes('token')
      ) {
        Alert.alert(
          i18n.t('error') || 'Error',
          i18n.t('invalidVerificationCode') || 'The verification code is invalid.'
        );
        return;
      }

      Alert.alert(
        i18n.t('error') || 'Error',
        error?.message || i18n.t('somethingWentWrong') || 'Something went wrong'
      );
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        throw new Error(i18n.t('missingEmail') || 'Email is missing');
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error(i18n.t('invalidEmail') || 'Invalid email');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert(
        i18n.t('success') || 'Success',
        i18n.t('newVerificationCodeSent') ||
          'A new 6-digit verification code has been sent to your email.'
      );
    },
    onError: (error: any) => {
      Alert.alert(
        i18n.t('error') || 'Error',
        error?.message || i18n.t('somethingWentWrong') || 'Something went wrong'
      );
    },
  });

  const handleCodeChange = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, '').slice(0, CODE_LENGTH);
    setCode(digitsOnly);
  };

  const focusCodeInput = () => {
    hiddenInputRef.current?.focus();
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => {
        const hidden = String(b || '')
          .split('')
          .map(() => '*')
          .join('');
        return `${a}${hidden}${c}`;
      })
    : '';

  const isVerifying =
    (verifyMutation as any).isPending ?? (verifyMutation as any).isLoading ?? false;

  const isResending =
    (resendMutation as any).isPending ?? (resendMutation as any).isLoading ?? false;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[COLORS.bg, COLORS.page, COLORS.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topGlowOne} />
        <View style={styles.topGlowTwo} />

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
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={COLORS.blueDark}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              {i18n.t('verifyResetCode') || 'Verify Reset Code'}
            </Text>

            <View style={styles.headerSpacer} />
          </View>

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
                <Ionicons name="key-outline" size={30} color="#FFFFFF" />
              </View>

              <Text style={styles.title}>
                {i18n.t('enterVerificationCode') || 'Enter Verification Code'}
              </Text>

              <Text style={styles.description}>
                {i18n.t('verificationCodeDesc') ||
                  'Enter the 6-digit code we sent to your email address.'}
              </Text>

              {!!maskedEmail ? (
                <Text style={styles.emailText}>{maskedEmail}</Text>
              ) : null}
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

              <TouchableOpacity
                style={[styles.primaryButton, isVerifying && styles.primaryButtonDisabled]}
                onPress={() => (verifyMutation as any).mutate()}
                disabled={isVerifying}
                activeOpacity={0.9}
              >
                {isVerifying ? (
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
                style={[styles.secondaryButton, isResending && styles.secondaryButtonDisabled]}
                onPress={() => (resendMutation as any).mutate()}
                disabled={isResending}
                activeOpacity={0.9}
              >
                {isResending ? (
                  <ActivityIndicator color={COLORS.blue} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color={COLORS.blueDark} />
                    <Text style={styles.secondaryButtonText}>
                      {i18n.t('resendCode') || 'Resend Code'}
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
                  {i18n.t('backToForgotPassword') || 'Back'}
                </Text>
              </TouchableOpacity>

              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>
                  {i18n.t('important') || 'Important'}
                </Text>

                <Text style={styles.helpText}>
                  {i18n.t('verifyCodeHelpText') ||
                    'If the code is wrong or expired, request a new code and try again.'}
                </Text>

                <View style={styles.supportRow}>
                  <View style={styles.supportIconWrap}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.blue} />
                  </View>

                  <View style={styles.supportTextWrap}>
                    <Text style={styles.supportTextTop}>
                      {i18n.t('needHelpVerifyCode') ||
                        'Need help with the verification code? Contact support.'}
                    </Text>
                    <Text style={styles.supportEmail}>info@zenopay.bond</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
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
});
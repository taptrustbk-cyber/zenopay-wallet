import { useRouter } from 'expo-router';
import { useState } from 'react';
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
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RESET_CODE_SENT_AT_KEY = 'zenopay_reset_code_sent_at';
const RESET_CODE_EMAIL_KEY = 'zenopay_reset_code_email';

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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const isRTL = I18nManager.isRTL;
  const [email, setEmail] = useState('');

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        throw new Error(
          (i18n.t('auth.enterEmail') as string) || 'Enter email'
        );
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error(
          (i18n.t('auth.invalidEmail') as string) || 'Invalid email'
        );
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (error) throw error;

      return cleanEmail;
    },
    onSuccess: async (cleanEmail) => {
      try {
        await AsyncStorage.setItem(
          RESET_CODE_SENT_AT_KEY,
          String(Date.now())
        );

        await AsyncStorage.setItem(
          RESET_CODE_EMAIL_KEY,
          cleanEmail
        );
      } catch (storageError) {
        console.log('Failed to save reset code metadata:', storageError);
      }

      Alert.alert(
        (i18n.t('common.success') as string) || 'Success',
        (i18n.t('auth.resetCodeSent') as string) ||
          'We sent a 6-digit reset code to your email. Please check your inbox and spam folder.',
        [
          {
            text: (i18n.t('common.ok') as string) || 'OK',
            onPress: () => {
              router.push({
                pathname: '/(auth)/verify-reset-code' as any,
                params: { email: cleanEmail },
              } as any);
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        (i18n.t('common.error') as string) || 'Error',
        error?.message ||
          (i18n.t('common.somethingWentWrong') as string) ||
          'Something went wrong'
      );
    },
  });

  const isSubmitting =
    (sendCodeMutation as any).isPending ?? (sendCodeMutation as any).isLoading ?? false;

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
              {(i18n.t('auth.resetPassword') as string) || 'Reset Password'}
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
                <Ionicons name="shield-checkmark-outline" size={30} color="#FFFFFF" />
              </View>

              <Text style={styles.title}>
                {(i18n.t('auth.resetPassword') as string) || 'Reset Password'}
              </Text>

              <Text style={styles.description}>
                {(i18n.t('auth.resetPasswordOtpDesc') as string) ||
                  'Enter your email address and we will send you a 6-digit verification code.'}
              </Text>
            </LinearGradient>

            <View style={styles.card}>
              <Text style={styles.label}>
                {(i18n.t('auth.email') as string) || 'Email'}
              </Text>

              <View style={styles.inputWrap}>
                <View style={[styles.inputIcon, isRTL ? styles.inputIconRTL : null]}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.blue} />
                </View>

                <TextInput
                  style={styles.input}
                  placeholder={(i18n.t('auth.email') as string) || 'Email'}
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                onPress={() => (sendCodeMutation as any).mutate()}
                disabled={isSubmitting}
                activeOpacity={0.9}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>
                      {(i18n.t('auth.sendVerificationCode') as string) || 'Send Verification Code'}
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
                  {(i18n.t('auth.backToLogin') as string) || 'Back to Login'}
                </Text>
              </TouchableOpacity>

              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>
                  {(i18n.t('common.important') as string) || 'Important'}
                </Text>

                <Text style={styles.helpText}>
                  {(i18n.t('auth.resetHelpOtpText') as string) ||
                    'We will send a 6-digit code to your email. Enter that code on the next screen to continue resetting your password.'}
                </Text>

                <View
                  style={[
                    styles.supportRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.supportIconWrap, isRTL ? styles.supportIconWrapRTL : null]}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.blue} />
                  </View>

                  <View style={styles.supportTextWrap}>
                    <Text
                      style={[
                        styles.supportTextTop,
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {(i18n.t('auth.forgotEmailContact') as string) ||
                        'If you forgot your email address, please contact support.'}
                    </Text>
                    <Text
                      style={[
                        styles.supportEmail,
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      info@zenopay.bond
                    </Text>
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
    marginBottom: 8,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 56,
    paddingHorizontal: 12,
  },

  inputIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  inputIconRTL: {
    marginRight: 0,
    marginLeft: 10,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700',
    paddingVertical: 12,
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

  supportIconWrapRTL: {
    marginRight: 0,
    marginLeft: 10,
  },

  supportTextWrap: {
    flexShrink: 1,
    flex: 1,
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
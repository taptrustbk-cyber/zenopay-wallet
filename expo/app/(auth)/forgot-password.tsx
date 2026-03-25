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
  white: '#FFFFFF',
  muted: '#94A3B8',
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

  const resetMutation = useMutation({
    mutationFn: async () => {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        throw new Error(i18n.t('enterEmail') || 'Enter email');
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error(i18n.t('invalidEmail') || 'Invalid email');
      }

      const redirectTo =
        Platform.OS === 'web'
          ? `${window.location.origin}/reset-password`
          : Linking.createURL('reset-password');

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert(
        i18n.t('success') || 'Success',
        i18n.t('resetLinkSent') ||
          'We sent a reset link to your email. Please check your inbox and spam folder.',
        [
          {
            text: i18n.t('ok') || 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error') || 'Error', error?.message || 'Something went wrong');
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

          <Text style={styles.headerTitle}>{i18n.t('resetPassword') || 'Reset Password'}</Text>

          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={['#4B8DFF', '#2563EB', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>{i18n.t('resetPassword') || 'Reset Password'}</Text>
          <Text style={styles.description}>
            {i18n.t('resetPasswordDesc') ||
              'Enter your email to receive a password reset link.'}
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.label}>{i18n.t('email') || 'Email'}</Text>

          <View style={styles.inputWrap}>
            <View style={styles.inputIcon}>
              <Ionicons name="mail-outline" size={18} color={COLORS.blue} />
            </View>

            <TextInput
              style={styles.input}
              placeholder={i18n.t('email') || 'Email'}
              placeholderTextColor={COLORS.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.resetButton, resetMutation.isPending && styles.resetButtonDisabled]}
            onPress={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            activeOpacity={0.9}
          >
            {resetMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.resetButtonText}>
                {i18n.t('sendResetLink') || 'Send Reset Link'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.9}
          >
            <Text style={styles.backText}>{i18n.t('backToLogin') || 'Back to Login'}</Text>
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>
              {i18n.t('important') || 'Important'}
            </Text>

            <Text style={styles.helpText}>
              {i18n.t('resetHelpText') ||
                'Open the link from your email on the same device if possible. The link will redirect you to the password reset screen.'}
            </Text>

            <View style={styles.supportRow}>
              <View style={styles.supportIconWrap}>
                <Ionicons name="mail-outline" size={18} color={COLORS.blue} />
              </View>

              <View style={styles.supportTextWrap}>
                <Text style={styles.supportTextTop}>
                  {i18n.t('forgotEmailContact') ||
                    'If you forgot your email address, please contact support.'}
                </Text>
                <Text style={styles.supportEmail}>info@zenopay.bond</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 24 : 20,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 28 : 20,
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
    ...SHADOWS.card,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
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
    width: 72,
    height: 72,
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
    backgroundColor: COLORS.inputBg,
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
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700',
    paddingVertical: 12,
  },

  resetButton: {
    backgroundColor: COLORS.blue,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    ...SHADOWS.soft,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  resetButtonDisabled: {
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
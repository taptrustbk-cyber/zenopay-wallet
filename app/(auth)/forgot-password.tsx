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
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';

const COLORS = {
  bg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F3FBF6',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  white: '#FFFFFF',
  muted: '#9CA3AF',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!email) throw new Error(i18n.t('enterEmail'));
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'zenopay://reset-password',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert(
        i18n.t('success'),
        i18n.t('resetLinkSent') ||
          'We sent a reset link to your email. Please check your inbox (and spam).',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error.message);
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={COLORS.green} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{i18n.t('resetPassword')}</Text>

          <View style={{ width: 24 }} />
        </View>

        <View style={styles.card}>
          {/* Modern lock icon */}
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={26} color={COLORS.green} />
            </View>
          </View>

          <Text style={styles.title}>{i18n.t('resetPassword')}</Text>
          <Text style={styles.description}>
            {i18n.t('resetPasswordDesc') || 'Enter your email to receive a password reset link.'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('email')}
              placeholderTextColor={COLORS.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
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
              <Text style={styles.resetButtonText}>{i18n.t('submit')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.9}>
            <Text style={styles.backText}>{i18n.t('login')}</Text>
          </TouchableOpacity>

          {/* New help text under login button */}
          <View style={styles.helpBox}>
            <Text style={styles.helpText}>
              {i18n.t('resetHelpText') ||
                'After you input your email, we will send a reset link to your email to reset your account password.'}
            </Text>

            <View style={styles.supportRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.green} />
              <Text style={styles.supportText}>
                {i18n.t('forgotEmailContact') || 'If you forgot your email, please contact support:'}{' '}
                <Text style={styles.supportEmail}>info@zenopay.bond</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 18 : 22,
    paddingBottom: 20,
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: Platform.OS === 'ios' ? 30 : 20,
    paddingBottom: 14,
  },
  backIconBtn: { padding: 6, borderRadius: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900' as const, color: COLORS.text },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  iconWrap: { alignItems: 'center', marginTop: 4, marginBottom: 10 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.18)',
  },

  title: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: COLORS.text,
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 14,
    fontWeight: '600' as const,
  },

  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
  },

  resetButton: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  resetButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' as const },
  resetButtonDisabled: { opacity: 0.6 },

  backButton: { marginTop: 14, alignItems: 'center', paddingVertical: 6 },
  backText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800' as const,
    textDecorationLine: 'underline' as const,
  },

  helpBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  helpText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 10,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  supportText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.text,
    fontWeight: '700' as const,
  },
  supportEmail: {
    color: COLORS.green,
    fontWeight: '900' as const,
  },
});

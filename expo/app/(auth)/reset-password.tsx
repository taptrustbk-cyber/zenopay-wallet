import { useRouter, Stack } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import i18n from '@/lib/i18n';

export const options = {
  headerShown: false,
};

const UI = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',

  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',

  white: '#FFFFFF',
  shadow: '#7DA8E6',
};

const SHADOWS = {
  card: {
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  soft: {
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
};

function tSafe(key: string, fallback: string) {
  try {
    const value = i18n.t(key as any);

    if (
      value === null ||
      value === undefined ||
      typeof value === 'object' ||
      String(value).trim() === '' ||
      String(value) === key ||
      String(value).includes('[missing')
    ) {
      return fallback;
    }

    return String(value);
  } catch {
    return fallback;
  }
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isReady, setIsReady] = useState(false);

  const isRTL = I18nManager.isRTL;

  const goToForgotPassword = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('Sign out before forgot-password failed:', e);
    } finally {
      router.replace('/(auth)/forgot-password' as any);
    }
  }, [router]);

  const goToLogin = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('Sign out before login failed:', e);
    } finally {
      router.replace('/(auth)/login' as any);
    }
  }, [router]);

  const failAndGoBack = useCallback(() => {
    Alert.alert(
      tSafe('resetPassword.alertErrorTitle', 'Error'),
      tSafe(
        'resetPassword.invalidOrExpiredLink',
        'This reset link is invalid or expired. Please request a new password reset link.'
      ),
      [{ text: tSafe('common.ok', 'OK'), onPress: goToForgotPassword }]
    );
  }, [goToForgotPassword]);

  const handleIncomingUrl = useCallback(
    async (url: string) => {
      try {
        const parsed = Linking.parse(url);
        const code = (parsed?.queryParams?.code as string | undefined) ?? undefined;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setIsReady(true);
          return;
        }

        const hash = url.includes('#') ? url.split('#')[1] : '';
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            setIsReady(true);
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsReady(true);
          return;
        }

        failAndGoBack();
      } catch (e: any) {
        console.log('Reset URL error:', e?.message);
        failAndGoBack();
      }
    },
    [failAndGoBack]
  );

  useEffect(() => {
    let sub: any;

    const init = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        await handleIncomingUrl(initialUrl);
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session) setIsReady(true);
        else failAndGoBack();
      }

      sub = Linking.addEventListener('url', ({ url }) => {
        handleIncomingUrl(url);
      });
    };

    init();

    return () => {
      if (sub?.remove) sub.remove();
    };
  }, [handleIncomingUrl, failAndGoBack]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || !confirmPassword) {
        throw new Error(tSafe('resetPassword.fillAllFields', 'Please complete all fields'));
      }

      if (newPassword.length < 6) {
        throw new Error(
          tSafe('resetPassword.passwordMinLength', 'Password must be at least 6 characters')
        );
      }

      if (newPassword !== confirmPassword) {
        throw new Error(tSafe('resetPassword.passwordsDoNotMatch', 'Passwords do not match'));
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: async () => {
      await supabase.auth.signOut();
      Alert.alert(
        tSafe('resetPassword.alertSuccessTitle', 'Success'),
        tSafe(
          'resetPassword.passwordUpdatedSuccess',
          'Your password has been updated successfully.'
        ),
        [{ text: tSafe('common.ok', 'OK'), onPress: goToLogin }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        tSafe('resetPassword.alertErrorTitle', 'Error'),
        error?.message || tSafe('common.somethingWentWrong', 'Something went wrong')
      );
    },
  });

  const isSubmitting =
    (resetMutation as any).isPending ?? (resetMutation as any).isLoading ?? false;

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingGlow} />
        <View style={styles.loadingCard}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={UI.blue} />
          </View>
          <Text style={[styles.loadingTitle, isRTL && styles.textRTL]}>
            {tSafe('resetPassword.verifyingTitle', 'Verifying Reset Link')}
          </Text>
          <Text style={[styles.loadingText, isRTL && styles.textRTL]}>
            {tSafe(
              'resetPassword.verifyingSubtitle',
              'Please wait while we verify your password reset session.'
            )}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screen}>
        <View style={styles.topGlowOne} />
        <View style={styles.topGlowTwo} />

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={goToLogin} style={styles.backIconBtn} activeOpacity={0.8}>
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={UI.blueDark}
              />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
              {tSafe('resetPassword.title', 'Reset Password')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={28} color={UI.blue} />
            </View>
            <Text style={[styles.heroTitle, isRTL && styles.textRTL]}>
              {tSafe('resetPassword.heroTitle', 'Create New Password')}
            </Text>
            <Text style={[styles.heroSubtitle, isRTL && styles.textRTL]}>
              {tSafe(
                'resetPassword.heroSubtitle',
                'Enter your new password below and confirm it to finish resetting your account password.'
              )}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {tSafe('resetPassword.newPasswordLabel', 'New Password')}
              </Text>
              <View style={[styles.inputWrap, isRTL && styles.inputWrapRTL]}>
                <View style={[styles.inputIconBox, isRTL && styles.inputIconBoxRTL]}>
                  <Ionicons name="lock-closed-outline" size={18} color={UI.blue} />
                </View>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={tSafe('resetPassword.newPasswordPlaceholder', 'Enter new password')}
                  placeholderTextColor={UI.text3}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {tSafe('resetPassword.confirmPasswordLabel', 'Confirm Password')}
              </Text>
              <View style={[styles.inputWrap, isRTL && styles.inputWrapRTL]}>
                <View style={[styles.inputIconBox, isRTL && styles.inputIconBoxRTL]}>
                  <Ionicons name="checkmark-done-outline" size={18} color={UI.blue} />
                </View>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={tSafe(
                    'resetPassword.confirmPasswordPlaceholder',
                    'Re-enter new password'
                  )}
                  placeholderTextColor={UI.text3}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.resetButton, { opacity: isSubmitting ? 0.7 : 1 }]}
              onPress={() => resetMutation.mutate()}
              disabled={isSubmitting}
              activeOpacity={0.9}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.resetButtonText}>
                    {tSafe('resetPassword.updatePasswordButton', 'Update Password')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backToLoginButton} onPress={goToLogin}>
              <Text style={styles.backToLoginText}>
                {tSafe('resetPassword.backToLogin', 'Back to Login')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: UI.page,
  },

  topGlowOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37,99,235,0.08)',
    top: -40,
    left: -60,
  },
  topGlowTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(37,99,235,0.06)',
    top: 110,
    right: -50,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI.page,
    paddingHorizontal: 20,
  },
  loadingGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(37,99,235,0.07)',
  },
  loadingCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  loadingIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: UI.text2,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 30,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 16,
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },

  heroCard: {
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    marginBottom: 14,
    ...SHADOWS.card,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: UI.text2,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 20,
  },

  card: {
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.card,
  },

  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.text,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 12,
    minHeight: 54,
  },
  inputWrapRTL: {
    flexDirection: 'row-reverse',
  },
  inputIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  inputIconBoxRTL: {
    marginRight: 0,
    marginLeft: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: UI.text,
    fontWeight: '700',
  },
  inputRTL: {
    textAlign: 'right',
  },

  resetButton: {
    backgroundColor: UI.blue,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
    ...SHADOWS.card,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  backToLoginButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  backToLoginText: {
    color: UI.blue,
    fontSize: 14,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },

  textRTL: {
    textAlign: 'right',
  },
});
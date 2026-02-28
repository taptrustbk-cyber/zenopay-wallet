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
  Pressable,
  I18nManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import i18n, { setLanguage, getCurrentLanguage } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const PENDING_PROFILE_KEY = 'zenopay_pending_profile_v1';

type PendingProfile = {
  email?: string;
  full_name?: string;
  city?: string;
  country?: string;
  phone?: string;
  date_of_brith?: string; // ✅ your DB column name (typo)
  pending_profile_created_at?: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const isRTL = I18nManager.isRTL;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [, forceUpdate] = useState(0);

  async function applyPendingProfileIfExists(userId: string) {
    try {
      const pendingRaw = await AsyncStorage.getItem(PENDING_PROFILE_KEY);
      if (!pendingRaw) return;

      const pending: PendingProfile | null = JSON.parse(pendingRaw);
      if (!pending) return;

      // Optional safety: ensure pending belongs to this email (if available)
      const cleanLoginEmail = (email || '').trim().toLowerCase();
      const pendingEmail = (pending.email || '').trim().toLowerCase();
      if (pendingEmail && cleanLoginEmail && pendingEmail !== cleanLoginEmail) {
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            full_name: pending.full_name ?? null,
            city: pending.city ?? null,
            country: pending.country ?? null,
            phone: pending.phone ?? null,
            date_of_brith: pending.date_of_brith ?? null,
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.log('applyPendingProfile upsert error:', error.message);
        return;
      }

      await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
    } catch (e: any) {
      console.log('applyPendingProfileIfExists error:', e?.message);
    }
  }

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!email || !password) {
        throw new Error(i18n.t('enterEmail'));
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('email not confirmed') ||
          errorMessage.includes('email confirmation') ||
          errorMessage.includes('confirm your email') ||
          (error.status === 400 && errorMessage.includes('email'))
        ) {
          setTimeout(() => {
            router.push(`/(auth)/email-verification?email=${encodeURIComponent(email)}` as any);
          }, 100);
          return { redirectHandled: true };
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('Login failed');
      }

      // ✅ after login success, save pending signup details to profiles (if pending exists)
      await applyPendingProfileIfExists(data.user.id);

      console.log('Login successful, AuthContext will handle profile loading and navigation');
      return { success: true };
    },
    onSuccess: (data) => {
      if ((data as any)?.redirectHandled) return;
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      const errorMessage = error.message?.toLowerCase() || '';

      if (
        errorMessage.includes('email not confirmed') ||
        errorMessage.includes('email confirmation') ||
        errorMessage.includes('confirm your email')
      ) {
        return;
      }

      if (
        errorMessage.includes('1.4 expected') ||
        errorMessage.includes('parsing') ||
        errorMessage.includes('json')
      ) {
        return;
      }

      if (errorMessage.includes('invalid login credentials')) {
        Alert.alert(i18n.t('error'), 'Your email or password is incorrect');
        return;
      }

      if (errorMessage.includes('profile_error')) {
        Alert.alert(
          i18n.t('error'),
          'Could not load your profile. Please check your database settings or contact support.'
        );
        return;
      }

      if (errorMessage.includes('profile_not_found')) {
        Alert.alert(i18n.t('error'), 'Your account profile was not found. Please contact support.');
        return;
      }

      if (!errorMessage.includes('access denied')) {
        Alert.alert(i18n.t('error'), 'Login failed: ' + error.message);
      }
    },
  });

  // ✅ works with react-query v4 or v5
  const isSubmitting =
    (loginMutation as any).isPending ?? (loginMutation as any).isLoading ?? false;

  const toggleLanguage = async () => {
    const currentLang = getCurrentLanguage();
    let newLang = 'en';

    if (currentLang === 'en') {
      newLang = 'ar';
    } else if (currentLang === 'ar') {
      newLang = 'ckb';
    } else if (currentLang === 'ckb') {
      newLang = 'kmr';
    } else {
      newLang = 'en';
    }

    await setLanguage(newLang);
    forceUpdate((prev) => prev + 1);
  };

  const getLanguageDisplayText = () => {
    const currentLang = getCurrentLanguage();
    if (currentLang === 'en') return 'العربية';
    if (currentLang === 'ar') return 'کوردی سۆرانی';
    if (currentLang === 'ckb') return 'کوردی بادینی';
    return 'English';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Language button top-right */}
          <View style={styles.languageButtonContainer}>
            <TouchableOpacity style={styles.langButton} onPress={toggleLanguage} activeOpacity={0.85}>
              <Ionicons name="globe-outline" size={18} color="#111827" />
              <Text style={[styles.langText, isRTL ? styles.mr8 : styles.ml8]}>
                {getLanguageDisplayText()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Center logo + app name */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <LinearGradient
                colors={['#22C55E', '#16A34A', '#0E7A35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>Z</Text>
              </LinearGradient>
            </View>

            <Text style={styles.appName}>ZenoPay</Text>
            <Text style={styles.welcomeBack}>Welcome Back!</Text>

            {/* ✅ translated line (selected in your image) */}
            <Text style={styles.subWelcome}>{i18n.t('loginSubWelcome')}</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#111827" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={i18n.t('email')}
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#111827" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={i18n.t('password')}
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#111827"
                />
              </TouchableOpacity>
            </View>

            {/* Remember + Forgot */}
            <View style={styles.rowBetween}>
              <Pressable onPress={() => setRememberMe((v) => !v)} style={styles.rememberRow} hitSlop={10}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>

                {/* ✅ translated */}
                <Text style={[styles.rememberText, isRTL ? styles.mr10 : styles.ml10]}>
                  {i18n.t('rememberMe')}
                </Text>
              </Pressable>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password' as any)}
                style={styles.forgotButton}
                activeOpacity={0.85}
              >
                <Text style={styles.forgotText}>{i18n.t('forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => (loginMutation as any).mutate()}
              disabled={isSubmitting}
              activeOpacity={0.9}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>{i18n.t('login')}</Text>
              )}
            </TouchableOpacity>

            {/* Create New Account */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/create-account' as any)}
              style={styles.createAccountButton}
              activeOpacity={0.9}
            >
              <Text style={styles.createAccountText}>{i18n.t('createNewAccount')}</Text>
            </TouchableOpacity>
          </View>

          {/* Need help */}
          <View style={styles.helpCard}>
            <View style={styles.helpIconCircle}>
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.helpIconCircleInner}
              >
                <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <View style={styles.helpTextWrap}>
              <Text style={styles.helpTitle}>{i18n.t('needHelp')}</Text>
              <Text style={styles.helpText}>
                {i18n.t('contactUsAt')}{' '}
                <Text style={styles.helpEmail}>info@zenopay.bond</Text>
              </Text>
            </View>
          </View>

          <View style={{ height: 22 }} />
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },

  // spacing helpers (replace gap)
  ml8: { marginLeft: 8 },
  mr8: { marginRight: 8 },
  ml10: { marginLeft: 10 },
  mr10: { marginRight: 10 },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingBottom: 30,
  },

  languageButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  langText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800' as const,
  },

  header: { alignItems: 'center', marginBottom: 18 },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.22)',
  },
  logoGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoText: {
    fontSize: 38,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: '#111827',
    marginBottom: 10,
  },
  welcomeBack: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#111827',
    marginBottom: 4,
  },
  subWelcome: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700' as const,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
    marginTop: 14,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    fontWeight: '700' as const,
  },
  eyeIcon: { padding: 8 },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 14,
  },

  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' as const },

  rememberText: { color: '#6B7280', fontSize: 13.5, fontWeight: '700' as const },

  forgotButton: { paddingVertical: 6, paddingHorizontal: 6 },
  forgotText: { color: '#16A34A', fontSize: 13.5, fontWeight: '900' as const },

  loginButton: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '900' as const,
  },

  createAccountButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  createAccountText: {
    color: '#16A34A',
    fontSize: 14.5,
    fontWeight: '900' as const,
  },

  helpCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
  },
  helpIconCircleInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTextWrap: { flex: 1 },
  helpTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#111827',
    marginBottom: 2,
  },
  helpText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700' as const,
  },
  helpEmail: {
    color: '#16A34A',
    fontWeight: '900' as const,
  },
});

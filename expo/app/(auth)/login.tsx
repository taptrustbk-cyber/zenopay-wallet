import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
const REMEMBER_ME_KEY = 'zenopay_remember_me_v1';
const REMEMBER_EMAIL_KEY = 'zenopay_remember_email_v1';

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
  blueSoft2: '#DCEBFF',

  white: '#FFFFFF',
  black: '#0F172A',
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

export default function LoginScreen() {
  const router = useRouter();
  const isRTL = I18nManager.isRTL;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [, forceUpdate] = useState(0);
  const [loadingRememberState, setLoadingRememberState] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const savedRemember = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        const savedEmail = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);

        if (!mounted) return;

        const rememberEnabled = savedRemember === null ? true : savedRemember === 'true';
        setRememberMe(rememberEnabled);

        if (rememberEnabled && savedEmail) {
          setEmail(savedEmail);
        }
      } catch (e) {
        console.log('load remember me error:', e);
      } finally {
        if (mounted) setLoadingRememberState(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function persistRememberState(nextRemember: boolean, nextEmail?: string) {
    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, String(nextRemember));

      if (nextRemember) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, (nextEmail ?? email).trim());
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch (e) {
      console.log('persistRememberState error:', e);
    }
  }

  async function applyPendingProfileIfExists(userId: string) {
    try {
      const pendingRaw = await AsyncStorage.getItem(PENDING_PROFILE_KEY);
      if (!pendingRaw) return;

      const pending: PendingProfile | null = JSON.parse(pendingRaw);
      if (!pending) return;

      const cleanLoginEmail = (email || '').trim().toLowerCase();
      const pendingEmail = (pending.email || '').trim().toLowerCase();
      if (pendingEmail && cleanLoginEmail && pendingEmail !== cleanLoginEmail) {
        return;
      }

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
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        throw new Error(i18n.t('enterEmail'));
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes('email not confirmed') ||
          errorMessage.includes('email confirmation') ||
          errorMessage.includes('confirm your email') ||
          ((error as any).status === 400 && errorMessage.includes('email'))
        ) {
          setTimeout(() => {
            router.push(`/(auth)/email-verification?email=${encodeURIComponent(cleanEmail)}` as any);
          }, 100);
          return { redirectHandled: true };
        }
        throw error;
      }

      if (!data.user) {
        throw new Error(i18n.t('loginFailedMessage') || 'Login failed');
      }

      await applyPendingProfileIfExists(data.user.id);
      await persistRememberState(rememberMe, cleanEmail);

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
        Alert.alert(i18n.t('error'), i18n.t('invalidLoginCredentials') || 'Your email or password is incorrect');
        return;
      }

      if (errorMessage.includes('profile_error')) {
        Alert.alert(
          i18n.t('error'),
          i18n.t('profileLoadError') ||
            'Could not load your profile. Please check your database settings or contact support.'
        );
        return;
      }

      if (errorMessage.includes('profile_not_found')) {
        Alert.alert(
          i18n.t('error'),
          i18n.t('profileNotFound') || 'Your account profile was not found. Please contact support.'
        );
        return;
      }

      if (!errorMessage.includes('access denied')) {
        Alert.alert(
          i18n.t('error'),
          `${i18n.t('loginFailedPrefix') || 'Login failed'}: ${error.message}`
        );
      }
    },
  });

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

    if (currentLang === 'en') return 'English';
    if (currentLang === 'ar') return 'العربية';
    if (currentLang === 'ckb') return 'کوردی سۆرانی';
    return 'Kurdî Badînî';
  };

  const handleRememberToggle = async () => {
    const next = !rememberMe;
    setRememberMe(next);
    await persistRememberState(next, email);
  };

  if (loadingRememberState) {
    return (
      <View style={[styles.container, { backgroundColor: UI.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={UI.blue} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[UI.bg, UI.page, UI.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topGlowOne} />
        <View style={styles.topGlowTwo} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.languageButtonContainer}>
            <TouchableOpacity style={styles.langButton} onPress={toggleLanguage} activeOpacity={0.85}>
              <Ionicons name="globe-outline" size={18} color={UI.blueDark} />
              <Text style={[styles.langText, isRTL ? styles.mr8 : styles.ml8]}>
                {getLanguageDisplayText()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <View style={styles.logoOuterRing}>
              <View style={styles.logoCircle}>
                <LinearGradient
                  colors={[UI.blue, UI.blueDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoText}>Z</Text>
                </LinearGradient>
              </View>
            </View>

            <Text style={styles.appName}>ZenoPay</Text>
            <Text style={styles.welcomeBack}>{i18n.t('welcomeBack') || 'Welcome Back!'}</Text>
            <Text style={styles.subWelcome}>
              {i18n.t('loginSubWelcome') || 'Please log in to your account'}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <View style={[styles.inputIconWrap, isRTL ? styles.inputIconWrapRtl : null]}>
                <Ionicons name="mail-outline" size={18} color={UI.blue} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('email')}
                placeholderTextColor={UI.text3}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (rememberMe) {
                    AsyncStorage.setItem(REMEMBER_EMAIL_KEY, v.trim()).catch(() => {});
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.inputIconWrap, isRTL ? styles.inputIconWrapRtl : null]}>
                <Ionicons name="lock-closed-outline" size={18} color={UI.blue} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('password')}
                placeholderTextColor={UI.text3}
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
                  color={UI.text2}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.rowBetween}>
              <Pressable onPress={handleRememberToggle} style={styles.rememberRow} hitSlop={10}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>

                <Text style={[styles.rememberText, isRTL ? styles.mr10 : styles.ml10]}>
                  {i18n.t('rememberMe') || 'Remember me'}
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

            <TouchableOpacity
              onPress={() => router.push('/(auth)/create-account' as any)}
              style={styles.createAccountButton}
              activeOpacity={0.9}
            >
              <Text style={styles.createAccountText}>{i18n.t('createNewAccount')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.helpCard}>
            <View style={[styles.helpIconCircle, isRTL ? styles.helpIconCircleRtl : null]}>
              <LinearGradient
                colors={[UI.blue, UI.blueDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.helpIconCircleInner}
              >
                <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <View style={styles.helpTextWrap}>
              <Text style={styles.helpTitle}>{i18n.t('needHelp') || 'Need Help?'}</Text>
              <Text style={styles.helpText}>
                {i18n.t('contactUsAt') || 'Contact us at'}{' '}
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

  ml8: { marginLeft: 8 },
  mr8: { marginRight: 8 },
  ml10: { marginLeft: 10 },
  mr10: { marginRight: 10 },

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
    backgroundColor: UI.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
  },
  langText: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '800' as const,
  },

  header: {
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 6,
  },
  logoOuterRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  appName: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: UI.text,
    marginBottom: 10,
  },
  welcomeBack: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: UI.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  subWelcome: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700' as const,
    textAlign: 'center',
  },

  card: {
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.card,
    marginTop: 14,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.cardSoft,
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: UI.border,
    minHeight: 54,
  },
  inputIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  inputIconWrapRtl: {
    marginRight: 0,
    marginLeft: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: UI.text,
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

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.white,
  },
  checkboxChecked: {
    backgroundColor: UI.blue,
    borderColor: UI.blue,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900' as const,
  },

  rememberText: {
    color: UI.text2,
    fontSize: 13.5,
    fontWeight: '700' as const,
  },

  forgotButton: { paddingVertical: 6, paddingHorizontal: 6 },
  forgotText: {
    color: UI.blue,
    fontSize: 13.5,
    fontWeight: '900' as const,
  },

  loginButton: {
    backgroundColor: UI.blue,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '900' as const,
  },

  createAccountButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
  },
  createAccountText: {
    color: UI.blue,
    fontSize: 14.5,
    fontWeight: '900' as const,
  },

  helpCard: {
    marginTop: 14,
    backgroundColor: UI.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  helpIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
  },
  helpIconCircleRtl: {
    marginRight: 0,
    marginLeft: 12,
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
    color: UI.text,
    marginBottom: 2,
  },
  helpText: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700' as const,
  },
  helpEmail: {
    color: UI.blue,
    fontWeight: '900' as const,
  },
});
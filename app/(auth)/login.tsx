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
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import i18n, { setLanguage, getCurrentLanguage } from '@/lib/i18n';
import { Eye, EyeOff, Mail, Lock, Globe } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [, forceUpdate] = useState(0);

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
        if (errorMessage.includes('email not confirmed') || 
            errorMessage.includes('email confirmation') ||
            errorMessage.includes('confirm your email') ||
            error.status === 400 && errorMessage.includes('email')) {
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

      console.log('Login successful, AuthContext will handle profile loading and navigation');
      return { success: true };
    },
    onSuccess: (data) => {
      if (data?.redirectHandled) {
        return;
      }
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      const errorMessage = error.message?.toLowerCase() || '';
      
      if (errorMessage.includes('email not confirmed') || 
          errorMessage.includes('email confirmation') ||
          errorMessage.includes('confirm your email')) {
        return;
      }
      
      if (errorMessage.includes('1.4 expected') || 
          errorMessage.includes('parsing') ||
          errorMessage.includes('json')) {
        return;
      }
      
      if (errorMessage.includes('invalid login credentials')) {
        Alert.alert(
          i18n.t('error'),
          'Your email or password is incorrect'
        );
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
        Alert.alert(
          i18n.t('error'),
          'Your account profile was not found. Please contact support.'
        );
        return;
      }
      
      if (!errorMessage.includes('access denied')) {
        Alert.alert(
          i18n.t('error'),
          'Login failed: ' + error.message
        );
      }
    },
  });

  const toggleLanguage = async () => {
    const currentLang = getCurrentLanguage();
    let newLang = 'en';
    
    if (currentLang === 'en') {
      newLang = 'ar';
    } else if (currentLang === 'ar') {
      newLang = 'ckb';
    } else {
      newLang = 'en';
    }
    
    await setLanguage(newLang);
    forceUpdate(prev => prev + 1);
  };

  const getLanguageDisplayText = () => {
    const currentLang = getCurrentLanguage();
    if (currentLang === 'en') return 'العربية';
    if (currentLang === 'ar') return 'کوردی';
    return 'English';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.languageButtonContainer}>
            <TouchableOpacity style={styles.langButton} onPress={toggleLanguage}>
              <Globe size={18} color="#FFF" />
              <Text style={styles.langText}>
                {getLanguageDisplayText()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>Z</Text>
              </View>
            </View>
            <Text style={styles.appName}>ZenoPay</Text>
            <Text style={styles.welcomeText}>{i18n.t('welcome')}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={i18n.t('email')}
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={i18n.t('password')}
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? (
                  <Eye size={20} color="#94A3B8" />
                ) : (
                  <EyeOff size={20} color="#94A3B8" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => router.push('/(auth)/forgot-password' as any)}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>{i18n.t('forgotPassword')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => loginMutation.mutate()}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>{i18n.t('login')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupPrompt}>{i18n.t('dontHaveAccount')}</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/create-account' as any)}>
                <Text style={styles.signupText}>{i18n.t('signup')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  languageButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  langText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 3,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold' as const,
    color: '#3B82F6',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center' as const,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeIcon: {
    padding: 8,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signupPrompt: {
    color: '#94A3B8',
    fontSize: 15,
  },
  signupText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: 'bold' as const,
  },
});

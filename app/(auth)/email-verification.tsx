import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';

import i18n from '@/lib/i18n';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams();
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);

  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const loadEmail = async () => {
      if (emailParam && typeof emailParam === 'string') {
        setUserEmail(emailParam);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      }
    };
    loadEmail();
  }, [emailParam]);

  useEffect(() => {
    let isMounted = true;

    const checkEmailVerification = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted && session?.user?.email_confirmed_at) {
          console.log('✅ Email verified, redirecting to login...');
          setVerified(true);
          setTimeout(() => {
            if (isMounted) {
              router.replace('/(auth)/login' as any);
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      }
    };

    checkEmailVerification();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed:', _event);
      
      if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
        if (isMounted && session?.user?.email_confirmed_at && !verified) {
          console.log('✅ Email verified via state change, redirecting to login...');
          setVerified(true);
          await supabase.auth.signOut();
          setTimeout(() => {
            if (isMounted) {
              router.replace('/(auth)/login' as any);
            }
          }, 2000);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, verified]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (user?.email_confirmed_at) {
        console.log('✅ Email verified, redirecting to login...');
        setVerified(true);
        await supabase.auth.signOut();
        setTimeout(() => {
          router.replace('/(auth)/login' as any);
        }, 2000);
      } else {
        console.log('⏳ Email not verified yet');
        Alert.alert(
          i18n.t('verifyYourEmail'),
          i18n.t('pleaseConfirmEmail'),
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error checking verification status:', error);
      Alert.alert(i18n.t('error'), error.message);
    } finally {
      setChecking(false);
    }
  };

  const resendEmail = async () => {
    try {
      const emailToUse = userEmail || emailParam;
      
      if (!emailToUse) {
        Alert.alert(i18n.t('error'), 'No email address found');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: typeof emailToUse === 'string' ? emailToUse : emailToUse[0],
      });

      if (error) throw error;
      
      Alert.alert('Success', 'Verification email resent. Please check your inbox.');
      console.log('✅ Verification email resent');
    } catch (error: any) {
      console.error('Error resending email:', error);
      Alert.alert(i18n.t('error'), error.message || 'Failed to resend email');
    }
  };

  if (verified) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <CheckCircle2 size={80} color="#10B981" strokeWidth={1.5} />
            </View>

            <Text style={styles.title}>{i18n.t('emailVerified')}</Text>
            <Text style={styles.subtitle}>
              {i18n.t('redirectingToLogin')}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Mail size={80} color="#3B82F6" strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>{i18n.t('verifyYourEmail')}</Text>
          <Text style={styles.subtitle}>
            {i18n.t('verificationEmailSent')}
          </Text>
          {userEmail && (
            <Text style={styles.emailText}>{userEmail}</Text>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📧 {i18n.t('checkEmailInbox')}
            </Text>
            <Text style={styles.infoText}>
              📂 {i18n.t('checkSpamFolder')}
            </Text>
            <Text style={styles.infoText}>
              🔄 {i18n.t('clickRefreshAfterVerifying')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={checkStatus}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <RefreshCw size={20} color="#FFF" />
                <Text style={styles.refreshButtonText}>{i18n.t('checkStatus')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendButton} onPress={resendEmail}>
            <Text style={styles.resendText}>{i18n.t('resendEmail')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton} 
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/login' as any);
            }}
          >
            <Text style={styles.backText}>{i18n.t('backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    padding: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center' as const,
    marginBottom: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#3B82F6',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    width: '100%',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  resendButton: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  resendText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  backButton: {
    paddingVertical: 12,
  },
  backText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  redirectUrlBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    width: '100%',
  },
  redirectUrlLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  redirectUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  redirectUrlText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
    fontFamily: 'monospace' as const,
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  redirectUrlHint: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
});

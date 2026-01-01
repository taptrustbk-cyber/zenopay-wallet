import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/lib/i18n';

export default function KycWait() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<any>(null);

  const checkKycStatus = useCallback(async () => {
    if (!user) return;

    try {
      setIsChecking(true);
      console.log('🔍 Checking KYC status...');
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error checking KYC status:', error);
        return;
      }

      console.log('📋 KYC Status:', profile?.kyc_status);

      if (profile?.kyc_status === 'approved') {
        console.log('✅ KYC approved! Redirecting to dashboard...');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        router.replace('/(app)/dashboard' as any);
      }
    } catch (error) {
      console.error('❌ Error checking KYC:', error);
    } finally {
      setIsChecking(false);
    }
  }, [user, router]);

  useEffect(() => {
    checkKycStatus();

    intervalRef.current = setInterval(() => {
      checkKycStatus();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkKycStatus]);

  const handleBackToLogin = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    await signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ZenoPay</Text>

      <View style={styles.iconContainer}>
        <Clock size={80} color="#3B82F6" strokeWidth={1.5} />
        {isChecking && (
          <View style={styles.checkingIndicator}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        )}
      </View>

      <Text style={styles.title}>{i18n.t('kycInProgress')}</Text>

      <Text style={styles.description}>
        {i18n.t('kycReviewMessage')}
      </Text>

      <Text style={styles.timeInfo}>
        {i18n.t('kycTimeInfo')}
      </Text>

      <View style={styles.supportContainer}>
        <Text style={styles.supportTitle}>{i18n.t('contactSupportTitle')}</Text>
        <Text style={styles.supportEmail}>{i18n.t('supportEmail')}</Text>
        <Text style={styles.supportInfo}>
          {i18n.t('supportContactInfo')}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={handleBackToLogin}
      >
        <Text style={styles.buttonText}>{i18n.t('backToSignIn')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  header: {
    position: 'absolute',
    top: 60,
    fontSize: 28,
    fontWeight: '800',
    color: '#3B82F6',
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    position: 'relative' as const,
  },
  checkingIndicator: {
    position: 'absolute' as const,
    bottom: -20,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  timeInfo: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  supportContainer: {
    marginBottom: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  supportEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 8,
  },
  supportInfo: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 220,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

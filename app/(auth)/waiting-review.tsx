import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Mail, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function WaitingReviewScreen() {
  const { user, signOut, hardRefresh } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    if (!user) return;
    
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data.kyc_status === 'approved') {
        console.log('✅ KYC status changed to approved, redirecting to dashboard...');
        await hardRefresh();
        await new Promise(resolve => setTimeout(resolve, 300));
        router.replace('/(app)/dashboard' as any);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setChecking(false);
    }
  };

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
            <Clock size={80} color="#F59E0B" strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>Pending Admin Review</Text>
          <Text style={styles.subtitle}>
            Your account is currently under review by our team.
          </Text>

          <View style={styles.infoCard}>
            <Mail size={24} color="#3B82F6" style={styles.cardIcon} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Email Notification</Text>
              <Text style={styles.cardDescription}>
                You will receive an email from ZenoPay Support once your account is approved.
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📧 Check your email regularly for updates
            </Text>
            <Text style={styles.infoText}>
              ⏱️ Review typically takes 1-24 hours
            </Text>
            <Text style={styles.infoText}>
              🔒 Your information is secure
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
                <Text style={styles.refreshButtonText}>Check Status</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
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
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
    marginBottom: 32,
    lineHeight: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    width: '100%',
  },
  cardIcon: {
    marginRight: 16,
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
  signOutButton: {
    paddingVertical: 12,
  },
  signOutText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});

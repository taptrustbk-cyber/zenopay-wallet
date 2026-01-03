import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Mail, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import i18n from '@/lib/i18n';

export default function WaitingReviewScreen() {
  const { user, signOut, hardRefresh } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [idFront, setIdFront] = useState<any>(null);
  const [idBack, setIdBack] = useState<any>(null);
  const [selfie, setSelfie] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  async function pickImage(setter: Function) {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled) setter(res.assets[0]);
  }

  async function uploadKYCDocuments() {
    if (!idFront || !idBack || !selfie) {
      Alert.alert(i18n.t('error'), i18n.t('uploadAllKycDocs'));
      return;
    }

    setUploading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          kyc_front_uri: idFront.uri,
          kyc_back_uri: idBack.uri,
          kyc_selfie_uri: selfie.uri,
        },
      });

      if (error) throw error;

      Alert.alert(i18n.t('success'), 'KYC documents uploaded successfully!');
    } catch (error: any) {
      Alert.alert(i18n.t('error'), error.message);
    } finally {
      setUploading(false);
    }
  }

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

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

          <View style={styles.kycSection}>
            <Text style={styles.kycTitle}>{i18n.t('kycDocuments')}</Text>
            <Text style={styles.kycSubtitle}>Upload your documents to complete verification</Text>

            <TouchableOpacity onPress={() => pickImage(setIdFront)} style={styles.uploadBtn}>
              <Text style={styles.uploadText}>
                {idFront ? `${i18n.t('idFrontSelected')} ✅` : i18n.t('uploadIDFront')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => pickImage(setIdBack)} style={styles.uploadBtn}>
              <Text style={styles.uploadText}>
                {idBack ? `${i18n.t('idBackSelected')} ✅` : i18n.t('uploadIDBack')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => pickImage(setSelfie)} style={styles.uploadBtn}>
              <Text style={styles.uploadText}>
                {selfie ? `${i18n.t('selfieSelected')} ✅` : i18n.t('uploadSelfie')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadKYCButton, (!idFront || !idBack || !selfie || uploading) && styles.uploadKYCButtonDisabled]}
              onPress={uploadKYCDocuments}
              disabled={!idFront || !idBack || !selfie || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.uploadKYCButtonText}>Upload Documents</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
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
  kycSection: {
    marginTop: 32,
    width: '100%',
  },
  kycTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  kycSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  uploadBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderStyle: 'dashed' as const,
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  uploadKYCButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  uploadKYCButtonDisabled: {
    opacity: 0.5,
  },
  uploadKYCButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

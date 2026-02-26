import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
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

      Alert.alert(i18n.t('success'), i18n.t('kycDocsUploadedSuccess'));
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Clock size={72} color="#16A34A" strokeWidth={1.8} />
        </View>

        <Text style={styles.title}>{i18n.t('pendingAdminReview')}</Text>
        <Text style={styles.subtitle}>{i18n.t('accountUnderReview')}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Mail size={22} color="#16A34A" />
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{i18n.t('emailNotification')}</Text>
            <Text style={styles.cardDescription}>{i18n.t('emailNotificationDesc')}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{i18n.t('checkEmailRegularly')}</Text>
          <Text style={styles.infoText}>{i18n.t('reviewTakes1To6Hours')}</Text>
          <Text style={styles.infoText}>{i18n.t('infoSecure')}</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={checkStatus} disabled={checking}>
          {checking ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <RefreshCw size={20} color="#000" />
              <Text style={styles.primaryButtonText}>{i18n.t('checkStatus')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.kycSection}>
          <Text style={styles.kycTitle}>{i18n.t('kycDocuments')}</Text>
          <Text style={styles.kycSubtitle}>{i18n.t('uploadDocsToComplete')}</Text>

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
            style={[
              styles.primaryButton,
              styles.uploadButton,
              (!idFront || !idBack || !selfie || uploading) && styles.buttonDisabled,
            ]}
            onPress={uploadKYCDocuments}
            disabled={!idFront || !idBack || !selfie || uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>{i18n.t('uploadDocuments')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{i18n.t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const GREEN = '#16A34A';
const BORDER = '#E5E7EB';
const TEXT = '#111827';
const MUTED = '#6B7280';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
  },

  iconContainer: {
    marginBottom: 18,
    width: 104,
    height: 104,
    borderRadius: 999,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 22,
  },

  infoCard: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13.5,
    color: MUTED,
    lineHeight: 20,
  },

  infoBox: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    fontSize: 13.5,
    color: MUTED,
    lineHeight: 20,
  },

  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  kycSection: {
    marginTop: 18,
    width: '100%',
  },
  kycTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: TEXT,
    marginBottom: 6,
  },
  kycSubtitle: {
    fontSize: 13.5,
    color: MUTED,
    marginBottom: 14,
  },

  uploadBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 14.5,
    color: TEXT,
    fontWeight: '800',
  },

  uploadButton: {
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.55,
  },

  signOutButton: {
    marginTop: 14,
    paddingVertical: 10,
  },
  signOutText: {
    color: MUTED,
    fontSize: 14.5,
    fontWeight: '800',
  },
});

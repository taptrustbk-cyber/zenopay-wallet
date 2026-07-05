import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
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
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled) setter(res.assets[0]);
    } catch (error) {
      Alert.alert(
        (i18n.t('common.error') as string) || 'Error',
        (i18n.t('kyc.failedPickImage') as string) || 'Failed to pick image.'
      );
    }
  }

  async function uploadKYCDocuments() {
    if (!idFront || !idBack || !selfie) {
      Alert.alert(
        (i18n.t('common.error') as string) || 'Error',
        (i18n.t('kyc.uploadAllKycDocs') as string) || 'Please upload all KYC documents.'
      );
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

      Alert.alert(
        (i18n.t('common.success') as string) || 'Success',
        (i18n.t('kyc.kycDocsUploadedSuccess') as string) || 'KYC documents uploaded successfully.'
      );
    } catch (error: any) {
      Alert.alert(
        (i18n.t('common.error') as string) || 'Error',
        error.message
      );
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
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.iconContainer}>
            <Clock size={62} color="#FFFFFF" strokeWidth={1.8} />
          </View>

          <Text style={styles.title}>
            {(i18n.t('kyc.pendingAdminReview') as string) || 'Pending Admin Review'}
          </Text>
          <Text style={styles.subtitle}>
            {(i18n.t('kyc.accountUnderReview') as string) || 'Your account is currently under review.'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Mail size={20} color={UI.primary} />
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              {(i18n.t('kyc.emailNotification') as string) || 'Email Notification'}
            </Text>
            <Text style={styles.cardDescription}>
              {(i18n.t('kyc.emailNotificationDesc') as string) ||
                'We will notify you by email once your account review is complete.'}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {(i18n.t('kyc.checkEmailRegularly') as string) || 'Please check your email regularly.'}
          </Text>
          <Text style={styles.infoText}>
            {(i18n.t('kyc.reviewTakes1To6Hours') as string) || 'Review usually takes 1 to 6 hours.'}
          </Text>
          <Text style={styles.infoText}>
            {(i18n.t('kyc.infoSecure') as string) || 'Your information is secure and protected.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={checkStatus} disabled={checking}>
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {(i18n.t('kyc.checkStatus') as string) || 'Check Status'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.kycSection}>
          <Text style={styles.kycTitle}>
            {(i18n.t('kyc.kycDocuments') as string) || 'KYC Documents'}
          </Text>
          <Text style={styles.kycSubtitle}>
            {(i18n.t('kyc.uploadDocsToComplete') as string) ||
              'Upload your documents to complete the review process.'}
          </Text>

          <TouchableOpacity
            onPress={() => pickImage(setIdFront)}
            style={styles.uploadBtn}
            activeOpacity={0.9}
          >
            <Text style={styles.uploadText}>
              {idFront
                ? `${(i18n.t('kyc.idFrontSelected') as string) || 'ID Front Selected'} ✅`
                : (i18n.t('kyc.uploadIDFront') as string) || 'Upload ID Front'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => pickImage(setIdBack)}
            style={styles.uploadBtn}
            activeOpacity={0.9}
          >
            <Text style={styles.uploadText}>
              {idBack
                ? `${(i18n.t('kyc.idBackSelected') as string) || 'ID Back Selected'} ✅`
                : (i18n.t('kyc.uploadIDBack') as string) || 'Upload ID Back'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => pickImage(setSelfie)}
            style={styles.uploadBtn}
            activeOpacity={0.9}
          >
            <Text style={styles.uploadText}>
              {selfie
                ? `${(i18n.t('kyc.selfieSelected') as string) || 'Selfie Selected'} ✅`
                : (i18n.t('kyc.uploadSelfie') as string) || 'Upload Selfie'}
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
            activeOpacity={0.9}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {(i18n.t('kyc.uploadDocuments') as string) || 'Upload Documents'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>
            {(i18n.t('auth.signOut') as string) || 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const UI = {
  bg: '#F4F7FB',
  card: '#FFFFFF',
  soft: '#F4F7FB',
  text: '#0F1B33',
  text2: '#5B6B82',
  border: '#E3E8F0',
  primary: '#0F2A5C',
  primaryDark: '#0A1F45',
  primarySoft: '#E8EEF6',
  greenSoft: '#EAF8EF',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 34,
    paddingBottom: 28,
    alignItems: 'center',
  },

  heroCard: {
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: UI.primary,
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: UI.primary,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -60,
    right: -20,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -16,
    left: -18,
  },

  iconContainer: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '700',
  },

  infoCard: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: UI.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  infoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: UI.primarySoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13.5,
    color: UI.text2,
    lineHeight: 20,
    fontWeight: '700',
  },

  infoBox: {
    width: '100%',
    backgroundColor: UI.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 16,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  infoText: {
    fontSize: 13.5,
    color: UI.text2,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 10,
  },

  primaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: UI.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: UI.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  kycSection: {
    marginTop: 18,
    width: '100%',
    backgroundColor: UI.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  kycTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 6,
  },
  kycSubtitle: {
    fontSize: 13.5,
    color: UI.text2,
    marginBottom: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  uploadBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 14.5,
    color: UI.text,
    fontWeight: '900',
  },

  uploadButton: {
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.55,
  },

  signOutButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  signOutText: {
    color: UI.text2,
    fontSize: 14.5,
    fontWeight: '800',
  },
});
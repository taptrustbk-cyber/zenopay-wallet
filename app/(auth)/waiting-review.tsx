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
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.iconContainer}>
            <Clock size={62} color="#FFFFFF" strokeWidth={1.8} />
          </View>

          <Text style={styles.title}>{i18n.t('pendingAdminReview')}</Text>
          <Text style={styles.subtitle}>{i18n.t('accountUnderReview')}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Mail size={20} color={UI.primary} />
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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{i18n.t('checkStatus')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.kycSection}>
          <Text style={styles.kycTitle}>{i18n.t('kycDocuments')}</Text>
          <Text style={styles.kycSubtitle}>{i18n.t('uploadDocsToComplete')}</Text>

          <TouchableOpacity onPress={() => pickImage(setIdFront)} style={styles.uploadBtn} activeOpacity={0.9}>
            <Text style={styles.uploadText}>
              {idFront ? `${i18n.t('idFrontSelected')} ✅` : i18n.t('uploadIDFront')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pickImage(setIdBack)} style={styles.uploadBtn} activeOpacity={0.9}>
            <Text style={styles.uploadText}>
              {idBack ? `${i18n.t('idBackSelected')} ✅` : i18n.t('uploadIDBack')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pickImage(setSelfie)} style={styles.uploadBtn} activeOpacity={0.9}>
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
            activeOpacity={0.9}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{i18n.t('uploadDocuments')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>{i18n.t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const UI = {
  bg: '#EEF4FF',
  card: '#FFFFFF',
  soft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  border: '#D9E5F6',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EAF2FF',
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
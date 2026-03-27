import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Upload, CheckCircle, X, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import i18n from '@/lib/i18n';

type PickedImage = {
  uri: string;
  mimeType: string;
  width?: number;
  height?: number;
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
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  shadow: '#7DA8E6',
};

const SHADOWS = {
  card: {
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
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

const KYC_BUCKET = 'kyc-documents';

export default function KycWait() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [idFront, setIdFront] = useState<PickedImage | null>(null);
  const [idBack, setIdBack] = useState<PickedImage | null>(null);
  const [selfie, setSelfie] = useState<PickedImage | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => !!(idFront && idBack && selfie), [idFront, idBack, selfie]);

  const pickImage = async (type: 'idFront' | 'idBack' | 'selfie') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          (i18n.t('common.permissionRequired') as string) || 'Permission Required',
          (i18n.t('kyc.photoPermissionDenied') as string) || 'Photo permission was denied'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const imageData: PickedImage = {
          uri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          width: asset.width,
          height: asset.height,
        };

        if (type === 'idFront') setIdFront(imageData);
        if (type === 'idBack') setIdBack(imageData);
        if (type === 'selfie') setSelfie(imageData);
      }
    } catch (e) {
      console.error('pickImage error:', e);
      Alert.alert(
        (i18n.t('common.error') as string) || 'Error',
        (i18n.t('kyc.failedPickImage') as string) || 'Failed to pick image'
      );
    }
  };

  const clearImage = (type: 'idFront' | 'idBack' | 'selfie') => {
    if (type === 'idFront') setIdFront(null);
    if (type === 'idBack') setIdBack(null);
    if (type === 'selfie') setSelfie(null);
  };

  const uploadAsJpeg = async (
    imageData: PickedImage,
    fixedBaseName: 'id_front' | 'id_back' | 'selfie'
  ) => {
    if (!user) throw new Error('No user');

    const filename = `${fixedBaseName}.jpeg`;
    const path = `${user.id}/${filename}`;

    const response = await fetch(imageData.uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const file = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage.from(KYC_BUCKET).upload(path, file, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

    if (error) throw error;

    return path;
  };

  const submitKycDocuments = async () => {
    if (!canSubmit || !user) return;

    setLoading(true);

    try {
      const idFrontPath = await uploadAsJpeg(idFront!, 'id_front');
      const idBackPath = await uploadAsJpeg(idBack!, 'id_back');
      const selfiePath = await uploadAsJpeg(selfie!, 'selfie');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_submitted_at: new Date().toISOString(),
          id_front: idFrontPath,
          id_back: idBackPath,
          selfie: selfiePath,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSubmitted(true);
    } catch (error: any) {
      console.error('KYC submission error:', error);
      Alert.alert(
        (i18n.t('common.error') as string) || 'Error',
        `${(i18n.t('kyc.kycSubmitFailed') as string) || 'KYC submission failed'}\n${error?.message || ''}`.trim()
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const UploadCard = ({
    label,
    value,
    onPick,
    onClear,
  }: {
    label: string;
    value: PickedImage | null;
    onPick: () => void;
    onClear: () => void;
  }) => {
    const aspectRatio =
      value?.width && value?.height && value.height > 0 ? value.width / value.height : undefined;

    return (
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>

          {value ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.smallBtn} onPress={onPick} activeOpacity={0.85}>
                <RefreshCw size={16} color={UI.text} />
                <Text style={styles.smallBtnText}>
                  {(i18n.t('common.change') as string) || 'Change'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallBtn, styles.smallBtnDanger]}
                onPress={onClear}
                activeOpacity={0.85}
              >
                <X size={16} color={UI.danger} />
                <Text style={[styles.smallBtnText, { color: UI.danger }]}>
                  {(i18n.t('common.remove') as string) || 'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.uploadBox, value ? styles.uploadBoxFilled : styles.uploadBoxEmpty]}
          onPress={onPick}
          activeOpacity={0.9}
        >
          {value ? (
            <View style={styles.previewWrap}>
              <Image
                source={{ uri: value.uri }}
                style={[styles.previewImage, aspectRatio ? { aspectRatio } : null]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.iconCircle}>
                <Upload size={22} color={UI.blue} />
              </View>
              <Text style={styles.placeholderTitle}>
                {(i18n.t('kyc.tapToUpload') as string) || 'Tap to upload'}
              </Text>
              <Text style={styles.placeholderSub}>
                {(i18n.t('kyc.uploadHint') as string) || 'Upload a clear image'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.center}>
            <View style={styles.successCircle}>
              <CheckCircle size={62} color={UI.blue} strokeWidth={2.2} />
            </View>

            <Text style={styles.successTitle}>
              {(i18n.t('kyc.kycDocsSubmitted') as string) || 'KYC documents submitted'}
            </Text>

            <Text style={styles.successText}>
              {(i18n.t('kyc.waitForApproval2') as string) || 'Please wait for approval.'}
            </Text>

            <Text style={styles.successText}>
              {(i18n.t('kyc.contactSupport') as string) || 'Contact support'}{' '}
              <Text style={styles.emailText}>info@zenopay.bond</Text>
            </Text>

            <Text style={styles.securityText}>
              {(i18n.t('kyc.docsSecure') as string) || 'Your documents are stored securely.'}
            </Text>

            <Text style={styles.approvalTimeNote}>
              {(i18n.t('kyc.approvalTimeNote') as string) ||
                'Approval may take some time. We will review your documents as soon as possible.'}
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleBackToLogin}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnText}>
                {(i18n.t('auth.backToLogin') as string) || 'Back to Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          <Text style={styles.brand}>ZenoPay</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <Text style={styles.title}>
            {(i18n.t('kyc.uploadKycDocs') as string) || 'Upload KYC Documents'}
          </Text>
          <Text style={styles.desc}>
            {(i18n.t('kyc.approveAccountPrompt') as string) ||
              'Upload the required documents to approve your account.'}
          </Text>
        </View>

        <UploadCard
          label={(i18n.t('kyc.governmentIDFront') as string) || 'Government ID Front'}
          value={idFront}
          onPick={() => pickImage('idFront')}
          onClear={() => clearImage('idFront')}
        />

        <UploadCard
          label={(i18n.t('kyc.governmentIDBack') as string) || 'Government ID Back'}
          value={idBack}
          onPick={() => pickImage('idBack')}
          onClear={() => clearImage('idBack')}
        />

        <UploadCard
          label={(i18n.t('kyc.selfieWithID') as string) || 'Selfie with ID'}
          value={selfie}
          onPick={() => pickImage('selfie')}
          onClear={() => clearImage('selfie')}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSubmit || loading) && styles.primaryBtnDisabled]}
          onPress={submitKycDocuments}
          disabled={!canSubmit || loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>
                {(i18n.t('kyc.submitting') as string) || 'Submitting...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>
              {(i18n.t('kyc.submitKycDocuments') as string) || 'Submit KYC Documents'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          {(i18n.t('kyc.kycPrivacyNote') as string) ||
            'Your documents are used only for identity verification and account approval.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  scroll: {
    padding: 18,
    paddingTop: Platform.select({ ios: 54, android: 34, default: 34 }),
    paddingBottom: 28,
  },

  brandWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  brand: {
    fontSize: 28,
    fontWeight: '900',
    color: UI.text,
    letterSpacing: 0.3,
  },

  heroCard: {
    backgroundColor: UI.blue,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    left: -40,
    bottom: -90,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    right: -20,
    top: -40,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  desc: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 19,
    fontWeight: '700',
  },

  section: {
    marginTop: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  label: {
    fontSize: 14.5,
    fontWeight: '700',
    color: UI.text,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#FFFFFF',
  },
  smallBtnDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF7F7',
  },
  smallBtnText: {
    fontSize: 12.5,
    color: UI.text,
    fontWeight: '700',
  },

  uploadBox: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...SHADOWS.soft,
  },
  uploadBoxEmpty: {},
  uploadBoxFilled: {},

  placeholder: {
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 170,
    backgroundColor: UI.blueSoft,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  placeholderTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: UI.text,
  },
  placeholderSub: {
    marginTop: 4,
    fontSize: 12.5,
    color: UI.text2,
    textAlign: 'center',
    fontWeight: '700',
  },

  previewWrap: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
  },

  primaryBtn: {
    marginTop: 18,
    backgroundColor: UI.blue,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  footerNote: {
    marginTop: 12,
    fontSize: 12.5,
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '700',
  },

  center: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 24,
  },
  successCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  successText: {
    fontSize: 14,
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
    fontWeight: '700',
  },
  emailText: {
    color: UI.blue,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  securityText: {
    fontSize: 12.5,
    color: UI.text2,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
    fontWeight: '700',
  },

  approvalTimeNote: {
    fontSize: 13.5,
    color: UI.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
});
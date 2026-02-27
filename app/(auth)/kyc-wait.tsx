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
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  danger: '#DC2626',
  shadow: '#000000',
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
        Alert.alert(i18n.t('permissionRequired'), i18n.t('photoPermissionDenied'));
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
      Alert.alert(i18n.t('error'), i18n.t('failedPickImage'));
    }
  };

  const clearImage = (type: 'idFront' | 'idBack' | 'selfie') => {
    if (type === 'idFront') setIdFront(null);
    if (type === 'idBack') setIdBack(null);
    if (type === 'selfie') setSelfie(null);
  };

  // ✅ convert any picked image to JPEG bytes and upload with a fixed name: id_front.jpeg etc
  const uploadAsJpeg = async (imageData: PickedImage, fixedBaseName: 'id_front' | 'id_back' | 'selfie') => {
    if (!user) throw new Error('No user');

    // Always write .jpeg (even if source is png/heic). This keeps your bucket consistent.
    const filename = `${fixedBaseName}.jpeg`;
    const path = `${user.id}/${filename}`;

    const response = await fetch(imageData.uri);
    const blob = await response.blob();

    // NOTE: On iOS/Android, expo-image-picker usually returns JPEG already,
    // but we still upload as image/jpeg to force consistency.
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const file = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage.from(KYC_BUCKET).upload(path, file, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

    if (error) throw error;

    return path; // return "userId/id_front.jpeg" etc
  };

  const submitKycDocuments = async () => {
    if (!canSubmit || !user) return;

    setLoading(true);

    try {
      // ✅ upload files (fixed names)
      const idFrontPath = await uploadAsJpeg(idFront!, 'id_front');
      const idBackPath = await uploadAsJpeg(idBack!, 'id_back');
      const selfiePath = await uploadAsJpeg(selfie!, 'selfie');

      // ✅ update profiles table with file paths + mark kyc pending
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
      Alert.alert(i18n.t('error'), `${i18n.t('kycSubmitFailed')}\n${error?.message || ''}`.trim());
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
                <Text style={styles.smallBtnText}>{i18n.t('change')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallBtn, styles.smallBtnDanger]}
                onPress={onClear}
                activeOpacity={0.85}
              >
                <X size={16} color={UI.danger} />
                <Text style={[styles.smallBtnText, { color: UI.danger }]}>{i18n.t('remove')}</Text>
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
                <Upload size={22} color={UI.green} />
              </View>
              <Text style={styles.placeholderTitle}>{i18n.t('tapToUpload')}</Text>
              <Text style={styles.placeholderSub}>{i18n.t('uploadHint')}</Text>
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
              <CheckCircle size={62} color={UI.green} strokeWidth={2.2} />
            </View>

            <Text style={styles.successTitle}>{i18n.t('kycDocsSubmitted')}</Text>

            <Text style={styles.successText}>{i18n.t('waitForApproval2')}</Text>

            <Text style={styles.successText}>
              {i18n.t('contactSupport')}{' '}
              <Text style={styles.emailText}>info@zenopay.bond</Text>
            </Text>

            <Text style={styles.securityText}>{i18n.t('docsSecure')}</Text>

            {/* ✅ new text above button */}
            <Text style={styles.approvalTimeNote}>{i18n.t('approvalTimeNote')}</Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleBackToLogin} activeOpacity={0.9}>
              <Text style={styles.primaryBtnText}>{i18n.t('backToLogin2')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>ZenoPay</Text>

        <View style={styles.headerCard}>
          <Text style={styles.title}>{i18n.t('uploadKycDocs')}</Text>
          <Text style={styles.desc}>{i18n.t('approveAccountPrompt')}</Text>
        </View>

        <UploadCard
          label={i18n.t('governmentIDFront')}
          value={idFront}
          onPick={() => pickImage('idFront')}
          onClear={() => clearImage('idFront')}
        />

        <UploadCard
          label={i18n.t('governmentIDBack')}
          value={idBack}
          onPick={() => pickImage('idBack')}
          onClear={() => clearImage('idBack')}
        />

        <UploadCard
          label={i18n.t('selfieWithID')}
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
              <Text style={styles.primaryBtnText}>{i18n.t('submitting')}</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>{i18n.t('submitKycDocuments')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>{i18n.t('kycPrivacyNote')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  scroll: {
    padding: 18,
    paddingTop: Platform.select({ ios: 54, android: 34, default: 34 }),
    paddingBottom: 28,
  },

  brand: {
    fontSize: 28,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  headerCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: '800', color: UI.text, marginBottom: 6 },
  desc: { fontSize: 13.5, color: UI.text2, lineHeight: 19 },

  section: { marginTop: 12 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  label: { fontSize: 14.5, fontWeight: '700', color: UI.text },

  actionsRow: { flexDirection: 'row', gap: 8 },
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
  smallBtnDanger: { borderColor: '#FECACA', backgroundColor: '#FFF7F7' },
  smallBtnText: { fontSize: 12.5, color: UI.text, fontWeight: '700' },

  uploadBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  uploadBoxEmpty: {},
  uploadBoxFilled: {},

  placeholder: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 170,
    backgroundColor: UI.greenSoft,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  placeholderTitle: { fontSize: 14.5, fontWeight: '800', color: UI.text },
  placeholderSub: { marginTop: 4, fontSize: 12.5, color: UI.text2, textAlign: 'center' },

  previewWrap: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: UI.border,
  },

  primaryBtn: {
    marginTop: 18,
    backgroundColor: UI.green,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: UI.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 3,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  footerNote: {
    marginTop: 12,
    fontSize: 12.5,
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 18,
  },

  center: { alignItems: 'center', paddingTop: 30, paddingBottom: 24 },
  successCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: UI.greenSoft,
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
  },
  emailText: { color: UI.green, fontWeight: '800', textDecorationLine: 'underline' },
  securityText: { fontSize: 12.5, color: UI.text2, textAlign: 'center', marginTop: 2, marginBottom: 14 },

  approvalTimeNote: {
    fontSize: 13.5,
    color: UI.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
});

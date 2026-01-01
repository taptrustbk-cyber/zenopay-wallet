import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

export default function KYCScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);

  const pickImage = async (type: 'front' | 'back' | 'selfie') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'front') setFrontImage(uri);
      else if (type === 'back') setBackImage(uri);
      else setSelfieImage(uri);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!frontImage || !backImage || !selfieImage) {
        throw new Error('Please upload all required images');
      }

      const uploadFile = async (uri: string, fileName: string) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const fileExt = uri.split('.').pop();
        const filePath = `${user!.id}/${fileName}.${fileExt}`;

        const { error } = await supabase.storage
          .from('kyc-documents')
          .upload(filePath, arrayBuffer, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('kyc-documents')
          .getPublicUrl(filePath);

        return publicUrl;
      };

      const frontUrl = await uploadFile(frontImage, 'front');
      const backUrl = await uploadFile(backImage, 'back');
      const selfieUrl = await uploadFile(selfieImage, 'selfie');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'pending',
          kyc_front_photo: frontUrl,
          kyc_back_photo: backUrl,
          kyc_selfie_photo: selfieUrl
        })
        .eq('id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      Alert.alert(i18n.t('success'), i18n.t('uploadSuccess'));
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error.message);
    },
  });

  const getStatusColor = () => {
    switch (profile?.kyc_status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>{i18n.t('kycStatus')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>
              {i18n.t(profile?.kyc_status === 'not_started' ? 'notStarted' : profile?.kyc_status || 'notStarted')}
            </Text>
          </View>
        </View>

        {profile?.kyc_status !== 'approved' && (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{i18n.t('kyc')}</Text>

            <View style={styles.uploadSection}>
              <Text style={[styles.label, { color: theme.colors.text }]}>1. ID-Front</Text>
              {frontImage ? (
                <Image source={{ uri: frontImage }} style={styles.preview} />
              ) : (
                <TouchableOpacity
                  style={[styles.uploadButton, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                  onPress={() => pickImage('front')}
                >
                  <Text style={[styles.uploadButtonText, { color: theme.colors.textSecondary }]}>📷 Upload</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.uploadSection}>
              <Text style={[styles.label, { color: theme.colors.text }]}>2. ID-Back</Text>
              {backImage ? (
                <Image source={{ uri: backImage }} style={styles.preview} />
              ) : (
                <TouchableOpacity
                  style={[styles.uploadButton, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                  onPress={() => pickImage('back')}
                >
                  <Text style={[styles.uploadButtonText, { color: theme.colors.textSecondary }]}>📷 Upload</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.uploadSection}>
              <Text style={[styles.label, { color: theme.colors.text }]}>3. Selfie</Text>
              {selfieImage ? (
                <Image source={{ uri: selfieImage }} style={styles.preview} />
              ) : (
                <TouchableOpacity
                  style={[styles.uploadButton, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                  onPress={() => pickImage('selfie')}
                >
                  <Text style={[styles.uploadButtonText, { color: theme.colors.textSecondary }]}>📷 Upload</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !frontImage || !backImage || !selfieImage}
            >
              {uploadMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>{i18n.t('submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {profile?.kyc_status === 'approved' && (
          <View style={[styles.approvedCard, { backgroundColor: theme.colors.card }]}>
            <Text style={styles.approvedText}>✅</Text>
            <Text style={[styles.approvedTitle, { color: theme.colors.success }]}>KYC Approved!</Text>
            <Text style={[styles.approvedDescription, { color: theme.colors.textSecondary }]}>
              Your identity has been verified successfully.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statusCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusLabel: {
    fontSize: 16,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 24,
  },
  uploadSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  uploadButton: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  submitButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  approvedCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  approvedText: {
    fontSize: 64,
    marginBottom: 16,
  },
  approvedTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 8,
  },
  approvedDescription: {
    fontSize: 16,
    textAlign: 'center' as const,
  },
});

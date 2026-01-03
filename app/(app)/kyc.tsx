import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Upload, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function KYCScreen() {
  const { user, signOut } = useAuth();
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = idFront && idBack && selfie;

  const pickImage = async (setter: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  };

  const uploadFile = async (fileUri: string, fileName: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const response = await fetch(fileUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from('kyc-documents')
      .upload(`${user.id}/${fileName}`, uint8Array, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;
  };

  const submitKycDocuments = async () => {
    if (!canSubmit || !user?.id) return;

    setLoading(true);

    try {
      await uploadFile(idFront!, 'id_front.jpg');
      await uploadFile(idBack!, 'id_back.jpg');
      await uploadFile(selfie!, 'selfie.jpg');

      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_submitted_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setIdFront(null);
      setIdBack(null);
      setSelfie(null);
      setSubmitted(true);
    } catch (error: any) {
      console.error('KYC submission error:', error);
      Alert.alert(
        'Upload Failed',
        'Failed to submit KYC documents. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:info@zenopay.bond');
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.successIconContainer}>
              <CheckCircle size={80} color="#4CAF50" strokeWidth={2} />
            </View>

            <Text style={styles.successTitle}>
              Your documents were successfully submitted!
            </Text>

            <Text style={styles.description}>
              Please wait for Zenopay to approve your account. Approval time is
              between <Text style={styles.bold}>1 to 6 hours</Text>.
            </Text>

            <Text style={styles.description}>
              If you need assistance, contact support at:{' '}
              <Text style={styles.emailLink} onPress={handleEmailSupport}>
                info@zenopay.bond
              </Text>
            </Text>

            <Text style={styles.securityNote}>
              Your documents are stored securely and are safe within the Zenopay
              app.
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.header}>ZenoPay</Text>

          <Text style={styles.title}>PLEASE UPLOAD KYC DOCUMENTS</Text>

          <Text style={styles.description}>
            To approve your account and login successfully, please upload the
            required documents below.
          </Text>

          <View style={styles.uploadsContainer}>
            <View style={styles.uploadSection}>
              <Text style={styles.label}>Government ID (Front)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage(setIdFront)}
              >
                {idFront ? (
                  <Image source={{ uri: idFront }} style={styles.preview} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Upload size={32} color="#4A90E2" />
                    <Text style={styles.uploadText}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.label}>Government ID (Back)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage(setIdBack)}
              >
                {idBack ? (
                  <Image source={{ uri: idBack }} style={styles.preview} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Upload size={32} color="#4A90E2" />
                    <Text style={styles.uploadText}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.label}>Selfie with ID</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage(setSelfie)}
              >
                {selfie ? (
                  <Image source={{ uri: selfie }} style={styles.preview} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Upload size={32} color="#4A90E2" />
                    <Text style={styles.uploadText}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={submitKycDocuments}
        disabled={!canSubmit || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit KYC Documents'}
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#4A90E2',
    marginBottom: 32,
    textAlign: 'center' as const,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#B0BEC5',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  uploadsContainer: {
    gap: 24,
  },
  uploadSection: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  uploadButton: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A2332',
    borderWidth: 2,
    borderColor: '#2A3442',
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#78909C',
  },
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  submitButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#2A3442',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#4CAF50',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  bold: {
    fontWeight: 'bold' as const,
  },
  emailLink: {
    color: '#4A90E2',
    textDecorationLine: 'underline',
  },
  securityNote: {
    fontSize: 13,
    color: '#78909C',
    textAlign: 'center' as const,
    marginTop: 16,
    lineHeight: 20,
  },
  backButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#2A3442',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Upload, CheckCircle } from 'lucide-react-native';

export default function KycWait() {
  const { user, signOut } = useAuth();
  const [idFront, setIdFront] = useState<{ uri: string; mimeType: string } | null>(null);
  const [idBack, setIdBack] = useState<{ uri: string; mimeType: string } | null>(null);
  const [selfie, setSelfie] = useState<{ uri: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = idFront && idBack && selfie;

  const pickImage = async (type: 'idFront' | 'idBack' | 'selfie') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const mimeType = asset.mimeType || 'image/jpeg';
      
      const imageData = { uri, mimeType };
      if (type === 'idFront') setIdFront(imageData);
      else if (type === 'idBack') setIdBack(imageData);
      else if (type === 'selfie') setSelfie(imageData);
    }
  };

  const submitKycDocuments = async () => {
    if (!canSubmit || !user) return;

    setLoading(true);

    try {
      const uploadFile = async (imageData: { uri: string; mimeType: string }, basename: string) => {
        const response = await fetch(imageData.uri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const file = new Uint8Array(arrayBuffer);

        const extension = imageData.mimeType.split('/')[1] || 'jpg';
        const filename = `${basename}.${extension}`;
        const path = `${user.id}/${filename}`;
        
        const { error } = await supabase.storage
          .from('kyc-documents')
          .upload(path, file, { 
            upsert: true,
            contentType: imageData.mimeType
          });
        
        if (error) throw error;
      };

      await uploadFile(idFront!, 'id_front');
      await uploadFile(idBack!, 'id_back');
      await uploadFile(selfie!, 'selfie');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_submitted_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setIdFront(null);
      setIdBack(null);
      setSelfie(null);
      setSubmitted(true);
    } catch (error) {
      console.error('KYC submission error:', error);
      Alert.alert('Error', 'Failed to submit KYC documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successIconContainer}>
            <CheckCircle size={80} color="#10B981" strokeWidth={2} />
          </View>

          <Text style={styles.successTitle}>Your documents were successfully submitted!</Text>

          <Text style={styles.successText}>
            Please wait for Zenopay to approve your account. Approval time is between{' '}
            <Text style={styles.boldText}>1 to 6 hours</Text>.
          </Text>

          <Text style={styles.successText}>
            If you need assistance, contact support at:{' '}
            <Text style={styles.emailText}>info@zenopay.bond</Text>
          </Text>

          <Text style={styles.securityText}>
            Your documents are stored securely and are safe within the Zenopay app.
          </Text>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToLogin}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>ZenoPay</Text>

        <Text style={styles.title}>PLEASE UPLOAD KYC DOCUMENTS</Text>
        
        <Text style={styles.description}>
          To approve your account and login successfully, please upload the required documents below.
        </Text>

        <View style={styles.uploadsContainer}>
          <View style={styles.uploadSection}>
            <Text style={styles.label}>Government ID (Front)</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => pickImage('idFront')}
            >
              {idFront ? (
                <Image source={{ uri: idFront.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Upload size={32} color="#64748B" />
                  <Text style={styles.uploadText}>Tap to upload</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.label}>Government ID (Back)</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => pickImage('idBack')}
            >
              {idBack ? (
                <Image source={{ uri: idBack.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Upload size={32} color="#64748B" />
                  <Text style={styles.uploadText}>Tap to upload</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.label}>Selfie with ID</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => pickImage('selfie')}
            >
              {selfie ? (
                <Image source={{ uri: selfie.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Upload size={32} color="#64748B" />
                  <Text style={styles.uploadText}>Tap to upload</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={submitKycDocuments}
          disabled={!canSubmit || loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit KYC Documents'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 24,
  },
  uploadsContainer: {
    marginBottom: 24,
  },
  uploadSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    borderStyle: 'dashed' as const,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
  previewImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#475569',
    shadowOpacity: 0,
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
    fontWeight: '700' as const,
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 20,
  },
  successText: {
    fontSize: 15,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  emailText: {
    color: '#3B82F6',
    textDecorationLine: 'underline' as const,
  },
  securityText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#475569',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url ?? null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const avatarPreview = useMemo(() => {
    if (!avatarUrl) return null;
    // cache-bust so user sees updated image immediately
    const sep = avatarUrl.includes('?') ? '&' : '?';
    return `${avatarUrl}${sep}t=${Date.now()}`;
  }, [avatarUrl]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      Alert.alert(i18n.t('success'), i18n.t('profileUpdated'));
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error.message);
    },
  });

  const uploadAvatarToSupabase = async (uri: string) => {
    if (!user?.id) {
      Alert.alert(i18n.t('error'), 'Not authenticated');
      return;
    }

    try {
      setSavingAvatar(true);

      // Convert local file to bytes
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const fileExt = (uri.split('.').pop() || 'jpg').toLowerCase();
      const contentType =
        fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

      // ثابت: نفس المسار حتى "يستبدل" الصورة القديمة
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload (replace old) -> upsert:true
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;

      if (!publicUrl) throw new Error('Failed to get public URL');

      // Save to profile table (so dashboard can use it too)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setAvatarUrl(publicUrl);
      refreshProfile();
      Alert.alert(i18n.t('success'), i18n.t('profileUpdated'));
    } catch (e: any) {
      console.error('Avatar upload error:', e);
      Alert.alert(i18n.t('error'), e?.message || 'Upload failed');
    } finally {
      setSavingAvatar(false);
    }
  };

  const pickFromGallery = async () => {
    setPickerOpen(false);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(i18n.t('error'), 'Permission to access photos is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    await uploadAvatarToSupabase(uri);
  };

  const takeNewPhoto = async () => {
    setPickerOpen(false);

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(i18n.t('error'), 'Permission to use camera is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    await uploadAvatarToSupabase(uri);
  };

  return (
    <View style={styles.container}>
      {/* Header (same design like terms-conditions) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#111111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('profile')}</Text>

        <View style={{ width: 24 }} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Top card */}
          <View style={styles.topCard}>
            {/* Avatar circle */}
            <View style={styles.avatarWrap}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.avatarBtn}
                onPress={() => setPickerOpen(true)}
                disabled={savingAvatar}
              >
                {avatarPreview ? (
                  <Image source={{ uri: avatarPreview }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={34} color="#16a34a" />
                  </View>
                )}

                <View style={styles.avatarPencil}>
                  {savingAvatar ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>

              <Text style={styles.avatarHint}>
                {i18n.t('tapToChangePhoto') ?? 'Tap to change photo'}
              </Text>
            </View>

            {/* Email */}
            <Text style={styles.label}>{i18n.t('email')}</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{user?.email}</Text>
            </View>

            {/* Full name */}
            <Text style={styles.label}>{i18n.t('fullName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('fullName')}
              placeholderTextColor="#6B7280"
              value={fullName}
              onChangeText={setFullName}
            />

            {/* Status */}
            <Text style={styles.label}>{i18n.t('accountActive')}</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {profile?.kyc_status === 'approved'
                  ? i18n.t('active')
                  : i18n.t((profile as any)?.kyc_status || 'notStarted')}
              </Text>
            </View>

            {(profile as any)?.date_of_birth ? (
              <>
                <Text style={styles.label}>{i18n.t('dateOfBirthLabel')}</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{(profile as any).date_of_birth}</Text>
                </View>
              </>
            ) : null}

            {(profile as any)?.phone_number ? (
              <>
                <Text style={styles.label}>{i18n.t('phoneLabel')}</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{(profile as any).phone_number}</Text>
                </View>
              </>
            ) : null}

            {(profile as any)?.city ? (
              <>
                <Text style={styles.label}>{i18n.t('cityLabel')}</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{(profile as any).city}</Text>
                </View>
              </>
            ) : null}

            {(profile as any)?.country ? (
              <>
                <Text style={styles.label}>{i18n.t('countryLabel')}</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{(profile as any).country}</Text>
                </View>
              </>
            ) : null}

            {/* Green button */}
            <TouchableOpacity
              style={[styles.primaryButton, (updateMutation.isPending || savingAvatar) && { opacity: 0.7 }]}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || savingAvatar}
              activeOpacity={0.9}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>{i18n.t('updateProfile')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Picker Modal (2 buttons) */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            {i18n.t('changePhoto') ?? 'Change profile photo'}
          </Text>

          <TouchableOpacity style={styles.sheetButton} activeOpacity={0.9} onPress={pickFromGallery}>
            <Ionicons name="images" size={18} color="#111111" />
            <Text style={styles.sheetButtonText}>
              {i18n.t('selectExistingPhoto') ?? 'Select existing photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetButton} activeOpacity={0.9} onPress={takeNewPhoto}>
            <Ionicons name="camera" size={18} color="#111111" />
            <Text style={styles.sheetButtonText}>
              {i18n.t('takeNewPhoto') ?? 'Take a new photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.9} onPress={() => setPickerOpen(false)}>
            <Text style={styles.cancelText}>{i18n.t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same design base (white bg, black text, green primary)
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 6,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#111111',
  },

  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 10,
  },

  topCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  avatarWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPencil: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600' as const,
  },

  label: {
    fontSize: 14,
    fontWeight: '800' as const,
    marginBottom: 8,
    color: '#111111',
  },

  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 52,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111111',
    marginBottom: 16,
  },

  infoBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 52,
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111111',
  },

  primaryButton: {
    marginTop: 6,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800' as const,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#111111',
    textAlign: 'center',
    marginBottom: 10,
  },
  sheetButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  sheetButtonText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#111111',
  },
  cancelBtn: {
    height: 50,
    borderRadius: 14,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: '#111111',
  },
});

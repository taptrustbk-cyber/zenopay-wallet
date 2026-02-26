import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

const COLORS = {
  bg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  white: '#FFFFFF',
};

function safeText(v: any) {
  if (v === null || v === undefined) return '';
  return String(v);
}

/**
 * DB column names
 * ✅ You asked: connect to profiles.date_of_brith (typo in DB)
 */
const COL_DATE = 'date_of_brith';
const COL_DATE_FALLBACK = 'date_of_birth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  // -----------------------------
  // Local state
  // -----------------------------
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [dob, setDob] = useState(
    safeText((profile as any)?.[COL_DATE] ?? (profile as any)?.[COL_DATE_FALLBACK])
  );
  const [phone, setPhone] = useState(safeText((profile as any)?.phone));
  const [country, setCountry] = useState(safeText((profile as any)?.country));
  const [email] = useState(user?.email || safeText((profile as any)?.email));

  const [accountActiveText, setAccountActiveText] = useState('Account is active');

  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // -----------------------------
  // ✅ Refresh profile whenever screen is focused
  // (Fixes avatar/text not persisting on refresh / back navigation)
  // -----------------------------
  useFocusEffect(
    useCallback(() => {
      refreshProfile?.();
    }, [refreshProfile])
  );

  // -----------------------------
  // Sync UI state with profile changes
  // -----------------------------
  useEffect(() => {
    setFullName(profile?.full_name || '');
    setDob(safeText((profile as any)?.[COL_DATE] ?? (profile as any)?.[COL_DATE_FALLBACK]));
    setPhone(safeText((profile as any)?.phone));
    setCountry(safeText((profile as any)?.country));
    setAvatarUrl((profile as any)?.avatar_url ?? null);

    setAccountActiveText(i18n.t('accountActive') || 'Account is active');
  }, [
    profile?.full_name,
    (profile as any)?.[COL_DATE],
    (profile as any)?.[COL_DATE_FALLBACK],
    (profile as any)?.phone,
    (profile as any)?.country,
    (profile as any)?.avatar_url,
  ]);

  // -----------------------------
  // ✅ Avatar cache-bust (prevents showing old cached image)
  // -----------------------------
  const lastAvatarUrlRef = useRef<string | null>(null);
  const [avatarCacheBust, setAvatarCacheBust] = useState<number>(Date.now());

  useEffect(() => {
    const url = (profile as any)?.avatar_url ?? avatarUrl ?? null;
    if (url && url !== lastAvatarUrlRef.current) {
      lastAvatarUrlRef.current = url;
      setAvatarCacheBust(Date.now());
    }
  }, [(profile as any)?.avatar_url, avatarUrl]);

  const avatarPreview = useMemo(() => {
    const url = (profile as any)?.avatar_url ?? avatarUrl ?? null;
    if (!url) return null;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${avatarCacheBust}`;
  }, [(profile as any)?.avatar_url, avatarUrl, avatarCacheBust]);

  // -----------------------------
  // ✅ Auto-save (debounced) when user edits inputs
  // -----------------------------
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastSaved = useRef({
    full_name: profile?.full_name || '',
    date_of_brith: safeText((profile as any)?.[COL_DATE] ?? (profile as any)?.[COL_DATE_FALLBACK]),
    phone: safeText((profile as any)?.phone),
    country: safeText((profile as any)?.country),
  });

  useEffect(() => {
    if (!user?.id) return;

    const current = {
      full_name: fullName.trim(),
      date_of_brith: dob.trim(),
      phone: phone.trim(),
      country: country.trim(),
    };

    const prev = {
      full_name: (lastSaved.current.full_name || '').trim(),
      date_of_brith: (lastSaved.current.date_of_brith || '').trim(),
      phone: (lastSaved.current.phone || '').trim(),
      country: (lastSaved.current.country || '').trim(),
    };

    if (
      current.full_name === prev.full_name &&
      current.date_of_brith === prev.date_of_brith &&
      current.phone === prev.phone &&
      current.country === prev.country
    ) {
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        const payload: any = {
          full_name: current.full_name,
          [COL_DATE]: current.date_of_brith, // ✅ profiles.date_of_brith
          phone: current.phone,
          country: current.country,
        };

        const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
        if (error) throw error;

        lastSaved.current = { ...current };
        await refreshProfile?.();
      } catch (e: any) {
        console.error('Auto save profile error:', e);
      }
    }, 650);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [fullName, dob, phone, country, user?.id, refreshProfile]);

  // -----------------------------
  // Manual Save (button)
  // -----------------------------
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const payload: any = {
        full_name: fullName.trim(),
        [COL_DATE]: dob.trim(),
        phone: phone.trim(),
        country: country.trim(),
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      lastSaved.current = {
        full_name: fullName.trim(),
        date_of_brith: dob.trim(),
        phone: phone.trim(),
        country: country.trim(),
      };
      await refreshProfile?.();
      Alert.alert(i18n.t('success') || 'Success', i18n.t('profileUpdated') || 'Profile updated');
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error') || 'Error', error?.message || 'Failed');
    },
  });

  // -----------------------------
  // Avatar upload
  // -----------------------------
  const uploadAvatarToSupabase = async (uri: string) => {
    if (!user?.id) {
      Alert.alert(i18n.t('error') || 'Error', 'Not authenticated');
      return;
    }

    try {
      setSavingAvatar(true);

      const resp = await fetch(uri);
      const blob = await resp.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const mime = blob.type || 'image/jpeg';
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

      // ✅ fixed path (overwrite old avatar)
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, arrayBuffer, {
        upsert: true,
        contentType: mime,
        cacheControl: '0',
      });
      if (uploadError) throw uploadError;

      // ✅ get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');

      // ✅ save url in profiles.avatar_url
      const { error: dbError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (dbError) throw dbError;

      // ✅ update UI + cache-bust + refresh
      setAvatarUrl(publicUrl);
      setAvatarCacheBust(Date.now());
      await refreshProfile?.();

      Alert.alert(i18n.t('success') || 'Success', i18n.t('profileUpdated') || 'Profile updated');
    } catch (e: any) {
      console.error('Avatar upload error:', e);
      Alert.alert(i18n.t('error') || 'Error', e?.message || 'Upload failed');
    } finally {
      setSavingAvatar(false);
    }
  };

  const pickFromGallery = async () => {
    setPickerOpen(false);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(i18n.t('error') || 'Error', 'Permission to access photos is required');
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
      Alert.alert(i18n.t('error') || 'Error', 'Permission to use camera is required');
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

  // Status text
  const statusText =
    (profile as any)?.kyc_status === 'approved'
      ? i18n.t('active') || 'Active'
      : (i18n.t((profile as any)?.kyc_status || 'notStarted') as any);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('profile') || 'Profile'}</Text>

        <View style={{ width: 24 }} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Avatar */}
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
                    <Ionicons name="person" size={34} color={COLORS.green} />
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

              <Text style={styles.avatarHint}>{i18n.t('tapToChangePhoto') || 'Tap to change photo'}</Text>
            </View>

            {/* Full Name */}
<Text style={styles.label}>{i18n.t('fullName')}</Text>
<TextInput
  style={styles.input}
  placeholder={i18n.t('fullNamePlaceholder')}
  placeholderTextColor={COLORS.textSecondary}
  value={fullName}
  onChangeText={setFullName}
  autoCapitalize="words"
/>

{/* Date Of Birth */}
<Text style={styles.label}>{i18n.t('dateOfBirth')}</Text>
<TextInput
  style={styles.input}
  placeholder={i18n.t('dateOfBirthPlaceholder')}
  placeholderTextColor={COLORS.textSecondary}
  value={dob}
  onChangeText={setDob}
/>

{/* Phone Number */}
<Text style={styles.label}>{i18n.t('phoneNumber')}</Text>
<TextInput
  style={styles.input}
  placeholder={i18n.t('phoneNumberPlaceholder')}
  placeholderTextColor={COLORS.textSecondary}
  value={phone}
  onChangeText={setPhone}
  keyboardType="phone-pad"
/>

{/* Email (readonly) */}
<Text style={styles.label}>{i18n.t('email')}</Text>
<View style={styles.infoBox}>
  <Text style={styles.infoText}>{user?.email || email}</Text>
</View>

{/* Country */}
<Text style={styles.label}>{i18n.t('country')}</Text>
<TextInput
  style={styles.input}
  placeholder={i18n.t('countryPlaceholder')}
  placeholderTextColor={COLORS.textSecondary}
  value={country}
  onChangeText={setCountry}
/>
            {/* Account status */}
            <Text style={styles.label}>{accountActiveText}</Text>
            <View style={styles.statusBox}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{statusText}</Text>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.primaryButton, (updateMutation.isPending || savingAvatar) && { opacity: 0.7 }]}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || savingAvatar}
              activeOpacity={0.9}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>{i18n.t('save') || 'Save'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Picker Modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{i18n.t('changePhoto') || 'Change photo'}</Text>

          <TouchableOpacity style={styles.sheetButton} activeOpacity={0.9} onPress={pickFromGallery}>
            <Ionicons name="images" size={18} color={COLORS.text} />
            <Text style={styles.sheetButtonText}>{i18n.t('selectExistingPhoto') || 'Select existing photo'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetButton} activeOpacity={0.9} onPress={takeNewPhoto}>
            <Ionicons name="camera" size={18} color={COLORS.text} />
            <Text style={styles.sheetButtonText}>{i18n.t('takeNewPhoto') || 'Take new photo'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.9} onPress={() => setPickerOpen(false)}>
            <Text style={styles.cancelText}>{i18n.t('cancel') || 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  backButton: { padding: 6, borderRadius: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },

  content: { flex: 1, backgroundColor: COLORS.bg },
  contentContainer: { paddingBottom: 10 },

  card: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  avatarWrap: { alignItems: 'center', marginBottom: 14 },
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
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarPencil: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { marginTop: 10, fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },

  label: { fontSize: 13, fontWeight: '900', marginBottom: 8, color: COLORS.text },

  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },

  infoBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 14,
    height: 52,
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoText: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  statusBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.green },
  statusText: { fontSize: 15, fontWeight: '900', color: COLORS.text },

  primaryButton: {
    marginTop: 6,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  sheetButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  sheetButtonText: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  cancelBtn: {
    height: 50,
    borderRadius: 14,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelText: { fontSize: 15, fontWeight: '900', color: COLORS.text },
});

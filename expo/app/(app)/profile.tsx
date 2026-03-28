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
  Animated,
  Easing,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

const COLORS = {
  bg: '#EEF4FF',
  bgSoft: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#D9E5F6',

  blue: '#2563EB',
  blue2: '#3B82F6',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  success: '#16A34A',
  successSoft: '#EAF8EF',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',

  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.28)',
};

const SHADOWS = {
  card: {
    shadowColor: '#7DA8E6',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#8BA9D6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

function safeText(v: any) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function tSafe(key: string, fallback: string) {
  try {
    const value = i18n.t(key) as unknown as string;
    if (!value) return fallback;

    const text = String(value).trim();
    const lower = text.toLowerCase();

    if (
      !text ||
      text === key ||
      lower.includes('missing translation') ||
      lower.includes('missing "') ||
      text.includes(`"${key}"`)
    ) {
      return fallback;
    }

    return text;
  } catch {
    return fallback;
  }
}

const COL_DATE = 'date_of_brith';
const COL_DATE_FALLBACK = 'date_of_birth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const isRTL = I18nManager.isRTL;

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [dob, setDob] = useState(
    safeText((profile as any)?.[COL_DATE] ?? (profile as any)?.[COL_DATE_FALLBACK])
  );
  const [phone, setPhone] = useState(safeText((profile as any)?.phone));
  const [country, setCountry] = useState(safeText((profile as any)?.country));
  const [city, setCity] = useState(safeText((profile as any)?.city));
  const [gender, setGender] = useState(safeText((profile as any)?.gender));
  const [email] = useState(user?.email || safeText((profile as any)?.email));

  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url ?? null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const shimmerAnim = useRef(new Animated.Value(0.35)).current;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshProfile?.();
    }, [refreshProfile])
  );

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setDob(safeText((profile as any)?.[COL_DATE] ?? (profile as any)?.[COL_DATE_FALLBACK]));
    setPhone(safeText((profile as any)?.phone));
    setCountry(safeText((profile as any)?.country));
    setCity(safeText((profile as any)?.city));
    setGender(safeText((profile as any)?.gender));
    setAvatarUrl((profile as any)?.avatar_url ?? null);
  }, [
    profile?.full_name,
    (profile as any)?.[COL_DATE],
    (profile as any)?.[COL_DATE_FALLBACK],
    (profile as any)?.phone,
    (profile as any)?.country,
    (profile as any)?.city,
    (profile as any)?.gender,
    (profile as any)?.avatar_url,
  ]);

  useEffect(() => {
    if (!avatarLoaded || savingAvatar) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 0.85,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.35,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();

      return () => {
        loop.stop();
      };
    } else {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0);
    }
  }, [avatarLoaded, savingAvatar, shimmerAnim]);

  const AVATAR_VERSION_KEY = user?.id ? `avatar_version_${user.id}` : 'avatar_version_guest';
  const [avatarVersion, setAvatarVersion] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!user?.id) return;
        const v = await AsyncStorage.getItem(AVATAR_VERSION_KEY);
        if (mounted && v) setAvatarVersion(v);
      } catch {}
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id, AVATAR_VERSION_KEY]);

  useEffect(() => {
    const currentUrl = (profile as any)?.avatar_url ?? avatarUrl ?? null;
    if (!user?.id) return;

    if (currentUrl && lastUrlRef.current && currentUrl !== lastUrlRef.current) {
      const newV = String(Date.now());
      setAvatarVersion(newV);
      AsyncStorage.setItem(AVATAR_VERSION_KEY, newV).catch(() => {});
    }

    lastUrlRef.current = currentUrl;
  }, [user?.id, (profile as any)?.avatar_url, avatarUrl, AVATAR_VERSION_KEY]);

  const remoteAvatarPreview = useMemo(() => {
    const url = (profile as any)?.avatar_url ?? avatarUrl ?? null;
    if (!url) return null;

    const sep = url.includes('?') ? '&' : '?';
    return avatarVersion ? `${url}${sep}v=${encodeURIComponent(avatarVersion)}` : url;
  }, [(profile as any)?.avatar_url, avatarUrl, avatarVersion]);

  const avatarPreview = localAvatarUri || remoteAvatarPreview;

  useEffect(() => {
    setAvatarLoaded(false);
  }, [avatarPreview]);

  const lastSaved = useRef({
    full_name: profile?.full_name || '',
    date_of_brith: safeText((profile as any)?.[COL_DATE] ?? (profile as any)?.[COL_DATE_FALLBACK]),
    phone: safeText((profile as any)?.phone),
    country: safeText((profile as any)?.country),
    city: safeText((profile as any)?.city),
    gender: safeText((profile as any)?.gender),
  });

  useEffect(() => {
    lastSaved.current = {
      full_name: profile?.full_name || '',
      date_of_brith: safeText((profile as any)?.[COL_DATE] ?? (profile as any)?.[COL_DATE_FALLBACK]),
      phone: safeText((profile as any)?.phone),
      country: safeText((profile as any)?.country),
      city: safeText((profile as any)?.city),
      gender: safeText((profile as any)?.gender),
    };
  }, [
    profile?.full_name,
    (profile as any)?.[COL_DATE],
    (profile as any)?.[COL_DATE_FALLBACK],
    (profile as any)?.phone,
    (profile as any)?.country,
    (profile as any)?.city,
    (profile as any)?.gender,
  ]);

  useEffect(() => {
    if (!user?.id) return;

    const current = {
      full_name: fullName.trim(),
      date_of_brith: dob.trim(),
      phone: phone.trim(),
      country: country.trim(),
      city: city.trim(),
      gender: gender.trim(),
    };

    const prev = {
      full_name: (lastSaved.current.full_name || '').trim(),
      date_of_brith: (lastSaved.current.date_of_brith || '').trim(),
      phone: (lastSaved.current.phone || '').trim(),
      country: (lastSaved.current.country || '').trim(),
      city: (lastSaved.current.city || '').trim(),
      gender: (lastSaved.current.gender || '').trim(),
    };

    if (
      current.full_name === prev.full_name &&
      current.date_of_brith === prev.date_of_brith &&
      current.phone === prev.phone &&
      current.country === prev.country &&
      current.city === prev.city &&
      current.gender === prev.gender
    ) {
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        const payload: any = {
          full_name: current.full_name,
          [COL_DATE]: current.date_of_brith,
          phone: current.phone,
          country: current.country,
          city: current.city,
          gender: current.gender,
        };

        const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
        if (error) throw error;

        lastSaved.current = { ...current };
        await refreshProfile?.();
      } catch (e) {
        console.error('Auto save profile error:', e);
      }
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [fullName, dob, phone, country, city, gender, user?.id, refreshProfile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(tSafe('profile.notAuthenticated', 'Not authenticated'));

      const payload: any = {
        full_name: fullName.trim(),
        [COL_DATE]: dob.trim(),
        phone: phone.trim(),
        country: country.trim(),
        city: city.trim(),
        gender: gender.trim(),
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
        city: city.trim(),
        gender: gender.trim(),
      };

      await refreshProfile?.();
      Alert.alert(
        tSafe('success', 'Success'),
        tSafe('profile.profileUpdated', 'Profile updated successfully')
      );
    },
    onError: (error: any) => {
      Alert.alert(
        tSafe('error', 'Error'),
        error?.message || tSafe('profile.updateFailed', 'Failed to update profile')
      );
    },
  });

  const uploadAvatarToSupabase = async (uri: string) => {
    if (!user?.id) {
      Alert.alert(
        tSafe('error', 'Error'),
        tSafe('profile.notAuthenticated', 'Not authenticated')
      );
      return;
    }

    const previousRemoteAvatar = avatarUrl;

    try {
      setSavingAvatar(true);
      setAvatarLoaded(false);
      setLocalAvatarUri(uri);

      const response = await fetch(uri);
      const blob = await response.blob();
      const mime = blob.type || 'image/jpeg';
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, {
        upsert: true,
        contentType: mime,
        cacheControl: '0',
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error(tSafe('profile.avatarUrlFailed', 'Failed to get avatar URL'));

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (dbError) throw dbError;

      const newV = String(Date.now());
      setAvatarVersion(newV);
      await AsyncStorage.setItem(AVATAR_VERSION_KEY, newV);

      setAvatarUrl(publicUrl);
      setLocalAvatarUri(null);

      await refreshProfile?.();

      Alert.alert(
        tSafe('success', 'Success'),
        tSafe('profile.photoUpdated', 'Profile photo updated successfully')
      );
    } catch (e: any) {
      console.error('Avatar upload error:', e);
      setLocalAvatarUri(null);
      setAvatarUrl(previousRemoteAvatar ?? null);
      Alert.alert(
        tSafe('error', 'Error'),
        e?.message || tSafe('profile.uploadFailed', 'Photo upload failed')
      );
    } finally {
      setSavingAvatar(false);
    }
  };

  const launchAfterModalClose = (fn: () => Promise<void>) => {
    setPickerOpen(false);
    setTimeout(() => {
      fn().catch((e) => {
        console.error('Picker/Camera error:', e);
        Alert.alert(
          tSafe('error', 'Error'),
          e?.message || tSafe('somethingWentWrong', 'Something went wrong')
        );
      });
    }, 320);
  };

  const pickFromGallery = async () => {
    launchAfterModalClose(async () => {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            tSafe('error', 'Error'),
            tSafe('profile.photoPermissionRequired', 'Permission to access photos is required')
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      await uploadAvatarToSupabase(uri);
    });
  };

  const takeNewPhoto = async () => {
    launchAfterModalClose(async () => {
      if (Platform.OS === 'web') {
        try {
          const webCameraResult = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          });

          if (webCameraResult.canceled) return;
          const uri = webCameraResult.assets?.[0]?.uri;
          if (!uri) return;

          await uploadAvatarToSupabase(uri);
          return;
        } catch {
          const fallbackResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
            selectionLimit: 1,
          });

          if (fallbackResult.canceled) return;
          const uri = fallbackResult.assets?.[0]?.uri;
          if (!uri) return;

          await uploadAvatarToSupabase(uri);
          return;
        }
      }

      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          tSafe('error', 'Error'),
          tSafe('profile.cameraPermissionRequired', 'Permission to use camera is required')
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      await uploadAvatarToSupabase(uri);
    });
  };

  const statusKey = String((profile as any)?.kyc_status || '').toLowerCase();
  const statusText =
    statusKey === 'approved'
      ? tSafe('profile.statusApproved', 'Approved')
      : statusKey === 'pending'
      ? tSafe('profile.statusPending', 'Pending')
      : statusKey === 'rejected'
      ? tSafe('profile.statusRejected', 'Rejected')
      : tSafe('profile.statusNotStarted', 'Not started');

  const statusStyles =
    statusKey === 'approved'
      ? {
          box: styles.statusBoxSuccess,
          dot: styles.statusDotSuccess,
          text: styles.statusTextSuccess,
        }
      : statusKey === 'pending'
      ? {
          box: styles.statusBoxWarning,
          dot: styles.statusDotWarning,
          text: styles.statusTextWarning,
        }
      : statusKey === 'rejected'
      ? {
          box: styles.statusBoxWarning,
          dot: styles.statusDotWarning,
          text: styles.statusTextWarning,
        }
      : {
          box: styles.statusBoxDefault,
          dot: styles.statusDotDefault,
          text: styles.statusTextDefault,
        };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.85}>
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color={COLORS.blueDark}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{tSafe('profile.title', 'Profile')}</Text>

        <View style={{ width: 40 }} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.avatarWrap}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.avatarBtn}
                onPress={() => setPickerOpen(true)}
                disabled={savingAvatar}
              >
                {avatarPreview ? (
                  <>
                    {(!avatarLoaded || savingAvatar) && (
                      <Animated.View
                        style={[
                          styles.avatarLoadingLayer,
                          { opacity: shimmerAnim },
                        ]}
                      >
                        <View style={styles.skeletonCircle} />
                        <ActivityIndicator
                          size="small"
                          color={COLORS.blue}
                          style={{ position: 'absolute' }}
                        />
                      </Animated.View>
                    )}

                    <Image
                      source={{ uri: avatarPreview }}
                      style={styles.avatarImg}
                      contentFit="cover"
                      transition={120}
                      cachePolicy="memory-disk"
                      onLoadStart={() => setAvatarLoaded(false)}
                      onLoad={() => setAvatarLoaded(true)}
                      onError={() => setAvatarLoaded(true)}
                    />
                  </>
                ) : (
                  <Animated.View
                    style={[
                      styles.avatarFallback,
                      { opacity: !avatarLoaded || savingAvatar ? shimmerAnim : 1 },
                    ]}
                  >
                    <Ionicons name="person" size={34} color={COLORS.blue} />
                  </Animated.View>
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
                {tSafe('profile.tapToChangePhoto', 'Tap to change photo')}
              </Text>
            </View>

            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {tSafe('profile.fullName', 'Full Name')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={tSafe('profile.fullNamePlaceholder', 'Enter full name')}
              placeholderTextColor={COLORS.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {tSafe('profile.dateOfBirth', 'Date of Birth')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={tSafe('profile.dateOfBirthPlaceholder', 'YYYY-MM-DD')}
              placeholderTextColor={COLORS.textMuted}
              value={dob}
              onChangeText={setDob}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {tSafe('profile.phoneNumber', 'Phone Number')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={tSafe('profile.phoneNumberPlaceholder', 'Enter phone number')}
              placeholderTextColor={COLORS.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {tSafe('profile.email', 'Email')}
            </Text>
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, isRTL && styles.textRTL]}>
                {user?.email || email}
              </Text>
            </View>

            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {tSafe('profile.country', 'Country')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={tSafe('profile.countryPlaceholder', 'Enter country')}
              placeholderTextColor={COLORS.textMuted}
              value={country}
              onChangeText={setCountry}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {tSafe('profile.city', 'City')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={tSafe('profile.cityPlaceholder', 'Enter city')}
              placeholderTextColor={COLORS.textMuted}
              value={city}
              onChangeText={setCity}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {tSafe('profile.gender', 'Gender')}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={tSafe('profile.genderPlaceholder', 'Enter gender')}
              placeholderTextColor={COLORS.textMuted}
              value={gender}
              onChangeText={setGender}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {tSafe('profile.accountStatus', 'Account Status')}
            </Text>
            <View style={[styles.statusBox, statusStyles.box]}>
              <View style={[styles.statusDot, statusStyles.dot]} />
              <Text style={[styles.statusText, statusStyles.text, isRTL && styles.textRTL]}>
                {statusText}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButtonWrap,
                (updateMutation.isPending || savingAvatar) && styles.buttonDisabled,
              ]}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || savingAvatar}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={['#79B7FF', '#4C92F7', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {tSafe('profile.save', 'Save')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            {tSafe('profile.changePhoto', 'Change photo')}
          </Text>

          <TouchableOpacity style={styles.sheetButton} activeOpacity={0.9} onPress={pickFromGallery}>
            <Ionicons name="images" size={18} color={COLORS.blueDark} />
            <Text style={styles.sheetButtonText}>
              {tSafe('profile.selectExistingPhoto', 'Select existing photo')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetButton} activeOpacity={0.9} onPress={takeNewPhoto}>
            <Ionicons name="camera" size={18} color={COLORS.blueDark} />
            <Text style={styles.sheetButtonText}>
              {tSafe('profile.takeNewPhoto', 'Take new photo')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.9} onPress={() => setPickerOpen(false)}>
            <Text style={styles.cancelText}>
              {tSafe('cancel', 'Cancel')}
            </Text>
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
    backgroundColor: COLORS.bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },

  content: { flex: 1, backgroundColor: COLORS.bg },
  contentContainer: { paddingBottom: 10 },

  card: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(220,235,255,0.32)',
    right: -40,
    top: -30,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(234,242,255,0.7)',
    left: -50,
    top: 60,
  },

  avatarWrap: { alignItems: 'center', marginBottom: 18 },
  avatarBtn: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: '#CFE1FF',
    backgroundColor: COLORS.blueSoft,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...SHADOWS.soft,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLoadingLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    backgroundColor: COLORS.blueSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 53,
    backgroundColor: '#DCEBFF',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.blueSoft,
  },
  avatarPencil: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  label: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
    color: COLORS.text,
  },
  textRTL: {
    textAlign: 'right',
  },

  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 14,
    height: 54,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  inputRTL: {
    writingDirection: 'rtl',
  },

  infoBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 14,
    height: 54,
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  statusBox: {
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  statusBoxDefault: {
    borderColor: '#CFE1FF',
    backgroundColor: COLORS.blueSoft,
  },
  statusBoxSuccess: {
    borderColor: '#BBF7D0',
    backgroundColor: COLORS.successSoft,
  },
  statusBoxWarning: {
    borderColor: '#FDE68A',
    backgroundColor: COLORS.warningSoft,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotDefault: {
    backgroundColor: COLORS.blue,
  },
  statusDotSuccess: {
    backgroundColor: COLORS.success,
  },
  statusDotWarning: {
    backgroundColor: COLORS.warning,
  },

  statusText: {
    fontSize: 15,
    fontWeight: '900',
  },
  statusTextDefault: {
    color: COLORS.text,
  },
  statusTextSuccess: {
    color: COLORS.success,
  },
  statusTextWarning: {
    color: '#8A6A18',
  },

  primaryButtonWrap: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  modalSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    ...SHADOWS.card,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  sheetButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginTop: 10,
    ...SHADOWS.soft,
  },
  sheetButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },
  cancelBtn: {
    height: 52,
    borderRadius: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7FF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.blueDark,
  },
});
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';

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
  blue2: '#3B82F6',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  danger: '#EF4444',
  dangerSoft: '#FFF1F4',

  white: '#FFFFFF',
  shadow: '#7DA8E6',
};

const SHADOWS = {
  card: {
    shadowColor: UI.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: UI.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

export default function SecurityScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signOut } = useAuth();

  const handleDeleteAccount = async () => {
    Alert.alert(i18n.t('deleteAccountWarning'), i18n.t('deleteAccountConfirm'), [
      { text: i18n.t('cancel'), style: 'cancel' },
      {
        text: i18n.t('deleteAccountButton'),
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);

            const {
              data: { session },
            } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
              Alert.alert(i18n.t('error'), 'Not authenticated');
              return;
            }

            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (!res.ok) {
              const errorText = await res.text();
              console.error('Delete account error:', errorText);
              Alert.alert(i18n.t('error'), i18n.t('accountDeleteError'));
              return;
            }

            Alert.alert(i18n.t('success'), i18n.t('accountDeleted'), [
              {
                text: 'OK',
                onPress: async () => {
                  await signOut();
                },
              },
            ]);
          } catch (error: any) {
            console.error('Error deleting account:', error);
            Alert.alert(i18n.t('error'), error.message || i18n.t('accountDeleteError'));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleResetPassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('enterCurrentPassword'));
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('enterNewPassword'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(i18n.t('error'), i18n.t('passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(i18n.t('error'), i18n.t('passwordsDoNotMatch'));
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        Alert.alert(i18n.t('error'), i18n.t('userNotFound'));
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert(i18n.t('error'), i18n.t('currentPasswordIncorrect'));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert(i18n.t('success'), i18n.t('passwordResetSuccess'), [
        {
          text: 'OK',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert(i18n.t('error'), error.message || i18n.t('passwordChangeError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.9}>
          <Ionicons name="arrow-back" size={22} color={UI.blueDark} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('security')}</Text>

        <View style={styles.headerGhost} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topCard}>
          <View style={styles.topGlowOne} />
          <View style={styles.topGlowTwo} />

          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={30} color={UI.blue} />
          </View>

          <Text style={styles.mainTitle}>{i18n.t('resetPassword')}</Text>
          <Text style={styles.subTitle}>{i18n.t('resetPasswordDesc2')}</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('currentPassword')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('enterCurrentPassword')}
                placeholderTextColor={UI.text3}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword((v) => !v)}
                activeOpacity={0.8}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={UI.text2}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('newPassword')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('enterNewPassword')}
                placeholderTextColor={UI.text3}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword((v) => !v)}
                activeOpacity={0.8}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={UI.text2}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('confirmNewPassword')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('confirmNewPassword')}
                placeholderTextColor={UI.text3}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((v) => !v)}
                activeOpacity={0.8}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={UI.text2}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.92}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {i18n.t('resetPassword')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerIconWrap}>
              <Ionicons name="warning" size={20} color={UI.danger} />
            </View>
            <Text style={styles.dangerTitle}>{i18n.t('dangerZone')}</Text>
          </View>

          <Text style={styles.dangerDesc}>{i18n.t('deleteAccountDesc')}</Text>

          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.buttonDisabled]}
            onPress={handleDeleteAccount}
            disabled={loading}
            activeOpacity={0.92}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>
                  {i18n.t('deleteAccount')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    backgroundColor: UI.page,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerGhost: {
    width: 42,
    height: 42,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },

  content: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  contentContainer: {
    paddingBottom: 10,
  },

  topCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  topGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59,130,246,0.10)',
    left: -45,
    bottom: -90,
  },
  topGlowTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(37,99,235,0.08)',
    right: -25,
    top: -30,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
    color: UI.text,
  },
  subTitle: {
    marginTop: 8,
    textAlign: 'center',
    color: UI.text2,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  formCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
  },

  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    color: UI.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
    paddingHorizontal: 14,
    height: 54,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: UI.text,
    fontWeight: '700',
  },
  eyeBtn: {
    padding: 6,
    borderRadius: 10,
  },

  primaryButton: {
    marginTop: 8,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.blue,
    ...SHADOWS.card,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  dangerZone: {
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 40,
    padding: 18,
    borderRadius: 22,
    backgroundColor: UI.card,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    ...SHADOWS.soft,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.danger,
  },
  dangerDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    color: UI.text2,
    fontWeight: '700',
  },

  deleteButton: {
    backgroundColor: UI.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  buttonDisabled: {
    opacity: 0.7,
  },
});
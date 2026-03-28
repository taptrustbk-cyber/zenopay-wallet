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

function tSafe(key: string, fallback: string) {
  try {
    const value = i18n.t(key as any);
    if (!value) return fallback;

    const text = String(value);
    const lower = text.toLowerCase();

    if (
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
    Alert.alert(
      tSafe('securityPage.deleteAccountWarning', 'Delete Account Warning'),
      tSafe(
        'securityPage.deleteAccountConfirm',
        'Are you sure you want to delete your account? This action cannot be undone.'
      ),
      [
        {
          text: tSafe('cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: tSafe('securityPage.deleteAccountButton', 'Delete Account'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const {
                data: { session },
              } = await supabase.auth.getSession();
              const token = session?.access_token;

              if (!token) {
                Alert.alert(
                  tSafe('error', 'Error'),
                  tSafe('securityPage.notAuthenticated', 'Not authenticated')
                );
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
                Alert.alert(
                  tSafe('error', 'Error'),
                  tSafe('securityPage.accountDeleteError', 'Failed to delete account')
                );
                return;
              }

              Alert.alert(
                tSafe('success', 'Success'),
                tSafe('securityPage.accountDeleted', 'Your account has been deleted'),
                [
                  {
                    text: tSafe('ok', 'OK'),
                    onPress: async () => {
                      await signOut();
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error deleting account:', error);
              Alert.alert(
                tSafe('error', 'Error'),
                error?.message || tSafe('securityPage.accountDeleteError', 'Failed to delete account')
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert(
        tSafe('error', 'Error'),
        tSafe('securityPage.enterCurrentPassword', 'Enter current password')
      );
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert(
        tSafe('error', 'Error'),
        tSafe('securityPage.enterNewPassword', 'Enter new password')
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        tSafe('error', 'Error'),
        tSafe('securityPage.passwordTooShort', 'Password must be at least 6 characters')
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        tSafe('error', 'Error'),
        tSafe('securityPage.passwordsDoNotMatch', 'Passwords do not match')
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        Alert.alert(
          tSafe('error', 'Error'),
          tSafe('securityPage.userNotFound', 'User not found')
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert(
          tSafe('error', 'Error'),
          tSafe('securityPage.currentPasswordIncorrect', 'Current password is incorrect')
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert(
        tSafe('success', 'Success'),
        tSafe('securityPage.passwordResetSuccess', 'Password changed successfully'),
        [
          {
            text: tSafe('ok', 'OK'),
            onPress: () => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert(
        tSafe('error', 'Error'),
        error?.message || tSafe('securityPage.passwordChangeError', 'Failed to change password')
      );
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

        <Text style={styles.headerTitle}>{tSafe('security', 'Security')}</Text>

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

          <Text style={styles.mainTitle}>{tSafe('securityPage.resetPassword', 'Reset Password')}</Text>
          <Text style={styles.subTitle}>
            {tSafe(
              'securityPage.resetPasswordDesc2',
              'Update your password to keep your account secure.'
            )}
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tSafe('securityPage.currentPassword', 'Current Password')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={tSafe('securityPage.enterCurrentPassword', 'Enter current password')}
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
            <Text style={styles.label}>{tSafe('securityPage.newPassword', 'New Password')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={tSafe('securityPage.enterNewPassword', 'Enter new password')}
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
            <Text style={styles.label}>{tSafe('securityPage.confirmNewPassword', 'Confirm New Password')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={tSafe('securityPage.confirmNewPassword', 'Confirm New Password')}
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
                {tSafe('securityPage.resetPassword', 'Reset Password')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerIconWrap}>
              <Ionicons name="warning" size={20} color={UI.danger} />
            </View>
            <Text style={styles.dangerTitle}>{tSafe('securityPage.dangerZone', 'Danger Zone')}</Text>
          </View>

          <Text style={styles.dangerDesc}>
            {tSafe(
              'securityPage.deleteAccountDesc',
              'Deleting your account is permanent and cannot be undone.'
            )}
          </Text>

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
                  {tSafe('securityPage.deleteAccount', 'Delete Account')}
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
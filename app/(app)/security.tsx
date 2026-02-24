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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';

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
      {/* Header (same like terms-conditions) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#111111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('security')}</Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Top card (same like terms-conditions) */}
        <View style={styles.topCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={30} color="#16a34a" />
          </View>

          <Text style={styles.mainTitle}>{i18n.t('resetPassword')}</Text>
          <Text style={styles.subTitle}>{i18n.t('resetPasswordDesc2')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('currentPassword')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('enterCurrentPassword')}
                placeholderTextColor="#6B7280"
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
                <Ionicons name={showCurrentPassword ? 'eye-off' : 'eye'} size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('newPassword')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('enterNewPassword')}
                placeholderTextColor="#6B7280"
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
                <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('confirmNewPassword')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('confirmNewPassword')}
                placeholderTextColor="#6B7280"
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
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Green button (same like terms-conditions) */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? i18n.t('loading') : i18n.t('resetPassword')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Danger zone (keep red button) */}
        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <Ionicons name="warning" size={22} color="#EF4444" />
            <Text style={styles.dangerTitle}>{i18n.t('dangerZone')}</Text>
          </View>

          <Text style={styles.dangerDesc}>{i18n.t('deleteAccountDesc')}</Text>

          <TouchableOpacity
            style={[styles.deleteButton, loading && { opacity: 0.7 }]}
            onPress={handleDeleteAccount}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>
              {loading ? i18n.t('deletingAccount') : i18n.t('deleteAccount')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same base like terms-conditions
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    textAlign: 'center',
    lineHeight: 30,
    color: '#111111',
  },
  subTitle: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },

  form: {
    paddingHorizontal: 20,
    marginTop: 18,
  },

  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '800' as const,
    marginBottom: 8,
    color: '#111111',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111111',
    fontWeight: '600' as const,
  },
  eyeBtn: {
    padding: 6,
    borderRadius: 10,
  },

  // Green button
  primaryButton: {
    marginTop: 8,
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

  // Danger zone keeps red button
  dangerZone: {
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 40,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    marginLeft: 8,
    color: '#EF4444',
  },
  dangerDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    color: '#6B7280',
    fontWeight: '600' as const,
  },

  deleteButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800' as const,
  },
});

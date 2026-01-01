import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function SecurityScreen() {
  const router = useRouter();
  const { theme, themeMode } = useTheme();
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
      i18n.t('deleteAccountWarning'),
      i18n.t('deleteAccountConfirm'),
      [
        {
          text: i18n.t('cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('deleteAccountButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token;

              if (!token) {
                Alert.alert(i18n.t('error'), 'Not authenticated');
                return;
              }

              const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
              const res = await fetch(
                `${supabaseUrl}/functions/v1/delete-account`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

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
      ]
    );
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

      const { data: { user } } = await supabase.auth.getUser();
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
          }
        }
      ]);
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert(i18n.t('error'), error.message || i18n.t('passwordChangeError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{i18n.t('security')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: themeMode === 'dark' ? '#1E3A8A' : '#DBEAFE' }]}>
            <Ionicons name="lock-closed" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{i18n.t('resetPassword')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {i18n.t('resetPasswordDesc2')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('currentPassword')}</Text>
            <View style={[styles.passwordContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.colors.text }]}
                placeholder={i18n.t('enterCurrentPassword')}
                placeholderTextColor={theme.colors.textSecondary}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons 
                  name={showCurrentPassword ? 'eye-off' : 'eye'} 
                  size={22} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('newPassword')}</Text>
            <View style={[styles.passwordContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.colors.text }]}
                placeholder={i18n.t('enterNewPassword')}
                placeholderTextColor={theme.colors.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons 
                  name={showNewPassword ? 'eye-off' : 'eye'} 
                  size={22} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('confirmNewPassword')}</Text>
            <View style={[styles.passwordContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.colors.text }]}
                placeholder={i18n.t('confirmNewPassword')}
                placeholderTextColor={theme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off' : 'eye'} 
                  size={22} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? i18n.t('loading') : i18n.t('resetPassword')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.dangerZone, { backgroundColor: theme.colors.card, borderColor: '#EF4444' }]}>
          <View style={styles.dangerHeader}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={[styles.dangerTitle, { color: '#EF4444' }]}>{i18n.t('dangerZone')}</Text>
          </View>
          
          <Text style={[styles.dangerDesc, { color: theme.colors.textSecondary }]}>
            {i18n.t('deleteAccountDesc')}
          </Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>
              {loading ? i18n.t('deletingAccount') : i18n.t('deleteAccount')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  button: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  dangerZone: {
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 40,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginLeft: 8,
  },
  dangerDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

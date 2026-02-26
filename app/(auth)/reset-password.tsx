import { useRouter, Stack } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

// ✅ Remove default header (if any) to avoid double header
export const options = {
  headerShown: false,
};

// 🎨 Light theme: white background, green buttons, black text
const COLORS = {
  bg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F3FBF6',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  white: '#FFFFFF',
};

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isReady, setIsReady] = useState(false);

  const failAndGoBack = useCallback(() => {
    Alert.alert(
      'Error',
      'Invalid or expired reset link. Please request a new password reset.',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/forgot-password' as any) }]
    );
  }, [router]);

  // ✅ Handle redirect URL from email (code / tokens)
  const handleIncomingUrl = useCallback(
    async (url: string) => {
      try {
        // 1) PKCE code flow: ?code=xxxxx
        const parsed = Linking.parse(url);
        const code = (parsed?.queryParams?.code as string | undefined) ?? undefined;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setIsReady(true);
          return;
        }

        // 2) Hash token flow: #access_token=...&refresh_token=...
        // Linking.parse doesn't always parse hash, so do manual parse too
        const hash = url.includes('#') ? url.split('#')[1] : '';
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            setIsReady(true);
            return;
          }
        }

        // If no usable token/code:
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsReady(true);
          return;
        }

        failAndGoBack();
      } catch (e: any) {
        console.log('Reset URL error:', e?.message);
        failAndGoBack();
      }
    },
    [failAndGoBack]
  );

  useEffect(() => {
    let sub: any;

    const init = async () => {
      // ✅ 1) if app opened by email link -> get initial URL
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleIncomingUrl(initialUrl);
      } else {
        // ✅ 2) If user already has session (rare but possible)
        const { data } = await supabase.auth.getSession();
        if (data.session) setIsReady(true);
        else failAndGoBack();
      }

      // ✅ 3) Listen for incoming links while app is open
      sub = Linking.addEventListener('url', ({ url }) => {
        handleIncomingUrl(url);
      });
    };

    init();

    return () => {
      if (sub?.remove) sub.remove();
    };
  }, [handleIncomingUrl, failAndGoBack]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || !confirmPassword) throw new Error('Please fill in all fields');
      if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: async () => {
      await supabase.auth.signOut();
      Alert.alert(
        'Success',
        'Your password has been updated successfully! Please log in with your new password.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login' as any) }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={styles.loadingText}>Verifying reset link...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color={COLORS.green} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Reset Password</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.description}>Enter your new password below</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor={COLORS.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.resetButton, { opacity: resetMutation.isPending ? 0.7 : 1 }]}
              onPress={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              activeOpacity={0.9}
            >
              {resetMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.resetButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backToLoginButton} onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600' as const,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 30,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  backIconBtn: {
    padding: 6,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: COLORS.text,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: COLORS.text,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    fontWeight: '600' as const,
    marginBottom: 18,
  },

  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  resetButton: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900' as const,
  },

  backToLoginButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  backToLoginText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800' as const,
    textDecorationLine: 'underline' as const,
  },
});

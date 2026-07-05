import { useRouter, Stack } from 'expo-router';
import { useState } from 'react';
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
import i18n from '@/lib/i18n';
import * as Linking from 'expo-linking';

// ✅ remove default header
export const options = {
  headerShown: false,
};

// 🎨 white + green + black (same style you want)
const COLORS = {
  bg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F3FBF6',
  green: '#16A34A',
  white: '#FFFFFF',
};

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signupMutation = useMutation({
    mutationFn: async () => {
      if (!email || !password) {
        throw new Error(i18n.t('enterEmail'));
      }

      const redirectUrl = Linking.createURL('/(auth)/login');
      console.log('Signup redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          kyc_status: 'not_started',
        });

        await supabase.from('wallets').insert({
          user_id: data.user.id,
          balance: 0,
          currency: 'USD',
        });
      }

      return data;
    },
    onSuccess: () => {
      Alert.alert(i18n.t('success'), i18n.t('checkEmail'));
      router.replace('/(auth)/login' as any);
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error.message);
    },
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* ✅ White header + back icon */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color={COLORS.green} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>SwedBank</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.card}>
            <Text style={styles.welcomeText}>{i18n.t('signup')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t('email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('email')}
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t('password')}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('password')}
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.signupButton, { opacity: signupMutation.isPending ? 0.7 : 1 }]}
              onPress={() => signupMutation.mutate()}
              disabled={signupMutation.isPending}
              activeOpacity={0.9}
            >
              {signupMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signupButtonText}>{i18n.t('signup')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={styles.loginText}>{i18n.t('login')}</Text>
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
    fontWeight: '900' as const,
    color: COLORS.text,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  welcomeText: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center' as const,
  },

  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '800' as const,
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

  signupButton: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900' as const,
  },

  loginButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  loginText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800' as const,
    textDecorationLine: 'underline' as const,
  },
});

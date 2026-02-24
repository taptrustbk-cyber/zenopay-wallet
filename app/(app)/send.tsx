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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext'; // keep (not breaking)
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

const UI = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#47B08A',
  greenSoft: '#EAF7F1',
};

export default function SendMoneyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { theme } = useTheme(); // keep theme (not used for colors now)
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not found');

      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw new Error(error.message || 'Failed to fetch wallet');
      return (data as Wallet) || null;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!recipientEmail.trim()) throw new Error(i18n.t('enterEmail'));
      if (!amount.trim()) throw new Error(i18n.t('enterAmount'));

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error(i18n.t('invalidAmount'));

      if (!walletQuery.data) throw new Error('Wallet not found');

      if (amountNum > walletQuery.data.balance) {
        throw new Error(
          `${i18n.t('insufficientBalance')}\n${walletQuery.data.balance.toFixed(2)} ${walletQuery.data.currency}`
        );
      }

      if (!user?.email) throw new Error('User email not found');

      const cleanEmail = recipientEmail.trim().toLowerCase();
      if (cleanEmail === user.email.toLowerCase()) throw new Error('You cannot send money to yourself');

      const { error } = await supabase.rpc('send_money', {
        to_email: cleanEmail,
        send_amount: amountNum,
      });

      if (error) throw new Error(error.message || 'Failed to send money');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      Alert.alert(i18n.t('success'), i18n.t('transactionSuccess'));
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error?.message || 'Failed to send money');
    },
  });

  const balanceText = walletQuery.data?.balance?.toFixed(2) || '0.00';
  const currencyText = walletQuery.data?.currency || 'USD';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      {/* ✅ Hide the default expo-router header (dark blue bar) */}
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ Your clean header only (no double header now) */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color={UI.text} />
              <Text style={styles.headerBack}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{i18n.t('sendMoney')}</Text>

            <View style={{ width: 70 }} />
          </View>

          {/* Balance green card like dashboard */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTopRow}>
              <Text style={styles.balanceTitle}>{i18n.t('accountBalance')}</Text>

              <View style={styles.currencyChip}>
                <Ionicons name="logo-usd" size={16} color="#fff" />
                <Text style={styles.currencyChipText}>{currencyText}</Text>
              </View>
            </View>

            {walletQuery.isLoading ? (
              <View style={{ paddingTop: 14 }}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : walletQuery.isError ? (
              <View style={styles.balanceErrorRow}>
                <Ionicons name="alert-circle" size={22} color="#fff" />
                <Text style={styles.balanceErrorText}>{i18n.t('failedToLoadBalance')}</Text>
              </View>
            ) : (
              <View style={styles.balanceValueRow}>
                <Text style={styles.balanceValue}>${balanceText}</Text>
              </View>
            )}
          </View>

          {/* Form white card */}
          <View style={styles.formCard}>
            <Text style={styles.label}>{i18n.t('recipientEmail')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('recipientEmail')}
              placeholderTextColor={UI.text2}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>{i18n.t('amount')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('amount')}
              placeholderTextColor={UI.text2}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (sendMutation.isPending || walletQuery.isLoading) && { opacity: 0.7 },
              ]}
              onPress={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || walletQuery.isLoading}
              activeOpacity={0.9}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.sendButtonText}>{i18n.t('send')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },

  // ✅ moved up (no extra paddingTop now)
  scrollContent: {
    padding: 16,
    paddingTop: 6,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 90,
  },
  headerBack: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.text,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },

  // Green balance card like dashboard
  balanceCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: UI.green,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '900',
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  currencyChipText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  balanceValueRow: { marginTop: 14 },
  balanceValue: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
  },
  balanceErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  balanceErrorText: { color: '#fff', fontWeight: '800' },

  // White form card
  formCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: UI.card,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: UI.text,
    marginBottom: 14,
  },

  // Green button like dashboard
  sendButton: {
    backgroundColor: UI.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});

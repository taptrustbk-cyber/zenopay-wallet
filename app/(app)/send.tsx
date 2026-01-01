import { useRouter } from 'expo-router';
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
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

export default function SendMoneyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      
      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .maybeSingle();
      
      if (error) {
        throw new Error('Failed to fetch wallet');
      }
      
      if (!data) {
        return null;
      }
      
      return data as Wallet;
    },
    enabled: !!user?.id,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!recipientEmail || !amount) {
        throw new Error(i18n.t('enterEmail'));
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error(i18n.t('invalidAmount'));
      }

      if (!walletQuery.data) {
        throw new Error('Wallet not found');
      }

      if (amountNum > walletQuery.data.balance) {
        throw new Error(`Insufficient balance. You have ${walletQuery.data.balance.toFixed(2)} but trying to send ${amountNum.toFixed(2)}`);
      }

      if (!user?.email) {
        throw new Error('User email not found');
      }

      if (recipientEmail.toLowerCase() === user.email.toLowerCase()) {
        throw new Error('You cannot send money to yourself');
      }

      const cleanEmail = recipientEmail.trim().toLowerCase();

      const { error } = await supabase.rpc('send_money', {
        to_email: cleanEmail,
        send_amount: amountNum,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send money');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      Alert.alert(i18n.t('success'), i18n.t('transactionSuccess'));
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error.message || 'Failed to send money');
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.balanceCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>{i18n.t('balance')}</Text>
            <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
              ${walletQuery.data?.balance?.toFixed(2) || '0.00'}
            </Text>
          </View>

          <View style={[styles.formContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('recipientEmail')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.cardSecondary, color: theme.colors.text }]}
              placeholder={i18n.t('recipientEmail')}
              placeholderTextColor={theme.colors.textSecondary}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('amount')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.cardSecondary, color: theme.colors.text }]}
              placeholder={i18n.t('amount')}
              placeholderTextColor={theme.colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.sendButtonText}>{i18n.t('send')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold' as const,
  },
  formContainer: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
});

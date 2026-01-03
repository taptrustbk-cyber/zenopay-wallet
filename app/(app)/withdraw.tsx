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
  Modal,
  RefreshControl,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

export default function WithdrawScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC');
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const cryptoOptions = [
    { value: 'BTC', label: 'Bitcoin (BTC)' },
    { value: 'DOGE', label: 'Dogecoin (DOGE)' },
    { value: 'XRP', label: 'Ripple (XRP)' },
    { value: 'USDT_TRC20', label: 'USDT (TRC20)' },
  ];

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
        return { user_id: user.id, balance: 0, currency: 'USD', is_locked: false } as Wallet;
      }
      
      return data as Wallet;
    },
    enabled: !!user?.id,
  });

  const withdrawHistoryQuery = useQuery({
    queryKey: ['withdraw_orders', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      
      const { data, error } = await supabase
        .from('withdraw_orders')
        .select('id, amount, crypto, destination, status, reject_reason, created_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error('Failed to fetch withdrawal history');
      }
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCrypto || !amount || !walletAddress) {
        throw new Error('Please fill all fields');
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error(i18n.t('invalidAmount'));
      }

      if (!walletQuery.data) {
        throw new Error('Wallet not found');
      }

      if (walletQuery.data.is_locked) {
        throw new Error('Wallet is locked. Please contact support.');
      }

      if (amountNum > walletQuery.data.balance) {
        throw new Error(`Insufficient balance. You have ${walletQuery.data.balance.toFixed(2)} but trying to withdraw ${amountNum.toFixed(2)}`);
      }

      const { error: withdrawError } = await supabase.from('withdraw_orders').insert({
        user_id: user!.id,
        amount: amountNum,
        currency: 'USD',
        destination: walletAddress,
        crypto: selectedCrypto,
        status: 'pending',
      });

      if (withdrawError) {
        throw new Error('Failed to create withdraw request');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['withdraw_orders'] });
      Alert.alert(i18n.t('success'), i18n.t('withdrawSuccessMessage'));
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error.message || 'Failed to submit withdrawal request');
    },
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      pending: '#facc15',
      approved: '#22c55e',
      rejected: '#ef4444',
    };

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: colors[status] || '#9ca3af' },
        ]}
      >
        <Text style={styles.statusBadgeText}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={withdrawHistoryQuery.isRefetching}
              onRefresh={() => {
                withdrawHistoryQuery.refetch();
                walletQuery.refetch();
              }}
            />
          }
        >
          <View style={[styles.balanceCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>{i18n.t('balance')}</Text>
            <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
              ${walletQuery.data?.balance?.toFixed(2) || '0.00'}
            </Text>
          </View>

          <View style={[styles.formContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('selectCrypto')}</Text>
            <TouchableOpacity
              style={[styles.cryptoSelector, { backgroundColor: theme.colors.cardSecondary }]}
              onPress={() => setShowCryptoModal(true)}
            >
              <Text style={[styles.cryptoSelectorText, { color: theme.colors.text }]}>
                {cryptoOptions.find(c => c.value === selectedCrypto)?.label}
              </Text>
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('withdrawalAmount')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.cardSecondary, color: theme.colors.text }]}
              placeholder={i18n.t('amount')}
              placeholderTextColor={theme.colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('walletAddress')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.cardSecondary, color: theme.colors.text }]}
              placeholder={i18n.t('enterWalletAddress')}
              placeholderTextColor={theme.colors.textSecondary}
              value={walletAddress}
              onChangeText={setWalletAddress}
              autoCapitalize="none"
              multiline
            />

            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.withdrawButtonText}>{i18n.t('submit')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.historyContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{i18n.t('withdrawHistory')}</Text>

            {withdrawHistoryQuery.isLoading ? (
              <ActivityIndicator color={theme.colors.primary} size="large" style={styles.loader} />
            ) : withdrawHistoryQuery.error ? (
              <Text style={[styles.errorText, { color: '#ef4444' }]}>
                Error: {(withdrawHistoryQuery.error as Error).message}
              </Text>
            ) : !withdrawHistoryQuery.data || withdrawHistoryQuery.data.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {i18n.t('noWithdrawalsYet')}
              </Text>
            ) : (
              withdrawHistoryQuery.data.map((w) => (
                <View key={w.id} style={[styles.historyCard, { backgroundColor: theme.colors.cardSecondary }]}>
                  <View style={styles.historyRow}>
                    <Text style={[styles.historyLabel, { color: theme.colors.textSecondary }]}>
                      {i18n.t('amount')}
                    </Text>
                    <Text style={[styles.historyValue, { color: theme.colors.text }]}>
                      ${w.amount.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={[styles.historyLabel, { color: theme.colors.textSecondary }]}>
                      {i18n.t('network')}
                    </Text>
                    <Text style={[styles.historyValue, { color: theme.colors.text }]}>
                      {w.crypto}
                    </Text>
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={[styles.historyLabel, { color: theme.colors.textSecondary }]}>
                      {i18n.t('address')}
                    </Text>
                    <Text style={[styles.historyAddressValue, { color: theme.colors.text }]} numberOfLines={1}>
                      {w.destination}
                    </Text>
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={[styles.historyLabel, { color: theme.colors.textSecondary }]}>
                      {i18n.t('status')}
                    </Text>
                    <StatusBadge status={w.status} />
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={[styles.historyLabel, { color: theme.colors.textSecondary }]}>
                      {i18n.t('date')}
                    </Text>
                    <Text style={[styles.historyValue, { color: theme.colors.text }]}>
                      {new Date(w.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  {w.status === 'rejected' && w.reject_reason && (
                    <View style={styles.rejectReasonContainer}>
                      <Text style={styles.rejectReasonLabel}>{i18n.t('reason')}:</Text>
                      <Text style={styles.rejectReasonText}>{w.reject_reason}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          <Modal
            visible={showCryptoModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCryptoModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{i18n.t('selectCrypto')}</Text>
                {cryptoOptions.map((crypto) => (
                  <TouchableOpacity
                    key={crypto.value}
                    style={[styles.cryptoOption, { borderBottomColor: theme.colors.cardSecondary }]}
                    onPress={() => {
                      setSelectedCrypto(crypto.value);
                      setShowCryptoModal(false);
                    }}
                  >
                    <Text style={[styles.cryptoOptionText, { color: theme.colors.text }]}>
                      {crypto.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowCryptoModal(false)}
                >
                  <Text style={styles.modalCloseButtonText}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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
  withdrawButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  cryptoSelector: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cryptoSelectorText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginBottom: 16,
    textAlign: 'center',
  },
  cryptoOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cryptoOptionText: {
    fontSize: 16,
  },
  modalCloseButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  historyContainer: {
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginBottom: 16,
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  historyAddressValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold' as const,
  },
  rejectReasonContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
  },
  rejectReasonLabel: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  rejectReasonText: {
    fontSize: 13,
    color: '#ef4444',
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
});

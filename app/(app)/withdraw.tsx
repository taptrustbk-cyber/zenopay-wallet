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
  Modal,
  RefreshControl,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
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
  danger: '#EF4444',
};

export default function WithdrawScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { theme } = useTheme(); // keep

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
      if (!user?.id) throw new Error('User ID not found');

      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw new Error(error.message || 'Failed to fetch wallet');

      if (!data) {
        // fallback (won't create, just show 0)
        return { user_id: user.id, balance: 0, currency: 'USD', is_locked: false } as Wallet;
      }

      return data as Wallet;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const withdrawHistoryQuery = useQuery({
    queryKey: ['withdraw_orders', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not found');

      const { data, error } = await supabase
        .from('withdraw_orders')
        .select('id, amount, crypto, destination, status, reject_reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || 'Failed to fetch withdrawal history');

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCrypto) throw new Error(i18n.t('selectCrypto'));
      if (!amount.trim()) throw new Error(i18n.t('enterAmount'));
      if (!walletAddress.trim()) throw new Error(i18n.t('enterWalletAddress'));

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error(i18n.t('invalidAmount'));

      if (!walletQuery.data) throw new Error('Wallet not found');

      if (walletQuery.data.is_locked) {
        throw new Error(i18n.t('security') + ': ' + i18n.t('contactSupport'));
      }

      if (amountNum > walletQuery.data.balance) {
        throw new Error(
          `${i18n.t('insufficientBalance')}\n${walletQuery.data.balance.toFixed(2)} ${walletQuery.data.currency}`
        );
      }

      const { error: withdrawError } = await supabase.from('withdraw_orders').insert({
        user_id: user!.id,
        amount: amountNum,
        currency: walletQuery.data.currency || 'USD',
        destination: walletAddress.trim(),
        crypto: selectedCrypto,
        status: 'pending',
      });

      if (withdrawError) throw new Error(withdrawError.message || 'Failed to create withdraw request');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['withdraw_orders'] });
      Alert.alert(i18n.t('success'), i18n.t('withdrawSuccessMessage'));
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error?.message || 'Failed to submit withdrawal request');
    },
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      pending: '#FACC15',
      approved: '#22C55E',
      rejected: '#EF4444',
    };

    return (
      <View style={[styles.statusBadge, { backgroundColor: colors[status] || '#9CA3AF' }]}>
        <Text style={styles.statusBadgeText}>{String(status || '').toUpperCase()}</Text>
      </View>
    );
  };

  const balanceText = walletQuery.data?.balance?.toFixed(2) || '0.00';
  const currencyText = walletQuery.data?.currency || 'USD';
  const selectedCryptoLabel = cryptoOptions.find((c) => c.value === selectedCrypto)?.label || selectedCrypto;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      {/* ✅ Hide default expo-router header (dark blue bar) */}
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={withdrawHistoryQuery.isRefetching || walletQuery.isRefetching}
              onRefresh={() => {
                withdrawHistoryQuery.refetch();
                walletQuery.refetch();
              }}
              tintColor={UI.green}
              colors={[UI.green]}
            />
          }
        >
          {/* ✅ Clean header row like Send page */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color={UI.text} />
              <Text style={styles.headerBack}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{i18n.t('withdraw')}</Text>

            <View style={{ width: 70 }} />
          </View>

          {/* ✅ Green balance card like dashboard */}
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

          {/* ✅ Withdraw Form */}
          <View style={styles.formCard}>
            <Text style={styles.label}>{i18n.t('selectCrypto')}</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowCryptoModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.selectorText}>{selectedCryptoLabel}</Text>
              <ChevronDown size={20} color={UI.text2} />
            </TouchableOpacity>

            <Text style={styles.label}>{i18n.t('withdrawalAmount')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('amount')}
              placeholderTextColor={UI.text2}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>{i18n.t('walletAddress')}</Text>
            <TextInput
              style={[styles.input, { minHeight: 54 }]}
              placeholder={i18n.t('enterWalletAddress')}
              placeholderTextColor={UI.text2}
              value={walletAddress}
              onChangeText={setWalletAddress}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (withdrawMutation.isPending || walletQuery.isLoading) && { opacity: 0.7 },
              ]}
              onPress={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending || walletQuery.isLoading}
              activeOpacity={0.9}
            >
              {withdrawMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>{i18n.t('submit')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ✅ Withdraw History */}
          <View style={styles.historyCardWrap}>
            <Text style={styles.historyTitle}>{i18n.t('withdrawHistory')}</Text>

            {withdrawHistoryQuery.isLoading ? (
              <ActivityIndicator color={UI.green} size="large" style={{ marginVertical: 18 }} />
            ) : withdrawHistoryQuery.error ? (
              <Text style={[styles.centerText, { color: UI.danger }]}>
                {(withdrawHistoryQuery.error as Error).message}
              </Text>
            ) : !withdrawHistoryQuery.data || withdrawHistoryQuery.data.length === 0 ? (
              <Text style={[styles.centerText, { color: UI.text2 }]}>
                {i18n.t('noWithdrawalsYet')}
              </Text>
            ) : (
              withdrawHistoryQuery.data.map((w: any) => (
                <View key={w.id} style={styles.historyItem}>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>{i18n.t('amount')}</Text>
                    <Text style={styles.historyValue}>${Number(w.amount).toFixed(2)}</Text>
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>{i18n.t('network')}</Text>
                    <Text style={styles.historyValue}>{w.crypto}</Text>
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>{i18n.t('address')}</Text>
                    <Text style={styles.historyAddress} numberOfLines={1}>
                      {w.destination}
                    </Text>
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>{i18n.t('status')}</Text>
                    <StatusBadge status={w.status} />
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>{i18n.t('date')}</Text>
                    <Text style={styles.historyValue}>
                      {new Date(w.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  {w.status === 'rejected' && w.reject_reason ? (
                    <View style={styles.rejectBox}>
                      <Text style={styles.rejectLabel}>{i18n.t('reason')}:</Text>
                      <Text style={styles.rejectText}>{w.reject_reason}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>

        {/* ✅ Crypto Modal */}
        <Modal
          visible={showCryptoModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCryptoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{i18n.t('selectCrypto')}</Text>

              {cryptoOptions.map((crypto) => (
                <TouchableOpacity
                  key={crypto.value}
                  style={styles.cryptoOption}
                  onPress={() => {
                    setSelectedCrypto(crypto.value);
                    setShowCryptoModal(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cryptoOptionText}>{crypto.label}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCryptoModal(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.modalCloseButtonText}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },

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

  // Green balance card
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

  // Form card
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
  selector: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
  },

  primaryButton: {
    backgroundColor: UI.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  // History
  historyCardWrap: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: UI.card,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.text2,
  },
  historyValue: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
  },
  historyAddress: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.text,
    maxWidth: '62%',
    textAlign: 'right',
  },
  centerText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '900',
  },

  rejectBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.18)',
  },
  rejectLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.danger,
    marginBottom: 4,
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.danger,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: UI.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: UI.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  cryptoOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  cryptoOptionText: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
  },
  modalCloseButton: {
    backgroundColor: UI.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});

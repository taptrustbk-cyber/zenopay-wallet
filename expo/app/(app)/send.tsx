import { useRouter, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
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
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

const UI = {
  bg: '#F4F7FB',
  page: '#FFFFFF',
  card: '#FFFFFF',
  cardSoft: '#F4F7FB',
  text: '#0F1B33',
  text2: '#5B6B82',
  text3: '#9FB0C7',
  border: '#E3E8F0',

  blue: '#0F2A5C',
  blue2: '#3B82F6',
  blue3: '#60A5FA',
  blueDark: '#0A1F45',
  blueSoft: '#E8EEF6',
  blueSoft2: '#DCEBFF',

  success: '#16A34A',
  successSoft: '#EAF8EF',
  danger: '#F43F5E',
  dangerSoft: '#FFF1F4',

  white: '#FFFFFF',
  shadow: '#A8B8CC',
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

const STEP_AMOUNT = 1000;

const tSafe = (key: string, fallback: string) => {
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
};

const safeNumber = (value: string) => {
  const onlyDigits = String(value || '').replace(/[^\d]/g, '');
  return Number(onlyDigits || 0);
};

const formatWithDots = (value: number | string) => {
  const num = typeof value === 'number' ? value : safeNumber(value);
  if (!num) return '0';
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const usesArabicCurrency = () => {
  const lang = String((i18n as any).locale || '').toLowerCase();
  return ['ar', 'ku', 'cbk', 'kmr', 'ckb'].includes(lang);
};

const currencyLabel = () => {
  return usesArabicCurrency()
    ? tSafe('sekShort', 'د.غ')
    : tSafe('sekShort', 'SEK');
};

const formatMoneyText = (value: number | string) => {
  return `${formatWithDots(value)} ${currencyLabel()}`;
};

export default function SendMoneyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  useTheme();

  const isRTL = I18nManager.isRTL;

  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error(tSafe('sendPage.userIdNotFound', 'User ID not found'));

      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw new Error(error.message || tSafe('sendPage.failedToFetchWallet', 'Failed to fetch wallet'));
      return (data as Wallet) || null;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const walletBalanceNumber = Number(walletQuery.data?.balance || 0);
  const amountNumber = useMemo(() => safeNumber(amount), [amount]);

  const onChangeAmount = (text: string) => {
    const numericValue = safeNumber(text);
    setAmount(numericValue ? formatWithDots(numericValue) : '');
  };

  const increaseAmount = () => {
    const next = amountNumber + STEP_AMOUNT;
    setAmount(formatWithDots(next));
  };

  const decreaseAmount = () => {
    const next = Math.max(0, amountNumber - STEP_AMOUNT);
    setAmount(next ? formatWithDots(next) : '');
  };

  const quickAmounts = [1000, 5000, 10000, 25000];

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!recipientEmail.trim()) {
        throw new Error(tSafe('enterEmail', 'Please enter recipient email'));
      }

      if (!amount.trim()) {
        throw new Error(tSafe('enterAmount', 'Please enter amount'));
      }

      const amountNum = safeNumber(amount);

      if (!amountNum || amountNum <= 0) {
        throw new Error(tSafe('invalidAmount', 'Invalid amount'));
      }

      if (!walletQuery.data) {
        throw new Error(tSafe('walletNotFound', 'Wallet not found'));
      }

      if (walletQuery.data.is_locked) {
        throw new Error(tSafe('walletLocked', 'Wallet is locked'));
      }

      if (amountNum > Number(walletQuery.data.balance || 0)) {
        throw new Error(
          `${tSafe('insufficientBalance', 'Insufficient balance')}\n${formatMoneyText(
            walletQuery.data.balance || 0
          )}`
        );
      }

      if (!user?.email) {
        throw new Error(tSafe('sendPage.userEmailNotFound', 'User email not found'));
      }

      const cleanEmail = recipientEmail.trim().toLowerCase();
      if (cleanEmail === user.email.toLowerCase()) {
        throw new Error(tSafe('cannotSendToYourself', 'You cannot send money to yourself'));
      }

      const cleanNote = note.trim();

      const { error } = await supabase.rpc('send_money', {
        to_email: cleanEmail,
        send_amount: amountNum,
        send_note: cleanNote || null,
      });

      if (error) {
        throw new Error(error.message || tSafe('sendPage.failedToSendMoney', 'Failed to send money'));
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions-rich-final'] });

      Alert.alert(
        tSafe('success', 'Success'),
        tSafe('transactionSuccess', 'Money sent successfully')
      );

      setRecipientEmail('');
      setAmount('');
      setNote('');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(
        tSafe('error', 'Error'),
        error?.message || tSafe('sendPage.failedToSendMoney', 'Failed to send money')
      );
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
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
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.9}>
              <Ionicons
                name={isRTL ? 'chevron-forward' : 'chevron-back'}
                size={22}
                color={UI.blueDark}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              {tSafe('sendMoney', 'Send Money')}
            </Text>

            <View style={styles.headerBtnGhost} />
          </View>

          <LinearGradient
            colors={['#77B6FF', '#4D8EF7', '#0F2A5C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceGlowOne} />
            <View style={styles.balanceGlowTwo} />

            <View style={styles.balanceCardTop}>
              <View style={styles.balanceTextBlock}>
                <Text style={styles.balanceLabel}>
                  {tSafe('accountBalance', 'Account Balance')}
                </Text>

                {walletQuery.isLoading ? (
                  <Text style={styles.balanceValue}>...</Text>
                ) : (
                  <Text style={styles.balanceValue} numberOfLines={1}>
                    {formatMoneyText(walletBalanceNumber)}
                  </Text>
                )}
              </View>

              <View style={styles.balanceIconWrap}>
                <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
              </View>
            </View>

            {walletQuery.isError ? (
              <View style={styles.balanceErrorRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#fff" />
                <Text style={styles.balanceErrorText}>
                  {tSafe('failedToLoadBalance', 'Failed to load balance')}
                </Text>
              </View>
            ) : (
              <Text style={styles.balanceHint}>
                {tSafe('sendMoneySubtitle', 'Secure Iraqi Dinar transfer')}
              </Text>
            )}
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {tSafe('sendMoney', 'Send Money')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {tSafe('sendMoneyFormSubtitle', 'Enter receiver email, amount, and note')}
              </Text>
            </View>

            <Text style={styles.label}>
              {tSafe('recipientEmail', 'Recipient Email')}
            </Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={UI.text2} />
              <TextInput
                style={styles.input}
                placeholder={tSafe('recipientEmail', 'Recipient Email')}
                placeholderTextColor={UI.text3}
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <Text style={styles.label}>
              {tSafe('amount', 'Amount')}
            </Text>

            <View style={styles.amountCard}>
              <View style={styles.amountHeaderRow}>
                <Text style={styles.amountHeaderTitle}>
                  {tSafe('enterAmount', 'Enter Amount')}
                </Text>
                <View style={styles.currencyPill}>
                  <Text style={styles.currencyPillText}>{currencyLabel()}</Text>
                </View>
              </View>

              <View style={styles.amountControlRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={decreaseAmount} activeOpacity={0.9}>
                  <Ionicons name="remove" size={22} color={UI.blueDark} />
                </TouchableOpacity>

                <View style={styles.amountInputWrap}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor={UI.text3}
                    value={amount}
                    onChangeText={onChangeAmount}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                  <Text style={styles.amountCurrencyText}>{currencyLabel()}</Text>
                </View>

                <TouchableOpacity style={styles.stepBtn} onPress={increaseAmount} activeOpacity={0.9}>
                  <Ionicons name="add" size={22} color={UI.blueDark} />
                </TouchableOpacity>
              </View>

              <View style={styles.quickAmountRow}>
                {quickAmounts.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.quickAmountChip}
                    onPress={() => setAmount(formatWithDots(item))}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.quickAmountChipText}>{formatWithDots(item)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.label}>
              {tSafe('note', 'Note')}
            </Text>
            <View style={[styles.inputWrap, styles.noteWrap]}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={UI.text2}
                style={styles.noteIcon}
              />
              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder={tSafe('addNoteOptional', 'Add note (optional)')}
                placeholderTextColor={UI.text3}
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
                maxLength={250}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {tSafe('transactionAmount', 'Transaction Amount')}
                </Text>
                <Text style={styles.summaryValue}>
                  {formatMoneyText(amountNumber)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {tSafe('transactionFee', 'Transaction Fee')}
                </Text>
                <Text style={[styles.summaryValue, styles.feeValue]}>
                  {formatMoneyText(0)}
                </Text>
              </View>

              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabelStrong}>
                  {tSafe('totalSend', 'Total Send')}
                </Text>
                <Text style={styles.summaryValueStrong}>
                  {formatMoneyText(amountNumber)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.sendButtonWrap,
                (sendMutation.isPending || walletQuery.isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || walletQuery.isLoading}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={['#79B7FF', '#4C92F7', '#0F2A5C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButton}
              >
                {sendMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                    <Text style={styles.sendButtonText}>
                      {tSafe('send', 'Send')}
                    </Text>
                  </>
                )}
              </LinearGradient>
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  headerBtn: {
    width: 48,
    height: 48,
    borderRadius: 22,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },

  headerBtnGhost: {
    width: 48,
    height: 48,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },

  balanceCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    overflow: 'hidden',
    minHeight: 112,
    ...SHADOWS.card,
  },

  balanceGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.14)',
    left: -50,
    bottom: -85,
  },

  balanceGlowTwo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    right: -35,
    top: -45,
  },

  balanceCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  balanceTextBlock: {
    flex: 1,
  },

  balanceLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '800',
  },

  balanceValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  balanceIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  balanceHint: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 13,
    fontWeight: '700',
  },

  balanceErrorRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  balanceErrorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  formCard: {
    borderRadius: 28,
    backgroundColor: UI.card,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
  },

  sectionHead: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: UI.text,
  },

  sectionSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
  },

  label: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
    marginTop: 4,
  },

  inputWrap: {
    minHeight: 58,
    backgroundColor: UI.cardSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    ...SHADOWS.soft,
  },

  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: UI.text,
    paddingVertical: 16,
  },

  amountCard: {
    backgroundColor: UI.blueSoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 14,
  },

  amountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  amountHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.blueDark,
  },

  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: UI.border,
  },

  currencyPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.blueDark,
  },

  amountControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },

  amountInputWrap: {
    flex: 1,
    minHeight: 68,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    ...SHADOWS.soft,
  },

  amountInput: {
    width: '100%',
    fontSize: 28,
    fontWeight: '900',
    color: UI.blueDark,
    paddingTop: 10,
    textAlign: 'center',
  },

  amountCurrencyText: {
    marginTop: 2,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '800',
    color: UI.text2,
  },

  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },

  quickAmountChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
  },

  quickAmountChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.blueDark,
  },

  noteWrap: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },

  noteIcon: {
    marginTop: 2,
  },

  noteInput: {
    minHeight: 88,
    paddingTop: 0,
  },

  summaryCard: {
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 22,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    ...SHADOWS.soft,
  },

  summaryRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF0F7',
  },

  summaryRowLast: {
    borderBottomWidth: 0,
  },

  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
  },

  summaryLabelStrong: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
  },

  summaryValue: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
  },

  feeValue: {
    color: UI.success,
  },

  summaryValueStrong: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.blueDark,
  },

  sendButtonWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.card,
  },

  sendButton: {
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  sendButtonDisabled: {
    opacity: 0.7,
  },

  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
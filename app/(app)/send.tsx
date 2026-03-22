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
  blue3: '#60A5FA',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  success: '#16A34A',
  successSoft: '#EAF8EF',
  danger: '#F43F5E',
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

const STEP_AMOUNT = 1000;

const safeNumber = (value: string) => {
  const onlyDigits = String(value || '').replace(/[^\d]/g, '');
  return Number(onlyDigits || 0);
};

const formatWithDots = (value: number | string) => {
  const num = typeof value === 'number' ? value : safeNumber(value);
  if (!num) return '0';
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const usesArabicIQD = () => {
  const lang = String(i18n.language || '').toLowerCase();
  return ['ar', 'ku', 'cbk', 'kmr'].includes(lang);
};

const currencyLabel = () => {
  return usesArabicIQD() ? 'د.غ' : 'IQD';
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
        throw new Error(String(i18n.t('enterEmail') || 'Please enter recipient email'));
      }

      if (!amount.trim()) {
        throw new Error(String(i18n.t('enterAmount') || 'Please enter amount'));
      }

      const amountNum = safeNumber(amount);

      if (!amountNum || amountNum <= 0) {
        throw new Error(String(i18n.t('invalidAmount') || 'Invalid amount'));
      }

      if (!walletQuery.data) {
        throw new Error(String(i18n.t('walletNotFound') || 'Wallet not found'));
      }

      if (walletQuery.data.is_locked) {
        throw new Error(String(i18n.t('walletLocked') || 'Wallet is locked'));
      }

      if (amountNum > Number(walletQuery.data.balance || 0)) {
        throw new Error(
          `${String(i18n.t('insufficientBalance') || 'Insufficient balance')}\n${formatMoneyText(
            walletQuery.data.balance || 0
          )}`
        );
      }

      if (!user?.email) {
        throw new Error('User email not found');
      }

      const cleanEmail = recipientEmail.trim().toLowerCase();
      if (cleanEmail === user.email.toLowerCase()) {
        throw new Error(String(i18n.t('cannotSendToYourself') || 'You cannot send money to yourself'));
      }

      const cleanNote = note.trim();

      const { error } = await supabase.rpc('send_money', {
        to_email: cleanEmail,
        send_amount: amountNum,
        send_note: cleanNote || null,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send money');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-rich-final'] });

      Alert.alert(
        String(i18n.t('success') || 'Success'),
        String(i18n.t('transactionSuccess') || 'Money sent successfully')
      );

      setRecipientEmail('');
      setAmount('');
      setNote('');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(
        String(i18n.t('error') || 'Error'),
        error?.message || 'Failed to send money'
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
              {String(i18n.t('sendMoney') || 'Send Money')}
            </Text>

            <View style={styles.headerBtnGhost} />
          </View>

          <LinearGradient
            colors={['#5DA8FF', '#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>
                  {String(i18n.t('accountBalance') || 'Account Balance')}
                </Text>
                <Text style={styles.heroBalance}>
                  {walletQuery.isLoading ? '...' : formatMoneyText(walletBalanceNumber)}
                </Text>
              </View>

              <View style={styles.heroIconWrap}>
                <Ionicons name="paper-plane-outline" size={26} color="#FFFFFF" />
              </View>
            </View>

            {walletQuery.isError ? (
              <View style={styles.heroErrorRow}>
                <Ionicons name="alert-circle-outline" size={18} color="#fff" />
                <Text style={styles.heroErrorText}>
                  {String(i18n.t('failedToLoadBalance') || 'Failed to load balance')}
                </Text>
              </View>
            ) : (
              <Text style={styles.heroSubtext}>
                {String(i18n.t('sendMoneySubtitle') || 'Secure Iraqi Dinar transfer')}
              </Text>
            )}
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {String(i18n.t('sendMoney') || 'Send Money')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {String(i18n.t('sendMoneyFormSubtitle') || 'Enter receiver email, amount, and note')}
              </Text>
            </View>

            <Text style={styles.label}>
              {String(i18n.t('recipientEmail') || 'Recipient Email')}
            </Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={UI.text2} />
              <TextInput
                style={styles.input}
                placeholder={String(i18n.t('recipientEmail') || 'Recipient Email')}
                placeholderTextColor={UI.text3}
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>
              {String(i18n.t('amount') || 'Amount')}
            </Text>

            <View style={styles.amountCard}>
              <View style={styles.amountHeaderRow}>
                <Text style={styles.amountHeaderTitle}>
                  {String(i18n.t('enterAmount') || 'Enter Amount')}
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
              {String(i18n.t('note') || 'Note')}
            </Text>
            <View style={[styles.inputWrap, styles.noteWrap]}>
              <Ionicons name="document-text-outline" size={20} color={UI.text2} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder={String(i18n.t('addNoteOptional') || 'Add note (optional)')}
                placeholderTextColor={UI.text3}
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
                maxLength={250}
              />
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {String(i18n.t('transactionAmount') || 'Transaction Amount')}
                </Text>
                <Text style={styles.summaryValue}>
                  {formatMoneyText(amountNumber)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {String(i18n.t('transactionFee') || 'Transaction Fee')}
                </Text>
                <Text style={[styles.summaryValue, styles.feeValue]}>
                  {formatMoneyText(0)}
                </Text>
              </View>

              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabelStrong}>
                  {String(i18n.t('totalSend') || 'Total Send')}
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
                colors={['#79B7FF', '#4C92F7', '#2563EB']}
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
                      {String(i18n.t('send') || 'Send')}
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

  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.card,
  },

  heroGlowOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.16)',
    left: -70,
    bottom: -90,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.10)',
    right: -30,
    top: -40,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },

  heroEyebrow: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '800',
  },

  heroBalance: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  heroSubtext: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 14,
    fontWeight: '700',
  },

  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  heroErrorRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  heroErrorText: {
    color: '#fff',
    fontSize: 14,
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
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
  Modal,
  RefreshControl,
  Image,
  I18nManager,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  ChevronDown,
  Image as ImageIcon,
  Landmark,
  Receipt,
  Wallet2,
  DollarSign,
  ArrowRightLeft,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

const RECEIPT_BUCKET = 'withdraw-receipts';
const MIN_WITHDRAW_SEK = 1000;
const MAX_WITHDRAW_SEK = 1000000;

const DEFAULT_USDT_RATE_SEK = 1550;
const DEFAULT_MIN_USDT = 1;
const DEFAULT_MAX_USDT = 10000;

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
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
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

type PaymentMethod = {
  id: string;
  name: string;
  account_name?: string | null;
  account_number?: string | null;
  instructions?: string | null;
  qr_image?: string | null;
  logo_url?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  method_type?: 'withdraw' | 'deposit' | null;
  exchange_rate_iqd?: number | null;
  min_amount_usd?: number | null;
  max_amount_usd?: number | null;
  address_label?: string | null;
};

type WithdrawOrderItem = {
  id: string;
  amount: number;
  status: string;
  reject_reason?: string | null;
  created_at: string;
  sender_name?: string | null;
  sender_number?: string | null;
  note?: string | null;
  receipt_image?: string | null;
  payment_method_id?: string | null;
  payment_method?: {
    name?: string | null;
    account_name?: string | null;
    account_number?: string | null;
    logo_url?: string | null;
  } | null;
};

function tSafe(key: string, fallback: string) {
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
}

function formatSEK(value: number | string | null | undefined) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('de-DE');
}

function formatUSD(value: number | string | null | undefined) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function parseIQDInput(value: string) {
  const onlyDigits = String(value || '').replace(/[^\d]/g, '');
  return onlyDigits ? Number(onlyDigits) : 0;
}

function formatSEKInput(value: string) {
  const onlyDigits = String(value || '').replace(/[^\d]/g, '');
  if (!onlyDigits) return '';
  return Number(onlyDigits).toLocaleString('de-DE');
}

function isUsdtTrc20Method(method?: PaymentMethod | null) {
  const name = String(method?.name || '').toLowerCase();
  return name.includes('usdt') && name.includes('trc20');
}

function getStatusMeta(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'approved':
      return {
        bg: UI.successSoft,
        text: UI.success,
        label: tSafe('withdrawPage.approved', 'Approved'),
      };
    case 'rejected':
    case 'cancelled':
      return {
        bg: UI.dangerSoft,
        text: UI.danger,
        label: tSafe('withdrawPage.rejected', 'Rejected'),
      };
    default:
      return {
        bg: UI.warningSoft,
        text: UI.warning,
        label: tSafe('withdrawPage.pending', 'Pending'),
      };
  }
}

export default function WithdrawScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  useTheme();

  const isRTL = I18nManager.isRTL;

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error(tSafe('withdrawPage.userIdNotFound', 'User ID not found'));

      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw new Error(error.message || tSafe('withdrawPage.failedToFetchWallet', 'Failed to fetch wallet'));

      if (!data) {
        return {
          user_id: user.id,
          balance: 0,
          currency: 'SEK',
          is_locked: false,
        } as Wallet;
      }

      return {
        ...data,
        currency: 'SEK',
      } as Wallet;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ['payment_methods', 'withdraw'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select(
          'id, name, account_name, account_number, instructions, qr_image, logo_url, is_active, sort_order, method_type, exchange_rate_iqd, min_amount_usd, max_amount_usd, address_label'
        )
        .eq('is_active', true)
        .eq('method_type', 'withdraw')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message || tSafe('withdrawPage.failedToFetchPaymentMethods', 'Failed to fetch payment methods'));
      return (data || []) as PaymentMethod[];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const withdrawHistoryQuery = useQuery({
    queryKey: ['withdraw_orders', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error(tSafe('withdrawPage.userIdNotFound', 'User ID not found'));

      const { data, error } = await supabase
        .from('withdraw_orders')
        .select(`
          id,
          amount,
          status,
          reject_reason,
          created_at,
          sender_name,
          sender_number,
          note,
          receipt_image,
          payment_method_id,
          payment_method:payment_methods (
            name,
            account_name,
            account_number,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || tSafe('withdrawPage.failedToFetchWithdrawalHistory', 'Failed to fetch withdrawal history'));
      return (data || []) as WithdrawOrderItem[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const selectedMethod = useMemo(() => {
    return paymentMethodsQuery.data?.find((m) => m.id === selectedMethodId) || null;
  }, [paymentMethodsQuery.data, selectedMethodId]);

  const isUSDT = isUsdtTrc20Method(selectedMethod);
  const usdtRate = Number(selectedMethod?.exchange_rate_iqd || DEFAULT_USDT_RATE_SEK);
  const minUsd = Number(selectedMethod?.min_amount_usd || DEFAULT_MIN_USDT);
  const maxUsd = Number(selectedMethod?.max_amount_usd || DEFAULT_MAX_USDT);

  const amountNumber = useMemo(() => parseIQDInput(amount), [amount]);

  const usdReceiveValue = useMemo(() => {
    if (!isUSDT || !usdtRate || amountNumber <= 0) return 0;
    return amountNumber / usdtRate;
  }, [amountNumber, isUSDT, usdtRate]);

  const balanceText = formatSEK(walletQuery.data?.balance || 0);

  const pickReceiptImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          tSafe('error', 'Error'),
          tSafe('withdrawPage.photoPermissionDenied', 'Photo permission denied')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert(
        tSafe('error', 'Error'),
        error?.message || tSafe('withdrawPage.failedToPickImage', 'Failed to pick image')
      );
    }
  };

  const uploadReceiptToStorage = async (uri: string) => {
    if (!user?.id) throw new Error(tSafe('withdrawPage.userIdNotFound', 'User ID not found'));

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
        ? 'image/webp'
        : ext === 'heic'
        ? 'image/heic'
        : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message || tSafe('withdrawPage.failedToUploadImage', 'Failed to upload image'));

    const { data } = supabase.storage.from(RECEIPT_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(tSafe('withdrawPage.userIdNotFound', 'User ID not found'));
      if (!selectedMethod) {
        throw new Error(tSafe('withdrawPage.selectPaymentMethod', 'Select payment method'));
      }
      if (!amount.trim()) {
        throw new Error(tSafe('withdrawPage.enterAmount', 'Enter amount'));
      }
      if (!senderName.trim()) {
        throw new Error(tSafe('withdrawPage.enterReceiveName', 'Please enter receiver name'));
      }
      if (!senderNumber.trim()) {
        throw new Error(tSafe('withdrawPage.enterReceiveNumber', 'Please enter receiver number'));
      }

      const amountNum = parseIQDInput(amount);

      if (Number.isNaN(amountNum) || amountNum <= 0) {
        throw new Error(tSafe('withdrawPage.invalidAmount', 'Invalid amount'));
      }

      if (isUSDT) {
        const usdAmount = amountNum / usdtRate;

        if (usdAmount < minUsd) {
          throw new Error(`${tSafe('withdrawPage.minimumWithdrawAmountIs', 'Minimum withdraw amount is')} $${formatUSD(minUsd)}`);
        }

        if (usdAmount > maxUsd) {
          throw new Error(`${tSafe('withdrawPage.maximumWithdrawAmountIs', 'Maximum withdraw amount is')} $${formatUSD(maxUsd)}`);
        }
      } else {
        if (amountNum < MIN_WITHDRAW_SEK) {
          throw new Error(
            `${tSafe('withdrawPage.minimumWithdrawAmount', 'Minimum withdraw amount')}: ${formatSEK(MIN_WITHDRAW_SEK)} ${tSafe('sekShort', 'SEK')}`
          );
        }

        if (amountNum > MAX_WITHDRAW_SEK) {
          throw new Error(
            `${tSafe('withdrawPage.maximumWithdrawAmount', 'Maximum withdraw amount')}: ${formatSEK(MAX_WITHDRAW_SEK)} ${tSafe('sekShort', 'SEK')}`
          );
        }
      }

      if (!walletQuery.data) {
        throw new Error(tSafe('withdrawPage.walletNotFound', 'Wallet not found'));
      }

      if (walletQuery.data.is_locked) {
        throw new Error(
          `${tSafe('security', 'Security')}: ${tSafe('contactSupport', 'Contact support')}`
        );
      }

      if (amountNum > Number(walletQuery.data.balance || 0)) {
        throw new Error(
          `${tSafe('withdrawPage.insufficientBalance', 'Insufficient balance')}\n${formatSEK(walletQuery.data.balance || 0)} ${tSafe('sekShort', 'SEK')}`
        );
      }

      const receiptUrl = receiptImage ? await uploadReceiptToStorage(receiptImage) : null;

      const extraNote = isUSDT
        ? `${tSafe('withdrawPage.usdtWithdrawNotePrefix', 'USDT TRC20 Withdraw')} | SEK: ${formatSEK(amountNum)} | ${tSafe('withdrawPage.rateShort', 'Rate')}: ${formatSEK(usdtRate)} SEK/USD | USD: ${formatUSD(usdReceiveValue)}`
        : null;

      const finalNote = [note.trim(), extraNote].filter(Boolean).join(' | ') || null;

      const { error } = await supabase.from('withdraw_orders').insert({
        user_id: user.id,
        amount: amountNum,
        currency: 'SEK',
        payment_method_id: selectedMethod.id,
        destination: senderNumber.trim(),
        sender_name: senderName.trim(),
        sender_number: senderNumber.trim(),
        note: finalNote,
        receipt_image: receiptUrl,
        status: 'pending',
      });

      if (error) throw new Error(error.message || tSafe('withdrawPage.failedToCreateWithdrawRequest', 'Failed to create withdraw request'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['withdraw_orders'] });

      setAmount('');
      setSenderName('');
      setSenderNumber('');
      setNote('');
      setReceiptImage(null);

      Alert.alert(
        tSafe('success', 'Success'),
        tSafe('withdrawPage.withdrawSuccessMessage', 'Your withdraw request has been sent successfully.')
      );
    },
    onError: (error: any) => {
      Alert.alert(
        tSafe('error', 'Error'),
        error?.message || tSafe('withdrawPage.failedToSubmitWithdrawalRequest', 'Failed to submit withdrawal request')
      );
    },
  });

  const renderMethodListItem = (method: PaymentMethod) => {
    const selected = selectedMethodId === method.id;
    const methodIsUsdt = isUsdtTrc20Method(method);

    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.methodListItem, selected && styles.methodListItemActive]}
        activeOpacity={0.92}
        onPress={() => {
          setSelectedMethodId(method.id);
          setShowMethodModal(false);
        }}
      >
        <View style={styles.methodListLeft}>
          <View style={[styles.methodLogoWrap, selected && styles.methodLogoWrapActive]}>
            {method.logo_url ? (
              <Image source={{ uri: method.logo_url }} style={styles.methodLogo} resizeMode="cover" />
            ) : (
              <Landmark size={22} color={selected ? UI.blueDark : UI.blue} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.methodName}>{method.name}</Text>
            {methodIsUsdt ? (
              <Text style={styles.methodSubLine}>
                1 USD = {formatSEK(method.exchange_rate_iqd || DEFAULT_USDT_RATE_SEK)} SEK
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
          {selected ? <View style={styles.radioInner} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

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
          refreshControl={
            <RefreshControl
              refreshing={
                withdrawHistoryQuery.isRefetching ||
                walletQuery.isRefetching ||
                paymentMethodsQuery.isRefetching
              }
              onRefresh={() => {
                withdrawHistoryQuery.refetch();
                walletQuery.refetch();
                paymentMethodsQuery.refetch();
              }}
              tintColor={UI.blue}
              colors={[UI.blue]}
            />
          }
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.back()}
              activeOpacity={0.9}
            >
              <Ionicons
                name={isRTL ? 'chevron-forward' : 'chevron-back'}
                size={22}
                color={UI.blueDark}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{tSafe('withdraw', 'Withdraw')}</Text>

            <View style={styles.headerBtnGhost} />
          </View>

          <LinearGradient
            colors={['#5DA8FF', '#3B82F6', '#0F2A5C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>
                  {tSafe('withdrawPage.accountBalance', 'Account Balance')}
                </Text>
                {walletQuery.isLoading ? (
                  <Text style={styles.heroBalance}>...</Text>
                ) : walletQuery.isError ? (
                  <View style={styles.heroErrorRow}>
                    <Ionicons name="alert-circle-outline" size={18} color="#fff" />
                    <Text style={styles.heroErrorText}>
                      {tSafe('failedToLoadBalance', 'Failed to load balance')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.heroBalance} numberOfLines={1}>
                    {balanceText} {tSafe('sekShort', 'SEK')}
                  </Text>
                )}
              </View>

              <View style={styles.heroIconWrap}>
                <Wallet2 size={22} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.heroSubtext}>
              {tSafe('withdrawPage.createWithdrawRequestSub', 'Create a withdraw request to send money')}
            </Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionTitle}>
                  {tSafe('withdrawPage.withdrawRequest', 'Withdraw Request')}
                </Text>
                <Text style={styles.sectionSub}>
                  {tSafe('withdrawPage.fillWithdrawForm', 'Choose payment method and enter your transfer details')}
                </Text>
              </View>
            </View>

            <Text style={styles.label}>
              {tSafe('withdrawPage.selectPaymentMethod', 'Select Payment Method')}
            </Text>

            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowMethodModal(true)}
              activeOpacity={0.9}
            >
              {selectedMethod ? (
                <View style={styles.selectedMethodInline}>
                  <View style={styles.selectedMethodLogo}>
                    {selectedMethod.logo_url ? (
                      <Image
                        source={{ uri: selectedMethod.logo_url }}
                        style={styles.selectedMethodLogoImg}
                      />
                    ) : (
                      <Landmark size={18} color={UI.blue} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectorText}>{selectedMethod.name}</Text>
                    {isUSDT ? (
                      <Text style={styles.selectorSubText}>
                        1 USD = {formatSEK(usdtRate)} SEK
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text style={[styles.selectorText, { color: UI.text3 }]}>
                  {tSafe('withdrawPage.choosePaymentMethod', 'Choose payment method')}
                </Text>
              )}

              <ChevronDown size={20} color={UI.text2} />
            </TouchableOpacity>

            <Text style={styles.label}>
              {tSafe('withdrawPage.withdrawalAmount', 'Withdrawal Amount')}
            </Text>
            <View style={styles.amountWrap}>
              <TextInput
                style={styles.amountInput}
                placeholder={tSafe('withdrawPage.enterAmount', 'Enter amount')}
                placeholderTextColor={UI.text3}
                value={amount}
                onChangeText={(text) => {
                  setAmount(formatSEKInput(text));
                }}
                keyboardType="number-pad"
              />
              <View style={styles.amountSuffix}>
                <Text style={styles.amountSuffixText}>{tSafe('sekShort', 'SEK')}</Text>
              </View>
            </View>

            {isUSDT ? (
              <>
                <View style={styles.rateBox}>
                  <View style={styles.rateRow}>
                    <View style={styles.rateChip}>
                      <DollarSign size={15} color={UI.blueDark} />
                      <Text style={styles.rateChipText}>USDT TRC20</Text>
                    </View>

                    <View style={styles.rateChip}>
                      <ArrowRightLeft size={14} color={UI.blueDark} />
                      <Text style={styles.rateChipText}>
                        1 USD = {formatSEK(usdtRate)} SEK
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rateResultRow}>
                    <Text style={styles.rateResultLabel}>
                      {tSafe('withdrawPage.youWillReceive', 'You will receive')}
                    </Text>
                    <Text style={styles.rateResultValue}>
                      ${formatUSD(usdReceiveValue)} USDT
                    </Text>
                  </View>
                </View>

                <View style={styles.limitBox}>
                  <Text style={styles.limitText}>
                    {tSafe('withdrawPage.minimumWithdrawAmountIs', 'Minimum withdraw amount is')} ${formatUSD(minUsd)}
                  </Text>
                  <Text style={styles.limitText}>
                    {tSafe('withdrawPage.maximumWithdrawAmountIs', 'Maximum withdraw amount is')} ${formatUSD(maxUsd)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.limitBox}>
                <Text style={styles.limitText}>
                  {tSafe('withdrawPage.minimumWithdrawAmount', 'Minimum withdraw amount') +
                    `: ${formatSEK(MIN_WITHDRAW_SEK)} ${tSafe('sekShort', 'SEK')}`}
                </Text>
                <Text style={styles.limitText}>
                  {tSafe('withdrawPage.maximumWithdrawAmount', 'Maximum withdraw amount') +
                    `: ${formatSEK(MAX_WITHDRAW_SEK)} ${tSafe('sekShort', 'SEK')}`}
                </Text>
              </View>
            )}

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {tSafe('withdrawPage.receiveName', 'Receive Name')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={tSafe('withdrawPage.enterReceiveName', 'Enter receive name')}
                  placeholderTextColor={UI.text3}
                  value={senderName}
                  onChangeText={setSenderName}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {tSafe('withdrawPage.receiveNumber', 'Receive Number')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={tSafe('withdrawPage.enterReceiveNumber', 'Enter receive number')}
                  placeholderTextColor={UI.text3}
                  value={senderNumber}
                  onChangeText={setSenderNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>{tSafe('withdrawPage.transferNote', 'Note (optional)')}</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder={tSafe('withdrawPage.writeAnyNote', 'Write any note')}
              placeholderTextColor={UI.text3}
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>
              {tSafe('withdrawPage.uploadQrCodeTitle', 'Upload QR Code (optional)')}
            </Text>
            <TouchableOpacity
              style={styles.uploadCard}
              activeOpacity={0.92}
              onPress={pickReceiptImage}
            >
              {receiptImage ? (
                <>
                  <Image
                    source={{ uri: receiptImage }}
                    style={styles.uploadPreview}
                    resizeMode="contain"
                  />
                  <View style={styles.uploadOverlay}>
                    <Text style={styles.uploadOverlayText}>
                      {tSafe('withdrawPage.changeImage', 'Change Image')}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.uploadEmpty}>
                  <View style={styles.uploadIconWrap}>
                    <ImageIcon size={22} color={UI.blue} />
                  </View>
                  <Text style={styles.uploadTitle}>
                    {tSafe('withdrawPage.uploadQrCode', 'Upload your QR code Payment')}
                  </Text>
                  <Text style={styles.uploadSub}>
                    {tSafe('withdrawPage.uploadQrCodeHelp', 'Enter your account QR code here')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {receiptImage ? (
              <TouchableOpacity
                style={styles.previewBigBtn}
                activeOpacity={0.88}
                onPress={() => {
                  setViewerImage(receiptImage);
                  setShowImageViewer(true);
                }}
              >
                <Ionicons name="expand-outline" size={18} color={UI.blue} />
                <Text style={styles.previewBigBtnText}>
                  {tSafe('withdrawPage.previewFullScreen', 'Preview Full Screen')}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButtonWrap,
                (withdrawMutation.isPending || walletQuery.isLoading) && { opacity: 0.7 },
              ]}
              onPress={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending || walletQuery.isLoading}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={['#79B7FF', '#4C92F7', '#0F2A5C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                {withdrawMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                      {tSafe('withdrawPage.submitWithdrawRequest', 'Submit Withdraw Request')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.historyCardWrap}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>
                  {tSafe('withdrawPage.withdrawHistory', 'Withdraw History')}
                </Text>
                <Text style={styles.historySub}>
                  {tSafe('withdrawPage.trackYourRequests', 'Track your pending, approved, or rejected requests')}
                </Text>
              </View>
            </View>

            {withdrawHistoryQuery.isLoading ? (
              <ActivityIndicator color={UI.blue} size="large" style={{ marginVertical: 18 }} />
            ) : withdrawHistoryQuery.error ? (
              <Text style={[styles.centerText, { color: UI.danger }]}>
                {(withdrawHistoryQuery.error as Error).message}
              </Text>
            ) : !withdrawHistoryQuery.data || withdrawHistoryQuery.data.length === 0 ? (
              <View style={styles.emptyBox}>
                <Receipt size={28} color={UI.text3} />
                <Text style={styles.emptyTitle}>
                  {tSafe('withdrawPage.noWithdrawalsYet', 'No withdrawals yet')}
                </Text>
                <Text style={styles.emptySub}>
                  {tSafe('withdrawPage.withdrawHistoryEmptyDesc', 'Your withdraw requests will appear here')}
                </Text>
              </View>
            ) : (
              withdrawHistoryQuery.data.map((w) => {
                const status = getStatusMeta(w.status);

                return (
                  <View key={w.id} style={styles.historyItem}>
                    <View style={styles.historyTop}>
                      <View style={styles.historyMethodWrap}>
                        <View style={styles.historyMethodLogo}>
                          {w.payment_method?.logo_url ? (
                            <Image
                              source={{ uri: w.payment_method.logo_url }}
                              style={styles.historyMethodLogoImg}
                              resizeMode="cover"
                            />
                          ) : (
                            <Landmark size={18} color={UI.blue} />
                          )}
                        </View>
                        <View>
                          <Text style={styles.historyMethodName}>
                            {w.payment_method?.name ||
                              tSafe('withdrawPage.paymentMethod', 'Payment Method')}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(w.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: status.text }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.historyGrid}>
                      <View style={styles.historyMiniCard}>
                        <Text style={styles.historyMiniLabel}>
                          {tSafe('withdrawPage.amount', 'Amount')}
                        </Text>
                        <Text style={styles.historyMiniValue}>
                          {formatSEK(w.amount)} {tSafe('sekShort', 'SEK')}
                        </Text>
                      </View>

                      <View style={styles.historyMiniCard}>
                        <Text style={styles.historyMiniLabel}>
                          {tSafe('withdrawPage.receiveNumber', 'Receive Number')}
                        </Text>
                        <Text style={styles.historyMiniValue}>{w.sender_number || '-'}</Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>
                        {tSafe('withdrawPage.receiveName', 'Receive Name')}
                      </Text>
                      <Text style={styles.infoValue}>{w.sender_name || '-'}</Text>
                    </View>

                    {!!w.note ? (
                      <View style={styles.noteBoxHistory}>
                        <Text style={styles.noteTitleHistory}>
                          {tSafe('withdrawPage.note', 'Note')}
                        </Text>
                        <Text style={styles.noteTextHistory}>{w.note}</Text>
                      </View>
                    ) : null}

                    {!!w.receipt_image ? (
                      <TouchableOpacity
                        style={styles.historyReceipt}
                        activeOpacity={0.92}
                        onPress={() => {
                          setViewerImage(w.receipt_image || null);
                          setShowImageViewer(true);
                        }}
                      >
                        <Image
                          source={{ uri: w.receipt_image }}
                          style={styles.historyReceiptImg}
                          resizeMode="cover"
                        />
                        <View style={styles.historyReceiptOverlay}>
                          <Ionicons name="expand-outline" size={18} color="#fff" />
                          <Text style={styles.historyReceiptOverlayText}>
                            {tSafe('withdrawPage.viewQrCode', 'View QR Code')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {String(w.status || '').toLowerCase() === 'rejected' && !!w.reject_reason ? (
                      <View style={styles.rejectBox}>
                        <Text style={styles.rejectLabel}>
                          {tSafe('withdrawPage.reason', 'Reason')}:
                        </Text>
                        <Text style={styles.rejectText}>{w.reject_reason}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>

        <Modal
          visible={showMethodModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMethodModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>
                  {tSafe('withdrawPage.selectPaymentMethod', 'Select Payment Method')}
                </Text>
                <TouchableOpacity
                  style={styles.closeCircle}
                  onPress={() => setShowMethodModal(false)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={20} color={UI.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {paymentMethodsQuery.isLoading ? (
                  <ActivityIndicator color={UI.blue} style={{ marginVertical: 20 }} />
                ) : paymentMethodsQuery.error ? (
                  <Text style={[styles.centerText, { color: UI.danger }]}>
                    {(paymentMethodsQuery.error as Error).message}
                  </Text>
                ) : !paymentMethodsQuery.data || paymentMethodsQuery.data.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Landmark size={28} color={UI.text3} />
                    <Text style={styles.emptyTitle}>
                      {tSafe('withdrawPage.noPaymentMethods', 'No payment methods')}
                    </Text>
                    <Text style={styles.emptySub}>
                      {tSafe('withdrawPage.noPaymentMethodsDesc', 'Admin has not added any payment methods yet')}
                    </Text>
                  </View>
                ) : (
                  paymentMethodsQuery.data.map((method) => renderMethodListItem(method))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showImageViewer}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageViewer(false)}
        >
          <View style={styles.viewerOverlay}>
            <TouchableOpacity
              style={styles.viewerClose}
              onPress={() => setShowImageViewer(false)}
              activeOpacity={0.86}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewerBackdrop}
              activeOpacity={1}
              onPress={() => setShowImageViewer(false)}
            >
              {viewerImage ? (
                <Image source={{ uri: viewerImage }} style={styles.viewerImage} resizeMode="contain" />
              ) : null}
            </TouchableOpacity>
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
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: UI.text2,
  },

  label: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
  },

  selector: {
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    ...SHADOWS.soft,
  },
  selectedMethodInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedMethodLogo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectedMethodLogoImg: {
    width: '100%',
    height: '100%',
  },
  selectorText: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
  },
  selectorSubText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
    color: UI.text2,
  },

  methodListItem: {
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: UI.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...SHADOWS.soft,
  },
  methodListItemActive: {
    borderColor: UI.blue,
    backgroundColor: '#F7FBFF',
  },
  methodListLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodLogoWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  methodLogoWrapActive: {
    backgroundColor: UI.blueSoft2,
  },
  methodLogo: {
    width: '100%',
    height: '100%',
  },
  methodName: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
  },
  methodSubLine: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '800',
    color: UI.text2,
  },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  radioOuterActive: {
    borderColor: UI.blue,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: UI.blue,
  },

  amountWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 10,
  },
  amountInput: {
    flex: 1,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },
  amountSuffix: {
    minWidth: 82,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: UI.border,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  amountSuffixText: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.blueDark,
  },

  rateBox: {
    marginBottom: 12,
    backgroundColor: UI.blueSoft,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  rateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  rateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  rateChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.blueDark,
  },
  rateResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateResultLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.text2,
  },
  rateResultValue: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.blueDark,
  },

  limitBox: {
    marginBottom: 14,
    backgroundColor: UI.warningSoft,
    borderRadius: 14,
    padding: 12,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    lineHeight: 18,
  },

  grid2: {
    flexDirection: 'row',
    gap: 12,
  },

  input: {
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: UI.text,
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  noteInput: {
    minHeight: 96,
  },

  uploadCard: {
    height: 220,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#BFD7FF',
    backgroundColor: '#F7FBFF',
    overflow: 'hidden',
    marginBottom: 12,
  },
  uploadEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  uploadIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
  },
  uploadSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
  },
  uploadOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(37,99,235,0.88)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  uploadOverlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },

  previewBigBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: UI.blueSoft,
    marginBottom: 14,
  },
  previewBigBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.blue,
  },

  primaryButtonWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 6,
    ...SHADOWS.card,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  historyCardWrap: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: UI.card,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
  },
  historyHeader: {
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
  },
  historySub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: UI.text2,
  },

  historyItem: {
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  historyMethodWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyMethodLogo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  historyMethodLogoImg: {
    width: '100%',
    height: '100%',
  },
  historyMethodName: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
    marginTop: 2,
  },

  historyGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  historyMiniCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    padding: 12,
  },
  historyMiniLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: UI.text2,
  },
  historyMiniValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.text2,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900',
    color: UI.text,
  },

  noteBoxHistory: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: UI.blueSoft,
    padding: 12,
    borderRadius: 14,
  },
  noteTitleHistory: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.blue,
    marginBottom: 4,
  },
  noteTextHistory: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text,
    lineHeight: 18,
  },

  historyReceipt: {
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
  },
  historyReceiptImg: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  historyReceiptOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37,99,235,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  historyReceiptOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },

  centerText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
  },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 18,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  rejectBox: {
    marginTop: 10,
    backgroundColor: UI.dangerSoft,
    borderRadius: 14,
    padding: 12,
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
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.48)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '86%',
    backgroundColor: UI.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: UI.border,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.96)',
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: 18,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 40,
  },
  viewerImage: {
    width: '100%',
    height: '82%',
  },
});
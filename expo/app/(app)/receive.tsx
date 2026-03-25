import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import i18n from '@/lib/i18n';
import {
  ChevronDown,
  Landmark,
  Wallet2,
  Image as ImageIcon,
  Receipt,
  QrCode,
  Copy,
  Eye,
  DollarSign,
  ArrowRightLeft,
} from 'lucide-react-native';
import { decode } from 'base64-arraybuffer';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet } from '@/lib/types';

export const options = { headerShown: false };

const DEPOSIT_BUCKET = 'deposit-receipts';
const MIN_DEPOSIT_IQD = 1000;
const MAX_DEPOSIT_IQD = 5000000;

const DEFAULT_USDT_RATE_IQD = 1550;
const DEFAULT_MIN_USDT = 5;
const DEFAULT_MAX_USDT = 10000;

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
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
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

type DepositOrderItem = {
  id: string;
  amount: number;
  currency?: string | null;
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
    qr_image?: string | null;
  } | null;
};

function formatIQD(value: number | string | null | undefined) {
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

function formatIQDInput(value: string) {
  const onlyDigits = String(value || '').replace(/[^\d]/g, '');
  if (!onlyDigits) return '';
  return Number(onlyDigits).toLocaleString('de-DE');
}

function sanitizeUSDInput(value: string) {
  let clean = String(value || '').replace(/[^0-9.]/g, '');

  const firstDot = clean.indexOf('.');
  if (firstDot !== -1) {
    clean =
      clean.slice(0, firstDot + 1) +
      clean
        .slice(firstDot + 1)
        .replace(/\./g, '');
  }

  const parts = clean.split('.');
  if (parts.length === 2) {
    clean = `${parts[0]}.${parts[1].slice(0, 2)}`;
  }

  return clean;
}

function parseUSDInput(value: string) {
  const num = Number(String(value || '').replace(/,/g, ''));
  if (Number.isNaN(num)) return 0;
  return num;
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
        label: i18n.t('approved') || 'Approved',
      };
    case 'rejected':
    case 'cancelled':
      return {
        bg: UI.dangerSoft,
        text: UI.danger,
        label: i18n.t('rejected') || 'Rejected',
      };
    default:
      return {
        bg: UI.warningSoft,
        text: UI.warning,
        label: i18n.t('pending') || 'Pending',
      };
  }
}

export default function DepositScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
      if (!user?.id) throw new Error('User ID not found');

      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw new Error(error.message || 'Failed to fetch wallet');

      if (!data) {
        return {
          user_id: user.id,
          balance: 0,
          currency: 'IQD',
          is_locked: false,
        } as Wallet;
      }

      return {
        ...data,
        currency: 'IQD',
      } as Wallet;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ['payment_methods', 'deposit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select(
          'id, name, account_name, account_number, instructions, qr_image, logo_url, is_active, sort_order, method_type, exchange_rate_iqd, min_amount_usd, max_amount_usd, address_label'
        )
        .eq('is_active', true)
        .eq('method_type', 'deposit')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message || 'Failed to fetch payment methods');
      return (data || []) as PaymentMethod[];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const depositHistoryQuery = useQuery({
    queryKey: ['deposit_orders', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not found');

      const { data, error } = await supabase
        .from('deposit_orders')
        .select(`
          id,
          amount,
          currency,
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
            logo_url,
            qr_image
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || 'Failed to fetch deposit history');
      return (data || []) as DepositOrderItem[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const selectedMethod = useMemo(() => {
    return paymentMethodsQuery.data?.find((m) => m.id === selectedMethodId) || null;
  }, [paymentMethodsQuery.data, selectedMethodId]);

  const isUSDT = isUsdtTrc20Method(selectedMethod);
  const usdtRate = Number(selectedMethod?.exchange_rate_iqd || DEFAULT_USDT_RATE_IQD);
  const minUsd = Number(selectedMethod?.min_amount_usd || DEFAULT_MIN_USDT);
  const maxUsd = Number(selectedMethod?.max_amount_usd || DEFAULT_MAX_USDT);

  const amountNumber = useMemo(() => {
    return isUSDT ? parseUSDInput(amount) : parseIQDInput(amount);
  }, [amount, isUSDT]);

  const convertedIQD = useMemo(() => {
    if (!isUSDT) return 0;
    return Math.round(amountNumber * usdtRate);
  }, [amountNumber, isUSDT, usdtRate]);

  const displayedBalanceText = formatIQD(walletQuery.data?.balance || 0);

  const amountSuffixLabel = isUSDT ? 'USD' : (i18n.t('iqdShort') || 'IQD');
  const amountLabel = isUSDT
    ? (i18n.t('amount') || 'Amount') + ' (USD)'
    : (i18n.t('amount') || 'Amount');

  const accountNumberLabel = isUSDT
    ? selectedMethod?.address_label || 'USDT TRC20 Address'
    : i18n.t('bankNumber') || 'Bank / Account Number';

  const senderNumberLabel = isUSDT
    ? 'Your Wallet Address / Tx Hash'
    : i18n.t('senderNumber') || 'Account Number / Mobile';

  const senderNumberPlaceholder = isUSDT
    ? 'Enter your wallet address or transaction hash'
    : i18n.t('enterSenderNumber') || 'Please enter your account number';

  const instructionsTitle = i18n.t('instructions') || 'Instructions';
  const selectedInstructions = isUSDT
    ? selectedMethod?.instructions || 'Send only USDT through TRC20 network to the address below.'
    : selectedMethod?.instructions || '';

  const pickReceiptImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          i18n.t('error') || 'Error',
          i18n.t('photoPermissionDenied') || 'Photo permission denied'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert(i18n.t('error') || 'Error', error?.message || 'Failed to pick image');
    }
  };

  const copyText = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(i18n.t('success') || 'Success', i18n.t('done') || 'Done');
    } catch {
      Alert.alert(i18n.t('error') || 'Error', 'Copy failed');
    }
  };

  const uploadReceiptToStorage = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const reader = new FileReader();

    const base64: string = await new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        const pureBase64 = result.split(',')[1];
        resolve(pureBase64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(DEPOSIT_BUCKET)
      .upload(fileName, decode(base64), {
        contentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message || 'Failed to upload image');

    const { data } = supabase.storage.from(DEPOSIT_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');
      if (!selectedMethod) {
        throw new Error(i18n.t('selectPaymentMethod') || 'Select payment method');
      }
      if (!amount.trim()) {
        throw new Error(i18n.t('enterAmount') || 'Enter amount');
      }
      if (!senderName.trim()) {
        throw new Error(i18n.t('enterSenderName') || 'Please enter your account holder name');
      }
      if (!senderNumber.trim()) {
        throw new Error(senderNumberPlaceholder);
      }
      if (!receiptImage) {
        throw new Error(
          i18n.t('uploadTransactionImage') || 'Upload your transaction screenshot'
        );
      }

      const rawAmount = isUSDT ? parseUSDInput(amount) : parseIQDInput(amount);

      if (Number.isNaN(rawAmount) || rawAmount <= 0) {
        throw new Error(i18n.t('invalidAmount') || 'Invalid amount');
      }

      if (isUSDT) {
        if (rawAmount < minUsd) {
          throw new Error(`Minimum deposit amount is $${formatUSD(minUsd)}`);
        }

        if (rawAmount > maxUsd) {
          throw new Error(`Maximum deposit amount is $${formatUSD(maxUsd)}`);
        }
      } else {
        if (rawAmount < MIN_DEPOSIT_IQD) {
          throw new Error(
            `${i18n.t('minimumDepositAmount') || 'Minimum deposit amount is'} ${formatIQD(MIN_DEPOSIT_IQD)} ${i18n.t('iqdShort') || 'IQD'}`
          );
        }

        if (rawAmount > MAX_DEPOSIT_IQD) {
          throw new Error(
            `${i18n.t('maximumDepositAmount') || 'Maximum deposit amount is'} ${formatIQD(MAX_DEPOSIT_IQD)} ${i18n.t('iqdShort') || 'IQD'}`
          );
        }
      }

      const finalAmountIQD = isUSDT ? Math.round(rawAmount * usdtRate) : rawAmount;
      const receiptUrl = await uploadReceiptToStorage(receiptImage);

      const extraNote = isUSDT
        ? `USDT TRC20 Deposit | USD: ${formatUSD(rawAmount)} | Rate: ${formatIQD(usdtRate)} IQD/USD | IQD: ${formatIQD(finalAmountIQD)}`
        : null;

      const finalNote = [note.trim(), extraNote].filter(Boolean).join(' | ') || null;

      const { error } = await supabase.from('deposit_orders').insert({
        user_id: user.id,
        amount: finalAmountIQD,
        currency: 'IQD',
        payment_method_id: selectedMethod.id,
        sender_name: senderName.trim(),
        sender_number: senderNumber.trim(),
        note: finalNote,
        receipt_image: receiptUrl,
        status: 'pending',
      });

      if (error) throw new Error(error.message || 'Failed to create deposit request');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit_orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });

      setAmount('');
      setSenderName('');
      setSenderNumber('');
      setNote('');
      setReceiptImage(null);
      setSelectedMethodId(null);

      Alert.alert(
        i18n.t('success') || 'Success',
        i18n.t('depositSuccessMessage') || 'Your deposit request has been sent successfully.'
      );
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error') || 'Error', error?.message || 'Failed to submit deposit');
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
          setAmount('');
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
                1 USD = {formatIQD(method.exchange_rate_iqd || DEFAULT_USDT_RATE_IQD)} IQD
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
                depositHistoryQuery.isRefetching ||
                walletQuery.isRefetching ||
                paymentMethodsQuery.isRefetching
              }
              onRefresh={() => {
                depositHistoryQuery.refetch();
                walletQuery.refetch();
                paymentMethodsQuery.refetch();
              }}
              tintColor={UI.blue}
              colors={[UI.blue]}
            />
          }
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.9}>
              <Ionicons
                name={isRTL ? 'chevron-forward' : 'chevron-back'}
                size={22}
                color={UI.blueDark}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{i18n.t('depositMoney') || 'Deposit Money'}</Text>

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
                  {i18n.t('accountBalance') || 'Account Balance'}
                </Text>
                <Text style={styles.heroSubSmall}>
                  {i18n.t('depositPageSubtitle') || 'Create a deposit request to add money'}
                </Text>
              </View>

              <View style={styles.heroIconWrap}>
                <Wallet2 size={22} color="#FFFFFF" />
              </View>
            </View>

            {walletQuery.isLoading ? (
              <View style={{ paddingTop: 20 }}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <View style={styles.heroBalanceRow}>
                <Text style={styles.heroBalance}>{displayedBalanceText}</Text>
                <Text style={styles.heroCurrency}>{i18n.t('iqdShort') || 'IQD'}</Text>
              </View>
            )}
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{i18n.t('depositMoney') || 'Deposit Money'}</Text>
              <Text style={styles.sectionSub}>
                {i18n.t('chooseDepositMethod') || 'Please choose payment method'}
              </Text>
            </View>

            <Text style={styles.label}>
              {i18n.t('selectPaymentMethod') || 'Select Payment Method'}
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
                        1 USD = {formatIQD(usdtRate)} IQD
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text style={[styles.selectorText, { color: UI.text3 }]}>
                  {i18n.t('choosePaymentMethod') || 'Choose payment method'}
                </Text>
              )}

              <ChevronDown size={20} color={UI.text2} />
            </TouchableOpacity>

            <Text style={styles.label}>{amountLabel}</Text>
            <View style={styles.amountWrap}>
              <TextInput
                style={styles.amountInput}
                placeholder={isUSDT ? '100' : (i18n.t('enterAmount') || 'Enter amount')}
                placeholderTextColor={UI.text3}
                value={amount}
                onChangeText={(text) =>
                  setAmount(isUSDT ? sanitizeUSDInput(text) : formatIQDInput(text))
                }
                keyboardType="decimal-pad"
              />
              <View style={styles.amountSuffix}>
                <Text style={styles.amountSuffixText}>{amountSuffixLabel}</Text>
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
                        1 USD = {formatIQD(usdtRate)} IQD
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rateResultRow}>
                    <Text style={styles.rateResultLabel}>Equivalent in IQD</Text>
                    <Text style={styles.rateResultValue}>
                      {formatIQD(convertedIQD)} IQD
                    </Text>
                  </View>
                </View>

                <View style={styles.limitBox}>
                  <Text style={styles.limitText}>
                    Minimum deposit amount: ${formatUSD(minUsd)}
                  </Text>
                  <Text style={styles.limitText}>
                    Maximum deposit amount: ${formatUSD(maxUsd)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.limitBox}>
                <Text style={styles.limitText}>
                  {(i18n.t('minimumDepositAmount') || 'Minimum deposit amount is') +
                    `: ${formatIQD(MIN_DEPOSIT_IQD)} ${i18n.t('iqdShort') || 'IQD'}`}
                </Text>
                <Text style={styles.limitText}>
                  {(i18n.t('maximumDepositAmount') || 'Maximum deposit amount is') +
                    `: ${formatIQD(MAX_DEPOSIT_IQD)} ${i18n.t('iqdShort') || 'IQD'}`}
                </Text>
              </View>
            )}

            {selectedMethod ? (
              <View style={styles.bankInfoCard}>
                <View style={styles.bankInfoTop}>
                  <View style={styles.bankInfoLogoWrap}>
                    {selectedMethod.logo_url ? (
                      <Image source={{ uri: selectedMethod.logo_url }} style={styles.bankInfoLogo} />
                    ) : (
                      <Landmark size={22} color={UI.blue} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankInfoName}>{selectedMethod.name}</Text>
                    {!!selectedMethod.account_name ? (
                      <Text style={styles.bankInfoSub}>{selectedMethod.account_name}</Text>
                    ) : null}
                  </View>
                </View>

                {!!selectedMethod.account_number ? (
                  <TouchableOpacity
                    style={styles.copyInfoCard}
                    activeOpacity={0.92}
                    onPress={() => copyText(selectedMethod.account_number || '')}
                  >
                    <View style={styles.copyInfoLeft}>
                      <Copy size={16} color={UI.blue} />
                      <Text style={styles.copyInfoLabel}>{accountNumberLabel}</Text>
                    </View>
                    <Text style={styles.copyInfoValue}>{selectedMethod.account_number}</Text>
                  </TouchableOpacity>
                ) : null}

                {!!selectedInstructions ? (
                  <View style={styles.instructionsBox}>
                    <Text style={styles.instructionsTitle}>{instructionsTitle}</Text>
                    <Text style={styles.instructionsText}>{selectedInstructions}</Text>
                  </View>
                ) : null}

                {!!selectedMethod.qr_image ? (
                  <View style={styles.qrSection}>
                    <View style={styles.qrTop}>
                      <QrCode size={18} color={UI.blue} />
                      <Text style={styles.qrTitle}>{i18n.t('qrCode') || 'QR Code'}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.qrWrap}
                      activeOpacity={0.92}
                      onPress={() => {
                        setViewerImage(selectedMethod.qr_image || null);
                        setShowImageViewer(true);
                      }}
                    >
                      <Image
                        source={{ uri: selectedMethod.qr_image }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {i18n.t('senderName') || 'Account Holder Name'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    i18n.t('enterSenderName') || 'Please enter your account holder name'
                  }
                  placeholderTextColor={UI.text3}
                  value={senderName}
                  onChangeText={setSenderName}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{senderNumberLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={senderNumberPlaceholder}
                  placeholderTextColor={UI.text3}
                  value={senderNumber}
                  onChangeText={setSenderNumber}
                  keyboardType="default"
                />
              </View>
            </View>

            <Text style={styles.label}>{i18n.t('transferNote') || 'Note (optional)'}</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder={i18n.t('writeAnyNote') || 'Write any note'}
              placeholderTextColor={UI.text3}
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>
              {i18n.t('transactionImage') || 'Transaction Image'}
            </Text>

            <TouchableOpacity style={styles.uploadCard} activeOpacity={0.92} onPress={pickReceiptImage}>
              {receiptImage ? (
                <>
                  <Image source={{ uri: receiptImage }} style={styles.uploadPreview} resizeMode="contain" />
                  <View style={styles.uploadOverlay}>
                    <Text style={styles.uploadOverlayText}>
                      {i18n.t('changeImage') || 'Change Image'}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.uploadEmpty}>
                  <View style={styles.uploadIconWrap}>
                    <ImageIcon size={22} color={UI.blue} />
                  </View>
                  <Text style={styles.uploadTitle}>
                    {i18n.t('uploadTransactionImage') || 'Upload transaction image'}
                  </Text>
                  <Text style={styles.uploadSub}>
                    {i18n.t('uploadTransactionImageHelp') ||
                      'Upload your payment screenshot for admin review'}
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
                <Eye size={18} color={UI.blue} />
                <Text style={styles.previewBigBtnText}>
                  {i18n.t('previewFullScreen') || 'Preview Full Screen'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButtonWrap,
                (submitMutation.isPending || walletQuery.isLoading) && { opacity: 0.7 },
              ]}
              onPress={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || walletQuery.isLoading}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={['#79B7FF', '#4C92F7', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                      {i18n.t('createDepositRequest') || 'Create Deposit Request'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.historyCardWrap}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>
                {i18n.t('depositHistory') || 'Deposit History'}
              </Text>
              <Text style={styles.historySub}>
                {i18n.t('trackYourRequests') ||
                  'Track your pending, approved, or rejected requests'}
              </Text>
            </View>

            {depositHistoryQuery.isLoading ? (
              <ActivityIndicator color={UI.blue} size="large" style={{ marginVertical: 18 }} />
            ) : depositHistoryQuery.error ? (
              <Text style={[styles.centerText, { color: UI.danger }]}>
                {(depositHistoryQuery.error as Error).message}
              </Text>
            ) : !depositHistoryQuery.data || depositHistoryQuery.data.length === 0 ? (
              <View style={styles.emptyBox}>
                <Receipt size={28} color={UI.text3} />
                <Text style={styles.emptyTitle}>
                  {i18n.t('noDepositsYet') || 'No deposits yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {i18n.t('depositHistoryEmptyDesc') || 'Your deposit requests will appear here'}
                </Text>
              </View>
            ) : (
              depositHistoryQuery.data.map((d) => {
                const status = getStatusMeta(d.status);

                return (
                  <View key={d.id} style={styles.historyItem}>
                    <View style={styles.historyTop}>
                      <View style={styles.historyMethodWrap}>
                        <View style={styles.historyMethodLogo}>
                          {d.payment_method?.logo_url ? (
                            <Image
                              source={{ uri: d.payment_method.logo_url }}
                              style={styles.historyMethodLogoImg}
                              resizeMode="cover"
                            />
                          ) : (
                            <Landmark size={18} color={UI.blue} />
                          )}
                        </View>
                        <View>
                          <Text style={styles.historyMethodName}>
                            {d.payment_method?.name ||
                              (i18n.t('paymentMethod') || 'Payment Method')}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(d.created_at).toLocaleDateString()}
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
                          {i18n.t('amount') || 'Amount'}
                        </Text>
                        <Text style={styles.historyMiniValue}>
                          {formatIQD(d.amount)} {d.currency || (i18n.t('iqdShort') || 'IQD')}
                        </Text>
                      </View>

                      <View style={styles.historyMiniCard}>
                        <Text style={styles.historyMiniLabel}>
                          {i18n.t('senderNumber') || 'Account Number'}
                        </Text>
                        <Text style={styles.historyMiniValue}>{d.sender_number || '-'}</Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>
                        {i18n.t('senderName') || 'Account Holder Name'}
                      </Text>
                      <Text style={styles.infoValue}>{d.sender_name || '-'}</Text>
                    </View>

                    {!!d.note ? (
                      <View style={styles.noteBoxHistory}>
                        <Text style={styles.noteTitleHistory}>{i18n.t('note') || 'Note'}</Text>
                        <Text style={styles.noteTextHistory}>{d.note}</Text>
                      </View>
                    ) : null}

                    {!!d.receipt_image ? (
                      <TouchableOpacity
                        style={styles.historyReceipt}
                        activeOpacity={0.92}
                        onPress={() => {
                          setViewerImage(d.receipt_image || null);
                          setShowImageViewer(true);
                        }}
                      >
                        <Image
                          source={{ uri: d.receipt_image }}
                          style={styles.historyReceiptImg}
                          resizeMode="contain"
                        />
                        <View style={styles.historyReceiptOverlay}>
                          <Eye size={18} color="#fff" />
                          <Text style={styles.historyReceiptOverlayText}>
                            {i18n.t('viewReceipt') || 'View Image'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {String(d.status || '').toLowerCase() === 'rejected' && !!d.reject_reason ? (
                      <View style={styles.rejectBox}>
                        <Text style={styles.rejectLabel}>{i18n.t('reason') || 'Reason'}:</Text>
                        <Text style={styles.rejectText}>{d.reject_reason}</Text>
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
                  {i18n.t('selectPaymentMethod') || 'Select Payment Method'}
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
                      {i18n.t('noPaymentMethods') || 'No payment methods'}
                    </Text>
                    <Text style={styles.emptySub}>
                      {i18n.t('noPaymentMethodsDesc') ||
                        'Admin has not added any payment methods yet'}
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
  heroSubSmall: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 13,
    fontWeight: '700',
  },
  heroBalanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  heroBalance: {
    color: '#FFFFFF',
    fontSize: 39,
    lineHeight: 42,
    fontWeight: '900',
  },
  heroCurrency: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
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
  sectionSub: {
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

  bankInfoCard: {
    marginBottom: 14,
    backgroundColor: '#F7FBFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    ...SHADOWS.soft,
  },
  bankInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bankInfoLogoWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: UI.border,
  },
  bankInfoLogo: {
    width: '100%',
    height: '100%',
  },
  bankInfoName: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
  },
  bankInfoSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
  },

  copyInfoCard: {
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  copyInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  copyInfoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.text2,
  },
  copyInfoValue: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },

  instructionsBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.blue,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: UI.text,
  },

  qrSection: {
    marginTop: 2,
  },
  qrTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
  },
  qrWrap: {
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#fff',
    padding: 10,
  },
  qrImage: {
    width: 220,
    height: 220,
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
    backgroundColor: '#F8FAFC',
  },
  historyReceiptImg: {
    width: '100%',
    height: 220,
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
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
} from 'lucide-react-native';
import { decode } from 'base64-arraybuffer';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

const RECEIPT_BUCKET = 'withdraw-receipts';
const MIN_WITHDRAW_IQD = 1000;
const MAX_WITHDRAW_IQD = 1000000;

const UI = {
  bg: '#F4F7FB',
  card: '#FFFFFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#E2E8F0',

  green: '#0EA772',
  green2: '#10B981',
  greenSoft: '#E9FBF4',

  blue: '#2563EB',
  blueSoft: '#EAF2FF',

  purple: '#7C3AED',
  purple2: '#8B5CF6',
  purple3: '#A78BFA',
  purpleSoft: '#F3E8FF',

  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  dark: '#0B1220',
  shadow: 'rgba(15, 23, 42, 0.08)',
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

function formatIQD(value: number | string | null | undefined) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('de-DE');
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

function getStatusMeta(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'approved':
      return {
        bg: UI.greenSoft,
        text: UI.green,
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

export default function WithdrawScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { theme } = useTheme();

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
    queryKey: ['payment_methods', 'withdraw'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select(
          'id, name, account_name, account_number, instructions, qr_image, logo_url, is_active, sort_order, method_type'
        )
        .eq('is_active', true)
        .eq('method_type', 'withdraw')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message || 'Failed to fetch payment methods');
      return (data || []) as PaymentMethod[];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const withdrawHistoryQuery = useQuery({
    queryKey: ['withdraw_orders', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not found');

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

      if (error) throw new Error(error.message || 'Failed to fetch withdrawal history');
      return (data || []) as WithdrawOrderItem[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const selectedMethod = useMemo(() => {
    return paymentMethodsQuery.data?.find((m) => m.id === selectedMethodId) || null;
  }, [paymentMethodsQuery.data, selectedMethodId]);

  const balanceText = formatIQD(walletQuery.data?.balance || 0);

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
      .from(RECEIPT_BUCKET)
      .upload(fileName, decode(base64), {
        contentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message || 'Failed to upload image');

    const { data } = supabase.storage.from(RECEIPT_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User ID not found');
      if (!selectedMethod) {
        throw new Error(i18n.t('selectPaymentMethod') || 'Select payment method');
      }
      if (!amount.trim()) {
        throw new Error(i18n.t('enterAmount') || 'Enter amount');
      }
      if (!senderName.trim()) {
        throw new Error(i18n.t('enterReceiveName') || 'Please enter receiver name');
      }
      if (!senderNumber.trim()) {
        throw new Error(i18n.t('enterReceiveNumber') || 'Please enter receiver number');
      }

      const amountNum = parseIQDInput(amount);

      if (Number.isNaN(amountNum) || amountNum <= 0) {
        throw new Error(i18n.t('invalidAmount') || 'Invalid amount');
      }

      if (amountNum < MIN_WITHDRAW_IQD) {
        throw new Error(
          `${i18n.t('minimumWithdrawAmount') || 'Minimum withdraw amount is'} ${formatIQD(MIN_WITHDRAW_IQD)} ${i18n.t('iqdShort') || 'IQD'}`
        );
      }

      if (amountNum > MAX_WITHDRAW_IQD) {
        throw new Error(
          `${i18n.t('maximumWithdrawAmount') || 'Maximum withdraw amount is'} ${formatIQD(MAX_WITHDRAW_IQD)} ${i18n.t('iqdShort') || 'IQD'}`
        );
      }

      if (!walletQuery.data) {
        throw new Error(i18n.t('walletNotFound') || 'Wallet not found');
      }

      if (walletQuery.data.is_locked) {
        throw new Error(
          `${i18n.t('security') || 'Security'}: ${i18n.t('contactSupport') || 'Contact support'}`
        );
      }

      if (amountNum > Number(walletQuery.data.balance || 0)) {
        throw new Error(
          `${i18n.t('insufficientBalance') || 'Insufficient balance'}\n${formatIQD(walletQuery.data.balance || 0)} ${i18n.t('iqdShort') || 'IQD'}`
        );
      }

      const receiptUrl = receiptImage
        ? await uploadReceiptToStorage(receiptImage)
        : null;

      const { error } = await supabase.from('withdraw_orders').insert({
        user_id: user.id,
        amount: amountNum,
        currency: 'IQD',
        payment_method_id: selectedMethod.id,
        destination: senderNumber.trim(),
        sender_name: senderName.trim(),
        sender_number: senderNumber.trim(),
        note: note.trim() || null,
        receipt_image: receiptUrl,
        status: 'pending',
      });

      if (error) throw new Error(error.message || 'Failed to create withdraw request');
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
        i18n.t('success') || 'Success',
        i18n.t('withdrawSuccessMessage') || 'Your withdraw request has been sent successfully.'
      );
    },
    onError: (error: any) => {
      Alert.alert(
        i18n.t('error') || 'Error',
        error?.message || 'Failed to submit withdrawal request'
      );
    },
  });

  const renderMethodListItem = (method: PaymentMethod) => {
    const selected = selectedMethodId === method.id;

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
              <Landmark size={22} color={selected ? UI.green : UI.blue} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.methodName}>{method.name}</Text>
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
              tintColor={UI.purple}
              colors={[UI.purple]}
            />
          }
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={22} color={UI.text} />
              <Text style={styles.headerBack}>{i18n.t('back') || 'Back'}</Text>
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>{i18n.t('withdraw') || 'Withdraw'}</Text>
            </View>

            <View style={styles.headerRightSpace} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.balanceTopRow}>
              <View>
                <Text style={styles.balanceTitle}>
                  {i18n.t('accountBalance') || 'Account Balance'}
                </Text>
                <Text style={styles.balanceSub}>
                  {i18n.t('createWithdrawRequestSub') || 'Create a withdraw request to send money'}
                </Text>
              </View>

              <View style={styles.currencyChip}>
                <Wallet2 size={16} color="#fff" />
                <Text style={styles.currencyChipText}>{i18n.t('iqdShort') || 'IQD'}</Text>
              </View>
            </View>

            {walletQuery.isLoading ? (
              <View style={{ paddingTop: 20 }}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : walletQuery.isError ? (
              <View style={styles.balanceErrorRow}>
                <Ionicons name="alert-circle" size={22} color="#fff" />
                <Text style={styles.balanceErrorText}>
                  {i18n.t('failedToLoadBalance') || 'Failed to load balance'}
                </Text>
              </View>
            ) : (
              <View style={styles.balanceValueWrap}>
                <Text style={styles.balanceValue}>{balanceText}</Text>
                <Text style={styles.balanceCurrencyBig}>{i18n.t('iqdShort') || 'IQD'}</Text>
              </View>
            )}
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionTitle}>
                  {i18n.t('withdrawRequest') || 'Withdraw Request'}
                </Text>
                <Text style={styles.sectionSub}>
                  {i18n.t('fillWithdrawForm') ||
                    'Choose payment method and enter your transfer details'}
                </Text>
              </View>
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
                      <Landmark size={18} color={UI.green} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectorText}>{selectedMethod.name}</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.selectorText, { color: UI.text3 }]}>
                  {i18n.t('choosePaymentMethod') || 'Choose payment method'}
                </Text>
              )}

              <ChevronDown size={20} color={UI.text2} />
            </TouchableOpacity>

            <Text style={styles.label}>
              {i18n.t('withdrawalAmount') || 'Withdrawal Amount'}
            </Text>
            <View style={styles.amountWrap}>
              <TextInput
                style={styles.amountInput}
                placeholder={i18n.t('enterAmount') || 'Enter amount'}
                placeholderTextColor={UI.text3}
                value={amount}
                onChangeText={(text) => {
                  setAmount(formatIQDInput(text));
                }}
                keyboardType="number-pad"
              />
              <View style={styles.amountSuffix}>
                <Text style={styles.amountSuffixText}>{i18n.t('iqdShort') || 'IQD'}</Text>
              </View>
            </View>

            <View style={styles.limitBox}>
              <Text style={styles.limitText}>
                {(i18n.t('minimumWithdrawAmount') || 'Minimum withdraw amount') +
                  `: ${formatIQD(MIN_WITHDRAW_IQD)} ${i18n.t('iqdShort') || 'IQD'}`}
              </Text>
              <Text style={styles.limitText}>
                {(i18n.t('maximumWithdrawAmount') || 'Maximum withdraw amount') +
                  `: ${formatIQD(MAX_WITHDRAW_IQD)} ${i18n.t('iqdShort') || 'IQD'}`}
              </Text>
            </View>

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {i18n.t('receiveName') || 'Receive Name'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t('enterReceiveName') || 'Enter receive name'}
                  placeholderTextColor={UI.text3}
                  value={senderName}
                  onChangeText={setSenderName}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {i18n.t('receiveNumber') || 'Receive Number'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t('enterReceiveNumber') || 'Enter receive number'}
                  placeholderTextColor={UI.text3}
                  value={senderNumber}
                  onChangeText={setSenderNumber}
                  keyboardType="phone-pad"
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
              {i18n.t('uploadQrCodeTitle') || 'Upload QR Code (optional)'}
            </Text>
            <TouchableOpacity
              style={styles.uploadCard}
              activeOpacity={0.92}
              onPress={pickReceiptImage}
            >
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
                    <ImageIcon size={22} color={UI.green} />
                  </View>
                  <Text style={styles.uploadTitle}>
                    {i18n.t('uploadQrCode') || 'Upload your QR code Payment'}
                  </Text>
                  <Text style={styles.uploadSub}>
                    {i18n.t('uploadQrCodeHelp') || 'Enter your account QR code here'}
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
                  {i18n.t('previewFullScreen') || 'Preview Full Screen'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (withdrawMutation.isPending || walletQuery.isLoading) && { opacity: 0.7 },
              ]}
              onPress={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending || walletQuery.isLoading}
              activeOpacity={0.92}
            >
              {withdrawMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {i18n.t('submitWithdrawRequest') || 'Submit Withdraw Request'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.historyCardWrap}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>
                  {i18n.t('withdrawHistory') || 'Withdraw History'}
                </Text>
                <Text style={styles.historySub}>
                  {i18n.t('trackYourRequests') ||
                    'Track your pending, approved, or rejected requests'}
                </Text>
              </View>
            </View>

            {withdrawHistoryQuery.isLoading ? (
              <ActivityIndicator color={UI.green} size="large" style={{ marginVertical: 18 }} />
            ) : withdrawHistoryQuery.error ? (
              <Text style={[styles.centerText, { color: UI.danger }]}>
                {(withdrawHistoryQuery.error as Error).message}
              </Text>
            ) : !withdrawHistoryQuery.data || withdrawHistoryQuery.data.length === 0 ? (
              <View style={styles.emptyBox}>
                <Receipt size={28} color={UI.text3} />
                <Text style={styles.emptyTitle}>
                  {i18n.t('noWithdrawalsYet') || 'No withdrawals yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {i18n.t('withdrawHistoryEmptyDesc') ||
                    'Your withdraw requests will appear here'}
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
                              (i18n.t('paymentMethod') || 'Payment Method')}
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
                          {i18n.t('amount') || 'Amount'}
                        </Text>
                        <Text style={styles.historyMiniValue}>
                          {formatIQD(w.amount)} {i18n.t('iqdShort') || 'IQD'}
                        </Text>
                      </View>

                      <View style={styles.historyMiniCard}>
                        <Text style={styles.historyMiniLabel}>
                          {i18n.t('receiveNumber') || 'Receive Number'}
                        </Text>
                        <Text style={styles.historyMiniValue}>{w.sender_number || '-'}</Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>
                        {i18n.t('receiveName') || 'Receive Name'}
                      </Text>
                      <Text style={styles.infoValue}>{w.sender_name || '-'}</Text>
                    </View>

                    {!!w.note ? (
                      <View style={styles.noteBoxHistory}>
                        <Text style={styles.noteTitleHistory}>
                          {i18n.t('note') || 'Note'}
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
                            {i18n.t('viewReceipt') || 'View Image'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {String(w.status || '').toLowerCase() === 'rejected' && !!w.reject_reason ? (
                      <View style={styles.rejectBox}>
                        <Text style={styles.rejectLabel}>
                          {i18n.t('reason') || 'Reason'}:
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
                  <ActivityIndicator color={UI.green} style={{ marginVertical: 20 }} />
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
    padding: 16,
    paddingTop: 6,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    position: 'relative',
    minHeight: 44,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 90,
    zIndex: 2,
  },
  headerBack: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.text,
  },
  headerTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
  },
  headerRightSpace: {
    width: 90,
    marginLeft: 'auto',
  },

  heroCard: {
    borderRadius: 30,
    padding: 20,
    backgroundColor: UI.purple,
    overflow: 'hidden',
    shadowColor: UI.purple,
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -70,
    right: -70,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -120,
    left: -90,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  balanceTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  balanceSub: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  currencyChipText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  balanceValueWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 26,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '900',
  },
  balanceCurrencyBig: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  balanceErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  balanceErrorText: {
    color: '#fff',
    fontWeight: '800',
  },

  formCard: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: UI.card,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: UI.greenSoft,
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
  },
  methodListItemActive: {
    borderColor: UI.green,
    backgroundColor: '#F5FFFA',
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
    backgroundColor: UI.greenSoft,
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
    borderColor: UI.green,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: UI.green,
  },

  amountWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 10,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: UI.greenSoft,
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
    color: UI.green,
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: UI.text,
    marginBottom: 14,
  },
  noteInput: {
    minHeight: 96,
  },

  uploadCard: {
    height: 220,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B7E4D3',
    backgroundColor: '#F7FFFB',
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
    backgroundColor: UI.greenSoft,
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
  backgroundColor: '#F8FAFC', // 👈 ئەمە زیاد بکە
},
  uploadOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(15,23,42,0.65)',
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

  primaryButton: {
    backgroundColor: UI.green,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    shadowColor: UI.green,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
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
    backgroundColor: 'rgba(15,23,42,0.65)',
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

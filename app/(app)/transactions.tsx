import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  I18nManager,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Stack, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const UI = {
  bg: '#F4F8FC',
  page: '#EDF3F8',
  card: '#FFFFFF',
  soft: '#F8FBFF',
  text: '#1E2A4A',
  text2: '#6F7A96',
  text3: '#94A3B8',
  border: '#DCE7F2',
  primary: '#4F7CFF',
  primaryDark: '#315EE8',
  primarySoft: '#E9F0FF',
  green: '#27D69B',
  greenSoft: '#EAFBF5',
  red: '#FF4D7E',
  redSoft: '#FFEAF1',
  amber: '#F59E0B',
  amberSoft: '#FFF4D9',
  blue: '#2563EB',
  blueSoft: '#EAF1FF',
  purple: '#7C3AED',
  purpleSoft: '#F3E8FF',
};

interface TransactionData {
  id: string;
  user_id?: string | null;
  sender_id?: string | null;
  receiver_id?: string | null;

  type: string;
  direction?: string | null;
  status: string;
  amount: number;
  amount_iqd?: number | null;
  fee_amount?: number | null;
  balance_before?: number | null;
  balance_after?: number | null;
  description?: string | null;

  reference_id?: string | null;
  source_table?: string | null;
  source_order_id?: string | null;
  source_product_id?: string | null;

  display_title?: string | null;
  display_subtitle?: string | null;
  display_image_url?: string | null;
  pin_code?: string | null;
  provider_name?: string | null;
  payment_method_name?: string | null;

  sender_full_name?: string | null;
  sender_email?: string | null;
  sender_avatar_url?: string | null;
  sender_city?: string | null;

  receiver_full_name?: string | null;
  receiver_email?: string | null;
  receiver_avatar_url?: string | null;
  receiver_city?: string | null;

  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at?: string | null;
}

type TxUi = {
  title: string;
  subtitleLine1: string;
  subtitleLine2?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isOutgoing: boolean;
  verified: boolean;

  displayName: string;
  displaySecondary?: string;
  displayEmail?: string;
  displayCity?: string;
  displayAvatar?: string | null;
  displayImage?: string | null;

  transactionTypeLabel: string;
  note?: string;

  detailImage?: string | null;
  detailBrand?: string | null;
  detailModel?: string | null;
  detailStorage?: string | null;
  detailRam?: string | null;
  detailColor?: string | null;
  detailPurchaseMode?: string | null;
  detailMonthsCount?: number | null;
  detailMonthlyPrice?: number | null;
  detailPaidNow?: number | null;
  detailRemaining?: number | null;
  detailContractTotal?: number | null;
  detailCashTotal?: number | null;
  detailQuantity?: number | null;
  detailOrderId?: string | null;
  detailDescription?: string | null;
  detailTitleOverride?: string | null;

  kind:
    | 'send'
    | 'receive'
    | 'deposit'
    | 'withdraw'
    | 'purchase'
    | 'virtual_card'
    | 'topup'
    | 'giftcard'
    | 'mobile'
    | 'mobile_refund'
    | 'sim'
    | 'other';
};

const APP_SYSTEM_NAME = 'Zenopay';
const APP_SYSTEM_ICON: keyof typeof Ionicons.glyphMap = 'shield-checkmark-outline';

const safe = (v?: string | null) => (v && String(v).trim().length ? String(v).trim() : null);

const tOr = (key: string, fallback: string) => {
  const v = i18n.t(key) as unknown as string;
  if (!v) return fallback;
  return v === key ? fallback : v;
};

const isArabicMoneyLang = () => {
  const lang = String(i18n.language || '').toLowerCase();
  return ['ar', 'cbk', 'kmr'].includes(lang);
};

const formatIQD = (value: number | null | undefined) => {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  const formatted = abs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isArabicMoneyLang() ? `${formatted} د.غ` : `${formatted} IQD`;
};

const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatListDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const statusLabel = (raw: string) => {
  const s = String(raw || 'completed').toLowerCase();
  if (['completed', 'success', 'paid', 'approved'].includes(s)) return 'completed';
  if (['pending', 'processing'].includes(s)) return 'pending';
  if (['failed', 'rejected', 'cancelled', 'canceled', 'refunded'].includes(s)) return s === 'refunded' ? 'refunded' : 'failed';
  return s;
};

const makeShortTransactionId = (id?: string | null) => {
  const base = String(id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  if (!base) return 'TX000001';
  if (base.length >= 8) return base.slice(0, 8);
  return `${base}${'X'.repeat(8 - base.length)}`.slice(0, 8);
};

const getStatusColors = (raw: string) => {
  const s = String(raw || 'completed').toLowerCase();
  if (['completed', 'success', 'paid', 'approved'].includes(s)) {
    return { bg: UI.greenSoft, color: UI.green };
  }
  if (['pending', 'processing'].includes(s)) {
    return { bg: UI.amberSoft, color: UI.amber };
  }
  if (['refunded'].includes(s)) {
    return { bg: UI.blueSoft, color: UI.blue };
  }
  return { bg: UI.redSoft, color: UI.red };
};

const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const upperFirst = (v?: string | null) => {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  useTheme();

  const myId = user?.id || '';
  const isRTL = I18nManager.isRTL;

  const [searchText, setSearchText] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransactionData | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const transactionsQuery = useQuery({
    queryKey: ['transactions-rich-final', myId],
    enabled: !!myId,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      if (!myId) throw new Error('User ID not found');

      const q = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          sender_id,
          receiver_id,
          type,
          direction,
          status,
          amount,
          amount_iqd,
          fee_amount,
          balance_before,
          balance_after,
          description,
          reference_id,
          source_table,
          source_order_id,
          source_product_id,
          display_title,
          display_subtitle,
          display_image_url,
          pin_code,
          provider_name,
          payment_method_name,
          sender_full_name,
          sender_email,
          sender_avatar_url,
          sender_city,
          receiver_full_name,
          receiver_email,
          receiver_avatar_url,
          receiver_city,
          metadata,
          created_at,
          updated_at
        `)
        .or(`user_id.eq.${myId},sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false });

      if (q.error) {
        console.log('transactions fetch error', q.error);
        throw new Error('Failed to fetch transactions');
      }

      return (q.data || []) as TransactionData[];
    },
  });

  const getTxUi = useCallback(
    (tx: TransactionData): TxUi => {
      const type = String(tx.type || '').toLowerCase();
      const desc = safe(tx.description);
      const meta = tx.metadata || {};

      const senderLabel =
        safe(tx.sender_full_name) ||
        safe(tx.sender_email) ||
        tOr('transactions_unknownUser', 'Unknown user');

      const receiverLabel =
        safe(tx.receiver_full_name) ||
        safe(tx.receiver_email) ||
        tOr('transactions_unknownUser', 'Unknown user');

      const isOutgoingBySender = tx.sender_id === myId;
      const isOutgoingByAmount = Number(tx.amount || 0) < 0 || String(tx.direction || '').toLowerCase() === 'out';
      const displayTitle = safe(tx.display_title);
      const displaySubtitle = safe(tx.display_subtitle);
      const displayImage = safe(tx.display_image_url);
      const pinCode = safe(tx.pin_code);
      const providerName = safe(tx.provider_name);
      const paymentMethodName = safe(tx.payment_method_name);

      const metaProductName =
        safe(meta.product_name) ||
        safe(meta.mobile_name) ||
        safe(meta.name);

      const metaProductBrand =
        safe(meta.product_brand) ||
        safe(meta.brand);

      const metaImage =
        safe(meta.product_image_url) ||
        safe(meta.image_url) ||
        safe(meta.image);

      const metaStorage = safe(meta.storage);
      const metaRam = safe(meta.ram);
      const metaColor = safe(meta.color);
      const metaPurchaseMode = safe(meta.purchase_mode);
      const metaMonthsCount = toNum(meta.months_count, 0);
      const metaMonthlyPrice = toNum(meta.unit_monthly_price_iqd, 0);
      const metaPaidNow =
        toNum(meta.paid_amount_iqd, NaN) ||
        toNum(meta.refund_amount_iqd, NaN) ||
        toNum(tx.amount_iqd, NaN) ||
        toNum(tx.amount, 0);
      const metaRemaining = toNum(meta.remaining_amount_iqd, 0);
      const metaContractTotal = toNum(meta.installment_total_contract_iqd, 0);
      const metaCashTotal = toNum(meta.cash_total_price_iqd, 0);
      const metaQuantity = toNum(meta.quantity, 1);
      const metaDescription = safe(meta.description_snapshot) || desc;
      const metaOrderId = safe(meta.order_id) || safe(tx.reference_id);

      if (type === 'send' || type === 'receive' || type === 'transfer' || type === 'p2p') {
        const isOutgoing = isOutgoingBySender || isOutgoingByAmount;

        if (isOutgoing) {
          return {
            title: tOr('transactions_moneySent', 'Money Sent'),
            subtitleLine1: receiverLabel,
            subtitleLine2: safe(tx.receiver_email) || makeShortTransactionId(tx.id),
            iconName: 'arrow-up-outline',
            isOutgoing: true,
            verified: false,
            displayName: receiverLabel,
            displaySecondary: undefined,
            displayEmail: safe(tx.receiver_email) || undefined,
            displayCity: safe(tx.receiver_city) || undefined,
            displayAvatar: safe(tx.receiver_avatar_url) || null,
            displayImage: null,
            transactionTypeLabel: tOr('transactions_typeP2PTransfer', 'P2P Transfer'),
            note: desc || `${tOr('transactions_moneySentTo', 'Money sent to')} ${receiverLabel}`,
            kind: 'send',
          };
        }

        return {
          title: tOr('transactions_youReceivedMoney', 'You Received Money'),
          subtitleLine1: senderLabel,
          subtitleLine2: safe(tx.sender_email) || makeShortTransactionId(tx.id),
          iconName: 'arrow-down-outline',
          isOutgoing: false,
          verified: false,
          displayName: senderLabel,
          displaySecondary: undefined,
          displayEmail: safe(tx.sender_email) || undefined,
          displayCity: safe(tx.sender_city) || undefined,
          displayAvatar: safe(tx.sender_avatar_url) || null,
          displayImage: null,
          transactionTypeLabel: tOr('transactions_typeP2PTransfer', 'P2P Transfer'),
          note: desc || `${tOr('transactions_moneyReceivedFrom', 'Money received from')} ${senderLabel}`,
          kind: 'receive',
        };
      }

      if (type === 'deposit' || type === 'admin_add' || type === 'agent_add') {
        const name = paymentMethodName ? `${APP_SYSTEM_NAME}` : APP_SYSTEM_NAME;

        return {
          title: tOr('transactions_youReceivedMoney', 'You Received Money'),
          subtitleLine1: paymentMethodName
            ? `${tOr('transactions_depositFrom', 'Deposit from')} ${paymentMethodName}`
            : tOr('transactions_depositFromZenopay', 'Deposit from Zenopay'),
          subtitleLine2: makeShortTransactionId(tx.id),
          iconName: 'download-outline',
          isOutgoing: false,
          verified: true,
          displayName: name,
          displaySecondary: paymentMethodName || undefined,
          displayEmail: undefined,
          displayCity: undefined,
          displayAvatar: null,
          displayImage: null,
          transactionTypeLabel: tOr('transactions_typeDeposit', 'Deposit'),
          note: desc || tOr('transactions_depositFromZenopay', 'Deposit from Zenopay'),
          kind: 'deposit',
        };
      }

      if (type === 'withdraw' || type === 'admin_withdraw' || type === 'agent_withdraw') {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: paymentMethodName
            ? `${tOr('transactions_withdrawTo', 'Withdraw to')} ${paymentMethodName}`
            : tOr('transactions_withdrawToZenopay', 'Withdraw to Zenopay'),
          subtitleLine2: makeShortTransactionId(tx.id),
          iconName: 'cash-outline',
          isOutgoing: true,
          verified: true,
          displayName: APP_SYSTEM_NAME,
          displaySecondary: paymentMethodName || undefined,
          displayEmail: undefined,
          displayCity: undefined,
          displayAvatar: null,
          displayImage: null,
          transactionTypeLabel: tOr('transactions_typeWithdraw', 'Withdraw'),
          note: desc || tOr('transactions_noteWithdraw', 'Withdraw processed by Zenopay'),
          kind: 'withdraw',
        };
      }

      if (
        type === 'mobile_purchase' ||
        type === 'purchase_mobile' ||
        type === 'mobile_shop_purchase'
      ) {
        const modelName = metaProductName || displayTitle || tOr('transactions_mobileShopPurchase', 'Mobile Shop Purchase');
        const purchaseModeLabel =
          metaPurchaseMode === 'installment'
            ? tOr('transactions_installment', 'Installment')
            : tOr('transactions_cash', 'Cash');

        const subtitleParts = [
          metaProductBrand ? upperFirst(metaProductBrand) : null,
          metaPurchaseMode ? purchaseModeLabel : null,
        ].filter(Boolean);

        return {
          title: tOr('transactions_purchaseProduct', 'Purchase Product'),
          subtitleLine1: modelName,
          subtitleLine2: subtitleParts.join(' • ') || displaySubtitle || makeShortTransactionId(tx.id),
          iconName: 'phone-portrait-outline',
          isOutgoing: true,
          verified: false,
          displayName: modelName,
          displaySecondary: subtitleParts.join(' • ') || displaySubtitle || undefined,
          displayEmail: undefined,
          displayCity: undefined,
          displayAvatar: null,
          displayImage: metaImage || displayImage || null,
          detailImage: metaImage || displayImage || null,
          detailBrand: metaProductBrand || null,
          detailModel: modelName,
          detailStorage: metaStorage || null,
          detailRam: metaRam || null,
          detailColor: metaColor || null,
          detailPurchaseMode: metaPurchaseMode || 'cash',
          detailMonthsCount: metaMonthsCount || null,
          detailMonthlyPrice: metaMonthlyPrice || null,
          detailPaidNow: metaPaidNow || Math.abs(Number(tx.amount || 0)),
          detailRemaining: metaRemaining || 0,
          detailContractTotal: metaContractTotal || null,
          detailCashTotal: metaCashTotal || null,
          detailQuantity: metaQuantity || 1,
          detailOrderId: metaOrderId || null,
          detailDescription: metaDescription || null,
          detailTitleOverride: tOr('transactions_typeMobileShop', 'Mobile Shop'),
          transactionTypeLabel: tOr('transactions_typeMobileShop', 'Mobile Shop'),
          note:
            desc ||
            `${modelName}${metaPurchaseMode ? ` • ${purchaseModeLabel}` : ''}`,
          kind: 'mobile',
        };
      }

      if (type === 'mobile_refund') {
        const modelName = metaProductName || displayTitle || tOr('transactions_mobileOrderRefund', 'Mobile Order Refund');
        const purchaseModeLabel =
          metaPurchaseMode === 'installment'
            ? tOr('transactions_installment', 'Installment')
            : tOr('transactions_cash', 'Cash');

        const subtitleParts = [
          tOr('transactions_refund', 'Refund'),
          metaProductBrand ? upperFirst(metaProductBrand) : null,
          metaPurchaseMode ? purchaseModeLabel : null,
        ].filter(Boolean);

        return {
          title: tOr('transactions_youReceivedMoney', 'You Received Money'),
          subtitleLine1: modelName,
          subtitleLine2: subtitleParts.join(' • ') || makeShortTransactionId(tx.id),
          iconName: 'refresh-outline',
          isOutgoing: false,
          verified: true,
          displayName: modelName,
          displaySecondary: subtitleParts.join(' • '),
          displayEmail: undefined,
          displayCity: undefined,
          displayAvatar: null,
          displayImage: metaImage || displayImage || null,
          detailImage: metaImage || displayImage || null,
          detailBrand: metaProductBrand || null,
          detailModel: modelName,
          detailStorage: metaStorage || null,
          detailRam: metaRam || null,
          detailColor: metaColor || null,
          detailPurchaseMode: metaPurchaseMode || null,
          detailMonthsCount: metaMonthsCount || null,
          detailMonthlyPrice: metaMonthlyPrice || null,
          detailPaidNow: toNum(meta.refund_amount_iqd, 0) || Math.abs(Number(tx.amount || 0)),
          detailRemaining: 0,
          detailContractTotal: metaContractTotal || null,
          detailCashTotal: metaCashTotal || null,
          detailQuantity: metaQuantity || 1,
          detailOrderId: metaOrderId || null,
          detailDescription: metaDescription || null,
          detailTitleOverride: tOr('transactions_typeMobileRefund', 'Mobile Refund'),
          transactionTypeLabel: tOr('transactions_typeMobileRefund', 'Mobile Refund'),
          note: desc || tOr('transactions_noteMobileRefund', 'Paid amount refunded to your wallet'),
          kind: 'mobile_refund',
        };
      }

      if (
        type === 'purchase_card' ||
        type === 'sim_card_purchase' ||
        type === 'purchase_sim' ||
        type === 'topup_purchase' ||
        type === 'card_topup'
      ) {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: displayTitle || providerName || tOr('transactions_simCardPurchase', 'Top-Up Card Purchase'),
          subtitleLine2: displaySubtitle || makeShortTransactionId(tx.id),
          iconName: 'cellular-outline',
          isOutgoing: true,
          verified: false,
          displayName: displayTitle || providerName || tOr('transactions_simCardPurchase', 'Top-Up Card Purchase'),
          displaySecondary: pinCode ? `PIN: ${pinCode}` : displaySubtitle || undefined,
          displayEmail: undefined,
          displayCity: undefined,
          displayAvatar: null,
          displayImage: displayImage || null,
          transactionTypeLabel: tOr('transactions_typeSimCard', 'Top-Up Card'),
          note: desc || displayTitle || providerName || tOr('transactions_noteSimCard', 'Card purchased successfully'),
          kind: 'sim',
        };
      }

      if (type === 'gift_card_purchase' || type === 'purchase_giftcard') {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: displayTitle || tOr('transactions_giftCardPurchase', 'Gift Card Purchase'),
          subtitleLine2: displaySubtitle || makeShortTransactionId(tx.id),
          iconName: 'gift-outline',
          isOutgoing: true,
          verified: false,
          displayName: displayTitle || tOr('transactions_giftCardPurchase', 'Gift Card Purchase'),
          displaySecondary: pinCode ? `PIN: ${pinCode}` : displaySubtitle || undefined,
          displayEmail: undefined,
          displayCity: undefined,
          displayAvatar: null,
          displayImage: displayImage || null,
          transactionTypeLabel: tOr('transactions_typeGiftCard', 'Gift Card'),
          note: desc || displayTitle || tOr('transactions_noteGiftCard', 'Gift card purchased successfully'),
          kind: 'giftcard',
        };
      }

      if (type === 'virtual_card_create' || type === 'create_virtual_card') {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: tOr('transactions_virtualCardCreated', 'Virtual Card Created'),
          subtitleLine2: makeShortTransactionId(tx.id),
          iconName: 'card-outline',
          isOutgoing: true,
          verified: false,
          displayName: tOr('transactions_virtualCardCreated', 'Virtual Card Created'),
          displaySecondary: undefined,
          displayEmail: undefined,
          displayCity: undefined,
          displayAvatar: null,
          displayImage: null,
          transactionTypeLabel: tOr('transactions_typeVirtualCard', 'Virtual Card'),
          note: desc || tOr('transactions_noteVirtualCard', 'Virtual card created successfully'),
          kind: 'virtual_card',
        };
      }

      return {
        title: Number(tx.amount || 0) < 0
          ? tOr('transactions_moneySent', 'Money Sent')
          : tOr('transactions_youReceivedMoney', 'You Received Money'),
        subtitleLine1: displayTitle || desc || tOr('transactions_purchase', 'Purchase'),
        subtitleLine2: displaySubtitle || makeShortTransactionId(tx.id),
        iconName: 'pricetag-outline',
        isOutgoing: Number(tx.amount || 0) < 0,
        verified: false,
        displayName: displayTitle || desc || tOr('transactions_purchase', 'Purchase'),
        displaySecondary: displaySubtitle || undefined,
        displayEmail: undefined,
        displayCity: undefined,
        displayAvatar: null,
        displayImage: displayImage || null,
        transactionTypeLabel: tOr('transactions_typePurchase', 'Purchase'),
        note: desc || tOr('transactions_notePurchase', 'Purchase completed'),
        kind: 'purchase',
      };
    },
    [myId]
  );

  const filteredTransactions = useMemo(() => {
    const all = transactionsQuery.data || [];
    const q = searchText.trim().toLowerCase();
    if (!q) return all;

    return all.filter((tx) => {
      const ui = getTxUi(tx);
      const shortId = makeShortTransactionId(tx.id).toLowerCase();
      const meta = tx.metadata || {};

      const bucket = [
        tx.id,
        tx.type,
        tx.status,
        tx.description,
        tx.display_title,
        tx.display_subtitle,
        tx.pin_code,
        tx.provider_name,
        tx.payment_method_name,
        tx.sender_full_name,
        tx.sender_email,
        tx.receiver_full_name,
        tx.receiver_email,
        ui.title,
        ui.subtitleLine1,
        ui.subtitleLine2,
        ui.displayName,
        ui.displaySecondary,
        ui.displayEmail,
        ui.detailBrand,
        ui.detailModel,
        ui.detailStorage,
        ui.detailRam,
        ui.detailColor,
        ui.detailPurchaseMode,
        meta.product_name,
        meta.product_brand,
        meta.storage,
        meta.ram,
        meta.color,
        meta.purchase_mode,
        shortId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return bucket.includes(q);
    });
  }, [transactionsQuery.data, searchText, getTxUi]);

  const { refetch, isRefetching } = transactionsQuery;

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const selectedUi = useMemo(() => {
    if (!selectedTx) return null;
    return getTxUi(selectedTx);
  }, [selectedTx, getTxUi]);

  const buildTransactionHtml = useCallback(
    (tx: TransactionData) => {
      const ui = getTxUi(tx);
      const amount = Math.abs(Number(tx.amount || 0));
      const fee = Number(tx.fee_amount || 0);
      const total = amount + fee;
      const dateText = formatFullDate(tx.created_at);
      const timeText = formatTime(tx.created_at);
      const shortId = makeShortTransactionId(tx.id);

      const mobileExtra =
        ui.kind === 'mobile' || ui.kind === 'mobile_refund'
          ? `
            ${ui.detailImage ? `<div class="imageWrap"><img src="${ui.detailImage}" class="productImage" /></div>` : ''}
            <div class="row">
              <div>
                <div class="label">Product</div>
                <div class="value">${ui.detailModel || '-'}</div>
              </div>
            </div>
            ${ui.detailBrand ? `
            <div class="row">
              <div>
                <div class="label">Brand</div>
                <div class="value">${ui.detailBrand}</div>
              </div>
            </div>` : ''}
            ${ui.detailPurchaseMode ? `
            <div class="row">
              <div>
                <div class="label">Purchase Mode</div>
                <div class="value">${upperFirst(ui.detailPurchaseMode)}</div>
              </div>
            </div>` : ''}
            ${
              ui.detailStorage || ui.detailRam || ui.detailColor
                ? `
            <div class="row">
              <div>
                <div class="label">Specs</div>
                <div class="value">
                  ${[ui.detailStorage, ui.detailRam, ui.detailColor].filter(Boolean).join(' • ')}
                </div>
              </div>
            </div>`
                : ''
            }
            ${ui.detailQuantity ? `
            <div class="row">
              <div>
                <div class="label">Quantity</div>
                <div class="value">${ui.detailQuantity}</div>
              </div>
            </div>` : ''}
            ${ui.detailCashTotal ? `
            <div class="row">
              <div>
                <div class="label">Cash Total</div>
                <div class="value">${formatIQD(ui.detailCashTotal)}</div>
              </div>
            </div>` : ''}
            ${ui.detailMonthsCount ? `
            <div class="row">
              <div>
                <div class="label">Months</div>
                <div class="value">${ui.detailMonthsCount}</div>
              </div>
            </div>` : ''}
            ${ui.detailMonthlyPrice ? `
            <div class="row">
              <div>
                <div class="label">Monthly Installment</div>
                <div class="value">${formatIQD(ui.detailMonthlyPrice)}</div>
              </div>
            </div>` : ''}
            ${ui.detailContractTotal ? `
            <div class="row">
              <div>
                <div class="label">Installment Contract Total</div>
                <div class="value">${formatIQD(ui.detailContractTotal)}</div>
              </div>
            </div>` : ''}
            ${ui.detailPaidNow !== null && ui.detailPaidNow !== undefined ? `
            <div class="row">
              <div>
                <div class="label">${ui.kind === 'mobile_refund' ? 'Refund Amount' : 'Paid Now'}</div>
                <div class="value">${formatIQD(ui.detailPaidNow)}</div>
              </div>
            </div>` : ''}
            ${ui.kind !== 'mobile_refund' && ui.detailRemaining !== null && ui.detailRemaining !== undefined ? `
            <div class="row">
              <div>
                <div class="label">Remaining Amount</div>
                <div class="value">${formatIQD(ui.detailRemaining)}</div>
              </div>
            </div>` : ''}
          `
          : '';

      return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
            body { margin: 0; padding: 28px; background: #f5f8fc; color: #1E2A4A; }
            .sheet { background: #fff; border-radius: 20px; padding: 24px; border: 1px solid #dce7f2; }
            .title { font-size: 38px; font-weight: 800; margin: 0 0 20px; }
            .row {
              display: flex; justify-content: space-between; align-items: center;
              padding: 14px 0; border-top: 1px solid #edf2f7; gap: 16px;
            }
            .label { font-size: 14px; color: #6F7A96; margin-bottom: 6px; }
            .value { font-size: 17px; font-weight: 700; color: #1E2A4A; }
            .amount { color: ${ui.isOutgoing ? '#FF4D7E' : '#27D69B'}; font-size: 22px; font-weight: 800; }
            .badge {
              display: inline-block; padding: 10px 18px; border-radius: 999px; color: white;
              background: #4F7CFF; font-size: 15px; font-weight: 700;
            }
            .note {
              margin-top: 18px; border-radius: 16px; background: #f8fbff; border: 1px solid #e5edf7;
              padding: 16px; color: #51607d; line-height: 1.7;
            }
            .imageWrap {
              margin-top: 18px;
              margin-bottom: 6px;
              padding: 16px;
              border-radius: 18px;
              background: #f8fbff;
              border: 1px solid #e5edf7;
              text-align: center;
            }
            .productImage {
              width: 170px;
              height: 170px;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="title">INVOICE</div>

            <div class="row">
              <div>
                <div class="label">Date</div>
                <div class="value">${dateText} ${timeText}</div>
              </div>
              <div>
                <div class="label">Transaction ID</div>
                <div class="value">${shortId}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">${tOr('transactions_transactionType', 'Transaction Type')}</div>
                <div class="value">${ui.transactionTypeLabel}</div>
              </div>
              <div><span class="badge">${ui.transactionTypeLabel}</span></div>
            </div>

            <div class="row">
              <div>
                <div class="label">Details</div>
                <div class="value">${ui.displayName}</div>
                ${ui.displaySecondary ? `<div>${ui.displaySecondary}</div>` : ''}
                ${ui.displayEmail ? `<div>${ui.displayEmail}</div>` : ''}
                ${ui.displayCity ? `<div>${ui.displayCity}</div>` : ''}
              </div>
            </div>

            ${mobileExtra}

            <div class="row">
              <div>
                <div class="label">${tOr('transactions_transactionAmount', 'Transaction Amount')}</div>
                <div class="amount">${formatIQD(amount)}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">${tOr('transactions_transactionFee', 'Transaction Fee')}</div>
                <div class="value">${formatIQD(fee)}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">${tOr('transactions_transactionTotalAmount', 'Transaction Total Amount')}</div>
                <div class="amount">${formatIQD(total)}</div>
              </div>
            </div>

            ${
              tx.balance_after !== null && tx.balance_after !== undefined
                ? `
                <div class="row">
                  <div>
                    <div class="label">${tOr('transactions_balanceAfter', 'Balance After')}</div>
                    <div class="value">${formatIQD(tx.balance_after)}</div>
                  </div>
                </div>
              `
                : ''
            }

            ${
              ui.note
                ? `
                <div class="note">
                  <strong>${tOr('transactions_note', 'Note')}:</strong><br/>
                  ${String(ui.note).replace(/\n/g, '<br/>')}
                </div>
              `
                : ''
            }
          </div>
        </body>
      </html>
      `;
    },
    [getTxUi]
  );

  const handleSharePdf = useCallback(async () => {
    if (!selectedTx) return;

    try {
      setPdfLoading(true);
      const html = buildTransactionHtml(selectedTx);
      const { uri } = await Print.printToFileAsync({ html });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(
          tOr('transactions_notAvailable', 'Not available'),
          tOr('transactions_sharingNotAvailable', 'Sharing is not available on this device')
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: tOr('transactions_shareTransactionPdf', 'Share transaction PDF'),
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      console.log('share pdf error', e);
      Alert.alert(
        tOr('common_error', 'Error'),
        tOr('transactions_couldNotSharePdf', 'Could not share PDF')
      );
    } finally {
      setPdfLoading(false);
    }
  }, [selectedTx, buildTransactionHtml]);

  const renderLeadingVisual = (ui: TxUi) => {
    if ((ui.kind === 'send' || ui.kind === 'receive') && ui.displayAvatar) {
      return <Image source={{ uri: ui.displayAvatar }} style={styles.txAvatarImage} />;
    }

    if (ui.displayImage) {
      return <Image source={{ uri: ui.displayImage }} style={styles.txAvatarImage} />;
    }

    return (
      <View
        style={[
          styles.txIconBox,
          {
            backgroundColor:
              ui.kind === 'deposit' || ui.kind === 'withdraw'
                ? UI.blueSoft
                : ui.kind === 'mobile'
                ? UI.purpleSoft
                : ui.kind === 'mobile_refund'
                ? UI.blueSoft
                : ui.isOutgoing
                ? UI.redSoft
                : UI.greenSoft,
          },
        ]}
      >
        <Ionicons
          name={
            ui.kind === 'deposit' || ui.kind === 'withdraw'
              ? APP_SYSTEM_ICON
              : ui.iconName
          }
          size={22}
          color={
            ui.kind === 'deposit' || ui.kind === 'withdraw'
              ? UI.blue
              : ui.kind === 'mobile'
              ? UI.purple
              : ui.kind === 'mobile_refund'
              ? UI.blue
              : ui.isOutgoing
              ? UI.red
              : UI.green
          }
        />
      </View>
    );
  };

  const renderDetailExtraSection = (ui: TxUi) => {
    if (ui.kind !== 'mobile' && ui.kind !== 'mobile_refund') return null;

    const purchaseModeLabel =
      ui.detailPurchaseMode === 'installment'
        ? tOr('transactions_installment', 'Installment')
        : ui.detailPurchaseMode === 'cash'
        ? tOr('transactions_cash', 'Cash')
        : ui.detailPurchaseMode
        ? upperFirst(ui.detailPurchaseMode)
        : '';

    return (
      <View style={styles.mobileExtraCard}>
        {!!ui.detailImage && (
          <View style={styles.mobileDetailImageWrap}>
            <Image source={{ uri: ui.detailImage }} style={styles.mobileDetailImage} resizeMode="contain" />
          </View>
        )}

        <Text style={styles.mobileSectionTitle}>
          {ui.kind === 'mobile_refund'
            ? tOr('transactions_refundDetails', 'Refund Details')
            : tOr('transactions_mobileDetails', 'Mobile Details')}
        </Text>

        {ui.detailModel
          ? renderDetailRow(tOr('transactions_product', 'Product'), ui.detailModel, false, UI.text)
          : null}

        {ui.detailBrand
          ? renderDetailRow(tOr('transactions_brand', 'Brand'), ui.detailBrand, false, UI.primaryDark)
          : null}

        {purchaseModeLabel
          ? renderDetailRow(tOr('transactions_purchaseType', 'Purchase Type'), purchaseModeLabel, false, ui.detailPurchaseMode === 'installment' ? UI.purple : UI.blue)
          : null}

        {ui.detailQuantity
          ? renderDetailRow(tOr('transactions_quantity', 'Quantity'), String(ui.detailQuantity), false, UI.text)
          : null}

        {ui.detailStorage
          ? renderDetailRow(tOr('transactions_storage', 'Storage'), ui.detailStorage, false, UI.text)
          : null}

        {ui.detailRam
          ? renderDetailRow(tOr('transactions_ram', 'RAM'), ui.detailRam, false, UI.text)
          : null}

        {ui.detailColor
          ? renderDetailRow(tOr('transactions_color', 'Color'), ui.detailColor, false, UI.text)
          : null}

        {ui.detailCashTotal
          ? renderDetailRow(tOr('transactions_cashPrice', 'Cash Price'), formatIQD(ui.detailCashTotal), false, UI.blue)
          : null}

        {ui.detailMonthsCount
          ? renderDetailRow(tOr('transactions_months', 'Months'), String(ui.detailMonthsCount), false, UI.purple)
          : null}

        {ui.detailMonthlyPrice
          ? renderDetailRow(tOr('transactions_monthlyInstallment', 'Monthly Installment'), formatIQD(ui.detailMonthlyPrice), false, UI.purple)
          : null}

        {ui.detailContractTotal
          ? renderDetailRow(tOr('transactions_installmentContractTotal', 'Installment Contract Total'), formatIQD(ui.detailContractTotal), false, UI.purple)
          : null}

        {ui.detailPaidNow !== null && ui.detailPaidNow !== undefined
          ? renderDetailRow(
              ui.kind === 'mobile_refund'
                ? tOr('transactions_refundAmount', 'Refund Amount')
                : tOr('transactions_paidNow', 'Paid Now'),
              formatIQD(ui.detailPaidNow),
              false,
              ui.kind === 'mobile_refund' ? UI.blue : UI.green
            )
          : null}

        {ui.kind !== 'mobile_refund' &&
        ui.detailRemaining !== null &&
        ui.detailRemaining !== undefined
          ? renderDetailRow(
              tOr('transactions_remainingAmount', 'Remaining Amount'),
              formatIQD(ui.detailRemaining),
              false,
              UI.amber
            )
          : null}

        {ui.detailOrderId
          ? renderDetailRow(tOr('transactions_orderId', 'Order ID'), ui.detailOrderId, false, UI.text)
          : null}

        {!!ui.detailDescription && (
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>{tOr('transactions_description', 'Description')}</Text>
            <Text style={styles.noteText}>{ui.detailDescription}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTransaction = ({ item }: { item: TransactionData }) => {
    const ui = getTxUi(item);
    const statusColors = getStatusColors(item.status);
    const rawAmount = Math.abs(Number(item.amount || 0));
    const shortId = makeShortTransactionId(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.94}
        style={[styles.txCard, isRTL && styles.txCardRTL]}
        onPress={() => setSelectedTx(item)}
      >
        <View style={[styles.txTopRow, isRTL && styles.txTopRowRTL]}>
          <View style={[styles.txMainLeft, isRTL && styles.txMainLeftRTL]}>
            {renderLeadingVisual(ui)}

            <View style={[styles.txInfo, isRTL && styles.txInfoRTL]}>
              <Text
                style={[
                  styles.txTitle,
                  {
                    color:
                      ui.kind === 'mobile_refund'
                        ? UI.blue
                        : ui.isOutgoing
                        ? UI.red
                        : UI.green,
                  },
                  isRTL && styles.textRTL,
                ]}
                numberOfLines={1}
              >
                {ui.title}
              </Text>

              <Text
                style={[styles.txSubtitleMain, isRTL && styles.textRTL]}
                numberOfLines={2}
              >
                {ui.subtitleLine1}
              </Text>

              {!!ui.subtitleLine2 && (
                <Text
                  style={[styles.txSubtitleSmall, isRTL && styles.textRTL]}
                  numberOfLines={1}
                >
                  {ui.subtitleLine2}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.txMainRight, isRTL && styles.txMainRightRTL]}>
            <Text
              style={[
                styles.txAmount,
                {
                  color:
                    ui.kind === 'mobile_refund'
                      ? UI.blue
                      : ui.isOutgoing
                      ? UI.red
                      : UI.green,
                },
                isRTL && styles.textRTL,
              ]}
              numberOfLines={1}
            >
              {`${ui.isOutgoing ? '-' : '+'} ${formatIQD(rawAmount)}`}
            </Text>

            <Text style={[styles.txId, isRTL && styles.textRTL]} numberOfLines={1}>
              {shortId}
            </Text>
          </View>
        </View>

        <View style={[styles.txBottomRow, isRTL && styles.txBottomRowRTL]}>
          <Text style={[styles.txDate, isRTL && styles.textRTL]}>
            {formatListDate(item.created_at)} {formatTime(item.created_at)}
          </Text>

          <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusPillText, { color: statusColors.color }]}>
              {tOr(`transactions_status_${statusLabel(item.status)}`, statusLabel(item.status))}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (transactionsQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={UI.primary} size="large" />
          <Text style={styles.loadingText}>
            {tOr('transactions_loadingTransactions', 'Loading transactions...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={UI.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tOr('transactions_title', 'Transactions')}</Text>
          <View style={{ width: 46 }} />
        </View>

        <View style={styles.errorStateContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={46} color={UI.red} />
          </View>

          <Text style={styles.errorTitle}>
            {tOr('transactions_failedToLoad', 'Failed to load')}
          </Text>

          <Text style={styles.errorMessage}>
            {tOr('transactions_couldNotLoadTransactions', 'Could not load transactions')}
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => transactionsQuery.refetch()}
            activeOpacity={0.9}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{tOr('common_retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.page }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={UI.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{tOr('transactions_title', 'Transactions')}</Text>

        <TouchableOpacity activeOpacity={0.85} onPress={() => refetch()} style={styles.headerBtn}>
          <Ionicons name="refresh-outline" size={22} color={UI.primaryDark} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={UI.primary}
            colors={[UI.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.historyOnlyBox}>
              <Text style={styles.historyOnlyBoxText}>
                {tOr('transactions_transactionHistory', 'Transaction History')}
              </Text>
            </View>

            <View style={styles.searchBox}>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={tOr('transactions_searchByTransactionId', 'Search transaction by transaction id')}
                placeholderTextColor={UI.text2}
                style={styles.searchInput}
              />
              <Ionicons name="search-outline" size={22} color={UI.text2} />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={44} color={UI.text2} />
            </View>
            <Text style={styles.emptyTitle}>
              {tOr('transactions_noTransactions', 'No transactions')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tOr('transactions_transactionsWillAppearHere', 'Your transactions will appear here.')}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={!!selectedTx}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTx(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <Stack.Screen options={{ headerShown: false }} />

          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setSelectedTx(null)} activeOpacity={0.85}>
              <Ionicons name="close" size={24} color={UI.text} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {tOr('transactions_transactionDetails', 'Transaction Details')}
            </Text>

            <View style={{ width: 46 }} />
          </View>

          {selectedTx && selectedUi && (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.invoiceTopCard}>
                <View style={styles.invoiceTopLeft}>
                  <View style={styles.invoiceLogoBox}>
                    <Ionicons
                      name={
                        selectedUi.kind === 'mobile'
                          ? 'phone-portrait-outline'
                          : selectedUi.kind === 'mobile_refund'
                          ? 'refresh-outline'
                          : 'receipt-outline'
                      }
                      size={34}
                      color={
                        selectedUi.kind === 'mobile'
                          ? UI.purple
                          : selectedUi.kind === 'mobile_refund'
                          ? UI.blue
                          : UI.primaryDark
                      }
                    />
                  </View>
                  <Text style={styles.invoiceTitle}>
                    {selectedUi.detailTitleOverride || 'INVOICE'}
                  </Text>
                </View>

                <View style={styles.invoiceActionColumn}>
                  <TouchableOpacity
                    style={styles.invoiceActionBtn}
                    activeOpacity={0.9}
                    onPress={handleSharePdf}
                    disabled={pdfLoading}
                  >
                    <Ionicons name="share-social-outline" size={20} color={UI.text} />
                    <Text style={styles.invoiceActionText}>
                      {pdfLoading ? tOr('transactions_pleaseWait', 'Please wait...') : tOr('transactions_sharePdf', 'Share PDF')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailTopDateRow}>
                  <Text style={styles.detailDateText}>{formatFullDate(selectedTx.created_at)}</Text>
                  <Text style={styles.detailTimeText}>{formatTime(selectedTx.created_at)}</Text>
                </View>

                {renderDetailRow(
                  tOr('transactions_transactionId', 'Transaction ID'),
                  makeShortTransactionId(selectedTx.id),
                  false,
                  UI.green
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {tOr('transactions_transactionType', 'Transaction Type')}
                  </Text>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          selectedUi.kind === 'mobile'
                            ? UI.purple
                            : selectedUi.kind === 'mobile_refund'
                            ? UI.blue
                            : UI.red,
                      },
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>{selectedUi.transactionTypeLabel}</Text>
                  </View>
                </View>

                <View style={styles.detailPartySection}>
                  <Text style={styles.detailLabel}>
                    {selectedUi.kind === 'send'
                      ? tOr('transactions_sentTo', 'Sent To')
                      : selectedUi.kind === 'receive' || selectedUi.kind === 'deposit'
                      ? tOr('transactions_receivedFrom', 'Received From')
                      : selectedUi.kind === 'withdraw'
                      ? tOr('transactions_sentTo', 'Sent To')
                      : selectedUi.kind === 'mobile_refund'
                      ? tOr('transactions_refundItem', 'Refund Item')
                      : tOr('transactions_item', 'Item')}
                  </Text>

                  <View style={styles.detailPartyBox}>
                    {(selectedUi.kind === 'send' || selectedUi.kind === 'receive') && selectedUi.displayAvatar ? (
                      <Image source={{ uri: selectedUi.displayAvatar }} style={styles.partyAvatarImage} />
                    ) : selectedUi.displayImage ? (
                      <Image source={{ uri: selectedUi.displayImage }} style={styles.partyAvatarImage} />
                    ) : (
                      <View style={styles.partyFallbackAvatar}>
                        <Ionicons
                          name={
                            selectedUi.kind === 'deposit' || selectedUi.kind === 'withdraw'
                              ? APP_SYSTEM_ICON
                              : selectedUi.kind === 'send' || selectedUi.kind === 'receive'
                              ? 'person-outline'
                              : selectedUi.iconName
                          }
                          size={26}
                          color={
                            selectedUi.kind === 'deposit' || selectedUi.kind === 'withdraw'
                              ? UI.blue
                              : selectedUi.kind === 'mobile'
                              ? UI.purple
                              : selectedUi.kind === 'mobile_refund'
                              ? UI.blue
                              : UI.primaryDark
                          }
                        />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={styles.partyNameRow}>
                        <Text
                          style={[
                            styles.partyName,
                            {
                              color:
                                selectedUi.kind === 'mobile_refund'
                                  ? UI.blue
                                  : selectedUi.isOutgoing
                                  ? UI.red
                                  : UI.green,
                            },
                          ]}
                        >
                          {selectedUi.displayName}
                        </Text>

                        {selectedUi.verified && (
                          <Ionicons name="checkmark-circle" size={18} color={UI.blue} />
                        )}
                      </View>

                      {!!selectedUi.displaySecondary && (
                        <Text style={styles.partySecondary}>{selectedUi.displaySecondary}</Text>
                      )}

                      {!!selectedUi.displayEmail && (
                        <Text style={styles.partyEmail}>{selectedUi.displayEmail}</Text>
                      )}

                      {!!selectedUi.displayCity && (
                        <Text style={styles.partyCity}>{selectedUi.displayCity}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {renderDetailExtraSection(selectedUi)}

                {selectedTx.pin_code
                  ? renderDetailRow('PIN Code', selectedTx.pin_code, false, UI.primaryDark)
                  : null}

                {selectedTx.payment_method_name
                  ? renderDetailRow('Payment Method', selectedTx.payment_method_name, false, UI.primaryDark)
                  : null}

                {renderDetailRow(
                  tOr('transactions_transactionAmount', 'Transaction Amount'),
                  formatIQD(Math.abs(Number(selectedTx.amount || 0))),
                  false,
                  selectedUi.kind === 'mobile_refund'
                    ? UI.blue
                    : selectedUi.isOutgoing
                    ? UI.red
                    : UI.green
                )}

                {renderDetailRow(
                  tOr('transactions_transactionFee', 'Transaction Fee'),
                  formatIQD(Number(selectedTx.fee_amount || 0)),
                  false,
                  UI.green
                )}

                {renderDetailRow(
                  tOr('transactions_transactionTotalAmount', 'Transaction Total Amount'),
                  formatIQD(Math.abs(Number(selectedTx.amount || 0)) + Number(selectedTx.fee_amount || 0)),
                  false,
                  selectedUi.kind === 'mobile_refund'
                    ? UI.blue
                    : selectedUi.isOutgoing
                    ? UI.red
                    : UI.green
                )}

                {selectedTx.balance_after !== null &&
                  selectedTx.balance_after !== undefined &&
                  renderDetailRow(
                    tOr('transactions_balanceAfter', 'Balance After'),
                    formatIQD(selectedTx.balance_after),
                    false,
                    UI.primaryDark
                  )}

                {renderDetailRow(
                  tOr('transactions_status', 'Status'),
                  tOr(`transactions_status_${statusLabel(selectedTx.status)}`, statusLabel(selectedTx.status)),
                  false,
                  getStatusColors(selectedTx.status).color
                )}

                {!!selectedUi.note && (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>{tOr('transactions_note', 'Note')}</Text>
                    <Text style={styles.noteText}>{selectedUi.note}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function renderDetailRow(label: string, value: string, mono?: boolean, valueColor?: string) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          mono && styles.detailValueMono,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: UI.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },

  listContent: {
    paddingBottom: 28,
  },

  historyOnlyBox: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyOnlyBoxText: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.green,
  },

  searchBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: UI.text,
    fontWeight: '700',
  },

  txCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
  },

  txCardRTL: {
    direction: 'rtl',
  },

  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  txTopRowRTL: {
    flexDirection: 'row-reverse',
  },

  txMainLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },

  txMainLeftRTL: {
    flexDirection: 'row-reverse',
  },

  txMainRight: {
    alignItems: 'flex-end',
    maxWidth: 140,
    minWidth: 100,
  },

  txMainRightRTL: {
    alignItems: 'flex-start',
  },

  txIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  txAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#EFF5FF',
  },

  txInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  txInfoRTL: {
    alignItems: 'flex-end',
  },

  txTitle: {
    fontSize: 15,
    fontWeight: '900',
  },

  txSubtitleMain: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: UI.text,
    flexShrink: 1,
  },

  txSubtitleSmall: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: UI.text2,
  },

  txAmount: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'right',
  },

  txId: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    color: '#6774A6',
  },

  txBottomRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF3F8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  txBottomRowRTL: {
    flexDirection: 'row-reverse',
  },

  txDate: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.text2,
    flex: 1,
  },

  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  statusPillText: {
    fontSize: 13,
    fontWeight: '900',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: UI.page,
  },

  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: UI.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: UI.text,
  },

  modalContent: {
    padding: 16,
    paddingBottom: 32,
  },

  invoiceTopCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },

  invoiceTopLeft: {
    justifyContent: 'center',
    flex: 1,
  },

  invoiceLogoBox: {
    width: 74,
    height: 74,
    borderRadius: 20,
    backgroundColor: UI.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  invoiceTitle: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: '900',
    color: UI.text,
  },

  invoiceActionColumn: {
    justifyContent: 'flex-start',
    gap: 12,
  },

  invoiceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FBFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },

  invoiceActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
  },

  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },

  detailTopDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },

  detailDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: UI.text2,
  },

  detailTimeText: {
    fontSize: 15,
    fontWeight: '700',
    color: UI.text2,
  },

  detailRow: {
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },

  detailLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: UI.text2,
  },

  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },

  detailValueMono: {
    color: UI.green,
  },

  typeBadge: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  typeBadgeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },

  detailPartySection: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },

  detailPartyBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  partyAvatarImage: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: '#EFF5FF',
  },

  partyFallbackAvatar: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: '#EFF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  partyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  partyName: {
    fontSize: 17,
    fontWeight: '900',
  },

  partySecondary: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
  },

  partyEmail: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
  },

  partyCity: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: UI.text3,
  },

  mobileExtraCard: {
    paddingTop: 18,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },

  mobileDetailImageWrap: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },

  mobileDetailImage: {
    width: '90%',
    height: '90%',
  },

  mobileSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },

  noteBox: {
    marginTop: 16,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
  },

  noteTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
  },

  noteText: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
    lineHeight: 22,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.text2,
    textAlign: 'center',
  },

  emptyState: {
    paddingTop: 70,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  emptyIconContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#EEF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 20,
  },

  errorStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },

  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
  },

  errorMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 20,
  },

  primaryBtn: {
    marginTop: 8,
    backgroundColor: UI.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },

  textRTL: {
    textAlign: 'right',
  },
});
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
  shadow: '#0F172A',
};

interface TransactionData {
  id: string;
  user_id?: string | null;
  type: string;
  status: string;
  amount: number;
  description: string | null;
  created_at: string;
  sender_id: string | null;
  receiver_id: string | null;
  balance_after: number | null;

  sender_name?: string | null;
  sender_email?: string | null;
  sender_avatar?: string | null;
  sender_city?: string | null;

  receiver_name?: string | null;
  receiver_email?: string | null;
  receiver_avatar?: string | null;
  receiver_city?: string | null;

  meta_title?: string | null;
  meta_subtitle?: string | null;
  meta_image?: string | null;
  meta_source?: string | null;
}

type TxUi = {
  title: string;
  subtitleLine1: string;
  subtitleLine2?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isOutgoing: boolean;

  partyName: string;
  partyEmail?: string;
  partyAvatar?: string | null;
  partyCity?: string | null;

  transactionTypeLabel: string;
  note?: string;

  verified?: boolean;
  imageUri?: string | null;
  useRemoteImage?: boolean;
  appLabel?: string;

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
    | 'sim'
    | 'other';
};

const APP_NAME = 'Zenopay';
const APP_FAKE_PROFILE_NAME = 'Zenopay';
const APP_DEFAULT_ICON: keyof typeof Ionicons.glyphMap = 'shield-checkmark-outline';

const safe = (v?: string | null) => (v && String(v).trim().length ? String(v).trim() : null);

const tOr = (key: string, fallback: string) => {
  const v = i18n.t(key) as unknown as string;
  if (!v) return fallback;
  return v === key ? fallback : v;
};

const languageUsesArabicIQD = () => {
  const lang = String(i18n.language || '').toLowerCase();
  return ['ar', 'cbk', 'kmr'].includes(lang);
};

const formatIQD = (value: number | null | undefined) => {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  const formatted = abs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (languageUsesArabicIQD()) return `${formatted} د.غ`;
  return `${formatted} IQD`;
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
    hour: '2-digit',
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
  if (s === 'completed' || s === 'success' || s === 'paid' || s === 'approved') return 'completed';
  if (s === 'pending' || s === 'processing') return 'pending';
  if (s === 'failed' || s === 'rejected' || s === 'cancelled' || s === 'canceled') return 'failed';
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
  if (s === 'completed' || s === 'success' || s === 'paid' || s === 'approved') {
    return { bg: UI.greenSoft, color: UI.green };
  }
  if (s === 'pending' || s === 'processing') {
    return { bg: UI.amberSoft, color: UI.amber };
  }
  return { bg: UI.redSoft, color: UI.red };
};

const pickFirstText = (obj: any, keys: string[]) => {
  for (const key of keys) {
    const value = safe(obj?.[key]);
    if (value) return value;
  }
  return null;
};

const enrichFromRows = (
  rows: any[] | null | undefined,
  tableName: string,
  map: Map<string, { title?: string | null; subtitle?: string | null; image?: string | null; source?: string | null }>
) => {
  (rows || []).forEach((row) => {
    const txId = safe(
      row?.transaction_id ||
        row?.tx_id ||
        row?.payment_transaction_id ||
        row?.wallet_transaction_id
    );

    if (!txId) return;

    const title =
      pickFirstText(row, [
        'product_name',
        'card_name',
        'gift_card_name',
        'mobile_name',
        'model_name',
        'title',
        'name',
        'network_name',
        'operator_name',
        'brand_name',
      ]) || null;

    const subtitle =
      pickFirstText(row, [
        'network',
        'operator',
        'brand',
        'category',
        'provider',
        'type',
        'card_type',
        'gift_type',
        'model',
      ]) || null;

    const image =
      pickFirstText(row, [
        'image_url',
        'image',
        'logo_url',
        'logo',
        'card_image',
        'product_image',
        'thumbnail_url',
        'photo_url',
        'icon_url',
      ]) || null;

    map.set(txId, {
      title,
      subtitle,
      image,
      source: tableName,
    });
  });
};

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  useTheme();
  const isRTL = I18nManager.isRTL;
  const myId = user?.id || '';

  const [searchText, setSearchText] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransactionData | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const transactionsQuery = useQuery({
    queryKey: ['transactions-screen-modern-rich', myId],
    queryFn: async () => {
      if (!myId) throw new Error('User ID not found');

      let data: any[] | null = null;
      let error: any = null;

      const q1 = await supabase
        .from('transactions')
        .select(
          `
          id,
          user_id,
          type,
          status,
          amount,
          description,
          created_at,
          sender_id,
          receiver_id,
          balance_after
        `
        )
        .or(`user_id.eq.${myId},sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false });

      data = q1.data;
      error = q1.error;

      if (error) {
        const q2 = await supabase
          .from('transactions')
          .select(
            `
            id,
            user_id,
            type,
            status,
            amount,
            description,
            created_at,
            sender_id,
            receiver_id,
            balance_after
          `
          )
          .eq('user_id', myId)
          .order('created_at', { ascending: false });

        data = q2.data;
        error = q2.error;
      }

      if (error) {
        console.log('Transaction fetch error:', JSON.stringify(error));
        throw new Error('Failed to fetch transactions');
      }

      let txs = (data || []) as TransactionData[];

      if (txs.length === 0) {
        const { data: wData, error: wErr } = await supabase
          .from('wallets')
          .select('balance, updated_at, created_at')
          .eq('user_id', myId)
          .maybeSingle();

        if (!wErr) {
          const bal = Number((wData as any)?.balance ?? 0);
          if (bal > 0) {
            const when =
              (wData as any)?.updated_at || (wData as any)?.created_at || new Date().toISOString();

            const synthetic: TransactionData = {
              id: `initial_deposit_${myId}`,
              user_id: myId,
              type: 'deposit',
              status: 'completed',
              amount: bal,
              description: 'Deposit from Zenopay',
              created_at: when,
              sender_id: null,
              receiver_id: null,
              balance_after: bal,
            };

            txs = [synthetic];
          }
        }
      }

      const ids = Array.from(
        new Set(
          txs
            .flatMap((t) => [t.sender_id, t.receiver_id, t.user_id])
            .filter((x): x is string => !!x)
        )
      );

      const profileMap = new Map<
        string,
        {
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          city: string | null;
        }
      >();

      if (ids.length) {
        const { data: p1 } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email, avatar_url, city')
          .in('id', ids);

        (p1 || []).forEach((p: any) => {
          const key1 = safe(p.id);
          const key2 = safe(p.user_id);
          const val = {
            full_name: safe(p.full_name),
            email: safe(p.email),
            avatar_url: safe(p.avatar_url),
            city: safe(p.city),
          };
          if (key1) profileMap.set(String(key1), val);
          if (key2) profileMap.set(String(key2), val);
        });

        const missing = ids.filter((id) => !profileMap.has(id));

        if (missing.length) {
          const { data: p2 } = await supabase
            .from('profiles')
            .select('id, user_id, full_name, email, avatar_url, city')
            .in('user_id', missing);

          (p2 || []).forEach((p: any) => {
            const key1 = safe(p.id);
            const key2 = safe(p.user_id);
            const val = {
              full_name: safe(p.full_name),
              email: safe(p.email),
              avatar_url: safe(p.avatar_url),
              city: safe(p.city),
            };
            if (key1) profileMap.set(String(key1), val);
            if (key2) profileMap.set(String(key2), val);
          });
        }
      }

      const metaMap = new Map<
        string,
        { title?: string | null; subtitle?: string | null; image?: string | null; source?: string | null }
      >();

      const tableAttempts = [
        {
          table: 'topup_orders',
          select:
            'transaction_id, tx_id, card_name, network_name, operator_name, provider, image_url, logo_url, card_image, image',
        },
        {
          table: 'sim_card_orders',
          select:
            'transaction_id, tx_id, card_name, network_name, operator_name, provider, image_url, logo_url, card_image, image',
        },
        {
          table: 'gift_card_orders',
          select:
            'transaction_id, tx_id, gift_card_name, card_name, brand_name, category, image_url, logo_url, card_image, image',
        },
        {
          table: 'shop_orders',
          select:
            'transaction_id, tx_id, product_name, mobile_name, model_name, brand_name, image_url, logo_url, product_image, image, thumbnail_url',
        },
        {
          table: 'mobile_shop_orders',
          select:
            'transaction_id, tx_id, product_name, mobile_name, model_name, brand_name, image_url, logo_url, product_image, image, thumbnail_url',
        },
        {
          table: 'notifications',
          select:
            'transaction_id, tx_id, title, name, type, image_url, logo_url, image, icon_url',
        },
      ];

      for (const attempt of tableAttempts) {
        try {
          const { data: rows, error: tableError } = await supabase
            .from(attempt.table)
            .select(attempt.select);

          if (!tableError && rows?.length) {
            enrichFromRows(rows, attempt.table, metaMap);
          }
        } catch (e) {
          console.log(`Optional transaction meta table skipped: ${attempt.table}`, e);
        }
      }

      return txs.map((t) => {
        const s = t.sender_id ? profileMap.get(t.sender_id) : null;
        const r = t.receiver_id ? profileMap.get(t.receiver_id) : null;
        const meta = metaMap.get(t.id);

        return {
          ...t,
          sender_name: s?.full_name ?? null,
          sender_email: s?.email ?? null,
          sender_avatar: s?.avatar_url ?? null,
          sender_city: s?.city ?? null,

          receiver_name: r?.full_name ?? null,
          receiver_email: r?.email ?? null,
          receiver_avatar: r?.avatar_url ?? null,
          receiver_city: r?.city ?? null,

          meta_title: meta?.title ?? null,
          meta_subtitle: meta?.subtitle ?? null,
          meta_image: meta?.image ?? null,
          meta_source: meta?.source ?? null,
        };
      });
    },
    enabled: !!myId,
    staleTime: 0,
    gcTime: 0,
  });

  const getTxUi = useCallback(
    (tx: TransactionData): TxUi => {
      const type = String(tx.type || '').toLowerCase();
      const desc = safe(tx.description);

      const senderName = safe(tx.sender_name);
      const receiverName = safe(tx.receiver_name);
      const senderEmail = safe(tx.sender_email);
      const receiverEmail = safe(tx.receiver_email);
      const senderAvatar = safe(tx.sender_avatar);
      const receiverAvatar = safe(tx.receiver_avatar);
      const senderCity = safe(tx.sender_city);
      const receiverCity = safe(tx.receiver_city);

      const metaTitle = safe(tx.meta_title);
      const metaSubtitle = safe(tx.meta_subtitle);
      const metaImage = safe(tx.meta_image);

      const senderLabel = senderName || senderEmail || tOr('transactions_unknownUser', 'Unknown user');
      const receiverLabel = receiverName || receiverEmail || tOr('transactions_unknownUser', 'Unknown user');

      const isOutgoingBySender = tx.sender_id === myId;
      const isOutgoingByAmount = Number(tx.amount || 0) < 0;
      const descLower = (desc || '').toLowerCase();

      const isVirtualCard =
        type.includes('virtual') ||
        type === 'virtual_card_create' ||
        type === 'create_virtual_card' ||
        type === 'purchase_virtual_card' ||
        descLower.includes('virtual card') ||
        descLower.includes('zenopay card');

      if (isVirtualCard) {
        return {
          title: tOr('transactions_virtualCardCreated', 'Zenopay Card Created'),
          subtitleLine1: tOr('transactions_virtualCardCreatedSubtitle', 'Virtual card created successfully'),
          subtitleLine2: makeShortTransactionId(tx.id),
          iconName: 'card-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          partyCity: null,
          transactionTypeLabel: tOr('transactions_typeVirtualCard', 'Virtual Card'),
          note: desc || tOr('transactions_noteVirtualCard', 'Zenopay virtual card has been created.'),
          verified: true,
          appLabel: APP_NAME,
          kind: 'virtual_card',
        };
      }

      if (type === 'send' || type === 'receive' || type === 'transfer' || type === 'p2p') {
        const isOutgoing = isOutgoingBySender || isOutgoingByAmount;

        if (isOutgoing) {
          return {
            title: tOr('transactions_moneySent', 'Money Sent'),
            subtitleLine1: receiverLabel,
            subtitleLine2:
              receiverEmail && receiverEmail !== receiverLabel
                ? receiverEmail
                : makeShortTransactionId(tx.id),
            iconName: 'arrow-up-outline',
            isOutgoing: true,
            partyName: receiverLabel,
            partyEmail: receiverEmail || undefined,
            partyAvatar: receiverAvatar || null,
            partyCity: receiverCity || null,
            transactionTypeLabel: tOr('transactions_typeP2PTransfer', 'P2P Transfer'),
            note: desc || `${tOr('transactions_moneySentTo', 'Money sent to')} ${receiverLabel}`,
            verified: false,
            kind: 'send',
          };
        }

        return {
          title: tOr('transactions_youReceivedMoney', 'You Received Money'),
          subtitleLine1: senderLabel,
          subtitleLine2:
            senderEmail && senderEmail !== senderLabel
              ? senderEmail
              : makeShortTransactionId(tx.id),
          iconName: 'arrow-down-outline',
          isOutgoing: false,
          partyName: senderLabel,
          partyEmail: senderEmail || undefined,
          partyAvatar: senderAvatar || null,
          partyCity: senderCity || null,
          transactionTypeLabel: tOr('transactions_typeP2PTransfer', 'P2P Transfer'),
          note: desc || `${tOr('transactions_moneyReceivedFrom', 'Money received from')} ${senderLabel}`,
          verified: false,
          kind: 'receive',
        };
      }

      if (
        type === 'deposit' ||
        type === 'admin_add' ||
        type === 'agent_add' ||
        type === 'topup' ||
        type === 'top_up' ||
        type === 'add_balance'
      ) {
        return {
          title: tOr('transactions_youReceivedMoney', 'You Received Money'),
          subtitleLine1: tOr('transactions_depositFromZenopay', 'Deposit from Zenopay'),
          subtitleLine2: makeShortTransactionId(tx.id),
          iconName: 'download-outline',
          isOutgoing: false,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          partyCity: null,
          transactionTypeLabel: tOr('transactions_typeDeposit', 'Deposit'),
          note: desc || tOr('transactions_depositFromZenopay', 'Deposit from Zenopay'),
          verified: true,
          appLabel: APP_NAME,
          kind: 'deposit',
        };
      }

      if (
        type === 'withdraw' ||
        type === 'admin_withdraw' ||
        type === 'agent_withdraw' ||
        type === 'withdraw_balance'
      ) {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: tOr('transactions_withdrawToZenopay', 'Withdraw to Zenopay'),
          subtitleLine2: makeShortTransactionId(tx.id),
          iconName: 'cash-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          partyCity: null,
          transactionTypeLabel: tOr('transactions_typeWithdraw', 'Withdraw'),
          note: desc || tOr('transactions_noteWithdraw', 'Withdraw processed by Zenopay'),
          verified: true,
          appLabel: APP_NAME,
          kind: 'withdraw',
        };
      }

      if (type.includes('gift') || type === 'gift_card_purchase' || type === 'purchase_giftcard') {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: metaTitle || tOr('transactions_giftCardPurchase', 'Gift Card Purchase'),
          subtitleLine2: metaSubtitle || makeShortTransactionId(tx.id),
          iconName: 'gift-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          partyCity: null,
          transactionTypeLabel: tOr('transactions_typeGiftCard', 'Gift Card'),
          note: desc || metaTitle || tOr('transactions_noteGiftCard', 'Gift card purchased successfully'),
          verified: true,
          appLabel: APP_NAME,
          imageUri: metaImage || null,
          useRemoteImage: !!metaImage,
          kind: 'giftcard',
        };
      }

      if (
        type.includes('sim') ||
        type === 'sim_card_purchase' ||
        type === 'purchase_sim' ||
        type === 'topup_purchase' ||
        type === 'card_topup'
      ) {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: metaTitle || tOr('transactions_simCardPurchase', 'SIM Card Purchase'),
          subtitleLine2: metaSubtitle || makeShortTransactionId(tx.id),
          iconName: 'cellular-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          partyCity: null,
          transactionTypeLabel: tOr('transactions_typeSimCard', 'SIM Card'),
          note: desc || metaTitle || tOr('transactions_noteSimCard', 'SIM card purchased successfully'),
          verified: true,
          appLabel: APP_NAME,
          imageUri: metaImage || null,
          useRemoteImage: !!metaImage,
          kind: 'sim',
        };
      }

      if (type.includes('mobile') || type === 'purchase_mobile' || type === 'mobile_shop_purchase') {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: metaTitle || tOr('transactions_mobileShopPurchase', 'Mobile Shop Purchase'),
          subtitleLine2: metaSubtitle || makeShortTransactionId(tx.id),
          iconName: 'phone-portrait-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          partyCity: null,
          transactionTypeLabel: tOr('transactions_typeMobileShop', 'Mobile Shop'),
          note: desc || metaTitle || tOr('transactions_noteMobileShop', 'Mobile shop purchase completed'),
          verified: true,
          appLabel: APP_NAME,
          imageUri: metaImage || null,
          useRemoteImage: !!metaImage,
          kind: 'mobile',
        };
      }

      if (type.includes('purchase') || type === 'buy' || type === 'order') {
        return {
          title: tOr('transactions_moneySent', 'Money Sent'),
          subtitleLine1: metaTitle || tOr('transactions_purchase', 'Purchase'),
          subtitleLine2: metaSubtitle || makeShortTransactionId(tx.id),
          iconName: 'pricetag-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          partyCity: null,
          transactionTypeLabel: tOr('transactions_typePurchase', 'Purchase'),
          note: desc || metaTitle || tOr('transactions_notePurchase', 'Purchase completed'),
          verified: true,
          appLabel: APP_NAME,
          imageUri: metaImage || null,
          useRemoteImage: !!metaImage,
          kind: 'purchase',
        };
      }

      const isOutgoing = isOutgoingBySender || isOutgoingByAmount;

      return {
        title: isOutgoing
          ? tOr('transactions_moneySent', 'Money Sent')
          : tOr('transactions_youReceivedMoney', 'You Received Money'),
        subtitleLine1: desc || tOr('transactions_transaction', 'Transaction'),
        subtitleLine2: makeShortTransactionId(tx.id),
        iconName: isOutgoing ? 'arrow-up-outline' : 'arrow-down-outline',
        isOutgoing,
        partyName: APP_FAKE_PROFILE_NAME,
        partyEmail: undefined,
        partyAvatar: null,
        partyCity: null,
        transactionTypeLabel: tOr('transactions_typeTransaction', 'Transaction'),
        note: desc || tOr('transactions_transactionDetailsText', 'Transaction details'),
        verified: true,
        appLabel: APP_NAME,
        kind: 'other',
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

      const bucket = [
        tx.id,
        shortId,
        tx.type,
        tx.status,
        tx.description,
        tx.sender_name,
        tx.sender_email,
        tx.sender_city,
        tx.receiver_name,
        tx.receiver_email,
        tx.receiver_city,
        tx.meta_title,
        tx.meta_subtitle,
        ui.title,
        ui.subtitleLine1,
        ui.subtitleLine2,
        ui.partyName,
        ui.partyEmail,
        ui.partyCity,
        ui.transactionTypeLabel,
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
      const fee = 0;
      const total = amount + fee;
      const partyEmail = ui.partyEmail || '';
      const partyCity = ui.partyCity || '';
      const note = ui.note || '';
      const dateText = formatFullDate(tx.created_at);
      const timeText = formatTime(tx.created_at);
      const shortId = makeShortTransactionId(tx.id);

      return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
            body {
              margin: 0;
              padding: 28px;
              background: #f5f8fc;
              color: #1E2A4A;
            }
            .sheet {
              background: #ffffff;
              border-radius: 20px;
              padding: 24px;
              border: 1px solid #dce7f2;
            }
            .top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
            }
            .logoWrap {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .logo {
              width: 60px;
              height: 60px;
              border-radius: 18px;
              background: linear-gradient(135deg, #4F7CFF, #27D69B);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 28px;
              font-weight: 700;
            }
            .title {
              font-size: 42px;
              font-weight: 800;
              margin: 0;
              color: #1E2A4A;
            }
            .dateBox {
              text-align: right;
              font-size: 15px;
              color: #6F7A96;
              line-height: 1.8;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 16px 0;
              border-top: 1px solid #edf2f7;
              gap: 16px;
            }
            .label {
              font-size: 14px;
              color: #6F7A96;
              margin-bottom: 6px;
            }
            .value {
              font-size: 17px;
              font-weight: 700;
              color: #1E2A4A;
              word-break: break-word;
            }
            .amount {
              color: ${ui.isOutgoing ? '#FF4D7E' : '#27D69B'};
              font-size: 24px;
              font-weight: 800;
            }
            .badge {
              display: inline-block;
              padding: 10px 18px;
              border-radius: 999px;
              color: white;
              background: #4F7CFF;
              font-size: 15px;
              font-weight: 700;
            }
            .partyBox {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .partyAvatar {
              width: 52px;
              height: 52px;
              border-radius: 16px;
              background: #e9f0ff;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #315EE8;
              font-weight: 800;
              font-size: 20px;
            }
            .small {
              font-size: 14px;
              color: #6F7A96;
            }
            .note {
              margin-top: 18px;
              border-radius: 16px;
              background: #f8fbff;
              border: 1px solid #e5edf7;
              padding: 16px;
              color: #51607d;
              line-height: 1.7;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="top">
              <div class="logoWrap">
                <div class="logo">Z</div>
                <div>
                  <p class="title">INVOICE</p>
                  <div class="small">${APP_NAME}</div>
                </div>
              </div>
              <div class="dateBox">
                <div>${dateText}</div>
                <div>${timeText}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">${tOr('transactions_transactionId', 'Transaction ID')}</div>
                <div class="value">${shortId}</div>
              </div>
              <div style="text-align:right;">
                <div class="label">${tOr('transactions_status', 'Status')}</div>
                <div class="value">${tOr(`transactions_status_${statusLabel(tx.status)}`, statusLabel(tx.status))}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">${tOr('transactions_transactionType', 'Transaction Type')}</div>
                <div class="value">${ui.transactionTypeLabel}</div>
              </div>
              <div>
                <span class="badge">${ui.transactionTypeLabel}</span>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">${ui.isOutgoing ? tOr('transactions_sentTo', 'Sent To') : tOr('transactions_receivedFrom', 'Received From')}</div>
                <div class="partyBox">
                  <div class="partyAvatar">${ui.partyName?.slice(0, 1)?.toUpperCase() || 'Z'}</div>
                  <div>
                    <div class="value">${ui.partyName}</div>
                    <div class="small">${partyEmail}</div>
                    <div class="small">${partyCity}</div>
                  </div>
                </div>
              </div>
            </div>

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
              note
                ? `
              <div class="note">
                <strong>${tOr('transactions_note', 'Note')}:</strong><br/>
                ${String(note).replace(/\n/g, '<br/>')}
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
      console.log('PDF share error', e);
      Alert.alert(
        tOr('common_error', 'Error'),
        tOr('transactions_couldNotSharePdf', 'Could not share PDF')
      );
    } finally {
      setPdfLoading(false);
    }
  }, [selectedTx, buildTransactionHtml]);

  const renderAvatarOrIcon = (ui: TxUi) => {
    if (ui.kind === 'send' || ui.kind === 'receive') {
      if (ui.partyAvatar) {
        return <Image source={{ uri: ui.partyAvatar }} style={styles.txAvatarImage} />;
      }

      return (
        <View
          style={[
            styles.txIconBox,
            { backgroundColor: ui.isOutgoing ? UI.redSoft : UI.greenSoft },
          ]}
        >
          <Ionicons
            name="person-outline"
            size={22}
            color={ui.isOutgoing ? UI.red : UI.green}
          />
        </View>
      );
    }

    if (ui.useRemoteImage && ui.imageUri) {
      return <Image source={{ uri: ui.imageUri }} style={styles.txAvatarImage} />;
    }

    return (
      <View
        style={[
          styles.txIconBox,
          {
            backgroundColor:
              ui.kind === 'deposit' || ui.kind === 'withdraw'
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
              ? APP_DEFAULT_ICON
              : ui.iconName
          }
          size={22}
          color={
            ui.kind === 'deposit' || ui.kind === 'withdraw'
              ? UI.blue
              : ui.isOutgoing
              ? UI.red
              : UI.green
          }
        />
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
            {renderAvatarOrIcon(ui)}

            <View style={[styles.txInfo, isRTL && styles.txInfoRTL]}>
              <View style={styles.txTitleRow}>
                <Text
                  style={[
                    styles.txTitle,
                    { color: ui.isOutgoing ? UI.red : UI.green },
                    isRTL && styles.textRTL,
                  ]}
                  numberOfLines={1}
                >
                  {ui.title}
                </Text>

                {ui.verified && (
                  <Ionicons name="checkmark-circle" size={16} color={UI.blue} />
                )}
              </View>

              <Text
                style={[styles.txSubtitleMain, isRTL && styles.textRTL]}
                numberOfLines={2}
              >
                {ui.subtitleLine1}
              </Text>

              {!!ui.partyEmail && (ui.kind === 'send' || ui.kind === 'receive') && (
                <Text
                  style={[styles.txSubtitleSmall, isRTL && styles.textRTL]}
                  numberOfLines={1}
                >
                  {ui.partyEmail}
                </Text>
              )}

              {!!ui.partyCity && (ui.kind === 'send' || ui.kind === 'receive') && (
                <Text
                  style={[styles.txSubtitleTiny, isRTL && styles.textRTL]}
                  numberOfLines={1}
                >
                  {ui.partyCity}
                </Text>
              )}

              {!ui.partyEmail && !!ui.subtitleLine2 && (
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
                { color: ui.isOutgoing ? UI.red : UI.green },
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

          <TouchableOpacity style={styles.primaryBtn} onPress={() => transactionsQuery.refetch()} activeOpacity={0.9}>
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
                    <Ionicons name="receipt-outline" size={34} color={UI.primaryDark} />
                  </View>
                  <Text style={styles.invoiceTitle}>INVOICE</Text>
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
                      {pdfLoading
                        ? tOr('transactions_pleaseWait', 'Please wait...')
                        : tOr('transactions_sharePdf', 'Share PDF')}
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
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{selectedUi.transactionTypeLabel}</Text>
                  </View>
                </View>

                <View style={styles.detailPartySection}>
                  <Text style={styles.detailLabel}>
                    {selectedUi.isOutgoing
                      ? tOr('transactions_sentTo', 'Sent To')
                      : tOr('transactions_receivedFrom', 'Received From')}
                  </Text>

                  <View style={styles.detailPartyBox}>
                    {(selectedUi.kind === 'send' || selectedUi.kind === 'receive') && selectedUi.partyAvatar ? (
                      <Image source={{ uri: selectedUi.partyAvatar }} style={styles.partyAvatarImage} />
                    ) : selectedUi.useRemoteImage && selectedUi.imageUri ? (
                      <Image source={{ uri: selectedUi.imageUri }} style={styles.partyAvatarImage} />
                    ) : (
                      <View style={styles.partyFallbackAvatar}>
                        <Ionicons
                          name={
                            selectedUi.verified
                              ? APP_DEFAULT_ICON
                              : selectedUi.kind === 'send' || selectedUi.kind === 'receive'
                              ? 'person-outline'
                              : selectedUi.iconName
                          }
                          size={26}
                          color={selectedUi.verified ? UI.blue : UI.primaryDark}
                        />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={styles.partyNameRow}>
                        <Text
                          style={[
                            styles.partyName,
                            { color: selectedUi.isOutgoing ? UI.red : UI.green },
                          ]}
                        >
                          {selectedUi.partyName}
                        </Text>

                        {selectedUi.verified && (
                          <Ionicons name="checkmark-circle" size={18} color={UI.blue} />
                        )}
                      </View>

                      {!!selectedUi.partyEmail && (
                        <Text style={styles.partyEmail}>{selectedUi.partyEmail}</Text>
                      )}

                      {!!selectedUi.partyCity && (
                        <Text style={styles.partyCity}>{selectedUi.partyCity}</Text>
                      )}

                      {selectedUi.verified && !selectedUi.partyEmail && (
                        <Text style={styles.partyEmail}>{APP_NAME}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {renderDetailRow(
                  tOr('transactions_transactionAmount', 'Transaction Amount'),
                  formatIQD(Math.abs(Number(selectedTx.amount || 0))),
                  false,
                  selectedUi.isOutgoing ? UI.red : UI.green
                )}

                {renderDetailRow(
                  tOr('transactions_transactionFee', 'Transaction Fee'),
                  formatIQD(0),
                  false,
                  UI.green
                )}

                {renderDetailRow(
                  tOr('transactions_transactionTotalAmount', 'Transaction Total Amount'),
                  formatIQD(Math.abs(Number(selectedTx.amount || 0))),
                  false,
                  selectedUi.isOutgoing ? UI.red : UI.green
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

function renderDetailRow(
  label: string,
  value: string,
  mono?: boolean,
  valueColor?: string
) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          mono && styles.detailValueMono,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={2}
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
    maxWidth: 130,
    minWidth: 90,
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

  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
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

  txSubtitleTiny: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: UI.text3,
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
    textTransform: 'capitalize',
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
    backgroundColor: UI.red,
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

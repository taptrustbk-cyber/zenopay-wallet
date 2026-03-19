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
  Platform,
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
import * as FileSystem from 'expo-file-system';

const UI = {
  bg: '#F4F8FC',
  page: '#EDF3F8',
  card: '#FFFFFF',
  soft: '#F6FAFD',
  text: '#1E2A4A',
  text2: '#6F7A96',
  text3: '#94A3B8',
  border: '#DCE7F2',
  primary: '#4F7CFF',
  primaryDark: '#315EE8',
  primarySoft: '#E9F0FF',
  blueSoft2: '#EEF5FF',
  green: '#27D69B',
  greenSoft: '#EAFBF5',
  red: '#FF4D7E',
  redSoft: '#FFEAF1',
  amber: '#F59E0B',
  amberSoft: '#FFF4D9',
  tabBg: '#E9EFF5',
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

  receiver_name?: string | null;
  receiver_email?: string | null;
  receiver_avatar?: string | null;
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
  transactionTypeLabel: string;
  note?: string;
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

const safe = (v?: string | null) => (v && String(v).trim().length ? String(v).trim() : null);

const tOr = (key: string, fallback: string) => {
  const v = i18n.t(key) as unknown as string;
  if (!v) return fallback;
  return v === key ? fallback : v;
};

const APP_NAME = 'Zenopay';
const APP_FAKE_PROFILE_NAME = 'Zenopay';
const APP_DEFAULT_ICON = 'shield-checkmark-outline';

const APP_EMAIL_HINT = '';

const formatIQD = (value: number | null | undefined) => {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(abs);
  return `${formatted} IQD`;
};

const formatMonthYear = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
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

const getMonthKey = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabelFromKey = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
};

const statusLabel = (raw: string) => {
  const s = String(raw || 'completed').toLowerCase();
  if (s === 'completed' || s === 'success' || s === 'paid' || s === 'approved') return 'Completed';
  if (s === 'pending' || s === 'processing') return 'Pending';
  if (s === 'failed' || s === 'rejected' || s === 'cancelled' || s === 'canceled') return 'Failed';
  return s.charAt(0).toUpperCase() + s.slice(1);
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

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const myId = user?.id || '';

  const [activeTab, setActiveTab] = useState<'history' | 'summary'>('history');
  const [searchText, setSearchText] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransactionData | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const transactionsQuery = useQuery({
    queryKey: ['transactions-premium-screen', myId],
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
          .in('user_id', [myId])
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
          txs.flatMap((t) => [t.sender_id, t.receiver_id]).filter((x): x is string => !!x)
        )
      );

      if (!ids.length) return txs;

      const map = new Map<
        string,
        { full_name: string | null; email: string | null; avatar_url: string | null }
      >();

      const { data: p1, error: pErr1 } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, avatar_url')
        .in('id', ids);

      if (!pErr1) {
        (p1 || []).forEach((p: any) => {
          const key1 = safe(p.id);
          const key2 = safe(p.user_id);
          const val = {
            full_name: safe(p.full_name),
            email: safe(p.email),
            avatar_url: safe(p.avatar_url),
          };
          if (key1) map.set(String(key1), val);
          if (key2) map.set(String(key2), val);
        });
      }

      const missing = ids.filter((id) => !map.has(id));

      if (missing.length) {
        const { data: p2, error: pErr2 } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email, avatar_url')
          .in('user_id', missing);

        if (!pErr2) {
          (p2 || []).forEach((p: any) => {
            const key1 = safe(p.id);
            const key2 = safe(p.user_id);
            const val = {
              full_name: safe(p.full_name),
              email: safe(p.email),
              avatar_url: safe(p.avatar_url),
            };
            if (key1) map.set(String(key1), val);
            if (key2) map.set(String(key2), val);
          });
        }
      }

      return txs.map((t) => {
        const s = t.sender_id ? map.get(t.sender_id) : null;
        const r = t.receiver_id ? map.get(t.receiver_id) : null;
        return {
          ...t,
          sender_name: s?.full_name ?? null,
          sender_email: s?.email ?? null,
          sender_avatar: s?.avatar_url ?? null,
          receiver_name: r?.full_name ?? null,
          receiver_email: r?.email ?? null,
          receiver_avatar: r?.avatar_url ?? null,
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

      const senderLabel = senderName || senderEmail || 'Unknown user';
      const receiverLabel = receiverName || receiverEmail || 'Unknown user';

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
          title: 'Zenopay Card Created',
          subtitleLine1: 'Virtual card created successfully',
          subtitleLine2: tx.id,
          iconName: 'card-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          transactionTypeLabel: 'Virtual Card',
          note: desc || 'Zenopay virtual card has been created.',
          kind: 'virtual_card',
        };
      }

      if (type === 'send' || type === 'receive' || type === 'transfer' || type === 'p2p') {
        const isOutgoing = isOutgoingBySender || isOutgoingByAmount;

        if (isOutgoing) {
          return {
            title: 'Money Sent',
            subtitleLine1: receiverLabel,
            subtitleLine2: receiverEmail && receiverEmail !== receiverLabel ? receiverEmail : tx.id,
            iconName: 'arrow-up-outline',
            isOutgoing: true,
            partyName: receiverLabel,
            partyEmail: receiverEmail || undefined,
            partyAvatar: receiverAvatar || null,
            transactionTypeLabel: 'P2P-Transfer',
            note: desc || `Money sent to ${receiverLabel}`,
            kind: 'send',
          };
        }

        return {
          title: 'You Received Money',
          subtitleLine1: senderLabel,
          subtitleLine2: senderEmail && senderEmail !== senderLabel ? senderEmail : tx.id,
          iconName: 'arrow-down-outline',
          isOutgoing: false,
          partyName: senderLabel,
          partyEmail: senderEmail || undefined,
          partyAvatar: senderAvatar || null,
          transactionTypeLabel: 'P2P-Transfer',
          note: desc || `Money received from ${senderLabel}`,
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
          title: 'You Received Money',
          subtitleLine1: 'Deposit from Zenopay',
          subtitleLine2: tx.id,
          iconName: 'download-outline',
          isOutgoing: false,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          transactionTypeLabel: 'Deposit',
          note: desc || 'Deposit from Zenopay',
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
          title: 'Money Sent',
          subtitleLine1: 'Withdraw to Zenopay',
          subtitleLine2: tx.id,
          iconName: 'cash-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          transactionTypeLabel: 'Withdraw',
          note: desc || 'Withdraw processed by Zenopay',
          kind: 'withdraw',
        };
      }

      if (type.includes('gift') || type === 'gift_card_purchase' || type === 'purchase_giftcard') {
        return {
          title: 'Money Sent',
          subtitleLine1: 'Gift Card Purchase',
          subtitleLine2: tx.id,
          iconName: 'gift-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          transactionTypeLabel: 'Gift Card',
          note: desc || 'Gift card purchased successfully',
          kind: 'giftcard',
        };
      }

      if (type.includes('sim') || type === 'sim_card_purchase' || type === 'purchase_sim') {
        return {
          title: 'Money Sent',
          subtitleLine1: 'SIM Card Purchase',
          subtitleLine2: tx.id,
          iconName: 'cellular-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          transactionTypeLabel: 'SIM Card',
          note: desc || 'SIM card purchased successfully',
          kind: 'sim',
        };
      }

      if (type.includes('mobile') || type === 'purchase_mobile' || type === 'mobile_shop_purchase') {
        return {
          title: 'Money Sent',
          subtitleLine1: 'Mobile Shop Purchase',
          subtitleLine2: tx.id,
          iconName: 'phone-portrait-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          transactionTypeLabel: 'Mobile Shop',
          note: desc || 'Mobile shop purchase completed',
          kind: 'mobile',
        };
      }

      if (type.includes('topup_purchase') || type === 'card_topup' || type === 'topup_purchase') {
        return {
          title: 'Money Sent',
          subtitleLine1: 'Top-Up Charge',
          subtitleLine2: tx.id,
          iconName: 'flash-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          transactionTypeLabel: 'Top-Up',
          note: desc || 'Top-up purchase completed',
          kind: 'topup',
        };
      }

      if (type.includes('purchase') || type === 'buy' || type === 'order') {
        return {
          title: 'Money Sent',
          subtitleLine1: 'Purchase',
          subtitleLine2: tx.id,
          iconName: 'pricetag-outline',
          isOutgoing: true,
          partyName: APP_FAKE_PROFILE_NAME,
          partyEmail: undefined,
          partyAvatar: null,
          transactionTypeLabel: 'Purchase',
          note: desc || 'Purchase completed',
          kind: 'purchase',
        };
      }

      const isOutgoing = isOutgoingBySender || isOutgoingByAmount;
      return {
        title: isOutgoing ? 'Money Sent' : 'You Received Money',
        subtitleLine1: desc || 'Transaction',
        subtitleLine2: tx.id,
        iconName: isOutgoing ? 'arrow-up-outline' : 'arrow-down-outline',
        isOutgoing,
        partyName: APP_FAKE_PROFILE_NAME,
        partyEmail: undefined,
        partyAvatar: null,
        transactionTypeLabel: 'Transaction',
        note: desc || 'Transaction details',
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
      const bucket = [
        tx.id,
        tx.type,
        tx.status,
        tx.description,
        ui.title,
        ui.subtitleLine1,
        ui.subtitleLine2,
        ui.partyName,
        ui.partyEmail,
        ui.transactionTypeLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return bucket.includes(q);
    });
  }, [transactionsQuery.data, searchText, getTxUi]);

  const monthlySummary = useMemo(() => {
    const rows = filteredTransactions || [];
    const groups = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        startBalance: number;
        endBalance: number;
        updatedAt: string;
        cashOutCount: number;
        cashOutAmount: number;
        p2pCount: number;
        p2pAmount: number;
        onlineShoppingCount: number;
        onlineShoppingAmount: number;
        physicalShopCount: number;
        physicalShopAmount: number;
        depositCount: number;
        depositAmount: number;
        dataBundleCount: number;
        dataBundleAmount: number;
        airtimeCount: number;
        airtimeAmount: number;
        onlineCardCount: number;
        onlineCardAmount: number;
      }
    >();

    rows.forEach((tx) => {
      const key = getMonthKey(tx.created_at);
      const ui = getTxUi(tx);
      const existing =
        groups.get(key) ||
        {
          monthKey: key,
          monthLabel: getMonthLabelFromKey(key),
          startBalance: Number(tx.balance_after || 0),
          endBalance: Number(tx.balance_after || 0),
          updatedAt: tx.created_at,
          cashOutCount: 0,
          cashOutAmount: 0,
          p2pCount: 0,
          p2pAmount: 0,
          onlineShoppingCount: 0,
          onlineShoppingAmount: 0,
          physicalShopCount: 0,
          physicalShopAmount: 0,
          depositCount: 0,
          depositAmount: 0,
          dataBundleCount: 0,
          dataBundleAmount: 0,
          airtimeCount: 0,
          airtimeAmount: 0,
          onlineCardCount: 0,
          onlineCardAmount: 0,
        };

      const amount = Math.abs(Number(tx.amount || 0));
      const currentBalance = Number(tx.balance_after || 0);

      if (new Date(tx.created_at).getTime() > new Date(existing.updatedAt).getTime()) {
        existing.updatedAt = tx.created_at;
        existing.endBalance = currentBalance;
      }

      if (new Date(tx.created_at).getTime() < new Date(existing.updatedAt).getTime()) {
        existing.startBalance = currentBalance;
      }

      if (ui.kind === 'withdraw') {
        existing.cashOutCount += 1;
        existing.cashOutAmount += amount;
      } else if (ui.kind === 'send' || ui.kind === 'receive') {
        existing.p2pCount += 1;
        existing.p2pAmount += amount;
      } else if (ui.kind === 'mobile') {
        existing.onlineShoppingCount += 1;
        existing.onlineShoppingAmount += amount;
      } else if (ui.kind === 'sim') {
        existing.physicalShopCount += 1;
        existing.physicalShopAmount += amount;
      } else if (ui.kind === 'deposit') {
        existing.depositCount += 1;
        existing.depositAmount += amount;
      } else if (ui.kind === 'topup') {
        existing.dataBundleCount += 1;
        existing.dataBundleAmount += amount;
        existing.airtimeCount += 1;
        existing.airtimeAmount += amount;
      } else if (ui.kind === 'giftcard' || ui.kind === 'virtual_card') {
        existing.onlineCardCount += 1;
        existing.onlineCardAmount += amount;
      }

      groups.set(key, existing);
    });

    return Array.from(groups.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredTransactions, getTxUi]);

  const { refetch, isRefetching } = transactionsQuery;

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const selectedUi = useMemo(() => {
    if (!selectedTx) return null;
    return getTxUi(selectedTx);
  }, [selectedTx, getTxUi]);

  const buildTransactionHtml = useCallback((tx: TransactionData) => {
    const ui = getTxUi(tx);
    const amount = Math.abs(Number(tx.amount || 0));
    const fee = 0;
    const total = amount + fee;
    const status = statusLabel(tx.status);
    const partyEmail = ui.partyEmail || '';
    const note = ui.note || '';
    const dateText = formatFullDate(tx.created_at);
    const timeText = formatTime(tx.created_at);

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
            body {
              margin: 0;
              padding: 32px;
              background: #f5f8fc;
              color: #1E2A4A;
            }
            .sheet {
              background: #ffffff;
              border-radius: 20px;
              padding: 28px;
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
              padding: 18px 0;
              border-top: 1px solid #edf2f7;
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
                  <div class="small">${APP_NAME} Transaction Statement</div>
                </div>
              </div>
              <div class="dateBox">
                <div>${dateText}</div>
                <div>${timeText}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">Transaction ID</div>
                <div class="value">${tx.id}</div>
              </div>
              <div style="text-align:right;">
                <div class="label">Status</div>
                <div class="value">${status}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">Transaction Type</div>
                <div class="value">${ui.transactionTypeLabel}</div>
              </div>
              <div>
                <span class="badge">${ui.transactionTypeLabel}</span>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">${ui.isOutgoing ? 'Sent To' : 'Received From'}</div>
                <div class="partyBox">
                  <div class="partyAvatar">${ui.partyName?.slice(0, 1)?.toUpperCase() || 'Z'}</div>
                  <div>
                    <div class="value">${ui.partyName}</div>
                    <div class="small">${partyEmail}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">Transaction Amount</div>
                <div class="amount">${formatIQD(amount)}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">Transaction Fee</div>
                <div class="value">${formatIQD(fee)}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">Transaction Total Amount</div>
                <div class="amount">${formatIQD(total)}</div>
              </div>
            </div>

            ${
              tx.balance_after !== null
                ? `
              <div class="row">
                <div>
                  <div class="label">Balance After Transaction</div>
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
                <strong>Note:</strong><br/>
                ${String(note).replace(/\n/g, '<br/>')}
              </div>
            `
                : ''
            }
          </div>
        </body>
      </html>
    `;
  }, [getTxUi]);

  const handleDownloadPdf = useCallback(async () => {
    if (!selectedTx) return;
    try {
      setPdfLoading(true);
      const html = buildTransactionHtml(selectedTx);
      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `transaction-${selectedTx.id}.pdf`;
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: newPath });

      Alert.alert('Success', `PDF saved successfully`);
    } catch (e) {
      console.log('PDF save error', e);
      Alert.alert('Error', 'Could not save PDF');
    } finally {
      setPdfLoading(false);
    }
  }, [selectedTx, buildTransactionHtml]);

  const handleSharePdf = useCallback(async () => {
    if (!selectedTx) return;
    try {
      setPdfLoading(true);
      const html = buildTransactionHtml(selectedTx);
      const { uri } = await Print.printToFileAsync({ html });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Not available', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share transaction PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      console.log('PDF share error', e);
      Alert.alert('Error', 'Could not share PDF');
    } finally {
      setPdfLoading(false);
    }
  }, [selectedTx, buildTransactionHtml]);

  const renderTransaction = ({ item }: { item: TransactionData }) => {
    const ui = getTxUi(item);
    const statusColors = getStatusColors(item.status);
    const rawAmount = Math.abs(Number(item.amount || 0));

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.txCard, isRTL && styles.txCardRTL]}
        onPress={() => setSelectedTx(item)}
      >
        <View style={[styles.txTopRow, isRTL && styles.txTopRowRTL]}>
          <View style={[styles.txLeft, isRTL && styles.txLeftRTL]}>
            <View
              style={[
                styles.txIconBox,
                { backgroundColor: ui.isOutgoing ? UI.redSoft : UI.greenSoft },
              ]}
            >
              <Ionicons
                name={ui.iconName}
                size={24}
                color={ui.isOutgoing ? UI.red : UI.green}
              />
            </View>

            <View style={[styles.txInfo, isRTL && styles.txInfoRTL]}>
              <Text style={[styles.txTitle, { color: ui.isOutgoing ? UI.red : UI.green }, isRTL && styles.textRTL]}>
                {ui.title}
              </Text>

              <Text style={[styles.txSubtitleMain, isRTL && styles.textRTL]} numberOfLines={1}>
                {ui.subtitleLine1}
              </Text>

              {!!ui.partyEmail && ui.partyEmail !== ui.subtitleLine1 && (
                <Text style={[styles.txSubtitleSmall, isRTL && styles.textRTL]} numberOfLines={1}>
                  {ui.partyEmail}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.txRight, isRTL && styles.txRightRTL]}>
            <Text
              style={[
                styles.txAmount,
                { color: ui.isOutgoing ? UI.red : UI.green },
                isRTL && styles.textRTL,
              ]}
            >
              {formatIQD(rawAmount)}
            </Text>

            <Text style={[styles.txId, isRTL && styles.textRTL]} numberOfLines={1}>
              {item.id}
            </Text>
          </View>
        </View>

        <View style={[styles.txBottomRow, isRTL && styles.txBottomRowRTL]}>
          <Text style={[styles.txDate, isRTL && styles.textRTL]}>
            {formatListDate(item.created_at)} {formatTime(item.created_at)}
          </Text>

          <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusPillText, { color: statusColors.color }]}>
              {ui.isOutgoing ? 'Debit' : 'Credit'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSummaryCard = (item: (typeof monthlySummary)[number]) => {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryMonthHeader}>
          <TouchableOpacity activeOpacity={0.8} style={styles.monthArrowBtn}>
            <Ionicons name="chevron-back" size={22} color={UI.text3} />
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.summaryMonthTitle}>{item.monthLabel}</Text>
            <Text style={styles.summaryUpdatedAt}>
              Last update {formatTime(item.updatedAt)}
            </Text>
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.monthArrowBtn}>
            <Ionicons name="chevron-forward" size={22} color={UI.text3} />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceSplitRow}>
          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>Start Balance</Text>
            <Text style={styles.balanceValue}>{formatIQD(item.startBalance)}</Text>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>End Balance</Text>
            <Text style={styles.balanceValue}>{formatIQD(item.endBalance)}</Text>
          </View>
        </View>

        {renderSummaryLine('Cash-Out', item.cashOutCount, item.cashOutAmount)}
        {renderSummaryLine('P2P-Transfer', item.p2pCount, item.p2pAmount)}
        {renderSummaryLine('Online-Shopping', item.onlineShoppingCount, item.onlineShoppingAmount)}
        {renderSummaryLine('Physical-Shop', item.physicalShopCount, item.physicalShopAmount)}
        {renderSummaryLine('Deposit/Cash Card', item.depositCount, item.depositAmount)}
        {renderSummaryLine('Data Bundle', item.dataBundleCount, item.dataBundleAmount)}
        {renderSummaryLine('Airtime', item.airtimeCount, item.airtimeAmount)}
        {renderSummaryLine('Online-Card', item.onlineCardCount, item.onlineCardAmount)}
      </View>
    );
  };

  function renderSummaryLine(title: string, count: number, amount: number) {
    return (
      <View style={styles.summaryLine}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLineTitle}>{title}</Text>
          <Text style={styles.summaryLineSub}>{count} times</Text>
        </View>
        <Text style={styles.summaryLineAmount}>{formatIQD(amount)}</Text>
      </View>
    );
  }

  if (transactionsQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={UI.primary} size="large" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.premiumHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={UI.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Transactions</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.errorStateContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={46} color={UI.red} />
          </View>
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorMessage}>Could not load transactions</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => transactionsQuery.refetch()} activeOpacity={0.9}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentBalance =
    transactionsQuery.data?.[0]?.balance_after !== null && transactionsQuery.data?.[0]?.balance_after !== undefined
      ? Number(transactionsQuery.data?.[0]?.balance_after || 0)
      : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.page }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.premiumHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={UI.text} />
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Transactions</Text>

        <TouchableOpacity activeOpacity={0.85} onPress={() => refetch()} style={styles.headerActionBtn}>
          <Ionicons name="refresh-outline" size={20} color={UI.primaryDark} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'history' ? filteredTransactions : monthlySummary}
        keyExtractor={(item: any) => item.id || item.monthKey}
        renderItem={({ item }: any) =>
          activeTab === 'history' ? renderTransaction({ item }) : renderSummaryCard(item)
        }
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
            <View style={styles.balanceHero}>
              <View style={styles.balanceHeroCircle1} />
              <View style={styles.balanceHeroCircle2} />

              <View style={styles.balanceTopRow}>
                <View>
                  <Text style={styles.balanceHeroTitle}>Account Balance</Text>
                  <Text style={styles.balanceHeroSubtitle}>
                    All your money movements in one place
                  </Text>
                </View>

                <View style={styles.balanceCurrencyPill}>
                  <Ionicons name="wallet-outline" size={22} color="#fff" />
                  <Text style={styles.balanceCurrencyText}>IQD</Text>
                </View>
              </View>

              <View style={styles.balanceValueRow}>
                <Text style={styles.balanceHeroAmount}>{formatIQD(currentBalance)}</Text>
              </View>
            </View>

            <View style={styles.tabWrap}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setActiveTab('history')}
                style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                  Transaction History
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setActiveTab('summary')}
                style={[styles.tabBtn, activeTab === 'summary' && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
                  Summary
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'history' && (
              <View style={styles.searchBox}>
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Filter for transaction"
                  placeholderTextColor={UI.text2}
                  style={styles.searchInput}
                />
                <Ionicons name="filter-outline" size={24} color={UI.text2} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={44} color={UI.text2} />
            </View>
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptySubtitle}>Your transactions will appear here.</Text>
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
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedTx(null)} activeOpacity={0.85}>
              <Ionicons name="close" size={24} color={UI.text} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Transaction Details</Text>

            <View style={{ width: 42 }} />
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
                    onPress={handleDownloadPdf}
                    disabled={pdfLoading}
                  >
                    <Ionicons name="download-outline" size={20} color={UI.text} />
                    <Text style={styles.invoiceActionText}>
                      {pdfLoading ? 'Please wait...' : 'Download PDF'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.invoiceActionBtn}
                    activeOpacity={0.9}
                    onPress={handleSharePdf}
                    disabled={pdfLoading}
                  >
                    <Ionicons name="share-social-outline" size={20} color={UI.text} />
                    <Text style={styles.invoiceActionText}>Share PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailTopDateRow}>
                  <Text style={styles.detailDateText}>{formatFullDate(selectedTx.created_at)}</Text>
                  <Text style={styles.detailTimeText}>{formatTime(selectedTx.created_at)}</Text>
                </View>

                {renderDetailRow('Transaction ID', selectedTx.id, true)}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction Type</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{selectedUi.transactionTypeLabel}</Text>
                  </View>
                </View>

                <View style={styles.detailPartySection}>
                  <Text style={styles.detailLabel}>
                    {selectedUi.isOutgoing ? 'Sent To' : 'Received From'}
                  </Text>

                  <View style={styles.detailPartyBox}>
                    {selectedUi.partyAvatar ? (
                      <Image source={{ uri: selectedUi.partyAvatar }} style={styles.partyAvatarImage} />
                    ) : (
                      <View style={styles.partyFallbackAvatar}>
                        <Ionicons
                          name={
                            selectedUi.partyName === APP_FAKE_PROFILE_NAME
                              ? (APP_DEFAULT_ICON as any)
                              : 'person-outline'
                          }
                          size={26}
                          color={UI.primaryDark}
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

                        {selectedUi.partyName === APP_FAKE_PROFILE_NAME && (
                          <Ionicons name="checkmark-circle" size={18} color={UI.green} />
                        )}
                      </View>

                      {!!selectedUi.partyEmail && (
                        <Text style={styles.partyEmail}>{selectedUi.partyEmail}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {renderDetailRow('Transaction Amount', formatIQD(Math.abs(Number(selectedTx.amount || 0))), false, selectedUi.isOutgoing ? UI.red : UI.green)}
                {renderDetailRow('Transaction Fee', formatIQD(0), false, UI.green)}
                {renderDetailRow('Transaction Total Amount', formatIQD(Math.abs(Number(selectedTx.amount || 0))), false, selectedUi.isOutgoing ? UI.red : UI.green)}

                {selectedTx.balance_after !== null && selectedTx.balance_after !== undefined &&
                  renderDetailRow('Balance After', formatIQD(selectedTx.balance_after), false, UI.primaryDark)}

                {renderDetailRow('Status', statusLabel(selectedTx.status), false, getStatusColors(selectedTx.status).color)}

                {!!selectedUi.note && (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>Note</Text>
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
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  premiumHeader: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: UI.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },

  listContent: {
    paddingBottom: 28,
  },

  balanceHero: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 32,
    padding: 22,
    backgroundColor: '#6A39F5',
    overflow: 'hidden',
  },

  balanceHeroCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
    left: -120,
    bottom: -110,
  },

  balanceHeroCircle2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.10)',
    right: -70,
    top: -50,
  },

  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  balanceHeroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },

  balanceHeroSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 220,
  },

  balanceCurrencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },

  balanceCurrencyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  balanceValueRow: {
    marginTop: 28,
  },

  balanceHeroAmount: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  tabWrap: {
    marginHorizontal: 16,
    flexDirection: 'row',
    backgroundColor: UI.tabBg,
    borderRadius: 24,
    padding: 6,
    marginBottom: 14,
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: UI.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  tabText: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text2,
  },

  tabTextActive: {
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
  },

  txTopRowRTL: {
    flexDirection: 'row-reverse',
  },

  txLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },

  txLeftRTL: {
    flexDirection: 'row-reverse',
    marginRight: 0,
    marginLeft: 12,
  },

  txIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  txInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  txInfoRTL: {
    alignItems: 'flex-end',
  },

  txTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  txSubtitleMain: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: UI.text,
  },

  txSubtitleSmall: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: UI.text2,
  },

  txRight: {
    alignItems: 'flex-end',
  },

  txRightRTL: {
    alignItems: 'flex-start',
  },

  txAmount: {
    fontSize: 17,
    fontWeight: '900',
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

  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: 'hidden',
  },

  summaryMonthHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  monthArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryMonthTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  summaryUpdatedAt: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: UI.text2,
  },

  balanceSplitRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },

  balanceBox: {
    flex: 1,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceDivider: {
    width: 1,
    backgroundColor: UI.border,
  },

  balanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
  },

  balanceValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  summaryLine: {
    minHeight: 86,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryLineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
  },

  summaryLineSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: UI.text2,
  },

  summaryLineAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    marginLeft: 12,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: UI.page,
  },

  modalHeader: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: UI.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: 18,
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
  },

  invoiceTopLeft: {
    justifyContent: 'center',
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
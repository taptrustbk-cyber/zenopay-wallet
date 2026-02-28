import { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext'; // keep (not breaking)
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Stack, useRouter } from 'expo-router';

const UI = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#16A34A',
  greenSoft: '#EAF7F1',
  red: '#EF4444',
  amber: '#F59E0B',
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

  // enriched
  sender_name?: string | null;
  sender_email?: string | null;
  receiver_name?: string | null;
  receiver_email?: string | null;
}

type TxUi = {
  title: string;
  subtitleLine1: string;
  subtitleLine2?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isOutgoing: boolean;
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

const isProbablyAdminLabel = (text?: string | null) => {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('admin') || t.includes('agent') || t.includes('zanopay') || t.includes('zenopay');
};

// i18n helper: if key missing, use fallback
const tOr = (key: string, fallback: string) => {
  const v = i18n.t(key) as unknown as string;
  if (!v) return fallback;
  return v === key ? fallback : v;
};

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme(); // keep theme (not used for colors)
  const isRTL = I18nManager.isRTL;

  const myId = user?.id || '';

  const transactionsQuery = useQuery({
    queryKey: ['transactions', myId],
    queryFn: async () => {
      if (!myId) throw new Error('User ID not found');

      // ✅ IMPORTANT FIX:
      // show ALL tx where I am involved (user_id OR sender_id OR receiver_id)
      const { data, error } = await supabase
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

      if (error) {
        console.log('Transaction fetch error:', JSON.stringify(error));
        throw new Error('Failed to fetch transactions');
      }

      let txs = (data || []) as TransactionData[];

      // optional: synthetic initial deposit if user has balance but no tx
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
              description: tOr('zenopayAgentDeposit', 'Deposit by Zenopay agent'),
              created_at: when,
              sender_id: null,
              receiver_id: null,
              balance_after: bal,
            };
            return [synthetic];
          }
        }
      }

      // enrich sender/receiver names/emails
      const ids = Array.from(
        new Set(
          txs
            .flatMap((t) => [t.sender_id, t.receiver_id])
            .filter((x): x is string => !!x)
        )
      );

      if (!ids.length) return txs;

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);

      if (pErr) {
        console.log('Profiles fetch error:', JSON.stringify(pErr));
        return txs;
      }

      const map = new Map<string, { full_name: string | null; email: string | null }>();
      (profiles || []).forEach((p: any) => {
        map.set(String(p.id), { full_name: safe(p.full_name), email: safe(p.email) });
      });

      return txs.map((t) => {
        const s = t.sender_id ? map.get(t.sender_id) : null;
        const r = t.receiver_id ? map.get(t.receiver_id) : null;
        return {
          ...t,
          sender_name: s?.full_name ?? null,
          sender_email: s?.email ?? null,
          receiver_name: r?.full_name ?? null,
          receiver_email: r?.email ?? null,
        };
      });
    },
    enabled: !!myId,
    staleTime: 0,
    gcTime: 0,
  });

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const statusLabel = useCallback((raw: string) => {
    const s = String(raw || 'completed').toLowerCase();
    if (s === 'completed' || s === 'success' || s === 'paid') return i18n.t('txStatusCompleted');
    if (s === 'pending' || s === 'processing') return i18n.t('txStatusPending');
    if (s === 'failed' || s === 'rejected' || s === 'canceled') return i18n.t('txStatusFailed');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  const getTxUi = useCallback(
    (tx: TransactionData): TxUi => {
      const type = String(tx.type || '').toLowerCase();
      const desc = safe(tx.description);

      const senderName = safe(tx.sender_name) || i18n.t('unknownUser');
      const receiverName = safe(tx.receiver_name) || i18n.t('unknownUser');
      const senderEmail = safe(tx.sender_email);
      const receiverEmail = safe(tx.receiver_email);

      const isOutgoingBySender = tx.sender_id === myId;
      const isOutgoingByAmount = Number(tx.amount || 0) < 0;

      // helpers
      const descLower = (desc || '').toLowerCase();

      const isVirtualCard =
        type.includes('virtual') ||
        type === 'virtual_card_create' ||
        type === 'create_virtual_card' ||
        type === 'purchase_virtual_card' ||
        descLower.includes('virtual card') ||
        descLower.includes('card create');

      if (isVirtualCard) {
        return {
          title: i18n.t('virtualCardCreated'),
          subtitleLine1: i18n.t('virtualCardCreation'),
          subtitleLine2: i18n.t('virtualCardInternalNotice'),
          iconName: 'card-outline',
          isOutgoing: true,
          kind: 'virtual_card',
        };
      }

      // send/receive (transfer)
      if (type === 'send' || type === 'receive' || type === 'transfer' || type === 'p2p') {
        const isOutgoing = isOutgoingBySender || isOutgoingByAmount;

        if (isOutgoing) {
          return {
            title: i18n.t('sent'),
            subtitleLine1: `${i18n.t('to')}: ${receiverName}`,
            subtitleLine2: receiverEmail ? receiverEmail : undefined,
            iconName: 'arrow-up-outline',
            isOutgoing: true,
            kind: 'send',
          };
        }

        return {
          title: i18n.t('received'),
          subtitleLine1: `${i18n.t('from')}: ${senderName}`,
          subtitleLine2: senderEmail ? senderEmail : undefined,
          iconName: 'arrow-down-outline',
          isOutgoing: false,
          kind: 'receive',
        };
      }

      // deposits / admin add / agent add
      if (
        type === 'deposit' ||
        type === 'admin_add' ||
        type === 'agent_add' ||
        type === 'topup' ||
        type === 'top_up' ||
        type === 'add_balance'
      ) {
        return {
          title: i18n.t('deposit'),
          subtitleLine1: desc || tOr('zenopayAgentDeposit', 'Deposit by Zenopay agent'),
          iconName: 'download-outline',
          isOutgoing: false,
          kind: 'deposit',
        };
      }

      // withdraw
      if (
        type === 'withdraw' ||
        type === 'admin_withdraw' ||
        type === 'agent_withdraw' ||
        type === 'withdraw_balance'
      ) {
        const label = desc && isProbablyAdminLabel(desc) ? desc : i18n.t('zanopayAgentWithdraw');
        return {
          title: i18n.t('withdraw'),
          subtitleLine1: label,
          iconName: 'cash-outline',
          isOutgoing: true,
          kind: 'withdraw',
        };
      }

      // TOPUP purchase
      if (type.includes('topup_purchase') || type === 'card_topup' || type === 'topup_purchase') {
        return {
          title: i18n.t('cardTopupPurchase'),
          subtitleLine1: desc || i18n.t('cardTopupPurchaseSubtitle'),
          iconName: 'flash-outline',
          isOutgoing: true,
          kind: 'topup',
        };
      }

      // Gift card purchase
      if (type.includes('gift') || type === 'gift_card_purchase' || type === 'purchase_giftcard') {
        return {
          title: i18n.t('giftCardPurchase'),
          subtitleLine1: desc || i18n.t('giftCardPurchaseSubtitle'),
          iconName: 'gift-outline',
          isOutgoing: true,
          kind: 'giftcard',
        };
      }

      // Mobile shop purchase
      if (type.includes('mobile') || type === 'purchase_mobile' || type === 'mobile_shop_purchase') {
        return {
          title: i18n.t('mobilePurchase'),
          subtitleLine1: desc || i18n.t('mobileShop'),
          iconName: 'phone-portrait-outline',
          isOutgoing: true,
          kind: 'mobile',
        };
      }

      // SIM card purchase
      if (type.includes('sim') || type === 'sim_card_purchase' || type === 'purchase_sim') {
        return {
          title: i18n.t('simCardPurchase'),
          subtitleLine1: desc || i18n.t('simCardPurchaseSubtitle'),
          iconName: 'cellular-outline',
          isOutgoing: true,
          kind: 'sim',
        };
      }

      // generic purchases
      if (type.includes('purchase') || type === 'buy' || type === 'order') {
        return {
          title: i18n.t('purchase'),
          subtitleLine1: desc || i18n.t('purchaseSubtitle'),
          iconName: 'pricetag-outline',
          isOutgoing: true,
          kind: 'purchase',
        };
      }

      // fallback
      const isOutgoing = isOutgoingBySender || isOutgoingByAmount;
      return {
        title: i18n.t('transaction'),
        subtitleLine1: desc || i18n.t('transactionSubtitle'),
        iconName: isOutgoing ? 'arrow-up-outline' : 'arrow-down-outline',
        isOutgoing,
        kind: 'other',
      };
    },
    [myId]
  );

  const { refetch, isRefetching } = transactionsQuery;

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderTransaction = ({ item }: { item: TransactionData }) => {
    const ui = getTxUi(item);

    const statusRaw = String(item.status || 'completed').toLowerCase();
    const abs = Math.abs(Number(item.amount || 0));

    const statusBg =
      statusRaw === 'completed' || statusRaw === 'success' || statusRaw === 'paid'
        ? 'rgba(22,163,74,0.12)'
        : statusRaw === 'pending' || statusRaw === 'processing'
        ? '#FEF3C7'
        : '#FEE2E2';

    const statusColor =
      statusRaw === 'completed' || statusRaw === 'success' || statusRaw === 'paid'
        ? UI.green
        : statusRaw === 'pending' || statusRaw === 'processing'
        ? UI.amber
        : UI.red;

    const amountColor = ui.isOutgoing ? UI.red : UI.green;
    const sign = ui.isOutgoing ? '-' : '+';
    const amountText = `${sign}$${abs.toFixed(2)}`;

    return (
      <View style={[styles.card, isRTL && styles.cardRTL]}>
        <View style={[styles.cardLeft, isRTL && styles.cardLeftRTL]}>
          <View
            style={[
              styles.iconContainer,
              isRTL ? styles.iconContainerRTL : styles.iconContainerLTR,
              { backgroundColor: ui.isOutgoing ? '#FEE2E2' : 'rgba(22,163,74,0.14)' },
            ]}
          >
            <Ionicons name={ui.iconName} size={20} color={ui.isOutgoing ? UI.red : UI.green} />
          </View>

          <View style={[styles.cardDetails, isRTL && styles.cardDetailsRTL]}>
            <Text style={[styles.cardTitle, isRTL && styles.textRTL]} numberOfLines={1}>
              {ui.title}
            </Text>

            <Text style={[styles.cardSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>
              {ui.subtitleLine1}
            </Text>

            {!!ui.subtitleLine2 && (
              <Text style={[styles.cardSubSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>
                {ui.subtitleLine2}
              </Text>
            )}

            <Text style={[styles.cardDate, isRTL && styles.textRTL]}>
              {formatDateTime(item.created_at)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardRight, isRTL && styles.cardRightRTL]}>
          <Text style={[styles.cardAmount, { color: amountColor }, isRTL && styles.amountRTL]}>
            {amountText}
          </Text>

          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel(statusRaw)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (transactionsQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={UI.green} size="large" />
          <Text style={styles.loadingText}>{i18n.t('loadingTransactions')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={UI.text} />
            <Text style={[styles.headerBack, isRTL && styles.textRTL]}>{i18n.t('back')}</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{i18n.t('transactions')}</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.errorStateContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={46} color={UI.red} />
          </View>

          <Text style={styles.errorTitle}>{i18n.t('failedToLoad')}</Text>
          <Text style={styles.errorMessage}>{i18n.t('errorLoadingTransactions')}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => transactionsQuery.refetch()} activeOpacity={0.9}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{i18n.t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={transactionsQuery.data}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={UI.green}
            colors={[UI.green]}
          />
        }
        ListHeaderComponent={
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={UI.text} />
              <Text style={[styles.headerBack, isRTL && styles.textRTL]}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{i18n.t('transactions')}</Text>
            <View style={{ width: 70 }} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={44} color={UI.text2} />
            </View>
            <Text style={styles.emptyTitle}>{i18n.t('noTransactions')}</Text>
            <Text style={styles.emptySubtitle}>{i18n.t('transactionsWillAppear')}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: UI.bg,
  },
  headerRTL: { flexDirection: 'row-reverse' },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 90 },
  headerBack: { fontSize: 14, fontWeight: '900', color: UI.text },
  headerTitle: { fontSize: 17, fontWeight: '900', color: UI.text },

  listContent: { paddingBottom: 28 },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardRTL: { flexDirection: 'row-reverse' },

  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardLeftRTL: { flexDirection: 'row-reverse' },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerLTR: { marginRight: 12 },
  iconContainerRTL: { marginLeft: 12 },

  cardDetails: { flex: 1 },
  cardDetailsRTL: { alignItems: 'flex-end' },

  cardTitle: { fontSize: 15, fontWeight: '900', color: UI.text },
  cardSubtitle: { fontSize: 13, fontWeight: '800', color: UI.text2, marginTop: 4 },
  cardSubSubtitle: { fontSize: 12, fontWeight: '700', color: UI.text2, marginTop: 2 },
  cardDate: { fontSize: 12, fontWeight: '700', color: UI.text2, marginTop: 6 },

  cardRight: { alignItems: 'flex-end', marginLeft: 10 },
  cardRightRTL: { alignItems: 'flex-start', marginLeft: 0, marginRight: 10 },

  cardAmount: { fontSize: 16, fontWeight: '900' },
  amountRTL: { textAlign: 'left' },

  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, marginTop: 8 },
  statusText: { fontSize: 11, fontWeight: '900' },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '800', color: UI.text2, textAlign: 'center' },

  emptyState: { paddingTop: 70, paddingHorizontal: 20, alignItems: 'center' },
  emptyIconContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#EEF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: UI.text, marginBottom: 8 },
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
  errorTitle: { fontSize: 18, fontWeight: '900', color: UI.text, textAlign: 'center' },
  errorMessage: { fontSize: 14, fontWeight: '700', color: UI.text2, textAlign: 'center', lineHeight: 20 },

  primaryBtn: {
    marginTop: 8,
    backgroundColor: UI.green,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  textRTL: { textAlign: 'right' },
});

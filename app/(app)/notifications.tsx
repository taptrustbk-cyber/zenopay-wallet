import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';

type OrderStatus = 'all' | 'pending' | 'success' | 'cancelled';
type OrderSource = 'sim' | 'gift';

interface NotificationOrderRow {
  id: string;
  user_id: string;
  item_id: string | null;
  card_title: string | null;
  provider: string | null;
  amount_iqd: number | null;
  price_iqd: number | null;
  status: string | null;
  pin_code: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;
  source: OrderSource;
  image_url?: string | null;
}

interface CardLookupRow {
  id: string;
  card_title?: string | null;
  title?: string | null;
  provider?: string | null;
  amount_iqd?: number | null;
  amount?: number | null;
  price_iqd?: number | null;
  image_url?: string | null;
  brand?: string | null;
  category?: string | null;
}

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
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  success: '#16A34A',
  successSoft: '#EAF8EF',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#F43F5E',
  dangerSoft: '#FFF1F4',

  purple: '#7C3AED',
  purpleSoft: '#F5F3FF',

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

const providerConfig: Record<
  string,
  {
    label: string;
    color: string;
    soft: string;
    border: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  korek: {
    label: 'Korek',
    color: '#1570A6',
    soft: '#EEF7FF',
    border: '#CDE5F7',
    icon: 'phone-portrait-outline',
  },
  zain: {
    label: 'Zain',
    color: '#7C3AED',
    soft: '#F5F3FF',
    border: '#DDD6FE',
    icon: 'radio-outline',
  },
  asiacell: {
    label: 'AsiaCell',
    color: '#D53434',
    soft: '#FFF1F1',
    border: '#F6CACA',
    icon: 'cellular-outline',
  },
  ftth: {
    label: 'FTTH',
    color: '#2563EB',
    soft: '#EFF6FF',
    border: '#BFDBFE',
    icon: 'wifi-outline',
  },
  fasthope: {
    label: 'Fast Hope',
    color: '#DB2777',
    soft: '#FDF2F8',
    border: '#FBCFE8',
    icon: 'heart-outline',
  },
  kurdtel: {
    label: 'Kurdtel',
    color: '#475569',
    soft: '#F8FAFC',
    border: '#E2E8F0',
    icon: 'call-outline',
  },
};

function isBadTranslationValue(value: unknown, originalKey?: string) {
  const str = String(value ?? '').trim();

  if (!str) return true;
  if (originalKey && str === originalKey) return true;

  const lower = str.toLowerCase();

  return (
    lower.includes('[missing') ||
    lower.includes('translation]') ||
    lower.includes('missing "') ||
    lower.includes('missing translation')
  );
}

function tSafe(key: string, fallback: string) {
  try {
    const direct = i18n.t(key);
    if (!isBadTranslationValue(direct, key)) {
      return String(direct).trim();
    }

    const flatKey = key.replace(/\./g, '_');
    const flat = i18n.t(flatKey);
    if (!isBadTranslationValue(flat, flatKey)) {
      return String(flat).trim();
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function getProviderStyle(provider?: string | null, source?: OrderSource) {
  const key = String(provider || '').toLowerCase();

  if (providerConfig[key]) return providerConfig[key];

  return {
    label:
      provider ||
      (source === 'gift'
        ? tSafe('notifications.giftCardLabel', 'Gift Card')
        : tSafe('notifications.unknownCard', 'Unknown Card')),
    color: source === 'gift' ? UI.purple : UI.blue,
    soft: source === 'gift' ? UI.purpleSoft : UI.blueSoft,
    border: source === 'gift' ? '#E9D5FF' : UI.border,
    icon: source === 'gift' ? ('gift-outline' as const) : ('card-outline' as const),
  };
}

function formatIQD(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
}

function normalizeStatus(status?: string | null): Exclude<OrderStatus, 'all'> {
  const s = String(status || '').toLowerCase();

  if (['success', 'approved', 'completed', 'done'].includes(s)) return 'success';
  if (['cancelled', 'canceled', 'rejected', 'failed'].includes(s)) return 'cancelled';
  return 'pending';
}

function mapTopupOrder(row: any): NotificationOrderRow {
  return {
    id: String(row?.id || ''),
    user_id: String(row?.user_id || ''),
    item_id: row?.topup_card_id ?? null,
    card_title: row?.card_title ?? null,
    provider: row?.provider ?? null,
    amount_iqd:
      row?.amount_iqd !== null && row?.amount_iqd !== undefined
        ? Number(row.amount_iqd)
        : null,
    price_iqd:
      row?.price_iqd !== null && row?.price_iqd !== undefined
        ? Number(row.price_iqd)
        : null,
    status: row?.status ?? null,
    pin_code: row?.pin_code ?? null,
    notes: row?.notes ?? null,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    source: 'sim',
    image_url: row?.image_url ?? null,
  };
}

function mapGiftOrder(row: any): NotificationOrderRow {
  return {
    id: String(row?.id || ''),
    user_id: String(row?.user_id || ''),
    item_id: row?.gift_card_id ?? row?.card_id ?? null,
    card_title: row?.card_title ?? row?.gift_card_title ?? row?.title ?? null,
    provider: row?.provider ?? row?.brand ?? row?.category ?? null,
    amount_iqd:
      row?.amount_iqd !== null && row?.amount_iqd !== undefined
        ? Number(row.amount_iqd)
        : row?.amount !== null && row?.amount !== undefined
        ? Number(row.amount)
        : null,
    price_iqd:
      row?.price_iqd !== null && row?.price_iqd !== undefined
        ? Number(row.price_iqd)
        : null,
    status: row?.status ?? null,
    pin_code: row?.pin_code ?? null,
    notes: row?.notes ?? null,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    source: 'gift',
    image_url: row?.image_url ?? null,
  };
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function buildDisplayTitle(order: NotificationOrderRow) {
  const providerStyle = getProviderStyle(order.provider, order.source);
  const title = String(order.card_title || '').trim();
  const amountText = order.amount_iqd ? formatIQD(order.amount_iqd) : '';

  if (title) return title;
  if (amountText) return `${providerStyle.label} ${amountText}`;
  return providerStyle.label;
}

function extractValueFromNotes(notes?: string | null, labels: string[] = []) {
  const text = String(notes || '');
  if (!text.trim()) return '';

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    for (const label of labels) {
      const lowerLine = line.toLowerCase();
      const lowerLabel = `${label.toLowerCase()}:`;
      if (lowerLine.startsWith(lowerLabel)) {
        return line.slice(lowerLabel.length).trim();
      }
    }
  }

  return '';
}

function parseOrderExtraInfo(notes?: string | null) {
  const playerId = extractValueFromNotes(notes, ['Player ID', 'Game ID', 'Player Id']);
  const accountName = extractValueFromNotes(notes, [
    'PUBG Account Name',
    'Pubg Account Name',
    'Account Name',
    'Profile Name',
  ]);
  const profileUrl = extractValueFromNotes(notes, ['Profile URL', 'Profile Url', 'URL', 'Url']);

  return {
    playerId,
    accountName,
    profileUrl,
  };
}

function removeSubmittedInfoFromNotes(notes?: string | null) {
  const text = String(notes || '');
  if (!text.trim()) return '';

  const removablePrefixes = [
    'player id:',
    'game id:',
    'pubg account name:',
    'account name:',
    'profile name:',
    'profile url:',
    'url:',
  ];

  const cleanLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const lower = line.toLowerCase();
      return !removablePrefixes.some((prefix) => lower.startsWith(prefix));
    });

  return cleanLines.join('\n').trim();
}

function buildGiftAmount(order: NotificationOrderRow, fallbackProvider?: string) {
  const raw = Number(order.amount_iqd || 0);
  const joined = `${String(order.card_title || '')} ${String(order.provider || fallbackProvider || '')}`.toLowerCase();

  if (joined.includes('pubg') || joined.includes('uc')) return `${formatIQD(raw)} UC`;
  if (joined.includes('tiktok') || joined.includes('coin')) return `${formatIQD(raw)} Coins`;
  if (joined.includes('free fire') || joined.includes('diamond')) return `${formatIQD(raw)} Diamonds`;

  return `${formatIQD(raw)}`;
}

function buildDisplaySubtitle(order: NotificationOrderRow) {
  const providerStyle = getProviderStyle(order.provider, order.source);
  const amountText =
    order.source === 'gift'
      ? String(order.amount_iqd ? buildGiftAmount(order, providerStyle.label) : '')
      : order.amount_iqd
      ? `${formatIQD(order.amount_iqd)} IQD`
      : '';
  const priceText = order.price_iqd ? `${formatIQD(order.price_iqd)} IQD` : '';

  if (amountText && priceText) {
    return `${providerStyle.label} • ${amountText} • ${priceText}`;
  }

  if (amountText) return `${providerStyle.label} • ${amountText}`;
  return providerStyle.label;
}

async function syncSuccessfulOrdersToTransactions(orders: NotificationOrderRow[]) {
  const successOrders = orders.filter((order) => normalizeStatus(order.status) === 'success');

  if (!successOrders.length) return;

  for (const order of successOrders) {
    const sourceTable = order.source === 'gift' ? 'gift_card_orders' : 'topup_orders';
    const txType = order.source === 'gift' ? 'gift_card_purchase' : 'topup_purchase';
    const paidAmount = Number(order.price_iqd || 0);

    if (!order.user_id || !order.id || !paidAmount) continue;

    const metadata = {
      order_id: order.id,
      card_name: buildDisplayTitle(order),
      provider_name: order.provider,
      amount_iqd: Number(order.amount_iqd || 0),
      price_iqd: paidAmount,
      pin_code: order.pin_code || null,
      admin_note: order.notes || null,
      note: order.notes || null,
      image_url: order.image_url || null,
      card_image_url: order.image_url || null,
      product_image_url: order.image_url || null,
      source: order.source,
      delivered_at: order.updated_at || order.created_at || null,
    };

    const existingTx = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', order.user_id)
      .eq('source_table', sourceTable)
      .eq('source_order_id', order.id)
      .eq('type', txType)
      .maybeSingle();

    const payload = {
      user_id: order.user_id,
      sender_id: order.user_id,
      receiver_id: null,
      type: txType,
      direction: 'out',
      status: 'completed',
      amount: -Math.abs(paidAmount),
      amount_iqd: Math.abs(paidAmount),
      fee_amount: 0,
      description: order.notes || null,
      reference_id: order.id,
      source_table: sourceTable,
      source_order_id: order.id,
      source_product_id: order.item_id,
      display_title: buildDisplayTitle(order),
      display_subtitle: buildDisplaySubtitle(order),
      display_image_url: order.image_url || null,
      pin_code: order.pin_code || null,
      provider_name: order.provider || null,
      payment_method_name: null,
      metadata,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingTx.data?.id) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', existingTx.data.id);

      if (updateError) {
        console.log('transactions update sync error:', updateError);
      }
    } else {
      const { error: insertError } = await supabase.from('transactions').insert(payload);

      if (insertError) {
        console.log('transactions insert sync error:', insertError);
      }
    }
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<NotificationOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');

  const fetchOrders = useCallback(async () => {
    try {
      if (!user?.id) {
        setOrders([]);
        return;
      }

      const [topupRes, giftRes] = await Promise.all([
        supabase
          .from('topup_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('gift_card_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (topupRes.error) throw topupRes.error;

      const rawTopupOrders = (topupRes.data || []).map(mapTopupOrder);

      let rawGiftOrders: NotificationOrderRow[] = [];
      if (!giftRes.error) {
        rawGiftOrders = (giftRes.data || []).map(mapGiftOrder);
      } else {
        console.log('gift_card_orders not loaded:', giftRes.error?.message);
      }

      const topupCardIds = uniqueIds(rawTopupOrders.map((o) => o.item_id));
      const giftCardIds = uniqueIds(rawGiftOrders.map((o) => o.item_id));

      const [topupCardsRes, giftCardsRes] = await Promise.all([
        topupCardIds.length
          ? supabase
              .from('topup_cards')
              .select('id, card_title, provider, amount_iqd, price_iqd, image_url')
              .in('id', topupCardIds)
          : Promise.resolve({ data: [], error: null } as any),

        giftCardIds.length
          ? supabase
              .from('gift_cards')
              .select('id, title, card_title, provider, brand, category, amount_iqd, amount, price_iqd, image_url')
              .in('id', giftCardIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (topupCardsRes.error) {
        console.log('topup_cards load error:', topupCardsRes.error.message);
      }
      if (giftCardsRes.error) {
        console.log('gift_cards load error:', giftCardsRes.error.message);
      }

      const topupCardMap = new Map<string, CardLookupRow>();
      const giftCardMap = new Map<string, CardLookupRow>();

      (topupCardsRes.data || []).forEach((item: CardLookupRow) => {
        if (item?.id) topupCardMap.set(String(item.id), item);
      });

      (giftCardsRes.data || []).forEach((item: CardLookupRow) => {
        if (item?.id) giftCardMap.set(String(item.id), item);
      });

      const topupOrders = rawTopupOrders.map((order) => {
        const card = order.item_id ? topupCardMap.get(String(order.item_id)) : null;

        return {
          ...order,
          card_title: order.card_title || card?.card_title || null,
          provider: order.provider || card?.provider || null,
          amount_iqd:
            order.amount_iqd !== null && order.amount_iqd !== undefined
              ? order.amount_iqd
              : card?.amount_iqd !== null && card?.amount_iqd !== undefined
              ? Number(card.amount_iqd)
              : null,
          price_iqd:
            order.price_iqd !== null && order.price_iqd !== undefined
              ? order.price_iqd
              : card?.price_iqd !== null && card?.price_iqd !== undefined
              ? Number(card.price_iqd)
              : null,
          image_url: order.image_url || card?.image_url || null,
        };
      });

      const giftOrders = rawGiftOrders.map((order) => {
        const card = order.item_id ? giftCardMap.get(String(order.item_id)) : null;

        return {
          ...order,
          card_title: order.card_title || card?.card_title || card?.title || null,
          provider: order.provider || card?.provider || card?.brand || card?.category || null,
          amount_iqd:
            order.amount_iqd !== null && order.amount_iqd !== undefined
              ? order.amount_iqd
              : card?.amount_iqd !== null && card?.amount_iqd !== undefined
              ? Number(card.amount_iqd)
              : card?.amount !== null && card?.amount !== undefined
              ? Number(card.amount)
              : null,
          price_iqd:
            order.price_iqd !== null && order.price_iqd !== undefined
              ? order.price_iqd
              : card?.price_iqd !== null && card?.price_iqd !== undefined
              ? Number(card.price_iqd)
              : null,
          image_url: order.image_url || card?.image_url || null,
        };
      });

      const merged = [...topupOrders, ...giftOrders].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });

      setOrders(merged);
      await syncSuccessfulOrdersToTransactions(merged);
    } catch (error: any) {
      console.log('notifications screen error:', error);
      Alert.alert(
        tSafe('common.error', 'Error'),
        error?.message || tSafe('notifications.loadFailed', 'Could not load notifications.')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
  };

  const counts = useMemo(() => {
    const result = {
      all: orders.length,
      pending: 0,
      success: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      const normalized = normalizeStatus(order.status);
      result[normalized] += 1;
    });

    return result;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter((order) => normalizeStatus(order.status) === activeTab);
  }, [orders, activeTab]);

  const statusStyle = (status?: string | null) => {
    const normalized = normalizeStatus(status);

    if (normalized === 'success') {
      return {
        bg: UI.successSoft,
        text: UI.success,
        icon: 'checkmark-circle' as const,
        label: tSafe('notifications.statusSuccess', 'Success'),
      };
    }

    if (normalized === 'cancelled') {
      return {
        bg: UI.dangerSoft,
        text: UI.danger,
        icon: 'close-circle' as const,
        label: tSafe('notifications.statusCancelled', 'Cancelled'),
      };
    }

    return {
      bg: UI.warningSoft,
      text: UI.warning,
      icon: 'time' as const,
      label: tSafe('notifications.statusPending', 'Pending'),
    };
  };

  const renderTab = (key: OrderStatus, label: string, count: number) => {
    const active = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.9}
        style={[styles.tabButton, active && styles.tabButtonActive]}
        onPress={() => setActiveTab(key)}
      >
        <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
          {label}
        </Text>
        <View style={[styles.tabCount, active && styles.tabCountActive]}>
          <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.9}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={22} color={UI.blueDark} />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {tSafe('notifications.title', 'Notifications')}
        </Text>

        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={UI.blue}
            colors={[UI.blue]}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <Text style={styles.heroMini}>
            {tSafe('notifications.mobileCards', 'Card Orders')}
          </Text>
          <Text style={styles.heroTitle}>
            {tSafe('notifications.subtitle', 'Track your purchased cards')}
          </Text>
          <Text style={styles.heroText}>
            {tSafe(
              'notifications.description',
              'See all your card orders, delivery status, PIN codes, and admin updates in one place.'
            )}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {renderTab('all', tSafe('notifications.filterAll', 'All'), counts.all)}
          {renderTab('pending', tSafe('notifications.filterPending', 'Pending'), counts.pending)}
          {renderTab('success', tSafe('notifications.filterSuccess', 'Success'), counts.success)}
          {renderTab('cancelled', tSafe('notifications.filterCancelled', 'Cancelled'), counts.cancelled)}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={UI.blue} />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={38} color={UI.blue} />
            <Text style={styles.emptyTitle}>
              {tSafe('notifications.emptyTitle', 'No notifications yet')}
            </Text>
            <Text style={styles.emptyText}>
              {tSafe('notifications.emptyText', 'You have not purchased any cards yet.')}
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredOrders.map((order) => {
              const provider = getProviderStyle(order.provider, order.source);
              const status = statusStyle(order.status);
              const hasPin = !!order.pin_code;
              const normalized = normalizeStatus(order.status);

              const parsedInfo = parseOrderExtraInfo(order.notes);
              const adminOnlyNote = removeSubmittedInfoFromNotes(order.notes);

              return (
                <View key={`${order.source}-${order.id}`} style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
                    <View style={styles.leftBadgesWrap}>
                      <View
                        style={[
                          styles.providerBadge,
                          { backgroundColor: provider.soft, borderColor: provider.border },
                        ]}
                      >
                        <Ionicons
                          name={provider.icon}
                          size={14}
                          color={provider.color}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.providerBadgeText, { color: provider.color }]}>
                          {provider.label}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon} size={14} color={status.text} />
                      <Text style={[styles.statusBadgeText, { color: status.text }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>
                    {buildDisplayTitle(order) || tSafe('notifications.unknownCard', 'Unknown card')}
                  </Text>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>
                        {tSafe('notifications.amount', 'Amount')}
                      </Text>
                      <Text style={styles.infoValue}>
                        {order.source === 'gift'
                          ? buildGiftAmount(order, provider.label)
                          : `${formatIQD(order.amount_iqd)} IQD`}
                      </Text>
                    </View>

                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>
                        {tSafe('notifications.priceIqd', 'Price (IQD)')}
                      </Text>
                      <Text style={styles.infoValue}>{formatIQD(order.price_iqd)} IQD</Text>
                    </View>

                    <View style={styles.infoBoxWide}>
                      <Text style={styles.infoLabel}>
                        {tSafe('notifications.date', 'Date')}
                      </Text>
                      <Text style={styles.infoValueSmall}>{formatDate(order.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.deliveryCard}>
                    <View style={styles.deliveryTop}>
                      <Text style={styles.deliveryTitle}>
                        {tSafe('notifications.deliveryInfo', 'Delivery information')}
                      </Text>

                      <View
                        style={[
                          styles.deliveryStateBadge,
                          hasPin
                            ? styles.deliveryStateBadgeSuccess
                            : normalized === 'cancelled'
                            ? styles.deliveryStateBadgeCancelled
                            : styles.deliveryStateBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.deliveryStateBadgeText,
                            hasPin
                              ? styles.deliveryStateBadgeTextSuccess
                              : normalized === 'cancelled'
                              ? styles.deliveryStateBadgeTextCancelled
                              : styles.deliveryStateBadgeTextPending,
                          ]}
                        >
                          {hasPin
                            ? tSafe('notifications.pinReady', 'PIN ready')
                            : normalized === 'cancelled'
                            ? tSafe('notifications.cancelledShort', 'Cancelled')
                            : tSafe('notifications.pendingShort', 'Pending')}
                        </Text>
                      </View>
                    </View>

                    {hasPin ? (
                      <View style={styles.pinCodeBox}>
                        <Text style={styles.pinCodeLabel}>
                          {tSafe('notifications.pinCode', 'PIN code')}
                        </Text>
                        <Text selectable style={styles.pinCodeValue}>
                          {order.pin_code}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.deliveryText}>
                        {normalized === 'cancelled'
                          ? tSafe('notifications.cancelledMessage', 'This order was cancelled.')
                          : tSafe('notifications.pendingMessage', 'Your order is under review.')}
                      </Text>
                    )}

                    {(!!parsedInfo.playerId || !!parsedInfo.accountName || !!parsedInfo.profileUrl) && (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>
                          {tSafe('notifications.submittedInfo', 'Submitted Info')}
                        </Text>

                        {!!parsedInfo.playerId && (
                          <View style={styles.submittedRow}>
                            <Text style={styles.submittedKey}>
                              {tSafe('notifications.playerId', 'Player ID')}:
                            </Text>
                            <Text selectable style={styles.submittedValue}>
                              {parsedInfo.playerId}
                            </Text>
                          </View>
                        )}

                        {!!parsedInfo.accountName && (
                          <View style={styles.submittedRow}>
                            <Text style={styles.submittedKey}>
                              {tSafe('notifications.accountName', 'Account Name')}:
                            </Text>
                            <Text selectable style={styles.submittedValue}>
                              {parsedInfo.accountName}
                            </Text>
                          </View>
                        )}

                        {!!parsedInfo.profileUrl && (
                          <View style={styles.submittedRowColumn}>
                            <Text style={styles.submittedKey}>
                              {tSafe('notifications.profileUrl', 'Profile URL')}:
                            </Text>
                            <Text selectable style={styles.submittedValue}>
                              {parsedInfo.profileUrl}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {!!adminOnlyNote && (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>
                          {tSafe('notifications.adminNote', 'Admin note')}
                        </Text>
                        <Text style={styles.notesText}>{adminOnlyNote}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: UI.page,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  iconButtonPlaceholder: {
    width: 42,
    height: 42,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },

  heroCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(59,130,246,0.10)',
    left: -35,
    bottom: -80,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(37,99,235,0.08)',
    right: -20,
    top: -25,
  },
  heroMini: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.blue,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    color: UI.text,
  },
  heroText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: UI.text2,
  },

  tabsRow: {
    paddingBottom: 4,
    paddingRight: 8,
    gap: 10,
    marginBottom: 14,
  },
  tabButton: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  tabButtonActive: {
    backgroundColor: UI.blueSoft,
    borderColor: UI.blueSoft2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text2,
  },
  tabButtonTextActive: {
    color: UI.blueDark,
  },
  tabCount: {
    marginLeft: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountActive: {
    backgroundColor: UI.white,
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.text2,
  },
  tabCountTextActive: {
    color: UI.blueDark,
  },

  loaderWrap: {
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    marginTop: 8,
    borderRadius: 24,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginTop: 10,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: UI.text2,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  listWrap: {
    gap: 14,
  },
  orderCard: {
    borderRadius: 24,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    ...SHADOWS.soft,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  leftBadgesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  providerBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },

  cardTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 12,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 14,
  },
  infoBox: {
    width: '48.5%',
    borderRadius: 16,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  infoBoxWide: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: UI.text2,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: UI.text,
    fontWeight: '900',
  },
  infoValueSmall: {
    fontSize: 12,
    color: UI.text,
    fontWeight: '800',
  },

  deliveryCard: {
    borderRadius: 18,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
  },
  deliveryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },
  deliveryStateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deliveryStateBadgeSuccess: {
    backgroundColor: UI.successSoft,
  },
  deliveryStateBadgePending: {
    backgroundColor: UI.warningSoft,
  },
  deliveryStateBadgeCancelled: {
    backgroundColor: UI.dangerSoft,
  },
  deliveryStateBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  deliveryStateBadgeTextSuccess: {
    color: UI.success,
  },
  deliveryStateBadgeTextPending: {
    color: UI.warning,
  },
  deliveryStateBadgeTextCancelled: {
    color: UI.danger,
  },

  pinCodeBox: {
    borderRadius: 16,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: UI.blueSoft2,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pinCodeLabel: {
    fontSize: 11,
    color: UI.blueDark,
    fontWeight: '800',
    marginBottom: 4,
  },
  pinCodeValue: {
    fontSize: 17,
    color: UI.text,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  deliveryText: {
    fontSize: 13,
    lineHeight: 20,
    color: UI.text2,
    fontWeight: '700',
  },

  notesBox: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  notesLabel: {
    fontSize: 11,
    color: UI.text2,
    fontWeight: '800',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
    color: UI.text,
    fontWeight: '700',
  },

  submittedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  submittedRowColumn: {
    marginBottom: 6,
  },
  submittedKey: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '800',
  },
  submittedValue: {
    flex: 1,
    fontSize: 13,
    color: UI.text,
    fontWeight: '900',
    lineHeight: 20,
  },
});
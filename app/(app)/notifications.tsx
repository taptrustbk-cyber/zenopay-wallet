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
  price_iqd?: number | null;
  image_url?: string | null;
  brand?: string | null;
  category?: string | null;
}

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
    soft: '#F1F9FF',
    border: '#D8EEFF',
    icon: 'phone-portrait-outline',
  },
  zain: {
    label: 'Zain',
    color: '#6E3CBC',
    soft: '#F6F1FF',
    border: '#E8DFFF',
    icon: 'radio-outline',
  },
  asiacell: {
    label: 'AsiaCell',
    color: '#D53434',
    soft: '#FFF3F2',
    border: '#FFDCD8',
    icon: 'cellular-outline',
  },
  ftth: {
    label: 'FTTH',
    color: '#2269D1',
    soft: '#F2F7FF',
    border: '#DCE8FF',
    icon: 'wifi-outline',
  },
  fasthope: {
    label: 'Fast Hope',
    color: '#E03E84',
    soft: '#FFF1F7',
    border: '#FFD9E8',
    icon: 'heart-outline',
  },
  kurdtel: {
    label: 'Kurdtel',
    color: '#333333',
    soft: '#F7F7F7',
    border: '#E8E8E8',
    icon: 'call-outline',
  },
};

function getProviderStyle(provider?: string | null, source?: OrderSource) {
  const key = String(provider || '').toLowerCase();

  if (providerConfig[key]) return providerConfig[key];

  return {
    label:
      provider ||
      (source === 'gift'
        ? String(i18n.t('notifications.giftCardLabel') || 'Gift Card')
        : String(i18n.t('notifications.unknownCard') || 'Unknown Card')),
    color: source === 'gift' ? '#8B5CF6' : '#9A7B00',
    soft: source === 'gift' ? '#F5F3FF' : '#FFFBEF',
    border: source === 'gift' ? '#E9D5FF' : '#F3E1A2',
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

function buildDisplaySubtitle(order: NotificationOrderRow) {
  const providerStyle = getProviderStyle(order.provider, order.source);
  const amountText = order.amount_iqd ? `${formatIQD(order.amount_iqd)} IQD` : '';
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
              .select('id, title, card_title, provider, brand, category, amount_iqd, price_iqd, image_url')
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
        String(i18n.t('common.error') || 'Error'),
        error?.message || String(i18n.t('notifications.loadFailed') || 'Could not load notifications.')
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
        bg: '#ECFDF3',
        text: '#027A48',
        icon: 'checkmark-circle' as const,
        label: i18n.t('notifications.statusSuccess'),
      };
    }

    if (normalized === 'cancelled') {
      return {
        bg: '#FEF3F2',
        text: '#D92D20',
        icon: 'close-circle' as const,
        label: i18n.t('notifications.statusCancelled'),
      };
    }

    return {
      bg: '#FFF8E8',
      text: '#B58103',
      icon: 'time' as const,
      label: i18n.t('notifications.statusPending'),
    };
  };

  const getTypeBadge = (source: OrderSource) => {
    if (source === 'gift') {
      return {
        label: i18n.t('notifications.giftCardLabel') || 'Gift Card',
        bg: '#F5F3FF',
        border: '#E9D5FF',
        text: '#7C3AED',
        icon: 'gift-outline' as const,
      };
    }

    return {
      label: i18n.t('notifications.mobileCards') || 'Mobile Card',
      bg: '#FFF8E8',
      border: '#F3E1A2',
      text: '#9A7B00',
      icon: 'phone-portrait-outline' as const,
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
          activeOpacity={0.85}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={22} color="#5A4700" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {i18n.t('notifications.title')}
        </Text>

        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroMini}>
            {i18n.t('notifications.mobileCards')}
          </Text>
          <Text style={styles.heroTitle}>{i18n.t('notifications.subtitle')}</Text>
          <Text style={styles.heroText}>{i18n.t('notifications.description')}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {renderTab('all', String(i18n.t('notifications.filterAll')), counts.all)}
          {renderTab('pending', String(i18n.t('notifications.filterPending')), counts.pending)}
          {renderTab('success', String(i18n.t('notifications.filterSuccess')), counts.success)}
          {renderTab('cancelled', String(i18n.t('notifications.filterCancelled')), counts.cancelled)}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#C99700" />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={38} color="#B08A00" />
            <Text style={styles.emptyTitle}>{i18n.t('notifications.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{i18n.t('notifications.emptyText')}</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredOrders.map((order) => {
              const provider = getProviderStyle(order.provider, order.source);
              const status = statusStyle(order.status);
              const hasPin = !!order.pin_code;
              const normalized = normalizeStatus(order.status);
              const typeBadge = getTypeBadge(order.source);

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

                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: typeBadge.bg,
                            borderColor: typeBadge.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={typeBadge.icon}
                          size={13}
                          color={typeBadge.text}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.typeBadgeText, { color: typeBadge.text }]}>
                          {typeBadge.label}
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
                    {buildDisplayTitle(order) || i18n.t('notifications.unknownCard')}
                  </Text>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>{i18n.t('notifications.amount')}</Text>
                      <Text style={styles.infoValue}>{formatIQD(order.amount_iqd)} IQD</Text>
                    </View>

                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>{i18n.t('notifications.priceIqd')}</Text>
                      <Text style={styles.infoValue}>{formatIQD(order.price_iqd)} IQD</Text>
                    </View>

                    <View style={styles.infoBoxWide}>
                      <Text style={styles.infoLabel}>{i18n.t('notifications.date')}</Text>
                      <Text style={styles.infoValueSmall}>{formatDate(order.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.deliveryCard}>
                    <View style={styles.deliveryTop}>
                      <Text style={styles.deliveryTitle}>
                        {i18n.t('notifications.deliveryInfo')}
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
                            ? i18n.t('notifications.pinReady')
                            : normalized === 'cancelled'
                            ? i18n.t('notifications.cancelledShort')
                            : i18n.t('notifications.pendingShort')}
                        </Text>
                      </View>
                    </View>

                    {hasPin ? (
                      <View style={styles.pinCodeBox}>
                        <Text style={styles.pinCodeLabel}>
                          {i18n.t('notifications.pinCode')}
                        </Text>
                        <Text selectable style={styles.pinCodeValue}>
                          {order.pin_code}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.deliveryText}>
                        {normalized === 'cancelled'
                          ? i18n.t('notifications.cancelledMessage')
                          : i18n.t('notifications.pendingMessage')}
                      </Text>
                    )}

                    {!!order.notes && (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>
                          {i18n.t('notifications.adminNote')}
                        </Text>
                        <Text style={styles.notesText}>{order.notes}</Text>
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
    backgroundColor: '#FFFDF8',
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF9E8',
    borderBottomWidth: 1,
    borderBottomColor: '#F2E4B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E1AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#2A2412',
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
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF6D9',
    borderWidth: 1,
    borderColor: '#F3E3A7',
    marginBottom: 14,
  },
  heroMini: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B08900',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    color: '#221C0B',
  },
  heroText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#806A12',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FDE68A',
    borderColor: '#F3D35C',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6E644B',
  },
  tabButtonTextActive: {
    color: '#5A4700',
  },
  tabCount: {
    marginLeft: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountActive: {
    backgroundColor: '#FFF8D8',
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7A715A',
  },
  tabCountTextActive: {
    color: '#5A4700',
  },

  loaderWrap: {
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2C2410',
    marginTop: 10,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#7B7460',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  listWrap: {
    gap: 14,
  },
  orderCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontSize: 11,
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
    color: '#211C11',
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
    backgroundColor: '#FFFCF2',
    borderWidth: 1,
    borderColor: '#F4E8BF',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  infoBoxWide: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFFCF2',
    borderWidth: 1,
    borderColor: '#F4E8BF',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: '#8A7B49',
    fontWeight: '800',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#241E0E',
    fontWeight: '900',
  },
  infoValueSmall: {
    fontSize: 12,
    color: '#241E0E',
    fontWeight: '800',
  },

  deliveryCard: {
    borderRadius: 18,
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: '#F0E2B2',
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
    color: '#241E0F',
  },
  deliveryStateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deliveryStateBadgeSuccess: {
    backgroundColor: '#ECFDF3',
  },
  deliveryStateBadgePending: {
    backgroundColor: '#FFF8E8',
  },
  deliveryStateBadgeCancelled: {
    backgroundColor: '#FEF3F2',
  },
  deliveryStateBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  deliveryStateBadgeTextSuccess: {
    color: '#027A48',
  },
  deliveryStateBadgeTextPending: {
    color: '#B58103',
  },
  deliveryStateBadgeTextCancelled: {
    color: '#D92D20',
  },

  pinCodeBox: {
    borderRadius: 16,
    backgroundColor: '#FFF8D8',
    borderWidth: 1,
    borderColor: '#F1DA85',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pinCodeLabel: {
    fontSize: 11,
    color: '#8E6F07',
    fontWeight: '800',
    marginBottom: 4,
  },
  pinCodeValue: {
    fontSize: 17,
    color: '#3A2E00',
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  deliveryText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6E644B',
    fontWeight: '700',
  },

  notesBox: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE5C6',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  notesLabel: {
    fontSize: 11,
    color: '#8A7B49',
    fontWeight: '800',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#2A2412',
    fontWeight: '700',
  },
});
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

interface TopupOrderRow {
  id: string;
  user_id: string;
  topup_card_id: string | null;
  card_title: string | null;
  provider: string | null;
  amount_iqd: number | null;
  price_usd: number | null;
  price_iqd: number | null;
  status: string | null;
  pin_code: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;
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

function getProviderStyle(provider?: string | null) {
  const key = String(provider || '').toLowerCase();
  return (
    providerConfig[key] || {
      label: provider || i18n.t('notifications.unknownCard'),
      color: '#9A7B00',
      soft: '#FFFBEF',
      border: '#F3E1A2',
      icon: 'card-outline' as const,
    }
  );
}

function formatIQD(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatUSD(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<TopupOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');

  const fetchOrders = useCallback(async () => {
    try {
      if (!user?.id) {
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from('topup_orders')
        .select(
          'id,user_id,topup_card_id,card_title,provider,amount_iqd,price_usd,price_iqd,status,pin_code,notes,created_at,updated_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders((data || []) as TopupOrderRow[]);
    } catch (error: any) {
      console.log('notifications screen error:', error);
      Alert.alert(
        i18n.t('common.error') || 'Error',
        error?.message || i18n.t('notifications.loadFailed') || 'Could not load notifications.'
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroMini}>{i18n.t('notifications.mobileCards')}</Text>
          <Text style={styles.heroTitle}>{i18n.t('notifications.subtitle')}</Text>
          <Text style={styles.heroText}>{i18n.t('notifications.description')}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {renderTab('all', i18n.t('notifications.filterAll'), counts.all)}
          {renderTab('pending', i18n.t('notifications.filterPending'), counts.pending)}
          {renderTab('success', i18n.t('notifications.filterSuccess'), counts.success)}
          {renderTab('cancelled', i18n.t('notifications.filterCancelled'), counts.cancelled)}
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
              const provider = getProviderStyle(order.provider);
              const status = statusStyle(order.status);
              const hasPin = !!order.pin_code;
              const normalized = normalizeStatus(order.status);

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
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

                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon} size={14} color={status.text} />
                      <Text style={[styles.statusBadgeText, { color: status.text }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>
                    {order.card_title || i18n.t('notifications.unknownCard')}
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

                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>{i18n.t('notifications.priceUsd')}</Text>
                      <Text style={styles.infoValue}>${formatUSD(order.price_usd)}</Text>
                    </View>

                    <View style={styles.infoBox}>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
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

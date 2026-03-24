import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type GiftCardOrder = {
  id: string;
  user_id: string;

  gift_card_id?: string | null;
  category_id?: string | null;

  card_title: string | null;
  provider: string | null;
  amount: number | null;
  amount_iqd: number | null;
  price_usd: number | null;
  price_iqd: number | null;

  image_url?: string | null;

  status: string | null;
  pin_code: string | null;
  notes: string | null;

  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_city: string | null;
  user_avatar_url?: string | null;

  created_at: string | null;
  updated_at?: string | null;
};

type FilterStatus = 'all' | 'pending' | 'success' | 'cancelled';

function formatIQD(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function normalizeStatus(status?: string | null): 'pending' | 'success' | 'cancelled' {
  const s = String(status || '').toLowerCase();

  if (['success', 'approved', 'completed', 'done'].includes(s)) return 'success';
  if (['cancelled', 'canceled', 'rejected', 'failed'].includes(s)) return 'cancelled';
  return 'pending';
}

function getStatusColors(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === 'success') {
    return {
      bg: '#ECFDF3',
      border: '#ABEFC6',
      text: '#067647',
      label: 'Success',
    };
  }

  if (normalized === 'cancelled') {
    return {
      bg: '#FEF3F2',
      border: '#FECDCA',
      text: '#B42318',
      label: 'Cancelled',
    };
  }

  return {
    bg: '#FFF8E8',
    border: '#F7D98B',
    text: '#B58103',
    label: 'Pending',
  };
}

function buildGiftDisplayTitle(order: GiftCardOrder) {
  const provider = String(order.provider || '').trim();
  const title = String(order.card_title || '').trim();

  if (provider && title) return `${provider} - ${title}`;
  return provider || title || 'Gift Card';
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
      const normalizedLine = line.toLowerCase();
      const normalizedLabel = `${label.toLowerCase()}:`;

      if (normalizedLine.startsWith(normalizedLabel)) {
        return line.slice(normalizedLabel.length).trim();
      }
    }
  }

  return '';
}

function parseOrderExtraInfo(notes?: string | null) {
  const playerId = extractValueFromNotes(notes, [
    'Player ID',
    'Game ID',
    'Player Id',
  ]);

  const pubgAccountName = extractValueFromNotes(notes, [
    'PUBG Account Name',
    'Pubg Account Name',
    'Account Name',
    'Profile Name',
  ]);

  const profileUrl = extractValueFromNotes(notes, [
    'Profile URL',
    'Profile Url',
    'URL',
    'Url',
  ]);

  return {
    playerId,
    pubgAccountName,
    profileUrl,
  };
}

function removeParsedLinesFromNotes(notes?: string | null) {
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

  const cleaned = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      const lower = line.toLowerCase();
      return !removablePrefixes.some((prefix) => lower.startsWith(prefix));
    });

  return cleaned.join('\n').trim();
}

export default function AdminGiftCardOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<GiftCardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const [savingId, setSavingId] = useState<string | null>(null);

  const [editState, setEditState] = useState<
    Record<string, { status: string; pin_code: string; notes: string }>
  >({});

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('gift_card_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as GiftCardOrder[];
      setOrders(rows);

      const next: Record<string, { status: string; pin_code: string; notes: string }> = {};
      rows.forEach((row) => {
        next[row.id] = {
          status: normalizeStatus(row.status),
          pin_code: row.pin_code || '',
          notes: row.notes || '',
        };
      });
      setEditState(next);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load gift card orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
  };

  const stats = useMemo(() => {
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
    const q = search.trim().toLowerCase();

    return orders.filter((item) => {
      const parsed = parseOrderExtraInfo(item.notes);

      const matchesSearch =
        !q ||
        item.card_title?.toLowerCase().includes(q) ||
        item.provider?.toLowerCase().includes(q) ||
        item.user_name?.toLowerCase().includes(q) ||
        item.user_email?.toLowerCase().includes(q) ||
        item.user_city?.toLowerCase().includes(q) ||
        item.user_phone?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.pin_code?.toLowerCase().includes(q) ||
        parsed.playerId.toLowerCase().includes(q) ||
        parsed.pubgAccountName.toLowerCase().includes(q) ||
        parsed.profileUrl.toLowerCase().includes(q) ||
        String(item.amount || '').includes(q) ||
        String(item.price_iqd || '').includes(q);

      const matchesFilter =
        activeFilter === 'all' ? true : normalizeStatus(item.status) === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [orders, search, activeFilter]);

  const setField = (id: string, key: 'status' | 'pin_code' | 'notes', value: string) => {
    setEditState((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status || 'pending',
        pin_code: prev[id]?.pin_code || '',
        notes: prev[id]?.notes || '',
        [key]: value,
      },
    }));
  };

  const sendStatusEmail = async (order: GiftCardOrder, status: string, pinCode: string, note: string) => {
    if (!order.user_email) return;

    try {
      await supabase.functions.invoke('gift-card-order-mail', {
        body: {
          to: order.user_email,
          customer_name: order.user_name || 'Customer',
          order_id: order.id,
          card_title: order.card_title,
          provider: order.provider,
          amount: order.amount,
          price_iqd: order.price_iqd,
          status,
          pin_code: pinCode || null,
          note: note || null,
          image_url: order.image_url || null,
        },
      });
    } catch (e) {
      console.log('gift-card-order-mail invoke error:', e);
    }
  };

  const handleSave = async (order: GiftCardOrder) => {
    try {
      const draft = editState[order.id];
      if (!draft) return;

      const nextStatus = normalizeStatus(draft.status);
      const oldStatus = normalizeStatus(order.status);

      if (nextStatus === 'success' && !draft.pin_code.trim()) {
        Alert.alert('Error', 'PIN code is required when status is success.');
        return;
      }

      setSavingId(order.id);

      const { error } = await supabase.rpc('admin_process_gift_card_order', {
        p_order_id: order.id,
        p_status: nextStatus,
        p_pin_code: draft.pin_code.trim() || null,
        p_notes: draft.notes.trim() || null,
      });

      if (error) throw error;

      await sendStatusEmail(order, nextStatus, draft.pin_code.trim(), draft.notes.trim());

      await fetchOrders();

      if (oldStatus !== nextStatus && nextStatus === 'cancelled') {
        Alert.alert('Success', 'Order cancelled and wallet refunded successfully.');
      } else if (oldStatus !== nextStatus && nextStatus === 'success') {
        Alert.alert('Success', 'Order approved, transaction created, and email sent.');
      } else {
        Alert.alert('Success', 'Gift card order updated successfully.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update gift card order.');
    } finally {
      setSavingId(null);
    }
  };

  const renderFilterButton = (
    key: FilterStatus,
    label: string,
    count: number,
    tone: 'neutral' | 'pending' | 'success' | 'cancelled' = 'neutral'
  ) => {
    const active = activeFilter === key;

    const toneColors =
      tone === 'success'
        ? { bg: '#ECFDF3', border: '#ABEFC6', text: '#067647' }
        : tone === 'cancelled'
        ? { bg: '#FEF3F2', border: '#FECDCA', text: '#B42318' }
        : tone === 'pending'
        ? { bg: '#FFF8E8', border: '#F7D98B', text: '#B58103' }
        : { bg: '#FFFFFF', border: '#E5E7EB', text: '#374151' };

    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.9}
        onPress={() => setActiveFilter(key)}
        style={[
          styles.filterButton,
          {
            backgroundColor: active ? toneColors.bg : '#FFFFFF',
            borderColor: active ? toneColors.border : '#E5E7EB',
          },
        ]}
      >
        <Text
          style={[
            styles.filterButtonText,
            { color: active ? toneColors.text : '#374151' },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.filterBadge,
            { backgroundColor: active ? '#FFFFFF' : '#F3F4F6' },
          ]}
        >
          <Text
            style={[
              styles.filterBadgeText,
              { color: active ? toneColors.text : '#374151' },
            ]}
          >
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
          style={styles.iconButton}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color="#5A4700" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Admin Gift Card Orders</Text>

        <TouchableOpacity
          onPress={onRefresh}
          style={styles.iconButton}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-outline" size={20} color="#5A4700" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>ORDERS MANAGER</Text>
          </View>

          <Text style={styles.heroTitle}>Manage gift card orders</Text>
          <Text style={styles.heroText}>
            Review user purchases, approve orders, add PIN codes, and send delivery notes.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.all}</Text>
            <Text style={styles.statLabel}>All Orders</Text>
          </View>

          <View style={[styles.statCard, styles.statCardPending]}>
            <Text style={[styles.statValue, { color: '#B58103' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: '#8A6B08' }]}>Pending</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={[styles.statValue, { color: '#067647' }]}>{stats.success}</Text>
            <Text style={[styles.statLabel, { color: '#067647' }]}>Success</Text>
          </View>

          <View style={[styles.statCard, styles.statCardCancelled]}>
            <Text style={[styles.statValue, { color: '#B42318' }]}>{stats.cancelled}</Text>
            <Text style={[styles.statLabel, { color: '#B42318' }]}>Cancelled</Text>
          </View>
        </View>

        <View style={styles.topCard}>
          <Text style={styles.sectionTitle}>Search Orders</Text>

          <TextInput
            style={styles.input}
            placeholder="Search by card, user, email, provider, player id, profile url..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {renderFilterButton('all', 'All', stats.all, 'neutral')}
            {renderFilterButton('pending', 'Pending', stats.pending, 'pending')}
            {renderFilterButton('success', 'Success', stats.success, 'success')}
            {renderFilterButton('cancelled', 'Cancelled', stats.cancelled, 'cancelled')}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#B08900" />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="gift-outline" size={38} color="#B08A00" />
            <Text style={styles.emptyTitle}>No gift card orders found</Text>
            <Text style={styles.emptyText}>
              Try another search term or change the selected filter.
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const draft = editState[order.id] || {
              status: 'pending',
              pin_code: '',
              notes: '',
            };

            const statusColors = getStatusColors(draft.status);
            const parsed = parseOrderExtraInfo(order.notes);
            const cleanNotes = removeParsedLinesFromNotes(order.notes);

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderTopRow}>
                  <View style={styles.orderTitleWrap}>
                    <View style={styles.cardHeaderRow}>
                      {order.image_url ? (
                        <Image source={{ uri: order.image_url }} style={styles.cardThumb} />
                      ) : (
                        <View style={styles.cardThumbPlaceholder}>
                          <Ionicons name="gift-outline" size={24} color="#B08900" />
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderTitle}>
                          {buildGiftDisplayTitle(order)}
                        </Text>

                        <View style={styles.topBadgesRow}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>GIFT</Text>
                          </View>

                          <View
                            style={[
                              styles.liveStatusBadge,
                              {
                                backgroundColor: statusColors.bg,
                                borderColor: statusColors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.liveStatusBadgeText,
                                { color: statusColors.text },
                              ]}
                            >
                              {statusColors.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>User</Text>
                    <Text style={styles.infoValue}>{order.user_name || '-'}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{order.user_email || '-'}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{order.user_phone || '-'}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>City</Text>
                    <Text style={styles.infoValue}>{order.user_city || '-'}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Provider</Text>
                    <Text style={styles.infoValue}>{order.provider || '-'}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Amount</Text>
                    <Text style={styles.infoValue}>{String(order.amount ?? '-')}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Price IQD</Text>
                    <Text style={styles.infoValue}>{formatIQD(order.price_iqd)} IQD</Text>
                  </View>

                  {!!parsed.playerId && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Player ID</Text>
                      <Text style={styles.infoValue}>{parsed.playerId}</Text>
                    </View>
                  )}

                  {!!parsed.pubgAccountName && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Account Name</Text>
                      <Text style={styles.infoValue}>{parsed.pubgAccountName}</Text>
                    </View>
                  )}

                  {!!parsed.profileUrl && (
                    <View style={styles.infoBoxFull}>
                      <Text style={styles.infoLabel}>Profile URL</Text>
                      <Text style={styles.infoValue}>{parsed.profileUrl}</Text>
                    </View>
                  )}

                  <View style={styles.infoBoxFull}>
                    <Text style={styles.infoLabel}>Created At</Text>
                    <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
                  </View>

                  <View style={styles.infoBoxFull}>
                    <Text style={styles.infoLabel}>Order ID</Text>
                    <Text style={styles.infoValue}>{order.id}</Text>
                  </View>

                  {!!cleanNotes && (
                    <View style={styles.infoBoxFull}>
                      <Text style={styles.infoLabel}>Customer Notes</Text>
                      <Text style={styles.infoValue}>{cleanNotes}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.statusRow}>
                  {[
                    { key: 'pending', label: 'Pending' },
                    { key: 'success', label: 'Success' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map((status) => {
                    const active = draft.status === status.key;
                    const colors = getStatusColors(status.key);

                    return (
                      <TouchableOpacity
                        key={status.key}
                        onPress={() => setField(order.id, 'status', status.key)}
                        style={[
                          styles.statusBtn,
                          active && {
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                          },
                        ]}
                        activeOpacity={0.9}
                      >
                        <Text
                          style={[
                            styles.statusBtnText,
                            active && { color: colors.text },
                          ]}
                        >
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>PIN Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pin code..."
                  placeholderTextColor="#9CA3AF"
                  value={draft.pin_code}
                  onChangeText={(v) => setField(order.id, 'pin_code', v)}
                />

                <Text style={styles.inputLabel}>Notes / Delivery Instructions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  placeholder="Add admin note or instructions for the user..."
                  placeholderTextColor="#9CA3AF"
                  value={draft.notes}
                  onChangeText={(v) => setField(order.id, 'notes', v)}
                />

                <TouchableOpacity
                  onPress={() => handleSave(order)}
                  style={styles.saveButton}
                  disabled={savingId === order.id}
                  activeOpacity={0.9}
                >
                  {savingId === order.id ? (
                    <ActivityIndicator color="#5A4700" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#5A4700" />
                      <Text style={styles.saveButtonText}>Save Update</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E1AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#2A2412',
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },

  heroCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    padding: 18,
    marginBottom: 16,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8D8',
    borderWidth: 1,
    borderColor: '#F1DA85',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#8E6F07',
    fontSize: 11,
    fontWeight: '900',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#211B10',
    marginBottom: 6,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6B6452',
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48.5%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statCardPending: {
    backgroundColor: '#FFFDF5',
  },
  statCardSuccess: {
    backgroundColor: '#F6FFFB',
  },
  statCardCancelled: {
    backgroundColor: '#FFF8F7',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#211B10',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B6452',
  },

  topCard: {
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#211B10',
    marginBottom: 12,
  },

  filtersRow: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingRight: 8,
    gap: 10,
  },
  filterButton: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  filterBadge: {
    marginLeft: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B6452',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  loaderWrap: {
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
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

  orderCard: {
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    padding: 16,
    marginBottom: 14,
  },
  orderTopRow: {
    marginBottom: 12,
  },
  orderTitleWrap: {
    flexDirection: 'column',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardThumb: {
    width: 66,
    height: 66,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  cardThumbPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 16,
    backgroundColor: '#FFF8D8',
    borderWidth: 1,
    borderColor: '#F1DA85',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#211B10',
    marginBottom: 8,
  },
  topBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typeBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '900',
  },
  liveStatusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveStatusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 6,
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
  infoBoxFull: {
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
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },

  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statusBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
  },

  saveButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F4D461',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#5A4700',
  },
});
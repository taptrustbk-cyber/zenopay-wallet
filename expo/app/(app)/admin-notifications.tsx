import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const options = {
  headerShown: false,
};

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

const UI = {
  bg: '#EEF4FF',
  bgSoft: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F3F7FF',
  border: '#D9E5F6',
  borderStrong: '#BFD4F3',

  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',

  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#DBEAFE',

  green: '#16A34A',
  greenSoft: '#DCFCE7',

  orange: '#F97316',
  orangeSoft: '#FFEDD5',

  red: '#DC2626',
  redSoft: '#FEE2E2',

  overlay: 'rgba(15,23,42,0.08)',
};

type AdminNotificationRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  entity_table?: string | null;
  entity_id?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
  data?: any;
};

const SHADOW = {
  shadowColor: '#7DA8E6',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

function formatRelativeOrDate(input?: string | null) {
  if (!input) return 'Unknown date';

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hour ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} day ago`;

  return date.toLocaleString();
}

function getNotificationTone(row: AdminNotificationRow): 'blue' | 'green' | 'orange' | 'red' {
  const value = `${row.type || ''} ${row.entity_table || ''}`.toLowerCase();

  if (value.includes('withdraw')) return 'orange';
  if (value.includes('deposit')) return 'green';
  if (value.includes('kyc')) return 'blue';
  if (value.includes('gift')) return 'orange';
  if (value.includes('topup')) return 'orange';
  if (value.includes('shop')) return 'blue';
  if (value.includes('mobile')) return 'blue';
  if (value.includes('reject')) return 'red';

  return 'blue';
}

function getToneStyles(tone: 'blue' | 'green' | 'orange' | 'red') {
  switch (tone) {
    case 'green':
      return {
        pillBg: UI.greenSoft,
        pillText: UI.green,
        iconBg: '#ECFDF5',
        iconColor: UI.green,
      };
    case 'orange':
      return {
        pillBg: UI.orangeSoft,
        pillText: UI.orange,
        iconBg: '#FFF7ED',
        iconColor: UI.orange,
      };
    case 'red':
      return {
        pillBg: UI.redSoft,
        pillText: UI.red,
        iconBg: '#FEF2F2',
        iconColor: UI.red,
      };
    default:
      return {
        pillBg: UI.blueSoft,
        pillText: UI.blue,
        iconBg: '#EFF6FF',
        iconColor: UI.blue,
      };
  }
}

function getNotificationIcon(row: AdminNotificationRow): keyof typeof Ionicons.glyphMap {
  const value = `${row.type || ''} ${row.entity_table || ''}`.toLowerCase();

  if (value.includes('deposit')) return 'arrow-down-circle-outline';
  if (value.includes('withdraw')) return 'arrow-up-circle-outline';
  if (value.includes('gift')) return 'gift-outline';
  if (value.includes('topup')) return 'phone-portrait-outline';
  if (value.includes('kyc')) return 'shield-checkmark-outline';
  if (value.includes('shop') || value.includes('mobile')) return 'cart-outline';
  if (value.includes('account') || value.includes('profile')) return 'person-outline';

  return 'notifications-outline';
}

function buildNotificationTitle(row: AdminNotificationRow) {
  if (row.title && String(row.title).trim()) return String(row.title);

  const value = `${row.type || ''} ${row.entity_table || ''}`.toLowerCase();

  if (value.includes('deposit')) return 'New deposit request';
  if (value.includes('withdraw')) return 'New withdraw request';
  if (value.includes('gift')) return 'New gift card order';
  if (value.includes('topup')) return 'New top-up order';
  if (value.includes('kyc')) return 'New KYC request';
  if (value.includes('shop') || value.includes('mobile')) return 'New mobile shop order';
  if (value.includes('profile')) return 'New account approval request';

  return 'New admin notification';
}

function buildNotificationBody(row: AdminNotificationRow) {
  if (row.body && String(row.body).trim()) return String(row.body);

  const data = row.data;
  if (data && typeof data === 'object') {
    if (data.message) return String(data.message);
    if (data.note) return String(data.note);
    if (data.description) return String(data.description);
  }

  const parts = [
    row.entity_table ? `Table: ${row.entity_table}` : null,
    row.entity_id ? `ID: ${row.entity_id}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(' • ') : 'Tap to review this notification.';
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = React.useState<AdminNotificationRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const loadNotifications = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setNotifications((data || []) as AdminNotificationRow[]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load notifications');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAdmin) return;

    loadNotifications();

    const channel = supabase
      .channel('admin-notifications-page-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_notifications',
        },
        () => {
          loadNotifications(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loadNotifications]);

  const onRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await loadNotifications(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications]);

  const unreadCount = React.useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((item) => !item.is_read);
    }
    return notifications;
  }, [filter, notifications]);

  const markOneAsRead = async (id: string) => {
    const current = notifications.find((n) => n.id === id);
    if (!current || current.is_read) return;

    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );

    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: false } : item))
      );
      Alert.alert('Error', error.message);
    }
  };

  const markAllAsRead = async () => {
    const hasUnread = notifications.some((item) => !item.is_read);
    if (!hasUnread) return;

    try {
      setMarkingAll(true);

      const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);

      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));

      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) {
        await loadNotifications(true);
        Alert.alert('Error', error.message);
      }
    } catch (e: any) {
      await loadNotifications(true);
      Alert.alert('Error', e?.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const openRelatedPage = (row: AdminNotificationRow) => {
    markOneAsRead(row.id);

    const key = `${row.entity_table || ''} ${row.type || ''}`.toLowerCase();

    if (key.includes('deposit')) {
      router.push('/depositsadmin' as any);
      return;
    }

    if (key.includes('withdraw')) {
      router.push('/withdrawalsadmin' as any);
      return;
    }

    if (key.includes('gift')) {
      router.push('/admin-gift-card-orders' as any);
      return;
    }

    if (key.includes('topup')) {
      router.push('/admin-topup-cards' as any);
      return;
    }

    if (key.includes('kyc')) {
      router.push('/kycdocumentsadmin' as any);
      return;
    }

    if (key.includes('shop') || key.includes('mobile')) {
      router.push('/mobileproductsadmin' as any);
      return;
    }

    if (key.includes('profile') || key.includes('account')) {
      router.push('/accountapprovaladmin' as any);
      return;
    }

    Alert.alert('Notification', 'No linked page found for this notification yet.');
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.deniedWrap}>
          <Text style={styles.deniedTitle}>Access Denied</Text>
          <Text style={styles.deniedText}>You do not have permission to access this page.</Text>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.9}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: AdminNotificationRow }) => {
    const tone = getNotificationTone(item);
    const toneStyle = getToneStyles(tone);
    const title = buildNotificationTitle(item);
    const body = buildNotificationBody(item);

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.card, !item.is_read && styles.cardUnread]}
        onPress={() => openRelatedPage(item)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, { backgroundColor: toneStyle.iconBg }]}>
            <Ionicons
              name={getNotificationIcon(item)}
              size={20}
              color={toneStyle.iconColor}
            />
          </View>

          <View style={styles.cardTopText}>
            <View style={styles.titleRow}>
              <Text numberOfLines={2} style={styles.cardTitle}>
                {title}
              </Text>

              {!item.is_read ? <View style={styles.unreadDot} /> : null}
            </View>

            <Text style={styles.cardTime}>{formatRelativeOrDate(item.created_at)}</Text>
          </View>
        </View>

        <Text style={styles.cardBody}>{body}</Text>

        <View style={styles.cardFooter}>
          <View style={[styles.typePill, { backgroundColor: toneStyle.pillBg }]}>
            <Text style={[styles.typePillText, { color: toneStyle.pillText }]}>
              {String(item.entity_table || item.type || 'notification').toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.readBtn}
            onPress={() => markOneAsRead(item.id)}
          >
            <Text style={styles.readBtnText}>
              {item.is_read ? 'Opened' : 'Mark as read'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <Ionicons name="arrow-back" size={22} color={UI.blueDark} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Notifications</Text>
          <Text style={styles.headerSub}>
            {unreadCount} unread
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={onRefresh}
          activeOpacity={0.9}
        >
          <Ionicons name="refresh-outline" size={20} color={UI.blueDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.topStatsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{notifications.length}</Text>
          <Text style={styles.statLabel}>All</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: UI.red }]}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>

        <View style={styles.statDivider} />

        <TouchableOpacity
          style={[styles.markAllBtn, markingAll && { opacity: 0.7 }]}
          onPress={markAllAsRead}
          disabled={markingAll}
          activeOpacity={0.9}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color={UI.blueDark} />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={18} color={UI.blueDark} />
              <Text style={styles.markAllBtnText}>Mark all read</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.filterBtn, filter === 'unread' && styles.filterBtnActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterBtnText, filter === 'unread' && styles.filterBtnTextActive]}>
            Unread
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={UI.blue} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI.blue} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={28} color={UI.text3} />
              </View>
              <Text style={styles.emptyTitle}>No notifications found</Text>
              <Text style={styles.emptyText}>
                {filter === 'unread'
                  ? 'You do not have unread notifications right now.'
                  : 'New admin notifications will appear here.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    marginHorizontal: 12,
    marginTop: 6,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#D8E6FA',
    borderRadius: 28,
    minHeight: 74,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOW,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: UI.blueDark,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSub: {
    marginTop: 2,
    color: UI.text2,
    fontSize: 11,
    fontWeight: '700',
  },

  topStatsCard: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: UI.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOW,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: UI.text,
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 4,
    color: UI.text2,
    fontSize: 12,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: UI.border,
    marginHorizontal: 6,
  },
  markAllBtn: {
    flex: 1.3,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: UI.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
  },
  markAllBtnText: {
    color: UI.blueDark,
    fontSize: 12,
    fontWeight: '900',
  },

  filterRow: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  filterBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: UI.blueSoft,
    borderColor: UI.blue,
  },
  filterBtnText: {
    color: UI.text2,
    fontSize: 14,
    fontWeight: '800',
  },
  filterBtnTextActive: {
    color: UI.blueDark,
  },

  listContent: {
    padding: 16,
    paddingBottom: 120,
  },

  card: {
    backgroundColor: UI.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 12,
    ...SHADOW,
  },
  cardUnread: {
    borderColor: '#BCD2F7',
    backgroundColor: '#FCFEFF',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: UI.red,
    marginTop: 6,
  },
  cardTime: {
    marginTop: 4,
    color: UI.text3,
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    color: UI.text2,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  readBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
  },
  readBtnText: {
    color: UI.text2,
    fontSize: 12,
    fontWeight: '800',
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: UI.text2,
    fontSize: 14,
    fontWeight: '700',
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: UI.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: UI.text2,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '600',
    maxWidth: 260,
  },

  deniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deniedTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: UI.red,
    marginBottom: 10,
  },
  deniedText: {
    fontSize: 14,
    color: UI.text2,
    textAlign: 'center',
    marginBottom: 18,
  },
  backBtn: {
    backgroundColor: UI.blue,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
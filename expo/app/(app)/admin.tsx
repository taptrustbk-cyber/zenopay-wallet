import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Home,
  LogOut,
  LayoutDashboard,
  Smartphone,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
  MinusCircle,
  FileText,
  ReceiptText,
  CreditCard,
  ClipboardList,
  Gift,
  Landmark,
  Bell,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const ADMIN_NOTIFICATIONS_CHANNEL = 'admin-notifications-admin-page-main';

const UI = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardSoft: '#F1F5F9',
  text: '#0F1B33',
  text2: '#5B6B82',
  border: '#E2E8F0',

  green: '#16A34A',
  greenSoft: '#DCFCE7',

  blue: '#0F2A5C',
  blueSoft: '#DBEAFE',

  red: '#DC2626',
  redSoft: '#FEE2E2',

  gold: '#B45309',
  goldSoft: '#FEF3C7',

  shadow: 'rgba(15, 23, 42, 0.08)',
};

type MenuItemProps = {
  label: string;
  subLabel: string;
  onPress: () => void;
  icon: React.ReactNode;
  tone?: 'green' | 'blue' | 'gold';
  badgeCount?: number;
};

type AdminNotificationRow = {
  id: string;
  type?: string | null;
  entity_table?: string | null;
  is_read?: boolean | null;
};

export default function AdminScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [loadingNotifications, setLoadingNotifications] = React.useState(false);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [notificationRows, setNotificationRows] = React.useState<AdminNotificationRow[]>([]);

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const loadNotifications = React.useCallback(async () => {
    try {
      setLoadingNotifications(true);

      const { data, error } = await supabase
        .from('admin_notifications')
        .select('id, type, entity_table, is_read, created_at')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('admin_notifications load error:', error.message);
        return;
      }

      const rows = (data || []) as AdminNotificationRow[];
      setNotificationRows(rows);
      setUnreadNotifications(rows.length);
    } catch (e) {
      console.log('loadNotifications error:', e);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAdmin) return;

    loadNotifications();

    const existingChannels = supabase.getChannels();
    existingChannels.forEach((channel) => {
      if (channel.topic === `realtime:${ADMIN_NOTIFICATIONS_CHANNEL}` || channel.topic === ADMIN_NOTIFICATIONS_CHANNEL) {
        supabase.removeChannel(channel);
      }
    });

    const channel = supabase
      .channel(ADMIN_NOTIFICATIONS_CHANNEL)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_notifications',
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe((status) => {
        console.log('Admin notifications channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loadNotifications]);

  const countByTables = React.useMemo(() => {
    const tableCounts: Record<string, number> = {};

    for (const row of notificationRows) {
      const key = String(row.entity_table || row.type || '').trim().toLowerCase();
      if (!key) continue;
      tableCounts[key] = (tableCounts[key] || 0) + 1;
    }

    return tableCounts;
  }, [notificationRows]);

  const getBadgeCount = React.useCallback(
    (keys: string[]) => {
      return keys.reduce((sum, key) => sum + (countByTables[String(key).toLowerCase()] || 0), 0);
    },
    [countByTables]
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.deniedWrap}>
          <Text style={styles.deniedTitle}>Access Denied</Text>
          <Text style={styles.deniedText}>You don&apos;t have permission to access this page.</Text>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const MenuItem = ({ label, subLabel, onPress, icon, tone = 'blue', badgeCount = 0 }: MenuItemProps) => {
    const iconBg = tone === 'green' ? UI.greenSoft : tone === 'gold' ? UI.goldSoft : UI.blueSoft;
    const glowColor = tone === 'green' ? UI.green : tone === 'gold' ? UI.gold : UI.blue;

    return (
      <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.menuTopRow}>
          <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>{icon}</View>

          {badgeCount > 0 ? (
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.menuTitle} numberOfLines={2}>
          {label}
        </Text>

        <Text style={styles.menuSub} numberOfLines={2}>
          {subLabel}
        </Text>

        <View style={[styles.menuGlow, { backgroundColor: glowColor, opacity: 0.08 }]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.push('/dashboard' as any)}
          activeOpacity={0.85}
        >
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>Control center</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/admin-notifications' as any)}
            activeOpacity={0.9}
          >
            <Bell size={18} color={UI.text} />
            {unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() =>
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: signOut },
              ])
            }
            activeOpacity={0.9}
          >
            <LogOut size={15} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>ADMIN</Text>
            </View>

            {loadingNotifications ? (
              <ActivityIndicator size="small" color={UI.blue} />
            ) : unreadNotifications > 0 ? (
              <View style={styles.heroNotificationPill}>
                <Bell size={14} color={UI.blue} />
                <Text style={styles.heroNotificationText}>
                  {unreadNotifications} unread notification{unreadNotifications > 1 ? 's' : ''}
                </Text>
              </View>
            ) : (
              <View style={styles.heroNotificationPillSoft}>
                <Text style={styles.heroNotificationTextSoft}>No new notifications</Text>
              </View>
            )}
          </View>

          <Text style={styles.heroTitle}>Welcome to your admin menu</Text>
          <Text style={styles.heroText}>
            Open each section in a separate page. This screen is only for navigation and design.
          </Text>
        </View>

        <View style={styles.grid}>
          <MenuItem
            label="Notifications"
            subLabel="All admin alerts and new requests"
            onPress={() => router.push('/admin-notifications' as any)}
            icon={<Bell size={18} color={UI.blue} />}
            tone="blue"
            badgeCount={unreadNotifications}
          />

          <MenuItem
            label="Dashboard"
            subLabel="Overview & stats"
            onPress={() => router.push('/dashboardadmin' as any)}
            icon={<LayoutDashboard size={18} color={UI.blue} />}
            tone="blue"
          />

          <MenuItem
            label="Mobile Products"
            subLabel="Shop products & mobile orders"
            onPress={() => router.push('/mobileproductsadmin' as any)}
            icon={<Smartphone size={18} color={UI.green} />}
            tone="green"
            badgeCount={getBadgeCount(['shop_orders', 'mobile_orders', 'shop_products'])}
          />

          <MenuItem
            label="SIM Cards"
            subLabel="Add, edit and manage mobile cards"
            onPress={() => router.push('/admin-sim-cards' as any)}
            icon={<CreditCard size={18} color={UI.gold} />}
            tone="gold"
          />

          <MenuItem
            label="Gift Cards"
            subLabel="Add, edit and manage gift cards"
            onPress={() => router.push('/admin-gift-card' as any)}
            icon={<Gift size={18} color={UI.gold} />}
            tone="gold"
          />

          <MenuItem
            label="Gift Card Orders"
            subLabel="Approve, reject and send gift card PIN codes"
            onPress={() => router.push('/admin-gift-card-orders' as any)}
            icon={<ClipboardList size={18} color={UI.gold} />}
            tone="gold"
            badgeCount={getBadgeCount(['gift_card_orders'])}
          />

          <MenuItem
            label="Payment Methods"
            subLabel="Banks, QR codes and withdraw methods"
            onPress={() => router.push('/admin-payment-methods' as any)}
            icon={<Landmark size={18} color={UI.blue} />}
            tone="blue"
          />

          <MenuItem
            label="Top-Up Orders"
            subLabel="Review orders and add PIN codes"
            onPress={() => router.push('/admin-topup-cards' as any)}
            icon={<ClipboardList size={18} color={UI.gold} />}
            tone="gold"
            badgeCount={getBadgeCount(['topup_orders', 'top_up_orders'])}
          />

          <MenuItem
            label="Account Approval"
            subLabel="Approve users"
            onPress={() => router.push('/accountapprovaladmin' as any)}
            icon={<ShieldCheck size={18} color={UI.blue} />}
            tone="blue"
            badgeCount={getBadgeCount(['profiles', 'account_approval', 'account_requests'])}
          />

          <MenuItem
            label="Deposits"
            subLabel="Deposit requests"
            onPress={() => router.push('/depositsadmin' as any)}
            icon={<ArrowDownToLine size={18} color={UI.green} />}
            tone="green"
            badgeCount={getBadgeCount(['deposit_orders', 'deposits'])}
          />

          <MenuItem
            label="Withdrawals"
            subLabel="Withdraw requests"
            onPress={() => router.push('/withdrawalsadmin' as any)}
            icon={<ArrowUpFromLine size={18} color={UI.blue} />}
            tone="blue"
            badgeCount={getBadgeCount(['withdraw_orders', 'withdrawals'])}
          />

          <MenuItem
            label="Add Balance"
            subLabel="Increase wallet"
            onPress={() => router.push('/addbalanceadmin' as any)}
            icon={<PlusCircle size={18} color={UI.green} />}
            tone="green"
          />

          <MenuItem
            label="Withdraw Balance"
            subLabel="Decrease wallet"
            onPress={() => router.push('/withdrawbalanceadmin' as any)}
            icon={<MinusCircle size={18} color={UI.blue} />}
            tone="blue"
          />

          <MenuItem
            label="KYC Document"
            subLabel="User verification"
            onPress={() => router.push('/kycdocumentsadmin' as any)}
            icon={<FileText size={18} color={UI.green} />}
            tone="green"
            badgeCount={getBadgeCount(['kyc_documents', 'kyc_requests', 'kyc'])}
          />

          <MenuItem
            label="Transactions"
            subLabel="History & logs"
            onPress={() => router.push('/transactionsadmin' as any)}
            icon={<ReceiptText size={18} color={UI.blue} />}
            tone="blue"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    backgroundColor: UI.card,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.cardSoft,
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
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 11,
    color: UI.text2,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: UI.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.red,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  heroCard: {
    backgroundColor: UI.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: UI.greenSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: UI.green,
    fontSize: 11,
    fontWeight: '900',
  },
  heroNotificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroNotificationText: {
    color: UI.blue,
    fontSize: 11,
    fontWeight: '900',
  },
  heroNotificationPillSoft: {
    backgroundColor: UI.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroNotificationTextSoft: {
    color: UI.text2,
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 6,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 19,
    color: UI.text2,
    fontWeight: '600',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  menuCard: {
    width: '48.3%',
    minHeight: 128,
    backgroundColor: UI.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  menuTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: UI.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },
  menuSub: {
    fontSize: 11,
    lineHeight: 16,
    color: UI.text2,
    fontWeight: '700',
    maxWidth: '92%',
  },
  menuGlow: {
    position: 'absolute',
    right: -14,
    bottom: -14,
    width: 70,
    height: 70,
    borderRadius: 999,
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
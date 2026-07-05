import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  LogOut,
  Home,
  Wallet,
  PlusCircle,
  ArrowDownToLine,
  ShieldCheck,
  ArrowUpFromLine,
  BarChart3,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

const UI = {
  bg: '#F6F8FB',
  card: '#FFFFFF',
  card2: '#F1F5F9',
  text: '#0F1B33',
  text2: '#475569',
  border: '#E2E8F0',
  blue: '#0F2A5C',
  blueSoft: '#DBEAFE',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  red: '#DC2626',
  redSoft: '#FEE2E2',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

export default function DashboardAdminScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, kycRes, depositsRes, withdrawalsRes, walletsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
        supabase.from('deposit_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdraw_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('wallets').select('balance'),
      ]);

      const totalBalance = walletsRes.data?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;

      return {
        totalUsers: usersRes.count || 0,
        pendingKYC: kycRes.count || 0,
        pendingDeposits: depositsRes.count || 0,
        pendingWithdrawals: withdrawalsRes.count || 0,
        totalSystemBalance: totalBalance,
      };
    },
  });

  const withdrawStatsQuery = useQuery({
    queryKey: ['admin-withdraw-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_withdraw_stats');
      if (error) throw error;
      return data;
    },
  });

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubText}>You don&apos;t have permission to access this page.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeftBtn} onPress={() => router.push('/admin')} activeOpacity={0.85}>
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Overview, stats and quick actions</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: signOut },
            ]);
          }}
          activeOpacity={0.9}
        >
          <LogOut size={16} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageTitleRow}>
          <View style={styles.pageIconWrap}>
            <BarChart3 size={18} color={UI.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.sectionSub}>Admin system statistics</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statValue}>{statsQuery.isLoading ? '...' : statsQuery.data?.totalUsers || 0}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending KYC</Text>
            <Text style={styles.statValue}>{statsQuery.isLoading ? '...' : statsQuery.data?.pendingKYC || 0}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Deposits</Text>
            <Text style={styles.statValue}>{statsQuery.isLoading ? '...' : statsQuery.data?.pendingDeposits || 0}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Withdrawals</Text>
            <Text style={styles.statValue}>{statsQuery.isLoading ? '...' : statsQuery.data?.pendingWithdrawals || 0}</Text>
          </View>
        </View>

        <View style={styles.totalBalanceCard}>
          <View style={styles.totalBalanceTop}>
            <View style={styles.totalBalanceIconWrap}>
              <Wallet size={18} color={UI.blue} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.totalBalanceLabel}>Total System Balance</Text>
              <Text style={styles.totalBalanceValue}>
                ${statsQuery.isLoading ? '...' : (statsQuery.data?.totalSystemBalance || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {withdrawStatsQuery.isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={UI.blue} size="large" />
            <Text style={styles.loadingText}>Loading withdrawal statistics...</Text>
          </View>
        ) : withdrawStatsQuery.data ? (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Withdrawal Statistics</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Withdrawals</Text>
                <Text style={styles.statValue}>{withdrawStatsQuery.data.total_count || 0}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Amount</Text>
                <Text style={styles.statValue}>${parseFloat(withdrawStatsQuery.data.total_amount || 0).toFixed(2)}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={[styles.statValue, { color: UI.amber }]}>{withdrawStatsQuery.data.pending_count || 0}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Approved</Text>
                <Text style={[styles.statValue, { color: UI.green }]}>{withdrawStatsQuery.data.approved_count || 0}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Rejected</Text>
                <Text style={[styles.statValue, { color: UI.red }]}>{withdrawStatsQuery.data.rejected_count || 0}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Pending Amount</Text>
                <Text style={[styles.statValue, { color: UI.amber }]}>
                  ${parseFloat(withdrawStatsQuery.data.pending_amount || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Quick Actions</Text>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/addbalanceadmin')}>
            <View style={[styles.quickIcon, { backgroundColor: UI.greenSoft }]}>
              <PlusCircle size={18} color={UI.green} />
            </View>
            <Text style={styles.quickActionText}>Add Balance to User</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/depositsadmin')}>
            <View style={[styles.quickIcon, { backgroundColor: UI.blueSoft }]}>
              <ArrowDownToLine size={18} color={UI.blue} />
            </View>
            <Text style={styles.quickActionText}>View Pending Deposits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/accountapprovaladmin')}>
            <View style={[styles.quickIcon, { backgroundColor: UI.amberSoft }]}>
              <ShieldCheck size={18} color={UI.amber} />
            </View>
            <Text style={styles.quickActionText}>Review KYC Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/withdrawalsadmin')}>
            <View style={[styles.quickIcon, { backgroundColor: UI.redSoft }]}>
              <ArrowUpFromLine size={18} color={UI.red} />
            </View>
            <Text style={styles.quickActionText}>Review Withdrawals</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: UI.card,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  headerLeftBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: UI.card2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: UI.text,
  },
  headerSub: {
    fontSize: 11,
    color: UI.text2,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: UI.red,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
  },

  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pageIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },
  sectionSub: {
    fontSize: 12,
    color: UI.text2,
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
  },
  statLabel: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    color: UI.text,
    fontWeight: '900',
  },

  totalBalanceCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    marginTop: 10,
  },
  totalBalanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalBalanceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBalanceLabel: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
  },
  totalBalanceValue: {
    fontSize: 22,
    color: UI.blue,
    fontWeight: '900',
    marginTop: 4,
  },

  quickActions: {
    gap: 10,
    marginTop: 6,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    borderRadius: 16,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.text,
  },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: UI.text2,
    textAlign: 'center',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 26,
    fontWeight: '900',
    color: UI.red,
    marginBottom: 10,
  },
  errorSubText: {
    fontSize: 14,
    color: UI.text2,
    textAlign: 'center',
    marginBottom: 18,
  },
  backButton: {
    backgroundColor: UI.blue,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 14,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});

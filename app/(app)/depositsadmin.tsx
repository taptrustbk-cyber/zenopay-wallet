import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DepositOrder, Profile } from '@/lib/types';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  Home,
  ArrowDownToLine,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const AVATAR_BUCKET = 'avatars';

const UI = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardSoft: '#F1F5F9',
  text: '#0F172A',
  text2: '#64748B',
  border: '#E2E8F0',

  green: '#16A34A',
  greenSoft: '#DCFCE7',

  blue: '#2563EB',
  blueSoft: '#DBEAFE',

  red: '#DC2626',
  redSoft: '#FEE2E2',

  amber: '#F59E0B',
  amberSoft: '#FEF3C7',

  shadow: 'rgba(15, 23, 42, 0.08)',
};

const isLikelyUrl = (v?: string | null) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  if (isLikelyUrl(avatarUrl)) return avatarUrl;

  try {
    const pub = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarUrl)?.data?.publicUrl;
    return pub || null;
  } catch {
    return null;
  }
};

const initialsFromName = (name?: string | null) => {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(' ').filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (a + b).toUpperCase() || '?';
};

const formatIraqTime = (value?: string | null) => {
  if (!value) return 'N/A';

  const d = new Date(value);
  if (isNaN(d.getTime())) return 'N/A';

  try {
    return d.toLocaleString(undefined, {
      timeZone: 'Asia/Baghdad',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return d.toLocaleString();
  }
};

export default function DepositsAdminScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const depositsQuery = useQuery({
    queryKey: ['admin-deposits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_orders')
        .select(
          `
          id,
          user_id,
          amount,
          crypto_type,
          transaction_id,
          screenshot_url,
          status,
          created_at,
          profiles!user_id(
            id,
            email,
            full_name,
            city,
            country,
            avatar_url
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...d,
        profile: d.profiles,
      })) as (DepositOrder & {
        profile: Profile & {
          city?: string | null;
          country?: string | null;
          avatar_url?: string | null;
        };
      })[];
    },
    enabled: isAdmin,
  });

  const updateDepositMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('deposit_orders').update({ status }).eq('id', id);
      if (error) throw error;

      if (status === 'approved') {
        const order = depositsQuery.data?.find((d: any) => d.id === id);

        if (order) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', order.user_id)
            .single();

          if (wallet) {
            await supabase
              .from('wallets')
              .update({ balance: wallet.balance + order.amount })
              .eq('user_id', order.user_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      Alert.alert('Success', 'Deposit status updated');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update deposit');
    },
  });

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeftBtn} onPress={() => router.push('/admin')} activeOpacity={0.85}>
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Deposits</Text>
          <Text style={styles.headerSub}>Review and manage deposit requests</Text>
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
        <View style={styles.topBanner}>
          <View style={styles.topBannerIcon}>
            <ArrowDownToLine size={20} color={UI.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Deposit Requests</Text>
            <Text style={styles.sectionSub}>Approve or reject user deposit orders</Text>
          </View>
        </View>

        {depositsQuery.isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={UI.blue} size="large" />
            <Text style={styles.emptyText}>Loading deposits...</Text>
          </View>
        ) : depositsQuery.data && depositsQuery.data.length > 0 ? (
          depositsQuery.data.map((order: any) => {
            const p = order.profile || {};
            const displayName = (p.full_name || '').trim() || 'Unknown Name';
            const avatar = getAvatarUrl(p.avatar_url);

            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.userHeader}>
                  <View style={styles.avatarWrap}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{initialsFromName(displayName)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{displayName}</Text>
                    <Text style={styles.cardSubtitle}>{p.email || 'N/A'}</Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      order.status === 'pending' && { backgroundColor: UI.amberSoft },
                      order.status === 'approved' && { backgroundColor: UI.greenSoft },
                      order.status === 'rejected' && { backgroundColor: UI.redSoft },
                    ]}
                  >
                    {order.status === 'pending' && <Clock size={14} color={UI.amber} />}
                    {order.status === 'approved' && <CheckCircle size={14} color={UI.green} />}
                    {order.status === 'rejected' && <XCircle size={14} color={UI.red} />}
                    <Text
                      style={[
                        styles.badgeText,
                        order.status === 'pending' && { color: UI.amber },
                        order.status === 'approved' && { color: UI.green },
                        order.status === 'rejected' && { color: UI.red },
                      ]}
                    >
                      {(order.status || 'pending').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>City</Text>
                  <Text style={styles.rowValue}>{p.city || 'N/A'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Country</Text>
                  <Text style={styles.rowValue}>{p.country || 'N/A'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Amount</Text>
                  <Text style={[styles.rowValue, { color: UI.green }]}>
                    ${Number(order.amount || 0).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Crypto</Text>
                  <Text style={styles.rowValue}>{(order.crypto_type || '').replace('_', ' ')}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Transaction ID</Text>
                  <Text style={styles.rowValueSmall}>{order.transaction_id || 'N/A'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Date (Iraq)</Text>
                  <Text style={styles.rowValue}>{formatIraqTime(order.created_at)}</Text>
                </View>

                {order.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() =>
                        Alert.alert('Approve Deposit', 'Are you sure you want to approve this deposit?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Approve', onPress: () => updateDepositMutation.mutate({ id: order.id, status: 'approved' }) },
                        ])
                      }
                      disabled={updateDepositMutation.isPending}
                      activeOpacity={0.9}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() =>
                        Alert.alert('Reject Deposit', 'Are you sure you want to reject this deposit?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Reject', style: 'destructive', onPress: () => updateDepositMutation.mutate({ id: order.id, status: 'rejected' }) },
                        ])
                      }
                      disabled={updateDepositMutation.isPending}
                      activeOpacity={0.9}
                    >
                      <XCircle size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No deposit orders found</Text>
          </View>
        )}
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
  headerLeftBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.red,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  topBanner: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  topBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: UI.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },
  sectionSub: {
    marginTop: 3,
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
  },

  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  emptyWrap: {
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: UI.text2,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },

  card: {
    backgroundColor: UI.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.blueSoft,
  },
  avatarFallbackText: {
    fontWeight: '900',
    color: UI.blue,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  rowLabel: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700',
  },
  rowValue: {
    fontSize: 13,
    color: UI.text,
    fontWeight: '800',
    maxWidth: '62%',
    textAlign: 'right',
  },
  rowValueSmall: {
    fontSize: 12,
    color: UI.blue,
    fontWeight: '800',
    maxWidth: '62%',
    textAlign: 'right',
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    backgroundColor: UI.green,
  },
  rejectBtn: {
    backgroundColor: UI.red,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});

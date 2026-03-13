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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  XCircle,
  Clock,
  Home,
  LogOut,
  ArrowUpFromLine,
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

const isLikelyUrl = (v?: string | null) =>
  !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;

  if (isLikelyUrl(avatarUrl)) return avatarUrl;

  const pub = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(avatarUrl)?.data?.publicUrl;

  return pub || null;
};

const initialsFromName = (name?: string | null) => {
  const n = (name || '').trim();
  if (!n) return '?';

  const parts = n.split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const formatIraqTime = (value?: string | null) => {
  if (!value) return 'N/A';

  const d = new Date(value);

  return d.toLocaleString(undefined, {
    timeZone: 'Asia/Baghdad',
  });
};

export default function WithdrawalsAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const withdrawalsQuery = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdraw_orders')
        .select(
          `
          *,
          profiles!user_id(
            id,
            email,
            full_name,
            avatar_url,
            city,
            country
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: isAdmin,
  });

  const updateWithdrawMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('withdraw_orders')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      Alert.alert('Success', 'Withdrawal updated');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Access Denied</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeftBtn}
          onPress={() => router.push('/admin')}
        >
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Withdrawals</Text>
          <Text style={styles.headerSub}>Manage withdrawal requests</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => signOut()}
        >
          <LogOut size={16} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {withdrawalsQuery.isLoading ? (
          <ActivityIndicator size="large" color={UI.blue} />
        ) : (
          withdrawalsQuery.data.map((order: any) => {
            const p = order.profiles || {};
            const avatar = getAvatarUrl(p.avatar_url);

            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.userHeader}>
                  <View style={styles.avatarWrap}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>
                          {initialsFromName(p.full_name)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {p.full_name || 'Unknown'}
                    </Text>
                    <Text style={styles.cardSubtitle}>{p.email}</Text>
                  </View>

                  <View style={styles.badge}>
                    <Clock size={14} color={UI.amber} />
                    <Text style={styles.badgeText}>
                      {(order.status || 'pending').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Amount</Text>
                  <Text style={styles.rowValue}>
                    ${Number(order.amount).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Wallet Address</Text>
                  <Text style={styles.rowValue}>{order.wallet_address}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Date</Text>
                  <Text style={styles.rowValue}>
                    {formatIraqTime(order.created_at)}
                  </Text>
                </View>

                {order.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() =>
                        updateWithdrawMutation.mutate({
                          id: order.id,
                          status: 'approved',
                        })
                      }
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() =>
                        updateWithdrawMutation.mutate({
                          id: order.id,
                          status: 'rejected',
                        })
                      }
                    >
                      <XCircle size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: UI.card,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },

  headerLeftBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },

  headerSub: {
    fontSize: 11,
    color: UI.text2,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.red,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },

  logoutButtonText: {
    color: '#fff',
    marginLeft: 4,
  },

  scrollContent: {
    padding: 16,
  },

  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },

  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 10,
  },

  avatarImg: {
    width: '100%',
    height: '100%',
  },

  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.blueSoft,
  },

  avatarFallbackText: {
    color: UI.blue,
    fontWeight: '900',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
  },

  cardSubtitle: {
    fontSize: 12,
    color: UI.text2,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  badgeText: {
    marginLeft: 4,
    color: UI.amber,
    fontWeight: '900',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  rowLabel: {
    color: UI.text2,
  },

  rowValue: {
    fontWeight: '900',
  },

  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },

  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  approveBtn: {
    backgroundColor: UI.green,
    marginRight: 6,
  },

  rejectBtn: {
    backgroundColor: UI.red,
    marginLeft: 6,
  },

  actionBtnText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '900',
  },
});

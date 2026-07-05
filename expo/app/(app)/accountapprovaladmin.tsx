import React, { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  XCircle,
  Clock,
  Home,
  LogOut,
  ShieldCheck,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const AVATAR_BUCKET = 'avatars';

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

export default function AccountApprovalAdminScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const [accountActionBusy, setAccountActionBusy] = useState<Record<string, 'approve' | 'reject' | null>>({});
  const [adminEmailMap, setAdminEmailMap] = useState<Record<string, string>>({});

  const pendingAccountsQuery = useQuery({
    queryKey: ['admin-pending-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, city, country, avatar_url, created_at, kyc_status, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const isMissingFnError = (err: any) => {
    const msg = String(err?.message || err?.hint || err?.details || '').toLowerCase();
    return (
      msg.includes('could not find the function') ||
      msg.includes('does not exist') ||
      (msg.includes('function') && msg.includes('not found'))
    );
  };

  const tryRpcAny = async (names: string[], args: Record<string, any>) => {
    let lastErr: any = null;

    for (const fnName of names) {
      const { data, error } = await supabase.rpc(fnName, args as any);
      if (!error) return { used: fnName, data };
      lastErr = error;

      if (isMissingFnError(error)) continue;
      throw error;
    }

    throw lastErr || new Error('RPC function not found');
  };

  const setProfileStatusBoth = async (userId: string, next: 'approved' | 'pending') => {
    const call1 = await supabase.rpc('admin_set_profile_status', {
      user_id: userId,
      status: next,
      kyc_status: next,
    });

    if (!call1.error) return;

    const call2 = await supabase.rpc('admin_set_profile_status', {
      user_id: userId,
      status: next,
      kyc_status: next,
    } as any);

    if (!call2.error) return;

    const { error: error3 } = await supabase
      .from('profiles')
      .update({ status: next, kyc_status: next })
      .eq('id', userId);

    if (error3) {
      throw call2.error || call1.error || error3;
    }
  };

  const fetchAuthEmailsByIds = async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (!unique.length) return;

    const missing = unique.filter((id) => !adminEmailMap[id]);
    if (!missing.length) return;

    const rpcNames = ['admin_get_user_emails', 'admin_get_auth_emails', 'get_user_emails', 'get_auth_emails'];

    try {
      const res = await tryRpcAny(rpcNames, { p_user_ids: missing });
      const data = res?.data;

      const nextMap: Record<string, string> = {};

      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          const id = row?.id || row?.user_id;
          const email = row?.email;
          if (id && email) nextMap[id] = String(email);
        });
      } else if (data && typeof data === 'object') {
        Object.keys(data).forEach((k) => {
          const v = (data as any)[k];
          if (v) nextMap[k] = String(v);
        });
      }

      if (Object.keys(nextMap).length) {
        setAdminEmailMap((prev) => ({ ...prev, ...nextMap }));
      }
    } catch (e1: any) {
      if (!isMissingFnError(e1)) {
        console.warn('Email RPC error:', e1?.message || e1);
        return;
      }
    }

    try {
      const res = await tryRpcAny(rpcNames, { user_ids: missing });
      const data = res?.data;

      const nextMap: Record<string, string> = {};

      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          const id = row?.id || row?.user_id;
          const email = row?.email;
          if (id && email) nextMap[id] = String(email);
        });
      } else if (data && typeof data === 'object') {
        Object.keys(data).forEach((k) => {
          const v = (data as any)[k];
          if (v) nextMap[k] = String(v);
        });
      }

      if (Object.keys(nextMap).length) {
        setAdminEmailMap((prev) => ({ ...prev, ...nextMap }));
      }
    } catch (e2: any) {
      if (!isMissingFnError(e2)) console.warn('Email RPC error:', e2?.message || e2);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const ids: string[] = [];
    (pendingAccountsQuery.data || []).forEach((u: any) => {
      const hasEmail = (u.email || '').trim() && (u.email || '').trim().toLowerCase() !== 'n/a';
      if (!hasEmail) ids.push(u.id);
    });

    if (ids.length) fetchAuthEmailsByIds(ids);
  }, [isAdmin, pendingAccountsQuery.data]);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('account-approval-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const displayEmailForUser = (userId?: string | null, email?: string | null) => {
    const e = (email || '').trim();
    if (e && e.toLowerCase() !== 'n/a') return e;
    if (userId && adminEmailMap[userId]) return adminEmailMap[userId];
    return 'N/A';
  };

  const approveAccountMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      setAccountActionBusy((prev) => ({ ...prev, [userId]: 'approve' }));
      await setProfileStatusBoth(userId, 'approved');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      Alert.alert('Success', 'Approved: status + kyc_status updated.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to approve account');
    },
    onSettled: (_d, _e, vars) => {
      if (vars?.userId) {
        setAccountActionBusy((prev) => ({ ...prev, [vars.userId]: null }));
      }
    },
  });

  const rejectAccountMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      setAccountActionBusy((prev) => ({ ...prev, [userId]: 'reject' }));
      await setProfileStatusBoth(userId, 'pending');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      Alert.alert('Success', 'Set back to pending: status + kyc_status updated.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to reject account');
    },
    onSettled: (_d, _e, vars) => {
      if (vars?.userId) {
        setAccountActionBusy((prev) => ({ ...prev, [vars.userId]: null }));
      }
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
          <Text style={styles.headerTitle}>Account Approval</Text>
          <Text style={styles.headerSub}>Approve or reject pending users</Text>
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
            <ShieldCheck size={20} color={UI.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Pending Account Approvals</Text>
            <Text style={styles.sectionSub}>Review new users before allowing full access</Text>
          </View>
        </View>

        {pendingAccountsQuery.isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={UI.blue} size="large" />
            <Text style={styles.emptyText}>Loading pending accounts...</Text>
          </View>
        ) : pendingAccountsQuery.data && pendingAccountsQuery.data.length > 0 ? (
          pendingAccountsQuery.data.map((profile: any) => {
            const avatar = getAvatarUrl(profile.avatar_url);
            const busy = accountActionBusy[profile.id];
            const disableBtns = !!busy || approveAccountMutation.isPending || rejectAccountMutation.isPending;

            return (
              <View key={profile.id} style={styles.card}>
                <View style={styles.userHeader}>
                  <View style={styles.avatarWrap}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{initialsFromName(profile.full_name)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{(profile.full_name || '').trim() || 'Unknown Name'}</Text>
                    <Text style={styles.cardSubtitle}>{displayEmailForUser(profile.id, profile.email)}</Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: UI.amberSoft }]}>
                    <Clock size={14} color={UI.amber} />
                    <Text style={[styles.badgeText, { color: UI.amber }]}>
                      {profile.status?.toUpperCase() || 'PENDING'}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>City</Text>
                  <Text style={styles.rowValue}>{profile.city || 'N/A'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Country</Text>
                  <Text style={styles.rowValue}>{profile.country || 'N/A'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>KYC Status</Text>
                  <Text style={styles.rowValue}>{profile.kyc_status || 'pending'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Status</Text>
                  <Text style={styles.rowValue}>{profile.status || 'pending'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Registered (Iraq)</Text>
                  <Text style={styles.rowValue}>{formatIraqTime(profile.created_at)}</Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.approveBtn,
                      { opacity: disableBtns && busy !== 'approve' ? 0.7 : 1 },
                    ]}
                    onPress={() =>
                      Alert.alert(
                        'Approve Account',
                        `Approve ${profile.full_name || displayEmailForUser(profile.id, profile.email)}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Approve', onPress: () => approveAccountMutation.mutate({ userId: profile.id }) },
                        ]
                      )
                    }
                    disabled={disableBtns}
                    activeOpacity={0.9}
                  >
                    {busy === 'approve' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <CheckCircle size={16} color="#fff" />
                    )}
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.rejectBtn,
                      { opacity: disableBtns && busy !== 'reject' ? 0.7 : 1 },
                    ]}
                    onPress={() =>
                      Alert.alert(
                        'Reject Account',
                        `Set back to pending for ${profile.full_name || displayEmailForUser(profile.id, profile.email)}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Reject', style: 'destructive', onPress: () => rejectAccountMutation.mutate({ userId: profile.id }) },
                        ]
                      )
                    }
                    disabled={disableBtns}
                    activeOpacity={0.9}
                  >
                    {busy === 'reject' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <XCircle size={16} color="#fff" />
                    )}
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No pending accounts</Text>
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

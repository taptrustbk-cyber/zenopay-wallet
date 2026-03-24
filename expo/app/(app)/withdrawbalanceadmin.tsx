import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  Home,
  LogOut,
  MinusCircle,
  Wallet,
  Search,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  BadgeInfo,
  ShieldAlert,
  Users,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const AVATAR_BUCKET = 'avatars';

const UI = {
  bg: '#F4F7FB',
  card: '#FFFFFF',
  cardSoft: '#F8FAFC',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#E2E8F0',

  green: '#16A34A',
  greenSoft: '#DCFCE7',

  blue: '#2563EB',
  blueSoft: '#DBEAFE',

  red: '#DC2626',
  redSoft: '#FEE2E2',

  orange: '#EA580C',
  orangeSoft: '#FFEDD5',

  shadow: '#0F172A',
};

const isLikelyUrl = (v?: string | null) =>
  !!v && (v.startsWith('http://') || v.startsWith('https://'));

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
    return d.toLocaleString('en-GB', {
      timeZone: 'Asia/Baghdad',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d.toLocaleString();
  }
};

const formatIQD = (value?: number | string | null) => {
  const num = Number(value || 0);
  const rounded = Math.round(num);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

type AdminUserRow = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  city: string;
  country: string;
  avatar_url: string | null;
  created_at: string;
  balance: number;
  phone: string;
};

export default function WithdrawBalanceAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const [search, setSearch] = useState('');
  const [showWithdrawBalanceModal, setShowWithdrawBalanceModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedUserBalance, setSelectedUserBalance] = useState(0);
  const [amountToWithdraw, setAmountToWithdraw] = useState('');

  const usersQuery = useQuery({
    queryKey: ['admin-users-withdraw-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select(
          `
          id,
          balance,
          user_id,
          profiles (*)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || 'Failed to fetch wallets');

      return (data || []).map((wallet: any): AdminUserRow => {
        const profile = wallet.profiles || {};
        const phone =
          profile.phone_number ||
          profile.phone ||
          profile.mobile_number ||
          profile.mobile ||
          profile.phone_no ||
          '';

        return {
          id: profile?.id || wallet.user_id,
          user_id: wallet.user_id,
          email: profile?.email || 'N/A',
          full_name: profile?.full_name || '',
          city: profile?.city || '',
          country: profile?.country || '',
          avatar_url: profile?.avatar_url || null,
          created_at: profile?.created_at || new Date().toISOString(),
          balance: Number(wallet.balance || 0),
          phone: phone || '',
        };
      });
    },
    enabled: isAdmin,
  });

  const withdrawBalanceMutation = useMutation({
    mutationFn: async ({
      userId,
      amount,
    }: {
      userId: string;
      amount: number;
    }) => {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) throw new Error(walletError.message || 'Failed to fetch wallet');
      if (!wallet) throw new Error('Wallet not found for this user');

      const currentBalance = Number(wallet.balance || 0);

      if (currentBalance < Number(amount)) {
        throw new Error('Insufficient balance');
      }

      const newBalance = currentBalance - Number(amount);

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) throw new Error(updateError.message || 'Failed to update wallet');

      const { error: txError } = await supabase.from('transactions').insert({
        to_user_id: userId,
        type: 'withdrawal',
        amount: -Number(amount),
        description: 'Admin balance withdrawal',
        status: 'completed',
      });

      if (txError) {
        console.warn('Transaction insert warning:', txError.message);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-withdraw-balance'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      setShowWithdrawBalanceModal(false);
      setAmountToWithdraw('');
      setSelectedUserId('');
      setSelectedUserEmail('');
      setSelectedUserName('');
      setSelectedUserBalance(0);

      Alert.alert('Success', 'Balance withdrawn successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to withdraw balance');
    },
  });

  const allUsers = usersQuery.data || [];

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;

    return allUsers.filter((u) => {
      return (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.city || '').toLowerCase().includes(q) ||
        (u.country || '').toLowerCase().includes(q) ||
        (u.user_id || '').toLowerCase().includes(q)
      );
    });
  }, [allUsers, search]);

  const totalUsers = filteredUsers.length;
  const totalBalance = filteredUsers.reduce((sum, u) => sum + Number(u.balance || 0), 0);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <View style={styles.accessIconWrap}>
            <ShieldAlert size={28} color={UI.red} />
          </View>
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubText}>
            You don&apos;t have permission to access this page.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeftBtn}
          onPress={() => router.push('/admin')}
          activeOpacity={0.85}
        >
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Withdraw Balance</Text>
          <Text style={styles.headerSub}>Professional wallet control panel</Text>
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
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MinusCircle size={22} color={UI.red} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Withdraw Balance From Users</Text>
            <Text style={styles.heroSub}>
              Search users, review profile details, and remove wallet balance safely.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: UI.blueSoft }]}>
              <Users size={18} color={UI.blue} />
            </View>
            <Text style={styles.statValue}>{formatIQD(totalUsers)}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: UI.redSoft }]}>
              <Wallet size={18} color={UI.red} />
            </View>
            <Text style={styles.statValue}>{formatIQD(totalBalance)}</Text>
            <Text style={styles.statLabel}>Total Balance</Text>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchInputWrap}>
            <Search size={17} color={UI.text2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by full name, email, phone, city, country..."
              placeholderTextColor={UI.text3}
              style={styles.searchInput}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.85}>
                <X size={16} color={UI.text2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {usersQuery.isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={UI.blue} size="large" />
            <Text style={styles.emptyText}>Loading users...</Text>
          </View>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((userProfile) => {
            const avatar = getAvatarUrl(userProfile.avatar_url);
            const displayName = (userProfile.full_name || '').trim() || 'Unknown Name';
            const phoneText = userProfile.phone || 'N/A';

            return (
              <View key={userProfile.id} style={styles.userCard}>
                <View style={styles.userTopRow}>
                  <View style={styles.avatarWrap}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>
                          {initialsFromName(displayName)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.userTopText}>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userEmail}>{userProfile.email || 'N/A'}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.withdrawBtn}
                    onPress={() => {
                      setSelectedUserId(userProfile.user_id);
                      setSelectedUserEmail(userProfile.email || 'N/A');
                      setSelectedUserName(displayName);
                      setSelectedUserBalance(Number(userProfile.balance || 0));
                      setShowWithdrawBalanceModal(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <MinusCircle size={15} color="#fff" />
                    <Text style={styles.withdrawBtnText}>Withdraw</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.balanceCard}>
                  <View style={styles.balanceCardLeft}>
                    <Wallet size={16} color={UI.red} />
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                  </View>
                  <Text style={styles.balanceValue}>{formatIQD(userProfile.balance)}</Text>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrap}>
                      <User size={14} color={UI.blue} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Full Name</Text>
                      <Text style={styles.detailValue}>{displayName}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrap}>
                      <Mail size={14} color={UI.blue} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{userProfile.email || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrap}>
                      <Phone size={14} color={UI.blue} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>{phoneText}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrap}>
                      <MapPin size={14} color={UI.blue} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>
                        {[userProfile.city, userProfile.country].filter(Boolean).join(', ') || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrap}>
                      <CalendarDays size={14} color={UI.blue} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Registered</Text>
                      <Text style={styles.detailValue}>
                        {formatIraqTime(userProfile.created_at)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconWrap}>
                      <BadgeInfo size={14} color={UI.blue} />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>User ID</Text>
                      <Text numberOfLines={1} style={styles.detailValue}>
                        {userProfile.user_id || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showWithdrawBalanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWithdrawBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Withdraw Balance</Text>
                <Text style={styles.modalSubtitle}>
                  Remove amount from selected user wallet
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowWithdrawBalanceModal(false);
                  setAmountToWithdraw('');
                  setSelectedUserId('');
                  setSelectedUserEmail('');
                  setSelectedUserName('');
                  setSelectedUserBalance(0);
                }}
                activeOpacity={0.85}
              >
                <X size={16} color={UI.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInfoCard}>
              <Text style={styles.modalInfoTitle}>{selectedUserName || 'Selected User'}</Text>
              <Text style={styles.modalInfoText}>{selectedUserEmail}</Text>
              <Text style={styles.modalInfoBalance}>
                Balance: {formatIQD(selectedUserBalance)}
              </Text>
            </View>

            <TextInput
              style={[styles.modalInput, styles.modalInputDisabled]}
              placeholder="User Email"
              placeholderTextColor={UI.text2}
              value={selectedUserEmail}
              editable={false}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Amount (IQD)"
              placeholderTextColor={UI.text2}
              keyboardType="numeric"
              value={amountToWithdraw}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                setAmountToWithdraw(cleaned);
              }}
            />

            {!!amountToWithdraw && (
              <Text style={styles.previewAmount}>
                Amount: {formatIQD(amountToWithdraw)}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowWithdrawBalanceModal(false);
                  setAmountToWithdraw('');
                  setSelectedUserId('');
                  setSelectedUserEmail('');
                  setSelectedUserName('');
                  setSelectedUserBalance(0);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  const amount = Number(amountToWithdraw);

                  if (isNaN(amount) || amount <= 0) {
                    Alert.alert('Error', 'Please enter a valid amount');
                    return;
                  }

                  withdrawBalanceMutation.mutate({
                    userId: selectedUserId,
                    amount,
                  });
                }}
                disabled={withdrawBalanceMutation.isPending}
                activeOpacity={0.9}
              >
                {withdrawBalanceMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Withdraw</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLeftBtn: {
    width: 42,
    height: 42,
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
    fontSize: 18,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
    shadowColor: UI.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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

  heroCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    shadowColor: UI.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: UI.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },
  heroSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: UI.text2,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    shadowColor: UI.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: UI.text2,
    fontWeight: '800',
  },

  searchCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 20,
    padding: 12,
    marginBottom: 14,
    shadowColor: UI.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: UI.cardSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  searchInput: {
    flex: 1,
    color: UI.text,
    fontWeight: '800',
    fontSize: 14,
  },

  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  emptyWrap: {
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: UI.text2,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },

  userCard: {
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
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
    fontSize: 16,
  },

  userTopText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700',
  },

  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.red,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 13,
  },
  withdrawBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  balanceCard: {
    borderRadius: 18,
    backgroundColor: '#FFF7F7',
    borderWidth: 1,
    borderColor: '#FED7D7',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  balanceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.text2,
  },
  balanceValue: {
    fontSize: 19,
    fontWeight: '900',
    color: UI.red,
  },

  detailsGrid: {
    gap: 10,
  },
  detailItem: {
    backgroundColor: UI.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: UI.text2,
    fontWeight: '800',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: UI.text,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInfoCard: {
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  modalInfoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
  },
  modalInfoText: {
    marginTop: 4,
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700',
  },
  modalInfoBalance: {
    marginTop: 8,
    fontSize: 14,
    color: UI.red,
    fontWeight: '900',
  },
  modalInput: {
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 14,
    padding: 14,
    color: UI.text,
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '700',
  },
  modalInputDisabled: {
    color: UI.text2,
  },
  previewAmount: {
    marginTop: -2,
    marginBottom: 12,
    color: UI.blue,
    fontWeight: '900',
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#64748B',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontWeight: '900',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: UI.red,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '900',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: UI.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
    lineHeight: 22,
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

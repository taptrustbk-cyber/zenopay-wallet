import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  Home,
  LogOut,
  PlusCircle,
  Wallet,
  Search,
  X,
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

export default function AddBalanceAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const [search, setSearch] = useState('');
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');
  const [noteToAdd, setNoteToAdd] = useState('');

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select(
          `
          id,
          balance,
          user_id,
          profiles (
            id,
            email,
            full_name,
            city,
            country,
            avatar_url,
            created_at
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || 'Failed to fetch wallets');

      return (data || []).map((wallet: any) => ({
        id: wallet.profiles?.id || wallet.user_id,
        email: wallet.profiles?.email || 'N/A',
        full_name: wallet.profiles?.full_name || '',
        city: wallet.profiles?.city || '',
        country: wallet.profiles?.country || '',
        avatar_url: wallet.profiles?.avatar_url || null,
        created_at: wallet.profiles?.created_at || new Date().toISOString(),
        balance: wallet.balance || 0,
      }));
    },
    enabled: isAdmin,
  });

  const addBalanceMutation = useMutation({
    mutationFn: async ({
      userId,
      amount,
      note,
    }: {
      userId: string;
      amount: number;
      note: string;
    }) => {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) throw new Error(walletError.message || 'Failed to fetch wallet');
      if (!wallet) throw new Error('Wallet not found for this user');

      const newBalance = (wallet.balance || 0) + Number(amount);

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) throw new Error(updateError.message || 'Failed to update wallet');

      const { error: txError } = await supabase.from('transactions').insert({
        to_user_id: userId,
        type: 'deposit',
        amount: Number(amount),
        description: note || 'Admin balance add',
        status: 'completed',
      });

      if (txError) {
        console.warn('Transaction insert warning:', txError.message);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      setShowAddBalanceModal(false);
      setAmountToAdd('');
      setNoteToAdd('');
      setSelectedUserId('');
      setSelectedUserEmail('');

      Alert.alert('Success', 'Balance added successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to add balance');
    },
  });

  const filteredUsers = (usersQuery.data || []).filter((u: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;

    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q) ||
      (u.country || '').toLowerCase().includes(q)
    );
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
          <Text style={styles.headerTitle}>Add Balance</Text>
          <Text style={styles.headerSub}>Increase user wallet balance</Text>
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
            <PlusCircle size={20} color={UI.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Add Balance To User</Text>
            <Text style={styles.sectionSub}>Choose a user and add amount to wallet</Text>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchLeft}>
            <Search size={16} color={UI.text2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, email, city, country..."
              placeholderTextColor={UI.text2}
              style={styles.searchInput}
            />
          </View>

          <TouchableOpacity style={styles.searchClearBtn} onPress={() => setSearch('')} activeOpacity={0.85}>
            <Text style={styles.searchClearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {usersQuery.isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={UI.blue} size="large" />
            <Text style={styles.emptyText}>Loading users...</Text>
          </View>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((userProfile: any) => {
            const avatar = getAvatarUrl(userProfile.avatar_url);
            const displayName = (userProfile.full_name || '').trim() || 'Unknown Name';

            return (
              <View key={userProfile.id} style={styles.card}>
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
                    <Text style={styles.cardSubtitle}>{userProfile.email || 'N/A'}</Text>

                    <View style={styles.balanceRow}>
                      <Wallet size={14} color={UI.green} />
                      <Text style={styles.balanceText}>Balance: ${Number(userProfile.balance || 0).toFixed(2)}</Text>
                    </View>

                    <Text style={styles.smallMeta}>
                      {userProfile.city || 'N/A'} • {userProfile.country || 'N/A'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                      setSelectedUserId(userProfile.id);
                      setSelectedUserEmail(userProfile.email || 'N/A');
                      setShowAddBalanceModal(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <PlusCircle size={15} color="#fff" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Registered (Iraq)</Text>
                  <Text style={styles.rowValue}>{formatIraqTime(userProfile.created_at)}</Text>
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
        visible={showAddBalanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTop}>
              <View>
                <Text style={styles.modalTitle}>Add Balance</Text>
                <Text style={styles.modalSubtitle}>Enter amount and note</Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowAddBalanceModal(false);
                  setAmountToAdd('');
                  setNoteToAdd('');
                  setSelectedUserId('');
                  setSelectedUserEmail('');
                }}
                activeOpacity={0.85}
              >
                <X size={16} color={UI.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="User Email"
              placeholderTextColor={UI.text2}
              value={selectedUserEmail}
              editable={false}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Amount (USD)"
              placeholderTextColor={UI.text2}
              keyboardType="numeric"
              value={amountToAdd}
              onChangeText={setAmountToAdd}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Note (optional)"
              placeholderTextColor={UI.text2}
              value={noteToAdd}
              onChangeText={setNoteToAdd}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowAddBalanceModal(false);
                  setAmountToAdd('');
                  setNoteToAdd('');
                  setSelectedUserId('');
                  setSelectedUserEmail('');
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  const amount = parseFloat(amountToAdd);

                  if (isNaN(amount) || amount <= 0) {
                    Alert.alert('Error', 'Please enter a valid amount');
                    return;
                  }

                  addBalanceMutation.mutate({
                    userId: selectedUserId,
                    amount,
                    note: noteToAdd,
                  });
                }}
                disabled={addBalanceMutation.isPending}
                activeOpacity={0.9}
              >
                {addBalanceMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Add Balance</Text>
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

  searchCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: UI.cardSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  searchInput: {
    flex: 1,
    color: UI.text,
    fontWeight: '800',
  },
  searchClearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: UI.border,
  },
  searchClearText: {
    color: UI.blue,
    fontWeight: '900',
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

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  balanceText: {
    fontSize: 13,
    color: UI.green,
    fontWeight: '900',
  },
  smallMeta: {
    marginTop: 6,
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: UI.green,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: UI.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
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
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInput: {
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 12,
    padding: 14,
    color: UI.text,
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#64748B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontWeight: '900',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: UI.green,
    paddingVertical: 12,
    borderRadius: 12,
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

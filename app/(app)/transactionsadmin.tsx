import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  Home,
  LogOut,
  ReceiptText,
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

export default function TransactionsAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const [txEmailFilter, setTxEmailFilter] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txAmountFilter, setTxAmountFilter] = useState('all');

  const transactionsQuery = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          balance_after,
          type,
          description,
          created_at,
          from_user_id,
          to_user_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || 'Failed to fetch transactions');

      const userIds = new Set<string>();
      data?.forEach((tx: any) => {
        if (tx.from_user_id) userIds.add(tx.from_user_id);
        if (tx.to_user_id) userIds.add(tx.to_user_id);
      });

      let profilesMap: Record<string, any> = {};

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, city, country, avatar_url')
          .in('id', Array.from(userIds));

        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap[p.id] = p;
          });
        }
      }

      return (
        data?.map((tx: any) => ({
          ...tx,
          receiver: profilesMap[tx.to_user_id] || null,
          related: profilesMap[tx.from_user_id] || null,
        })) || []
      );
    },
    enabled: isAdmin,
  });

  const filteredTransactions = useMemo(() => {
    const list = transactionsQuery.data || [];

    return list.filter((tx: any) => {
      const receiverEmail = tx.receiver?.email || '';
      const relatedEmail = tx.related?.email || '';
      const allEmails = `${receiverEmail} ${relatedEmail}`.toLowerCase();

      const matchesEmail =
        txEmailFilter.trim() === '' ||
        allEmails.includes(txEmailFilter.trim().toLowerCase());

      const matchesType =
        txTypeFilter === 'all' || tx.type === txTypeFilter;

      const matchesAmount =
        txAmountFilter === 'all' ||
        (txAmountFilter === 'positive' && Number(tx.amount || 0) >= 0) ||
        (txAmountFilter === 'negative' && Number(tx.amount || 0) < 0);

      return matchesEmail && matchesType && matchesAmount;
    });
  }, [transactionsQuery.data, txEmailFilter, txTypeFilter, txAmountFilter]);

  const getTransactionTitle = (tx: any) => {
    switch (tx.type) {
      case 'send':
        return `Sent to ${tx.related?.email || 'user'}`;
      case 'receive':
        return `Received from ${tx.related?.email || 'user'}`;
      case 'admin_add':
        return 'Admin balance add';
      case 'purchase_card':
        return 'Card purchase';
      case 'purchase_giftcard':
        return 'Gift card purchase';
      case 'purchase_mobile':
        return 'Mobile purchase';
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      default:
        return tx.type || 'Transaction';
    }
  };

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
          <Text style={styles.headerTitle}>Transactions</Text>
          <Text style={styles.headerSub}>All transaction history and filters</Text>
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
            <ReceiptText size={20} color={UI.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <Text style={styles.sectionSub}>Search and filter all transaction records</Text>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <Text style={styles.filterTitle}>Filters</Text>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>User Email</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Search by email..."
              placeholderTextColor={UI.text2}
              value={txEmailFilter}
              onChangeText={setTxEmailFilter}
            />
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
              {[
                { key: 'all', label: 'All' },
                { key: 'send', label: 'Send' },
                { key: 'receive', label: 'Receive' },
                { key: 'purchase_mobile', label: 'Mobile' },
                { key: 'purchase_card', label: 'Card' },
                { key: 'purchase_giftcard', label: 'Gift Card' },
                { key: 'admin_add', label: 'Admin Add' },
                { key: 'deposit', label: 'Deposit' },
                { key: 'withdrawal', label: 'Withdrawal' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.filterChip, txTypeFilter === c.key && styles.filterChipActive]}
                  onPress={() => setTxTypeFilter(c.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, txTypeFilter === c.key && styles.filterChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Amount</Text>
            <View style={styles.filterChipRow}>
              {[
                { key: 'all', label: 'All' },
                { key: 'positive', label: '+ Positive' },
                { key: 'negative', label: '− Negative' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.filterChip, txAmountFilter === c.key && styles.filterChipActive]}
                  onPress={() => setTxAmountFilter(c.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, txAmountFilter === c.key && styles.filterChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {transactionsQuery.isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={UI.blue} size="large" />
            <Text style={styles.emptyText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx: any) => {
            const person = tx.receiver || tx.related || null;
            const displayName = (person?.full_name || '').trim() || 'Unknown Name';
            const avatar = getAvatarUrl(person?.avatar_url);
            const amount = Number(tx.amount || 0);

            return (
              <View key={tx.id} style={styles.card}>
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
                    <Text style={styles.cardSubtitle}>{person?.email || 'N/A'}</Text>
                  </View>

                  <View style={[styles.amountBadge, amount >= 0 ? styles.amountBadgePositive : styles.amountBadgeNegative]}>
                    <Text style={[styles.amountBadgeText, amount >= 0 ? styles.amountBadgeTextPositive : styles.amountBadgeTextNegative]}>
                      {amount >= 0 ? '+' : ''}${amount.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Type</Text>
                  <Text style={styles.rowValue}>{getTransactionTitle(tx)}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Raw Type</Text>
                  <Text style={styles.rowValue}>{tx.type || 'N/A'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Balance After</Text>
                  <Text style={[styles.rowValue, { color: UI.blue }]}>
                    ${Number(tx.balance_after || 0).toFixed(2)}
                  </Text>
                </View>

                {tx.description ? (
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Description</Text>
                    <Text style={styles.rowValue}>{tx.description}</Text>
                  </View>
                ) : null}

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Time (Iraq)</Text>
                  <Text style={styles.rowValue}>{formatIraqTime(tx.created_at)}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No transactions match your filters</Text>

            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setTxEmailFilter('');
                setTxTypeFilter('all');
                setTxAmountFilter('all');
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </TouchableOpacity>
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

  filtersCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 12,
  },
  filterItem: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.text2,
    marginBottom: 8,
  },
  filterInput: {
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 12,
    padding: 12,
    color: UI.text,
    fontWeight: '700',
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'nowrap',
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
  },
  filterChipActive: {
    backgroundColor: UI.blue,
    borderColor: UI.blue,
  },
  filterChipText: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: UI.text2,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  clearBtn: {
    marginTop: 14,
    backgroundColor: UI.blue,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  clearBtnText: {
    color: '#fff',
    fontWeight: '900',
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

  amountBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  amountBadgePositive: {
    backgroundColor: UI.greenSoft,
  },
  amountBadgeNegative: {
    backgroundColor: UI.redSoft,
  },
  amountBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  amountBadgeTextPositive: {
    color: UI.green,
  },
  amountBadgeTextNegative: {
    color: UI.red,
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

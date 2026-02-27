import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DepositOrder, Profile, WithdrawOrder } from '@/lib/types';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  FileText,
  ExternalLink,
  Home,
  X,
  ShieldCheck,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
  MinusCircle,
  ReceiptText,
  Image as ImageIcon,
  Search,
  BarChart3,
} from 'lucide-react-native';

// ✅ IMPORTANT: remove the default (dark blue) navigation header
export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

// ✅ Your real bucket name
const KYC_BUCKET = 'kyc-documents';

// 🎨 Modern light admin UI
const UI = {
  bg: '#F6F8FB',
  card: '#FFFFFF',
  card2: '#F1F5F9',
  text: '#0F172A',
  text2: '#475569',
  border: '#E2E8F0',
  blue: '#2563EB',
  blueSoft: '#DBEAFE',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  red: '#DC2626',
  redSoft: '#FEE2E2',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

type TabKey =
  | 'dashboard'
  | 'account_approval'
  | 'deposits'
  | 'withdrawals'
  | 'add_balance'
  | 'withdraw_balance'
  | 'kyc_documents'
  | 'user_documents'
  | 'transactions';

type KycKind = 'id_front' | 'id_back' | 'selfie';

export default function AdminScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme(); // kept (not removed) to avoid breaking your app
  const router = useRouter();
  const queryClient = useQueryClient();

  // ✅ default open to KYC Documents
  const [selectedTab, setSelectedTab] = useState<TabKey>('kyc_documents');

  const [txEmailFilter, setTxEmailFilter] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txAmountFilter, setTxAmountFilter] = useState('all');

  // ✅ search for user documents tab
  const [docSearch, setDocSearch] = useState('');

  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [showWithdrawBalanceModal, setShowWithdrawBalanceModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [noteToAdd, setNoteToAdd] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');
  const [amountToWithdraw, setAmountToWithdraw] = useState('');

  // ✅ KYC preview modal
  const [kycPreviewOpen, setKycPreviewOpen] = useState(false);
  const [kycPreviewTitle, setKycPreviewTitle] = useState('');
  const [kycPreviewUrl, setKycPreviewUrl] = useState('');
  const [kycPreviewLoading, setKycPreviewLoading] = useState(false);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  // ---------- KYC helpers ----------
  const isLikelyUrl = (v?: string | null) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

  const KYC_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

  const trySignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from(KYC_BUCKET).createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data?.signedUrl || null;
  };

  // ✅ smarter resolver
  const resolveKycPathSmart = async (userId: string, kind: KycKind) => {
    // 1) try list folder (best)
    try {
      const { data, error } = await supabase.storage.from(KYC_BUCKET).list(userId, {
        limit: 200,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (!error && data && data.length > 0) {
        const lower = kind.toLowerCase();

        const exact =
          data.find((f) => (f.name || '').toLowerCase() === `${lower}.jpeg`) ||
          data.find((f) => (f.name || '').toLowerCase() === `${lower}.jpg`) ||
          data.find((f) => (f.name || '').toLowerCase() === `${lower}.png`) ||
          data.find((f) => (f.name || '').toLowerCase() === `${lower}.webp`);

        const loose = data.find((f) => (f.name || '').toLowerCase().includes(lower));
        const match = exact || loose;

        if (match?.name) return `${userId}/${match.name}`;
      }
    } catch {
      // ignore
    }

    // 2) fallback: try common filenames without list permission
    for (const ext of KYC_EXTS) {
      const candidate = `${userId}/${kind}.${ext}`;
      const signed = await trySignedUrl(candidate);
      if (signed) return candidate; // exists
    }

    return null;
  };

  const getKycUrl = async (pathOrUrl?: string | null) => {
    if (!pathOrUrl) return null;
    if (isLikelyUrl(pathOrUrl)) return pathOrUrl;

    // ✅ 1) signed url first (works for private buckets)
    const signed = await trySignedUrl(pathOrUrl);
    if (signed) return signed;

    // ✅ 2) then public url (works if bucket is public)
    const pub = supabase.storage.from(KYC_BUCKET).getPublicUrl(pathOrUrl)?.data?.publicUrl;
    if (pub) return pub;

    return null;
  };

  const openKycPreview = async (title: string, pathOrUrl?: string | null, userId?: string, kind?: KycKind) => {
    setKycPreviewTitle(title);
    setKycPreviewUrl('');
    setKycPreviewOpen(true);
    setKycPreviewLoading(true);

    let finalPath = pathOrUrl || null;

    // ✅ if column empty, resolve from storage
    if ((!finalPath || finalPath === 'null') && userId && kind) {
      finalPath = await resolveKycPathSmart(userId, kind);
    }

    if (!finalPath) {
      setKycPreviewLoading(false);
      Alert.alert('No File', `${title} photo not uploaded`);
      return;
    }

    const url = await getKycUrl(finalPath);
    setKycPreviewUrl(url || '');
    setKycPreviewLoading(false);

    if (!url) {
      Alert.alert('Error', 'Failed to load image. Check bucket privacy/policy.');
    }
  };

  const openExternal = async (pathOrUrl?: string | null, userId?: string, kind?: KycKind) => {
    let finalPath = pathOrUrl || null;

    if ((!finalPath || finalPath === 'null') && userId && kind) {
      finalPath = await resolveKycPathSmart(userId, kind);
    }

    const url = await getKycUrl(finalPath);
    if (!url) {
      Alert.alert('Error', 'Cannot open file');
      return;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Error', 'Cannot open this URL');
      return;
    }
    await Linking.openURL(url);
  };

  // ---------- realtime subscriptions ----------
  useEffect(() => {
    if (!isAdmin || selectedTab !== 'account_approval') return;

    const channel = supabase
      .channel('admin-pending-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  useEffect(() => {
    if (!isAdmin || selectedTab !== 'deposits') return;

    const channel = supabase
      .channel('admin-deposits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  useEffect(() => {
    if (!isAdmin || selectedTab !== 'withdrawals') return;

    const channel = supabase
      .channel('admin-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdraw_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-withdraw-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  // ✅ realtime for KYC documents so new users appear automatically
  useEffect(() => {
    if (!isAdmin || (selectedTab !== 'kyc_documents' && selectedTab !== 'user_documents')) return;

    const channel = supabase
      .channel('admin-kyc-documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  // ---------- queries ----------
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
            full_name
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...d,
        profile: d.profiles,
      })) as (DepositOrder & { profile: Profile })[];
    },
    enabled: selectedTab === 'deposits',
  });

  const withdrawalsQuery = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdraw_orders')
        .select(
          `
          id,
          user_id,
          amount,
          currency,
          crypto,
          destination,
          status,
          created_at,
          profiles!user_id(
            id,
            full_name,
            email
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (
        (data || []).map((withdrawal: any) => ({
          ...withdrawal,
          profile: withdrawal.profiles,
        })) || []
      ) as (WithdrawOrder & { profile: Profile })[];
    },
    enabled: selectedTab === 'withdrawals',
  });

  const pendingAccountsQuery = useQuery({
    queryKey: ['admin-pending-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, kyc_status, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: selectedTab === 'account_approval',
  });

  // ✅ KYC tab must show ONLY users who have uploaded at least one KYC file
  // (id_front OR id_back OR selfie not null). This avoids showing all users.
  const kycDocumentsQuery = useQuery({
    queryKey: ['admin-kyc-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, kyc_status, status, id_front, id_back, selfie, created_at')
        .or('id_front.not.is.null,id_back.not.is.null,selfie.not.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: selectedTab === 'kyc_documents' || selectedTab === 'user_documents',
  });

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
        created_at: wallet.profiles?.created_at || new Date().toISOString(),
        wallet: [{ balance: wallet.balance || 0 }],
      }));
    },
    enabled: selectedTab === 'add_balance' || selectedTab === 'withdraw_balance',
  });

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
    enabled: selectedTab === 'dashboard' || selectedTab === 'withdrawals',
  });

  const transactionsQuery = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          id,
          amount,
          balance_after,
          type,
          description,
          created_at,
          from_user_id,
          to_user_id
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || 'Failed to fetch transactions');

      const userIds = new Set<string>();
      data?.forEach((tx: any) => {
        if (tx.from_user_id) userIds.add(tx.from_user_id);
        if (tx.to_user_id) userIds.add(tx.to_user_id);
      });

      let profilesMap: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', Array.from(userIds));
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
    enabled: selectedTab === 'transactions',
  });

  // ✅ filtered list for user_documents tab
  const filteredDocUsers = useMemo(() => {
    const list = kycDocumentsQuery.data || [];
    const q = docSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u: any) => {
      const name = (u.full_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [kycDocumentsQuery.data, docSearch]);

  // ---------- mutations ----------
  const updateDepositMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('deposit_orders').update({ status }).eq('id', id);
      if (error) throw error;

      if (status === 'approved') {
        const order = depositsQuery.data?.find((d) => d.id === id);
        if (order) {
          const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', order.user_id).single();
          if (wallet) {
            await supabase.from('wallets').update({ balance: wallet.balance + order.amount }).eq('user_id', order.user_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
      Alert.alert('Success', 'Deposit status updated');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  const approveAccountMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase.from('profiles').update({ status: 'approved', kyc_status: 'approved' }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      Alert.alert('Success', 'Account approved successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to approve account');
    },
  });

  const rejectAccountMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase.from('profiles').update({ status: 'rejected', kyc_status: 'rejected' }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      Alert.alert('Success', 'Account rejected.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to reject account');
    },
  });

  const addBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, note }: { userId: string; amount: number; note: string }) => {
      const { data: wallet, error: walletError } = await supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle();

      if (walletError) throw new Error(walletError.message || 'Failed to fetch wallet');
      if (!wallet) throw new Error('Wallet not found for this user');

      const newBalance = (wallet?.balance || 0) + Number(amount);

      const { error: updateError } = await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', userId);
      if (updateError) throw new Error(updateError.message || 'Failed to update wallet');

      const { error: txError } = await supabase.from('transactions').insert({
        to_user_id: userId,
        type: 'deposit',
        amount: Number(amount),
        description: note || 'Admin balance add',
        status: 'completed',
      });

      if (txError) console.warn('⚠️ Transaction log error:', txError);

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

  const withdrawBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      const { data: wallet, error: walletError } = await supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle();

      if (walletError) throw new Error(walletError.message || 'Failed to fetch wallet');
      if (!wallet) throw new Error('Wallet not found for this user');

      const currentBalance = wallet?.balance || 0;
      if (currentBalance < Number(amount)) throw new Error('Insufficient balance');

      const newBalance = currentBalance - Number(amount);

      const { error: updateError } = await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', userId);
      if (updateError) throw new Error(updateError.message || 'Failed to update wallet');

      const { error: txError } = await supabase.from('transactions').insert({
        to_user_id: userId,
        type: 'withdrawal',
        amount: -Number(amount),
        description: 'Admin balance withdrawal',
        status: 'completed',
      });

      if (txError) console.warn('⚠️ Transaction log error:', txError);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setShowWithdrawBalanceModal(false);
      setAmountToWithdraw('');
      setSelectedUserId('');
      Alert.alert('Success', 'Balance withdrawn successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to withdraw balance');
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      if (status === 'approved') {
        const { error } = await supabase.rpc('admin_approve_withdraw', { p_withdraw_id: id });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('admin_reject_withdraw', {
          p_withdraw_id: id,
          p_reason: 'Rejected by admin',
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });

      if (variables.status === 'approved') {
        Alert.alert('Success', "Withdrawal approved and balance deducted from user's account.");
      } else {
        Alert.alert('Success', 'Withdrawal rejected. User balance has been refunded.');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  // ---------- deny screen ----------
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

  const MenuButton = ({ label, tab, icon }: { label: string; tab: TabKey; icon: React.ReactNode }) => {
    const active = selectedTab === tab;
    return (
      <TouchableOpacity style={[styles.menuBtn, active && styles.menuBtnActive]} onPress={() => setSelectedTab(tab)} activeOpacity={0.85}>
        <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>{icon}</View>
        <Text style={[styles.menuText, active && styles.menuTextActive]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const kycBadge = (kycStatus?: string | null) => {
    const s = (kycStatus || 'pending').toLowerCase();
    if (s === 'approved') {
      return { bg: UI.greenSoft, color: UI.green, icon: <CheckCircle size={14} color={UI.green} />, text: 'APPROVED' };
    }
    if (s === 'rejected') {
      return { bg: UI.redSoft, color: UI.red, icon: <XCircle size={14} color={UI.red} />, text: 'REJECTED' };
    }
    return { bg: UI.amberSoft, color: UI.amber, icon: <Clock size={14} color={UI.amber} />, text: 'PENDING' };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      {/* ✅ single header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeftBtn} onPress={() => router.push('/dashboard')} activeOpacity={0.85}>
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>Manage users, KYC, deposits & withdrawals</Text>
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

      {/* ✅ MENU (Removed: Waiting Users / Products / Orders / Market Analytics) */}
      <View style={styles.menuWrap}>
        <MenuButton label="Dashboard" tab="dashboard" icon={<BarChart3 size={16} color={selectedTab === 'dashboard' ? UI.blue : UI.text2} />} />
        <MenuButton
          label="Account Approval"
          tab="account_approval"
          icon={<ShieldCheck size={16} color={selectedTab === 'account_approval' ? UI.blue : UI.text2} />}
        />
        <MenuButton label="Deposits" tab="deposits" icon={<ArrowDownToLine size={16} color={selectedTab === 'deposits' ? UI.blue : UI.text2} />} />
        <MenuButton
          label="Withdrawals"
          tab="withdrawals"
          icon={<ArrowUpFromLine size={16} color={selectedTab === 'withdrawals' ? UI.blue : UI.text2} />}
        />
        <MenuButton label="Add Balance" tab="add_balance" icon={<PlusCircle size={16} color={selectedTab === 'add_balance' ? UI.blue : UI.text2} />} />
        <MenuButton
          label="Withdraw Balance"
          tab="withdraw_balance"
          icon={<MinusCircle size={16} color={selectedTab === 'withdraw_balance' ? UI.blue : UI.text2} />}
        />
        <MenuButton label="KYC Document" tab="kyc_documents" icon={<FileText size={16} color={selectedTab === 'kyc_documents' ? UI.blue : UI.text2} />} />
        <MenuButton
          label="Document Image User"
          tab="user_documents"
          icon={<ImageIcon size={16} color={selectedTab === 'user_documents' ? UI.blue : UI.text2} />}
        />
        <MenuButton
          label="Transactions"
          tab="transactions"
          icon={<ReceiptText size={16} color={selectedTab === 'transactions' ? UI.blue : UI.text2} />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ---------------- Document Image User ---------------- */}
        {selectedTab === 'user_documents' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Document Image User</Text>

            <View style={styles.searchCard}>
              <View style={styles.searchLeft}>
                <Search size={16} color={UI.text2} />
                <TextInput
                  value={docSearch}
                  onChangeText={setDocSearch}
                  placeholder="Search by email or full name..."
                  placeholderTextColor={UI.text2}
                  style={styles.searchInput}
                />
              </View>
              <TouchableOpacity style={styles.searchClearBtn} onPress={() => setDocSearch('')} activeOpacity={0.85}>
                <Text style={styles.searchClearText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {kycDocumentsQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading users...</Text>
              </View>
            ) : filteredDocUsers.length > 0 ? (
              filteredDocUsers.map((u: any) => {
                const badge = kycBadge(u.kyc_status);
                const displayName = (u.full_name || '').trim(); // ✅ show full_name if exists (empty is OK)
                return (
                  <View key={u.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{displayName}</Text>
                        <Text style={styles.cardSubtitle}>{u.email}</Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        {badge.icon}
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Upload / Registered Time</Text>
                      <Text style={styles.rowValue}>{new Date(u.created_at).toLocaleString()}</Text>
                    </View>

                    <View style={styles.kycBlock}>
                      <Text style={styles.kycBlockTitle}>Documents</Text>

                      <View style={styles.docGrid}>
                        <TouchableOpacity style={styles.docBtn} onPress={() => openKycPreview('ID Front', u.id_front, u.id, 'id_front')} activeOpacity={0.85}>
                          <FileText size={16} color={UI.green} />
                          <Text style={styles.docBtnText}>ID Front</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.docBtn} onPress={() => openKycPreview('ID Back', u.id_back, u.id, 'id_back')} activeOpacity={0.85}>
                          <FileText size={16} color={UI.green} />
                          <Text style={styles.docBtnText}>ID Back</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.docBtn} onPress={() => openKycPreview('Selfie', u.selfie, u.id, 'selfie')} activeOpacity={0.85}>
                          <FileText size={16} color={UI.green} />
                          <Text style={styles.docBtnText}>Selfie</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ marginTop: 10, gap: 10 }}>
                        <TouchableOpacity style={styles.docLinkButton} onPress={() => openExternal(u.id_front, u.id, 'id_front')}>
                          <ExternalLink size={16} color={UI.blue} />
                          <Text style={styles.docLinkText}>Open ID Front</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.docLinkButton} onPress={() => openExternal(u.id_back, u.id, 'id_back')}>
                          <ExternalLink size={16} color={UI.blue} />
                          <Text style={styles.docLinkText}>Open ID Back</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.docLinkButton} onPress={() => openExternal(u.selfie, u.id, 'selfie')}>
                          <ExternalLink size={16} color={UI.blue} />
                          <Text style={styles.docLinkText}>Open Selfie</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.emptyText}>No users found</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => kycDocumentsQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ---------------- Dashboard ---------------- */}
        {selectedTab === 'dashboard' && (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>

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

            {withdrawStatsQuery.data && (
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
            )}

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Quick Actions</Text>

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionButton} onPress={() => setSelectedTab('add_balance')}>
                <View style={[styles.quickIcon, { backgroundColor: UI.greenSoft }]}>
                  <PlusCircle size={18} color={UI.green} />
                </View>
                <Text style={styles.quickActionText}>Add Balance to User</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionButton} onPress={() => setSelectedTab('deposits')}>
                <View style={[styles.quickIcon, { backgroundColor: UI.blueSoft }]}>
                  <ArrowDownToLine size={18} color={UI.blue} />
                </View>
                <Text style={styles.quickActionText}>View Pending Deposits</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionButton} onPress={() => setSelectedTab('account_approval')}>
                <View style={[styles.quickIcon, { backgroundColor: UI.amberSoft }]}>
                  <ShieldCheck size={18} color={UI.amber} />
                </View>
                <Text style={styles.quickActionText}>Review KYC Requests</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionButton} onPress={() => setSelectedTab('withdrawals')}>
                <View style={[styles.quickIcon, { backgroundColor: UI.redSoft }]}>
                  <ArrowUpFromLine size={18} color={UI.red} />
                </View>
                <Text style={styles.quickActionText}>Review Withdrawals</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---------------- Account Approval ---------------- */}
        {selectedTab === 'account_approval' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Pending Account Approvals</Text>

            {pendingAccountsQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading pending accounts...</Text>
              </View>
            ) : pendingAccountsQuery.data && pendingAccountsQuery.data.length > 0 ? (
              pendingAccountsQuery.data.map((profile: any) => (
                <View key={profile.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{(profile.full_name || '').trim()}</Text>
                      <Text style={styles.cardSubtitle}>{profile.email}</Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: UI.amberSoft }]}>
                      <Clock size={14} color={UI.amber} />
                      <Text style={[styles.badgeText, { color: UI.amber }]}>{profile.status?.toUpperCase() || 'PENDING'}</Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>KYC Status</Text>
                    <Text style={styles.rowValue}>{profile.kyc_status || 'N/A'}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Status</Text>
                    <Text style={styles.rowValue}>{profile.status || 'N/A'}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Registered</Text>
                    <Text style={styles.rowValue}>{new Date(profile.created_at).toLocaleString()}</Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: UI.green }]}
                      onPress={() =>
                        Alert.alert('Approve Account', `Approve ${profile.full_name || profile.email}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Approve', onPress: () => approveAccountMutation.mutate({ userId: profile.id }) },
                        ])
                      }
                      disabled={approveAccountMutation.isPending || rejectAccountMutation.isPending}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: UI.red }]}
                      onPress={() =>
                        Alert.alert('Reject Account', `Reject ${profile.full_name || profile.email}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Reject', style: 'destructive', onPress: () => rejectAccountMutation.mutate({ userId: profile.id }) },
                        ])
                      }
                      disabled={approveAccountMutation.isPending || rejectAccountMutation.isPending}
                    >
                      <XCircle size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.emptyText}>No pending accounts</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => pendingAccountsQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ---------------- Deposits ---------------- */}
        {selectedTab === 'deposits' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Deposits</Text>

            {depositsQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading deposits...</Text>
              </View>
            ) : depositsQuery.data && depositsQuery.data.length > 0 ? (
              depositsQuery.data.map((order) => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{(order.profile?.full_name || '').trim()}</Text>
                      <Text style={styles.cardSubtitle}>{order.profile?.email}</Text>
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
                        {order.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Amount</Text>
                    <Text style={styles.rowValue}>${order.amount.toFixed(2)}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Crypto</Text>
                    <Text style={styles.rowValue}>{order.crypto_type.replace('_', ' ')}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Transaction ID</Text>
                    <Text style={styles.rowValueSmall} numberOfLines={1}>
                      {order.transaction_id}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Date</Text>
                    <Text style={styles.rowValue}>{new Date(order.created_at).toLocaleString()}</Text>
                  </View>

                  {order.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: UI.green }]}
                        onPress={() => updateDepositMutation.mutate({ id: order.id, status: 'approved' })}
                        disabled={updateDepositMutation.isPending}
                      >
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: UI.red }]}
                        onPress={() => updateDepositMutation.mutate({ id: order.id, status: 'rejected' })}
                        disabled={updateDepositMutation.isPending}
                      >
                        <XCircle size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No deposit orders found</Text>
            )}
          </>
        )}

        {/* ---------------- Withdrawals ---------------- */}
        {selectedTab === 'withdrawals' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Withdrawals</Text>

            {withdrawalsQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading withdrawal requests...</Text>
              </View>
            ) : withdrawalsQuery.error ? (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.errorTextSmall}>Error loading withdrawals</Text>
                <Text style={styles.errorSubTextSmall}>{(withdrawalsQuery.error as any)?.message || 'Unknown error'}</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => withdrawalsQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : withdrawalsQuery.data && withdrawalsQuery.data.length > 0 ? (
              withdrawalsQuery.data.map((order) => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{(order.profile?.full_name || '').trim()}</Text>
                      <Text style={styles.cardSubtitle}>{order.profile?.email}</Text>
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
                        {order.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Amount</Text>
                    <Text style={styles.rowValue}>${order.amount.toFixed(2)}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Currency</Text>
                    <Text style={styles.rowValue}>{(order as any).currency || 'N/A'}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Crypto</Text>
                    <Text style={styles.rowValue}>{order.crypto || 'N/A'}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Destination</Text>
                    <Text style={styles.rowValueSmall} numberOfLines={1}>
                      {order.destination || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Date</Text>
                    <Text style={styles.rowValue}>{new Date(order.created_at).toLocaleString()}</Text>
                  </View>

                  {order.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: UI.green }]}
                        onPress={() =>
                          Alert.alert(
                            'Approve Withdrawal',
                            `Approve withdrawal of ${order.amount.toFixed(2)}?\n\nThis will deduct the balance from user's wallet and update the status.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Approve', onPress: () => updateWithdrawalMutation.mutate({ id: order.id, status: 'approved' }) },
                            ]
                          )
                        }
                        disabled={updateWithdrawalMutation.isPending}
                      >
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: UI.red }]}
                        onPress={() =>
                          Alert.alert('Reject Withdrawal', `Reject this withdrawal? The amount will be refunded to user's wallet.`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Reject & Refund',
                              style: 'destructive',
                              onPress: () => updateWithdrawalMutation.mutate({ id: order.id, status: 'rejected' }),
                            },
                          ])
                        }
                        disabled={updateWithdrawalMutation.isPending}
                      >
                        <XCircle size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject & Refund</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.emptyText}>No withdrawal requests found</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => withdrawalsQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ---------------- Add Balance ---------------- */}
        {selectedTab === 'add_balance' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Add Balance</Text>

            {usersQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading users...</Text>
              </View>
            ) : usersQuery.error ? (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.errorTextSmall}>Error loading users</Text>
                <Text style={styles.errorSubTextSmall}>{(usersQuery.error as any)?.message || 'Unknown error'}</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => usersQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : usersQuery.data && usersQuery.data.length > 0 ? (
              <>
                {usersQuery.data.map((userProfile: any) => (
                  <View key={userProfile.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{(userProfile.full_name || '').trim()}</Text>
                        <Text style={styles.cardSubtitle}>{userProfile.email}</Text>
                        <Text style={styles.balanceText}>Balance: ${userProfile.wallet?.[0]?.balance?.toFixed(2) || '0.00'}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: UI.green }]}
                        onPress={() => {
                          setSelectedUserId(userProfile.id);
                          setSelectedUserEmail(userProfile.email);
                          setShowAddBalanceModal(true);
                        }}
                      >
                        <Text style={styles.smallBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.emptyText}>No users found</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => usersQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ---------------- Withdraw Balance ---------------- */}
        {selectedTab === 'withdraw_balance' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Withdraw Balance</Text>

            {usersQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading users...</Text>
              </View>
            ) : usersQuery.error ? (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.errorTextSmall}>Error loading users</Text>
                <Text style={styles.errorSubTextSmall}>{(usersQuery.error as any)?.message || 'Unknown error'}</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => usersQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : usersQuery.data && usersQuery.data.length > 0 ? (
              <>
                {usersQuery.data.map((userProfile: any) => (
                  <View key={userProfile.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{(userProfile.full_name || '').trim()}</Text>
                        <Text style={styles.cardSubtitle}>{userProfile.email}</Text>
                        <Text style={styles.balanceText}>Balance: ${userProfile.wallet?.[0]?.balance?.toFixed(2) || '0.00'}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: UI.red }]}
                        onPress={() => {
                          setSelectedUserId(userProfile.id);
                          setShowWithdrawBalanceModal(true);
                        }}
                      >
                        <Text style={styles.smallBtnText}>- Withdraw</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.emptyText}>No users found</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => usersQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ---------------- KYC Documents (ONLY USERS WITH DOCS) ---------------- */}
        {selectedTab === 'kyc_documents' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>KYC Verification Panel</Text>

            {kycDocumentsQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading users...</Text>
              </View>
            ) : kycDocumentsQuery.data && kycDocumentsQuery.data.length > 0 ? (
              kycDocumentsQuery.data.map((userKYC: any) => {
                const badge = kycBadge(userKYC.kyc_status);
                const displayName = (userKYC.full_name || '').trim(); // ✅ show full_name (empty is OK)

                return (
                  <View key={userKYC.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{displayName}</Text>
                        <Text style={styles.cardSubtitle}>{userKYC.email}</Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        {badge.icon}
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>KYC Status</Text>
                      <Text style={styles.rowValue}>{userKYC.kyc_status || 'pending'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Status</Text>
                      <Text style={styles.rowValue}>{userKYC.status || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Registered</Text>
                      <Text style={styles.rowValue}>{new Date(userKYC.created_at).toLocaleString()}</Text>
                    </View>

                    <View style={styles.kycBlock}>
                      <Text style={styles.kycBlockTitle}>KYC Documents</Text>

                      <View style={styles.thumbRow}>
                        <TouchableOpacity style={styles.thumbWrap} onPress={() => openKycPreview('ID Front', userKYC.id_front, userKYC.id, 'id_front')} activeOpacity={0.85}>
                          <View style={styles.thumb}>
                            <FileText size={16} color={UI.blue} />
                            <Text style={styles.thumbText}>ID Front</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.thumbWrap} onPress={() => openKycPreview('ID Back', userKYC.id_back, userKYC.id, 'id_back')} activeOpacity={0.85}>
                          <View style={styles.thumb}>
                            <FileText size={16} color={UI.blue} />
                            <Text style={styles.thumbText}>ID Back</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.thumbWrap} onPress={() => openKycPreview('Selfie', userKYC.selfie, userKYC.id, 'selfie')} activeOpacity={0.85}>
                          <View style={styles.thumb}>
                            <FileText size={16} color={UI.blue} />
                            <Text style={styles.thumbText}>Selfie</Text>
                          </View>
                        </TouchableOpacity>
                      </View>

                      <View style={{ marginTop: 10, gap: 10 }}>
                        <TouchableOpacity style={styles.docLinkButton} onPress={() => openExternal(userKYC.id_front, userKYC.id, 'id_front')}>
                          <ExternalLink size={16} color={UI.blue} />
                          <Text style={styles.docLinkText}>Open ID Front</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.docLinkButton} onPress={() => openExternal(userKYC.id_back, userKYC.id, 'id_back')}>
                          <ExternalLink size={16} color={UI.blue} />
                          <Text style={styles.docLinkText}>Open ID Back</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.docLinkButton} onPress={() => openExternal(userKYC.selfie, userKYC.id, 'selfie')}>
                          <ExternalLink size={16} color={UI.blue} />
                          <Text style={styles.docLinkText}>Open Selfie</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: UI.green }]}
                        onPress={() =>
                          Alert.alert('Approve KYC', `Approve KYC for ${userKYC.full_name || userKYC.email}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Approve', onPress: () => approveAccountMutation.mutate({ userId: userKYC.id }) },
                          ])
                        }
                        disabled={approveAccountMutation.isPending || rejectAccountMutation.isPending}
                      >
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: UI.red }]}
                        onPress={() =>
                          Alert.alert('Reject KYC', `Reject KYC for ${userKYC.full_name || userKYC.email}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Reject', style: 'destructive', onPress: () => rejectAccountMutation.mutate({ userId: userKYC.id }) },
                          ])
                        }
                        disabled={approveAccountMutation.isPending || rejectAccountMutation.isPending}
                      >
                        <XCircle size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.emptyText}>No users found</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => kycDocumentsQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ---------------- Transactions ---------------- */}
        {selectedTab === 'transactions' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Transaction History</Text>

            <View style={styles.filtersCard}>
              <Text style={styles.filterTitle}>Filters</Text>

              <View style={styles.filterRow}>
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
              </View>

              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'send', label: 'Send' },
                      { key: 'receive', label: 'Receive' },
                      { key: 'purchase_mobile', label: 'Mobile' },
                      { key: 'purchase_card', label: 'Card' },
                      { key: 'purchase_giftcard', label: 'Gift Card' },
                      { key: 'admin_add', label: 'Admin Add' },
                    ].map((c) => (
                      <TouchableOpacity
                        key={c.key}
                        style={[styles.filterChip, txTypeFilter === c.key && styles.filterChipActive]}
                        onPress={() => setTxTypeFilter(c.key)}
                      >
                        <Text style={[styles.filterChipText, txTypeFilter === c.key && styles.filterChipTextActive]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Amount</Text>
                  <View style={styles.filterChips}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'positive', label: '+ Positive' },
                      { key: 'negative', label: '− Negative' },
                    ].map((c) => (
                      <TouchableOpacity
                        key={c.key}
                        style={[styles.filterChip, txAmountFilter === c.key && styles.filterChipActive]}
                        onPress={() => setTxAmountFilter(c.key)}
                      >
                        <Text style={[styles.filterChipText, txAmountFilter === c.key && styles.filterChipTextActive]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {transactionsQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading transactions...</Text>
              </View>
            ) : transactionsQuery.data && transactionsQuery.data.length > 0 ? (
              (() => {
                const filtered = transactionsQuery.data.filter((tx: any) => {
                  const userEmail = tx.receiver?.email || '';
                  const matchesEmail = txEmailFilter === '' || userEmail.toLowerCase().includes(txEmailFilter.toLowerCase());
                  const matchesType = txTypeFilter === 'all' || tx.type === txTypeFilter;
                  const matchesAmount =
                    txAmountFilter === 'all' ||
                    (txAmountFilter === 'positive' && tx.amount >= 0) ||
                    (txAmountFilter === 'negative' && tx.amount < 0);
                  return matchesEmail && matchesType && matchesAmount;
                });

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
                    default:
                      return 'Transaction';
                  }
                };

                return filtered.length > 0 ? (
                  filtered.map((tx: any) => (
                    <View key={tx.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{(tx.receiver?.full_name || '').trim()}</Text>
                          <Text style={styles.cardSubtitle}>{tx.receiver?.email}</Text>
                        </View>
                        <View style={[styles.badge, tx.amount >= 0 ? { backgroundColor: UI.greenSoft } : { backgroundColor: UI.redSoft }]}>
                          <Text style={[styles.badgeText, tx.amount >= 0 ? { color: UI.green } : { color: UI.red }]}>
                            {tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Type</Text>
                        <Text style={styles.rowValue}>{getTransactionTitle(tx)}</Text>
                      </View>

                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Balance After</Text>
                        <Text style={[styles.rowValue, { color: UI.blue }]}>${(tx.balance_after || 0).toFixed(2)}</Text>
                      </View>

                      {tx.description && (
                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Description</Text>
                          <Text style={styles.rowValue}>{tx.description}</Text>
                        </View>
                      )}

                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Time</Text>
                        <Text style={styles.rowValue}>{new Date(tx.created_at).toLocaleString()}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{ paddingVertical: 18 }}>
                    <Text style={styles.emptyText}>No transactions match your filters</Text>
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={() => {
                        setTxEmailFilter('');
                        setTxTypeFilter('all');
                        setTxAmountFilter('all');
                      }}
                    >
                      <Text style={styles.primaryBtnText}>Clear Filters</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()
            ) : (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.emptyText}>No transactions found</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => transactionsQuery.refetch()}>
                  <Text style={styles.primaryBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ---------------- Add Balance Modal ---------------- */}
      <Modal visible={showAddBalanceModal} transparent animationType="fade" onRequestClose={() => setShowAddBalanceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Balance</Text>
            <Text style={styles.modalSubtitle}>Enter amount and note</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="User Email"
              placeholderTextColor={UI.text2}
              keyboardType="email-address"
              value={selectedUserEmail}
              onChangeText={setSelectedUserEmail}
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
                style={[styles.modalCancelBtn]}
                onPress={() => {
                  setShowAddBalanceModal(false);
                  setAmountToAdd('');
                  setNoteToAdd('');
                  setSelectedUserId('');
                  setSelectedUserEmail('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn]}
                onPress={() => {
                  const amount = parseFloat(amountToAdd);
                  if (isNaN(amount) || amount <= 0) {
                    Alert.alert('Error', 'Please enter a valid amount');
                    return;
                  }
                  addBalanceMutation.mutate({ userId: selectedUserId, amount, note: noteToAdd });
                }}
                disabled={addBalanceMutation.isPending}
              >
                {addBalanceMutation.isPending ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>Add Balance</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- Withdraw Balance Modal ---------------- */}
      <Modal visible={showWithdrawBalanceModal} transparent animationType="fade" onRequestClose={() => setShowWithdrawBalanceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Balance</Text>
            <Text style={styles.modalSubtitle}>Enter amount to withdraw</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Amount (USD)"
              placeholderTextColor={UI.text2}
              keyboardType="numeric"
              value={amountToWithdraw}
              onChangeText={setAmountToWithdraw}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn]}
                onPress={() => {
                  setShowWithdrawBalanceModal(false);
                  setAmountToWithdraw('');
                  setSelectedUserId('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: UI.red }]}
                onPress={() => {
                  const amount = parseFloat(amountToWithdraw);
                  if (isNaN(amount) || amount <= 0) {
                    Alert.alert('Error', 'Please enter a valid amount');
                    return;
                  }
                  withdrawBalanceMutation.mutate({ userId: selectedUserId, amount });
                }}
                disabled={withdrawBalanceMutation.isPending}
              >
                {withdrawBalanceMutation.isPending ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>Withdraw Balance</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ KYC preview modal */}
      <Modal visible={kycPreviewOpen} transparent animationType="fade" onRequestClose={() => setKycPreviewOpen(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{kycPreviewTitle}</Text>
              <TouchableOpacity style={styles.previewClose} onPress={() => setKycPreviewOpen(false)}>
                <X size={18} color={UI.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewBody}>
              {kycPreviewLoading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator color={UI.blue} size="large" />
                  <Text style={styles.emptyText}>Loading image...</Text>
                </View>
              ) : kycPreviewUrl ? (
                <Image source={{ uri: kycPreviewUrl }} style={styles.previewImage} resizeMode="contain" />
              ) : (
                <View style={styles.centerLoading}>
                  <Text style={styles.emptyText}>No image</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.previewOpenBtn} onPress={() => kycPreviewUrl && openExternal(kycPreviewUrl)} disabled={!kycPreviewUrl}>
              <ExternalLink size={16} color="#fff" />
              <Text style={styles.previewOpenBtnText}>Open in Browser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  menuWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  // ✅ smaller buttons + smaller text
  menuBtn: {
    width: '48%',
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  menuBtnActive: {
    borderColor: UI.blue,
    backgroundColor: '#F8FAFF',
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: UI.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconWrapActive: {
    backgroundColor: UI.blueSoft,
  },
  menuText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: UI.text,
  },
  menuTextActive: {
    color: UI.blue,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 140,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 10,
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

  quickActions: { gap: 10 },
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

  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
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
    paddingVertical: 6,
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
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: UI.blue,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
  },

  smallBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  balanceText: {
    marginTop: 8,
    fontSize: 13,
    color: UI.blue,
    fontWeight: '800',
  },

  emptyText: {
    textAlign: 'center',
    color: UI.text2,
    fontSize: 14,
    marginTop: 10,
  },

  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
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
  errorTextSmall: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: UI.red,
  },
  errorSubTextSmall: {
    textAlign: 'center',
    fontSize: 13,
    color: UI.text2,
    marginTop: 6,
  },

  filtersCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 10,
  },
  filterRow: { marginBottom: 12 },
  filterItem: { flex: 1 },
  filterLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.text2,
    marginBottom: 8,
  },
  filterInput: {
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 12,
    padding: 12,
    color: UI.text,
    fontWeight: '700',
  },
  filterChips: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: UI.card2,
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

  kycBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  kycBlockTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 10,
  },

  thumbRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thumbWrap: { flex: 1 },
  thumb: {
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card2,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thumbText: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.blue,
  },

  docLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.card2,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  docLinkText: {
    flex: 1,
    fontSize: 13,
    color: UI.blue,
    fontWeight: '800',
  },

  docGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  docBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: UI.greenSoft,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  docBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.text,
  },

  searchCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: UI.card2,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: UI.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: UI.text2,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: UI.card2,
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
    backgroundColor: UI.blue,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '900',
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: UI.card,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
  },
  previewClose: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
  },
  previewBody: {
    width: '100%',
    height: 420,
    backgroundColor: UI.card,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: UI.card,
  },
  previewOpenBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: UI.blue,
  },
  previewOpenBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
});

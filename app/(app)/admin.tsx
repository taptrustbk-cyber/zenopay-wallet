import { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DepositOrder, Profile, WithdrawOrder } from '@/lib/types';
import { useRouter } from 'expo-router';
import { CheckCircle, XCircle, Clock, LogOut, FileText, ExternalLink } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

export default function AdminScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'account_approval' | 'waiting_users' | 'deposits' | 'withdrawals' | 'add_balance' | 'withdraw_balance' | 'kyc_documents' | 'products' | 'orders' | 'market_analytics'>('dashboard');
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [showWithdrawBalanceModal, setShowWithdrawBalanceModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [noteToAdd, setNoteToAdd] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');
  const [showWaitTimeModal, setShowWaitTimeModal] = useState(false);
  const [waitTimeUserId, setWaitTimeUserId] = useState<string>('');
  const [waitTimeValue, setWaitTimeValue] = useState('');
  const [amountToWithdraw, setAmountToWithdraw] = useState('');

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  useEffect(() => {
    if (!isAdmin || selectedTab !== 'account_approval') return;
    
    const channel = supabase
      .channel('admin-pending-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  useEffect(() => {
    if (!isAdmin || selectedTab !== 'waiting_users') return;
    
    const channel = supabase
      .channel('admin-waiting-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-waiting-users'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  useEffect(() => {
    if (!isAdmin || selectedTab !== 'deposits') return;

    console.log('🔔 Subscribing to deposits realtime updates...');
    
    const channel = supabase
      .channel('admin-deposits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposit_orders'
        },
        (payload) => {
          console.log('🔔 Deposit changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Unsubscribing from deposits updates');
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  useEffect(() => {
    if (!isAdmin || selectedTab !== 'withdrawals') return;

    console.log('🔔 Subscribing to withdrawals realtime updates...');
    
    const channel = supabase
      .channel('admin-withdrawals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdraw_orders'
        },
        (payload) => {
          console.log('🔔 Withdrawal changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          queryClient.invalidateQueries({ queryKey: ['admin-withdraw-stats'] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Unsubscribing from withdrawals updates');
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  const depositsQuery = useQuery({
    queryKey: ['admin-deposits'],
    queryFn: async () => {
      console.log('📊 Fetching deposit orders...');
      
      const { data, error } = await supabase
        .from('deposit_orders')
        .select(`
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
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Deposits query error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('ℹ️ No deposit orders found');
        return [];
      }
      
      console.log('✅ Fetched deposits:', data.length);
      console.log('👤 First deposit with profile:', data[0]);
      
      return data.map((d: any) => ({
        ...d,
        profile: d.profiles
      })) as (DepositOrder & { profile: Profile })[];
    },
    enabled: selectedTab === 'deposits',
  });

  const withdrawalsQuery = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      console.log('📊 Fetching withdrawal requests...');
      
      const { data, error } = await supabase
        .from('withdraw_orders')
        .select(`
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
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching withdrawals:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ Fetched withdrawals:', data?.length || 0);
      
      if (!data || data.length === 0) {
        return [];
      }
      
      const withdrawalsWithProfile = data.map((withdrawal: any) => ({
        ...withdrawal,
        profile: withdrawal.profiles
      }));
      
      console.log('👤 First withdrawal with profile:', withdrawalsWithProfile[0]);
      
      return withdrawalsWithProfile as (WithdrawOrder & { profile: Profile })[];
    },
    enabled: selectedTab === 'withdrawals',
  });

  const pendingAccountsQuery = useQuery({
    queryKey: ['admin-pending-accounts'],
    queryFn: async () => {
      console.log('📊 Fetching pending accounts...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, kyc_status, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Pending accounts query error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ Fetched pending accounts:', data?.length || 0);
      
      return data || [];
    },
    enabled: selectedTab === 'account_approval',
  });

  const kycDocumentsQuery = useQuery({
    queryKey: ['admin-kyc-documents'],
    queryFn: async () => {
      console.log('📊 Fetching KYC documents...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, kyc_status, status, id_front, id_back, selfie, created_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ KYC documents query error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ Fetched KYC documents:', data?.length || 0);
      
      return data || [];
    },
    enabled: selectedTab === 'kyc_documents',
  });

  const waitingUsersQuery = useQuery({
    queryKey: ['admin-waiting-users'],
    queryFn: async () => {
      console.log('📊 Fetching waiting users...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, kyc_status, approval_pending_until, approved_at, force_active, created_at')
        .eq('kyc_status', 'approved')
        .order('approved_at', { ascending: true });
      
      if (error) {
        console.error('❌ Waiting users query error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ Fetched waiting users:', data?.length || 0);
      
      return (data || []).map(d => ({
        ...d,
        date_of_birth: null,
        country: null,
        city: null,
        phone_number: null,
        id_front: null,
        id_back: null,
        selfie: null,
      })) as Profile[];
    },
    enabled: selectedTab === 'waiting_users',
  });

  const getRemainingTime = (profile: Profile) => {
    if (profile.force_active || profile.kyc_status === 'approved') return null;
    if (!profile.approved_at) return null;

    const approvedAt = new Date(profile.approved_at).getTime();
    const waitTimeMinutes = 120;
    const unlockAt = approvedAt + waitTimeMinutes * 60 * 1000;
    const diff = unlockAt - Date.now();

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.ceil((diff % (60 * 60 * 1000)) / (60 * 1000));

    return { hours, minutes, total: diff };
  };

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      console.log('📊 Fetching users for admin panel...');
      
      const { data, error } = await supabase
        .from('wallets')
        .select(`
          id,
          balance,
          user_id,
          profiles (
            id,
            email,
            full_name,
            created_at
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching wallets with profiles:', error.message);
        throw new Error(error.message || 'Failed to fetch wallets');
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ No wallets found');
        return [];
      }
      
      const usersWithWallets = data.map((wallet: any) => ({
        id: wallet.profiles?.id || wallet.user_id,
        email: wallet.profiles?.email || 'N/A',
        full_name: wallet.profiles?.full_name || 'Unknown User',
        created_at: wallet.profiles?.created_at || new Date().toISOString(),
        wallet: [{ balance: wallet.balance || 0 }]
      }));
      
      console.log('✅ Fetched users with wallets:', usersWithWallets.length);
      
      return usersWithWallets;
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
      console.log('📊 Fetching withdrawal stats...');
      
      const { data, error } = await supabase.rpc('admin_withdraw_stats');
      
      if (error) {
        console.error('❌ Error fetching withdrawal stats:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ Withdrawal stats:', data);
      return data;
    },
    enabled: selectedTab === 'dashboard' || selectedTab === 'withdrawals',
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      console.log('📊 Fetching orders...');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!user_id(
            id,
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching orders:', error);
        throw error;
      }
      
      console.log('✅ Fetched orders:', data?.length || 0);
      return data || [];
    },
    enabled: selectedTab === 'orders',
  });

  const marketAnalyticsQuery = useQuery({
    queryKey: ['admin-market-analytics'],
    queryFn: async () => {
      console.log('📊 Fetching market analytics...');
      
      const [salesRes, typeRes] = await Promise.all([
        supabase.from('orders').select('price'),
        supabase.from('orders').select('product_type, price'),
      ]);
      
      const totalSales = salesRes.data?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
      const totalOrders = salesRes.data?.length || 0;
      
      const salesByType = typeRes.data?.reduce((acc: any, order) => {
        const type = order.product_type || 'unknown';
        if (!acc[type]) {
          acc[type] = { count: 0, total: 0 };
        }
        acc[type].count += 1;
        acc[type].total += order.price || 0;
        return acc;
      }, {});
      
      return {
        totalSales,
        totalOrders,
        salesByType: salesByType || {},
      };
    },
    enabled: selectedTab === 'market_analytics',
  });

  const updateDepositMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('deposit_orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;

      if (status === 'approved') {
        const order = depositsQuery.data?.find((d) => d.id === id);
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
      Alert.alert('Success', 'Deposit status updated');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  const approveAccountMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      console.log('✅ Approving account:', userId);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'approved',
          kyc_status: 'approved'
        })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      Alert.alert('Success', 'Account approved successfully!');
    },
    onError: (error: any) => {
      console.error('❌ Approve error:', error);
      Alert.alert('Error', error.message || 'Failed to approve account');
    },
  });

  const rejectAccountMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      console.log('❌ Rejecting account:', userId);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'rejected',
          kyc_status: 'rejected'
        })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      Alert.alert('Success', 'Account rejected.');
    },
    onError: (error: any) => {
      console.error('❌ Reject error:', error);
      Alert.alert('Error', error.message || 'Failed to reject account');
    },
  });

  const activateNowMutation = trpc.admin.activateUserNow.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-waiting-users'] });
      Alert.alert('Success', 'Account activated immediately! User can login now.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateWaitTimeMutation = useMutation({
    mutationFn: async ({ userId, minutes }: { userId: string; minutes: number }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ wait_time_minutes: minutes })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-waiting-users'] });
      setShowWaitTimeModal(false);
      setWaitTimeValue('');
      setWaitTimeUserId('');
      Alert.alert('Success', 'Wait time updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  const addBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, note }: { userId: string; amount: number; note: string }) => {
      console.log('💰 Adding balance:', { userId, amount, note });
      
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (walletError) {
        console.error('❌ Wallet fetch error:', walletError);
        throw new Error(walletError.message || 'Failed to fetch wallet');
      }
      
      if (!wallet) {
        throw new Error('Wallet not found for this user');
      }
      
      const newBalance = (wallet?.balance || 0) + Number(amount);
      console.log('📊 Current balance:', wallet?.balance, 'New balance:', newBalance);
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('❌ Wallet update error:', updateError);
        throw new Error(updateError.message || 'Failed to update wallet');
      }
      
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          from_user_id: userId,
          to_user_id: userId,
          type: 'deposit',
          amount: Number(amount),
          status: 'completed',
        });
      
      if (txError) {
        console.warn('⚠️ Transaction log error:', txError);
      }
      
      console.log('✅ Balance added successfully');
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
      console.error('❌ Add balance mutation error:', error);
      Alert.alert('Error', error.message || 'Failed to add balance');
    },
  });

  const withdrawBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      console.log('💸 Withdrawing balance:', { userId, amount });
      
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (walletError) {
        console.error('❌ Wallet fetch error:', walletError);
        throw new Error(walletError.message || 'Failed to fetch wallet');
      }
      
      if (!wallet) {
        throw new Error('Wallet not found for this user');
      }
      
      const currentBalance = wallet?.balance || 0;
      if (currentBalance < Number(amount)) {
        throw new Error('Insufficient balance');
      }
      
      const newBalance = currentBalance - Number(amount);
      console.log('📊 Current balance:', currentBalance, 'New balance:', newBalance);
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('❌ Wallet update error:', updateError);
        throw new Error(updateError.message || 'Failed to update wallet');
      }
      
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          from_user_id: userId,
          to_user_id: userId,
          type: 'deposit',
          amount: Number(amount),
          status: 'completed',
        });
      
      if (txError) {
        console.warn('⚠️ Transaction log error:', txError);
      }
      
      console.log('✅ Balance withdrawn successfully');
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
      console.error('❌ Withdraw balance mutation error:', error);
      Alert.alert('Error', error.message || 'Failed to withdraw balance');
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      if (status === 'approved') {
        const { error } = await supabase.rpc('admin_approve_withdraw', {
          p_withdraw_id: id
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('admin_reject_withdraw', {
          p_withdraw_id: id,
          p_reason: 'Rejected by admin'
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      
      if (variables.status === 'approved') {
        Alert.alert('Success', 'Withdrawal approved and balance deducted from user account.');
      } else {
        Alert.alert('Success', 'Withdrawal rejected. User balance has been refunded.');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      console.log('📦 Updating order status:', { id, status });
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      Alert.alert('Success', 'Order status updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>Access Denied</Text>
          <Text style={[styles.errorSubText, { color: theme.colors.textSecondary }]}>
            You don&apos;t have permission to access this page.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Admin Panel</Text>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
          onPress={() => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: signOut,
                },
              ]
            );
          }}
        >
          <LogOut size={20} color="#FFF" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonGrid}>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'dashboard' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('dashboard')}
        >
          <Text
            style={[
              styles.gridButtonText,
              { color: theme.colors.text },
              selectedTab === 'dashboard' && styles.gridButtonTextActive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'account_approval' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('account_approval')}
        >
          <Text
            style={[
              styles.gridButtonText,
              { color: theme.colors.text },
              selectedTab === 'account_approval' && styles.gridButtonTextActive,
            ]}
          >
            Account Approval
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'waiting_users' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('waiting_users')}
        >
          <Text
            style={[
              styles.gridButtonText,
              { color: theme.colors.text },
              selectedTab === 'waiting_users' && styles.gridButtonTextActive,
            ]}
          >
            Waiting Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'deposits' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('deposits')}
        >
          <Text
            style={[
              styles.gridButtonText,
              { color: theme.colors.text },
              selectedTab === 'deposits' && styles.gridButtonTextActive,
            ]}
          >
            Deposits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'withdrawals' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('withdrawals')}
        >
          <Text
            style={[
              styles.gridButtonText,
              { color: theme.colors.text },
              selectedTab === 'withdrawals' && styles.gridButtonTextActive,
            ]}
          >
            Withdrawals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'add_balance' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('add_balance')}
        >
          <Text
            style={[styles.gridButtonText, { color: theme.colors.text }, selectedTab === 'add_balance' && styles.gridButtonTextActive]}
          >
            Add Balance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'withdraw_balance' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('withdraw_balance')}
        >
          <Text
            style={[styles.gridButtonText, { color: theme.colors.text }, selectedTab === 'withdraw_balance' && styles.gridButtonTextActive]}
          >
            Withdraw Balance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'kyc_documents' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('kyc_documents')}
        >
          <Text
            style={[styles.gridButtonText, { color: theme.colors.text }, selectedTab === 'kyc_documents' && styles.gridButtonTextActive]}
          >
            KYC Document
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'products' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('products')}
        >
          <Text
            style={[styles.gridButtonText, { color: theme.colors.text }, selectedTab === 'products' && styles.gridButtonTextActive]}
          >
            Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'orders' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('orders')}
        >
          <Text
            style={[styles.gridButtonText, { color: theme.colors.text }, selectedTab === 'orders' && styles.gridButtonTextActive]}
          >
            Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridButton, { backgroundColor: theme.colors.cardSecondary }, selectedTab === 'market_analytics' && [styles.gridButtonActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setSelectedTab('market_analytics')}
        >
          <Text
            style={[styles.gridButtonText, { color: theme.colors.text }, selectedTab === 'market_analytics' && styles.gridButtonTextActive]}
          >
            Market Analytics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {selectedTab === 'dashboard' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Overview</Text>
            
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.statCardContent}>
                  <Text style={styles.statIcon}>👥</Text>
                  <View style={styles.statInfo}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Users</Text>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {statsQuery.isLoading ? '...' : statsQuery.data?.totalUsers || 0}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.statCardContent}>
                  <Text style={styles.statIcon}>🪪</Text>
                  <View style={styles.statInfo}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending KYC</Text>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {statsQuery.isLoading ? '...' : statsQuery.data?.pendingKYC || 0}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.statCardContent}>
                  <Text style={styles.statIcon}>💰</Text>
                  <View style={styles.statInfo}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending Deposits</Text>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {statsQuery.isLoading ? '...' : statsQuery.data?.pendingDeposits || 0}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.statCardContent}>
                  <Text style={styles.statIcon}>🏧</Text>
                  <View style={styles.statInfo}>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending Withdrawals</Text>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {statsQuery.isLoading ? '...' : statsQuery.data?.pendingWithdrawals || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.totalBalanceCard, { backgroundColor: theme.colors.card }]}>
              <Text style={styles.totalBalanceIcon}>🏦</Text>
              <Text style={[styles.totalBalanceLabel, { color: theme.colors.textSecondary }]}>Total System Balance</Text>
              <Text style={[styles.totalBalanceValue, { color: theme.colors.success }]}>
                ${statsQuery.isLoading ? '...' : (statsQuery.data?.totalSystemBalance || 0).toFixed(2)}
              </Text>
            </View>

            {withdrawStatsQuery.data && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Withdrawal Statistics</Text>
                
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statCardContent}>
                      <Text style={styles.statIcon}>📊</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Withdrawals</Text>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                          {withdrawStatsQuery.data.total_count || 0}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statCardContent}>
                      <Text style={styles.statIcon}>💸</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Amount</Text>
                        <Text style={[styles.statValue, { color: theme.colors.text, fontSize: 20 }]}>
                          ${parseFloat(withdrawStatsQuery.data.total_amount || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statCardContent}>
                      <Text style={styles.statIcon}>⏳</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
                        <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                          {withdrawStatsQuery.data.pending_count || 0}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statCardContent}>
                      <Text style={styles.statIcon}>✅</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Approved</Text>
                        <Text style={[styles.statValue, { color: '#34D399' }]}>
                          {withdrawStatsQuery.data.approved_count || 0}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statCardContent}>
                      <Text style={styles.statIcon}>❌</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Rejected</Text>
                        <Text style={[styles.statValue, { color: '#F87171' }]}>
                          {withdrawStatsQuery.data.rejected_count || 0}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statCardContent}>
                      <Text style={styles.statIcon}>💰</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending Amount</Text>
                        <Text style={[styles.statValue, { color: '#F59E0B', fontSize: 18 }]}>
                          ${parseFloat(withdrawStatsQuery.data.pending_amount || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Quick Actions</Text>
            
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setSelectedTab('add_balance')}
              >
                <Text style={styles.quickActionIcon}>➕</Text>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Add Balance to User</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setSelectedTab('deposits')}
              >
                <Text style={styles.quickActionIcon}>📋</Text>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>View Pending Deposits</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setSelectedTab('account_approval')}
              >
                <Text style={styles.quickActionIcon}>🪪</Text>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Review KYC Requests</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setSelectedTab('withdrawals')}
              >
                <Text style={styles.quickActionIcon}>🏧</Text>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Review Withdrawals</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {selectedTab === 'account_approval' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>Pending Account Approvals</Text>
            {pendingAccountsQuery.isLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#60A5FA" size="large" />
                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading pending accounts...</Text>
              </View>
            ) : pendingAccountsQuery.data && pendingAccountsQuery.data.length > 0 ? (
              pendingAccountsQuery.data.map((profile: any) => (
                <View key={profile.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>
                        {profile.full_name || 'Unknown User'}
                      </Text>
                      <Text style={styles.cardSubtitle}>{profile.email}</Text>
                    </View>
                    <View style={[styles.statusBadge]}>
                      <Clock size={14} color="#F59E0B" />
                      <Text style={[styles.statusText]}>
                        {profile.status?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>KYC Status:</Text>
                    <Text style={styles.infoValue}>
                      {profile.kyc_status || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={styles.infoValue}>
                      {profile.status || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Registered:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(profile.created_at).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() =>
                        Alert.alert(
                          'Approve Account',
                          `Approve ${profile.full_name || profile.email}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Approve',
                              onPress: () =>
                                approveAccountMutation.mutate({ userId: profile.id }),
                            },
                          ]
                        )
                      }
                      disabled={approveAccountMutation.isPending || rejectAccountMutation.isPending}
                    >
                      <CheckCircle size={16} color="#FFF" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() =>
                        Alert.alert(
                          'Reject Account',
                          `Reject ${profile.full_name || profile.email}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Reject',
                              style: 'destructive',
                              onPress: () =>
                                rejectAccountMutation.mutate({ userId: profile.id }),
                            },
                          ]
                        )
                      }
                      disabled={approveAccountMutation.isPending || rejectAccountMutation.isPending}
                    >
                      <XCircle size={16} color="#FFF" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 20 }}>
                <Text style={styles.emptyText}>No pending accounts</Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => pendingAccountsQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {selectedTab === 'waiting_users' && (
          <>
            {waitingUsersQuery.isLoading ? (
              <ActivityIndicator color="#60A5FA" size="large" />
            ) : waitingUsersQuery.data && waitingUsersQuery.data.length > 0 ? (
              waitingUsersQuery.data.map((profile) => {
                const remaining = getRemainingTime(profile);
                return (
                  <View key={profile.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardTitle}>
                          {profile.full_name || 'Unknown User'}
                        </Text>
                        <Text style={styles.cardSubtitle}>{profile.email}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: '#7C3AED' }]}>
                        <Clock size={14} color="#A78BFA" />
                        <Text style={[styles.statusText, { color: '#A78BFA' }]}>
                          WAITING
                        </Text>
                      </View>
                    </View>

                    {remaining && (
                      <View style={styles.timerCard}>
                        <Clock size={24} color="#F59E0B" />
                        <View style={styles.timerInfo}>
                          <Text style={styles.timerTitle}>Time Remaining</Text>
                          <Text style={styles.timerValue}>
                            {remaining.hours}h {remaining.minutes}m
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.cardInfo}>
                      <Text style={styles.infoLabel}>Approved At:</Text>
                      <Text style={styles.infoValue}>
                        {profile.approved_at ? new Date(profile.approved_at).toLocaleString() : 'N/A'}
                      </Text>
                    </View>





                    <TouchableOpacity
                      style={styles.activateNowButton}
                      onPress={() =>
                        Alert.alert(
                          'Activate Account Now',
                          `⚠️ This will bypass the ${remaining ? `${remaining.hours}h ${remaining.minutes}m` : ''} waiting period and activate ${profile.full_name || profile.email} immediately.\n\nUser can login right away.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Activate Now',
                              onPress: () =>
                                activateNowMutation.mutate({ userId: profile.id }),
                            },
                          ]
                        )
                      }
                      disabled={activateNowMutation.isPending}
                    >
                      <CheckCircle size={16} color="#FFF" />
                      <Text style={styles.actionButtonText}>Activate Account Now</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No users in waiting period</Text>
            )}
          </>
        )}

        {selectedTab === 'deposits' && (
          <>
            {depositsQuery.isLoading ? (
              <ActivityIndicator color="#60A5FA" size="large" />
            ) : depositsQuery.data && depositsQuery.data.length > 0 ? (
              depositsQuery.data.map((order) => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>
                        {order.profile?.full_name || 'Unknown User'}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {order.profile?.email}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        order.status === 'approved' && styles.statusApproved,
                        order.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      {order.status === 'pending' && (
                        <Clock size={14} color="#F59E0B" />
                      )}
                      {order.status === 'approved' && (
                        <CheckCircle size={14} color="#34D399" />
                      )}
                      {order.status === 'rejected' && (
                        <XCircle size={14} color="#F87171" />
                      )}
                      <Text
                        style={[
                          styles.statusText,
                          order.status === 'approved' && styles.statusTextApproved,
                          order.status === 'rejected' && styles.statusTextRejected,
                        ]}
                      >
                        {order.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Amount:</Text>
                    <Text style={styles.infoValue}>${order.amount.toFixed(2)}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Crypto:</Text>
                    <Text style={styles.infoValue}>
                      {order.crypto_type.replace('_', ' ')}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Transaction ID:</Text>
                    <Text style={styles.infoValueSmall} numberOfLines={1}>
                      {order.transaction_id}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Date:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(order.created_at).toLocaleString()}
                    </Text>
                  </View>

                  {order.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() =>
                          updateDepositMutation.mutate({
                            id: order.id,
                            status: 'approved',
                          })
                        }
                        disabled={updateDepositMutation.isPending}
                      >
                        <CheckCircle size={16} color="#FFF" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() =>
                          updateDepositMutation.mutate({
                            id: order.id,
                            status: 'rejected',
                          })
                        }
                        disabled={updateDepositMutation.isPending}
                      >
                        <XCircle size={16} color="#FFF" />
                        <Text style={styles.actionButtonText}>Reject</Text>
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



        {selectedTab === 'withdrawals' && (
          <>
            {withdrawalsQuery.isLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#60A5FA" size="large" />
                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading withdrawal requests...</Text>
              </View>
            ) : withdrawalsQuery.error ? (
              <View style={{ padding: 20 }}>
                <Text style={[styles.errorText, { textAlign: 'center' }]}>Error loading withdrawals</Text>
                <Text style={[styles.errorSubText, { textAlign: 'center', marginTop: 8 }]}>
                  {(withdrawalsQuery.error as any)?.message || 'Unknown error'}
                </Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => withdrawalsQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : withdrawalsQuery.data && withdrawalsQuery.data.length > 0 ? (
              withdrawalsQuery.data.map((order) => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>
                        {order.profile?.full_name || 'Unknown User'}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {order.profile?.email}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        order.status === 'approved' && styles.statusApproved,
                        order.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      {order.status === 'pending' && (
                        <Clock size={14} color="#F59E0B" />
                      )}
                      {order.status === 'approved' && (
                        <CheckCircle size={14} color="#34D399" />
                      )}
                      {order.status === 'rejected' && (
                        <XCircle size={14} color="#F87171" />
                      )}
                      <Text
                        style={[
                          styles.statusText,
                          order.status === 'approved' && styles.statusTextApproved,
                          order.status === 'rejected' && styles.statusTextRejected,
                        ]}
                      >
                        {order.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Amount:</Text>
                    <Text style={styles.infoValue}>${order.amount.toFixed(2)}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Currency:</Text>
                    <Text style={styles.infoValue}>
                      {(order as any).currency || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Crypto:</Text>
                    <Text style={styles.infoValue}>
                      {order.crypto || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Destination:</Text>
                    <Text style={styles.infoValueSmall} numberOfLines={1}>
                      {order.destination || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Date:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(order.created_at).toLocaleString()}
                    </Text>
                  </View>

                  {order.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() =>
                          Alert.alert(
                            'Approve Withdrawal',
                            `Approve withdrawal of ${order.amount.toFixed(2)}?\n\nThis will deduct the balance from user's wallet and update the status.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Approve',
                                onPress: () =>
                                  updateWithdrawalMutation.mutate({
                                    id: order.id,
                                    status: 'approved',
                                  }),
                              },
                            ]
                          )
                        }
                        disabled={updateWithdrawalMutation.isPending}
                      >
                        <CheckCircle size={16} color="#FFF" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() =>
                          Alert.alert(
                            'Reject Withdrawal',
                            `Reject this withdrawal? The amount will be refunded to user's wallet.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Reject & Refund',
                                style: 'destructive',
                                onPress: () =>
                                  updateWithdrawalMutation.mutate({
                                    id: order.id,
                                    status: 'rejected',
                                  }),
                              },
                            ]
                          )
                        }
                        disabled={updateWithdrawalMutation.isPending}
                      >
                        <XCircle size={16} color="#FFF" />
                        <Text style={styles.actionButtonText}>Reject & Refund</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={{ padding: 20 }}>
                <Text style={styles.emptyText}>No withdrawal requests found</Text>
                <Text style={[styles.errorSubText, { textAlign: 'center', marginTop: 12 }]}>Users haven&apos;t submitted any withdrawal requests yet.</Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => withdrawalsQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {selectedTab === 'add_balance' && (
          <>
            {usersQuery.isLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#60A5FA" size="large" />
                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading users...</Text>
              </View>
            ) : usersQuery.error ? (
              <View style={{ padding: 20 }}>
                <Text style={[styles.errorText, { textAlign: 'center' }]}>
                  Error loading users
                </Text>
                <Text style={[styles.errorSubText, { textAlign: 'center', marginTop: 8 }]}>
                  {(usersQuery.error as any)?.message || 'Unknown error'}
                </Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => usersQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : usersQuery.data && usersQuery.data.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>Select User</Text>
                {usersQuery.data.map((userProfile: any) => (
                  <View key={userProfile.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          {userProfile.full_name || 'Unknown User'}
                        </Text>
                        <Text style={styles.cardSubtitle}>{userProfile.email}</Text>
                        <Text style={styles.balanceText}>
                          Balance: ${userProfile.wallet?.[0]?.balance?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addBalanceBtn}
                        onPress={() => {
                          setSelectedUserId(userProfile.id);
                          setSelectedUserEmail(userProfile.email);
                          setShowAddBalanceModal(true);
                        }}
                      >
                        <Text style={styles.addBalanceBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={{ padding: 20 }}>
                <Text style={styles.emptyText}>No users found</Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => usersQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {selectedTab === 'kyc_documents' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>KYC Verification Panel</Text>
            {kycDocumentsQuery.isLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#60A5FA" size="large" />
                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading KYC documents...</Text>
              </View>
            ) : kycDocumentsQuery.data && kycDocumentsQuery.data.length > 0 ? (
              kycDocumentsQuery.data.map((userKYC: any) => (
                <View key={userKYC.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>
                        {userKYC.full_name || 'Unknown User'}
                      </Text>
                      <Text style={styles.cardSubtitle}>{userKYC.email}</Text>
                    </View>
                    <View style={[styles.statusBadge]}>
                      <Clock size={14} color="#F59E0B" />
                      <Text style={[styles.statusText]}>
                        {userKYC.kyc_status?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>KYC Status:</Text>
                    <Text style={styles.infoValue}>
                      {userKYC.kyc_status || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={styles.infoValue}>
                      {userKYC.status || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.kycPhotos}>
                    <Text style={styles.kycPhotosTitle}>KYC Documents</Text>
                    <View style={styles.kycDocLinks}>
                      <TouchableOpacity
                        style={styles.docLinkButton}
                        onPress={async () => {
                          if (userKYC.id_front) {
                            try {
                              const { data } = supabase.storage
                                .from('kyc-documents')
                                .getPublicUrl(userKYC.id_front);
                              
                              if (data?.publicUrl) {
                                const canOpen = await Linking.canOpenURL(data.publicUrl);
                                if (canOpen) {
                                  await Linking.openURL(data.publicUrl);
                                } else {
                                  Alert.alert('Error', 'Cannot open this URL');
                                }
                              } else {
                                Alert.alert('Error', 'Failed to get document URL');
                              }
                            } catch (err) {
                              console.error('Error opening ID Front:', err);
                              Alert.alert('Error', 'Failed to open document');
                            }
                          } else {
                            Alert.alert('No File', 'ID Front photo not uploaded');
                          }
                        }}
                      >
                        <FileText size={16} color={userKYC.id_front ? "#60A5FA" : "#6B7280"} />
                        <Text style={[styles.docLinkText, !userKYC.id_front && { color: '#6B7280' }]}>ID Front</Text>
                        {userKYC.id_front && <ExternalLink size={14} color="#60A5FA" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.docLinkButton}
                        onPress={async () => {
                          if (userKYC.id_back) {
                            try {
                              const { data } = supabase.storage
                                .from('kyc-documents')
                                .getPublicUrl(userKYC.id_back);
                              
                              if (data?.publicUrl) {
                                const canOpen = await Linking.canOpenURL(data.publicUrl);
                                if (canOpen) {
                                  await Linking.openURL(data.publicUrl);
                                } else {
                                  Alert.alert('Error', 'Cannot open this URL');
                                }
                              } else {
                                Alert.alert('Error', 'Failed to get document URL');
                              }
                            } catch (err) {
                              console.error('Error opening ID Back:', err);
                              Alert.alert('Error', 'Failed to open document');
                            }
                          } else {
                            Alert.alert('No File', 'ID Back photo not uploaded');
                          }
                        }}
                      >
                        <FileText size={16} color={userKYC.id_back ? "#60A5FA" : "#6B7280"} />
                        <Text style={[styles.docLinkText, !userKYC.id_back && { color: '#6B7280' }]}>ID Back</Text>
                        {userKYC.id_back && <ExternalLink size={14} color="#60A5FA" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.docLinkButton}
                        onPress={async () => {
                          if (userKYC.selfie) {
                            try {
                              const { data } = supabase.storage
                                .from('kyc-documents')
                                .getPublicUrl(userKYC.selfie);
                              
                              if (data?.publicUrl) {
                                const canOpen = await Linking.canOpenURL(data.publicUrl);
                                if (canOpen) {
                                  await Linking.openURL(data.publicUrl);
                                } else {
                                  Alert.alert('Error', 'Cannot open this URL');
                                }
                              } else {
                                Alert.alert('Error', 'Failed to get document URL');
                              }
                            } catch (err) {
                              console.error('Error opening Selfie:', err);
                              Alert.alert('Error', 'Failed to open document');
                            }
                          } else {
                            Alert.alert('No File', 'Selfie photo not uploaded');
                          }
                        }}
                      >
                        <FileText size={16} color={userKYC.selfie ? "#60A5FA" : "#6B7280"} />
                        <Text style={[styles.docLinkText, !userKYC.selfie && { color: '#6B7280' }]}>Selfie</Text>
                        {userKYC.selfie && <ExternalLink size={14} color="#60A5FA" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() =>
                        Alert.alert(
                          'Approve KYC',
                          `Approve KYC for ${userKYC.full_name || userKYC.email}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Approve',
                              onPress: () =>
                                approveAccountMutation.mutate({ userId: userKYC.id }),
                            },
                          ]
                        )
                      }
                      disabled={approveAccountMutation.isPending || rejectAccountMutation.isPending}
                    >
                      <CheckCircle size={16} color="#FFF" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() =>
                        Alert.alert(
                          'Reject KYC',
                          `Reject KYC for ${userKYC.full_name || userKYC.email}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Reject',
                              style: 'destructive',
                              onPress: () =>
                                rejectAccountMutation.mutate({ userId: userKYC.id }),
                            },
                          ]
                        )
                      }
                      disabled={approveAccountMutation.isPending || rejectAccountMutation.isPending}
                    >
                      <XCircle size={16} color="#FFF" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 20 }}>
                <Text style={styles.emptyText}>No pending KYC documents</Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => kycDocumentsQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {selectedTab === 'products' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>Product Management</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>📱 Product Management</Text>
              <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
                Products are managed through data files:
              </Text>
              <Text style={[styles.infoCardText, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                • data/iphoneProducts.ts
              </Text>
              <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
                • data/samsungProducts.ts
              </Text>
              <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
                • data/xiaomiProducts.ts
              </Text>
              <Text style={[styles.infoCardText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                To add/edit products: Update the product files with new items including name, storage, battery, price, and AI image prompt.
              </Text>
              <Text style={[styles.infoCardText, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                Set is_active: false to disable a product.
              </Text>
            </View>
          </>
        )}

        {selectedTab === 'orders' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>Order Management</Text>
            {ordersQuery.isLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#60A5FA" size="large" />
                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading orders...</Text>
              </View>
            ) : ordersQuery.data && ordersQuery.data.length > 0 ? (
              ordersQuery.data.map((order: any) => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>
                        {order.profiles?.full_name || 'Unknown User'}
                      </Text>
                      <Text style={styles.cardSubtitle}>{order.profiles?.email}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        order.delivery_status === 'shipped' && styles.statusApproved,
                        order.delivery_status === 'delivered' && { backgroundColor: '#065F46' },
                      ]}
                    >
                      <Text style={[styles.statusText]}>
                        {order.delivery_status?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Product:</Text>
                    <Text style={styles.infoValue}>{order.product_name}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Brand:</Text>
                    <Text style={styles.infoValue}>{order.product_brand || 'N/A'}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Color:</Text>
                    <Text style={styles.infoValue}>{order.color || 'N/A'}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Price:</Text>
                    <Text style={styles.infoValue}>${order.price?.toFixed(2)}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{order.phone_number}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Address:</Text>
                    <Text style={styles.infoValue}>
                      {order.street_address}, {order.city}
                    </Text>
                  </View>

                  {order.delivery_note && (
                    <View style={styles.cardInfo}>
                      <Text style={styles.infoLabel}>Note:</Text>
                      <Text style={styles.infoValue}>{order.delivery_note}</Text>
                    </View>
                  )}

                  <View style={styles.cardInfo}>
                    <Text style={styles.infoLabel}>Date:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(order.created_at).toLocaleString()}
                    </Text>
                  </View>

                  {order.delivery_status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() =>
                          Alert.alert(
                            'Mark as Shipped',
                            'Mark this order as shipped?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Ship',
                                onPress: () =>
                                  updateOrderStatusMutation.mutate({
                                    id: order.id,
                                    status: 'shipped',
                                  }),
                              },
                            ]
                          )
                        }
                        disabled={updateOrderStatusMutation.isPending}
                      >
                        <CheckCircle size={16} color="#FFF" />
                        <Text style={styles.actionButtonText}>Mark Shipped</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {order.delivery_status === 'shipped' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.approveButton, { backgroundColor: '#065F46' }]}
                        onPress={() =>
                          Alert.alert(
                            'Mark as Delivered',
                            'Mark this order as delivered?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Deliver',
                                onPress: () =>
                                  updateOrderStatusMutation.mutate({
                                    id: order.id,
                                    status: 'delivered',
                                  }),
                              },
                            ]
                          )
                        }
                        disabled={updateOrderStatusMutation.isPending}
                      >
                        <CheckCircle size={16} color="#FFF" />
                        <Text style={styles.actionButtonText}>Mark Delivered</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={{ padding: 20 }}>
                <Text style={styles.emptyText}>No orders found</Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => ordersQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {selectedTab === 'market_analytics' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>Market Analytics</Text>
            {marketAnalyticsQuery.isLoading ? (
              <ActivityIndicator color="#60A5FA" size="large" />
            ) : marketAnalyticsQuery.data ? (
              <>
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statCardContent}>
                      <Text style={styles.statIcon}>💰</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Sales</Text>
                        <Text style={[styles.statValue, { color: theme.colors.success }]}>
                          ${marketAnalyticsQuery.data.totalSales.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statCardContent}>
                      <Text style={styles.statIcon}>📦</Text>
                      <View style={styles.statInfo}>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Orders</Text>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                          {marketAnalyticsQuery.data.totalOrders}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24, marginBottom: 16 }]}>Sales by Product Type</Text>
                {Object.entries(marketAnalyticsQuery.data.salesByType).map(([type, stats]: [string, any]) => (
                  <View key={type} style={[styles.card, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.infoLabel}>Orders:</Text>
                      <Text style={styles.infoValue}>{stats.count}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.infoLabel}>Revenue:</Text>
                      <Text style={[styles.infoValue, { color: theme.colors.success }]}>
                        ${stats.total.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.emptyText}>No analytics data</Text>
            )}
          </>
        )}

        {selectedTab === 'withdraw_balance' && (
          <>
            {usersQuery.isLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color="#60A5FA" size="large" />
                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading users...</Text>
              </View>
            ) : usersQuery.error ? (
              <View style={{ padding: 20 }}>
                <Text style={[styles.errorText, { textAlign: 'center' }]}>
                  Error loading users
                </Text>
                <Text style={[styles.errorSubText, { textAlign: 'center', marginTop: 8 }]}>
                  {(usersQuery.error as any)?.message || 'Unknown error'}
                </Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => usersQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : usersQuery.data && usersQuery.data.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>Select User</Text>
                {usersQuery.data.map((userProfile: any) => (
                  <View key={userProfile.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          {userProfile.full_name || 'Unknown User'}
                        </Text>
                        <Text style={styles.cardSubtitle}>{userProfile.email}</Text>
                        <Text style={styles.balanceText}>
                          Balance: ${userProfile.wallet?.[0]?.balance?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.withdrawBalanceBtn}
                        onPress={() => {
                          setSelectedUserId(userProfile.id);
                          setShowWithdrawBalanceModal(true);
                        }}
                      >
                        <Text style={styles.withdrawBalanceBtnText}>- Withdraw</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={{ padding: 20 }}>
                <Text style={styles.emptyText}>No users found</Text>
                <TouchableOpacity
                  style={[styles.backButton, { marginTop: 16, alignSelf: 'center' }]}
                  onPress={() => usersQuery.refetch()}
                >
                  <Text style={styles.backButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
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
            <Text style={styles.modalTitle}>Add Balance</Text>
            <Text style={styles.modalSubtitle}>Enter amount and note</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="User Email"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              value={selectedUserEmail}
              onChangeText={setSelectedUserEmail}
              editable={false}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Amount (USD)"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={amountToAdd}
              onChangeText={setAmountToAdd}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Note (optional)"
              placeholderTextColor="#6B7280"
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
              >
                {addBalanceMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Add Balance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWithdrawBalanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWithdrawBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Balance</Text>
            <Text style={styles.modalSubtitle}>Enter amount to withdraw</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Amount (USD)"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={amountToWithdraw}
              onChangeText={setAmountToWithdraw}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowWithdrawBalanceModal(false);
                  setAmountToWithdraw('');
                  setSelectedUserId('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, styles.withdrawBtn]}
                onPress={() => {
                  const amount = parseFloat(amountToWithdraw);
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
              >
                {withdrawBalanceMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Withdraw Balance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWaitTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWaitTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Wait Time</Text>
            <Text style={styles.modalSubtitle}>Enter wait time in minutes</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Minutes (e.g., 120)"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={waitTimeValue}
              onChangeText={setWaitTimeValue}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowWaitTimeModal(false);
                  setWaitTimeValue('');
                  setWaitTimeUserId('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  const minutes = parseInt(waitTimeValue);
                  if (isNaN(minutes) || minutes < 0) {
                    Alert.alert('Error', 'Please enter a valid number of minutes');
                    return;
                  }
                  updateWaitTimeMutation.mutate({
                    userId: waitTimeUserId,
                    minutes,
                  });
                }}
                disabled={updateWaitTimeMutation.isPending}
              >
                {updateWaitTimeMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Update Wait Time</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  gridButton: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridButtonActive: {},
  gridButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  gridButtonTextActive: {},
  kycPhotos: {
    marginTop: 16,
  },
  kycPhotosTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  photoItem: {
    flex: 1,
  },
  kycImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#111A2E',
  },
  photoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    marginTop: 6,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#0B1220',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#111A2E',
  },
  statusApproved: {
    backgroundColor: '#064E3B',
  },
  statusRejected: {
    backgroundColor: '#7F1D1D',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  statusTextApproved: {
    color: '#34D399',
  },
  statusTextRejected: {
    color: '#F87171',
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  infoValueSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#60A5FA',
    maxWidth: '60%',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  activateNowButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111A2E',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyText: {
    textAlign: 'center' as const,
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#F87171',
    marginBottom: 12,
  },
  errorSubText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  balanceText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
  },

  addBalanceBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addBalanceBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  withdrawBalanceBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  withdrawBalanceBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  withdrawBtn: {
    backgroundColor: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0B1220',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#111A2E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  editWaitTimeBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editWaitTimeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    fontSize: 32,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  totalBalanceCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  totalBalanceIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  totalBalanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  totalBalanceValue: {
    fontSize: 36,
    fontWeight: '700' as const,
  },
  quickActions: {
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  quickActionIcon: {
    fontSize: 28,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  infoCardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  kycDocLinks: {
    gap: 12,
  },
  docLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111A2E',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  docLinkText: {
    flex: 1,
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: '600' as const,
  },
});

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
  Search,
  BarChart3,
  Users,
} from 'lucide-react-native';

// ✅ IMPORTANT: remove the default (dark blue) navigation header
export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

// ✅ Your real bucket name
const KYC_BUCKET = 'kyc-documents';

// (optional) if your avatar_url is a storage path (not full URL), set this to your avatars bucket name.
// If your avatar_url is already a full https URL, it will work automatically.
const AVATAR_BUCKET = 'avatars';

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
  | 'manage_all_users'
  | 'account_approval'
  | 'deposits'
  | 'withdrawals'
  | 'add_balance'
  | 'withdraw_balance'
  | 'kyc_documents'
  | 'transactions';

type KycKind = 'id_front' | 'id_back' | 'selfie';

type StorageFile = { name?: string | null };

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

  // ✅ search for manage all users
  const [userSearch, setUserSearch] = useState('');

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

  // ✅ cache bucket folder listing so we can:
  // - show ALL users with docs (even when profiles columns are NULL)
  // - resolve exact filenames fast
  const [kycFolderCache, setKycFolderCache] = useState<Record<string, StorageFile[]>>({});
  const [kycHasDocs, setKycHasDocs] = useState<Record<string, boolean>>({});
  const [kycScanLoading, setKycScanLoading] = useState(false);

  // ✅ FIX: per-user approve/reject loading (prevents double click + shows correct disable)
  const [accountActionBusy, setAccountActionBusy] = useState<Record<string, 'approve' | 'reject' | null>>({});

  // ✅ FIX: keep a map of user_id -> email (when profiles.email is null/N/A)
  const [adminEmailMap, setAdminEmailMap] = useState<Record<string, string>>({});

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  // ---------- TIME (Iraq) helpers ----------
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
      // fallback (if Intl timeZone not available on some devices)
      return d.toLocaleString();
    }
  };

  // ---------- Avatar helpers ----------
  const isLikelyUrl = (v?: string | null) => !!v && (v.startsWith('http://') || v.startsWith('https://'));
  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) return null;
    if (isLikelyUrl(avatarUrl)) return avatarUrl;

    // if it is a storage path, try to build public url (works only if bucket is public).
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

  const displayEmailForUser = (userId?: string | null, email?: string | null) => {
    const e = (email || '').trim();
    if (e && e.toLowerCase() !== 'n/a') return e;
    if (userId && adminEmailMap[userId]) return adminEmailMap[userId];
    return 'N/A';
  };

  // ---------- KYC helpers ----------
  const KYC_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

  const trySignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from(KYC_BUCKET).createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data?.signedUrl || null;
  };

  const getFolderFiles = async (userId: string): Promise<StorageFile[]> => {
    if (!userId) return [];
    if (kycFolderCache[userId]) return kycFolderCache[userId];

    try {
      const { data, error } = await supabase.storage.from(KYC_BUCKET).list(userId, {
        limit: 200,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (!error && Array.isArray(data)) {
        setKycFolderCache((prev) => ({ ...prev, [userId]: data as any }));
        return data as any;
      }
    } catch {
      // ignore
    }

    setKycFolderCache((prev) => ({ ...prev, [userId]: [] }));
    return [];
  };

  const folderHasAnyKyc = (files: StorageFile[]) => {
    const names = (files || []).map((f) => (f.name || '').toLowerCase());
    return names.some(
      (n) => n.includes('id_front') || n.includes('id-back') || n.includes('id_back') || n.includes('selfie')
    );
  };

  // ✅ smarter resolver (now uses cache)
  const resolveKycPathSmart = async (userId: string, kind: KycKind) => {
    // 1) use cached list if exists, else list
    const data = await getFolderFiles(userId);
    if (data && data.length > 0) {
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
        queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
        queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
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
    if (!isAdmin || selectedTab !== 'kyc_documents') return;

    const channel = supabase
      .channel('admin-kyc-documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedTab, queryClient]);

  // ✅ realtime manage all users
  useEffect(() => {
    if (!isAdmin || selectedTab !== 'manage_all_users') return;

    const channel = supabase
      .channel('admin-all-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
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
        profile: Profile & { city?: string | null; country?: string | null; avatar_url?: string | null };
      })[];
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
            email,
            city,
            country,
            avatar_url
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
      ) as (WithdrawOrder & {
        profile: Profile & { city?: string | null; country?: string | null; avatar_url?: string | null };
      })[];
    },
    enabled: selectedTab === 'withdrawals',
  });

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
    enabled: selectedTab === 'account_approval',
  });

  // ✅ KYC users list (show everyone with docs in bucket or columns)
  const kycDocumentsQuery = useQuery({
    queryKey: ['admin-kyc-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, email, full_name, city, country, avatar_url, kyc_status, status, id_front, id_back, selfie, created_at'
        )
        .in('status', ['pending', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: selectedTab === 'kyc_documents',
  });

  // ✅ Manage all users (ALL profiles)
  const allUsersQuery = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, city, country, avatar_url, kyc_status, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: selectedTab === 'manage_all_users',
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
    enabled: selectedTab === 'transactions',
  });

  // ✅ Scan storage folders for ALL loaded users to know who has docs
  useEffect(() => {
    const shouldScan = selectedTab === 'kyc_documents';
    if (!shouldScan) return;
    if (kycDocumentsQuery.isLoading) return;

    const users = (kycDocumentsQuery.data || []) as any[];
    if (!users.length) return;

    let cancelled = false;

    const run = async () => {
      setKycScanLoading(true);

      const updates: Record<string, boolean> = {};
      const cacheUpdates: Record<string, StorageFile[]> = {};

      // ✅ limit parallel requests to avoid overload
      const batchSize = 10;
      for (let i = 0; i < users.length; i += batchSize) {
        const slice = users.slice(i, i + batchSize);

        const results = await Promise.all(
          slice.map(async (u: any) => {
            const userId = u.id;

            // if already cached, compute quickly
            if (kycFolderCache[userId]) {
              return { userId, files: kycFolderCache[userId] };
            }

            try {
              const { data, error } = await supabase.storage.from(KYC_BUCKET).list(userId, {
                limit: 200,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
              });

              if (!error && Array.isArray(data)) {
                return { userId, files: data as any };
              }
            } catch {
              // ignore
            }
            return { userId, files: [] as StorageFile[] };
          })
        );

        results.forEach(({ userId, files }) => {
          cacheUpdates[userId] = files;
          updates[userId] = folderHasAnyKyc(files);
        });

        if (cancelled) return;
      }

      if (cancelled) return;

      setKycFolderCache((prev) => ({ ...prev, ...cacheUpdates }));
      setKycHasDocs((prev) => ({ ...prev, ...updates }));
      setKycScanLoading(false);
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, kycDocumentsQuery.isLoading, kycDocumentsQuery.data]);

  // ✅ only show users that truly have docs:
  // - columns have value OR storage folder contains any KYC file
  const kycUsersWithDocs = useMemo(() => {
    const list = (kycDocumentsQuery.data || []) as any[];

    return list.filter((u) => {
      const hasCols = !!u.id_front || !!u.id_back || !!u.selfie;
      const hasStorage = kycHasDocs[u.id] === true;
      return hasCols || hasStorage;
    });
  }, [kycDocumentsQuery.data, kycHasDocs]);

  const filteredAllUsers = useMemo(() => {
    const list = (allUsersQuery.data || []) as any[];
    const q = userSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u: any) => {
      const name = (u.full_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const city = (u.city || '').toLowerCase();
      const country = (u.country || '').toLowerCase();
      return name.includes(q) || email.includes(q) || city.includes(q) || country.includes(q);
    });
  }, [allUsersQuery.data, userSearch]);

  // ---------- FIX HELPERS (Approve/Reject + Emails) ----------
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

      // if function missing, continue trying other names
      if (isMissingFnError(error)) continue;

      // other errors should stop immediately (permission/rls/etc)
      throw error;
    }

    // all missing
    throw lastErr || new Error('RPC function not found');
  };

  /**
   * ✅ FIX: Ensure BOTH profiles.status and profiles.kyc_status always change together.
   * - Approve => approved/approved
   * - Reject  => pending/pending  (as you requested)
   *
   * It tries RPC first (best for RLS), then falls back to direct update.
   */
  const setProfileStatusBoth = async (userId: string, next: 'approved' | 'pending') => {
  // ✅ Always update BOTH columns together using ONE RPC
  // This prevents the bug "only status changes OR only kyc_status changes"
  const { error } = await supabase.rpc('admin_set_profile_status', {
    p_user_id: userId,
    p_status: next,
    p_kyc_status: next,
  });

  if (!error) return;

  // ✅ fallback: some people name params differently
  const { error: error2 } = await supabase.rpc('admin_set_profile_status', {
    user_id: userId,
    status: next,
    kyc_status: next,
  } as any);

  if (!error2) return;

  // ✅ final fallback: direct update (only works if RLS allows admin update)
  const { error: error3 } = await supabase
    .from('profiles')
    .update({ status: next, kyc_status: next })
    .eq('id', userId);

  if (error3) throw error3;
};
  const patchUserInLists = (userId: string, next: 'approved' | 'pending') => {
  const patch = (arr: any[] | undefined) =>
    (arr || []).map((u: any) =>
      u?.id === userId
        ? {
            ...u,
            status: next,
            kyc_status: next,
          }
        : u
    );

  queryClient.setQueryData(['admin-pending-accounts'], (old: any) => patch(old));
  queryClient.setQueryData(['admin-kyc-documents'], (old: any) => patch(old));
  queryClient.setQueryData(['admin-all-users'], (old: any) => patch(old));
};

  /**
   * ✅ FIX: Fetch emails from Supabase Auth (auth.users) using RPC (server-side),
   * because the client cannot read auth.users directly.
   *
   * This function will silently do nothing if you did not create the RPC.
   *
   * Expected RPC return formats supported:
   * - [{ id: 'uuid', email: 'a@b.com' }, ...]
   * - [{ user_id: 'uuid', email: 'a@b.com' }, ...]
   * - { [id]: email }
   */
  const fetchAuthEmailsByIds = async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (!unique.length) return;

    // Don't re-fetch already known
    const missing = unique.filter((id) => !adminEmailMap[id]);
    if (!missing.length) return;

    const rpcNames = ['admin_get_user_emails', 'admin_get_auth_emails', 'get_user_emails', 'get_auth_emails'];

    // try: { p_user_ids: uuid[] }
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
      return;
    } catch (e1: any) {
      if (!isMissingFnError(e1)) {
        // real error (permissions etc) -> show once, but don't break screen
        console.warn('Email RPC error:', e1?.message || e1);
        return;
      }
    }

    // try: { user_ids: uuid[] }
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
      // if RPC does not exist, silently ignore
      if (!isMissingFnError(e2)) console.warn('Email RPC error:', e2?.message || e2);
    }
  };

  // ✅ auto-fetch missing emails when lists load
  useEffect(() => {
    if (!isAdmin) return;

    const ids: string[] = [];
    if (selectedTab === 'kyc_documents') {
      (kycUsersWithDocs || []).forEach((u: any) => {
        const hasEmail = (u.email || '').trim() && (u.email || '').trim().toLowerCase() !== 'n/a';
        if (!hasEmail) ids.push(u.id);
      });
    } else if (selectedTab === 'account_approval') {
      (pendingAccountsQuery.data || []).forEach((u: any) => {
        const hasEmail = (u.email || '').trim() && (u.email || '').trim().toLowerCase() !== 'n/a';
        if (!hasEmail) ids.push(u.id);
      });
    } else if (selectedTab === 'manage_all_users') {
      (allUsersQuery.data || []).slice(0, 60).forEach((u: any) => {
        // limit, so we don't spam RPC for thousands users
        const hasEmail = (u.email || '').trim() && (u.email || '').trim().toLowerCase() !== 'n/a';
        if (!hasEmail) ids.push(u.id);
      });
    }

    if (ids.length) fetchAuthEmailsByIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, isAdmin, kycUsersWithDocs, pendingAccountsQuery.data, allUsersQuery.data]);

  // ---------- mutations ----------
  const updateDepositMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('deposit_orders').update({ status }).eq('id', id);
      if (error) throw error;

      if (status === 'approved') {
        const order = depositsQuery.data?.find((d: any) => d.id === id);
        if (order) {
          const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', order.user_id).single();
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

  /**
   * ✅ FIXED: Approve KYC/Account
   * - MUST set BOTH columns: profiles.status + profiles.kyc_status => 'approved'
   */
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
      const msg =
        error?.message ||
        'Failed to approve. If this is RLS, create a SECURITY DEFINER RPC to update profiles.status and profiles.kyc_status.';
      Alert.alert('Error', msg);
    },
    onSettled: (_d, _e, vars) => {
      if (vars?.userId) setAccountActionBusy((prev) => ({ ...prev, [vars.userId]: null }));
    },
  });

  /**
   * ✅ FIXED: Reject KYC/Account
   * - As you requested: set BOTH columns back to 'pending' (NOT rejected)
   */
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
      const msg =
        error?.message ||
        'Failed to reject. If this is RLS, create a SECURITY DEFINER RPC to update profiles.status and profiles.kyc_status.';
      Alert.alert('Error', msg);
    },
    onSettled: (_d, _e, vars) => {
      if (vars?.userId) setAccountActionBusy((prev) => ({ ...prev, [vars.userId]: null }));
    },
  });

  const addBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, note }: { userId: string; amount: number; note: string }) => {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

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
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

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
      <TouchableOpacity
        style={[styles.menuBtn, active && styles.menuBtnActive]}
        onPress={() => setSelectedTab(tab)}
        activeOpacity={0.85}
      >
        <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>{icon}</View>
        <Text style={[styles.menuText, active && styles.menuTextActive]} numberOfLines={2}>
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

      {/* ✅ MENU (3 buttons per row) */}
      <View style={styles.menuWrap}>
        <MenuButton
          label="Dashboard"
          tab="dashboard"
          icon={<BarChart3 size={16} color={selectedTab === 'dashboard' ? UI.blue : UI.text2} />}
        />

        {/* ✅ RENAMED: Document Image User -> Manage All User */}
        <MenuButton
          label="Manage All User"
          tab="manage_all_users"
          icon={<Users size={16} color={selectedTab === 'manage_all_users' ? UI.blue : UI.text2} />}
        />

        <MenuButton
          label="Account Approval"
          tab="account_approval"
          icon={<ShieldCheck size={16} color={selectedTab === 'account_approval' ? UI.blue : UI.text2} />}
        />
        <MenuButton
          label="Deposits"
          tab="deposits"
          icon={<ArrowDownToLine size={16} color={selectedTab === 'deposits' ? UI.blue : UI.text2} />}
        />
        <MenuButton
          label="Withdrawals"
          tab="withdrawals"
          icon={<ArrowUpFromLine size={16} color={selectedTab === 'withdrawals' ? UI.blue : UI.text2} />}
        />
        <MenuButton
          label="Add Balance"
          tab="add_balance"
          icon={<PlusCircle size={16} color={selectedTab === 'add_balance' ? UI.blue : UI.text2} />}
        />
        <MenuButton
          label="Withdraw Balance"
          tab="withdraw_balance"
          icon={<MinusCircle size={16} color={selectedTab === 'withdraw_balance' ? UI.blue : UI.text2} />}
        />
        <MenuButton
          label="KYC Document"
          tab="kyc_documents"
          icon={<FileText size={16} color={selectedTab === 'kyc_documents' ? UI.blue : UI.text2} />}
        />
        <MenuButton
          label="Transactions"
          tab="transactions"
          icon={<ReceiptText size={16} color={selectedTab === 'transactions' ? UI.blue : UI.text2} />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ---------------- Manage All User ---------------- */}
        {selectedTab === 'manage_all_users' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Manage All User</Text>

            <View style={styles.searchCard}>
              <View style={styles.searchLeft}>
                <Search size={16} color={UI.text2} />
                <TextInput
                  value={userSearch}
                  onChangeText={setUserSearch}
                  placeholder="Search by name, email, city, country..."
                  placeholderTextColor={UI.text2}
                  style={styles.searchInput}
                />
              </View>
              <TouchableOpacity style={styles.searchClearBtn} onPress={() => setUserSearch('')} activeOpacity={0.85}>
                <Text style={styles.searchClearText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {allUsersQuery.isLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading users...</Text>
              </View>
            ) : filteredAllUsers.length > 0 ? (
              filteredAllUsers.map((u: any) => {
                const displayName = (u.full_name || '').trim() || 'Unknown Name';
                const avatar = getAvatarUrl(u.avatar_url);

                return (
                  <View key={u.id} style={styles.card}>
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
                        <Text style={styles.cardSubtitle}>{displayEmailForUser(u.id, u.email)}</Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: UI.blueSoft }]}>
                        <Users size={14} color={UI.blue} />
                        <Text style={[styles.badgeText, { color: UI.blue }]}>USER</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Full Name</Text>
                      <Text style={styles.rowValue}>{displayName}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Email</Text>
                      <Text style={styles.rowValue}>{displayEmailForUser(u.id, u.email)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>City</Text>
                      <Text style={styles.rowValue}>{u.city || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Country</Text>
                      <Text style={styles.rowValue}>{u.country || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Registered (Iraq)</Text>
                      <Text style={styles.rowValue}>{formatIraqTime(u.created_at)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>KYC Status</Text>
                      <Text style={styles.rowValue}>{u.kyc_status || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Status</Text>
                      <Text style={styles.rowValue}>{u.status || 'N/A'}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: 18 }}>
                <Text style={styles.emptyText}>No users found</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => allUsersQuery.refetch()}>
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
                    <Text style={[styles.statValue, { color: UI.amber }]}>${parseFloat(withdrawStatsQuery.data.pending_amount || 0).toFixed(2)}</Text>
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
                        <Text style={[styles.badgeText, { color: UI.amber }]}>{profile.status?.toUpperCase() || 'PENDING'}</Text>
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
                        style={[styles.actionBtn, { backgroundColor: UI.green, opacity: disableBtns && busy !== 'approve' ? 0.7 : 1 }]}
                        onPress={() =>
                          Alert.alert('Approve Account', `Approve ${profile.full_name || displayEmailForUser(profile.id, profile.email)}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Approve', onPress: () => approveAccountMutation.mutate({ userId: profile.id }) },
                          ])
                        }
                        disabled={disableBtns}
                      >
                        {busy === 'approve' ? <ActivityIndicator color="#fff" /> : <CheckCircle size={16} color="#fff" />}
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: UI.red, opacity: disableBtns && busy !== 'reject' ? 0.7 : 1 }]}
                        onPress={() =>
                          Alert.alert('Reject Account', `Set back to pending for ${profile.full_name || displayEmailForUser(profile.id, profile.email)}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Reject', style: 'destructive', onPress: () => rejectAccountMutation.mutate({ userId: profile.id }) },
                          ])
                        }
                        disabled={disableBtns}
                      >
                        {busy === 'reject' ? <ActivityIndicator color="#fff" /> : <XCircle size={16} color="#fff" />}
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
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
                        <Text style={styles.cardSubtitle}>{displayEmailForUser(p.id, p.email)}</Text>
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
                      <Text style={styles.rowValue}>${Number(order.amount || 0).toFixed(2)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Crypto</Text>
                      <Text style={styles.rowValue}>{(order.crypto_type || '').replace('_', ' ')}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Transaction ID</Text>
                      <Text style={styles.rowValueSmall} numberOfLines={1}>
                        {order.transaction_id || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Date (Iraq)</Text>
                      <Text style={styles.rowValue}>{formatIraqTime(order.created_at)}</Text>
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
                );
              })
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
              withdrawalsQuery.data.map((order: any) => {
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
                        <Text style={styles.cardSubtitle}>{displayEmailForUser(p.id, p.email)}</Text>
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
                      <Text style={styles.rowValue}>${Number(order.amount || 0).toFixed(2)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Currency</Text>
                      <Text style={styles.rowValue}>{order.currency || 'N/A'}</Text>
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
                      <Text style={styles.rowLabel}>Date (Iraq)</Text>
                      <Text style={styles.rowValue}>{formatIraqTime(order.created_at)}</Text>
                    </View>

                    {order.status === 'pending' && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: UI.green }]}
                          onPress={() =>
                            Alert.alert(
                              'Approve Withdrawal',
                              `Approve withdrawal of ${Number(order.amount || 0).toFixed(
                                2
                              )}?\n\nThis will deduct the balance from user's wallet and update the status.`,
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
                );
              })
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
                {usersQuery.data.map((userProfile: any) => {
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
                          <Text style={styles.cardSubtitle}>{displayEmailForUser(userProfile.id, userProfile.email)}</Text>
                          <Text style={styles.balanceText}>Balance: ${userProfile.wallet?.[0]?.balance?.toFixed(2) || '0.00'}</Text>
                          <Text style={styles.smallMeta}>
                            {userProfile.city || 'N/A'} • {userProfile.country || 'N/A'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: UI.green }]}
                          onPress={() => {
                            setSelectedUserId(userProfile.id);
                            setSelectedUserEmail(displayEmailForUser(userProfile.id, userProfile.email));
                            setShowAddBalanceModal(true);
                          }}
                        >
                          <Text style={styles.smallBtnText}>+ Add</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Registered (Iraq)</Text>
                        <Text style={styles.rowValue}>{formatIraqTime(userProfile.created_at)}</Text>
                      </View>
                    </View>
                  );
                })}
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
                {usersQuery.data.map((userProfile: any) => {
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
                          <Text style={styles.cardSubtitle}>{displayEmailForUser(userProfile.id, userProfile.email)}</Text>
                          <Text style={styles.balanceText}>Balance: ${userProfile.wallet?.[0]?.balance?.toFixed(2) || '0.00'}</Text>
                          <Text style={styles.smallMeta}>
                            {userProfile.city || 'N/A'} • {userProfile.country || 'N/A'}
                          </Text>
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

                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Registered (Iraq)</Text>
                        <Text style={styles.rowValue}>{formatIraqTime(userProfile.created_at)}</Text>
                      </View>
                    </View>
                  );
                })}
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

        {/* ---------------- KYC Documents (ALL USERS WITH DOCS) ---------------- */}
        {selectedTab === 'kyc_documents' && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>KYC Verification Panel</Text>

            {kycDocumentsQuery.isLoading || kycScanLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={UI.blue} size="large" />
                <Text style={styles.emptyText}>Loading users...</Text>
              </View>
            ) : kycUsersWithDocs.length > 0 ? (
              kycUsersWithDocs.map((userKYC: any) => {
                const badge = kycBadge(userKYC.kyc_status);
                const displayName = (userKYC.full_name || '').trim() || 'Unknown Name';
                const avatar = getAvatarUrl(userKYC.avatar_url);
                const busy = accountActionBusy[userKYC.id];
                const disableBtns = !!busy || approveAccountMutation.isPending || rejectAccountMutation.isPending;

                const showEmail = displayEmailForUser(userKYC.id, userKYC.email);

                return (
                  <View key={userKYC.id} style={styles.card}>
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
                        <Text style={styles.cardSubtitle}>{showEmail}</Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        {badge.icon}
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>City</Text>
                      <Text style={styles.rowValue}>{userKYC.city || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Country</Text>
                      <Text style={styles.rowValue}>{userKYC.country || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Full Name</Text>
                      <Text style={styles.rowValue}>{displayName}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Email</Text>
                      <Text style={styles.rowValue}>{showEmail}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>KYC Status</Text>
                      <Text style={styles.rowValue}>{userKYC.kyc_status || 'pending'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Status</Text>
                      <Text style={styles.rowValue}>{userKYC.status || 'pending'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Registered (Iraq)</Text>
                      <Text style={styles.rowValue}>{formatIraqTime(userKYC.created_at)}</Text>
                    </View>

                    <View style={styles.kycBlock}>
                      <Text style={styles.kycBlockTitle}>KYC Documents</Text>

                      <View style={styles.thumbRow}>
                        <TouchableOpacity
                          style={styles.thumbWrap}
                          onPress={() => openKycPreview('ID Front', userKYC.id_front, userKYC.id, 'id_front')}
                          activeOpacity={0.85}
                        >
                          <View style={styles.thumb}>
                            <FileText size={16} color={UI.blue} />
                            <Text style={styles.thumbText}>ID Front</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.thumbWrap}
                          onPress={() => openKycPreview('ID Back', userKYC.id_back, userKYC.id, 'id_back')}
                          activeOpacity={0.85}
                        >
                          <View style={styles.thumb}>
                            <FileText size={16} color={UI.blue} />
                            <Text style={styles.thumbText}>ID Back</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.thumbWrap}
                          onPress={() => openKycPreview('Selfie', userKYC.selfie, userKYC.id, 'selfie')}
                          activeOpacity={0.85}
                        >
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
                        style={[styles.actionBtn, { backgroundColor: UI.green, opacity: disableBtns && busy !== 'approve' ? 0.7 : 1 }]}
                        onPress={() =>
                          Alert.alert('Approve KYC', `Approve KYC for ${userKYC.full_name || showEmail}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Approve', onPress: () => approveAccountMutation.mutate({ userId: userKYC.id }) },
                          ])
                        }
                        disabled={disableBtns}
                      >
                        {busy === 'approve' ? <ActivityIndicator color="#fff" /> : <CheckCircle size={16} color="#fff" />}
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: UI.red, opacity: disableBtns && busy !== 'reject' ? 0.7 : 1 }]}
                        onPress={() =>
                          Alert.alert('Reject KYC', `Set back to pending for ${userKYC.full_name || showEmail}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Reject', style: 'destructive', onPress: () => rejectAccountMutation.mutate({ userId: userKYC.id }) },
                          ])
                        }
                        disabled={disableBtns}
                      >
                        {busy === 'reject' ? <ActivityIndicator color="#fff" /> : <XCircle size={16} color="#fff" />}
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
                    txAmountFilter === 'all' || (txAmountFilter === 'positive' && tx.amount >= 0) || (txAmountFilter === 'negative' && tx.amount < 0);
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
                  filtered.map((tx: any) => {
                    const displayName = (tx.receiver?.full_name || '').trim() || 'Unknown Name';
                    const avatar = getAvatarUrl(tx.receiver?.avatar_url);

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
                            <Text style={styles.cardSubtitle}>{tx.receiver?.email || 'N/A'}</Text>
                          </View>

                          <View style={[styles.badge, tx.amount >= 0 ? { backgroundColor: UI.greenSoft } : { backgroundColor: UI.redSoft }]}>
                            <Text style={[styles.badgeText, tx.amount >= 0 ? { color: UI.green } : { color: UI.red }]}>
                              {tx.amount >= 0 ? '+' : ''}${Number(tx.amount || 0).toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Type</Text>
                          <Text style={styles.rowValue}>{getTransactionTitle(tx)}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Balance After</Text>
                          <Text style={[styles.rowValue, { color: UI.blue }]}>${Number(tx.balance_after || 0).toFixed(2)}</Text>
                        </View>

                        {tx.description && (
                          <View style={styles.row}>
                            <Text style={styles.rowLabel}>Description</Text>
                            <Text style={styles.rowValue}>{tx.description}</Text>
                          </View>
                        )}

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Time (Iraq)</Text>
                          <Text style={styles.rowValue}>{formatIraqTime(tx.created_at)}</Text>
                        </View>
                      </View>
                    );
                  })
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

            <TextInput style={styles.modalInput} placeholder="Note (optional)" placeholderTextColor={UI.text2} value={noteToAdd} onChangeText={setNoteToAdd} />

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

  // ✅ 3 buttons per row
  menuWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  menuBtn: {
    width: '31.5%',
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
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
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    color: UI.text,
    lineHeight: 13,
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

  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
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
  smallMeta: {
    marginTop: 6,
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
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

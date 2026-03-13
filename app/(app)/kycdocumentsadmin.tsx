import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
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
  LogOut,
  FileText,
  ExternalLink,
  Home,
  X,
  ShieldCheck,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const KYC_BUCKET = 'kyc-documents';
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

type KycKind = 'id_front' | 'id_back' | 'selfie';
type StorageFile = { name?: string | null };

const isLikelyUrl = (v?: string | null) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  if (isLikelyUrl(avatarUrl)) return avatarUrl;

  try {
    return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarUrl)?.data?.publicUrl || null;
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

export default function KycDocumentsAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const [kycPreviewOpen, setKycPreviewOpen] = useState(false);
  const [kycPreviewTitle, setKycPreviewTitle] = useState('');
  const [kycPreviewUrl, setKycPreviewUrl] = useState('');
  const [kycPreviewLoading, setKycPreviewLoading] = useState(false);

  const [kycFolderCache, setKycFolderCache] = useState<Record<string, StorageFile[]>>({});
  const [kycHasDocs, setKycHasDocs] = useState<Record<string, boolean>>({});
  const [kycScanLoading, setKycScanLoading] = useState(false);

  const [accountActionBusy, setAccountActionBusy] = useState<Record<string, 'approve' | 'reject' | null>>({});
  const [adminEmailMap, setAdminEmailMap] = useState<Record<string, string>>({});

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

    if (error3) throw call2.error || call1.error || error3;
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
      return;
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

  const displayEmailForUser = (userId?: string | null, email?: string | null) => {
    const e = (email || '').trim();
    if (e && e.toLowerCase() !== 'n/a') return e;
    if (userId && adminEmailMap[userId]) return adminEmailMap[userId];
    return 'N/A';
  };

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
    } catch {}

    setKycFolderCache((prev) => ({ ...prev, [userId]: [] }));
    return [];
  };

  const folderHasAnyKyc = (files: StorageFile[]) => {
    const names = (files || []).map((f) => (f.name || '').toLowerCase());
    return names.some(
      (n) => n.includes('id_front') || n.includes('id-back') || n.includes('id_back') || n.includes('selfie')
    );
  };

  const resolveKycPathSmart = async (userId: string, kind: KycKind) => {
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

    for (const ext of KYC_EXTS) {
      const candidate = `${userId}/${kind}.${ext}`;
      const signed = await trySignedUrl(candidate);
      if (signed) return candidate;
    }

    return null;
  };

  const getKycUrl = async (pathOrUrl?: string | null) => {
    if (!pathOrUrl) return null;
    if (isLikelyUrl(pathOrUrl)) return pathOrUrl;

    const signed = await trySignedUrl(pathOrUrl);
    if (signed) return signed;

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

  useEffect(() => {
    if (!isAdmin) return;

    const ids: string[] = [];
    (kycDocumentsQuery.data || []).forEach((u: any) => {
      const hasEmail = (u.email || '').trim() && (u.email || '').trim().toLowerCase() !== 'n/a';
      if (!hasEmail) ids.push(u.id);
    });

    if (ids.length) fetchAuthEmailsByIds(ids);
  }, [isAdmin, kycDocumentsQuery.data]);

  useEffect(() => {
    if (!isAdmin) return;
    if (kycDocumentsQuery.isLoading) return;

    const users = (kycDocumentsQuery.data || []) as any[];
    if (!users.length) return;

    let cancelled = false;

    const run = async () => {
      setKycScanLoading(true);

      const updates: Record<string, boolean> = {};
      const cacheUpdates: Record<string, StorageFile[]> = {};

      const batchSize = 10;
      for (let i = 0; i < users.length; i += batchSize) {
        const slice = users.slice(i, i + batchSize);

        const results = await Promise.all(
          slice.map(async (u: any) => {
            const userId = u.id;

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
            } catch {}

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
  }, [isAdmin, kycDocumentsQuery.isLoading, kycDocumentsQuery.data]);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-kyc-documents-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const kycUsersWithDocs = useMemo(() => {
    const list = (kycDocumentsQuery.data || []) as any[];

    return list.filter((u) => {
      const hasCols = !!u.id_front || !!u.id_back || !!u.selfie;
      const hasStorage = kycHasDocs[u.id] === true;
      return hasCols || hasStorage;
    });
  }, [kycDocumentsQuery.data, kycHasDocs]);

  const kycBadge = (kycStatus?: string | null) => {
    const s = (kycStatus || 'pending').toLowerCase();

    if (s === 'approved') {
      return {
        bg: UI.greenSoft,
        color: UI.green,
        icon: <CheckCircle size={14} color={UI.green} />,
        text: 'APPROVED',
      };
    }

    if (s === 'rejected') {
      return {
        bg: UI.redSoft,
        color: UI.red,
        icon: <XCircle size={14} color={UI.red} />,
        text: 'REJECTED',
      };
    }

    return {
      bg: UI.amberSoft,
      color: UI.amber,
      icon: <Clock size={14} color={UI.amber} />,
      text: 'PENDING',
    };
  };

  const approveAccountMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      setAccountActionBusy((prev) => ({ ...prev, [userId]: 'approve' }));
      await setProfileStatusBoth(userId, 'approved');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      Alert.alert('Success', 'Approved: status + kyc_status updated.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to approve KYC');
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
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      Alert.alert('Success', 'Set back to pending: status + kyc_status updated.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to reject KYC');
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
          <Text style={styles.headerTitle}>KYC Documents</Text>
          <Text style={styles.headerSub}>Review uploaded user verification documents</Text>
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
            <Text style={styles.sectionTitle}>KYC Verification Panel</Text>
            <Text style={styles.sectionSub}>Open documents and approve or reject users</Text>
          </View>
        </View>

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
                      activeOpacity={0.9}
                    >
                      <View style={styles.thumb}>
                        <FileText size={16} color={UI.blue} />
                        <Text style={styles.thumbText}>ID Front</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.thumbWrap}
                      onPress={() => openKycPreview('ID Back', userKYC.id_back, userKYC.id, 'id_back')}
                      activeOpacity={0.9}
                    >
                      <View style={styles.thumb}>
                        <FileText size={16} color={UI.blue} />
                        <Text style={styles.thumbText}>ID Back</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.thumbWrap}
                      onPress={() => openKycPreview('Selfie', userKYC.selfie, userKYC.id, 'selfie')}
                      activeOpacity={0.9}
                    >
                      <View style={styles.thumb}>
                        <FileText size={16} color={UI.blue} />
                        <Text style={styles.thumbText}>Selfie</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.docLinks}>
                    <TouchableOpacity
                      style={styles.docLinkButton}
                      onPress={() => openExternal(userKYC.id_front, userKYC.id, 'id_front')}
                      activeOpacity={0.9}
                    >
                      <ExternalLink size={16} color={UI.blue} />
                      <Text style={styles.docLinkText}>Open ID Front</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.docLinkButton}
                      onPress={() => openExternal(userKYC.id_back, userKYC.id, 'id_back')}
                      activeOpacity={0.9}
                    >
                      <ExternalLink size={16} color={UI.blue} />
                      <Text style={styles.docLinkText}>Open ID Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.docLinkButton}
                      onPress={() => openExternal(userKYC.selfie, userKYC.id, 'selfie')}
                      activeOpacity={0.9}
                    >
                      <ExternalLink size={16} color={UI.blue} />
                      <Text style={styles.docLinkText}>Open Selfie</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.approveBtn,
                      { opacity: disableBtns && busy !== 'approve' ? 0.7 : 1 },
                    ]}
                    onPress={() =>
                      Alert.alert('Approve KYC', `Approve KYC for ${userKYC.full_name || showEmail}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Approve', onPress: () => approveAccountMutation.mutate({ userId: userKYC.id }) },
                      ])
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
                      Alert.alert('Reject KYC', `Set back to pending for ${userKYC.full_name || showEmail}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reject', style: 'destructive', onPress: () => rejectAccountMutation.mutate({ userId: userKYC.id }) },
                      ])
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
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={kycPreviewOpen} transparent animationType="fade" onRequestClose={() => setKycPreviewOpen(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{kycPreviewTitle}</Text>

              <TouchableOpacity style={styles.previewClose} onPress={() => setKycPreviewOpen(false)} activeOpacity={0.85}>
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

            <TouchableOpacity
              style={styles.previewOpenBtn}
              onPress={() => kycPreviewUrl && openExternal(kycPreviewUrl)}
              disabled={!kycPreviewUrl}
              activeOpacity={0.9}
            >
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
  thumbWrap: {
    flex: 1,
  },
  thumb: {
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardSoft,
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

  docLinks: {
    marginTop: 10,
    gap: 10,
  },
  docLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.cardSoft,
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
    borderRadius: 20,
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
    backgroundColor: UI.cardSoft,
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

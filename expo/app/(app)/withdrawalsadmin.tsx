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
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Home,
  LogOut,
  Landmark,
  Mail,
  User,
  Image as ImageIcon,
  Phone,
  Wallet,
  Receipt,
  CircleAlert,
  Eye,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const AVATAR_BUCKET = 'avatars';
const NOTIFICATION_FUNCTION = 'send-notification';

const UI = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardSoft: '#F1F5F9',
  text: '#0F1B33',
  text2: '#5B6B82',
  text3: '#9FB0C7',
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

type WithdrawAdminItem = {
  id: string;
  user_id: string;
  amount: number;
  currency?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string | null;
  created_at: string;
  sender_name?: string | null;
  sender_number?: string | null;
  note?: string | null;
  receipt_image?: string | null;
  payment_method_id?: string | null;
  profiles?: {
    id?: string;
    email?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  payment_method?: {
    id?: string | null;
    name?: string | null;
    account_name?: string | null;
    account_number?: string | null;
    logo_url?: string | null;
    qr_image?: string | null;
    instructions?: string | null;
  } | null;
};

const isLikelyUrl = (v?: string | null) =>
  !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  if (isLikelyUrl(avatarUrl)) return avatarUrl;

  const pub = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarUrl)?.data?.publicUrl;
  return pub || null;
};

const initialsFromName = (name?: string | null) => {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(' ').filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

const formatIraqTime = (value?: string | null) => {
  if (!value) return 'N/A';

  const d = new Date(value);

  return d.toLocaleString(undefined, {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatSEK = (value?: number | string | null) => {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString('de-DE');
};

const getStatusMeta = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'approved':
      return {
        label: 'APPROVED',
        color: UI.green,
        bg: UI.greenSoft,
        icon: <CheckCircle2 size={14} color={UI.green} />,
      };
    case 'rejected':
      return {
        label: 'REJECTED',
        color: UI.red,
        bg: UI.redSoft,
        icon: <XCircle size={14} color={UI.red} />,
      };
    default:
      return {
        label: 'PENDING',
        color: UI.amber,
        bg: UI.amberSoft,
        icon: <Clock3 size={14} color={UI.amber} />,
      };
  }
};

export default function WithdrawalsAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [selectedRejectId, setSelectedRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const withdrawalsQuery = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdraw_orders')
        .select(`
          id,
          user_id,
          amount,
          currency,
          status,
          reject_reason,
          created_at,
          sender_name,
          sender_number,
          note,
          receipt_image,
          payment_method_id,
          profiles!user_id(
            id,
            email,
            full_name,
            avatar_url,
            city,
            country
          ),
          payment_method:payment_methods(
            id,
            name,
            account_name,
            account_number,
            logo_url,
            qr_image,
            instructions
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as WithdrawAdminItem[];
    },
    enabled: isAdmin,
  });

  const counts = useMemo(() => {
    const list = withdrawalsQuery.data || [];
    return {
      all: list.length,
      pending: list.filter((x) => x.status === 'pending').length,
      approved: list.filter((x) => x.status === 'approved').length,
      rejected: list.filter((x) => x.status === 'rejected').length,
    };
  }, [withdrawalsQuery.data]);

  const sendWithdrawStatusEmail = async (
    order: WithdrawAdminItem,
    status: 'approved' | 'rejected' | 'pending',
    reason?: string
  ) => {
    if (!order?.profiles?.email) {
      return { ok: false, message: 'User email not found' };
    }

    try {
      const supabaseUrl = (supabase as any)?.supabaseUrl;
      const supabaseKey = (supabase as any)?.supabaseKey;

      if (!supabaseUrl || !supabaseKey) {
        return { ok: false, message: 'Supabase URL or anon key not found on client' };
      }

      const fnUrl = `${supabaseUrl}/functions/v1/send-withdraw-status-email`;

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: order.profiles.email,
          customer_name: order.profiles.full_name || 'User',
          amount_iqd: Number(order.amount || 0),
          payment_method: order.payment_method?.name || '',
          order_id: order.id,
          status,
          reject_reason: reason || '',
        }),
      });

      const rawText = await res.text();
      let parsed: any = null;

      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsed = rawText;
      }

      if (!res.ok) {
        return {
          ok: false,
          message:
            parsed?.error?.message ||
            parsed?.error ||
            parsed?.message ||
            rawText ||
            `Function failed with status ${res.status}`,
          data: parsed,
        };
      }

      return {
        ok: true,
        data: parsed,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || 'Unexpected function error',
      };
    }
  };

  const sendWithdrawStatusNotification = async (
    order: WithdrawAdminItem,
    status: 'approved' | 'rejected' | 'pending',
    reason?: string
  ) => {
    const fullName = order.profiles?.full_name || 'User';
    const email = order.profiles?.email || '';
    const amountText = `${formatSEK(order.amount)} ${order.currency || 'SEK'}`;
    const paymentMethod = order.payment_method?.name || 'Withdrawal Method';

    let title = 'Withdrawal Update';
    let body = `Your withdrawal request of ${amountText} has been updated.`;

    if (status === 'approved') {
      title = 'Withdrawal Approved';
      body = `Your withdrawal request of ${amountText} via ${paymentMethod} has been approved.`;
    } else if (status === 'rejected') {
      title = 'Withdrawal Rejected';
      body = reason?.trim()
        ? `Your withdrawal request of ${amountText} was rejected. Reason: ${reason.trim()}`
        : `Your withdrawal request of ${amountText} was rejected.`;
    } else if (status === 'pending') {
      title = 'Withdrawal Pending';
      body = `Your withdrawal request of ${amountText} is now pending review.`;
    }

    const payload = {
      user_id: order.user_id,
      target_user_id: order.user_id,
      recipient_user_id: order.user_id,
      profile_id: order.user_id,

      email: email || undefined,
      recipient_email: email || undefined,

      title,
      body,
      message: body,

      type: 'withdraw_order',
      notification_type: 'withdraw_order',
      category: 'withdraw',
      action: status,
      status,
      order_status: status,

      order_id: order.id,
      amount: Number(order.amount || 0),
      currency: order.currency || 'SEK',
      payment_method: paymentMethod,
      reject_reason: reason?.trim() || null,
      sender_name: order.sender_name || null,
      sender_number: order.sender_number || null,
      note: order.note || null,
      receipt_image: order.receipt_image || null,

      full_name: fullName,
      screen: 'admin-withdrawals',
      source: 'admin',
      created_by: user?.id || null,

      data: {
        user_id: order.user_id,
        email: email || null,
        full_name: fullName,
        order_id: order.id,
        status,
        order_status: status,
        title,
        body,
        amount: Number(order.amount || 0),
        currency: order.currency || 'SEK',
        payment_method: paymentMethod,
        reject_reason: reason?.trim() || null,
        sender_name: order.sender_name || null,
        sender_number: order.sender_number || null,
        note: order.note || null,
        receipt_image: order.receipt_image || null,
        screen: 'admin-withdrawals',
      },
    };

    const { data, error } = await supabase.functions.invoke(NOTIFICATION_FUNCTION, {
      body: payload,
    });

    if (error) throw error;
    return data;
  };

  const updateWithdrawMutation = useMutation({
    mutationFn: async ({
      order,
      status,
      reject_reason,
    }: {
      order: WithdrawAdminItem;
      status: 'approved' | 'rejected' | 'pending';
      reject_reason?: string | null;
    }) => {
      let emailResult:
        | { ok: boolean; message?: string; data?: any }
        | undefined;

      let notificationResult:
        | { ok: boolean; message?: string; data?: any }
        | undefined;

      if (status === 'approved') {
        const { error } = await supabase.rpc('admin_approve_withdraw', {
          p_withdraw_id: order.id,
        });

        if (error) throw error;

        emailResult = await sendWithdrawStatusEmail(order, 'approved');

        try {
          const notificationData = await sendWithdrawStatusNotification(order, 'approved');
          notificationResult = { ok: true, data: notificationData };
        } catch (err: any) {
          notificationResult = {
            ok: false,
            message: err?.message || 'Notification function failed',
          };
        }

        return { status, emailResult, notificationResult };
      }

      if (status === 'rejected') {
        const reason = reject_reason?.trim() || 'Rejected by admin';

        const { error } = await supabase.rpc('admin_reject_withdraw', {
          p_withdraw_id: order.id,
          p_reason: reason,
        });

        if (error) throw error;

        emailResult = await sendWithdrawStatusEmail(order, 'rejected', reason);

        try {
          const notificationData = await sendWithdrawStatusNotification(order, 'rejected', reason);
          notificationResult = { ok: true, data: notificationData };
        } catch (err: any) {
          notificationResult = {
            ok: false,
            message: err?.message || 'Notification function failed',
          };
        }

        return { status, emailResult, notificationResult };
      }

      const { error } = await supabase
        .from('withdraw_orders')
        .update({
          status: 'pending',
          reject_reason: null,
        })
        .eq('id', order.id);

      if (error) throw error;

      try {
        const notificationData = await sendWithdrawStatusNotification(order, 'pending');
        notificationResult = { ok: true, data: notificationData };
      } catch (err: any) {
        notificationResult = {
          ok: false,
          message: err?.message || 'Notification function failed',
        };
      }

      return { status, emailResult, notificationResult };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['withdraw_orders'] });

      Keyboard.dismiss();
      setSelectedRejectId(null);
      setRejectReason('');

      const emailFailed = result?.emailResult && !result.emailResult.ok;
      const notificationFailed = result?.notificationResult && !result.notificationResult.ok;

      if (emailFailed && notificationFailed) {
        Alert.alert(
          'Updated, but email and notification failed',
          `${result.emailResult?.message || 'Email was not sent.'}\n\n${
            result.notificationResult?.message || 'Notification was not sent.'
          }`
        );
        return;
      }

      if (emailFailed) {
        Alert.alert(
          'Updated, but email failed',
          result.emailResult?.message || 'Withdrawal updated, but email was not sent.'
        );
        return;
      }

      if (notificationFailed) {
        if (result?.status === 'approved') {
          Alert.alert(
            'Approved, but notification failed',
            result.notificationResult?.message || 'Withdrawal approved, but notification was not sent.'
          );
          return;
        }

        if (result?.status === 'rejected') {
          Alert.alert(
            'Rejected, but notification failed',
            result.notificationResult?.message || 'Withdrawal rejected, but notification was not sent.'
          );
          return;
        }

        Alert.alert(
          'Updated, but notification failed',
          result.notificationResult?.message || 'Withdrawal updated, but notification was not sent.'
        );
        return;
      }

      if (result?.status === 'approved') {
        Alert.alert('Success', 'Withdrawal approved, wallet updated, and notification sent');
        return;
      }

      if (result?.status === 'rejected') {
        Alert.alert('Success', 'Withdrawal rejected and notification sent successfully');
        return;
      }

      Alert.alert('Success', `Withdrawal ${result?.status || ''} updated and notification sent`);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Something went wrong');
    },
  });

  const pendingActionId =
    updateWithdrawMutation.variables?.order?.id && updateWithdrawMutation.isPending
      ? updateWithdrawMutation.variables.order.id
      : null;

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedWrap}>
          <CircleAlert size={28} color={UI.red} />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSub}>This page is only for admin.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeftBtn}
          onPress={() => router.push('/admin')}
          activeOpacity={0.9}
        >
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Withdrawals</Text>
          <Text style={styles.headerSub}>Manage all withdrawal requests</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => signOut()}
          activeOpacity={0.9}
        >
          <LogOut size={16} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={withdrawalsQuery.isRefetching}
            onRefresh={() => withdrawalsQuery.refetch()}
            tintColor={UI.blue}
            colors={[UI.blue]}
          />
        }
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.all}</Text>
            <Text style={styles.statLabel}>All</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: UI.amber }]}>{counts.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: UI.green }]}>{counts.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: UI.red }]}>{counts.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {withdrawalsQuery.isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={UI.blue} />
          </View>
        ) : withdrawalsQuery.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {(withdrawalsQuery.error as any)?.message || 'Failed to load withdrawals'}
            </Text>
          </View>
        ) : !withdrawalsQuery.data || withdrawalsQuery.data.length === 0 ? (
          <View style={styles.emptyBox}>
            <Receipt size={28} color={UI.text3} />
            <Text style={styles.emptyTitle}>No withdrawal requests</Text>
            <Text style={styles.emptySub}>طلبات السحب ستظهر هنا</Text>
          </View>
        ) : (
          withdrawalsQuery.data.map((order) => {
            const p = order.profiles || {};
            const avatar = getAvatarUrl(p.avatar_url);
            const statusMeta = getStatusMeta(order.status);
            const isUpdatingThis = pendingActionId === order.id;

            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.topRow}>
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
                      <Text style={styles.cardTitle}>{p.full_name || 'Unknown User'}</Text>
                      <View style={styles.inlineIconRow}>
                        <Mail size={13} color={UI.text2} />
                        <Text style={styles.cardSubtitle}>{p.email || 'No email'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                    {statusMeta.icon}
                    <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                      {statusMeta.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoMiniCard}>
                    <Text style={styles.infoMiniLabel}>Amount</Text>
                    <Text style={styles.infoMiniValue}>
                      {formatSEK(order.amount)} {order.currency || 'SEK'}
                    </Text>
                  </View>

                  <View style={styles.infoMiniCard}>
                    <Text style={styles.infoMiniLabel}>Date</Text>
                    <Text style={styles.infoMiniValue}>{formatIraqTime(order.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <User size={15} color={UI.blue} />
                    <Text style={styles.detailLabel}>Receive Name</Text>
                  </View>
                  <Text style={styles.detailValue}>{order.sender_name || '-'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Phone size={15} color={UI.blue} />
                    <Text style={styles.detailLabel}>Receive Number</Text>
                  </View>
                  <Text style={styles.detailValue}>{order.sender_number || '-'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Landmark size={15} color={UI.blue} />
                    <Text style={styles.detailLabel}>Payment Method</Text>
                  </View>
                  <Text style={styles.detailValue}>{order.payment_method?.name || '-'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Wallet size={15} color={UI.blue} />
                    <Text style={styles.detailLabel}>Bank / Account No.</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {order.payment_method?.account_number || '-'}
                  </Text>
                </View>

                {!!order.note ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>User Note</Text>
                    <Text style={styles.noteText}>{order.note}</Text>
                  </View>
                ) : null}

                {!!order.receipt_image ? (
                  <View style={styles.imageSection}>
                    <Text style={styles.sectionSmallTitle}>QR Code Uploaded</Text>

                    <TouchableOpacity
                      style={styles.receiptWrap}
                      activeOpacity={0.92}
                      onPress={() => {
                        setViewerImage(order.receipt_image || null);
                        setViewerVisible(true);
                      }}
                    >
                      <Image
                        source={{ uri: order.receipt_image }}
                        style={styles.receiptImg}
                        resizeMode="cover"
                      />
                      <View style={styles.receiptOverlay}>
                        <Eye size={16} color="#fff" />
                        <Text style={styles.receiptOverlayText}>View Full Screen</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.noImageBox}>
                    <ImageIcon size={18} color={UI.text3} />
                    <Text style={styles.noImageText}>No QR code uploaded</Text>
                  </View>
                )}

                {order.status === 'rejected' && !!order.reject_reason ? (
                  <View style={styles.rejectReasonBox}>
                    <Text style={styles.rejectReasonTitle}>Reject Reason</Text>
                    <Text style={styles.rejectReasonText}>{order.reject_reason}</Text>
                  </View>
                ) : null}

                <View style={styles.actionsWrap}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.pendingBtn]}
                    activeOpacity={0.9}
                    disabled={isUpdatingThis}
                    onPress={() => {
                      Keyboard.dismiss();
                      updateWithdrawMutation.mutate({
                        order,
                        status: 'pending',
                      });
                    }}
                  >
                    {isUpdatingThis && updateWithdrawMutation.variables?.status === 'pending' ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Clock3 size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Pending</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    activeOpacity={0.9}
                    disabled={isUpdatingThis}
                    onPress={() => {
                      Keyboard.dismiss();
                      updateWithdrawMutation.mutate({
                        order,
                        status: 'approved',
                      });
                    }}
                  >
                    {isUpdatingThis && updateWithdrawMutation.variables?.status === 'approved' ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    activeOpacity={0.9}
                    disabled={isUpdatingThis}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSelectedRejectId(order.id);
                      setRejectReason(order.reject_reason || '');
                    }}
                  >
                    <XCircle size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!selectedRejectId}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setSelectedRejectId(null);
          setRejectReason('');
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => Keyboard.dismiss()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.rejectModal} onPress={() => {}}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.rejectModalScroll}
              >
                <Text style={styles.rejectModalTitle}>Reject withdrawal</Text>
                <Text style={styles.rejectModalSub}>
                  Write reason for user email and admin record
                </Text>

                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Write reject reason..."
                  placeholderTextColor={UI.text3}
                  multiline
                  textAlignVertical="top"
                  style={styles.rejectInput}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                />

                <View style={styles.rejectModalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCancelBtn]}
                    activeOpacity={0.9}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSelectedRejectId(null);
                      setRejectReason('');
                    }}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalRejectBtn]}
                    activeOpacity={0.9}
                    disabled={updateWithdrawMutation.isPending}
                    onPress={() => {
                      Keyboard.dismiss();
                      const order = withdrawalsQuery.data?.find((x) => x.id === selectedRejectId);
                      if (!order) return;

                      updateWithdrawMutation.mutate({
                        order,
                        status: 'rejected',
                        reject_reason: rejectReason,
                      });
                    }}
                  >
                    {updateWithdrawMutation.isPending &&
                    updateWithdrawMutation.variables?.status === 'rejected' ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalRejectBtnText}>Confirm Reject</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerVisible(false)}
            activeOpacity={0.9}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewerBackdrop}
            activeOpacity={1}
            onPress={() => setViewerVisible(false)}
          >
            {viewerImage ? (
              <Image source={{ uri: viewerImage }} style={styles.viewerImage} resizeMode="contain" />
            ) : null}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: UI.card,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },

  headerLeftBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  headerSub: {
    fontSize: 12,
    color: UI.text2,
    marginTop: 2,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.red,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },

  logoutButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '800',
    fontSize: 12,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 14,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
  },

  loaderWrap: {
    paddingVertical: 40,
  },

  errorBox: {
    backgroundColor: UI.redSoft,
    borderRadius: 16,
    padding: 14,
  },

  errorText: {
    color: UI.red,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyBox: {
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 34,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
  },

  emptySub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
  },

  card: {
    backgroundColor: UI.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },

  userHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: UI.cardSoft,
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
    fontSize: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
  },

  inlineIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },

  cardSubtitle: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusBadgeText: {
    fontWeight: '900',
    fontSize: 11,
  },

  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  infoMiniCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#FBFDFF',
    borderRadius: 16,
    padding: 12,
  },

  infoMiniLabel: {
    fontSize: 11,
    color: UI.text2,
    fontWeight: '800',
  },

  infoMiniValue: {
    marginTop: 4,
    fontSize: 13,
    color: UI.text,
    fontWeight: '900',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },

  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  detailLabel: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '800',
  },

  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900',
    color: UI.text,
  },

  noteBox: {
    marginTop: 12,
    backgroundColor: UI.blueSoft,
    borderRadius: 16,
    padding: 12,
  },

  noteTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.blue,
    marginBottom: 4,
  },

  noteText: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text,
    lineHeight: 18,
  },

  imageSection: {
    marginTop: 12,
  },

  sectionSmallTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
  },

  receiptWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
  },

  receiptImg: {
    width: '100%',
    height: 220,
    backgroundColor: '#E5E7EB',
  },

  receiptOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  receiptOverlayText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  noImageBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: UI.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.cardSoft,
  },

  noImageText: {
    color: UI.text2,
    fontWeight: '700',
    fontSize: 12,
  },

  rejectReasonBox: {
    marginTop: 12,
    backgroundColor: UI.redSoft,
    borderRadius: 16,
    padding: 12,
  },

  rejectReasonTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.red,
    marginBottom: 4,
  },

  rejectReasonText: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.red,
    lineHeight: 18,
  },

  actionsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  pendingBtn: {
    backgroundColor: UI.amber,
  },

  approveBtn: {
    backgroundColor: UI.green,
  },

  rejectBtn: {
    backgroundColor: UI.red,
  },

  actionBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.50)',
    justifyContent: 'flex-end',
  },

  modalKeyboardWrap: {
    width: '100%',
    justifyContent: 'flex-end',
  },

  rejectModal: {
    backgroundColor: UI.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 28,
    maxHeight: '86%',
  },

  rejectModalScroll: {
    paddingBottom: 6,
  },

  rejectModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  rejectModalSub: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },

  rejectInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '700',
    color: UI.text,
    backgroundColor: '#F8FAFC',
  },

  rejectModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  modalBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelBtn: {
    backgroundColor: UI.cardSoft,
  },

  modalCancelBtnText: {
    color: UI.text,
    fontWeight: '900',
  },

  modalRejectBtn: {
    backgroundColor: UI.red,
  },

  modalRejectBtnText: {
    color: '#fff',
    fontWeight: '900',
  },

  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.96)',
  },

  viewerClose: {
    position: 'absolute',
    top: 58,
    right: 18,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewerBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 40,
  },

  viewerImage: {
    width: '100%',
    height: '82%',
  },

  accessDeniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  accessDeniedTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  accessDeniedSub: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700',
  },
});
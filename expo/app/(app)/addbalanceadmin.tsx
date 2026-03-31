import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
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
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  CheckCircle2,
  UserRound,
  BadgeDollarSign,
  Delete,
  ArrowLeft,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const AVATAR_BUCKET = 'avatars';
const NOTIFICATION_FUNCTION = 'send-notification';

const UI = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',
  border2: '#DCEBFF',

  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  green: '#16A34A',
  greenSoft: '#DCFCE7',

  red: '#DC2626',
  redSoft: '#FEE2E2',

  amber: '#F59E0B',
  amberSoft: '#FEF3C7',

  white: '#FFFFFF',
  shadow: '#7DA8E6',
};

const SHADOWS = {
  card: {
    shadowColor: UI.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: UI.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  city: string;
  country: string;
  avatar_url: string | null;
  created_at: string;
  balance: number;
};

const isLikelyUrl = (v?: string | null) =>
  !!v && (String(v).startsWith('http://') || String(v).startsWith('https://'));

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
  const n = String(name || '').trim();
  if (!n) return '?';
  const parts = n.split(' ').filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (a + b).toUpperCase() || '?';
};

const formatIQD = (value?: number | null) => {
  const num = Number(value || 0);
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatIQDLabel = (value?: number | null) => `${formatIQD(value)} IQD`;

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
    });
  } catch {
    return d.toLocaleString();
  }
};

const normalizeDigits = (value: string) => value.replace(/[^\d]/g, '');

export default function AddBalanceAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const [search, setSearch] = useState('');
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedCurrentBalance, setSelectedCurrentBalance] = useState(0);

  const [amountToAdd, setAmountToAdd] = useState('');
  const [noteToAdd, setNoteToAdd] = useState('');

  const [pinValue, setPinValue] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pinUnlocked) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [pinUnlocked, fadeAnim]);

  const adminProfileQuery = useQuery({
    queryKey: ['admin-profile-pin', user?.id],
    enabled: !!user?.id && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, admin_pin_code')
        .eq('id', user!.id)
        .single();

      if (error) throw new Error(error.message || 'Failed to load admin profile');

      return data as {
        id: string;
        email?: string | null;
        full_name?: string | null;
        admin_pin_code?: string | null;
      };
    },
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users-add-balance-v3'],
    enabled: isAdmin && pinUnlocked,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select(`
          id,
          user_id,
          balance,
          profiles (
            id,
            email,
            full_name,
            phone,
            city,
            country,
            avatar_url,
            created_at
          )
        `);

      if (error) throw new Error(error.message || 'Failed to fetch wallets');

      const mapped: AdminUserRow[] = (data || []).map((wallet: any) => ({
        id: wallet?.profiles?.id || wallet?.user_id || '',
        email: wallet?.profiles?.email || '',
        full_name: wallet?.profiles?.full_name || '',
        phone: wallet?.profiles?.phone || '',
        city: wallet?.profiles?.city || '',
        country: wallet?.profiles?.country || '',
        avatar_url: wallet?.profiles?.avatar_url || null,
        created_at: wallet?.profiles?.created_at || new Date().toISOString(),
        balance: Number(wallet?.balance || 0),
      }));

      mapped.sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return bTime - aTime;
      });

      return mapped;
    },
  });

  const resetModalState = () => {
    Keyboard.dismiss();
    setShowAddBalanceModal(false);
    setAmountToAdd('');
    setNoteToAdd('');
    setSelectedUserId('');
    setSelectedUserEmail('');
    setSelectedUserName('');
    setSelectedCurrentBalance(0);
  };

  const sendAddBalanceNotification = async ({
    targetUserId,
    email,
    fullName,
    amount,
    oldBalance,
    newBalance,
    note,
  }: {
    targetUserId: string;
    email?: string;
    fullName?: string;
    amount: number;
    oldBalance: number;
    newBalance: number;
    note?: string;
  }) => {
    const cleanName = (fullName || '').trim() || 'User';
    const cleanEmail = (email || '').trim();

    const title = 'Balance Added';
    const body = `An amount of ${formatIQD(amount)} IQD was added to your wallet. Your new balance is ${formatIQD(newBalance)} IQD.`;

    const payload = {
      user_id: targetUserId,
      target_user_id: targetUserId,
      recipient_user_id: targetUserId,
      profile_id: targetUserId,

      email: cleanEmail || undefined,
      recipient_email: cleanEmail || undefined,

      title,
      body,
      message: body,

      type: 'admin_balance_add',
      notification_type: 'admin_balance_add',
      category: 'admin_balance',
      action: 'deposit',
      status: 'completed',

      amount_iqd: Number(amount),
      old_balance_iqd: Number(oldBalance),
      new_balance_iqd: Number(newBalance),
      note: note || null,
      admin_note: note || null,

      full_name: cleanName,
      source: 'addbalanceadmin',
      screen: 'addbalanceadmin',
      created_by: user?.id || null,

      data: {
        user_id: targetUserId,
        email: cleanEmail || null,
        full_name: cleanName,
        title,
        body,
        type: 'admin_balance_add',
        category: 'admin_balance',
        action: 'deposit',
        status: 'completed',
        amount_iqd: Number(amount),
        old_balance_iqd: Number(oldBalance),
        new_balance_iqd: Number(newBalance),
        note: note || null,
        admin_note: note || null,
        admin_email: user?.email || '',
        admin_user_id: user?.id || '',
        source: 'addbalanceadmin',
        screen: 'addbalanceadmin',
      },
    };

    const { data, error } = await supabase.functions.invoke(NOTIFICATION_FUNCTION, {
      body: payload,
    });

    if (error) throw error;
    return data;
  };

  const addBalanceMutation = useMutation({
    mutationFn: async ({
      userId,
      amount,
      note,
      selectedUserEmail,
      selectedUserName,
    }: {
      userId: string;
      amount: number;
      note: string;
      selectedUserEmail: string;
      selectedUserName: string;
    }) => {
      const trimmedNote = String(note || '').trim();

      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('user_id, balance')
        .eq('user_id', userId)
        .single();

      if (walletError) throw new Error(walletError.message || 'Failed to fetch wallet');
      if (!wallet) throw new Error('Wallet not found for this user');

      const oldBalance = Number(wallet.balance || 0);
      const finalAmount = Number(amount || 0);
      const newBalance = oldBalance + finalAmount;

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) throw new Error(updateError.message || 'Failed to update wallet');

      const txPayload = {
        user_id: userId,
        sender_id: user?.id || null,
        receiver_id: userId,
        type: 'deposit',
        direction: 'in',
        status: 'completed',
        amount: finalAmount,
        amount_iqd: finalAmount,
        fee_amount: 0,
        balance_before: oldBalance,
        balance_after: newBalance,
        description: trimmedNote || 'Add balance via Zenopay',
        reference_id: null,
        source_table: 'admin_addbalance',
        source_order_id: null,
        source_product_id: null,
        display_title: 'Add Balance via Zenopay',
        display_subtitle: 'Balance received from Zenopay',
        display_image_url: null,
        pin_code: null,
        provider_name: 'Zenopay',
        payment_method_name: 'Admin Add Balance',
        metadata: {
          type: 'admin_add_money',
          kind: 'admin_add_money',
          category: 'admin_balance',
          amount_iqd: finalAmount,
          old_balance_iqd: oldBalance,
          new_balance_iqd: newBalance,
          note: trimmedNote,
          admin_note: trimmedNote,
          admin_email: user?.email || '',
          admin_user_id: user?.id || '',
          source: 'addbalanceadmin',
          title: 'Add Balance via Zenopay',
          subtitle: 'Balance received from Zenopay',
        },
      };

      const { error: txError } = await supabase.from('transactions').insert(txPayload);

      if (txError) {
        throw new Error(txError.message || 'Wallet updated, but transaction insert failed');
      }

      let notificationSent = false;
      let notificationError = '';

      try {
        await sendAddBalanceNotification({
          targetUserId: userId,
          email: selectedUserEmail !== 'N/A' ? selectedUserEmail : '',
          fullName: selectedUserName,
          amount: finalAmount,
          oldBalance,
          newBalance,
          note: trimmedNote,
        });
        notificationSent = true;
      } catch (err: any) {
        notificationError = err?.message || 'Notification function failed';
        console.log('send-notification invoke error:', notificationError);
      }

      return {
        success: true,
        notificationSent,
        notificationError,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-add-balance-v3'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-rich-final-v5'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      resetModalState();

      if (result?.notificationSent) {
        Alert.alert('Success', 'Balance added successfully, transaction created, and notification sent.');
      } else if (result?.notificationError) {
        Alert.alert(
          'Updated',
          `Balance added successfully and transaction created, but notification failed.\n\n${result.notificationError}`
        );
      } else {
        Alert.alert('Success', 'Balance added successfully and transaction created.');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to add balance');
    },
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usersQuery.data || [];

    return (usersQuery.data || []).filter((u) => {
      return (
        String(u.full_name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.phone || '').toLowerCase().includes(q) ||
        String(u.city || '').toLowerCase().includes(q) ||
        String(u.country || '').toLowerCase().includes(q)
      );
    });
  }, [usersQuery.data, search]);

  const handlePinPress = async (digit: string) => {
    if (checkingPin) return;
    if (pinValue.length >= 4) return;

    const next = `${pinValue}${digit}`;
    setPinValue(next);

    if (next.length === 4) {
      try {
        setCheckingPin(true);

        const savedPin = String(adminProfileQuery.data?.admin_pin_code || '').trim();

        if (!savedPin) {
          setTimeout(() => {
            Alert.alert(
              'PIN not set',
              'Please create admin_pin_code in profiles and save a 4-digit PIN for this admin.'
            );
            setPinValue('');
          }, 120);
          return;
        }

        if (savedPin !== next) {
          setTimeout(() => {
            Alert.alert('Incorrect password', 'Please try again');
            setPinValue('');
          }, 120);
          return;
        }

        setTimeout(() => {
          setPinUnlocked(true);
        }, 100);
      } finally {
        setTimeout(() => {
          setCheckingPin(false);
        }, 120);
      }
    }
  };

  const handlePinDelete = () => {
    if (checkingPin) return;
    setPinValue((prev) => prev.slice(0, -1));
  };

  const openAddModal = (userProfile: AdminUserRow) => {
    Keyboard.dismiss();
    setSelectedUserId(userProfile.id);
    setSelectedUserEmail(userProfile.email || 'N/A');
    setSelectedUserName(userProfile.full_name || 'Unknown User');
    setSelectedCurrentBalance(Number(userProfile.balance || 0));
    setShowAddBalanceModal(true);
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
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

  const renderPinScreen = () => {
    const boxes = [0, 1, 2, 3];

    return (
      <SafeAreaView style={styles.pinScreen} edges={['top', 'bottom']}>
        <View style={styles.pinHeader}>
          <TouchableOpacity
            style={styles.pinBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <ArrowLeft size={22} color={UI.text2} />
          </TouchableOpacity>
        </View>

        <View style={styles.pinBody}>
          <View style={styles.zLogoWrap}>
            <Text style={styles.zLogoText}>Z</Text>
          </View>

          <Text style={styles.pinMainTitle}>Enter PIN code</Text>
          <Text style={styles.pinMainSubtitle}>Please enter your PIN code</Text>

          <View style={styles.pinBoxesRow}>
            {boxes.map((i) => {
              const filled = i < pinValue.length;
              const active = i === pinValue.length && pinValue.length < 4;

              return (
                <View
                  key={i}
                  style={[
                    styles.pinBox,
                    active && styles.pinBoxActive,
                  ]}
                >
                  {filled ? (
                    <View style={styles.pinInnerDot} />
                  ) : active ? (
                    <View style={styles.pinCursor} />
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.keypadGrid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.keypadCircle,
                  n === '8' && pinValue.length === 2 ? styles.keypadCircleAccent : null,
                ]}
                activeOpacity={0.85}
                onPress={() => handlePinPress(n)}
              >
                <Text
                  style={[
                    styles.keypadText,
                    n === '8' && pinValue.length === 2 ? styles.keypadTextAccent : null,
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.keypadCircleGhost} />

            <TouchableOpacity
              style={styles.keypadCircle}
              activeOpacity={0.85}
              onPress={() => handlePinPress('0')}
            >
              <Text style={styles.keypadText}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keypadCircle}
              activeOpacity={0.85}
              onPress={handlePinDelete}
            >
              <Delete size={20} color={UI.text2} />
            </TouchableOpacity>
          </View>

          {checkingPin ? (
            <View style={styles.pinBusyWrap}>
              <ActivityIndicator size="small" color={UI.blue} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  };

  if (!pinUnlocked) {
    return renderPinScreen();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeftBtn}
            onPress={() => router.push('/admin')}
            activeOpacity={0.85}
          >
            <Home size={18} color={UI.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Add Balance Admin</Text>
            <Text style={styles.headerSub}>Increase user wallet balance in IQD</Text>
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBanner}>
            <View style={styles.topBannerIcon}>
              <BadgeDollarSign size={22} color={UI.blueDark} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Add Balance To User</Text>
              <Text style={styles.sectionSub}>
                Search by full name, email, phone, or city — all amounts are in IQD
              </Text>
            </View>
          </View>

          <View style={styles.searchCard}>
            <View style={styles.searchLeft}>
              <Search size={16} color={UI.text2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, email, phone, city..."
                placeholderTextColor={UI.text2}
                style={styles.searchInput}
              />
            </View>

            <TouchableOpacity
              style={styles.searchClearBtn}
              onPress={() => setSearch('')}
              activeOpacity={0.85}
            >
              <Text style={styles.searchClearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {usersQuery.isLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator color={UI.blue} size="large" />
              <Text style={styles.emptyText}>Loading users...</Text>
            </View>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((userProfile) => {
              const avatar = getAvatarUrl(userProfile.avatar_url);
              const displayName = (userProfile.full_name || '').trim() || 'Unknown User';

              return (
                <View key={userProfile.id} style={styles.card}>
                  <View style={styles.userHeader}>
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

                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{displayName}</Text>
                      <Text style={styles.cardSubtitle}>{userProfile.email || 'N/A'}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => openAddModal(userProfile)}
                      activeOpacity={0.9}
                    >
                      <PlusCircle size={15} color="#fff" />
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoBox}>
                      <View style={styles.infoLabelRow}>
                        <Wallet size={14} color={UI.green} />
                        <Text style={styles.infoLabel}>Current Balance</Text>
                      </View>
                      <Text style={[styles.infoValue, { color: UI.green }]}>
                        {formatIQDLabel(userProfile.balance)}
                      </Text>
                    </View>

                    <View style={styles.infoBox}>
                      <View style={styles.infoLabelRow}>
                        <Phone size={14} color={UI.blue} />
                        <Text style={styles.infoLabel}>Phone</Text>
                      </View>
                      <Text style={styles.infoValue}>{userProfile.phone || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoBox}>
                      <View style={styles.infoLabelRow}>
                        <MapPin size={14} color={UI.blue} />
                        <Text style={styles.infoLabel}>City</Text>
                      </View>
                      <Text style={styles.infoValue}>{userProfile.city || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoBox}>
                      <View style={styles.infoLabelRow}>
                        <Mail size={14} color={UI.blue} />
                        <Text style={styles.infoLabel}>Email</Text>
                      </View>
                      <Text style={styles.infoValueSmall}>{userProfile.email || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoBoxWide}>
                      <View style={styles.infoLabelRow}>
                        <CalendarDays size={14} color={UI.blue} />
                        <Text style={styles.infoLabel}>Registered (Iraq time)</Text>
                      </View>
                      <Text style={styles.infoValueSmall}>
                        {formatIraqTime(userProfile.created_at)}
                      </Text>
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
          visible={showAddBalanceModal}
          transparent
          animationType="fade"
          onRequestClose={resetModalState}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={styles.modalKeyboardWrap}
                >
                  <View style={styles.modalContent}>
                    <View style={styles.modalTop}>
                      <View>
                        <Text style={styles.modalTitle}>Add Balance</Text>
                        <Text style={styles.modalSubtitle}>
                          Add IQD balance and optional note
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.modalCloseBtn}
                        onPress={resetModalState}
                        activeOpacity={0.85}
                      >
                        <X size={16} color={UI.text} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 4 }}
                    >
                      <View style={styles.summaryMiniCard}>
                        <View style={styles.summaryMiniRow}>
                          <UserRound size={15} color={UI.blueDark} />
                          <Text style={styles.summaryMiniText}>
                            {selectedUserName || 'Unknown User'}
                          </Text>
                        </View>

                        <View style={styles.summaryMiniRow}>
                          <Mail size={15} color={UI.text2} />
                          <Text style={styles.summaryMiniText2}>{selectedUserEmail}</Text>
                        </View>

                        <View style={styles.summaryMiniRow}>
                          <Wallet size={15} color={UI.green} />
                          <Text style={[styles.summaryMiniText2, { color: UI.green }]}>
                            Current: {formatIQDLabel(selectedCurrentBalance)}
                          </Text>
                        </View>
                      </View>

                      <TextInput
                        style={styles.modalInput}
                        placeholder="Amount (IQD)"
                        placeholderTextColor={UI.text2}
                        keyboardType="numeric"
                        returnKeyType="done"
                        value={amountToAdd}
                        onChangeText={(v) => {
                          const digits = normalizeDigits(v);
                          setAmountToAdd(digits ? formatIQD(Number(digits)) : '');
                        }}
                        onSubmitEditing={Keyboard.dismiss}
                      />

                      <TextInput
                        style={[styles.modalInput, styles.noteInput]}
                        placeholder="Note (optional)"
                        placeholderTextColor={UI.text2}
                        value={noteToAdd}
                        onChangeText={setNoteToAdd}
                        multiline
                        textAlignVertical="top"
                        returnKeyType="done"
                        blurOnSubmit
                      />
                    </ScrollView>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={styles.modalCancelBtn}
                        onPress={resetModalState}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.modalCancelText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalConfirmBtn}
                        onPress={() => {
                          Keyboard.dismiss();

                          const rawAmount = Number(normalizeDigits(amountToAdd));

                          if (!selectedUserId) {
                            Alert.alert('Error', 'Please select a user first');
                            return;
                          }

                          if (!rawAmount || rawAmount <= 0) {
                            Alert.alert('Error', 'Please enter a valid IQD amount');
                            return;
                          }

                          addBalanceMutation.mutate({
                            userId: selectedUserId,
                            amount: rawAmount,
                            note: noteToAdd,
                            selectedUserEmail,
                            selectedUserName,
                          });
                        }}
                        disabled={addBalanceMutation.isPending}
                        activeOpacity={0.9}
                      >
                        {addBalanceMutation.isPending ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <CheckCircle2 size={16} color="#fff" />
                            <Text style={styles.modalConfirmText}>Confirm Add</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  pinScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pinHeader: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 4,
  },
  pinBackBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBody: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  zLogoWrap: {
    marginTop: 6,
    marginBottom: 24,
  },
  zLogoText: {
    fontSize: 86,
    lineHeight: 90,
    fontWeight: '300',
    color: '#3047FF',
  },
  pinMainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2A2A2A',
    marginBottom: 6,
  },
  pinMainSubtitle: {
    fontSize: 14,
    color: '#8C8C8C',
    fontWeight: '600',
    marginBottom: 26,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 38,
  },
  pinBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F4F8FF',
    borderWidth: 1.5,
    borderColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxActive: {
    borderColor: '#2E6DDA',
    backgroundColor: '#FFFFFF',
  },
  pinInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E6DDA',
  },
  pinCursor: {
    width: 2.5,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#2E6DDA',
  },
  keypadGrid: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  keypadCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#F4F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  keypadCircleAccent: {
    backgroundColor: UI.blueDark,
  },
  keypadText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1F2937',
  },
  keypadTextAccent: {
    color: '#FFFFFF',
  },
  keypadCircleGhost: {
    width: 82,
    height: 82,
  },
  pinBusyWrap: {
    marginTop: 18,
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
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  topBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border2,
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
    ...SHADOWS.soft,
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
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.card,
  },

  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarWrap: {
    width: 54,
    height: 54,
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
    fontSize: 15,
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

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: UI.green,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  infoBox: {
    width: '48.5%',
    borderRadius: 16,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  infoBoxWide: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '800',
  },
  infoValue: {
    fontSize: 15,
    color: UI.text,
    fontWeight: '900',
  },
  infoValueSmall: {
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
  modalKeyboardWrap: {
    width: '100%',
    maxWidth: 430,
  },
  modalContent: {
    width: '100%',
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.card,
    maxHeight: '88%',
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
  summaryMiniCard: {
    backgroundColor: UI.blueSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border2,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  summaryMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryMiniText: {
    fontSize: 14,
    color: UI.text,
    fontWeight: '900',
  },
  summaryMiniText2: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '800',
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
  noteInput: {
    minHeight: 92,
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
    backgroundColor: UI.green,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
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
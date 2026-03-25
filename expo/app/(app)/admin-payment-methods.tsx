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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  Home,
  LogOut,
  Landmark,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  QrCode,
  CircleAlert,
  Save,
  X,
  ArrowUpDown,
  Upload,
  Wallet,
  ArrowDownToLine,
  DollarSign,
  ArrowRightLeft,
  BadgeInfo,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const PAYMENT_METHODS_BUCKET = 'payment-method-assets';

const UI = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardSoft: '#F1F5F9',
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

  amber: '#F59E0B',
  amberSoft: '#FEF3C7',

  purple: '#7C3AED',
  purpleSoft: '#EDE9FE',

  shadow: 'rgba(15, 23, 42, 0.08)',
};

type MethodType = 'withdraw' | 'deposit';

type PaymentMethodItem = {
  id: string;
  name: string;
  account_name?: string | null;
  account_number?: string | null;
  instructions?: string | null;
  qr_image?: string | null;
  logo_url?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  method_type?: MethodType | null;
  created_at?: string | null;

  exchange_rate_iqd?: number | null;
  min_amount_usd?: number | null;
  max_amount_usd?: number | null;
  address_label?: string | null;
};

const isLikelyUrl = (v?: string | null) =>
  !!v && (v.startsWith('http://') || v.startsWith('https://'));

const formatIQD = (value?: number | null) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('de-DE');
};

const formatUSD = (value?: number | null) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const looksLikeUSDT = (name: string) => {
  const v = String(name || '').toLowerCase();
  return v.includes('usdt');
};

export default function AdminPaymentMethodsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<MethodType>('withdraw');

  const [modalVisible, setModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<PaymentMethodItem | null>(null);

  const [name, setName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [methodType, setMethodType] = useState<MethodType>('withdraw');

  const [exchangeRateIqd, setExchangeRateIqd] = useState('1550');
  const [minAmountUsd, setMinAmountUsd] = useState('5');
  const [maxAmountUsd, setMaxAmountUsd] = useState('10000');
  const [addressLabel, setAddressLabel] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');
  const isUSDTForm = looksLikeUSDT(name);

  const methodsQuery = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select(`
          id,
          name,
          account_name,
          account_number,
          instructions,
          qr_image,
          logo_url,
          is_active,
          sort_order,
          method_type,
          created_at,
          exchange_rate_iqd,
          min_amount_usd,
          max_amount_usd,
          address_label
        `)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as PaymentMethodItem[];
    },
    enabled: isAdmin,
  });

  const filteredMethods = useMemo(() => {
    const all = methodsQuery.data || [];
    return all.filter((item) => (item.method_type || 'withdraw') === activeTab);
  }, [methodsQuery.data, activeTab]);

  const stats = useMemo(() => {
    const list = methodsQuery.data || [];
    const withdrawList = list.filter((x) => (x.method_type || 'withdraw') === 'withdraw');
    const depositList = list.filter((x) => (x.method_type || 'withdraw') === 'deposit');

    return {
      withdrawAll: withdrawList.length,
      depositAll: depositList.length,
      active: list.filter((x) => x.is_active).length,
      inactive: list.filter((x) => !x.is_active).length,
    };
  }, [methodsQuery.data]);

  const resetForm = () => {
    setEditingItem(null);
    setName('');
    setAccountName('');
    setAccountNumber('');
    setInstructions('');
    setLogoUrl('');
    setQrImage('');
    setSortOrder('');
    setIsActive(true);
    setMethodType(activeTab);

    setExchangeRateIqd('1550');
    setMinAmountUsd('5');
    setMaxAmountUsd('10000');
    setAddressLabel('');
  };

  const openCreateModal = () => {
    resetForm();
    setMethodType(activeTab);
    setModalVisible(true);
  };

  const openEditModal = (item: PaymentMethodItem) => {
    setEditingItem(item);
    setName(item.name || '');
    setAccountName(item.account_name || '');
    setAccountNumber(item.account_number || '');
    setInstructions(item.instructions || '');
    setLogoUrl(item.logo_url || '');
    setQrImage(item.qr_image || '');
    setSortOrder(
      item.sort_order === null || item.sort_order === undefined
        ? ''
        : String(item.sort_order)
    );
    setIsActive(!!item.is_active);
    setMethodType((item.method_type || 'withdraw') as MethodType);

    setExchangeRateIqd(
      item.exchange_rate_iqd === null || item.exchange_rate_iqd === undefined
        ? '1550'
        : String(item.exchange_rate_iqd)
    );
    setMinAmountUsd(
      item.min_amount_usd === null || item.min_amount_usd === undefined
        ? '5'
        : String(item.min_amount_usd)
    );
    setMaxAmountUsd(
      item.max_amount_usd === null || item.max_amount_usd === undefined
        ? '10000'
        : String(item.max_amount_usd)
    );
    setAddressLabel(item.address_label || '');

    setModalVisible(true);
  };

  const uploadImageToBucket = async (localUri: string, folder: 'logos' | 'qrs') => {
    const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from(PAYMENT_METHODS_BUCKET)
      .upload(fileName, decode(base64), {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(PAYMENT_METHODS_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const pickAndUploadImage = async (type: 'logo' | 'qr') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library permission.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.length) return;

      const localUri = result.assets[0].uri;

      if (type === 'logo') setUploadingLogo(true);
      else setUploadingQr(true);

      const publicUrl = await uploadImageToBucket(
        localUri,
        type === 'logo' ? 'logos' : 'qrs'
      );

      if (type === 'logo') setLogoUrl(publicUrl);
      else setQrImage(publicUrl);

      Alert.alert('Success', type === 'logo' ? 'Bank image uploaded' : 'QR image uploaded');
    } catch (error: any) {
      Alert.alert('Upload Error', error?.message || 'Failed to upload image');
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingQr(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Bank / payment method name is required');
      if (!logoUrl?.trim()) throw new Error('Bank image is required');

      if (methodType === 'deposit' && !accountName.trim()) {
        throw new Error('Account name is required for deposit');
      }

      if (methodType === 'deposit' && !accountNumber.trim()) {
        throw new Error('Account number is required for deposit');
      }

      const rateNum = Number(exchangeRateIqd || 0);
      const minUsdNum = Number(minAmountUsd || 0);
      const maxUsdNum = Number(maxAmountUsd || 0);

      if (isUSDTForm) {
        if (!rateNum || Number.isNaN(rateNum) || rateNum <= 0) {
          throw new Error('Exchange rate IQD is required for USDT');
        }
        if (!minUsdNum || Number.isNaN(minUsdNum) || minUsdNum <= 0) {
          throw new Error('Minimum USD amount is required for USDT');
        }
        if (!maxUsdNum || Number.isNaN(maxUsdNum) || maxUsdNum <= 0) {
          throw new Error('Maximum USD amount is required for USDT');
        }
        if (maxUsdNum < minUsdNum) {
          throw new Error('Maximum USD must be greater than minimum USD');
        }
      }

      const payload = {
        name: name.trim(),
        account_name: accountName.trim() || null,
        account_number: accountNumber.trim() || null,
        instructions: instructions.trim() || null,
        logo_url: logoUrl.trim() || null,
        qr_image: qrImage.trim() || null,
        sort_order: sortOrder.trim() ? Number(sortOrder) : 0,
        is_active: !!isActive,
        method_type: methodType,

        exchange_rate_iqd: isUSDTForm ? rateNum : null,
        min_amount_usd: isUSDTForm ? minUsdNum : null,
        max_amount_usd: isUSDTForm ? maxUsdNum : null,
        address_label: isUSDTForm ? (addressLabel.trim() || 'USDT TRC20 Address') : null,
      };

      if (editingItem?.id) {
        const { error } = await supabase
          .from('payment_methods')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('payment_methods').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['payment_methods', 'deposit'] });
      queryClient.invalidateQueries({ queryKey: ['payment_methods', 'withdraw'] });

      setModalVisible(false);
      resetForm();

      Alert.alert(
        'Success',
        editingItem ? 'Payment method updated' : 'Payment method created'
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to save payment method');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['payment_methods', 'deposit'] });
      queryClient.invalidateQueries({ queryKey: ['payment_methods', 'withdraw'] });
      Alert.alert('Success', 'Payment method deleted');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to delete payment method');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      nextValue,
    }: {
      id: string;
      nextValue: boolean;
    }) => {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: nextValue })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['payment_methods', 'deposit'] });
      queryClient.invalidateQueries({ queryKey: ['payment_methods', 'withdraw'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to change status');
    },
  });

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
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <Text style={styles.headerSub}>Manage Withdraw and Deposit methods</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={methodsQuery.isRefetching}
            onRefresh={() => methodsQuery.refetch()}
            tintColor={UI.blue}
            colors={[UI.blue]}
          />
        }
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.withdrawAll}</Text>
            <Text style={styles.statLabel}>Withdraw</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: UI.purple }]}>{stats.depositAll}</Text>
            <Text style={styles.statLabel}>Deposit</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: UI.green }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'withdraw' && { backgroundColor: UI.blue, borderColor: UI.blue },
            ]}
            activeOpacity={0.9}
            onPress={() => setActiveTab('withdraw')}
          >
            <ArrowDownToLine
              size={16}
              color={activeTab === 'withdraw' ? '#fff' : UI.text}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'withdraw' ? '#fff' : UI.text },
              ]}
            >
              Withdraw
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'deposit' && { backgroundColor: UI.purple, borderColor: UI.purple },
            ]}
            activeOpacity={0.9}
            onPress={() => setActiveTab('deposit')}
          >
            <Wallet size={16} color={activeTab === 'deposit' ? '#fff' : UI.text} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'deposit' ? '#fff' : UI.text },
              ]}
            >
              Deposit
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: activeTab === 'withdraw' ? UI.blue : UI.purple },
          ]}
          activeOpacity={0.92}
          onPress={openCreateModal}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>
            {activeTab === 'withdraw' ? 'Add Withdraw Bank' : 'Add Deposit Method'}
          </Text>
        </TouchableOpacity>

        {methodsQuery.isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={UI.blue} />
          </View>
        ) : methodsQuery.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {(methodsQuery.error as any)?.message || 'Failed to load payment methods'}
            </Text>
          </View>
        ) : filteredMethods.length === 0 ? (
          <View style={styles.emptyBox}>
            <Landmark size={28} color={UI.text3} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'withdraw'
                ? 'No withdraw banks'
                : 'No deposit methods'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'withdraw'
                ? 'Add bank name and bank image for withdraw page'
                : 'Add bank details and QR for deposit / receive page'}
            </Text>
          </View>
        ) : (
          filteredMethods.map((item) => {
            const itemIsUSDT = looksLikeUSDT(item.name || '');

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.cardLeft}>
                    <View style={styles.logoWrap}>
                      {isLikelyUrl(item.logo_url) ? (
                        <Image source={{ uri: item.logo_url! }} style={styles.logoImg} />
                      ) : (
                        <Landmark size={22} color={UI.blue} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.name || 'Unknown'}</Text>
                      <Text style={styles.cardSubtitle}>
                        {item.method_type === 'deposit'
                          ? item.account_name || 'No account name'
                          : 'Withdraw bank'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: item.is_active ? UI.greenSoft : UI.redSoft },
                    ]}
                  >
                    {item.is_active ? (
                      <Eye size={14} color={UI.green} />
                    ) : (
                      <EyeOff size={14} color={UI.red} />
                    )}
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: item.is_active ? UI.green : UI.red },
                      ]}
                    >
                      {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoMiniCard}>
                    <Text style={styles.infoMiniLabel}>Type</Text>
                    <Text style={styles.infoMiniValue}>
                      {(item.method_type || 'withdraw').toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.infoMiniCard}>
                    <Text style={styles.infoMiniLabel}>Sort Order</Text>
                    <Text style={styles.infoMiniValue}>
                      {item.sort_order === null || item.sort_order === undefined
                        ? '0'
                        : String(item.sort_order)}
                    </Text>
                  </View>
                </View>

                {item.method_type === 'deposit' ? (
                  <View style={styles.infoGrid}>
                    <View style={styles.infoMiniCard}>
                      <Text style={styles.infoMiniLabel}>Account Name</Text>
                      <Text style={styles.infoMiniValue}>{item.account_name || '-'}</Text>
                    </View>

                    <View style={styles.infoMiniCard}>
                      <Text style={styles.infoMiniLabel}>
                        {itemIsUSDT ? (item.address_label || 'USDT Address') : 'Account Number'}
                      </Text>
                      <Text style={styles.infoMiniValue}>{item.account_number || '-'}</Text>
                    </View>
                  </View>
                ) : null}

                {itemIsUSDT ? (
                  <>
                    <View style={styles.usdtRateBox}>
                      <View style={styles.usdtRateRow}>
                        <View style={styles.usdtChip}>
                          <DollarSign size={14} color={UI.blue} />
                          <Text style={styles.usdtChipText}>USDT TRC20</Text>
                        </View>

                        <View style={styles.usdtChip}>
                          <ArrowRightLeft size={14} color={UI.blue} />
                          <Text style={styles.usdtChipText}>
                            1 USD = {formatIQD(item.exchange_rate_iqd || 1550)} IQD
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoGrid}>
                        <View style={styles.infoMiniCard}>
                          <Text style={styles.infoMiniLabel}>Min USD</Text>
                          <Text style={styles.infoMiniValue}>
                            ${formatUSD(item.min_amount_usd || 5)}
                          </Text>
                        </View>

                        <View style={styles.infoMiniCard}>
                          <Text style={styles.infoMiniLabel}>Max USD</Text>
                          <Text style={styles.infoMiniValue}>
                            ${formatUSD(item.max_amount_usd || 10000)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                ) : null}

                {!!item.instructions ? (
                  <View
                    style={[
                      styles.noteBox,
                      {
                        backgroundColor:
                          item.method_type === 'deposit' ? UI.purpleSoft : UI.blueSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.noteTitle,
                        { color: item.method_type === 'deposit' ? UI.purple : UI.blue },
                      ]}
                    >
                      Instructions
                    </Text>
                    <Text style={styles.noteText}>{item.instructions}</Text>
                  </View>
                ) : null}

                <View style={styles.previewRow}>
                  <TouchableOpacity
                    style={styles.previewCard}
                    activeOpacity={0.92}
                    onPress={() => {
                      if (!item.logo_url) return;
                      setViewerImage(item.logo_url);
                      setViewerVisible(true);
                    }}
                  >
                    <View style={styles.previewTop}>
                      <ImageIcon size={16} color={UI.blue} />
                      <Text style={styles.previewTitle}>Bank Image</Text>
                    </View>

                    {isLikelyUrl(item.logo_url) ? (
                      <Image source={{ uri: item.logo_url! }} style={styles.previewImg} />
                    ) : (
                      <View style={styles.previewEmpty}>
                        <Text style={styles.previewEmptyText}>No Image</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {item.method_type === 'deposit' ? (
                    <TouchableOpacity
                      style={styles.previewCard}
                      activeOpacity={0.92}
                      onPress={() => {
                        if (!item.qr_image) return;
                        setViewerImage(item.qr_image);
                        setViewerVisible(true);
                      }}
                    >
                      <View style={styles.previewTop}>
                        <QrCode size={16} color={UI.green} />
                        <Text style={styles.previewTitle}>QR Image</Text>
                      </View>

                      {isLikelyUrl(item.qr_image) ? (
                        <Image source={{ uri: item.qr_image! }} style={styles.previewImg} />
                      ) : (
                        <View style={styles.previewEmpty}>
                          <Text style={styles.previewEmptyText}>No QR</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.actionsWrap}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.toggleBtn]}
                    activeOpacity={0.9}
                    onPress={() =>
                      toggleActiveMutation.mutate({
                        id: item.id,
                        nextValue: !item.is_active,
                      })
                    }
                  >
                    {item.is_active ? (
                      <EyeOff size={16} color="#fff" />
                    ) : (
                      <Eye size={16} color="#fff" />
                    )}
                    <Text style={styles.actionBtnText}>
                      {item.is_active ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    activeOpacity={0.9}
                    onPress={() => openEditModal(item)}
                  >
                    <Pencil size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    activeOpacity={0.9}
                    onPress={() => {
                      Alert.alert('Delete', `Delete "${item.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteMutation.mutate(item.id),
                        },
                      ]);
                    }}
                  >
                    <Trash2 size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <View style={styles.modalHead}>
              <Text style={styles.formTitle}>
                {editingItem
                  ? 'Edit Payment Method'
                  : methodType === 'withdraw'
                  ? 'Add Withdraw Bank'
                  : 'Add Deposit Method'}
              </Text>

              <TouchableOpacity
                style={styles.closeBtn}
                activeOpacity={0.9}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X size={18} color={UI.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Section Type</Text>
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    methodType === 'withdraw' && styles.segmentBtnActiveBlue,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setMethodType('withdraw')}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      methodType === 'withdraw' && styles.segmentBtnTextActive,
                    ]}
                  >
                    Withdraw
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    methodType === 'deposit' && styles.segmentBtnActivePurple,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setMethodType('deposit')}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      methodType === 'deposit' && styles.segmentBtnTextActive,
                    ]}
                  >
                    Deposit
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Bank / Method Name</Text>
              <TextInput
                style={styles.input}
                placeholder="FIB / FastPay / Zain Cash / USDT TRC20"
                placeholderTextColor={UI.text3}
                value={name}
                onChangeText={setName}
              />

              {methodType === 'deposit' ? (
                <>
                  <Text style={styles.label}>Account Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="USDT / ZenoPay"
                    placeholderTextColor={UI.text3}
                    value={accountName}
                    onChangeText={setAccountName}
                  />

                  <Text style={styles.label}>
                    {isUSDTForm ? (addressLabel || 'USDT TRC20 Address') : 'Account Number'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      isUSDTForm
                        ? 'TX5rcy8dZJ259igNNebcyyaVn7hWLkjxzY'
                        : '0770 000 0000'
                    }
                    placeholderTextColor={UI.text3}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                  />

                  <Text style={styles.label}>Instructions</Text>
                  <TextInput
                    style={[styles.input, styles.bigInput]}
                    placeholder="Write deposit instructions..."
                    placeholderTextColor={UI.text3}
                    value={instructions}
                    onChangeText={setInstructions}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Withdraw Note / Instructions</Text>
                  <TextInput
                    style={[styles.input, styles.bigInput]}
                    placeholder="Optional note for withdraw page..."
                    placeholderTextColor={UI.text3}
                    value={instructions}
                    onChangeText={setInstructions}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              )}

              {isUSDTForm ? (
                <View style={styles.usdtFormBox}>
                  <View style={styles.usdtFormTitleRow}>
                    <BadgeInfo size={16} color={UI.blue} />
                    <Text style={styles.usdtFormTitle}>USDT Rate Settings</Text>
                  </View>

                  <Text style={styles.helperText}>
                    Example: if 100 USD = 155,000 IQD, enter rate as 1550
                  </Text>

                  <Text style={styles.label}>Address Label</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="USDT TRC20 Address"
                    placeholderTextColor={UI.text3}
                    value={addressLabel}
                    onChangeText={setAddressLabel}
                  />

                  <Text style={styles.label}>Exchange Rate (IQD per 1 USD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1550"
                    placeholderTextColor={UI.text3}
                    value={exchangeRateIqd}
                    onChangeText={setExchangeRateIqd}
                    keyboardType="decimal-pad"
                  />

                  <View style={styles.infoGrid}>
                    <View style={styles.infoMiniCard}>
                      <Text style={styles.infoMiniLabel}>Preview</Text>
                      <Text style={styles.infoMiniValue}>
                        100 USD = {formatIQD(Number(exchangeRateIqd || 0) * 100)} IQD
                      </Text>
                    </View>

                    <View style={styles.infoMiniCard}>
                      <Text style={styles.infoMiniLabel}>1 USD</Text>
                      <Text style={styles.infoMiniValue}>
                        {formatIQD(Number(exchangeRateIqd || 0))} IQD
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.flex1}>
                      <Text style={styles.label}>Minimum USD</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="5"
                        placeholderTextColor={UI.text3}
                        value={minAmountUsd}
                        onChangeText={setMinAmountUsd}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.flex1}>
                      <Text style={styles.label}>Maximum USD</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="10000"
                        placeholderTextColor={UI.text3}
                        value={maxAmountUsd}
                        onChangeText={setMaxAmountUsd}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              <Text style={styles.label}>Bank Image</Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                activeOpacity={0.92}
                disabled={uploadingLogo}
                onPress={() => pickAndUploadImage('logo')}
              >
                {uploadingLogo ? (
                  <ActivityIndicator color={UI.blue} />
                ) : (
                  <>
                    <Upload size={16} color={UI.blue} />
                    <Text style={styles.uploadBtnText}>Upload Bank Image</Text>
                  </>
                )}
              </TouchableOpacity>

              {isLikelyUrl(logoUrl) ? (
                <Image source={{ uri: logoUrl }} style={styles.uploadPreview} />
              ) : null}

              {methodType === 'deposit' ? (
                <>
                  <Text style={styles.label}>QR Image</Text>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    activeOpacity={0.92}
                    disabled={uploadingQr}
                    onPress={() => pickAndUploadImage('qr')}
                  >
                    {uploadingQr ? (
                      <ActivityIndicator color={UI.purple} />
                    ) : (
                      <>
                        <Upload size={16} color={UI.purple} />
                        <Text style={[styles.uploadBtnText, { color: UI.purple }]}>
                          Upload QR Image
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {isLikelyUrl(qrImage) ? (
                    <Image source={{ uri: qrImage }} style={styles.uploadPreview} />
                  ) : null}
                </>
              ) : null}

              <Text style={styles.label}>Sort Order</Text>
              <View style={styles.sortWrap}>
                <ArrowUpDown size={16} color={UI.blue} />
                <TextInput
                  style={styles.sortInput}
                  placeholder="0"
                  placeholderTextColor={UI.text3}
                  value={sortOrder}
                  onChangeText={setSortOrder}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  {methodType === 'withdraw'
                    ? 'Active on withdraw page'
                    : 'Active on deposit page'}
                </Text>
                <Switch value={isActive} onValueChange={setIsActive} />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: methodType === 'withdraw' ? UI.blue : UI.purple },
                ]}
                activeOpacity={0.92}
                disabled={saveMutation.isPending}
                onPress={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Save size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>
                      {editingItem ? 'Update Method' : 'Create Method'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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

function decode(base64: string) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = [];

  for (
    let bc = 0, bs: any, buffer: any, idx = 0;
    (buffer = base64.charAt(idx++));
    ~buffer &&
    ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? output.push(255 & (bs >> ((-2 * bc) & 6)))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }

  return new Uint8Array(output);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },

  flex1: { flex: 1 },

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

  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  tabBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  tabBtnText: {
    fontSize: 14,
    fontWeight: '900',
  },

  addBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  addBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
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
    lineHeight: 18,
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

  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: UI.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoImg: {
    width: '100%',
    height: '100%',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
  },

  cardSubtitle: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
    marginTop: 4,
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

  usdtRateBox: {
    marginTop: 2,
    marginBottom: 10,
    backgroundColor: UI.blueSoft,
    borderRadius: 18,
    padding: 12,
  },

  usdtRateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },

  usdtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },

  usdtChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.blue,
  },

  noteBox: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
  },

  noteTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },

  noteText: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text,
    lineHeight: 18,
  },

  previewRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  previewCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    backgroundColor: '#FBFDFF',
    padding: 10,
  },

  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  previewTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.text,
  },

  previewImg: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },

  previewEmpty: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: UI.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewEmptyText: {
    color: UI.text3,
    fontWeight: '800',
    fontSize: 12,
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

  toggleBtn: {
    backgroundColor: UI.amber,
  },

  editBtn: {
    backgroundColor: UI.green,
  },

  deleteBtn: {
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

  formModal: {
    backgroundColor: UI.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 28,
    maxHeight: '92%',
  },

  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.cardSoft,
  },

  label: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
    marginTop: 6,
  },

  helperText: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
    marginBottom: 8,
    lineHeight: 18,
  },

  usdtFormBox: {
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 18,
    backgroundColor: UI.blueSoft,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },

  usdtFormTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  usdtFormTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.blue,
  },

  input: {
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

  bigInput: {
    minHeight: 100,
  },

  uploadBtn: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  uploadBtnText: {
    color: UI.blue,
    fontWeight: '900',
    fontSize: 14,
  },

  uploadPreview: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginTop: 10,
    backgroundColor: '#E5E7EB',
  },

  sortWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },

  sortInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '700',
    color: UI.text,
  },

  switchRow: {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  switchLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },

  saveBtn: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  saveBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },

  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },

  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: UI.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentBtnActiveBlue: {
    backgroundColor: UI.blue,
  },

  segmentBtnActivePurple: {
    backgroundColor: UI.purple,
  },

  segmentBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
  },

  segmentBtnTextActive: {
    color: '#fff',
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
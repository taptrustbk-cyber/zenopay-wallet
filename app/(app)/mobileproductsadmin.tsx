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
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  LogOut,
  Home,
  Package,
  ShoppingBag,
  Smartphone,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Power,
  X,
  Save,
  Boxes,
  Image as ImageIcon,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

const UI = {
  bg: '#F6F8FB',
  card: '#FFFFFF',
  card2: '#F8FAFC',
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
  purple: '#7C3AED',
  purpleSoft: '#EDE9FE',
  shadow: 'rgba(15, 23, 42, 0.08)',
  black: '#0F172A',
};

type BrandKey = 'apple' | 'samsung' | 'xiaomi' | 'infinix' | 'tecno' | 'other';

type ProductForm = {
  id?: string | null;
  name: string;
  brand: BrandKey;
  image_url: string;
  description: string;
  price_iqd: string;
  monthly_price_iqd: string;
  months_count: string;
  storage: string;
  ram: string;
  color: string;
  color_hex: string;
  stock: string;
  badge: string;
  sort_order: string;
  is_new: boolean;
  is_active: boolean;
};

const emptyForm = (): ProductForm => ({
  id: null,
  name: '',
  brand: 'apple',
  image_url: '',
  description: '',
  price_iqd: '',
  monthly_price_iqd: '',
  months_count: '1',
  storage: '',
  ram: '',
  color: '',
  color_hex: '#D1D5DB',
  stock: '1',
  badge: 'new',
  sort_order: '0',
  is_new: true,
  is_active: true,
});

const formatIQD = (value: any) => {
  const n = Number(value || 0);
  return `${new Intl.NumberFormat('en-US').format(n)} د.ع`;
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

const isLikelyUrl = (v?: string | null) =>
  !!v && (v.startsWith('http://') || v.startsWith('https://'));

const initialsFromName = (name?: string | null) => {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(' ').filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (a + b).toUpperCase() || '?';
};

const productImageFromRow = (row: any) =>
  row?.image_url || row?.image || row?.photo_url || row?.thumbnail || row?.product_image || null;

const productNameFromRow = (row: any) =>
  row?.name || row?.title || row?.product_name || row?.mobile_name || row?.model || 'Unnamed Product';

const productBrandFromRow = (row: any) =>
  row?.brand || row?.company || row?.manufacturer || 'other';

const productPriceFromRow = (row: any) =>
  row?.price_iqd ?? row?.price ?? row?.sale_price ?? row?.amount ?? row?.product_price ?? 0;

const productMonthlyFromRow = (row: any) =>
  row?.monthly_price_iqd ?? row?.monthly_price ?? row?.installment_price ?? 0;

const productStockFromRow = (row: any) =>
  row?.stock ?? row?.qty ?? row?.quantity ?? row?.inventory ?? 0;

const productStatusFromRow = (row: any) => {
  if (row?.is_active === false) return 'inactive';
  return (row?.status || 'active').toString().toLowerCase();
};

const orderUserId = (row: any) => row?.user_id || row?.customer_id || null;
const orderProductId = (row: any) => row?.product_id || row?.shop_product_id || null;
const orderQty = (row: any) => row?.quantity ?? row?.qty ?? 1;
const orderTotal = (row: any) => row?.total_price_iqd ?? row?.total_price ?? row?.total ?? row?.amount ?? row?.price ?? 0;
const orderStatus = (row: any) => (row?.status || row?.payment_status || 'pending').toString().toLowerCase();
const orderPhone = (row: any) => row?.customer_phone || row?.phone || row?.mobile || 'N/A';
const orderAddress = (row: any) =>
  row?.customer_street || row?.address || row?.delivery_address || row?.location || 'N/A';
const orderCity = (row: any) => row?.customer_city || row?.city || 'N/A';
const orderNotes = (row: any) => row?.note || row?.notes || row?.description || '';
const orderCreatedAt = (row: any) => row?.created_at || row?.ordered_at || row?.date || null;
const orderProductName = (row: any) => row?.product_name || row?.mobile_name || row?.name || 'Unknown Product';
const orderType = (row: any) => (row?.order_type || '').toString().toLowerCase();

export default function MobileProductsAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const [modalOpen, setModalOpen] = useState(false);
  const [savingMode, setSavingMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<ProductForm>(emptyForm());

  const productsQuery = useQuery({
    queryKey: ['admin-mobile-shop-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('category', 'mobile')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-mobile-shop-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_orders')
        .select('*')
        .eq('order_type', 'mobile')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ['admin-mobile-order-profiles', ordersQuery.data],
    enabled: !!ordersQuery.data,
    queryFn: async () => {
      const ids = Array.from(new Set((ordersQuery.data || []).map((o: any) => orderUserId(o)).filter(Boolean)));
      if (!ids.length) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, city, country, avatar_url, phone')
        .in('id', ids);

      if (error) throw error;
      return data || [];
    },
  });

  const productsMap = useMemo(() => {
    const map: Record<string, any> = {};
    (productsQuery.data || []).forEach((p: any) => {
      map[p.id] = p;
    });
    return map;
  }, [productsQuery.data]);

  const profilesMap = useMemo(() => {
    const map: Record<string, any> = {};
    (profilesQuery.data || []).forEach((p: any) => {
      map[p.id] = p;
    });
    return map;
  }, [profilesQuery.data]);

  const productStats = useMemo(() => {
    const list = productsQuery.data || [];
    const totalProducts = list.length;
    const activeProducts = list.filter((p: any) => productStatusFromRow(p) === 'active').length;
    const outOfStock = list.filter((p: any) => Number(productStockFromRow(p)) <= 0).length;
    const totalProductsValue = list.reduce((sum: number, p: any) => {
      return sum + Number(productPriceFromRow(p) || 0) * Number(productStockFromRow(p) || 0);
    }, 0);

    return {
      totalProducts,
      activeProducts,
      outOfStock,
      totalProductsValue,
    };
  }, [productsQuery.data]);

  const orderStats = useMemo(() => {
    const list = ordersQuery.data || [];
    return {
      totalOrders: list.length,
      pendingOrders: list.filter((o: any) => orderStatus(o) === 'pending').length,
      paidOrders: list.filter((o: any) => orderStatus(o) === 'paid').length,
      totalSales: list.reduce((sum: number, o: any) => sum + Number(orderTotal(o) || 0), 0),
    };
  }, [ordersQuery.data]);

  const shopOrdersWithDetails = useMemo(() => {
    return (ordersQuery.data || []).map((order: any) => {
      const userId = orderUserId(order);
      const productId = orderProductId(order);

      return {
        ...order,
        profile: userId ? profilesMap[userId] || null : null,
        product: productId ? productsMap[productId] || null : null,
      };
    });
  }, [ordersQuery.data, profilesMap, productsMap]);

  const isLoading = productsQuery.isLoading || ordersQuery.isLoading || profilesQuery.isLoading;
  const hasError = productsQuery.error || ordersQuery.error || profilesQuery.error;

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-mobile-shop-products'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-mobile-shop-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-mobile-order-profiles'] }),
    ]);
  };

  const resetForm = () => {
    setForm(emptyForm());
    setSavingMode('create');
  };

  const openCreateModal = () => {
    resetForm();
    setSavingMode('create');
    setModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setForm({
      id: product.id,
      name: product?.name || '',
      brand: (product?.brand || 'apple') as BrandKey,
      image_url: product?.image_url || '',
      description: product?.description || '',
      price_iqd: String(product?.price_iqd ?? ''),
      monthly_price_iqd: String(product?.monthly_price_iqd ?? ''),
      months_count: String(product?.months_count ?? '1'),
      storage: product?.storage || '',
      ram: product?.ram || '',
      color: product?.color || '',
      color_hex: product?.color_hex || '#D1D5DB',
      stock: String(product?.stock ?? '1'),
      badge: product?.badge || 'new',
      sort_order: String(product?.sort_order ?? '0'),
      is_new: !!product?.is_new,
      is_active: product?.is_active !== false,
    });
    setSavingMode('edit');
    setModalOpen(true);
  };

  const saveProductMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Product name is required');
      if (!form.brand.trim()) throw new Error('Brand is required');

      const payload = {
        category: 'mobile',
        name: form.name.trim(),
        brand: form.brand,
        image_url: form.image_url.trim() || null,
        description: form.description.trim() || null,
        price_iqd: Number(form.price_iqd || 0),
        monthly_price_iqd: Number(form.monthly_price_iqd || 0),
        months_count: Number(form.months_count || 1),
        storage: form.storage.trim() || null,
        ram: form.ram.trim() || null,
        color: form.color.trim() || null,
        color_hex: form.color_hex.trim() || '#D1D5DB',
        stock: Number(form.stock || 0),
        badge: form.badge.trim() || null,
        is_new: !!form.is_new,
        is_active: !!form.is_active,
        sort_order: Number(form.sort_order || 0),
      };

      if (savingMode === 'edit' && form.id) {
        const { error } = await supabase.from('shop_products').update(payload).eq('id', form.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('shop_products').insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-mobile-shop-products'] });
      setModalOpen(false);
      resetForm();
      Alert.alert('Success', savingMode === 'edit' ? 'Mobile updated successfully' : 'Mobile added successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to save product');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('shop_products').delete().eq('id', productId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-mobile-shop-products'] });
      Alert.alert('Success', 'Product deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to delete product');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase.from('shop_products').update({ is_active: next }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-mobile-shop-products'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to update status');
    },
  });

  const confirmDelete = (product: any) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productNameFromRow(product)}" ?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProductMutation.mutate(product.id),
        },
      ]
    );
  };

  const statusBadge = (status?: string | null) => {
    const s = (status || 'pending').toLowerCase();

    if (s === 'approved' || s === 'completed' || s === 'delivered' || s === 'success' || s === 'paid') {
      return { bg: UI.greenSoft, color: UI.green, text: s.toUpperCase() };
    }

    if (s === 'rejected' || s === 'cancelled' || s === 'failed' || s === 'inactive') {
      return { bg: UI.redSoft, color: UI.red, text: s.toUpperCase() };
    }

    if (s === 'active') {
      return { bg: UI.blueSoft, color: UI.blue, text: 'ACTIVE' };
    }

    return { bg: UI.amberSoft, color: UI.amber, text: s.toUpperCase() };
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeftBtn} onPress={() => router.push('/admin')} activeOpacity={0.85}>
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Mobile Products Admin</Text>
          <Text style={styles.headerSub}>Add, edit, manage products and view mobile orders</Text>
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshAll} />}
      >
        <View style={styles.topTitleRow}>
          <View style={styles.topTitleIcon}>
            <Smartphone size={18} color={UI.blue} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Mobile Shop Dashboard</Text>
            <Text style={styles.sectionSub}>All mobile products and all user mobile orders</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={refreshAll} activeOpacity={0.85}>
            <RefreshCw size={16} color={UI.blue} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.addBtn} onPress={openCreateModal} activeOpacity={0.9}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add New Mobile</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={UI.blue} size="large" />
            <Text style={styles.emptyText}>Loading products and orders...</Text>
          </View>
        ) : hasError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Error loading mobile admin page</Text>
            <Text style={styles.errorCardText}>
              {String(
                (productsQuery.error as any)?.message ||
                  (ordersQuery.error as any)?.message ||
                  (profilesQuery.error as any)?.message ||
                  'Unknown error'
              )}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={refreshAll}>
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Products Statistics</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Products</Text>
                <Text style={styles.statValue}>{productStats.totalProducts}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Active Products</Text>
                <Text style={[styles.statValue, { color: UI.blue }]}>{productStats.activeProducts}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Out Of Stock</Text>
                <Text style={[styles.statValue, { color: UI.red }]}>{productStats.outOfStock}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Stock Value</Text>
                <Text style={[styles.statValue, { fontSize: 18 }]}>{formatIQD(productStats.totalProductsValue)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Orders Statistics</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Orders</Text>
                <Text style={styles.statValue}>{orderStats.totalOrders}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Pending Orders</Text>
                <Text style={[styles.statValue, { color: UI.amber }]}>{orderStats.pendingOrders}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Paid Orders</Text>
                <Text style={[styles.statValue, { color: UI.green }]}>{orderStats.paidOrders}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Sales</Text>
                <Text style={[styles.statValue, { fontSize: 18, color: UI.purple }]}>{formatIQD(orderStats.totalSales)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Mobile Products</Text>

            {(productsQuery.data || []).length > 0 ? (
              (productsQuery.data || []).map((product: any) => {
                const badge = statusBadge(productStatusFromRow(product));
                const image = productImageFromRow(product);
                const name = productNameFromRow(product);
                const brand = productBrandFromRow(product);
                const price = productPriceFromRow(product);
                const monthly = productMonthlyFromRow(product);
                const stock = productStockFromRow(product);
                const soldCount = (ordersQuery.data || []).filter((o: any) => orderProductId(o) === product.id).length;

                return (
                  <View key={product.id} style={styles.card}>
                    <View style={styles.productHeader}>
                      <View style={styles.productImageWrap}>
                        {isLikelyUrl(image) ? (
                          <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.productImageFallback}>
                            <ImageIcon size={22} color={UI.blue} />
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{name}</Text>
                        <Text style={styles.cardSubtitle}>{String(brand).toUpperCase()}</Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Price</Text>
                      <Text style={[styles.rowValue, { color: UI.blue }]}>{formatIQD(price)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Monthly Price</Text>
                      <Text style={[styles.rowValue, { color: UI.purple }]}>{formatIQD(monthly)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Months</Text>
                      <Text style={styles.rowValue}>{product?.months_count ?? 1}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Storage / RAM</Text>
                      <Text style={styles.rowValue}>
                        {product?.storage || 'N/A'} / {product?.ram || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Color</Text>
                      <Text style={styles.rowValue}>{product?.color || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Stock</Text>
                      <Text style={styles.rowValue}>{Number(stock || 0)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Orders Count</Text>
                      <Text style={styles.rowValue}>{soldCount}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Created</Text>
                      <Text style={styles.rowValue}>{formatIraqTime(product.created_at)}</Text>
                    </View>

                    {!!product?.description && (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteTitle}>Description</Text>
                        <Text style={styles.noteText}>{product.description}</Text>
                      </View>
                    )}

                    <View style={styles.productActionsRow}>
                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: UI.blueSoft }]}
                        onPress={() => openEditModal(product)}
                      >
                        <Pencil size={16} color={UI.blue} />
                        <Text style={[styles.smallActionText, { color: UI.blue }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: product?.is_active === false ? UI.greenSoft : UI.amberSoft }]}
                        onPress={() =>
                          toggleActiveMutation.mutate({
                            id: product.id,
                            next: product?.is_active === false,
                          })
                        }
                      >
                        <Power size={16} color={product?.is_active === false ? UI.green : UI.amber} />
                        <Text
                          style={[
                            styles.smallActionText,
                            { color: product?.is_active === false ? UI.green : UI.amber },
                          ]}
                        >
                          {product?.is_active === false ? 'Activate' : 'Disable'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: UI.redSoft }]}
                        onPress={() => confirmDelete(product)}
                      >
                        <Trash2 size={16} color={UI.red} />
                        <Text style={[styles.smallActionText, { color: UI.red }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Package size={22} color={UI.text2} />
                <Text style={styles.emptyText}>No mobile products found in shop_products table</Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>User Mobile Orders</Text>

            {shopOrdersWithDetails.length > 0 ? (
              shopOrdersWithDetails.map((order: any) => {
                if (orderType(order) && orderType(order) !== 'mobile') return null;

                const product = order.product || null;
                const profile = order.profile || null;
                const badge = statusBadge(orderStatus(order));
                const displayName = (profile?.full_name || order?.customer_full_name || '').trim() || 'Unknown Name';
                const displayEmail = profile?.email || order?.customer_email || 'N/A';
                const avatar = profile?.avatar_url;
                const productName = product ? productNameFromRow(product) : orderProductName(order);
                const total = orderTotal(order);
                const qty = orderQty(order);

                return (
                  <View key={order.id} style={styles.card}>
                    <View style={styles.userHeader}>
                      <View style={styles.avatarWrap}>
                        {isLikelyUrl(avatar) ? (
                          <Image source={{ uri: avatar }} style={styles.avatarImg} />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <Text style={styles.avatarFallbackText}>{initialsFromName(displayName)}</Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{displayName}</Text>
                        <Text style={styles.cardSubtitle}>{displayEmail}</Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Order ID</Text>
                      <Text style={styles.rowValue}>{order.id}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Product</Text>
                      <Text style={styles.rowValue}>{productName}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Brand</Text>
                      <Text style={styles.rowValue}>
                        {product?.brand || order?.product_brand || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Quantity</Text>
                      <Text style={styles.rowValue}>{qty}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Total Price</Text>
                      <Text style={[styles.rowValue, { color: UI.purple }]}>{formatIQD(total)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Phone</Text>
                      <Text style={styles.rowValue}>{orderPhone(order) || profile?.phone || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Address</Text>
                      <Text style={styles.rowValue}>{orderAddress(order)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>City</Text>
                      <Text style={styles.rowValue}>{orderCity(order) || profile?.city || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Country</Text>
                      <Text style={styles.rowValue}>{profile?.country || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Order Time</Text>
                      <Text style={styles.rowValue}>{formatIraqTime(orderCreatedAt(order))}</Text>
                    </View>

                    {!!orderNotes(order) && (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteTitle}>Notes</Text>
                        <Text style={styles.noteText}>{orderNotes(order)}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <ShoppingBag size={22} color={UI.text2} />
                <Text style={styles.emptyText}>No mobile orders found in shop_orders table</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {savingMode === 'edit' ? 'Edit Mobile Product' : 'Add New Mobile Product'}
              </Text>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalOpen(false)}>
                <X size={18} color={UI.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Mobile Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="iPhone 16 Pro Max"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Brand</Text>
              <View style={styles.brandRow}>
                {(['apple', 'samsung', 'xiaomi', 'infinix', 'tecno', 'other'] as BrandKey[]).map((brand) => {
                  const active = form.brand === brand;
                  return (
                    <TouchableOpacity
                      key={brand}
                      style={[styles.brandChip, active && styles.brandChipActive]}
                      onPress={() => setForm((p) => ({ ...p, brand }))}
                    >
                      <Text style={[styles.brandChipText, active && styles.brandChipTextActive]}>
                        {brand}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Official Image URL</Text>
              <TextInput
                style={styles.input}
                value={form.image_url}
                onChangeText={(v) => setForm((p) => ({ ...p, image_url: v }))}
                placeholder="https://..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              {!!form.image_url && isLikelyUrl(form.image_url) && (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: form.image_url }} style={styles.previewImage} resizeMode="contain" />
                </View>
              )}

              <Text style={styles.inputLabel}>Price IQD</Text>
              <TextInput
                style={styles.input}
                value={form.price_iqd}
                onChangeText={(v) => setForm((p) => ({ ...p, price_iqd: v }))}
                placeholder="189000"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Monthly Price IQD</Text>
              <TextInput
                style={styles.input}
                value={form.monthly_price_iqd}
                onChangeText={(v) => setForm((p) => ({ ...p, monthly_price_iqd: v }))}
                placeholder="189000"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Months Count</Text>
              <TextInput
                style={styles.input}
                value={form.months_count}
                onChangeText={(v) => setForm((p) => ({ ...p, months_count: v }))}
                placeholder="1"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Storage</Text>
              <TextInput
                style={styles.input}
                value={form.storage}
                onChangeText={(v) => setForm((p) => ({ ...p, storage: v }))}
                placeholder="256GB"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>RAM</Text>
              <TextInput
                style={styles.input}
                value={form.ram}
                onChangeText={(v) => setForm((p) => ({ ...p, ram: v }))}
                placeholder="8GB"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Color Name</Text>
              <TextInput
                style={styles.input}
                value={form.color}
                onChangeText={(v) => setForm((p) => ({ ...p, color: v }))}
                placeholder="Desert Titanium"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Color Hex</Text>
              <TextInput
                style={styles.input}
                value={form.color_hex}
                onChangeText={(v) => setForm((p) => ({ ...p, color_hex: v }))}
                placeholder="#B88E5A"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Stock</Text>
              <TextInput
                style={styles.input}
                value={form.stock}
                onChangeText={(v) => setForm((p) => ({ ...p, stock: v }))}
                placeholder="10"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Badge</Text>
              <TextInput
                style={styles.input}
                value={form.badge}
                onChangeText={(v) => setForm((p) => ({ ...p, badge: v }))}
                placeholder="new / special / discount / preorder"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Sort Order</Text>
              <TextInput
                style={styles.input}
                value={form.sort_order}
                onChangeText={(v) => setForm((p) => ({ ...p, sort_order: v }))}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Description / Specs</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="Write mobile details here..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              <View style={styles.boolRow}>
                <TouchableOpacity
                  style={[styles.boolChip, form.is_new && styles.boolChipActiveGreen]}
                  onPress={() => setForm((p) => ({ ...p, is_new: !p.is_new }))}
                >
                  <Text style={[styles.boolChipText, form.is_new && styles.boolChipTextActiveGreen]}>
                    {form.is_new ? 'NEW: YES' : 'NEW: NO'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boolChip, form.is_active && styles.boolChipActiveBlue]}
                  onPress={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                >
                  <Text style={[styles.boolChipText, form.is_active && styles.boolChipTextActiveBlue]}>
                    {form.is_active ? 'ACTIVE: YES' : 'ACTIVE: NO'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 10 }} />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => saveProductMutation.mutate()}
                disabled={saveProductMutation.isPending}
              >
                {saveProductMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Save size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>
                      {savingMode === 'edit' ? 'Save Changes' : 'Add Product'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 18 }} />
            </ScrollView>
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
    textAlign: 'center',
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
  },

  topTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  topTitleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionRow: {
    marginBottom: 16,
  },
  addBtn: {
    backgroundColor: UI.blue,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 10,
  },
  sectionSub: {
    fontSize: 12,
    color: UI.text2,
    marginTop: 2,
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

  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  productImageWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card2,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.blueSoft,
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
    maxWidth: '40%',
  },
  rowValue: {
    fontSize: 13,
    color: UI.text,
    fontWeight: '800',
    maxWidth: '58%',
    textAlign: 'right',
  },

  noteBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 13,
    color: UI.text2,
    lineHeight: 18,
    fontWeight: '700',
  },

  productActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  smallActionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallActionText: {
    fontWeight: '900',
    fontSize: 12,
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
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
  },

  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: UI.text2,
    fontSize: 14,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
  },
  errorCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.red,
    textAlign: 'center',
  },
  errorCardText: {
    fontSize: 13,
    color: UI.text2,
    textAlign: 'center',
    marginTop: 8,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: UI.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.text,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card2,
    paddingHorizontal: 14,
    color: UI.text,
    fontSize: 14,
  },
  textarea: {
    minHeight: 98,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  brandRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
  },
  brandChipActive: {
    backgroundColor: UI.blueSoft,
    borderColor: UI.blue,
  },
  brandChipText: {
    color: UI.text2,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  brandChipTextActive: {
    color: UI.blue,
  },

  previewWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card2,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 170,
  },

  boolRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  boolChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
  },
  boolChipActiveGreen: {
    backgroundColor: UI.greenSoft,
    borderColor: UI.green,
  },
  boolChipActiveBlue: {
    backgroundColor: UI.blueSoft,
    borderColor: UI.blue,
  },
  boolChipText: {
    color: UI.text2,
    fontWeight: '900',
    fontSize: 12,
  },
  boolChipTextActiveGreen: {
    color: UI.green,
  },
  boolChipTextActiveBlue: {
    color: UI.blue,
  },

  saveBtn: {
    marginTop: 16,
    backgroundColor: UI.blue,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});

import React, { useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  LogOut,
  Home,
  Package,
  ShoppingBag,
  Smartphone,
  RefreshCw,
  User,
  MapPin,
  CalendarDays,
  BadgeDollarSign,
  Boxes,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

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
  purple: '#7C3AED',
  purpleSoft: '#EDE9FE',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

const formatMoney = (value: any) => {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
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

const isLikelyUrl = (v?: string | null) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const initialsFromName = (name?: string | null) => {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(' ').filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (a + b).toUpperCase() || '?';
};

const productImageFromRow = (row: any) => {
  return (
    row?.image_url ||
    row?.image ||
    row?.photo_url ||
    row?.thumbnail ||
    row?.product_image ||
    null
  );
};

const productNameFromRow = (row: any) => {
  return (
    row?.name ||
    row?.title ||
    row?.product_name ||
    row?.mobile_name ||
    row?.model ||
    'Unnamed Product'
  );
};

const productBrandFromRow = (row: any) => {
  return row?.brand || row?.company || row?.manufacturer || 'N/A';
};

const productPriceFromRow = (row: any) => {
  return (
    row?.price ??
    row?.sale_price ??
    row?.amount ??
    row?.product_price ??
    0
  );
};

const productStockFromRow = (row: any) => {
  return row?.stock ?? row?.qty ?? row?.quantity ?? row?.inventory ?? 0;
};

const productStatusFromRow = (row: any) => {
  return (row?.status || row?.is_active === false ? 'inactive' : 'active')?.toString().toLowerCase();
};

const orderUserId = (row: any) => row?.user_id || row?.customer_id || null;
const orderProductId = (row: any) => row?.product_id || row?.shop_product_id || null;
const orderQty = (row: any) => row?.quantity ?? row?.qty ?? 1;
const orderTotal = (row: any) => row?.total_price ?? row?.total ?? row?.amount ?? row?.price ?? 0;
const orderStatus = (row: any) => (row?.status || 'pending').toString().toLowerCase();
const orderPhone = (row: any) => row?.phone || row?.customer_phone || row?.mobile || 'N/A';
const orderAddress = (row: any) => row?.address || row?.delivery_address || row?.location || 'N/A';
const orderNotes = (row: any) => row?.notes || row?.note || row?.description || '';
const orderCreatedAt = (row: any) => row?.created_at || row?.ordered_at || row?.date || null;

export default function MobileProductsAdminScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  const productsQuery = useQuery({
    queryKey: ['admin-shop-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-shop-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ['admin-shop-order-profiles', ordersQuery.data],
    enabled: !!ordersQuery.data,
    queryFn: async () => {
      const ids = Array.from(
        new Set((ordersQuery.data || []).map((o: any) => orderUserId(o)).filter(Boolean))
      );

      if (!ids.length) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, city, country, avatar_url')
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
      approvedOrders: list.filter((o: any) => orderStatus(o) === 'approved').length,
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

  const onRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-shop-products'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-shop-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-shop-order-profiles'] }),
    ]);
  };

  const statusBadge = (status?: string | null) => {
    const s = (status || 'pending').toLowerCase();

    if (s === 'approved' || s === 'completed' || s === 'delivered' || s === 'success') {
      return { bg: UI.greenSoft, color: UI.green, text: s.toUpperCase() };
    }

    if (s === 'rejected' || s === 'cancelled' || s === 'failed') {
      return { bg: UI.redSoft, color: UI.red, text: s.toUpperCase() };
    }

    if (s === 'active') {
      return { bg: UI.blueSoft, color: UI.blue, text: 'ACTIVE' };
    }

    if (s === 'inactive') {
      return { bg: UI.redSoft, color: UI.red, text: 'INACTIVE' };
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
          <Text style={styles.headerSub}>Products, orders and customer details</Text>
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        <View style={styles.topTitleRow}>
          <View style={styles.topTitleIcon}>
            <Smartphone size={18} color={UI.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Mobile Shop Dashboard</Text>
            <Text style={styles.sectionSub}>All products and all user orders in one page</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
            <RefreshCw size={16} color={UI.blue} />
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
            <TouchableOpacity style={styles.primaryBtn} onPress={onRefresh}>
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
                <Text style={[styles.statValue, { fontSize: 18 }]}>{formatMoney(productStats.totalProductsValue)}</Text>
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
                <Text style={styles.statLabel}>Approved Orders</Text>
                <Text style={[styles.statValue, { color: UI.green }]}>{orderStats.approvedOrders}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Sales</Text>
                <Text style={[styles.statValue, { fontSize: 18, color: UI.purple }]}>{formatMoney(orderStats.totalSales)}</Text>
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
                            <Smartphone size={22} color={UI.blue} />
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{name}</Text>
                        <Text style={styles.cardSubtitle}>{brand}</Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Product ID</Text>
                      <Text style={styles.rowValue}>{product.id}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Price</Text>
                      <Text style={[styles.rowValue, { color: UI.blue }]}>{formatMoney(price)}</Text>
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
                      <Text style={styles.rowLabel}>Created (Iraq)</Text>
                      <Text style={styles.rowValue}>{formatIraqTime(product.created_at)}</Text>
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
                const product = order.product || null;
                const profile = order.profile || null;
                const badge = statusBadge(orderStatus(order));
                const displayName = (profile?.full_name || '').trim() || 'Unknown Name';
                const displayEmail = profile?.email || 'N/A';
                const avatar = profile?.avatar_url;
                const productName = product ? productNameFromRow(product) : (order?.product_name || 'Unknown Product');
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
                      <Text style={styles.rowLabel}>Quantity</Text>
                      <Text style={styles.rowValue}>{qty}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Total Price</Text>
                      <Text style={[styles.rowValue, { color: UI.purple }]}>{formatMoney(total)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Phone</Text>
                      <Text style={styles.rowValue}>{orderPhone(order)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Address</Text>
                      <Text style={styles.rowValue}>{orderAddress(order)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>City</Text>
                      <Text style={styles.rowValue}>{profile?.city || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Country</Text>
                      <Text style={styles.rowValue}>{profile?.country || 'N/A'}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>Order Time (Iraq)</Text>
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
    width: 54,
    height: 54,
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
});

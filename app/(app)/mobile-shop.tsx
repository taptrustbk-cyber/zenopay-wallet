import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  I18nManager,
  Dimensions,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import i18n from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;
const isRTL = I18nManager.isRTL;

type BrandKey = 'all' | 'apple' | 'samsung' | 'xiaomi' | 'infinix' | 'tecno';

type MobileProduct = {
  id: string;
  brand: Exclude<BrandKey, 'all'>;
  name: string;
  slug?: string | null;
  description?: string | null;
  image_url: string | null;
  logo_url?: string | null;
  price_iqd: number | null;
  monthly_price_iqd: number | null;
  months_count: number | null;
  storage?: string | null;
  ram?: string | null;
  color?: string | null;
  color_hex?: string | null;
  stock?: number | null;
  badge?: string | null;
  is_new?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  category?: string | null;
};

type OrderForm = {
  fullName: string;
  phoneNumber: string;
  city: string;
  street: string;
  email: string;
  note: string;
  quantity: number;
};

type QuickFilterKey = 'all' | 'discount' | 'new' | 'special';

const COLORS = {
  bg: '#F7F8FC',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  yellow: '#F5C400',
  yellowSoft: '#FFF7CC',
  yellowDark: '#A16207',
  blue: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
  orange: '#EA580C',
  black: '#0F172A',
  white: '#FFFFFF',
};

const ScreenHeaderOff = () => <Stack.Screen options={{ headerShown: false }} />;

const t = (key: string, fallback: string) => {
  const value = i18n.t(key as any);
  if (!value || value === key) return fallback;
  return String(value);
};

const formatIQD = (value?: number | null) => {
  const number = Number(value || 0);
  return `${new Intl.NumberFormat('en-US').format(number)} ${t('iqdShort', 'IQD')}`;
};

const getBrandLabel = (brand: BrandKey) => {
  switch (brand) {
    case 'apple':
      return t('brandApple', 'Apple');
    case 'samsung':
      return t('brandSamsung', 'Samsung');
    case 'xiaomi':
      return t('brandXiaomi', 'Xiaomi');
    case 'infinix':
      return t('brandInfinix', 'Infinix');
    case 'tecno':
      return t('brandTecno', 'Tecno');
    default:
      return t('all', 'All');
  }
};

const getBrandIcon = (brand: BrandKey) => {
  switch (brand) {
    case 'apple':
      return 'logo-apple';
    case 'samsung':
      return 'phone-portrait-outline';
    case 'xiaomi':
      return 'hardware-chip-outline';
    case 'infinix':
      return 'flash-outline';
    case 'tecno':
      return 'diamond-outline';
    default:
      return 'grid-outline';
  }
};

const deriveBalanceFromRow = (row: any) => {
  if (!row) return 0;

  const candidates = [
    row.balance_iqd,
    row.wallet_balance_iqd,
    row.iqd_balance,
    row.balance,
    row.amount_iqd,
    row.available_balance_iqd,
  ];

  for (const value of candidates) {
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }

  return 0;
};

const deriveCityLabel = (cityName?: string | null, regionName?: string | null) => {
  return cityName || regionName || t('unknownCity', 'Unknown');
};

const FALLBACK_PRODUCTS: MobileProduct[] = [
  {
    id: 'fallback-1',
    brand: 'apple',
    name: 'iPhone 16 Pro Max',
    image_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=1200&auto=format&fit=crop',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    price_iqd: 189000,
    monthly_price_iqd: 189000,
    months_count: 1,
    storage: '256GB',
    ram: '8GB',
    color: 'Desert Titanium',
    color_hex: '#B88E5A',
    badge: 'new',
    is_new: true,
    is_active: true,
    sort_order: 1,
    category: 'mobile',
  },
  {
    id: 'fallback-2',
    brand: 'samsung',
    name: 'Galaxy S25 Ultra',
    image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1200&auto=format&fit=crop',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
    price_iqd: 179900,
    monthly_price_iqd: 179900,
    months_count: 1,
    storage: '256GB',
    ram: '12GB',
    color: 'Black',
    color_hex: '#1F2937',
    badge: 'new',
    is_new: true,
    is_active: true,
    sort_order: 2,
    category: 'mobile',
  },
  {
    id: 'fallback-3',
    brand: 'xiaomi',
    name: 'Xiaomi 14 Ultra',
    image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=1200&auto=format&fit=crop',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg',
    price_iqd: 144900,
    monthly_price_iqd: 144900,
    months_count: 1,
    storage: '512GB',
    ram: '16GB',
    color: 'Black',
    color_hex: '#111827',
    badge: 'new',
    is_new: true,
    is_active: true,
    sort_order: 3,
    category: 'mobile',
  },
];

export default function MobileShopScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedBrand, setSelectedBrand] = React.useState<BrandKey>('all');
  const [quickFilter, setQuickFilter] = React.useState<QuickFilterKey>('all');
  const [search, setSearch] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState<MobileProduct | null>(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [detectedCity, setDetectedCity] = React.useState('');
  const [locationLoading, setLocationLoading] = React.useState(false);

  const [form, setForm] = React.useState<OrderForm>({
    fullName: '',
    phoneNumber: '',
    city: '',
    street: '',
    email: '',
    note: '',
    quantity: 1,
  });

  const profileQuery = useQuery({
    queryKey: ['mobile-shop-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const walletQuery = useQuery({
    queryKey: ['mobile-shop-wallet-balance', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return 0;

      const walletRes = await supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();
      if (!walletRes.error && walletRes.data) {
        return deriveBalanceFromRow(walletRes.data);
      }

      const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!profileRes.error && profileRes.data) {
        return deriveBalanceFromRow(profileRes.data);
      }

      return 0;
    },
  });

  const productsQuery = useQuery({
    queryKey: ['mobile-shop-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('category', 'mobile')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error || !data || !data.length) {
        return FALLBACK_PRODUCTS;
      }

      return data as MobileProduct[];
    },
  });

  React.useEffect(() => {
    if (!profileQuery.data) return;

    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || profileQuery.data.full_name || '',
      phoneNumber: prev.phoneNumber || profileQuery.data.phone || '',
      city: prev.city || profileQuery.data.city || '',
      street: prev.street || profileQuery.data.street_address || '',
      email: prev.email || profileQuery.data.email || user?.email || '',
    }));
  }, [profileQuery.data, user?.email]);

  React.useEffect(() => {
    let mounted = true;

    const getCurrentCity = async () => {
      try {
        setLocationLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const reverse = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        const place = reverse?.[0];
        const cityName = deriveCityLabel(place?.city, place?.region);

        if (!mounted) return;

        if (cityName) {
          setDetectedCity(cityName);
          setForm((prev) => ({
            ...prev,
            city: prev.city || cityName,
          }));
        }
      } catch {
        // ignore location errors
      } finally {
        if (mounted) setLocationLoading(false);
      }
    };

    getCurrentCity();
    return () => {
      mounted = false;
    };
  }, []);

  const allProducts = React.useMemo(() => {
    return (productsQuery.data || FALLBACK_PRODUCTS).filter((item) => item.is_active !== false);
  }, [productsQuery.data]);

  const featuredProducts = React.useMemo(() => {
    return allProducts.slice(0, 3);
  }, [allProducts]);

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();

    return allProducts.filter((item) => {
      const brandOk = selectedBrand === 'all' ? true : item.brand === selectedBrand;

      const quickOk =
        quickFilter === 'all'
          ? true
          : quickFilter === 'new'
          ? !!item.is_new
          : quickFilter === 'discount'
          ? String(item.badge || '').toLowerCase().includes('discount') ||
            String(item.badge || '').toLowerCase().includes('offer')
          : quickFilter === 'special'
          ? String(item.badge || '').toLowerCase().includes('special') ||
            String(item.badge || '').toLowerCase().includes('preorder')
          : true;

      const text = [
        item.name,
        item.description,
        item.storage,
        item.ram,
        item.color,
        item.brand,
        item.slug,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const searchOk = !q || text.includes(q);

      return brandOk && quickOk && searchOk;
    });
  }, [allProducts, quickFilter, search, selectedBrand]);

  const cityLabel =
    form.city ||
    detectedCity ||
    profileQuery.data?.city ||
    t('locationUnavailable', 'Location');

  const walletBalance = Number(walletQuery.data || 0);
  const selectedTotalPrice = Number(selectedProduct?.price_iqd || 0) * Math.max(1, Number(form.quantity || 1));

  const refreshAll = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-products'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-wallet-balance'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const updateWalletAfterPurchase = async (newBalance: number) => {
    if (!user?.id) return;

    const walletRes = await supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();

    if (!walletRes.error && walletRes.data) {
      const updatePayload: any = {};

      if ('balance_iqd' in walletRes.data) updatePayload.balance_iqd = newBalance;
      else if ('wallet_balance_iqd' in walletRes.data) updatePayload.wallet_balance_iqd = newBalance;
      else if ('iqd_balance' in walletRes.data) updatePayload.iqd_balance = newBalance;
      else if ('balance' in walletRes.data) updatePayload.balance = newBalance;
      else updatePayload.balance_iqd = newBalance;

      const { error } = await supabase.from('wallets').update(updatePayload).eq('user_id', user.id);
      if (error) throw error;
      return;
    }

    const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

    if (!profileRes.error && profileRes.data) {
      const updatePayload: any = {};

      if ('balance_iqd' in profileRes.data) updatePayload.balance_iqd = newBalance;
      else if ('wallet_balance_iqd' in profileRes.data) updatePayload.wallet_balance_iqd = newBalance;
      else if ('iqd_balance' in profileRes.data) updatePayload.iqd_balance = newBalance;
      else if ('balance' in profileRes.data) updatePayload.balance = newBalance;
      else updatePayload.balance_iqd = newBalance;

      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);
      if (error) throw error;
      return;
    }

    throw new Error(t('walletTableNotFound', 'Wallet table not found'));
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(t('loginRequired', 'Please login first'));
      if (!selectedProduct) throw new Error(t('selectProductFirst', 'Please select a product first'));

      const requiredFields = [form.fullName, form.phoneNumber, form.city, form.street, form.email];
      const hasMissing = requiredFields.some((v) => !String(v || '').trim());
      if (hasMissing) {
        throw new Error(t('fillAllRequiredFields', 'Please fill all required fields'));
      }

      const quantity = Math.max(1, Number(form.quantity || 1));
      const unitPrice = Number(selectedProduct.price_iqd || 0);
      const totalPrice = unitPrice * quantity;
      const unitMonthly = Number(selectedProduct.monthly_price_iqd || 0);
      const totalMonthly = unitMonthly * quantity;
      const currentBalance = Number(walletQuery.data || 0);

      if (currentBalance < totalPrice) {
        throw new Error(t('insufficientBalanceDeposit', "You don't have enough balance. Please deposit balance and try again."));
      }

      if ((selectedProduct.stock || 0) <= 0 && selectedProduct.stock !== null) {
        throw new Error(t('productOutOfStock', 'This product is out of stock'));
      }

      const orderPayload: any = {
        user_id: user.id,
        product_id: selectedProduct.id,
        order_type: 'mobile',
        source_screen: 'mobile-shop',
        product_name: selectedProduct.name,
        product_brand: selectedProduct.brand,
        product_image_url: selectedProduct.image_url,
        product_logo_url: selectedProduct.logo_url || null,
        unit_price_iqd: unitPrice,
        unit_monthly_price_iqd: unitMonthly,
        months_count: Number(selectedProduct.months_count || 1),
        quantity,
        total_price_iqd: totalPrice,
        total_monthly_price_iqd: totalMonthly,
        color: selectedProduct.color || null,
        storage: selectedProduct.storage || null,
        ram: selectedProduct.ram || null,
        customer_full_name: form.fullName,
        customer_phone: form.phoneNumber,
        customer_email: form.email,
        customer_city: form.city,
        customer_street: form.street,
        note: form.note || null,
        status: 'paid',
        payment_status: 'paid',
        payment_method: 'wallet',
        admin_status: 'new',
        wallet_balance_before_iqd: currentBalance,
        wallet_balance_after_iqd: currentBalance - totalPrice,
      };

      const { error: orderError } = await supabase.from('shop_orders').insert(orderPayload);
      if (orderError) throw orderError;

      await updateWalletAfterPurchase(currentBalance - totalPrice);

      if (selectedProduct.stock !== null && selectedProduct.stock !== undefined) {
        const nextStock = Math.max(0, Number(selectedProduct.stock || 0) - quantity);
        await supabase.from('shop_products').update({ stock: nextStock }).eq('id', selectedProduct.id);
      }

      return {
        totalPrice,
        nextBalance: currentBalance - totalPrice,
      };
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-wallet-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-products'] }),
      ]);

      Alert.alert(
        t('purchaseSuccess', 'Purchase successful'),
        `${t('mobilePurchasedSuccess', 'Your mobile purchase was completed successfully and sent to admin.')}\n\n${t('paidAmount', 'Paid amount')}: ${formatIQD(result.totalPrice)}\n${t('remainingBalance', 'Remaining balance')}: ${formatIQD(result.nextBalance)}`,
        [
          {
            text: t('done', 'Done'),
            onPress: () => {
              setCheckoutOpen(false);
              setSelectedProduct(null);
              setForm((prev) => ({
                ...prev,
                note: '',
                quantity: 1,
              }));
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(t('error', 'Error'), error?.message || t('purchaseFailed', 'Purchase failed'));
    },
  });

  const openCheckout = (product: MobileProduct) => {
    setSelectedProduct(product);
    setCheckoutOpen(true);
  };

  const openPolicy = () => {
    setMenuOpen(false);
    router.push('/privacy-policy' as any);
  };

  const openTerms = () => {
    setMenuOpen(false);
    router.push('/terms-conditions' as any);
  };

  const topBar = (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => router.back()} style={styles.topIconBtn}>
        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.topTitle}>{t('zenopayMobileShop', 'Zenopay Mobile Shop')}</Text>

      <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.topMenuBtn}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#7A5B00" />
      </TouchableOpacity>
    </View>
  );

  const brandTabs: { key: BrandKey; label: string }[] = [
    { key: 'all', label: t('all', 'All') },
    { key: 'apple', label: t('brandApple', 'Apple') },
    { key: 'samsung', label: t('brandSamsung', 'Samsung') },
    { key: 'xiaomi', label: t('brandXiaomi', 'Xiaomi') },
    { key: 'infinix', label: t('brandInfinix', 'Infinix') },
    { key: 'tecno', label: t('brandTecno', 'Tecno') },
  ];

  const quickFilters = [
    { key: 'all' as QuickFilterKey, label: t('all', 'All'), icon: 'apps-outline', bg: '#FFF7CC' },
    { key: 'discount' as QuickFilterKey, label: t('discounts', 'Discounts'), icon: 'pricetag-outline', bg: '#EFF6FF' },
    { key: 'new' as QuickFilterKey, label: t('newModels', 'New Models'), icon: 'sparkles-outline', bg: '#ECFDF5' },
    { key: 'special' as QuickFilterKey, label: t('specialOffers', 'Special Offers'), icon: 'megaphone-outline', bg: '#FEF2F2' },
  ];

  const renderProductCard = ({ item }: { item: MobileProduct }) => {
    const badgeText =
      item.badge === 'new'
        ? t('new', 'New')
        : item.badge === 'special'
        ? t('specialOffer', 'Special Offer')
        : item.badge === 'discount'
        ? t('discount', 'Discount')
        : item.badge === 'preorder'
        ? t('preorder', 'Pre-order')
        : item.badge || (item.is_new ? t('new', 'New') : t('available', 'Available'));

    return (
      <TouchableOpacity activeOpacity={0.94} style={styles.productCard} onPress={() => openCheckout(item)}>
        <View style={styles.productCardTop}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>

          <TouchableOpacity style={styles.iconBubble} onPress={() => openCheckout(item)}>
            <Ionicons name="cart-outline" size={16} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        <Image
          source={{
            uri:
              item.image_url ||
              'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
          }}
          style={styles.productImage}
          resizeMode="contain"
        />

        <View style={styles.brandRow}>
          <Text style={styles.brandText}>{getBrandLabel(item.brand)}</Text>
          {!!item.logo_url ? <Image source={{ uri: item.logo_url }} style={styles.brandLogo} resizeMode="contain" /> : null}
        </View>

        <Text numberOfLines={2} style={styles.productName}>
          {item.name}
        </Text>

        <Text numberOfLines={2} style={styles.productSpec}>
          {[item.storage, item.ram, item.color].filter(Boolean).join(' • ')}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.colorDot, { backgroundColor: item.color_hex || '#D1D5DB' }]} />
          <Text style={styles.stockText}>
            {(item.stock || 0) > 0 || item.stock === null ? t('inStock', 'In stock') : t('outOfStock', 'Out of stock')}
          </Text>
        </View>

        <Text style={styles.priceText}>{formatIQD(item.price_iqd)}</Text>
        <Text style={styles.monthlyText}>
          {formatIQD(item.monthly_price_iqd)} / {t('monthly', 'monthly')}
        </Text>

        <View style={styles.shopTagWrap}>
          <Text style={styles.shopTag}>{t('zenopayShop', 'zenopay shop')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeaderOff />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {topBar}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.sectionTitle}>{t('mobileShopHome', 'Home')}</Text>

            <View style={styles.searchRow}>
              <View style={styles.locationPill}>
                <Ionicons name="location-outline" size={18} color={COLORS.orange} />
                <Text numberOfLines={1} style={styles.locationText}>
                  {locationLoading ? t('detectingLocation', 'Detecting...') : cityLabel}
                </Text>
              </View>

              <View style={styles.searchBox}>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                  placeholder={t('searchMobiles', 'Search for mobile model')}
                  placeholderTextColor={COLORS.textSecondary}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandTabsRow}>
              {brandTabs.map((item) => {
                const active = selectedBrand === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.brandTab, active && styles.brandTabActive]}
                    onPress={() => setSelectedBrand(item.key)}
                  >
                    <Ionicons
                      name={getBrandIcon(item.key as BrandKey) as any}
                      size={15}
                      color={active ? '#7A5B00' : COLORS.textSecondary}
                      style={{ marginEnd: 6 }}
                    />
                    <Text style={[styles.brandTabText, active && styles.brandTabTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.quickFilterRow}>
            {quickFilters.map((item) => {
              const active = quickFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.quickFilterCard, active && styles.quickFilterCardActive]}
                  onPress={() => setQuickFilter(item.key)}
                >
                  <View style={[styles.quickFilterIconWrap, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={22} color={COLORS.black} />
                  </View>
                  <Text style={styles.quickFilterLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <LinearGradient colors={['#FFE16A', '#F5C400']} style={styles.heroCard}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroSmall}>{t('zenopayWallet', 'Zenopay Wallet')}</Text>
              <Text style={styles.heroTitle}>{t('latestMobileSeries', 'Latest Mobile Series')}</Text>
              <Text style={styles.heroSub}>
                {t('startingFrom', 'Starting from')} {featuredProducts[0] ? formatIQD(featuredProducts[0].price_iqd) : formatIQD(0)}
              </Text>

              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => {
                  if (featuredProducts[0]) openCheckout(featuredProducts[0]);
                }}
              >
                <Text style={styles.heroButtonText}>{t('buyNow', 'Buy Now')}</Text>
              </TouchableOpacity>
            </View>

            <Image
              source={{
                uri:
                  featuredProducts[0]?.image_url ||
                  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
              }}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </LinearGradient>

          <View style={styles.walletCard}>
            <View>
              <Text style={styles.walletLabel}>{t('yourWalletBalance', 'Your Wallet Balance')}</Text>
              <Text style={styles.walletValue}>{walletQuery.isLoading ? '...' : formatIQD(walletBalance)}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(app)/dashboard' as any)} style={styles.walletButton}>
              <Text style={styles.walletButtonText}>{t('openDashboard', 'Open Dashboard')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>{t('allMobiles', 'All Mobiles')}</Text>
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setSelectedBrand('all');
                setQuickFilter('all');
              }}
            >
              <Text style={styles.sectionLink}>{t('showAll', 'Show All')}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="phone-portrait-outline" size={34} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>{t('noProductsFound', 'No products found')}</Text>
                <Text style={styles.emptySub}>{t('tryAnotherSearchOrBrand', 'Try another search or brand')}</Text>
              </View>
            }
          />

          <View style={{ height: 90 }} />
        </ScrollView>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <View style={styles.menuOverlay}>
            <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
            <View style={styles.menuCard}>
              <TouchableOpacity style={styles.menuItem} onPress={openPolicy}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.text} />
                <Text style={styles.menuText}>{t('privacyPolicy', 'Privacy Policy')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={openTerms}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.text} />
                <Text style={styles.menuText}>{t('termsConditions', 'Terms & Conditions')}</Text>
              </TouchableOpacity>

              <View style={styles.menuItem}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.text} />
                <Text style={styles.menuText}>
                  {t('balance', 'Balance')}: {formatIQD(walletBalance)}
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={checkoutOpen} animationType="slide" transparent onRequestClose={() => setCheckoutOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('completeMobilePurchase', 'Complete Mobile Purchase')}</Text>
                <TouchableOpacity onPress={() => setCheckoutOpen(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedProduct ? (
                  <>
                    <View style={styles.selectedCard}>
                      <Image
                        source={{
                          uri:
                            selectedProduct.image_url ||
                            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
                        }}
                        style={styles.selectedImage}
                        resizeMode="contain"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedName}>{selectedProduct.name}</Text>
                        <Text style={styles.selectedSub}>
                          {[selectedProduct.storage, selectedProduct.ram, selectedProduct.color].filter(Boolean).join(' • ')}
                        </Text>
                        <Text style={styles.selectedPrice}>{formatIQD(selectedProduct.price_iqd)}</Text>
                      </View>
                    </View>

                    <View style={styles.balanceBox}>
                      <Text style={styles.balanceBoxLabel}>{t('walletBalance', 'Wallet Balance')}</Text>
                      <Text style={styles.balanceBoxValue}>{formatIQD(walletBalance)}</Text>
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('city', 'City')}</Text>
                      <TextInput
                        value={form.city}
                        onChangeText={(v) => setForm((p) => ({ ...p, city: v }))}
                        style={styles.input}
                        placeholder={t('enterCity', 'Enter city')}
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('streetAddress', 'Street Address')}</Text>
                      <TextInput
                        value={form.street}
                        onChangeText={(v) => setForm((p) => ({ ...p, street: v }))}
                        style={styles.input}
                        placeholder={t('enterStreetAddress', 'Enter street address')}
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('phoneNumber', 'Phone Number')}</Text>
                      <TextInput
                        value={form.phoneNumber}
                        onChangeText={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
                        style={styles.input}
                        placeholder={t('enterPhoneNumber', 'Enter phone number')}
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('fullName', 'Full Name')}</Text>
                      <TextInput
                        value={form.fullName}
                        onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))}
                        style={styles.input}
                        placeholder={t('enterFullName', 'Enter full name')}
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('email', 'Email')}</Text>
                      <TextInput
                        value={form.email}
                        onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                        style={styles.input}
                        placeholder={t('enterEmail', 'Enter email')}
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('note', 'Note')}</Text>
                      <TextInput
                        value={form.note}
                        onChangeText={(v) => setForm((p) => ({ ...p, note: v }))}
                        style={[styles.input, styles.noteInput]}
                        placeholder={t('optionalNote', 'Optional note')}
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                      />
                    </View>

                    <View style={styles.qtyWrap}>
                      <Text style={styles.fieldLabel}>{t('quantity', 'Quantity')}</Text>

                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() =>
                            setForm((p) => ({
                              ...p,
                              quantity: Math.max(1, Number(p.quantity || 1) - 1),
                            }))
                          }
                        >
                          <Ionicons name="remove" size={20} color={COLORS.text} />
                        </TouchableOpacity>

                        <Text style={styles.qtyValue}>{form.quantity}</Text>

                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() =>
                            setForm((p) => ({
                              ...p,
                              quantity: Number(p.quantity || 1) + 1,
                            }))
                          }
                        >
                          <Ionicons name="add" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.summaryBox}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('unitPrice', 'Unit Price')}</Text>
                        <Text style={styles.summaryValue}>{formatIQD(selectedProduct.price_iqd)}</Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('quantity', 'Quantity')}</Text>
                        <Text style={styles.summaryValue}>{form.quantity}</Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('totalPrice', 'Total Price')}</Text>
                        <Text style={styles.summaryValue}>{formatIQD(selectedTotalPrice)}</Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('remainingAfterPurchase', 'Remaining After Purchase')}</Text>
                        <Text style={styles.summaryValue}>{formatIQD(walletBalance - selectedTotalPrice)}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.buyButton, createOrderMutation.isPending && { opacity: 0.7 }]}
                      onPress={() => createOrderMutation.mutate()}
                      disabled={createOrderMutation.isPending}
                    >
                      {createOrderMutation.isPending ? (
                        <ActivityIndicator color={COLORS.black} />
                      ) : (
                        <Text style={styles.buyButtonText}>{t('buyWithWalletBalance', 'Buy with Wallet Balance')}</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    height: 64,
    backgroundColor: COLORS.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  topIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMenuBtn: {
    minWidth: 42,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(122,91,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  topTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  scrollContent: {
    paddingBottom: 22,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionTitle: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationPill: {
    maxWidth: 130,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  searchBox: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  brandTabsRow: {
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
  brandTab: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  brandTabActive: {
    backgroundColor: '#FFF1B2',
    borderColor: COLORS.yellow,
  },
  brandTabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  brandTabTextActive: {
    color: '#7A5B00',
  },
  quickFilterRow: {
    paddingHorizontal: 16,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickFilterCard: {
    width: (width - 48) / 4,
    alignItems: 'center',
  },
  quickFilterCardActive: {
    transform: [{ scale: 1.02 }],
  },
  quickFilterIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickFilterLabel: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    marginTop: 18,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroLeft: {
    flex: 1,
  },
  heroSmall: {
    color: '#7A5B00',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroTitle: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroSub: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  heroButton: {
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  heroImage: {
    width: 126,
    height: 132,
  },
  walletCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  walletValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
  },
  walletButton: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletButtonText: {
    color: '#3730A3',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionLink: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: '800',
  },
  gridRow: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 12,
  },
  productCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgePill: {
    backgroundColor: '#EAF7EF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#1A7F37',
    fontSize: 11,
    fontWeight: '800',
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: 125,
    marginBottom: 8,
    borderRadius: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  brandText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  brandLogo: {
    width: 24,
    height: 24,
  },
  productName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
    minHeight: 42,
  },
  productSpec: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    minHeight: 34,
    marginTop: 4,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  stockText: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: '700',
  },
  priceText: {
    marginTop: 10,
    color: COLORS.orange,
    fontSize: 22,
    fontWeight: '900',
  },
  monthlyText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  shopTagWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  shopTag: {
    backgroundColor: COLORS.black,
    color: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.18)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 82,
    paddingHorizontal: 16,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuCard: {
    width: 250,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    zIndex: 2,
  },
  menuItem: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F8F8FC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 64,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  selectedCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  selectedImage: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  selectedName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  selectedSub: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedPrice: {
    marginTop: 6,
    color: COLORS.orange,
    fontSize: 18,
    fontWeight: '900',
  },
  balanceBox: {
    backgroundColor: COLORS.yellowSoft,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  balanceBoxLabel: {
    color: COLORS.yellowDark,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceBoxValue: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: '900',
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    marginBottom: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  noteInput: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  qtyWrap: {
    marginBottom: 14,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: 42,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryBox: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
  },
  summaryRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  buyButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFD000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: '900',
  },
});

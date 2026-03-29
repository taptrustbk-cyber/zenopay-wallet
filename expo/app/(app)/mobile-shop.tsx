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
  I18nManager,
  Dimensions,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Image as ExpoImage } from 'expo-image';
import i18n from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;
const isRTL = I18nManager.isRTL;

type BrandKey = 'all' | 'apple' | 'samsung' | 'xiaomi' | 'infinix' | 'tecno' | 'other';
type PurchaseMode = 'cash' | 'installment';
type QuickFilterKey = 'all' | 'discount' | 'new' | 'special';

type MobileProduct = {
  id: string;
  brand: Exclude<BrandKey, 'all'>;
  name: string;
  slug?: string | null;
  description?: string | null;
  image_url: string | null;
  logo_url?: string | null;
  price_iqd: number | null;
  cash_price_iqd?: number | null;
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
  created_at?: string | null;
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

type ShopOrder = {
  id: string;
  user_id: string;
  product_id?: string | null;
  order_type?: string | null;
  source_screen?: string | null;
  purchase_mode?: string | null;
  product_name?: string | null;
  product_brand?: string | null;
  product_image_url?: string | null;
  unit_cash_price_iqd?: number | null;
  unit_monthly_price_iqd?: number | null;
  months_count?: number | null;
  quantity?: number | null;
  total_price_iqd?: number | null;
  paid_amount_iqd?: number | null;
  remaining_amount_iqd?: number | null;
  customer_full_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_city?: string | null;
  customer_street?: string | null;
  note?: string | null;
  status?: string | null;
  payment_status?: string | null;
  admin_status?: string | null;
  created_at?: string | null;
};

const COLORS = {
  bg: '#EEF4FF',
  bg2: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  border: '#D9E5F6',
  borderStrong: '#C9D9F1',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  blue: '#2563EB',
  blue2: '#3B82F6',
  blue3: '#60A5FA',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',
  blueDark: '#1D4ED8',

  sky: '#8EC5FF',
  white: '#FFFFFF',
  black: '#0F172A',

  success: '#16A34A',
  successSoft: '#EAF8EF',
  orange: '#F97316',
  orangeSoft: '#FFF1E8',
  red: '#DC2626',
  redSoft: '#FEECEC',

  purple: '#7C3AED',
  purpleSoft: '#F1EBFF',

  overlay: 'rgba(15, 23, 42, 0.20)',
};

const SHADOWS = {
  card: {
    shadowColor: '#7DA8E6',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#8BA9D6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

const ScreenHeaderOff = () => <Stack.Screen options={{ headerShown: false }} />;

const t = (key: string, fallback: string) => {
  const value = i18n.t(key as any);
  if (!value || value === key) return fallback;
  return String(value);
};

const formatNumberWithDots = (value?: number | null) => {
  const number = Math.max(0, Number(value || 0));
  const rounded = Math.round(number);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatIQD = (value?: number | null) => {
  const formatted = formatNumberWithDots(value);
  const currency = t('iqdShort', 'IQD');
  return isRTL ? `${currency} ${formatted}` : `${formatted} ${currency}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

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
    case 'other':
      return t('other', 'Other');
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
    case 'other':
      return 'cube-outline';
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

const deriveCityLabel = (cityName?: string | null, regionName?: string | null) =>
  cityName || regionName || t('unknownCity', 'Unknown');

const getCashPrice = (product?: MobileProduct | null) => {
  if (!product) return 0;
  return Number(product.cash_price_iqd ?? product.price_iqd ?? 0);
};

const getMonthlyPrice = (product?: MobileProduct | null) => {
  if (!product) return 0;
  return Number(product.monthly_price_iqd ?? 0);
};

const getMonthsCount = (product?: MobileProduct | null) => Number(product?.months_count ?? 1);

const getInstallmentContractPrice = (product?: MobileProduct | null) => {
  if (!product) return 0;
  return getMonthlyPrice(product) * getMonthsCount(product);
};

const getAllImageUrls = (products: MobileProduct[]) => {
  const urls = products
    .flatMap((item) => [item.image_url, item.logo_url])
    .filter((v): v is string => !!v && typeof v === 'string');
  return Array.from(new Set(urls));
};

const hasCashOption = (product?: MobileProduct | null) => getCashPrice(product) > 0;
const hasInstallmentOption = (product?: MobileProduct | null) =>
  getMonthlyPrice(product) > 0 && getMonthsCount(product) > 0;

const getStatusColors = (status?: string | null) => {
  const s = String(status || '').toLowerCase();

  if (['approved', 'paid', 'completed', 'delivered', 'success'].includes(s)) {
    return { bg: COLORS.successSoft, color: COLORS.success };
  }

  if (['rejected', 'failed', 'cancelled', 'refunded'].includes(s)) {
    return { bg: COLORS.redSoft, color: COLORS.red };
  }

  if (['processing', 'pending', 'new', 'partially_paid'].includes(s)) {
    return { bg: COLORS.orangeSoft, color: COLORS.orange };
  }

  return { bg: COLORS.blueSoft, color: COLORS.blueDark };
};

const getDisplayOrderStatus = (order: ShopOrder) => {
  return (
    order.admin_status ||
    order.status ||
    order.payment_status ||
    'pending'
  );
};

const ProductImage = ({
  uri,
  style,
  contentFit = 'contain',
  iconSize = 34,
  placeholderIcon = 'phone-portrait-outline',
}: {
  uri?: string | null;
  style: any;
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  iconSize?: number;
  placeholderIcon?: keyof typeof Ionicons.glyphMap;
}) => {
  if (!uri) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Ionicons name={placeholderIcon} size={iconSize} color={COLORS.textMuted} />
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={0}
      priority="high"
      recyclingKey={uri}
      allowDownscaling
    />
  );
};

const FALLBACK_PRODUCTS: MobileProduct[] = [
  {
    id: 'fallback-1',
    brand: 'apple',
    name: 'iPhone 16 Pro Max',
    image_url: null,
    logo_url: null,
    price_iqd: 1890000,
    cash_price_iqd: 1890000,
    monthly_price_iqd: 189000,
    months_count: 10,
    storage: '256GB',
    ram: '8GB',
    color: 'Desert Titanium',
    color_hex: '#B88E5A',
    badge: 'new',
    is_new: true,
    is_active: true,
    sort_order: 1,
    category: 'mobile',
    description: 'Official model • 256GB • 8GB RAM • Desert Titanium',
  },
  {
    id: 'fallback-2',
    brand: 'samsung',
    name: 'Galaxy S25 Ultra',
    image_url: null,
    logo_url: null,
    price_iqd: 1799000,
    cash_price_iqd: 1799000,
    monthly_price_iqd: 179900,
    months_count: 10,
    storage: '256GB',
    ram: '12GB',
    color: 'Black',
    color_hex: '#1F2937',
    badge: 'new',
    is_new: true,
    is_active: true,
    sort_order: 2,
    category: 'mobile',
    description: 'Official model • 256GB • 12GB RAM • Black',
  },
  {
    id: 'fallback-3',
    brand: 'xiaomi',
    name: 'Xiaomi 14 Ultra',
    image_url: null,
    logo_url: null,
    price_iqd: 1449000,
    cash_price_iqd: 1449000,
    monthly_price_iqd: 144900,
    months_count: 10,
    storage: '512GB',
    ram: '16GB',
    color: 'Black',
    color_hex: '#111827',
    badge: 'new',
    is_new: true,
    is_active: true,
    sort_order: 3,
    category: 'mobile',
    description: 'Official model • 512GB • 16GB RAM • Black',
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
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [detectedCity, setDetectedCity] = React.useState('');
  const [locationLoading, setLocationLoading] = React.useState(false);
  const [purchaseMode, setPurchaseMode] = React.useState<PurchaseMode>('cash');

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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

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
      if (!walletRes.error && walletRes.data) return deriveBalanceFromRow(walletRes.data);

      const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!profileRes.error && profileRes.data) return deriveBalanceFromRow(profileRes.data);

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

  const ordersHistoryQuery = useQuery({
    queryKey: ['mobile-shop-orders-history', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_orders')
        .select('*')
        .eq('user_id', user!.id)
        .eq('order_type', 'mobile')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ShopOrder[];
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

  const featuredProduct = React.useMemo(() => {
    if (!allProducts.length) return null;

    const byBadge = allProducts.find((p) =>
      ['hero', 'featured', 'ad', 'special'].includes(String(p.badge || '').toLowerCase())
    );
    if (byBadge) return byBadge;

    const sorted = [...allProducts].sort((a, b) => {
      const aSort = Number(a.sort_order ?? 999999);
      const bSort = Number(b.sort_order ?? 999999);
      return aSort - bSort;
    });

    return sorted[0] || allProducts[0] || null;
  }, [allProducts]);

  React.useEffect(() => {
    const urls = getAllImageUrls(allProducts);
    if (urls.length) {
      ExpoImage.prefetch(urls).catch(() => {});
    }
  }, [allProducts]);

  React.useEffect(() => {
    if (featuredProduct?.image_url) {
      ExpoImage.prefetch([featuredProduct.image_url]).catch(() => {});
    }
  }, [featuredProduct?.image_url]);

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();

    return allProducts.filter((item) => {
      const brandOk = selectedBrand === 'all' ? true : item.brand === selectedBrand;

      const badgeValue = String(item.badge || '').toLowerCase();

      const quickOk =
        quickFilter === 'all'
          ? true
          : quickFilter === 'new'
          ? !!item.is_new || badgeValue.includes('new')
          : quickFilter === 'discount'
          ? badgeValue.includes('discount') || badgeValue.includes('offer')
          : quickFilter === 'special'
          ? badgeValue.includes('special') || badgeValue.includes('preorder') || badgeValue.includes('hero') || badgeValue.includes('featured') || badgeValue.includes('ad')
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

  const selectedCashPrice = getCashPrice(selectedProduct);
  const selectedMonthlyPrice = getMonthlyPrice(selectedProduct);
  const selectedMonthsCount = getMonthsCount(selectedProduct);
  const selectedInstallmentContractUnit = getInstallmentContractPrice(selectedProduct);

  const quantity = Math.max(1, Number(form.quantity || 1));
  const selectedCashTotal = selectedCashPrice * quantity;
  const selectedFirstInstallment = selectedMonthlyPrice * quantity;
  const selectedInstallmentContractTotal = selectedInstallmentContractUnit * quantity;

  const payableNow = purchaseMode === 'cash' ? selectedCashTotal : selectedFirstInstallment;
  const walletBalanceAfterPayment = Math.max(0, walletBalance - payableNow);

  const remainingPurchaseAmount =
    purchaseMode === 'cash'
      ? 0
      : Math.max(0, selectedInstallmentContractTotal - selectedFirstInstallment);

  const refreshAll = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-products'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-wallet-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-orders-history'] }),
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

      if (hasMissing) throw new Error(t('fillAllRequiredFields', 'Please fill all required fields'));

      const productHasCash = hasCashOption(selectedProduct);
      const productHasInstallment = hasInstallmentOption(selectedProduct);

      if (purchaseMode === 'cash' && !productHasCash) {
        throw new Error(t('cashNotAvailableForThisProduct', 'Cash is not available for this product'));
      }

      if (purchaseMode === 'installment' && !productHasInstallment) {
        throw new Error(t('installmentNotAvailableForThisProduct', 'Installment is not available for this product'));
      }

      const quantity = Math.max(1, Number(form.quantity || 1));
      const cashUnitPrice = getCashPrice(selectedProduct);
      const monthlyUnitPrice = getMonthlyPrice(selectedProduct);
      const monthsCount = getMonthsCount(selectedProduct);
      const installmentUnitContractPrice = getInstallmentContractPrice(selectedProduct);

      const cashTotalPrice = cashUnitPrice * quantity;
      const firstInstallmentPayment = monthlyUnitPrice * quantity;
      const installmentContractTotal = installmentUnitContractPrice * quantity;

      const currentBalance = Number(walletQuery.data || 0);
      const amountToPayNow = purchaseMode === 'cash' ? cashTotalPrice : firstInstallmentPayment;

      const remainingAmount =
        purchaseMode === 'cash'
          ? 0
          : Math.max(0, installmentContractTotal - firstInstallmentPayment);

      if (currentBalance < amountToPayNow) {
        if (purchaseMode === 'cash') {
          throw new Error(
            t(
              'insufficientCashBalance',
              "You don't have enough balance for cash purchase. Please deposit balance and try again."
            )
          );
        }

        throw new Error(
          t(
            'insufficientFirstMonthBalance',
            "You don't have enough balance for the first monthly payment. Please deposit balance and try again."
          )
        );
      }

      if ((selectedProduct.stock || 0) <= 0 && selectedProduct.stock !== null) {
        throw new Error(t('productOutOfStock', 'This product is out of stock'));
      }

      const orderPayload: any = {
        user_id: user.id,
        product_id: selectedProduct.id,
        order_type: 'mobile',
        source_screen: 'mobile-shop',
        purchase_mode: purchaseMode,

        product_name: selectedProduct.name,
        product_brand: selectedProduct.brand,
        product_image_url: selectedProduct.image_url,
        product_logo_url: selectedProduct.logo_url || null,

        unit_cash_price_iqd: cashUnitPrice,
        unit_price_iqd: purchaseMode === 'cash' ? cashUnitPrice : installmentUnitContractPrice,
        unit_monthly_price_iqd: monthlyUnitPrice,
        months_count: monthsCount,
        quantity,

        cash_total_price_iqd: cashTotalPrice,
        total_price_iqd: purchaseMode === 'cash' ? cashTotalPrice : installmentContractTotal,
        total_monthly_price_iqd: monthlyUnitPrice * quantity,
        installment_total_contract_iqd: installmentContractTotal,

        first_payment_iqd: purchaseMode === 'cash' ? cashTotalPrice : firstInstallmentPayment,
        paid_amount_iqd: amountToPayNow,
        payable_now_iqd: amountToPayNow,
        remaining_amount_iqd: remainingAmount,

        color: selectedProduct.color || null,
        storage: selectedProduct.storage || null,
        ram: selectedProduct.ram || null,
        description_snapshot: selectedProduct.description || null,

        customer_full_name: form.fullName,
        customer_phone: form.phoneNumber,
        customer_email: form.email,
        customer_city: form.city,
        customer_street: form.street,
        note: form.note || null,

        status: purchaseMode === 'cash' ? 'paid' : 'pending',
        payment_status: purchaseMode === 'cash' ? 'paid' : 'partially_paid',
        payment_method: 'wallet',
        admin_status: 'new',

        wallet_balance_before_iqd: currentBalance,
        wallet_balance_after_iqd: currentBalance - amountToPayNow,
      };

      const { error: orderError } = await supabase.from('shop_orders').insert(orderPayload);
      if (orderError) throw orderError;

      await updateWalletAfterPurchase(currentBalance - amountToPayNow);

      if (selectedProduct.stock !== null && selectedProduct.stock !== undefined) {
        const nextStock = Math.max(0, Number(selectedProduct.stock || 0) - quantity);
        await supabase.from('shop_products').update({ stock: nextStock }).eq('id', selectedProduct.id);
      }

      return {
        purchaseMode,
        paidNow: amountToPayNow,
        nextBalance: currentBalance - amountToPayNow,
        remainingAmount,
      };
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-wallet-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-products'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-orders-history'] }),
      ]);

      Alert.alert(
        t('purchaseSuccess', 'Purchase successful'),
        `${t('mobilePurchasedSuccess', 'Your mobile purchase was completed successfully and sent to admin.')}\n\n${t('purchaseType', 'Purchase type')}: ${
          result.purchaseMode === 'cash' ? t('cash', 'Cash') : t('installment', 'Installment')
        }\n${t('paidAmount', 'Paid amount')}: ${formatIQD(result.paidNow)}\n${t('walletBalanceAfterPayment', 'Wallet Balance After Payment')}: ${formatIQD(result.nextBalance)}${
          result.purchaseMode === 'installment'
            ? `\n${t('remainingInstallmentAmount', 'Remaining Installment Amount')}: ${formatIQD(result.remainingAmount)}`
            : ''
        }`,
        [
          {
            text: t('done', 'Done'),
            onPress: () => {
              setCheckoutOpen(false);
              setSelectedProduct(null);
              setPurchaseMode('cash');
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

    const cashAvailable = hasCashOption(product);
    const installmentAvailable = hasInstallmentOption(product);

    if (cashAvailable) setPurchaseMode('cash');
    else if (installmentAvailable) setPurchaseMode('installment');

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

  const openOrderHistory = () => {
    setMenuOpen(false);
    setHistoryOpen(true);
  };

  const brandTabs: { key: BrandKey; label: string }[] = [
    { key: 'all', label: t('all', 'All') },
    { key: 'apple', label: t('brandApple', 'Apple') },
    { key: 'samsung', label: t('brandSamsung', 'Samsung') },
    { key: 'xiaomi', label: t('brandXiaomi', 'Xiaomi') },
    { key: 'infinix', label: t('brandInfinix', 'Infinix') },
    { key: 'tecno', label: t('brandTecno', 'Tecno') },
  ];

  const quickFilters = [
    { key: 'all' as QuickFilterKey, label: t('all', 'All'), icon: 'apps-outline', bg: '#FFF8DA' },
    { key: 'discount' as QuickFilterKey, label: t('discounts', 'Discounts'), icon: 'pricetag-outline', bg: '#EDF5FF' },
    { key: 'new' as QuickFilterKey, label: t('newModels', 'New Models'), icon: 'sparkles-outline', bg: '#EEF9FF' },
    { key: 'special' as QuickFilterKey, label: t('specialOffers', 'Special Offers'), icon: 'megaphone-outline', bg: '#F4F3FF' },
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

    const cashAvailable = hasCashOption(item);
    const installmentAvailable = hasInstallmentOption(item);

    return (
      <TouchableOpacity activeOpacity={0.95} style={styles.productCard} onPress={() => openCheckout(item)}>
        <View style={styles.productCardGlow} />

        <View style={styles.productCardTop}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>

          <TouchableOpacity style={styles.iconBubble} onPress={() => openCheckout(item)}>
            <Ionicons name="cart-outline" size={16} color={COLORS.blueDark} />
          </TouchableOpacity>
        </View>

        <ProductImage uri={item.image_url} style={styles.productImage} contentFit="contain" iconSize={34} />

        <View style={styles.brandRow}>
          <Text style={styles.brandText}>{getBrandLabel(item.brand)}</Text>
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
            {(item.stock || 0) > 0 || item.stock === null
              ? t('inStock', 'In stock')
              : t('outOfStock', 'Out of stock')}
          </Text>
        </View>

        {cashAvailable ? <Text style={styles.priceText}>{formatIQD(getCashPrice(item))}</Text> : null}

        {installmentAvailable ? (
          <Text style={styles.monthlyText}>
            {formatIQD(getMonthlyPrice(item))} / {t('monthly', 'monthly')}
          </Text>
        ) : null}

        <View style={styles.optionPillsRow}>
          {cashAvailable ? (
            <View style={[styles.optionPill, styles.optionPillCash]}>
              <Text style={[styles.optionPillText, { color: COLORS.blueDark }]}>{t('cash', 'Cash')}</Text>
            </View>
          ) : null}

          {installmentAvailable ? (
            <View style={[styles.optionPill, styles.optionPillInstallment]}>
              <Text style={[styles.optionPillText, { color: COLORS.purple }]}>{t('installment', 'Installment')}</Text>
            </View>
          ) : null}
        </View>

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
        <LinearGradient
          colors={['#EEF5FF', '#E8F1FF', '#DDEBFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topBar}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.topIconBtn}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.blueDark} />
          </TouchableOpacity>

          <Text style={styles.topTitle}>{t('zenopayMobileShop', 'Zenopay Mobile Shop')}</Text>

          <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.topMenuBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.blueDark} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={COLORS.blue} />}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.sectionTitle}>{t('mobileShopHome', 'Home')}</Text>

            <View style={styles.searchRow}>
              <View style={styles.locationPill}>
                <Ionicons name="location-outline" size={18} color={COLORS.blue} />
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
                  placeholderTextColor={COLORS.textMuted}
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
                      color={active ? COLORS.blueDark : COLORS.textSecondary}
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

          <LinearGradient
            colors={['#F7FBFF', '#EAF3FF', '#DCEBFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroBlurCircleOne} />
            <View style={styles.heroBlurCircleTwo} />

            <View style={styles.heroLeft}>
              <Text style={styles.heroSmall}>{t('zenopayWallet', 'Zenopay Wallet')}</Text>
              <Text style={styles.heroTitle}>{t('latestMobileSeries', 'Latest Mobile Series')}</Text>
              <Text style={styles.heroSub}>
                {t('startingFrom', 'Starting from')}{' '}
                {featuredProduct
                  ? formatIQD(
                      hasCashOption(featuredProduct)
                        ? getCashPrice(featuredProduct)
                        : getInstallmentContractPrice(featuredProduct)
                    )
                  : formatIQD(0)}
              </Text>

              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => {
                  if (featuredProduct) openCheckout(featuredProduct);
                }}
              >
                <LinearGradient
                  colors={['#7AB9FF', '#4A8DF5', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroButtonGradient}
                >
                  <Text style={styles.heroButtonText}>{t('buyNow', 'Buy Now')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.heroImageWrap}>
              <ProductImage
                uri={featuredProduct?.image_url}
                style={styles.heroImage}
                contentFit="contain"
                iconSize={42}
              />
            </View>
          </LinearGradient>

          <View style={styles.walletCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.92)', 'rgba(242,247,255,0.92)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletCardInner}
            >
              <Text style={styles.walletLabelCenter}>{t('yourWalletBalance', 'Your Wallet Balance')}</Text>
              <Text style={styles.walletValueCenter}>
                {walletQuery.isLoading ? '...' : formatIQD(walletBalance)}
              </Text>
            </LinearGradient>
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
            removeClippedSubviews={Platform.OS !== 'web'}
            initialNumToRender={8}
            maxToRenderPerBatch={12}
            windowSize={10}
            updateCellsBatchingPeriod={20}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="phone-portrait-outline" size={34} color={COLORS.textMuted} />
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
              <TouchableOpacity style={styles.menuItem} onPress={openOrderHistory}>
                <Ionicons name="time-outline" size={20} color={COLORS.text} />
                <Text style={styles.menuText}>{t('orderHistory', 'Order History')}</Text>
              </TouchableOpacity>

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

        <Modal visible={historyOpen} transparent animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.historySheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('orderHistory', 'Order History')}</Text>
                <TouchableOpacity onPress={() => setHistoryOpen(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {!user ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="person-circle-outline" size={34} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>{t('loginRequired', 'Please login first')}</Text>
                  </View>
                ) : ordersHistoryQuery.isLoading ? (
                  <View style={styles.historyLoadingWrap}>
                    <ActivityIndicator color={COLORS.blue} size="large" />
                    <Text style={styles.historyLoadingText}>{t('loading', 'Loading...')}</Text>
                  </View>
                ) : (ordersHistoryQuery.data || []).length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="receipt-outline" size={34} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>{t('noOrdersYet', 'No orders yet')}</Text>
                    <Text style={styles.emptySub}>{t('yourPreviousOrdersWillAppearHere', 'Your previous orders will appear here')}</Text>
                  </View>
                ) : (
                  (ordersHistoryQuery.data || []).map((order) => {
                    const status = getDisplayOrderStatus(order);
                    const statusStyle = getStatusColors(status);
                    const purchaseModeText =
                      String(order.purchase_mode || '').toLowerCase() === 'installment'
                        ? t('installment', 'Installment')
                        : t('cash', 'Cash');

                    return (
                      <View key={order.id} style={styles.historyCard}>
                        <View style={styles.historyTopRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyProductName}>{order.product_name || 'Product'}</Text>
                            <Text style={styles.historyMetaText}>
                              {(order.product_brand || '—').toUpperCase()} • {purchaseModeText}
                            </Text>
                          </View>

                          <View style={[styles.historyStatusBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.historyStatusText, { color: statusStyle.color }]}>
                              {String(status).toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>{t('totalPrice', 'Total Price')}</Text>
                          <Text style={styles.historyValue}>{formatIQD(order.total_price_iqd)}</Text>
                        </View>

                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>{t('paidAmount', 'Paid Amount')}</Text>
                          <Text style={styles.historyValue}>{formatIQD(order.paid_amount_iqd)}</Text>
                        </View>

                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>{t('remainingInstallmentAmount', 'Remaining Installment Amount')}</Text>
                          <Text style={styles.historyValue}>{formatIQD(order.remaining_amount_iqd)}</Text>
                        </View>

                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>{t('quantity', 'Quantity')}</Text>
                          <Text style={styles.historyValue}>{Number(order.quantity || 1)}</Text>
                        </View>

                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>{t('orderDate', 'Order Date')}</Text>
                          <Text style={styles.historyValue}>{formatDateTime(order.created_at)}</Text>
                        </View>
                      </View>
                    );
                  })
                )}

                <View style={{ height: 16 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={checkoutOpen} animationType="slide" transparent onRequestClose={() => setCheckoutOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('completeMobilePurchase', 'Complete Mobile Purchase')}</Text>
                <TouchableOpacity onPress={() => setCheckoutOpen(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedProduct ? (
                  <>
                    <View style={styles.selectedCard}>
                      <ProductImage
                        uri={selectedProduct.image_url}
                        style={styles.selectedImage}
                        contentFit="contain"
                      />

                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedName}>{selectedProduct.name}</Text>
                        <Text style={styles.selectedSub}>
                          {[selectedProduct.storage, selectedProduct.ram, selectedProduct.color]
                            .filter(Boolean)
                            .join(' • ')}
                        </Text>

                        {purchaseMode === 'cash' && hasCashOption(selectedProduct) ? (
                          <Text style={styles.selectedPrice}>{formatIQD(selectedCashPrice)}</Text>
                        ) : null}

                        {purchaseMode === 'installment' && hasInstallmentOption(selectedProduct) ? (
                          <>
                            <Text style={styles.selectedPrice}>{formatIQD(selectedInstallmentContractUnit)}</Text>
                            <Text style={styles.selectedInstallmentHint}>
                              {formatIQD(selectedMonthlyPrice)} / {t('monthly', 'monthly')}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>

                    {!!selectedProduct.description && (
                      <View style={styles.descriptionBox}>
                        <Text style={styles.descriptionTitle}>{t('productDetails', 'Product Details')}</Text>
                        <Text style={styles.descriptionText}>{selectedProduct.description}</Text>
                      </View>
                    )}

                    <View style={styles.modeSelectorWrap}>
                      {hasCashOption(selectedProduct) ? (
                        <TouchableOpacity
                          style={[styles.modeBtn, purchaseMode === 'cash' && styles.modeBtnActive]}
                          onPress={() => setPurchaseMode('cash')}
                        >
                          <Text style={[styles.modeBtnText, purchaseMode === 'cash' && styles.modeBtnTextActive]}>
                            {t('cash', 'Cash')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {hasInstallmentOption(selectedProduct) ? (
                        <TouchableOpacity
                          style={[styles.modeBtn, purchaseMode === 'installment' && styles.modeBtnActivePurple]}
                          onPress={() => setPurchaseMode('installment')}
                        >
                          <Text
                            style={[
                              styles.modeBtnText,
                              purchaseMode === 'installment' && styles.modeBtnTextActivePurple,
                            ]}
                          >
                            {t('installment', 'Installment')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={styles.priceModeInfo}>
                      {purchaseMode === 'cash' ? (
                        <>
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('cashPrice', 'Cash Price')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(selectedCashPrice)}</Text>
                          </View>

                          <View style={styles.summaryRowLast}>
                            <Text style={styles.summaryLabel}>{t('payNow', 'Pay Now')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(selectedCashTotal)}</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('installmentTotalPrice', 'Installment Total Price')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(selectedInstallmentContractTotal)}</Text>
                          </View>

                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('monthlyInstallment', 'Monthly Installment')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(selectedFirstInstallment)}</Text>
                          </View>

                          <View style={styles.summaryRowLast}>
                            <Text style={styles.summaryLabel}>{t('numberOfMonths', 'Number of Months')}</Text>
                            <Text style={styles.summaryValue}>{selectedMonthsCount}</Text>
                          </View>
                        </>
                      )}
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
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('streetAddress', 'Street Address')}</Text>
                      <TextInput
                        value={form.street}
                        onChangeText={(v) => setForm((p) => ({ ...p, street: v }))}
                        style={styles.input}
                        placeholder={t('enterStreetAddress', 'Enter street address')}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('phoneNumber', 'Phone Number')}</Text>
                      <TextInput
                        value={form.phoneNumber}
                        onChangeText={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
                        style={styles.input}
                        placeholder={t('enterPhoneNumber', 'Enter phone number')}
                        placeholderTextColor={COLORS.textMuted}
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
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('email', 'Email')}</Text>
                      <TextInput
                        value={form.email}
                        onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                        style={styles.input}
                        placeholder={t('enterEmail', 'Enter email')}
                        placeholderTextColor={COLORS.textMuted}
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
                        placeholderTextColor={COLORS.textMuted}
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
                        <Text style={styles.summaryLabel}>{t('purchaseType', 'Purchase type')}</Text>
                        <Text style={styles.summaryValue}>
                          {purchaseMode === 'cash' ? t('cash', 'Cash') : t('installment', 'Installment')}
                        </Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('quantity', 'Quantity')}</Text>
                        <Text style={styles.summaryValue}>{form.quantity}</Text>
                      </View>

                      {purchaseMode === 'cash' ? (
                        <>
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('cashPrice', 'Cash Price')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(selectedCashTotal)}</Text>
                          </View>

                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('payNow', 'Pay Now')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(selectedCashTotal)}</Text>
                          </View>

                          <View style={styles.summaryRowLast}>
                            <Text style={styles.summaryLabel}>{t('walletBalanceAfterPayment', 'Wallet Balance After Payment')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(walletBalanceAfterPayment)}</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('installmentTotalPrice', 'Installment Total Price')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(selectedInstallmentContractTotal)}</Text>
                          </View>

                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('firstMonthPayment', 'First Month Payment')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(selectedFirstInstallment)}</Text>
                          </View>

                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('numberOfMonths', 'Number of Months')}</Text>
                            <Text style={styles.summaryValue}>{selectedMonthsCount}</Text>
                          </View>

                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('walletBalanceAfterPayment', 'Wallet Balance After Payment')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(walletBalanceAfterPayment)}</Text>
                          </View>

                          <View style={styles.summaryRowLast}>
                            <Text style={styles.summaryLabel}>{t('remainingInstallmentAmount', 'Remaining Installment Amount')}</Text>
                            <Text style={styles.summaryValue}>{formatIQD(remainingPurchaseAmount)}</Text>
                          </View>
                        </>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.buyButton, createOrderMutation.isPending && { opacity: 0.7 }]}
                      onPress={() => createOrderMutation.mutate()}
                      disabled={createOrderMutation.isPending}
                    >
                      <LinearGradient
                        colors={['#79B7FF', '#4C92F7', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buyButtonGradient}
                      >
                        {createOrderMutation.isPending ? (
                          <ActivityIndicator color={COLORS.white} />
                        ) : (
                          <Text style={styles.buyButtonText}>
                            {purchaseMode === 'cash'
                              ? t('buyCashWithWallet', 'Buy Cash with Wallet')
                              : t('buyInstallmentWithWallet', 'Pay First Month with Wallet')}
                          </Text>
                        )}
                      </LinearGradient>
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
    height: 74,
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 28,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    ...SHADOWS.card,
  },
  topIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(201,217,241,0.9)',
  },
  topMenuBtn: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(201,217,241,0.9)',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#234D8C',
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: 10,
  },

  scrollContent: {
    paddingBottom: 22,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionTitle: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationPill: {
    maxWidth: 132,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.soft,
  },
  locationText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.soft,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },

  brandTabsRow: {
    paddingTop: 14,
    paddingBottom: 4,
    gap: 10,
  },
  brandTab: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.soft,
  },
  brandTabActive: {
    backgroundColor: '#FFF9E8',
    borderColor: '#F4D98B',
  },
  brandTabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  brandTabTextActive: {
    color: '#8A6A18',
  },

  quickFilterRow: {
    paddingHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickFilterCard: {
    width: (width - 48) / 4,
    alignItems: 'center',
  },
  quickFilterCardActive: {
    transform: [{ scale: 1.03 }],
  },
  quickFilterIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(217,229,246,0.85)',
  },
  quickFilterLabel: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },

  heroCard: {
    marginTop: 18,
    marginHorizontal: 16,
    borderRadius: 28,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    ...SHADOWS.card,
  },
  heroBlurCircleOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.28)',
    left: -80,
    top: 40,
  },
  heroBlurCircleTwo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.24)',
    right: -50,
    top: -40,
  },
  heroLeft: {
    flex: 1,
    paddingEnd: 10,
    zIndex: 2,
  },
  heroSmall: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroTitle: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  heroSub: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    lineHeight: 22,
  },
  heroButton: {
    alignSelf: 'flex-start',
    borderRadius: 22,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  heroButtonGradient: {
    minHeight: 42,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  heroButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },
  heroImageWrap: {
    width: 148,
    height: 148,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    zIndex: 2,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },

  walletCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  walletCardInner: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabelCenter: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  walletValueCenter: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },

  sectionHeader: {
    marginTop: 22,
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
    letterSpacing: -0.3,
  },
  sectionLink: {
    color: COLORS.blue,
    fontSize: 15,
    fontWeight: '800',
  },

  gridRow: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 12,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  productCardGlow: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(220,235,255,0.40)',
  },
  productCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgePill: {
    backgroundColor: '#EAF8EF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#23864A',
    fontSize: 11,
    fontWeight: '800',
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F8FF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: 165,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#F7FAFF',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFF',
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
  productName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
    minHeight: 42,
    letterSpacing: -0.2,
  },
  productSpec: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    minHeight: 34,
    marginTop: 4,
    fontWeight: '600',
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
    letterSpacing: -0.3,
  },
  monthlyText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  optionPillsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  optionPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  optionPillCash: {
    backgroundColor: COLORS.blueSoft,
    borderColor: COLORS.blue2,
  },
  optionPillInstallment: {
    backgroundColor: COLORS.purpleSoft,
    borderColor: COLORS.purple,
  },
  optionPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  shopTagWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  shopTag: {
    backgroundColor: '#0F1F3D',
    color: '#fff',
    borderRadius: 999,
    paddingHorizontal: 11,
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
    textAlign: 'center',
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 92,
    paddingHorizontal: 16,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuCard: {
    width: 250,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    zIndex: 2,
    ...SHADOWS.card,
  },
  menuItem: {
    minHeight: 48,
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
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F7FAFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: '#E3ECFA',
  },
  historySheet: {
    backgroundColor: '#F7FAFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '82%',
    borderTopWidth: 1,
    borderColor: '#E3ECFA',
  },
  modalHandle: {
    width: 64,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#C7D5EA',
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
    letterSpacing: -0.2,
    flex: 1,
    paddingEnd: 8,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  selectedImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F8FBFF',
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
  selectedInstallmentHint: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  descriptionBox: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  descriptionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  descriptionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  modeSelectorWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  modeBtnActive: {
    backgroundColor: '#EAF2FF',
    borderColor: COLORS.blue,
  },
  modeBtnActivePurple: {
    backgroundColor: COLORS.purpleSoft,
    borderColor: COLORS.purple,
  },
  modeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '900',
  },
  modeBtnTextActive: {
    color: COLORS.blue,
  },
  modeBtnTextActivePurple: {
    color: COLORS.purple,
  },

  priceModeInfo: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.soft,
  },

  balanceBox: {
    backgroundColor: '#EEF5FF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8E6FA',
  },
  balanceBoxLabel: {
    color: COLORS.blueDark,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  balanceBoxValue: {
    color: COLORS.black,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
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
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 15,
    ...SHADOWS.soft,
  },
  noteInput: {
    minHeight: 92,
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
    ...SHADOWS.soft,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  summaryRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
    flexShrink: 1,
  },

  buyButton: {
    borderRadius: 28,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  buyButtonGradient: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buyButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '900',
  },

  historyLoadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLoadingText: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  historyProductName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  historyMetaText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  historyStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  historyRow: {
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF3FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  historyValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
    flexShrink: 1,
  },
});
import React, { useMemo, useRef, useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Ban,
  Mail,
  Boxes,
  Tag,
  BadgeDollarSign,
  Layers3,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];
const PRODUCT_IMAGES_BUCKET = 'product-images';

const UI = {
  bg: '#F6F8FB',
  card: '#FFFFFF',
  card2: '#F8FAFC',
  text: '#0F172A',
  text2: '#475569',
  text3: '#64748B',
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
  black: '#0F172A',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

type ReviewAction = 'approved' | 'rejected';
type ScreenTab = 'products' | 'orders';
type PaymentAvailability = 'cash' | 'installment' | 'both';
type ProductTypeKey = 'physical' | 'service';

type CategoryKey =
  | 'mobile'
  | 'powerbank'
  | 'charger'
  | 'cable'
  | 'case'
  | 'screen_protector'
  | 'repair_service'
  | 'accessory'
  | 'tablet'
  | 'other';

type BrandKey =
  | 'apple'
  | 'samsung'
  | 'xiaomi'
  | 'infinix'
  | 'tecno'
  | 'huawei'
  | 'oppo'
  | 'realme'
  | 'nothing'
  | 'google'
  | 'motorola'
  | 'other';

type ProductForm = {
  id?: string | null;
  name: string;
  brand: BrandKey;
  custom_brand: string;
  category: CategoryKey;
  product_type: ProductTypeKey;
  image_url: string;
  description: string;
  price_iqd: string;
  cash_price_iqd: string;
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
  payment_availability: PaymentAvailability;
  is_cash_available: boolean;
  is_installment_available: boolean;
  service_type: string;
};

const BRAND_OPTIONS: BrandKey[] = [
  'apple',
  'samsung',
  'xiaomi',
  'infinix',
  'tecno',
  'huawei',
  'oppo',
  'realme',
  'nothing',
  'google',
  'motorola',
  'other',
];

const CATEGORY_OPTIONS: { key: CategoryKey; label: string }[] = [
  { key: 'mobile', label: 'Mobile' },
  { key: 'powerbank', label: 'Powerbank' },
  { key: 'charger', label: 'Charger' },
  { key: 'cable', label: 'Cable' },
  { key: 'case', label: 'Cover / Case' },
  { key: 'screen_protector', label: 'Screen Glass' },
  { key: 'repair_service', label: 'Repair Service' },
  { key: 'accessory', label: 'Accessory' },
  { key: 'tablet', label: 'Tablet' },
  { key: 'other', label: 'Other' },
];

const PRODUCT_TYPE_OPTIONS: { key: ProductTypeKey; label: string }[] = [
  { key: 'physical', label: 'Physical Product' },
  { key: 'service', label: 'Service' },
];

const PAYMENT_MODE_OPTIONS: { key: PaymentAvailability; label: string }[] = [
  { key: 'cash', label: 'Cash Only' },
  { key: 'installment', label: 'Installment Only' },
  { key: 'both', label: 'Cash + Installment' },
];

const emptyForm = (): ProductForm => ({
  id: null,
  name: '',
  brand: 'apple',
  custom_brand: '',
  category: 'mobile',
  product_type: 'physical',
  image_url: '',
  description: '',
  price_iqd: '',
  cash_price_iqd: '',
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
  payment_availability: 'both',
  is_cash_available: true,
  is_installment_available: true,
  service_type: '',
});

const formatIQD = (value: any) => {
  const n = Number(value || 0);
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} د.ع`;
};

const toNumber = (value: any, fallback = 0) => {
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .trim();

  if (!cleaned) return fallback;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
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
  row?.image_url ||
  row?.image ||
  row?.photo_url ||
  row?.thumbnail ||
  row?.product_image ||
  row?.product_image_url ||
  null;

const productNameFromRow = (row: any) =>
  row?.name || row?.title || row?.product_name || row?.mobile_name || row?.model || 'Unnamed Product';

const productBrandFromRow = (row: any) =>
  row?.custom_brand || row?.brand || row?.company || row?.manufacturer || row?.product_brand || 'other';

const productCategoryFromRow = (row: any) =>
  row?.category || row?.product_category || 'mobile';

const productPriceFromRow = (row: any) =>
  row?.price_iqd ?? row?.price ?? row?.sale_price ?? row?.amount ?? row?.product_price ?? 0;

const productCashPriceFromRow = (row: any) =>
  row?.cash_price_iqd ?? row?.cash_price ?? row?.price_iqd ?? row?.price ?? row?.sale_price ?? row?.amount ?? row?.product_price ?? 0;

const productMonthlyFromRow = (row: any) =>
  row?.monthly_price_iqd ?? row?.monthly_price ?? row?.installment_price ?? 0;

const productMonthsFromRow = (row: any) =>
  row?.months_count ?? row?.months ?? row?.installment_months ?? 1;

const productInstallmentTotalFromRow = (row: any) => {
  const direct =
    row?.installment_total_contract_iqd ??
    row?.installment_contract_total_iqd ??
    row?.total_installment_iqd;

  if (direct !== undefined && direct !== null) return Number(direct || 0);

  return Number(productMonthlyFromRow(row) || 0) * Number(productMonthsFromRow(row) || 1);
};

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
const orderPaidNow = (row: any) => row?.paid_amount_iqd ?? row?.payable_now_iqd ?? row?.first_payment_iqd ?? orderTotal(row) ?? 0;
const orderRemaining = (row: any) => row?.remaining_amount_iqd ?? 0;
const orderStatus = (row: any) =>
  (row?.admin_status || row?.status || row?.payment_status || 'pending').toString().toLowerCase();
const orderPhone = (row: any) => row?.customer_phone || row?.phone || row?.mobile || 'N/A';
const orderAddress = (row: any) =>
  row?.customer_street || row?.address || row?.delivery_address || row?.location || 'N/A';
const orderCity = (row: any) => row?.customer_city || row?.city || 'N/A';
const orderNotes = (row: any) => row?.note || row?.notes || row?.description || '';
const orderCreatedAt = (row: any) => row?.created_at || row?.ordered_at || row?.date || null;
const orderProductName = (row: any) => row?.product_name || row?.mobile_name || row?.name || 'Unknown Product';
const orderType = (row: any) => (row?.order_type || '').toString().toLowerCase();
const orderPurchaseMode = (row: any) => (row?.purchase_mode || row?.payment_mode || 'cash').toString().toLowerCase();
const orderAdminNote = (row: any) => row?.admin_note || '';
const orderAdminStatus = (row: any) => (row?.admin_status || '').toString().toLowerCase();
const orderCategory = (row: any) => row?.category || row?.product_category || 'mobile';

const decodeBase64ToUint8Array = (base64: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = base64.replace(/=+$/, '');
  let output = '';

  if (str.length % 4 === 1) {
    throw new Error('Invalid base64 string');
  }

  for (
    let bc = 0, bs: number | undefined, buffer: number | string, idx = 0;
    (buffer = str.charAt(idx++));
    ~((buffer as any) = chars.indexOf(buffer as string)) &&
    ((bs = bc % 4 ? (bs as number) * 64 + (buffer as number) : (buffer as number)),
    bc++ % 4)
      ? (output += String.fromCharCode(255 & ((bs as number) >> ((-2 * bc) & 6))))
      : 0
  ) {}

  const bytes = new Uint8Array(output.length);
  for (let i = 0; i < output.length; i++) {
    bytes[i] = output.charCodeAt(i);
  }
  return bytes;
};

const getContentTypeFromUri = (uri: string) => {
  const cleanUri = uri.split('?')[0].toLowerCase();

  if (cleanUri.endsWith('.png')) return { ext: 'png', contentType: 'image/png' };
  if (cleanUri.endsWith('.webp')) return { ext: 'webp', contentType: 'image/webp' };
  if (cleanUri.endsWith('.heic')) return { ext: 'heic', contentType: 'image/heic' };
  if (cleanUri.endsWith('.gif')) return { ext: 'gif', contentType: 'image/gif' };

  return { ext: 'jpg', contentType: 'image/jpeg' };
};

const categoryLabel = (category?: string | null) => {
  const found = CATEGORY_OPTIONS.find((item) => item.key === category);
  return found?.label || String(category || 'Other');
};

export default function MobileProductsAdminScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  const [activeTab, setActiveTab] = useState<ScreenTab>('products');

  const [modalOpen, setModalOpen] = useState(false);
  const [savingMode, setSavingMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [uploadingImage, setUploadingImage] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction>('approved');
  const [reviewMessage, setReviewMessage] = useState('');

  const reviewNavigationLock = useRef(false);

  const liveCashPrice = toNumber(form.cash_price_iqd || form.price_iqd, 0);
  const liveBasePrice = toNumber(form.price_iqd || form.cash_price_iqd, 0);
  const liveMonthlyPrice = toNumber(form.monthly_price_iqd, 0);
  const liveMonthsCount = Math.max(1, toNumber(form.months_count, 1));
  const liveInstallmentContractTotal = liveMonthlyPrice * liveMonthsCount;

  const productsQuery = useQuery({
    queryKey: ['admin-shop-products-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-shop-orders-all'],
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
      return sum + Number(productCashPriceFromRow(p) || 0) * Number(productStockFromRow(p) || 0);
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
      pendingOrders: list.filter((o: any) => {
        const s = orderAdminStatus(o) || orderStatus(o);
        return s === 'pending' || s === 'new';
      }).length,
      paidOrders: list.filter((o: any) => {
        const s = orderAdminStatus(o) || orderStatus(o);
        return s === 'approved' || s === 'paid' || s === 'completed';
      }).length,
      totalSales: list.reduce((sum: number, o: any) => sum + Number(orderPaidNow(o) || 0), 0),
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
      queryClient.invalidateQueries({ queryKey: ['admin-shop-products-all'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-shop-orders-all'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-shop-order-profiles'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    ]);
  };

  const resetForm = () => {
    setForm(emptyForm());
    setSavingMode('create');
  };

  const setPaymentAvailability = (mode: PaymentAvailability) => {
    if (mode === 'cash') {
      setForm((prev) => ({
        ...prev,
        payment_availability: 'cash',
        is_cash_available: true,
        is_installment_available: false,
        monthly_price_iqd: '',
        months_count: '1',
      }));
      return;
    }

    if (mode === 'installment') {
      setForm((prev) => ({
        ...prev,
        payment_availability: 'installment',
        is_cash_available: false,
        is_installment_available: true,
        cash_price_iqd: '',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      payment_availability: 'both',
      is_cash_available: true,
      is_installment_available: true,
    }));
  };

  const openCreateModal = () => {
    resetForm();
    setSavingMode('create');
    setModalOpen(true);
  };

  const openEditModal = (product: any) => {
    const cashAvailable =
      product?.is_cash_available !== undefined && product?.is_cash_available !== null
        ? !!product.is_cash_available
        : Number(product?.cash_price_iqd || product?.price_iqd || 0) > 0;

    const installmentAvailable =
      product?.is_installment_available !== undefined && product?.is_installment_available !== null
        ? !!product.is_installment_available
        : Number(product?.monthly_price_iqd || 0) > 0;

    const paymentAvailability: PaymentAvailability =
      cashAvailable && installmentAvailable
        ? 'both'
        : cashAvailable
        ? 'cash'
        : 'installment';

    setForm({
      id: product.id,
      name: product?.name || '',
      brand: (product?.brand || 'apple') as BrandKey,
      custom_brand: product?.custom_brand || '',
      category: (product?.category || 'mobile') as CategoryKey,
      product_type: (product?.product_type || 'physical') as ProductTypeKey,
      image_url: product?.image_url || '',
      description: product?.description || '',
      price_iqd: String(product?.price_iqd ?? ''),
      cash_price_iqd: String(product?.cash_price_iqd ?? product?.price_iqd ?? ''),
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
      payment_availability: paymentAvailability,
      is_cash_available: cashAvailable,
      is_installment_available: installmentAvailable,
      service_type: product?.service_type || '',
    });

    setSavingMode('edit');
    setModalOpen(true);
  };

  const openReviewModal = (order: any, action: ReviewAction) => {
    setSelectedOrderForReview(order);
    setReviewAction(action);
    setReviewMessage(
      action === 'approved'
        ? 'Your order has been approved.'
        : 'Your order has been rejected and your paid amount has been refunded to your wallet.'
    );
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedOrderForReview(null);
    setReviewMessage('');
    setReviewAction('approved');
  };

  const pickAndUploadImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access first.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fileUri = asset.uri;

      if (!fileUri) {
        throw new Error('No image selected');
      }

      setUploadingImage(true);

      const { ext, contentType } = getContentTypeFromUri(fileUri);
      const fileName = `shop-product-${Date.now()}.${ext}`;
      const filePath = `products/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileData = decodeBase64ToUint8Array(base64);

      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(filePath, fileData, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Could not create public URL');
      }

      setForm((prev) => ({
        ...prev,
        image_url: publicUrlData.publicUrl,
      }));

      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error: any) {
      Alert.alert('Upload Error', error?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProductMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Product name is required');

      const finalBrand = form.brand === 'other'
        ? (form.custom_brand.trim() || 'other')
        : form.brand;

      const basePrice = toNumber(form.price_iqd, 0);
      const cashPrice = toNumber(form.cash_price_iqd, 0);
      const monthlyPrice = toNumber(form.monthly_price_iqd, 0);
      const monthsCount = Math.max(1, toNumber(form.months_count, 1));
      const stock = Math.max(0, toNumber(form.stock, 0));
      const sortOrder = Math.max(0, toNumber(form.sort_order, 0));

      const canCash = form.is_cash_available;
      const canInstallment = form.is_installment_available;

      if (!canCash && !canInstallment) {
        throw new Error('At least one payment mode must be enabled');
      }

      if (canCash && cashPrice <= 0 && basePrice <= 0) {
        throw new Error('Cash price must be greater than 0');
      }

      if (canInstallment && monthlyPrice <= 0) {
        throw new Error('Monthly price must be greater than 0');
      }

      if (canInstallment && monthsCount <= 0) {
        throw new Error('Months count must be greater than 0');
      }

      const finalCashPrice = canCash ? (cashPrice > 0 ? cashPrice : basePrice) : 0;
      const finalBasePrice = basePrice > 0 ? basePrice : finalCashPrice;

      const payload: any = {
        category: form.category,
        product_type: form.product_type,
        name: form.name.trim(),
        brand: finalBrand,
        custom_brand: form.brand === 'other' ? form.custom_brand.trim() || finalBrand : null,
        image_url: form.image_url.trim() || null,
        description: form.description.trim() || null,
        price_iqd: finalBasePrice,
        cash_price_iqd: canCash ? finalCashPrice : 0,
        monthly_price_iqd: canInstallment ? monthlyPrice : 0,
        months_count: canInstallment ? monthsCount : 1,
        installment_total_contract_iqd: canInstallment ? monthlyPrice * monthsCount : 0,
        storage: form.storage.trim() || null,
        ram: form.ram.trim() || null,
        color: form.color.trim() || null,
        color_hex: form.color_hex.trim() || '#D1D5DB',
        stock,
        badge: form.badge.trim() || null,
        is_new: !!form.is_new,
        is_active: !!form.is_active,
        sort_order: sortOrder,
        is_cash_available: canCash,
        is_installment_available: canInstallment,
        service_type: form.product_type === 'service' ? form.service_type.trim() || null : null,
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
      await queryClient.invalidateQueries({ queryKey: ['admin-shop-products-all'] });
      setModalOpen(false);
      resetForm();
      Alert.alert(
        'Success',
        savingMode === 'edit' ? 'Product updated successfully' : 'Product added successfully'
      );
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
      await queryClient.invalidateQueries({ queryKey: ['admin-shop-products-all'] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin-shop-products-all'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to update status');
    },
  });

  const reviewOrderMutation = useMutation({
    mutationFn: async ({
      order,
      action,
      message,
    }: {
      order: any;
      action: ReviewAction;
      message: string;
    }) => {
      if (!order?.id) throw new Error('Order not found');

      const customerEmail = order?.customer_email || order?.profile?.email || null;
      const customerName = order?.customer_full_name || order?.profile?.full_name || 'Customer';

      const { data: reviewData, error: reviewError } = await supabase.rpc('admin_review_mobile_order', {
        p_order_id: order.id,
        p_action: action,
        p_admin_note: message.trim() || null,
        p_admin_user_id: user?.id || null,
      });

      if (reviewError) throw reviewError;

      if (customerEmail) {
        const { error: emailError } = await supabase.functions.invoke(
          'send-mobile-order-review-email',
          {
            body: {
              to: customerEmail,
              customer_name: customerName,
              order_id: order.id,
              order_status: action,
              message: message.trim() || '',
              product_name: order?.product_name || orderProductName(order),
              purchase_mode: orderPurchaseMode(order),
              total_price_iqd: orderTotal(order),
              paid_now_iqd: orderPaidNow(order),
              remaining_amount_iqd: action === 'rejected' ? 0 : orderRemaining(order),
            },
          }
        );

        if (emailError) {
          throw new Error(emailError.message || 'Order reviewed, but email sending failed');
        }
      }

      return {
        action,
        reviewData,
      };
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-shop-orders-all'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-shop-order-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-shop-wallet-balance'] }),
      ]);

      closeReviewModal();

      if (!reviewNavigationLock.current) {
        reviewNavigationLock.current = true;
        router.push('/transactions');
        setTimeout(() => {
          reviewNavigationLock.current = false;
        }, 1500);
      }

      Alert.alert(
        'Success',
        result.action === 'approved'
          ? 'Order approved successfully'
          : 'Order rejected and refunded successfully'
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to review order');
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

    if (s === 'rejected' || s === 'cancelled' || s === 'failed' || s === 'inactive' || s === 'refunded') {
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
          <Text style={styles.headerTitle}>Shop Products Admin</Text>
          <Text style={styles.headerSub}>Add products and manage orders</Text>
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
            <Text style={styles.sectionTitle}>Shop Dashboard</Text>
            <Text style={styles.sectionSub}>Products + orders management</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={refreshAll} activeOpacity={0.85}>
            <RefreshCw size={16} color={UI.blue} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.topTabBtn, activeTab === 'products' && styles.topTabBtnActive]}
            onPress={() => setActiveTab('products')}
            activeOpacity={0.9}
          >
            <Boxes size={16} color={activeTab === 'products' ? '#fff' : UI.blue} />
            <Text style={[styles.topTabBtnText, activeTab === 'products' && styles.topTabBtnTextActive]}>
              Add Product
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTabBtn, activeTab === 'orders' && styles.topTabBtnActive]}
            onPress={() => setActiveTab('orders')}
            activeOpacity={0.9}
          >
            <ShoppingBag size={16} color={activeTab === 'orders' ? '#fff' : UI.blue} />
            <Text style={[styles.topTabBtnText, activeTab === 'orders' && styles.topTabBtnTextActive]}>
              Order Products
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={UI.blue} size="large" />
            <Text style={styles.emptyText}>Loading products and orders...</Text>
          </View>
        ) : hasError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Error loading admin page</Text>
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
                <Text style={styles.statLabel}>Paid / Collected Now</Text>
                <Text style={[styles.statValue, { color: UI.green }]}>{orderStats.paidOrders}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Collected Amount</Text>
                <Text style={[styles.statValue, { fontSize: 18, color: UI.purple }]}>{formatIQD(orderStats.totalSales)}</Text>
              </View>
            </View>

            {activeTab === 'products' ? (
              <>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.addBtn} onPress={openCreateModal} activeOpacity={0.9}>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add New Product</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 6 }]}>All Products</Text>

                {(productsQuery.data || []).length > 0 ? (
                  (productsQuery.data || []).map((product: any) => {
                    const badge = statusBadge(productStatusFromRow(product));
                    const image = productImageFromRow(product);
                    const name = productNameFromRow(product);
                    const brand = productBrandFromRow(product);
                    const category = productCategoryFromRow(product);
                    const basePrice = productPriceFromRow(product);
                    const cashPrice = productCashPriceFromRow(product);
                    const monthly = productMonthlyFromRow(product);
                    const months = productMonthsFromRow(product);
                    const installmentTotal = productInstallmentTotalFromRow(product);
                    const stock = productStockFromRow(product);
                    const soldCount = (ordersQuery.data || []).filter((o: any) => orderProductId(o) === product.id).length;

                    const canCash =
                      product?.is_cash_available !== undefined && product?.is_cash_available !== null
                        ? !!product.is_cash_available
                        : Number(cashPrice || 0) > 0;

                    const canInstallment =
                      product?.is_installment_available !== undefined && product?.is_installment_available !== null
                        ? !!product.is_installment_available
                        : Number(monthly || 0) > 0;

                    return (
                      <View key={product.id} style={styles.card}>
                        <View style={styles.productHeader}>
                          <View style={styles.productImageWrap}>
                            {isLikelyUrl(image) ? (
                              <Image source={{ uri: image }} style={styles.productImage} resizeMode="contain" />
                            ) : (
                              <View style={styles.productImageFallback}>
                                <ImageIcon size={22} color={UI.blue} />
                              </View>
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{name}</Text>
                            <Text style={styles.cardSubtitle}>
                              {String(brand).toUpperCase()} • {categoryLabel(category)}
                            </Text>
                          </View>

                          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                          </View>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Category</Text>
                          <Text style={styles.rowValue}>{categoryLabel(category)}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Product Type</Text>
                          <Text style={styles.rowValue}>{product?.product_type || 'physical'}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Base Price</Text>
                          <Text style={styles.rowValue}>{formatIQD(basePrice)}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Cash Price</Text>
                          <Text style={[styles.rowValue, { color: UI.blue }]}>
                            {canCash ? formatIQD(cashPrice) : 'Disabled'}
                          </Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Monthly Price</Text>
                          <Text style={[styles.rowValue, { color: UI.purple }]}>
                            {canInstallment ? formatIQD(monthly) : 'Disabled'}
                          </Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Months</Text>
                          <Text style={styles.rowValue}>{canInstallment ? months : 'N/A'}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Installment Contract Total</Text>
                          <Text style={[styles.rowValue, { color: UI.purple }]}>
                            {canInstallment ? formatIQD(installmentTotal) : 'Disabled'}
                          </Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Payment Mode</Text>
                          <Text style={styles.rowValue}>
                            {canCash && canInstallment
                              ? 'Cash + Installment'
                              : canCash
                              ? 'Cash Only'
                              : 'Installment Only'}
                          </Text>
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
                            style={[
                              styles.smallActionBtn,
                              { backgroundColor: product?.is_active === false ? UI.greenSoft : UI.amberSoft },
                            ]}
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
                    <Text style={styles.emptyText}>No products found in shop_products table</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 18 }]}>User Orders</Text>

                {shopOrdersWithDetails.length > 0 ? (
                  shopOrdersWithDetails.map((order: any) => {
                    const product = order.product || null;
                    const profile = order.profile || null;
                    const badge = statusBadge(orderAdminStatus(order) || orderStatus(order));
                    const displayName = (profile?.full_name || order?.customer_full_name || '').trim() || 'Unknown Name';
                    const displayEmail = profile?.email || order?.customer_email || 'N/A';
                    const avatar = profile?.avatar_url;

                    const productName = product ? productNameFromRow(product) : orderProductName(order);
                    const productBrand = product?.brand || order?.product_brand || 'N/A';
                    const productImage = productImageFromRow(product) || order?.product_image_url || null;
                    const total = orderTotal(order);
                    const qty = orderQty(order);
                    const paidNow = orderPaidNow(order);
                    const remaining = orderRemaining(order);
                    const purchaseMode = orderPurchaseMode(order);
                    const adminNote = orderAdminNote(order);
                    const adminStatus = orderAdminStatus(order);
                    const monthly = Number(order?.unit_monthly_price_iqd ?? productMonthlyFromRow(product) ?? 0);
                    const months = Number(order?.months_count ?? productMonthsFromRow(product) ?? 1);
                    const installmentTotal = Number(
                      order?.installment_total_contract_iqd ?? monthly * months ?? 0
                    );
                    const category = orderCategory(order);

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

                        <View style={styles.orderProductCard}>
                          <View style={styles.orderProductImageWrap}>
                            {isLikelyUrl(productImage) ? (
                              <Image source={{ uri: productImage }} style={styles.orderProductImage} resizeMode="contain" />
                            ) : (
                              <View style={styles.orderProductImageFallback}>
                                <Smartphone size={24} color={UI.blue} />
                              </View>
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.orderProductTitle}>{productName}</Text>
                            <Text style={styles.orderProductSub}>
                              {String(productBrand).toUpperCase()} • {categoryLabel(category)}
                            </Text>
                            <Text style={styles.orderProductMeta}>
                              {[order?.storage || product?.storage, order?.ram || product?.ram, order?.color || product?.color]
                                .filter(Boolean)
                                .join(' • ') || 'N/A'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Order ID</Text>
                          <Text style={styles.rowValue}>{order.id}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Order Type</Text>
                          <Text style={styles.rowValue}>{orderType(order) || 'shop'}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Purchase Type</Text>
                          <Text style={[styles.rowValue, { color: purchaseMode === 'installment' ? UI.purple : UI.blue }]}>
                            {purchaseMode.toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Brand</Text>
                          <Text style={styles.rowValue}>{productBrand}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Quantity</Text>
                          <Text style={styles.rowValue}>{qty}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Contract / Total Price</Text>
                          <Text style={[styles.rowValue, { color: UI.purple }]}>{formatIQD(total)}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Paid Now</Text>
                          <Text style={[styles.rowValue, { color: UI.green }]}>{formatIQD(paidNow)}</Text>
                        </View>

                        {purchaseMode === 'installment' ? (
                          <>
                            <View style={styles.row}>
                              <Text style={styles.rowLabel}>Monthly Installment</Text>
                              <Text style={[styles.rowValue, { color: UI.purple }]}>{formatIQD(monthly)}</Text>
                            </View>

                            <View style={styles.row}>
                              <Text style={styles.rowLabel}>Months Count</Text>
                              <Text style={styles.rowValue}>{months}</Text>
                            </View>

                            <View style={styles.row}>
                              <Text style={styles.rowLabel}>Installment Total</Text>
                              <Text style={[styles.rowValue, { color: UI.purple }]}>{formatIQD(installmentTotal)}</Text>
                            </View>
                          </>
                        ) : null}

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Remaining Amount</Text>
                          <Text style={[styles.rowValue, { color: UI.amber }]}>{formatIQD(remaining)}</Text>
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

                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Admin Review</Text>
                          <Text
                            style={[
                              styles.rowValue,
                              {
                                color:
                                  adminStatus === 'approved'
                                    ? UI.green
                                    : adminStatus === 'rejected'
                                    ? UI.red
                                    : UI.amber,
                              },
                            ]}
                          >
                            {(adminStatus || 'pending').toUpperCase()}
                          </Text>
                        </View>

                        {!!orderNotes(order) && (
                          <View style={styles.noteBox}>
                            <Text style={styles.noteTitle}>Customer Notes</Text>
                            <Text style={styles.noteText}>{orderNotes(order)}</Text>
                          </View>
                        )}

                        {!!adminNote && (
                          <View style={[styles.noteBox, { backgroundColor: '#FFFDF5' }]}>
                            <Text style={styles.noteTitle}>Admin Note</Text>
                            <Text style={styles.noteText}>{adminNote}</Text>
                          </View>
                        )}

                        <View style={styles.orderReviewActionsRow}>
                          <TouchableOpacity
                            style={[styles.reviewBtn, { backgroundColor: UI.greenSoft, borderColor: UI.green }]}
                            onPress={() => openReviewModal(order, 'approved')}
                            disabled={reviewOrderMutation.isPending}
                          >
                            <CheckCircle2 size={16} color={UI.green} />
                            <Text style={[styles.reviewBtnText, { color: UI.green }]}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.reviewBtn, { backgroundColor: UI.redSoft, borderColor: UI.red }]}
                            onPress={() => openReviewModal(order, 'rejected')}
                            disabled={reviewOrderMutation.isPending}
                          >
                            <Ban size={16} color={UI.red} />
                            <Text style={[styles.reviewBtnText, { color: UI.red }]}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyCard}>
                    <ShoppingBag size={22} color={UI.text2} />
                    <Text style={styles.emptyText}>No orders found in shop_orders table</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {savingMode === 'edit' ? 'Edit Product' : 'Add New Product'}
                </Text>

                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalOpen(false)}>
                  <X size={18} color={UI.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 140 }}
              >
                <Text style={styles.inputLabel}>Product Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  placeholder="iPhone 16 Pro Max / Samsung Powerbank / Cable..."
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.choiceWrap}>
                  {CATEGORY_OPTIONS.map((item) => {
                    const active = form.category === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.choiceChip, active && styles.choiceChipActive]}
                        onPress={() => setForm((p) => ({ ...p, category: item.key }))}
                      >
                        <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>Product Type</Text>
                <View style={styles.choiceWrap}>
                  {PRODUCT_TYPE_OPTIONS.map((item) => {
                    const active = form.product_type === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.choiceChip, active && styles.choiceChipActive]}
                        onPress={() => setForm((p) => ({ ...p, product_type: item.key }))}
                      >
                        <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {form.product_type === 'service' ? (
                  <>
                    <Text style={styles.inputLabel}>Service Type</Text>
                    <TextInput
                      style={styles.input}
                      value={form.service_type}
                      onChangeText={(v) => setForm((p) => ({ ...p, service_type: v }))}
                      placeholder="Repair / Pickup Service / Delivery Service"
                      placeholderTextColor="#94A3B8"
                    />
                  </>
                ) : null}

                <Text style={styles.inputLabel}>Brand</Text>
                <View style={styles.brandRow}>
                  {BRAND_OPTIONS.map((brand) => {
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

                {form.brand === 'other' ? (
                  <>
                    <Text style={styles.inputLabel}>Custom Brand Name</Text>
                    <TextInput
                      style={styles.input}
                      value={form.custom_brand}
                      onChangeText={(v) => setForm((p) => ({ ...p, custom_brand: v }))}
                      placeholder="Type new brand name"
                      placeholderTextColor="#94A3B8"
                    />
                  </>
                ) : null}

                <Text style={styles.inputLabel}>Payment Availability</Text>
                <View style={styles.choiceWrap}>
                  {PAYMENT_MODE_OPTIONS.map((item) => {
                    const active = form.payment_availability === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.choiceChip, active && styles.choiceChipActive]}
                        onPress={() => setPaymentAvailability(item.key)}
                      >
                        <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                          {item.label}
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
                  placeholder="https://... or upload image below"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.uploadBtn, uploadingImage && { opacity: 0.75 }]}
                  onPress={pickAndUploadImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Upload size={16} color="#fff" />
                      <Text style={styles.uploadBtnText}>Upload Image From Device</Text>
                    </>
                  )}
                </TouchableOpacity>

                {!!form.image_url && isLikelyUrl(form.image_url) && (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: form.image_url }} style={styles.previewImage} resizeMode="contain" />
                  </View>
                )}

                <Text style={styles.inputLabel}>Base Price IQD</Text>
                <TextInput
                  style={styles.input}
                  value={form.price_iqd}
                  onChangeText={(v) => setForm((p) => ({ ...p, price_iqd: v }))}
                  placeholder="1071000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />

                {form.is_cash_available ? (
                  <>
                    <Text style={styles.inputLabel}>Cash Price IQD</Text>
                    <TextInput
                      style={styles.input}
                      value={form.cash_price_iqd}
                      onChangeText={(v) => setForm((p) => ({ ...p, cash_price_iqd: v }))}
                      placeholder="1071000"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                    />
                  </>
                ) : null}

                {form.is_installment_available ? (
                  <>
                    <Text style={styles.inputLabel}>Monthly Price IQD</Text>
                    <TextInput
                      style={styles.input}
                      value={form.monthly_price_iqd}
                      onChangeText={(v) => setForm((p) => ({ ...p, monthly_price_iqd: v }))}
                      placeholder="260000"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                    />

                    <Text style={styles.inputLabel}>Months Count</Text>
                    <TextInput
                      style={styles.input}
                      value={form.months_count}
                      onChangeText={(v) => setForm((p) => ({ ...p, months_count: v }))}
                      placeholder="10"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                    />
                  </>
                ) : null}

                <View style={styles.calcPreviewBox}>
                  <Text style={styles.calcPreviewTitle}>Live Price Preview</Text>

                  <View style={styles.rowNoBorder}>
                    <Text style={styles.rowLabel}>Base Price</Text>
                    <Text style={styles.rowValue}>{formatIQD(liveBasePrice)}</Text>
                  </View>

                  <View style={styles.rowNoBorder}>
                    <Text style={styles.rowLabel}>Cash Price</Text>
                    <Text style={[styles.rowValue, { color: UI.blue }]}>
                      {form.is_cash_available ? formatIQD(liveCashPrice) : 'Disabled'}
                    </Text>
                  </View>

                  <View style={styles.rowNoBorder}>
                    <Text style={styles.rowLabel}>Monthly Price</Text>
                    <Text style={[styles.rowValue, { color: UI.purple }]}>
                      {form.is_installment_available ? formatIQD(liveMonthlyPrice) : 'Disabled'}
                    </Text>
                  </View>

                  <View style={styles.rowNoBorder}>
                    <Text style={styles.rowLabel}>Months</Text>
                    <Text style={styles.rowValue}>{form.is_installment_available ? liveMonthsCount : 'N/A'}</Text>
                  </View>

                  <View style={styles.rowNoBorder}>
                    <Text style={styles.rowLabel}>Installment Contract Total</Text>
                    <Text style={[styles.rowValue, { color: UI.green }]}>
                      {form.is_installment_available ? formatIQD(liveInstallmentContractTotal) : 'Disabled'}
                    </Text>
                  </View>
                </View>

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
                  placeholder="Write product details here..."
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

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => saveProductMutation.mutate()}
                  disabled={saveProductMutation.isPending || uploadingImage}
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
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewModalOpen} transparent animationType="slide" onRequestClose={closeReviewModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {reviewAction === 'approved' ? 'Approve Order' : 'Reject Order'}
              </Text>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeReviewModal}>
                <X size={18} color={UI.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.reviewInfoCard}>
                <Text style={styles.reviewInfoTitle}>
                  {selectedOrderForReview?.product_name || orderProductName(selectedOrderForReview)}
                </Text>
                <Text style={styles.reviewInfoSub}>
                  Order ID: {selectedOrderForReview?.id || 'N/A'}
                </Text>
                <Text style={styles.reviewInfoSub}>
                  Email: {selectedOrderForReview?.customer_email || selectedOrderForReview?.profile?.email || 'N/A'}
                </Text>
                <Text style={styles.reviewInfoSub}>
                  Paid Now: {formatIQD(orderPaidNow(selectedOrderForReview))}
                </Text>
              </View>

              <View style={styles.actionTypeRow}>
                <View
                  style={[
                    styles.actionTypeBadge,
                    {
                      backgroundColor:
                        reviewAction === 'approved' ? UI.greenSoft : UI.redSoft,
                    },
                  ]}
                >
                  {reviewAction === 'approved' ? (
                    <CheckCircle2 size={16} color={UI.green} />
                  ) : (
                    <Ban size={16} color={UI.red} />
                  )}
                  <Text
                    style={[
                      styles.actionTypeText,
                      { color: reviewAction === 'approved' ? UI.green : UI.red },
                    ]}
                  >
                    {reviewAction === 'approved' ? 'APPROVE' : 'REJECT'}
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Message to customer</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={reviewMessage}
                onChangeText={setReviewMessage}
                placeholder="Write your message here..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              <View style={styles.emailHintBox}>
                <Mail size={16} color={UI.blue} />
                <Text style={styles.emailHintText}>
                  This message will be saved in admin_note and sent to the customer email automatically.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitReviewBtn,
                  {
                    backgroundColor: reviewAction === 'approved' ? UI.green : UI.red,
                    opacity: reviewOrderMutation.isPending ? 0.7 : 1,
                  },
                ]}
                onPress={() => {
                  if (!selectedOrderForReview || reviewOrderMutation.isPending) return;
                  reviewOrderMutation.mutate({
                    order: selectedOrderForReview,
                    action: reviewAction,
                    message: reviewMessage,
                  });
                }}
                disabled={reviewOrderMutation.isPending}
              >
                {reviewOrderMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitReviewBtnText}>
                    {reviewAction === 'approved' ? 'Approve & Go To Transactions' : 'Reject Refund & Go To Transactions'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
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

  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  topTabBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  topTabBtnActive: {
    backgroundColor: UI.blue,
  },
  topTabBtnText: {
    color: UI.blue,
    fontWeight: '900',
    fontSize: 14,
  },
  topTabBtnTextActive: {
    color: '#fff',
  },

  actionRow: {
    marginBottom: 16,
    marginTop: 4,
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
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card2,
    alignItems: 'center',
    justifyContent: 'center',
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

  orderProductCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card2,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderProductImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderProductImage: {
    width: '100%',
    height: '100%',
  },
  orderProductImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.blueSoft,
  },
  orderProductTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },
  orderProductSub: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.blue,
    marginBottom: 4,
  },
  orderProductMeta: {
    fontSize: 12,
    color: UI.text2,
    fontWeight: '700',
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
  rowNoBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '700',
    maxWidth: '45%',
  },
  rowValue: {
    fontSize: 13,
    color: UI.text,
    fontWeight: '800',
    maxWidth: '53%',
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

  calcPreviewBox: {
    marginTop: 12,
    backgroundColor: UI.purpleSoft,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 16,
    padding: 12,
  },
  calcPreviewTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.purple,
    marginBottom: 8,
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

  orderReviewActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  reviewBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  reviewBtnText: {
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
    height: '92%',
  },
  reviewSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    maxHeight: '78%',
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

  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
  },
  choiceChipActive: {
    backgroundColor: UI.blueSoft,
    borderColor: UI.blue,
  },
  choiceChipText: {
    color: UI.text2,
    fontWeight: '800',
  },
  choiceChipTextActive: {
    color: UI.blue,
  },

  uploadBtn: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: UI.purple,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
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
    minHeight: 220,
  },
  previewImage: {
    width: '100%',
    height: 220,
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

  reviewInfoCard: {
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  reviewInfoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
  },
  reviewInfoSub: {
    fontSize: 13,
    color: UI.text2,
    marginTop: 4,
    fontWeight: '700',
  },
  actionTypeRow: {
    marginBottom: 8,
  },
  actionTypeBadge: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTypeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  emailHintBox: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: UI.blueSoft,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  emailHintText: {
    flex: 1,
    color: UI.blue,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  submitReviewBtn: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  submitReviewBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import i18n from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const isRTL = I18nManager.isRTL;

type BrandKey = 'all' | 'apple' | 'samsung' | 'xiaomi' | 'infinix' | 'tecno';

type MobileProduct = {
  id: string;
  brand: BrandKey;
  name: string;
  slug?: string | null;
  description?: string | null;
  image_url: string;
  logo_url?: string | null;
  price_iqd: number;
  monthly_price_iqd: number;
  months_count: number;
  storage?: string | null;
  ram?: string | null;
  color?: string | null;
  color_hex?: string | null;
  stock?: number | null;
  badge?: string | null;
  is_new?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | null;
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

const BRAND_TABS: { key: BrandKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'الكل', icon: 'grid-outline' },
  { key: 'apple', label: 'Apple', icon: 'logo-apple' },
  { key: 'samsung', label: 'Samsung', icon: 'phone-portrait-outline' },
  { key: 'xiaomi', label: 'Xiaomi', icon: 'hardware-chip-outline' },
  { key: 'infinix', label: 'Infinix', icon: 'flash-outline' },
  { key: 'tecno', label: 'Tecno', icon: 'diamond-outline' },
];

const FALLBACK_PRODUCTS: MobileProduct[] = [
  {
    id: 'fallback-1',
    brand: 'apple',
    name: 'iPhone 16 Pro Max',
    image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1200&auto=format&fit=crop',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    price_iqd: 1899000,
    monthly_price_iqd: 189900,
    months_count: 10,
    storage: '256GB',
    ram: '8GB',
    color: 'Desert Titanium',
    color_hex: '#B88E5A',
    badge: 'جديد',
    is_new: true,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'fallback-2',
    brand: 'samsung',
    name: 'Galaxy S25 Ultra',
    image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1200&auto=format&fit=crop',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
    price_iqd: 1799000,
    monthly_price_iqd: 179900,
    months_count: 10,
    storage: '256GB',
    ram: '12GB',
    color: 'Black',
    color_hex: '#202228',
    badge: 'حجز مسبق',
    is_new: true,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'fallback-3',
    brand: 'xiaomi',
    name: 'Xiaomi 14 Ultra',
    image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=1200&auto=format&fit=crop',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg',
    price_iqd: 1449000,
    monthly_price_iqd: 144900,
    months_count: 10,
    storage: '512GB',
    ram: '16GB',
    color: 'Black',
    color_hex: '#16171A',
    badge: 'جديد',
    is_new: true,
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'fallback-4',
    brand: 'infinix',
    name: 'Infinix Zero 40',
    image_url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=1200&auto=format&fit=crop',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Infinix_logo.svg',
    price_iqd: 565000,
    monthly_price_iqd: 56500,
    months_count: 10,
    storage: '256GB',
    ram: '12GB',
    color: 'Violet',
    color_hex: '#7E57C2',
    badge: 'عرض خاص',
    is_new: true,
    is_active: true,
    sort_order: 4,
  },
  {
    id: 'fallback-5',
    brand: 'tecno',
    name: 'Tecno Camon 30 Pro',
    image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Tecno_Mobile_logo.svg',
    price_iqd: 529000,
    monthly_price_iqd: 52900,
    months_count: 10,
    storage: '256GB',
    ram: '12GB',
    color: 'Green',
    color_hex: '#7FB685',
    badge: 'متوفر',
    is_new: true,
    is_active: true,
    sort_order: 5,
  },
];

const COLORS = {
  bg: '#F6F7FB',
  white: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  yellow: '#F5C400',
  yellowDark: '#D8A900',
  yellowSoft: '#FFF6CC',
  orange: '#EA580C',
  blue: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
  black: '#111827',
  card: '#FFFFFF',
};

const ScreenHeaderOff = () => <Stack.Screen options={{ headerShown: false }} />;

const formatIQD = (value?: number | null) => {
  const number = Number(value || 0);
  return `${new Intl.NumberFormat('en-US').format(number)} د.ع`;
};

const brandLabel = (brand: BrandKey) => {
  switch (brand) {
    case 'apple':
      return 'Apple';
    case 'samsung':
      return 'Samsung';
    case 'xiaomi':
      return 'Xiaomi';
    case 'infinix':
      return 'Infinix';
    case 'tecno':
      return 'Tecno';
    default:
      return i18n.t('all') || 'All';
  }
};

const t = (key: string, fallback: string) => {
  const value = i18n.t(key as any);
  if (!value || value === key) return fallback;
  return String(value);
};

export default function MobileShopScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedBrand, setSelectedBrand] = React.useState<BrandKey>('all');
  const [search, setSearch] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState<MobileProduct | null>(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
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
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, city, street_address')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  React.useEffect(() => {
    if (profileQuery.data) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || profileQuery.data.full_name || '',
        email: prev.email || profileQuery.data.email || user?.email || '',
        phoneNumber: prev.phoneNumber || profileQuery.data.phone || '',
        city: prev.city || profileQuery.data.city || '',
        street: prev.street || profileQuery.data.street_address || '',
      }));
    } else if (user?.email) {
      setForm((prev) => ({ ...prev, email: prev.email || user.email || '' }));
    }
  }, [profileQuery.data, user?.email]);

  const productsQuery = useQuery({
    queryKey: ['mobile-shop-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_products')
        .select(`
          id,
          brand,
          name,
          slug,
          description,
          image_url,
          logo_url,
          price_iqd,
          monthly_price_iqd,
          months_count,
          storage,
          ram,
          color,
          color_hex,
          stock,
          badge,
          is_new,
          is_active,
          sort_order
        `)
        .eq('category', 'mobile')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        return FALLBACK_PRODUCTS;
      }

      if (!data || data.length === 0) {
        return FALLBACK_PRODUCTS;
      }

      return data as MobileProduct[];
    },
  });

  const products = React.useMemo(() => {
    return (productsQuery.data || FALLBACK_PRODUCTS).filter((item) => item.is_active !== false);
  }, [productsQuery.data]);

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((item) => {
      const brandMatch = selectedBrand === 'all' ? true : item.brand === selectedBrand;
      const text = `${item.name} ${item.description || ''} ${item.storage || ''} ${item.ram || ''} ${brandLabel(item.brand)}`.toLowerCase();
      const searchMatch = !q || text.includes(q);
      return brandMatch && searchMatch;
    });
  }, [products, search, selectedBrand]);

  const featuredProducts = React.useMemo(() => filteredProducts.slice(0, 4), [filteredProducts]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(t('loginRequired', 'Please login first'));
      if (!selectedProduct) throw new Error(t('selectProductFirst', 'Please select a product first'));

      const missingFields = [form.fullName, form.phoneNumber, form.city, form.street, form.email].some(
        (item) => !String(item || '').trim()
      );

      if (missingFields) {
        throw new Error(t('fillAllFields', 'Please fill all required fields'));
      }

      const quantity = Math.max(1, Number(form.quantity || 1));
      const totalPrice = Number(selectedProduct.price_iqd || 0) * quantity;
      const totalMonthly = Number(selectedProduct.monthly_price_iqd || 0) * quantity;

      const payload = {
        user_id: user.id,
        product_id: selectedProduct.id,
        order_type: 'mobile',
        product_name: selectedProduct.name,
        product_brand: selectedProduct.brand,
        product_image_url: selectedProduct.image_url,
        product_logo_url: selectedProduct.logo_url || null,
        unit_price_iqd: Number(selectedProduct.price_iqd || 0),
        unit_monthly_price_iqd: Number(selectedProduct.monthly_price_iqd || 0),
        months_count: Number(selectedProduct.months_count || 10),
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
        status: 'pending',
        admin_status: 'new',
      };

      const { error } = await supabase.from('shop_orders').insert(payload);
      if (error) throw error;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-shop-products'] });
      Alert.alert(
        t('orderPlaced', 'Order placed'),
        t('mobileOrderPlacedMessage', 'Your mobile order was sent successfully to the admin panel.'),
        [
          {
            text: t('done', 'Done'),
            onPress: () => {
              setCheckoutOpen(false);
              setSelectedProduct(null);
              setForm((prev) => ({ ...prev, note: '', quantity: 1 }));
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(t('error', 'Error'), error?.message || t('failedToPlaceOrder', 'Failed to place order'));
    },
  });

  const openCheckout = (product: MobileProduct) => {
    setSelectedProduct(product);
    setCheckoutOpen(true);
  };

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => (checkoutOpen ? setCheckoutOpen(false) : router.back())} style={styles.topCircleBtn}>
        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.topBarTitle}>{t('installmentMall', 'أقساط مول')}</Text>

      <View style={styles.topBarRight}>
        <TouchableOpacity style={styles.topSmallBtn}>
          <Ionicons name="star-outline" size={18} color="#7A5B00" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topSmallWideBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#7A5B00" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchAndTabs = () => (
    <View style={styles.headerSection}>
      <Text style={styles.sectionMainTitle}>{t('home', 'الرئيسية')}</Text>

      <View style={styles.searchRow}>
        <View style={styles.locationPill}>
          <Ionicons name="location-outline" size={18} color={COLORS.orange} />
          <Text style={styles.locationText}>{form.city || t('baghdad', 'بغداد')}</Text>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchProductOrBrand', 'ابحث عن منتج او ماركة')}
            placeholderTextColor={COLORS.textSecondary}
            textAlign={isRTL ? 'right' : 'left'}
          />
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {BRAND_TABS.map((item) => {
          const active = selectedBrand === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setSelectedBrand(item.key)}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderHero = () => (
    <View style={styles.heroWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryCircleRow}>
        {[
          { label: t('discounts', 'التخفيضات'), icon: 'pricetag-outline', bg: '#FFF4D6' },
          { label: t('newProducts', 'منتجات جديدة'), icon: 'phone-portrait-outline', bg: '#EAFBF1' },
          { label: t('specialOffers', 'وصل حديثاً'), icon: 'megaphone-outline', bg: '#FFF1F2' },
          { label: t('shipping', 'شحن'), icon: 'briefcase-outline', bg: '#E0F2FE' },
        ].map((item, index) => (
          <View key={`${item.label}-${index}`} style={styles.categoryCircleItem}>
            <View style={[styles.categoryCircle, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={28} color={COLORS.black} />
            </View>
            <Text style={styles.categoryCircleLabel}>{item.label}</Text>
          </View>
        ))}
      </ScrollView>

      <LinearGradient colors={['#FFDA57', '#F5B900']} style={styles.bigBanner}>
        <View style={styles.bigBannerTextSide}>
          <Text style={styles.bigBannerSmall}>Zenopay Wallet</Text>
          <Text style={styles.bigBannerTitle}>{t('newMobileSeries', 'سلسلة الموبايلات الجديدة')}</Text>
          <Text style={styles.bigBannerPrice}>{t('startsFromMonthly', 'ابتداءً من')} {formatIQD(165000)}</Text>
          <TouchableOpacity style={styles.blackBannerBtn}>
            <Text style={styles.blackBannerBtnText}>{t('installmentNow', 'قسط الآن')}</Text>
          </TouchableOpacity>
        </View>

        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?q=80&w=1200&auto=format&fit=crop' }}
          style={styles.bigBannerImage}
          resizeMode="contain"
        />
      </LinearGradient>
    </View>
  );

  const renderPromoCards = () => (
    <View style={styles.promoGrid}>
      <TouchableOpacity style={styles.promoLargeCard}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=1200&auto=format&fit=crop' }}
          style={styles.promoLargeImage}
        />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.promoOverlay}>
          <Text style={styles.promoLargeTitle}>500,000 IQD</Text>
          <Text style={styles.promoLargeSub}>{t('saveOnLatestSamsung', 'وفّر على أحدث أجهزة Samsung')}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.promoSideColumn}>
        <TouchableOpacity style={styles.promoMiniCardBlue}>
          <Text style={styles.promoPercentBlue}>20%</Text>
          <Text style={styles.promoMiniTitleBlue}>{t('saveUpTo', 'وفر حتى')}</Text>
          <Text style={styles.promoMiniBrandBlue}>Apple / Xiaomi</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.promoMiniCardRed}>
          <Text style={styles.promoPercentRed}>50%</Text>
          <Text style={styles.promoMiniTitleRed}>{t('exclusiveOffer', 'خصم حصري')}</Text>
          <Text style={styles.promoMiniBrandRed}>{t('limitedOffers', 'عروض محدودة')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProductCard = ({ item }: { item: MobileProduct }) => {
    return (
      <TouchableOpacity activeOpacity={0.92} style={styles.productCard} onPress={() => openCheckout(item)}>
        <View style={styles.productCardHeader}>
          <View style={styles.badgeGreen}>
            <Text style={styles.badgeGreenText}>{item.badge || (item.is_new ? t('new', 'جديد') : t('available', 'متوفر'))}</Text>
          </View>
          <TouchableOpacity style={styles.smallCartBubble}>
            <Ionicons name="cart-outline" size={15} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Image source={{ uri: item.image_url }} style={styles.productCardImage} resizeMode="contain" />

        <View style={styles.brandNameRow}>
          <Text style={styles.brandNameText}>{brandLabel(item.brand)}</Text>
          {!!item.logo_url && <Image source={{ uri: item.logo_url }} style={styles.brandLogo} resizeMode="contain" />}
        </View>

        <Text numberOfLines={2} style={styles.productCardName}>{item.name}</Text>

        <Text numberOfLines={2} style={styles.productCardSpecs}>
          {item.storage || ''} {item.ram ? `- ${item.ram}` : ''} {item.color ? `- ${item.color}` : ''}
        </Text>

        <View style={styles.colorAndMetaRow}>
          <View style={[styles.colorDot, { backgroundColor: item.color_hex || '#D1D5DB' }]} />
          <Text style={styles.deliveryBlueText}>{t('sellerDelivery', 'توصيل البائع')}</Text>
          <Ionicons name="car-outline" size={13} color={COLORS.blue} />
        </View>

        <Text style={styles.monthlyPriceText}>{formatIQD(item.monthly_price_iqd)} /{t('monthly', 'شهرياً')}</Text>

        <View style={styles.storeTagWrap}>
          <Text style={styles.storeTag}>zenopay shop</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeaturedSection = () => (
    <>
      <View style={styles.rowTitleWrap}>
        <Text style={styles.rowTitle}>{t('newProducts', 'المنتجات الجديدة')}</Text>
        <TouchableOpacity>
          <Text style={styles.rowLink}>{t('showAll', 'عرض الكل')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={featuredProducts}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.gridRow}
        keyExtractor={(item) => item.id}
        renderItem={renderProductCard}
      />
    </>
  );

  const renderAllProductsSection = () => (
    <>
      <View style={styles.rowTitleWrap}>
        <Text style={styles.rowTitle}>{t('allMobiles', 'كل الموبايلات')}</Text>
      </View>

      <FlatList
        data={filteredProducts}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.gridRow}
        keyExtractor={(item) => `all-${item.id}`}
        renderItem={renderProductCard}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="phone-portrait-outline" size={34} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>{t('noProductsFound', 'لا توجد منتجات')}</Text>
          </View>
        }
      />
    </>
  );

  const totalMonthly = (selectedProduct?.monthly_price_iqd || 0) * form.quantity;
  const totalFull = (selectedProduct?.price_iqd || 0) * form.quantity;

  return (
    <View style={styles.container}>
      <ScreenHeaderOff />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {renderTopBar()}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {renderSearchAndTabs()}
          {renderHero()}
          {renderPromoCards()}
          {renderFeaturedSection()}
          {renderAllProductsSection()}
          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.bottomBuyBar}>
          <TouchableOpacity style={styles.bottomPriceSide}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={COLORS.black} />
            <Text style={styles.bottomPriceSideText}>{formatIQD(165000)} /{t('monthly', 'شهرياً')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomBuyBtn}>
            <Text style={styles.bottomBuyBtnText}>{t('buyNow', 'أشتري الآن')}</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={checkoutOpen} animationType="slide" transparent onRequestClose={() => setCheckoutOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{t('addAddressInfo', 'إضافة معلومات العنوان')}</Text>
                <TouchableOpacity onPress={() => setCheckoutOpen(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedProduct && (
                  <>
                    <View style={styles.checkoutProductRow}>
                      <Image source={{ uri: selectedProduct.image_url }} style={styles.checkoutThumb} resizeMode="contain" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checkoutProductName} numberOfLines={2}>{selectedProduct.name}</Text>
                        <Text style={styles.checkoutProductSub}>
                          {selectedProduct.color || '-'} • {selectedProduct.storage || '-'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.inputFieldWrap}>
                      <Text style={styles.fieldLabel}>{t('city', 'المدينة')}</Text>
                      <TextInput
                        style={styles.inputField}
                        value={form.city}
                        onChangeText={(v) => setForm((p) => ({ ...p, city: v }))}
                        placeholder={t('enterCity', 'ادخل المدينة')}
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>

                    <View style={styles.inputFieldWrap}>
                      <Text style={styles.fieldLabel}>{t('streetAddress', 'العنوان')}</Text>
                      <TextInput
                        style={styles.inputField}
                        value={form.street}
                        onChangeText={(v) => setForm((p) => ({ ...p, street: v }))}
                        placeholder={t('enterStreetAddress', 'ادخل العنوان')}
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>

                    <View style={styles.inputFieldWrap}>
                      <Text style={styles.fieldLabel}>{t('phoneNumber', 'رقم الهاتف')}</Text>
                      <TextInput
                        style={styles.inputField}
                        value={form.phoneNumber}
                        onChangeText={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
                        placeholder={t('enterPhoneNumber', 'ادخل رقم الهاتف')}
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.inputFieldWrap}>
                      <Text style={styles.fieldLabel}>{t('fullName', 'الاسم الكامل')}</Text>
                      <TextInput
                        style={styles.inputField}
                        value={form.fullName}
                        onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))}
                        placeholder={t('enterFullName', 'ادخل الاسم الكامل')}
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>

                    <View style={styles.inputFieldWrap}>
                      <Text style={styles.fieldLabel}>{t('email', 'البريد الإلكتروني')}</Text>
                      <TextInput
                        style={styles.inputField}
                        value={form.email}
                        onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                        placeholder={t('enterEmail', 'ادخل البريد الإلكتروني')}
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputFieldWrap}>
                      <Text style={styles.fieldLabel}>{t('deliveryNote', 'ملاحظة')}</Text>
                      <TextInput
                        style={[styles.inputField, styles.textArea]}
                        value={form.note}
                        onChangeText={(v) => setForm((p) => ({ ...p, note: v }))}
                        placeholder={t('enterDeliveryNote', 'اكتب ملاحظة إضافية')}
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                      />
                    </View>

                    <View style={styles.qtyRowWrap}>
                      <Text style={styles.fieldLabel}>{t('quantity', 'الكمية')}</Text>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => setForm((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                        >
                          <Ionicons name="remove" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{form.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => setForm((p) => ({ ...p, quantity: p.quantity + 1 }))}
                        >
                          <Ionicons name="add" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.summaryCard}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('monthlyInstallment', 'القسط الشهري')}</Text>
                        <Text style={styles.summaryValue}>{formatIQD(totalMonthly)}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('numberOfMonths', 'عدد أشهر الأقساط')}</Text>
                        <Text style={styles.summaryValue}>{selectedProduct.months_count || 10}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('totalInstallments', 'مجموع الأقساط الكلي')}</Text>
                        <Text style={styles.summaryValue}>{formatIQD(totalFull)}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.continueBtn, createOrderMutation.isPending && { opacity: 0.7 }]}
                      onPress={() => createOrderMutation.mutate()}
                      disabled={createOrderMutation.isPending}
                    >
                      {createOrderMutation.isPending ? (
                        <ActivityIndicator color="#111827" />
                      ) : (
                        <Text style={styles.continueBtnText}>{t('continue', 'أستمرار')}</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
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
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topSmallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(125,95,0,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSmallWideBtn: {
    minWidth: 46,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(125,95,0,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationPill: {
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  searchBox: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  tabsRow: {
    paddingTop: 14,
    gap: 10,
    paddingBottom: 8,
  },
  tabBtn: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FDEFB5',
    borderColor: COLORS.yellow,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#7A5B00',
  },
  heroWrap: {
    marginTop: 10,
  },
  categoryCircleRow: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 12,
  },
  categoryCircleItem: {
    width: 84,
    alignItems: 'center',
  },
  categoryCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryCircleLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  bigBanner: {
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 180,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bigBannerTextSide: {
    flex: 1,
  },
  bigBannerSmall: {
    color: '#7A5B00',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  bigBannerTitle: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  bigBannerPrice: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  blackBannerBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: COLORS.black,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackBannerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  bigBannerImage: {
    width: 132,
    height: 145,
  },
  promoGrid: {
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
  },
  promoLargeCard: {
    flex: 1.1,
    height: 190,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  promoLargeImage: {
    width: '100%',
    height: '100%',
  },
  promoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    justifyContent: 'flex-end',
    height: 90,
  },
  promoLargeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  promoLargeSub: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  promoSideColumn: {
    flex: 0.9,
    gap: 12,
  },
  promoMiniCardBlue: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    padding: 14,
    justifyContent: 'center',
  },
  promoMiniCardRed: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#FFF1F2',
    padding: 14,
    justifyContent: 'center',
  },
  promoPercentBlue: {
    color: '#312E81',
    fontSize: 34,
    fontWeight: '900',
  },
  promoMiniTitleBlue: {
    color: '#3730A3',
    fontSize: 18,
    fontWeight: '900',
  },
  promoMiniBrandBlue: {
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  promoPercentRed: {
    color: '#DC2626',
    fontSize: 34,
    fontWeight: '900',
  },
  promoMiniTitleRed: {
    color: '#991B1B',
    fontSize: 18,
    fontWeight: '900',
  },
  promoMiniBrandRed: {
    color: '#7F1D1D',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  rowTitleWrap: {
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  rowLink: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '800',
  },
  gridRow: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeGreen: {
    backgroundColor: '#E8F7E9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGreenText: {
    color: '#1A7F37',
    fontSize: 11,
    fontWeight: '800',
  },
  smallCartBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardImage: {
    width: '100%',
    height: 120,
    marginBottom: 8,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  brandNameText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  brandLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  productCardName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    minHeight: 40,
  },
  productCardSpecs: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 34,
    marginTop: 4,
  },
  colorAndMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  deliveryBlueText: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: '700',
  },
  monthlyPriceText: {
    marginTop: 10,
    color: COLORS.orange,
    fontSize: 22,
    fontWeight: '900',
  },
  storeTagWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  storeTag: {
    backgroundColor: COLORS.black,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  bottomBuyBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  bottomPriceSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  bottomPriceSideText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '900',
  },
  bottomBuyBtn: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBuyBtnText: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: '900',
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
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  checkoutProductRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
  },
  checkoutThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  checkoutProductName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
  },
  checkoutProductSub: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  inputFieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  inputField: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 86,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  qtyRowWrap: {
    marginTop: 2,
    marginBottom: 14,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    minWidth: 42,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },
  continueBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFD000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  continueBtnText: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: '900',
  },
});


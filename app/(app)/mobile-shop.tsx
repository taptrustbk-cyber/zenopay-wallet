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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import i18n from '@/lib/i18n';

import { iphoneProducts, MobileProduct } from '@/data/iphoneProducts';
import { samsungProducts } from '@/data/samsungProducts';
import { xiaomiProducts } from '@/data/xiaomiProducts';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

interface Brand {
  id: string;
  name: 'Samsung' | 'iPhone' | 'Xiaomi';
}

const brands: Brand[] = [
  { id: '1', name: 'Samsung' },
  { id: '2', name: 'iPhone' },
  { id: '3', name: 'Xiaomi' },
];

const getAllProducts = (brand: string): MobileProduct[] => {
  switch (brand) {
    case 'iPhone':
      return iphoneProducts;
    case 'Samsung':
      return samsungProducts;
    case 'Xiaomi':
      return xiaomiProducts;
    default:
      return [];
  }
};

const defaultColors = ['Black', 'White', 'Blue', 'Silver'];

// 🎨 White background + green cards/buttons + black text
const COLORS = {
  bg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  green: '#16A34A',
  greenCard: '#D1FAE5', // green box (soft)
  greenBorder: '#86EFAC',
  iconBoxGreen: '#16A34A',
  white: '#FFFFFF',
  inputBg: '#F3FBF6',
  infoBg: '#EAF7EF',
};

const brandIconName = (brand: Brand['name']) => {
  switch (brand) {
    case 'iPhone':
      return 'logo-apple';
    case 'Samsung':
      return 'logo-android';
    case 'Xiaomi':
      return 'phone-portrait-outline';
    default:
      return 'grid-outline';
  }
};

export default function MobileShopScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<MobileProduct | null>(null);
  const [selectedColor, setSelectedColor] = React.useState<string>('');
  const [fullName, setFullName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [city, setCity] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [note, setNote] = React.useState('');

  // ✅ This removes the TOP dark-blue header ("Back / Mobile Shop") for sure
  // even if your _layout has header enabled.
  // Keep only the header inside the screen.
  const ScreenHeaderOff = () => <Stack.Screen options={{ headerShown: false }} />;

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleBrandSelect = (brandName: string) => setSelectedBrand(brandName);

  const handleProductSelect = (product: MobileProduct) => {
    setSelectedProduct(product);
    setSelectedColor(defaultColors[0]);
  };

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedProduct) throw new Error('Missing data');

      const balance = walletQuery.data?.balance || 0;
      if (balance < selectedProduct.price) throw new Error('Insufficient balance');

      const { data, error } = await supabase.rpc('purchase_market_item', {
        p_user_id: user.id,
        p_product_type: 'mobile',
        p_amount: 1,
        p_price: selectedProduct.price,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Purchase failed');

      const { error: orderError } = await supabase.from('orders').insert({
        user_id: user.id,
        product_type: 'mobile',
        product_name: selectedProduct.name,
        product_brand: selectedProduct.brand,
        price: selectedProduct.price,
        color: selectedColor,
        full_name: fullName,
        phone_number: phoneNumber,
        city,
        street_address: street,
        email,
        delivery_note: note,
        delivery_status: 'pending',
      });

      if (orderError) console.error('Order log error:', orderError);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert(
        i18n.t('orderPlaced'),
        `${i18n.t('orderPlacedMessage')}\n\n${i18n.t('deliveryEstimate')}`,
        [
          {
            text: i18n.t('done'),
            onPress: () => {
              setSelectedBrand(null);
              setSelectedProduct(null);
              setFullName('');
              setPhoneNumber('');
              setCity('');
              setStreet('');
              setEmail('');
              setNote('');
              setSelectedColor('');
              router.back();
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      if (error.message === 'Insufficient balance') {
        Alert.alert(i18n.t('error'), i18n.t('insufficientBalance') || "Sorry, you don't have enough balance.");
      } else {
        Alert.alert(i18n.t('error'), error.message || 'Failed to place order');
      }
    },
  });

  const handleCheckout = () => {
    if (!fullName || !phoneNumber || !city || !street || !email) {
      Alert.alert(i18n.t('error'), i18n.t('fillAllFields') || 'Please fill all required fields');
      return;
    }
    purchaseMutation.mutate();
  };

  // ---------- CHECKOUT SCREEN ----------
  if (selectedProduct) {
    const description = `The ${selectedProduct.name} delivers excellent performance, a high-quality display, and a reliable battery life suitable for daily use. Ideal for work, media, and communication with premium build quality. Storage: ${selectedProduct.storage}, Battery Health: ${selectedProduct.battery}.`;

    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ScreenHeaderOff />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
              <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color={COLORS.green} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: COLORS.text }]}>{i18n.t('checkout')}</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={[styles.productImageCard, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}>
              <Image source={{ uri: selectedProduct.imageUrl }} style={styles.productImage} resizeMode="contain" />
            </View>

            <View style={[styles.productSummary, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}>
              <Text style={[styles.productName, { color: COLORS.text }]}>{selectedProduct.name}</Text>
              <Text style={[styles.productPrice, { color: COLORS.green }]}>${selectedProduct.price}</Text>

              <View style={styles.specsContainer}>
                <View style={styles.specItem}>
                  <Ionicons name="cube-outline" size={16} color={COLORS.green} />
                  <Text style={[styles.specText, { color: COLORS.textSecondary }]}>{selectedProduct.storage}</Text>
                </View>
                <View style={styles.specItem}>
                  <Ionicons name="battery-charging-outline" size={16} color={COLORS.green} />
                  <Text style={[styles.specText, { color: COLORS.textSecondary }]}>Battery: {selectedProduct.battery}</Text>
                </View>
                <View style={styles.specItem}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.green} />
                  <Text style={[styles.specText, { color: COLORS.textSecondary }]}>1 Year Warranty</Text>
                </View>
              </View>

              <Text style={[styles.productDescription, { color: COLORS.textSecondary }]}>{description}</Text>
            </View>

            <View style={[styles.colorSection, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}>
              <Text style={[styles.sectionLabel, { color: COLORS.text }]}>{i18n.t('selectColor')}</Text>
              <View style={styles.colorOptions}>
                {defaultColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { borderColor: selectedColor === color ? COLORS.green : COLORS.border },
                      selectedColor === color && { backgroundColor: COLORS.infoBg },
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    <Text style={[styles.colorText, { color: COLORS.text }]}>{color}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{i18n.t('deliveryInformation')}</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>{i18n.t('fullName') || 'Full Name'}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={i18n.t('enterFullName') || 'Enter your full name'}
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>{i18n.t('phoneNumber')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder={i18n.t('enterPhoneNumber')}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>{i18n.t('city')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder={i18n.t('enterCity')}
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>{i18n.t('streetAddress')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border }]}
                  value={street}
                  onChangeText={setStreet}
                  placeholder={i18n.t('enterStreetAddress')}
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>{i18n.t('email')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={i18n.t('enterEmail')}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
                  {i18n.t('deliveryNote')} ({i18n.t('optional')})
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border },
                  ]}
                  value={note}
                  onChangeText={setNote}
                  placeholder={i18n.t('enterDeliveryNote')}
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={[styles.deliveryInfo, { backgroundColor: COLORS.infoBg, borderColor: COLORS.greenBorder }]}>
              <Ionicons name="information-circle" size={22} color={COLORS.green} />
              <Text style={[styles.deliveryInfoText, { color: COLORS.text }]}>{i18n.t('deliveryEstimate')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutButton, { backgroundColor: COLORS.green, opacity: purchaseMutation.isPending ? 0.7 : 1 }]}
              onPress={handleCheckout}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkoutButtonText}>{i18n.t('placeOrder')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ---------- BRAND PRODUCTS GRID ----------
  if (selectedBrand) {
    const brandProducts = getAllProducts(selectedBrand).filter((p) => p.is_active !== false);

    const renderHeader = () => (
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => setSelectedBrand(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.green} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>{selectedBrand}</Text>
        <View style={{ width: 24 }} />
      </View>
    );

    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ScreenHeaderOff />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <FlatList
            data={brandProducts}
            numColumns={2}
            contentContainerStyle={[styles.content, styles.productsGrid]}
            columnWrapperStyle={styles.productRow}
            ListHeaderComponent={renderHeader}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.productGridCard, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}
                onPress={() => handleProductSelect(item)}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.gridProductImage} resizeMode="contain" />
                <Text style={[styles.gridProductName, { color: COLORS.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.gridProductStorage, { color: COLORS.textSecondary }]}>{item.storage}</Text>
                <Text style={[styles.gridProductBattery, { color: COLORS.textSecondary }]}>Battery: {item.battery}</Text>
                <Text style={[styles.gridProductPrice, { color: COLORS.green }]}>${item.price}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </SafeAreaView>
      </View>
    );
  }

  // ---------- MAIN BRAND LIST ----------
  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <ScreenHeaderOff />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* ✅ Only THIS header remains (no top dark-blue header anymore) */}
          <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={COLORS.green} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: COLORS.text }]}>{i18n.t('mobileShop')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>{i18n.t('selectBrand')}</Text>

          <View style={styles.brandsGrid}>
            {brands.map((brand) => (
              <TouchableOpacity
                key={brand.id}
                style={[styles.brandCard, { backgroundColor: COLORS.greenCard, borderColor: COLORS.greenBorder }]}
                onPress={() => handleBrandSelect(brand.name)}
                activeOpacity={0.85}
              >
                {/* ✅ Silver icon box -> GREEN icon box */}
                <View style={[styles.brandIconContainer, { backgroundColor: COLORS.iconBoxGreen }]}>
                  <Ionicons name={brandIconName(brand.name)} size={26} color={COLORS.white} />
                </View>

                {/* ✅ Black text */}
                <Text style={[styles.brandName, { color: COLORS.text }]}>{brand.name}</Text>

                <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 6, borderRadius: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700' as const },

  subtitle: { fontSize: 14, textAlign: 'center' as const, marginBottom: 18 },

  brandsGrid: { gap: 14 },

  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
  },
  brandIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
  },

  // Checkout / Product styles
  productSummary: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 6,
    textAlign: 'center' as const,
  },
  productPrice: { fontSize: 28, fontWeight: '900' as const, marginBottom: 14 },

  specsContainer: { gap: 8 },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  specText: { fontSize: 14 },

  colorSection: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  sectionLabel: { fontSize: 16, fontWeight: '700' as const, marginBottom: 12 },
  colorOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 2 },
  colorText: { fontSize: 14, fontWeight: '700' as const },

  formSection: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800' as const, marginBottom: 16 },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, marginBottom: 8, fontWeight: '600' as const },
  input: { padding: 12, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },

  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  deliveryInfoText: { flex: 1, fontSize: 14, fontWeight: '600' as const },

  checkoutButton: { padding: 16, borderRadius: 14, alignItems: 'center' },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' as const },

  productImageCard: { padding: 16, borderRadius: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1 },
  productImage: { width: '100%', height: 200 },
  productDescription: { fontSize: 13, lineHeight: 20, marginTop: 12 },

  // Products grid
  productsGrid: { paddingBottom: 20 },
  productRow: { justifyContent: 'space-between', marginBottom: 14 },
  productGridCard: { width: '48%', padding: 12, borderRadius: 16, borderWidth: 1 },
  gridProductImage: { width: '100%', height: 140, borderRadius: 12, marginBottom: 10 },
  gridProductName: { fontSize: 14, fontWeight: '800' as const, marginBottom: 4 },
  gridProductStorage: { fontSize: 12, marginBottom: 2 },
  gridProductBattery: { fontSize: 11, marginBottom: 8 },
  gridProductPrice: { fontSize: 16, fontWeight: '900' as const },
});

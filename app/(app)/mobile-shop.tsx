import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import i18n from '@/lib/i18n';
import React from 'react';

interface Brand {
  id: string;
  name: string;
  icon: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  colors: string[];
  specs: string[];
}

const brands: Brand[] = [
  { id: '1', name: 'Samsung', icon: 'mobile-alt' },
  { id: '2', name: 'iPhone', icon: 'mobile-alt' },
  { id: '3', name: 'Xiaomi', icon: 'mobile-alt' },
];

const products: Product[] = [
  {
    id: '1',
    name: 'iPhone 17 Pro Max',
    brand: 'iPhone',
    price: 1250,
    colors: ['White', 'Blue', 'Orange'],
    specs: ['eSIM', '1 Year Warranty'],
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    brand: 'Samsung',
    price: 1100,
    colors: ['Black', 'Silver', 'Green'],
    specs: ['Dual SIM', '1 Year Warranty'],
  },
  {
    id: '3',
    name: 'Xiaomi 14 Pro',
    brand: 'Xiaomi',
    price: 799,
    colors: ['Black', 'White', 'Blue'],
    specs: ['Dual SIM', '1 Year Warranty'],
  },
];

export default function MobileShopScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = React.useState<string>('');
  
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [city, setCity] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [note, setNote] = React.useState('');

  const handleBrandSelect = (brandName: string) => {
    setSelectedBrand(brandName);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSelectedColor(product.colors[0]);
  };

  const handleCheckout = () => {
    if (!phoneNumber || !city || !street || !email) {
      Alert.alert(i18n.t('error'), i18n.t('fillAllFields'));
      return;
    }

    Alert.alert(
      i18n.t('orderPlaced'),
      `${i18n.t('orderPlacedMessage')}\n\n${i18n.t('deliveryEstimate')}`,
      [
        {
          text: i18n.t('done'),
          onPress: () => {
            setSelectedBrand(null);
            setSelectedProduct(null);
            setPhoneNumber('');
            setCity('');
            setStreet('');
            setEmail('');
            setNote('');
            router.back();
          },
        },
      ]
    );
  };

  if (selectedProduct) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {i18n.t('checkout')}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={[styles.productSummary, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.productName, { color: theme.colors.text }]}>
                {selectedProduct.name}
              </Text>
              <Text style={[styles.productPrice, { color: theme.colors.primary }]}>
                ${selectedProduct.price}
              </Text>
              <View style={styles.specsContainer}>
                {selectedProduct.specs.map((spec, index) => (
                  <View key={index} style={styles.specItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={[styles.specText, { color: theme.colors.textSecondary }]}>
                      {spec}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.colorSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
                {i18n.t('selectColor')}
              </Text>
              <View style={styles.colorOptions}>
                {selectedProduct.colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { borderColor: selectedColor === color ? theme.colors.primary : theme.colors.border },
                      selectedColor === color && styles.selectedColorOption,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    <Text style={[styles.colorText, { color: theme.colors.text }]}>
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {i18n.t('deliveryInformation')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  {i18n.t('phoneNumber')}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder={i18n.t('enterPhoneNumber')}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  {i18n.t('city')}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder={i18n.t('enterCity')}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  {i18n.t('streetAddress')}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                  value={street}
                  onChangeText={setStreet}
                  placeholder={i18n.t('enterStreetAddress')}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  {i18n.t('email')}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={i18n.t('enterEmail')}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  {i18n.t('deliveryNote')} ({i18n.t('optional')})
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                  value={note}
                  onChangeText={setNote}
                  placeholder={i18n.t('enterDeliveryNote')}
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={[styles.deliveryInfo, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <Text style={[styles.deliveryInfoText, { color: theme.colors.text }]}>
                {i18n.t('deliveryEstimate')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>{i18n.t('placeOrder')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (selectedBrand) {
    const brandProducts = products.filter((p) => p.brand === selectedBrand);

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelectedBrand(null)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {selectedBrand}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.productsList}>
              {brandProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleProductSelect(product)}
                >
                  <View style={[styles.productIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <FontAwesome5 name="mobile-alt" size={48} color="#F59E0B" />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productCardName, { color: theme.colors.text }]}>
                      {product.name}
                    </Text>
                    <View style={styles.productSpecs}>
                      {product.specs.map((spec, index) => (
                        <Text key={index} style={[styles.productSpec, { color: theme.colors.textSecondary }]}>
                          • {spec}
                        </Text>
                      ))}
                    </View>
                    <Text style={[styles.productCardPrice, { color: theme.colors.primary }]}>
                      ${product.price}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {i18n.t('mobileShop')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {i18n.t('selectBrand')}
          </Text>

          <View style={styles.brandsGrid}>
            {brands.map((brand) => (
              <TouchableOpacity
                key={brand.id}
                style={[styles.brandCard, { backgroundColor: theme.colors.card }]}
                onPress={() => handleBrandSelect(brand.name)}
              >
                <View style={[styles.brandIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <FontAwesome5 name={brand.icon} size={48} color="#F59E0B" />
                </View>
                <Text style={[styles.brandName, { color: theme.colors.text }]}>
                  {brand.name}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  brandsGrid: {
    gap: 16,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  brandIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  productsList: {
    gap: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  productIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productCardName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  productSpecs: {
    marginBottom: 8,
  },
  productSpec: {
    fontSize: 12,
  },
  productCardPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  productSummary: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  productName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  productPrice: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  specsContainer: {
    gap: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specText: {
    fontSize: 14,
  },
  colorSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  selectedColorOption: {
    borderWidth: 2,
  },
  colorText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  formSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  deliveryInfoText: {
    flex: 1,
    fontSize: 14,
  },
  checkoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

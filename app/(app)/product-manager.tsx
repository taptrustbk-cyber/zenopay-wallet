import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useMemo } from 'react';
import { iphoneProducts, MobileProduct } from '@/data/iphoneProducts';
import { samsungProducts } from '@/data/samsungProducts';
import { xiaomiProducts } from '@/data/xiaomiProducts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

interface CardProduct {
  id: string;
  name: string;
  category: 'Card' | 'Gift Card';
  brand: string;
  price: number;
  is_active: boolean;
  amount?: number;
}

const CARD_PRODUCTS: CardProduct[] = [
  { id: 'korek_5000', name: 'Korek 5,000 IQD', category: 'Card', brand: 'Korek', price: 3.6, amount: 5000, is_active: true },
  { id: 'korek_10000', name: 'Korek 10,000 IQD', category: 'Card', brand: 'Korek', price: 7.2, amount: 10000, is_active: true },
  { id: 'korek_20000', name: 'Korek 20,000 IQD', category: 'Card', brand: 'Korek', price: 14.4, amount: 20000, is_active: true },
  { id: 'zain_5000', name: 'Zain 5,000 IQD', category: 'Card', brand: 'Zain', price: 3.6, amount: 5000, is_active: true },
  { id: 'zain_10000', name: 'Zain 10,000 IQD', category: 'Card', brand: 'Zain', price: 7.2, amount: 10000, is_active: true },
  { id: 'zain_20000', name: 'Zain 20,000 IQD', category: 'Card', brand: 'Zain', price: 14.4, amount: 20000, is_active: true },
  { id: 'asiacell_5000', name: 'Asiacell 5,000 IQD', category: 'Card', brand: 'Asiacell', price: 3.6, amount: 5000, is_active: true },
  { id: 'asiacell_10000', name: 'Asiacell 10,000 IQD', category: 'Card', brand: 'Asiacell', price: 7.2, amount: 10000, is_active: true },
  { id: 'asiacell_20000', name: 'Asiacell 20,000 IQD', category: 'Card', brand: 'Asiacell', price: 14.4, amount: 20000, is_active: true },
  { id: 'ftth_25gb', name: 'FTTH 25GB', category: 'Card', brand: 'FTTH', price: 5.0, is_active: true },
  { id: 'ftth_50gb', name: 'FTTH 50GB', category: 'Card', brand: 'FTTH', price: 9.0, is_active: true },
  { id: 'ftth_100gb', name: 'FTTH 100GB', category: 'Card', brand: 'FTTH', price: 16.0, is_active: true },
  { id: 'amazon_25', name: 'Amazon $25', category: 'Gift Card', brand: 'Amazon', price: 27, is_active: true },
  { id: 'amazon_50', name: 'Amazon $50', category: 'Gift Card', brand: 'Amazon', price: 53, is_active: true },
  { id: 'steam_20', name: 'Steam $20', category: 'Gift Card', brand: 'Steam', price: 22, is_active: true },
  { id: 'steam_50', name: 'Steam $50', category: 'Gift Card', brand: 'Steam', price: 53, is_active: true },
  { id: 'playstation_25', name: 'PlayStation $25', category: 'Gift Card', brand: 'PlayStation', price: 27, is_active: true },
  { id: 'playstation_50', name: 'PlayStation $50', category: 'Gift Card', brand: 'PlayStation', price: 53, is_active: true },
];

type AllProduct = (MobileProduct & { category: 'Mobile' }) | CardProduct;

const STORAGE_KEY = '@product_prices';

export default function ProductManagerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<AllProduct | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [productPrices, setProductPrices] = useState<Record<string, { price: number; is_active: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '') && profile?.role === 'admin';

  React.useEffect(() => {
    loadSavedPrices();
  }, []);

  const loadSavedPrices = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProductPrices(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePrices = async (prices: Record<string, { price: number; is_active: boolean }>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
      setProductPrices(prices);
    } catch (error) {
      console.error('Failed to save prices:', error);
    }
  };

  const allProducts: AllProduct[] = useMemo(() => {
    const mobiles = [
      ...iphoneProducts.map(p => ({ ...p, category: 'Mobile' as const })),
      ...samsungProducts.map(p => ({ ...p, category: 'Mobile' as const })),
      ...xiaomiProducts.map(p => ({ ...p, category: 'Mobile' as const })),
    ];

    const allProds = [...mobiles, ...CARD_PRODUCTS];

    return allProds.map(prod => {
      const saved = productPrices[prod.id];
      if (saved) {
        return { ...prod, price: saved.price, is_active: saved.is_active };
      }
      return prod;
    });
  }, [productPrices]);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (categoryFilter !== 'All') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (brandFilter !== 'All') {
      filtered = filtered.filter(p => p.brand === brandFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [allProducts, categoryFilter, brandFilter, searchQuery]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set(allProducts.map(p => p.brand));
    return ['All', ...Array.from(brands).sort()];
  }, [allProducts]);

  const handleEditProduct = (product: AllProduct) => {
    setEditingProduct(product);
    setEditPrice(product.price.toString());
    setEditActive(product.is_active !== false);
  };

  const handleSaveProduct = () => {
    if (!editingProduct) return;

    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const updatedPrices = {
      ...productPrices,
      [editingProduct.id]: {
        price: newPrice,
        is_active: editActive,
      },
    };

    savePrices(updatedPrices);
    setEditingProduct(null);
    alert('Product updated successfully!');
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Access Denied</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Ionicons name="lock-closed" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.errorText, { color: theme.colors.text, marginTop: 20 }]}>
              You don&apos;t have permission to access this page
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Manage Prices</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.filterSection, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['All', 'Mobile', 'Card', 'Gift Card'].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  { backgroundColor: categoryFilter === cat ? theme.colors.primary : theme.colors.surface },
                ]}
                onPress={() => setCategoryFilter(cat)}
              >
                <Text style={[styles.filterChipText, { color: categoryFilter === cat ? '#FFF' : theme.colors.text }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterLabel, { color: theme.colors.text, marginTop: 12 }]}>Brand</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {uniqueBrands.map(brand => (
              <TouchableOpacity
                key={brand}
                style={[
                  styles.filterChip,
                  { backgroundColor: brandFilter === brand ? theme.colors.primary : theme.colors.surface },
                ]}
                onPress={() => setBrandFilter(brand)}
              >
                <Text style={[styles.filterChipText, { color: brandFilter === brand ? '#FFF' : theme.colors.text }]}>
                  {brand}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
            placeholder="Search by name..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.resultsText, { color: theme.colors.textSecondary }]}>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </Text>

          {filteredProducts.map(product => (
            <View key={product.id} style={[styles.productCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.productHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: theme.colors.text }]}>{product.name}</Text>
                  <View style={styles.productMeta}>
                    <Text style={[styles.productMetaText, { color: theme.colors.textSecondary }]}>
                      {product.category}
                    </Text>
                    <Text style={[styles.productMetaText, { color: theme.colors.textSecondary }]}>•</Text>
                    <Text style={[styles.productMetaText, { color: theme.colors.textSecondary }]}>
                      {product.brand}
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={[styles.productPrice, { color: theme.colors.primary }]}>${product.price}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: product.is_active !== false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                      <Text style={[styles.statusText, { color: product.is_active !== false ? '#10B981' : '#EF4444' }]}>
                        {product.is_active !== false ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleEditProduct(product)}
                >
                  <Ionicons name="create-outline" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <Modal visible={!!editingProduct} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Product</Text>

              {editingProduct && (
                <>
                  <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Product Name</Text>
                  <Text style={[styles.modalReadOnly, { color: theme.colors.textSecondary }]}>
                    {editingProduct.name}
                  </Text>

                  <Text style={[styles.modalLabel, { color: theme.colors.text, marginTop: 16 }]}>Category</Text>
                  <Text style={[styles.modalReadOnly, { color: theme.colors.textSecondary }]}>
                    {editingProduct.category}
                  </Text>

                  <Text style={[styles.modalLabel, { color: theme.colors.text, marginTop: 16 }]}>Price ($)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="decimal-pad"
                    placeholder="Enter price"
                    placeholderTextColor={theme.colors.textSecondary}
                  />

                  <View style={styles.switchRow}>
                    <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Active</Text>
                    <Switch
                      value={editActive}
                      onValueChange={setEditActive}
                      trackColor={{ false: '#767577', true: theme.colors.primary }}
                      thumbColor="#FFF"
                    />
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setEditingProduct(null)}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveProduct}
                >
                  <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Save</Text>
                </TouchableOpacity>
              </View>
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
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  filterSection: {
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  searchInput: {
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    marginTop: 8,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  resultsText: {
    fontSize: 14,
    marginBottom: 16,
  },
  productCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  productMetaText: {
    fontSize: 13,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  modalReadOnly: {
    fontSize: 16,
  },
  modalInput: {
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center' as const,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type AdminTab = 'categories' | 'cards' | 'orders';
type OrderStatus = 'pending' | 'success' | 'cancelled';

interface GiftCardCategoryRow {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  cover_image_url: string | null;
  icon_name: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface GiftCardRow {
  id: string;
  category_id: string;
  title: string;
  amount: number | null;
  price_iqd: number | null;
  image_url: string | null;
  stock_count: number | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  category?: GiftCardCategoryRow | null;
}

interface GiftCardOrderRow {
  id: string;
  user_id: string;
  gift_card_id: string | null;
  category_id: string | null;
  card_title: string | null;
  category_title: string | null;
  amount: number | null;
  price_iqd: number | null;
  status: string | null;
  pin_code: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

const BUCKET_NAME = 'product-images';
const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

const UI = {
  bg: '#FFFDF8',
  card: '#FFFFFF',
  text: '#221C0B',
  text2: '#806A12',
  text3: '#8A7B49',
  border: '#EFE3B3',
  border2: '#F3E3A7',
  yellow: '#FDE68A',
  yellowDark: '#9A7B00',
  yellowSoft: '#FFF6D9',
  green: '#16A34A',
  greenSoft: '#ECFDF3',
  red: '#D92D20',
  redSoft: '#FEF3F2',
  blue: '#2563EB',
  blueSoft: '#EFF6FF',
  inputBg: '#FFFCF2',
};

function formatIQD(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
}

function slugify(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

async function uploadImageToSupabase(uri: string, folder: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, blob, {
    cacheControl: '3600',
    upsert: true,
    contentType: blob.type || `image/${ext}`,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return data.publicUrl;
}

export default function AdminGiftCardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('categories');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [categories, setCategories] = useState<GiftCardCategoryRow[]>([]);
  const [cards, setCards] = useState<GiftCardRow[]>([]);
  const [orders, setOrders] = useState<GiftCardOrderRow[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GiftCardCategoryRow | null>(null);

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<GiftCardRow | null>(null);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<GiftCardOrderRow | null>(null);

  const [categoryTitle, setCategoryTitle] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categorySubtitle, setCategorySubtitle] = useState('');
  const [categoryIconName, setCategoryIconName] = useState('gift-outline');
  const [categorySortOrder, setCategorySortOrder] = useState('0');
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  const [categoryCoverImage, setCategoryCoverImage] = useState<string | null>(null);

  const [cardCategoryId, setCardCategoryId] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [cardPriceIqd, setCardPriceIqd] = useState('');
  const [cardStockCount, setCardStockCount] = useState('0');
  const [cardSortOrder, setCardSortOrder] = useState('0');
  const [cardIsActive, setCardIsActive] = useState(true);
  const [cardImage, setCardImage] = useState<string | null>(null);

  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
  const [orderPinCode, setOrderPinCode] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const isAdmin = useMemo(() => {
    return ADMIN_EMAILS.includes(String(user?.email || '').toLowerCase());
  }, [user?.email]);

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryTitle('');
    setCategorySlug('');
    setCategorySubtitle('');
    setCategoryIconName('gift-outline');
    setCategorySortOrder('0');
    setCategoryIsActive(true);
    setCategoryCoverImage(null);
  };

  const resetCardForm = () => {
    setEditingCard(null);
    setCardCategoryId(categories[0]?.id || '');
    setCardTitle('');
    setCardAmount('');
    setCardPriceIqd('');
    setCardStockCount('0');
    setCardSortOrder('0');
    setCardIsActive(true);
    setCardImage(null);
  };

  const resetOrderForm = () => {
    setEditingOrder(null);
    setOrderStatus('pending');
    setOrderPinCode('');
    setOrderNotes('');
  };

  const fetchAll = useCallback(async () => {
    try {
      const [categoriesRes, cardsRes, ordersRes] = await Promise.all([
        supabase
          .from('gift_card_categories')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),

        supabase
          .from('gift_cards')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),

        supabase
          .from('gift_card_orders')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (cardsRes.error) throw cardsRes.error;
      if (ordersRes.error) throw ordersRes.error;

      setCategories((categoriesRes.data || []) as GiftCardCategoryRow[]);

      const rawCards = (cardsRes.data || []) as GiftCardRow[];
      const mappedCards = rawCards.map((card) => ({
        ...card,
        category: (categoriesRes.data || []).find((c: any) => c.id === card.category_id) || null,
      }));
      setCards(mappedCards);

      setOrders((ordersRes.data || []) as GiftCardOrderRow[]);
    } catch (error: any) {
      console.log('admin gift card fetch error:', error);
      Alert.alert('Error', error?.message || 'Could not load admin gift card data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!cardCategoryId && categories.length > 0) {
      setCardCategoryId(categories[0].id);
    }
  }, [categories, cardCategoryId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
  };

  const pickImage = async (type: 'category' | 'card') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: true,
        aspect: type === 'category' ? [1, 1] : [4, 3],
      });

      if (result.canceled || !result.assets?.length) return;

      const uri = result.assets[0].uri;

      if (type === 'category') {
        setCategoryCoverImage(uri);
      } else {
        setCardImage(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not pick image.');
    }
  };

  const openCreateCategory = () => {
    resetCategoryForm();
    setCategoryModalOpen(true);
  };

  const openEditCategory = (row: GiftCardCategoryRow) => {
    setEditingCategory(row);
    setCategoryTitle(row.title || '');
    setCategorySlug(row.slug || '');
    setCategorySubtitle(row.subtitle || '');
    setCategoryIconName(row.icon_name || 'gift-outline');
    setCategorySortOrder(String(row.sort_order ?? 0));
    setCategoryIsActive(!!row.is_active);
    setCategoryCoverImage(row.cover_image_url || null);
    setCategoryModalOpen(true);
  };

  const saveCategory = async () => {
    try {
      if (!categoryTitle.trim()) {
        Alert.alert('Required', 'Category title is required.');
        return;
      }

      setSubmitting(true);

      let imageUrl = categoryCoverImage || null;
      if (categoryCoverImage && !categoryCoverImage.startsWith('http')) {
        imageUrl = await uploadImageToSupabase(categoryCoverImage, 'gift-categories');
      }

      const payload = {
        title: categoryTitle.trim(),
        slug: (categorySlug.trim() || slugify(categoryTitle)).trim(),
        subtitle: categorySubtitle.trim() || null,
        icon_name: categoryIconName.trim() || 'gift-outline',
        cover_image_url: imageUrl,
        sort_order: Number(categorySortOrder || 0),
        is_active: categoryIsActive,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('gift_card_categories')
          .update(payload)
          .eq('id', editingCategory.id);

        if (error) throw error;
        Alert.alert('Success', 'Category updated successfully.');
      } else {
        const { error } = await supabase.from('gift_card_categories').insert(payload);
        if (error) throw error;
        Alert.alert('Success', 'Category created successfully.');
      }

      setCategoryModalOpen(false);
      resetCategoryForm();
      await fetchAll();
    } catch (error: any) {
      console.log('save category error:', error);
      Alert.alert('Error', error?.message || 'Could not save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCategory = async (row: GiftCardCategoryRow) => {
    Alert.alert(
      'Delete category',
      `Delete "${row.title}"? This can also remove linked gift cards if your database cascade is enabled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('gift_card_categories')
                .delete()
                .eq('id', row.id);

              if (error) throw error;
              await fetchAll();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Could not delete category.');
            }
          },
        },
      ]
    );
  };

  const openCreateCard = () => {
    resetCardForm();
    setCardModalOpen(true);
  };

  const openEditCard = (row: GiftCardRow) => {
    setEditingCard(row);
    setCardCategoryId(row.category_id || categories[0]?.id || '');
    setCardTitle(row.title || '');
    setCardAmount(String(row.amount ?? ''));
    setCardPriceIqd(String(row.price_iqd ?? ''));
    setCardStockCount(String(row.stock_count ?? 0));
    setCardSortOrder(String(row.sort_order ?? 0));
    setCardIsActive(!!row.is_active);
    setCardImage(row.image_url || null);
    setCardModalOpen(true);
  };

  const saveCard = async () => {
    try {
      if (!cardCategoryId) {
        Alert.alert('Required', 'Please choose a category.');
        return;
      }
      if (!cardTitle.trim()) {
        Alert.alert('Required', 'Card title is required.');
        return;
      }
      if (!cardPriceIqd.trim()) {
        Alert.alert('Required', 'Price IQD is required.');
        return;
      }

      setSubmitting(true);

      let imageUrl = cardImage || null;
      if (cardImage && !cardImage.startsWith('http')) {
        imageUrl = await uploadImageToSupabase(cardImage, 'gift-card-items');
      }

      const payload = {
        category_id: cardCategoryId,
        title: cardTitle.trim(),
        amount: Number(cardAmount || 0),
        price_iqd: Number(cardPriceIqd || 0),
        image_url: imageUrl,
        stock_count: Number(cardStockCount || 0),
        sort_order: Number(cardSortOrder || 0),
        is_active: cardIsActive,
      };

      if (editingCard) {
        const { error } = await supabase
          .from('gift_cards')
          .update(payload)
          .eq('id', editingCard.id);

        if (error) throw error;
        Alert.alert('Success', 'Gift card updated successfully.');
      } else {
        const { error } = await supabase.from('gift_cards').insert(payload);
        if (error) throw error;
        Alert.alert('Success', 'Gift card created successfully.');
      }

      setCardModalOpen(false);
      resetCardForm();
      await fetchAll();
    } catch (error: any) {
      console.log('save card error:', error);
      Alert.alert('Error', error?.message || 'Could not save gift card.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCard = async (row: GiftCardRow) => {
    Alert.alert('Delete gift card', `Delete "${row.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('gift_cards').delete().eq('id', row.id);
            if (error) throw error;
            await fetchAll();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not delete gift card.');
          }
        },
      },
    ]);
  };

  const openEditOrder = (row: GiftCardOrderRow) => {
    setEditingOrder(row);
    setOrderStatus((['pending', 'success', 'cancelled'].includes(String(row.status || '').toLowerCase())
      ? String(row.status).toLowerCase()
      : 'pending') as OrderStatus);
    setOrderPinCode(row.pin_code || '');
    setOrderNotes(row.notes || '');
    setOrderModalOpen(true);
  };

  const saveOrder = async () => {
    try {
      if (!editingOrder) return;
      setSubmitting(true);

      const payload = {
        status: orderStatus,
        pin_code: orderPinCode.trim() || null,
        notes: orderNotes.trim() || null,
      };

      const { error } = await supabase
        .from('gift_card_orders')
        .update(payload)
        .eq('id', editingOrder.id);

      if (error) throw error;

      Alert.alert('Success', 'Order updated successfully.');
      setOrderModalOpen(false);
      resetOrderForm();
      await fetchAll();
    } catch (error: any) {
      console.log('save order error:', error);
      Alert.alert('Error', error?.message || 'Could not update order.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCardsBySelectedCategory = useMemo(() => {
    return cards;
  }, [cards]);

  const renderTabButton = (key: AdminTab, label: string, count: number) => {
    const active = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.9}
        style={[styles.tabButton, active && styles.tabButtonActive]}
        onPress={() => setActiveTab(key)}
      >
        <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
          {label}
        </Text>
        <View style={[styles.tabCount, active && styles.tabCountActive]}>
          <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerWrap}>
          <Ionicons name="lock-closed-outline" size={42} color="#B08A00" />
          <Text style={styles.emptyTitle}>Admin access only</Text>
          <Text style={styles.emptyText}>This page is only for admin account.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={22} color="#5A4700" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          Admin Gift Cards
        </Text>

        <TouchableOpacity onPress={onRefresh} activeOpacity={0.85} style={styles.iconButton}>
          <Ionicons name="refresh-outline" size={21} color="#5A4700" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroMini}>Gift Cards Admin</Text>
          <Text style={styles.heroTitle}>Full control for categories, products, and orders</Text>
          <Text style={styles.heroText}>
            Upload images to your bucket "{BUCKET_NAME}", manage category cover image,
            manage product image, and send PIN code with note to user after order.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {renderTabButton('categories', 'Categories', categories.length)}
          {renderTabButton('cards', 'Cards', cards.length)}
          {renderTabButton('orders', 'Orders', orders.length)}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#C99700" />
          </View>
        ) : (
          <>
            {activeTab === 'categories' && (
              <>
                <TouchableOpacity style={styles.primaryButton} onPress={openCreateCategory}>
                  <Ionicons name="add-circle-outline" size={18} color="#5A4700" />
                  <Text style={styles.primaryButtonText}>Add New Category</Text>
                </TouchableOpacity>

                <View style={styles.listWrap}>
                  {categories.map((row) => (
                    <View key={row.id} style={styles.itemCard}>
                      <View style={styles.itemTopRow}>
                        <View style={styles.badge}>
                          <Ionicons name="images-outline" size={14} color="#9A7B00" />
                          <Text style={styles.badgeText}>Primary Screen Category</Text>
                        </View>

                        <View
                          style={[
                            styles.statusSmall,
                            row.is_active ? styles.statusSuccess : styles.statusCancelled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusSmallText,
                              row.is_active
                                ? styles.statusSuccessText
                                : styles.statusCancelledText,
                            ]}
                          >
                            {row.is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.itemTitle}>{row.title}</Text>
                      {!!row.subtitle && <Text style={styles.itemSubtitle}>{row.subtitle}</Text>}

                      {!!row.cover_image_url && (
                        <Image source={{ uri: row.cover_image_url }} style={styles.largePreview} />
                      )}

                      <View style={styles.infoGrid}>
                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Slug</Text>
                          <Text style={styles.infoValue}>{row.slug}</Text>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Sort</Text>
                          <Text style={styles.infoValue}>{row.sort_order ?? 0}</Text>
                        </View>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => openEditCategory(row)}>
                          <Ionicons name="create-outline" size={16} color="#1D4ED8" />
                          <Text style={styles.secondaryButtonTextBlue}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dangerButton} onPress={() => deleteCategory(row)}>
                          <Ionicons name="trash-outline" size={16} color="#D92D20" />
                          <Text style={styles.dangerButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {categories.length === 0 && (
                    <View style={styles.emptyCard}>
                      <Ionicons name="folder-open-outline" size={38} color="#B08A00" />
                      <Text style={styles.emptyTitle}>No categories yet</Text>
                      <Text style={styles.emptyText}>
                        Create primary gift card categories here.
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {activeTab === 'cards' && (
              <>
                <TouchableOpacity style={styles.primaryButton} onPress={openCreateCard}>
                  <Ionicons name="add-circle-outline" size={18} color="#5A4700" />
                  <Text style={styles.primaryButtonText}>Add New Gift Card</Text>
                </TouchableOpacity>

                <View style={styles.listWrap}>
                  {filteredCardsBySelectedCategory.map((row) => (
                    <View key={row.id} style={styles.itemCard}>
                      <View style={styles.itemTopRow}>
                        <View style={styles.badge}>
                          <Ionicons name="gift-outline" size={14} color="#9A7B00" />
                          <Text style={styles.badgeText}>{row.category?.title || 'Gift Card'}</Text>
                        </View>

                        <View
                          style={[
                            styles.statusSmall,
                            row.is_active ? styles.statusSuccess : styles.statusCancelled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusSmallText,
                              row.is_active
                                ? styles.statusSuccessText
                                : styles.statusCancelledText,
                            ]}
                          >
                            {row.is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.itemTitle}>{row.title}</Text>

                      {!!row.image_url && (
                        <Image source={{ uri: row.image_url }} style={styles.largePreview} />
                      )}

                      <View style={styles.infoGrid}>
                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Amount</Text>
                          <Text style={styles.infoValue}>{row.amount ?? 0}</Text>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Price</Text>
                          <Text style={styles.infoValue}>{formatIQD(row.price_iqd)} IQD</Text>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Stock</Text>
                          <Text style={styles.infoValue}>{row.stock_count ?? 0}</Text>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Sort</Text>
                          <Text style={styles.infoValue}>{row.sort_order ?? 0}</Text>
                        </View>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => openEditCard(row)}>
                          <Ionicons name="create-outline" size={16} color="#1D4ED8" />
                          <Text style={styles.secondaryButtonTextBlue}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dangerButton} onPress={() => deleteCard(row)}>
                          <Ionicons name="trash-outline" size={16} color="#D92D20" />
                          <Text style={styles.dangerButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {cards.length === 0 && (
                    <View style={styles.emptyCard}>
                      <Ionicons name="gift-outline" size={38} color="#B08A00" />
                      <Text style={styles.emptyTitle}>No gift cards yet</Text>
                      <Text style={styles.emptyText}>
                        Add products here. These will appear when user opens a category in gift-cards.tsx.
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {activeTab === 'orders' && (
              <View style={styles.listWrap}>
                {orders.map((row) => {
                  const normalized = String(row.status || '').toLowerCase();
                  const isSuccess = normalized === 'success';
                  const isCancelled = normalized === 'cancelled';

                  return (
                    <View key={row.id} style={styles.itemCard}>
                      <View style={styles.itemTopRow}>
                        <View style={styles.badge}>
                          <Ionicons name="receipt-outline" size={14} color="#9A7B00" />
                          <Text style={styles.badgeText}>{row.category_title || 'Gift Card Order'}</Text>
                        </View>

                        <View
                          style={[
                            styles.statusSmall,
                            isSuccess
                              ? styles.statusSuccess
                              : isCancelled
                              ? styles.statusCancelled
                              : styles.statusPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusSmallText,
                              isSuccess
                                ? styles.statusSuccessText
                                : isCancelled
                                ? styles.statusCancelledText
                                : styles.statusPendingText,
                            ]}
                          >
                            {normalized || 'pending'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.itemTitle}>{row.card_title || 'Gift Card'}</Text>
                      <Text style={styles.itemSubtitle}>
                        User ID: {row.user_id}
                      </Text>

                      <View style={styles.infoGrid}>
                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Amount</Text>
                          <Text style={styles.infoValue}>{row.amount ?? 0}</Text>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Price</Text>
                          <Text style={styles.infoValue}>{formatIQD(row.price_iqd)} IQD</Text>
                        </View>

                        <View style={styles.infoBoxWide}>
                          <Text style={styles.infoLabel}>Date</Text>
                          <Text style={styles.infoValue}>{formatDate(row.created_at)}</Text>
                        </View>
                      </View>

                      {!!row.pin_code && (
                        <View style={styles.pinBox}>
                          <Text style={styles.pinLabel}>PIN code</Text>
                          <Text selectable style={styles.pinValue}>
                            {row.pin_code}
                          </Text>
                        </View>
                      )}

                      {!!row.notes && (
                        <View style={styles.notesBox}>
                          <Text style={styles.notesLabel}>Admin note</Text>
                          <Text style={styles.notesText}>{row.notes}</Text>
                        </View>
                      )}

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => openEditOrder(row)}>
                          <Ionicons name="create-outline" size={16} color="#1D4ED8" />
                          <Text style={styles.secondaryButtonTextBlue}>Set PIN / Note</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {orders.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Ionicons name="notifications-off-outline" size={38} color="#B08A00" />
                    <Text style={styles.emptyTitle}>No orders yet</Text>
                    <Text style={styles.emptyText}>
                      User gift card orders will appear here.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={categoryModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </Text>

              <Text style={styles.inputLabel}>Category title</Text>
              <TextInput
                style={styles.input}
                value={categoryTitle}
                onChangeText={(v) => {
                  setCategoryTitle(v);
                  if (!editingCategory) setCategorySlug(slugify(v));
                }}
                placeholder="PUBG UC"
                placeholderTextColor="#9E8F61"
              />

              <Text style={styles.inputLabel}>Slug</Text>
              <TextInput
                style={styles.input}
                value={categorySlug}
                onChangeText={setCategorySlug}
                placeholder="pubg-uc"
                placeholderTextColor="#9E8F61"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Subtitle</Text>
              <TextInput
                style={styles.input}
                value={categorySubtitle}
                onChangeText={setCategorySubtitle}
                placeholder="UC Cards"
                placeholderTextColor="#9E8F61"
              />

              <Text style={styles.inputLabel}>Icon name</Text>
              <TextInput
                style={styles.input}
                value={categoryIconName}
                onChangeText={setCategoryIconName}
                placeholder="gift-outline"
                placeholderTextColor="#9E8F61"
              />

              <Text style={styles.inputLabel}>Sort order</Text>
              <TextInput
                style={styles.input}
                value={categorySortOrder}
                onChangeText={setCategorySortOrder}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9E8F61"
              />

              <View style={styles.switchRow}>
                <Text style={styles.inputLabelNoMargin}>Active</Text>
                <Switch value={categoryIsActive} onValueChange={setCategoryIsActive} />
              </View>

              <Text style={styles.inputLabel}>Primary image for gift-cards.tsx</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('category')}>
                <Ionicons name="image-outline" size={18} color="#5A4700" />
                <Text style={styles.uploadButtonText}>Choose / Replace Image</Text>
              </TouchableOpacity>

              {!!categoryCoverImage && (
                <Image source={{ uri: categoryCoverImage }} style={styles.modalPreviewImage} />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setCategoryModalOpen(false);
                    resetCategoryForm();
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalSaveBtn} onPress={saveCategory} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#5A4700" />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingCategory ? 'Update' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={cardModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingCard ? 'Edit Gift Card' : 'Create Gift Card'}
              </Text>

              <Text style={styles.inputLabel}>Choose category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                {categories.map((cat) => {
                  const active = cardCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCardCategoryId(cat.id)}
                      style={[styles.choiceChip, active && styles.choiceChipActive]}
                    >
                      <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                        {cat.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Gift card title</Text>
              <TextInput
                style={styles.input}
                value={cardTitle}
                onChangeText={setCardTitle}
                placeholder="60 UC PUBG"
                placeholderTextColor="#9E8F61"
              />

              <Text style={styles.inputLabel}>Balance / amount</Text>
              <TextInput
                style={styles.input}
                value={cardAmount}
                onChangeText={setCardAmount}
                placeholder="60"
                keyboardType="numeric"
                placeholderTextColor="#9E8F61"
              />

              <Text style={styles.inputLabel}>Price IQD</Text>
              <TextInput
                style={styles.input}
                value={cardPriceIqd}
                onChangeText={setCardPriceIqd}
                placeholder="1500"
                keyboardType="numeric"
                placeholderTextColor="#9E8F61"
              />

              <Text style={styles.inputLabel}>Stock count</Text>
              <TextInput
                style={styles.input}
                value={cardStockCount}
                onChangeText={setCardStockCount}
                placeholder="100"
                keyboardType="numeric"
                placeholderTextColor="#9E8F61"
              />

              <Text style={styles.inputLabel}>Sort order</Text>
              <TextInput
                style={styles.input}
                value={cardSortOrder}
                onChangeText={setCardSortOrder}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9E8F61"
              />

              <View style={styles.switchRow}>
                <Text style={styles.inputLabelNoMargin}>Active</Text>
                <Switch value={cardIsActive} onValueChange={setCardIsActive} />
              </View>

              <Text style={styles.inputLabel}>Product image for list screen</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('card')}>
                <Ionicons name="image-outline" size={18} color="#5A4700" />
                <Text style={styles.uploadButtonText}>Choose / Replace Product Image</Text>
              </TouchableOpacity>

              {!!cardImage && (
                <Image source={{ uri: cardImage }} style={styles.modalPreviewImageWide} />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setCardModalOpen(false);
                    resetCardForm();
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalSaveBtn} onPress={saveCard} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#5A4700" />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingCard ? 'Update' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={orderModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Set PIN / Note for Order</Text>

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusSelectorRow}>
                {(['pending', 'success', 'cancelled'] as OrderStatus[]).map((status) => {
                  const active = orderStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.choiceChip, active && styles.choiceChipActive]}
                      onPress={() => setOrderStatus(status)}
                    >
                      <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>PIN code</Text>
              <TextInput
                style={styles.input}
                value={orderPinCode}
                onChangeText={setOrderPinCode}
                placeholder="716382637363"
                placeholderTextColor="#9E8F61"
              />

              <Text style={styles.inputLabel}>Note for user</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={orderNotes}
                onChangeText={setOrderNotes}
                placeholder="Write admin note here..."
                placeholderTextColor="#9E8F61"
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setOrderModalOpen(false);
                    resetOrderForm();
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalSaveBtn} onPress={saveOrder} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#5A4700" />
                  ) : (
                    <Text style={styles.modalSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF9E8',
    borderBottomWidth: 1,
    borderBottomColor: '#F2E4B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E1AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#2A2412',
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },

  heroCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF6D9',
    borderWidth: 1,
    borderColor: '#F3E3A7',
    marginBottom: 14,
  },
  heroMini: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B08900',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    color: '#221C0B',
  },
  heroText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#806A12',
  },

  tabsRow: {
    paddingBottom: 4,
    gap: 10,
    marginBottom: 14,
  },
  tabButton: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FDE68A',
    borderColor: '#F3D35C',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6E644B',
  },
  tabButtonTextActive: {
    color: '#5A4700',
  },
  tabCount: {
    marginLeft: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountActive: {
    backgroundColor: '#FFF8D8',
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7A715A',
  },
  tabCountTextActive: {
    color: '#5A4700',
  },

  loaderWrap: {
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F3D35C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#5A4700',
  },

  listWrap: {
    gap: 14,
  },
  itemCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E1A2',
    backgroundColor: '#FFFBEF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9A7B00',
  },
  statusSmall: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusSmallText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  statusSuccess: {
    backgroundColor: '#ECFDF3',
  },
  statusSuccessText: {
    color: '#027A48',
  },
  statusPending: {
    backgroundColor: '#FFF8E8',
  },
  statusPendingText: {
    color: '#B58103',
  },
  statusCancelled: {
    backgroundColor: '#FEF3F2',
  },
  statusCancelledText: {
    color: '#D92D20',
  },

  itemTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '900',
    color: '#211C11',
    marginBottom: 6,
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#6E644B',
    marginBottom: 12,
  },

  largePreview: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    marginBottom: 12,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 14,
  },
  infoBox: {
    width: '48.5%',
    borderRadius: 16,
    backgroundColor: '#FFFCF2',
    borderWidth: 1,
    borderColor: '#F4E8BF',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  infoBoxWide: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFFCF2',
    borderWidth: 1,
    borderColor: '#F4E8BF',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: '#8A7B49',
    fontWeight: '800',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#241E0E',
    fontWeight: '900',
  },

  pinBox: {
    borderRadius: 16,
    backgroundColor: '#FFF8D8',
    borderWidth: 1,
    borderColor: '#F1DA85',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  pinLabel: {
    fontSize: 11,
    color: '#8E6F07',
    fontWeight: '800',
    marginBottom: 4,
  },
  pinValue: {
    fontSize: 17,
    color: '#3A2E00',
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  notesBox: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE5C6',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 11,
    color: '#8A7B49',
    fontWeight: '800',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#2A2412',
    fontWeight: '700',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonTextBlue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  dangerButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#D92D20',
  },

  emptyCard: {
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2C2410',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#7B7460',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,16,8,0.38)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#EFE3B3',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#221C0B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#8A7B49',
    marginBottom: 6,
    marginTop: 10,
  },
  inputLabelNoMargin: {
    fontSize: 12,
    fontWeight: '900',
    color: '#8A7B49',
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FFFCF2',
    borderWidth: 1,
    borderColor: '#F4E8BF',
    paddingHorizontal: 12,
    color: '#241E0E',
    fontWeight: '800',
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  switchRow: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FFFCF2',
    borderWidth: 1,
    borderColor: '#F4E8BF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  uploadButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F3D35C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#5A4700',
  },
  modalPreviewImage: {
    width: 120,
    height: 120,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    marginTop: 12,
    alignSelf: 'center',
  },
  modalPreviewImageWide: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    marginTop: 12,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingBottom: 6,
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#374151',
  },
  modalSaveBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F3D35C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#5A4700',
  },

  choiceChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipActive: {
    backgroundColor: '#FDE68A',
    borderColor: '#F3D35C',
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6E644B',
    textTransform: 'capitalize',
  },
  choiceChipTextActive: {
    color: '#5A4700',
  },
  statusSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

type GiftCategoryRow = {
  id: string;
  title: string | null;
  slug: string | null;
  subtitle: string | null;
  cover_image_url: string | null;
  icon_name: string | null;
  is_active: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
};

type GiftCardRow = {
  id: string;
  category_id: string | null;
  title: string | null;
  amount: number | null;
  price_iqd: number | null;
  image_url: string | null;
  stock_count: number | null;
  is_active: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
};

type FilterType = 'all' | 'available' | 'unavailable';
type SortType = 'newest' | 'oldest' | 'price_low' | 'price_high' | 'name_az';
type AdminTab = 'categories' | 'cards';

const BUCKET_NAME = 'product-images';

const UI = {
  bg: '#07122B',
  bg2: '#0A1736',
  card: '#0E1B40',
  card2: '#122252',
  border: 'rgba(255,255,255,0.08)',
  softBorder: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.68)',
  gold: '#F6E08F',
  goldDark: '#8B5E10',
  goldBorder: '#D8BE63',
  pillBg: 'rgba(246,224,143,0.10)',
  red: '#EF4444',
  green: '#75C06B',
  greenBg: 'rgba(117,192,107,0.18)',
  redBg: 'rgba(239,68,68,0.16)',
};

const GIFT_TYPES = [
  { key: 'pubg-uc', label: 'PUBG UC', icon: 'game-controller-outline' as const },
  { key: 'free-fire', label: 'Free Fire', icon: 'flame-outline' as const },
  { key: 'itunes', label: 'iTunes', icon: 'logo-apple' as const },
  { key: 'google-play', label: 'Google Play', icon: 'logo-google-playstore' as const },
  { key: 'steam', label: 'Steam', icon: 'desktop-outline' as const },
  { key: 'playstation', label: 'PlayStation', icon: 'logo-playstation' as const },
  { key: 'xbox', label: 'Xbox', icon: 'logo-xbox' as const },
  { key: 'amazon', label: 'Amazon', icon: 'bag-handle-outline' as const },
  { key: 'netflix', label: 'Netflix', icon: 'film-outline' as const },
  { key: 'spotify', label: 'Spotify', icon: 'musical-notes-outline' as const },
];

function formatIQD(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function slugify(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

function getSortLabel(sort: SortType) {
  switch (sort) {
    case 'oldest':
      return 'Oldest';
    case 'price_low':
      return 'Price Low';
    case 'price_high':
      return 'Price High';
    case 'name_az':
      return 'A-Z';
    default:
      return 'Newest';
  }
}

function getGiftTypeInfo(slug?: string | null) {
  const key = String(slug || '').trim().toLowerCase();
  return (
    GIFT_TYPES.find((p) => p.key === key) || {
      key,
      label: slug || 'Gift Card',
      icon: 'gift-outline' as const,
    }
  );
}

export default function AdminGiftCardScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('categories');

  const [categories, setCategories] = useState<GiftCategoryRow[]>([]);
  const [cards, setCards] = useState<GiftCardRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [categoryTitle, setCategoryTitle] = useState('PUBG UC');
  const [categorySlug, setCategorySlug] = useState('pubg-uc');
  const [categorySubtitle, setCategorySubtitle] = useState('');
  const [categoryCoverImage, setCategoryCoverImage] = useState('');
  const [categoryIsAvailable, setCategoryIsAvailable] = useState(true);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [cardPriceIqd, setCardPriceIqd] = useState('');
  const [cardStockCount, setCardStockCount] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [cardIsAvailable, setCardIsAvailable] = useState(true);

  const selectedCategory = useMemo(
    () => categories.find((x) => x.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const selectedGiftTypeInfo = getGiftTypeInfo(categorySlug);

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryTitle('PUBG UC');
    setCategorySlug('pubg-uc');
    setCategorySubtitle('');
    setCategoryCoverImage('');
    setCategoryIsAvailable(true);
  };

  const resetCardForm = () => {
    setEditingCardId(null);
    setCardTitle('');
    setCardAmount('');
    setCardPriceIqd('');
    setCardStockCount('');
    setCardImageUrl('');
    setCardIsAvailable(true);
    if (categories.length && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  };

  const fetchAll = async () => {
    try {
      const [categoriesRes, cardsRes] = await Promise.all([
        supabase
          .from('gift_card_categories')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('gift_cards')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (cardsRes.error) throw cardsRes.error;

      const categoriesData = (categoriesRes.data || []) as GiftCategoryRow[];
      const cardsData = (cardsRes.data || []) as GiftCardRow[];

      setCategories(categoriesData);
      setCards(cardsData);

      if (!selectedCategoryId && categoriesData.length > 0) {
        setSelectedCategoryId(categoriesData[0].id);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load gift cards data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
  };

  const categoryStats = useMemo(() => {
    const all = categories.length;
    const available = categories.filter((c) => !!c.is_active).length;
    const unavailable = categories.filter((c) => !c.is_active).length;
    return { all, available, unavailable };
  }, [categories]);

  const cardStats = useMemo(() => {
    const all = cards.length;
    const available = cards.filter((c) => !!c.is_active).length;
    const unavailable = cards.filter((c) => !c.is_active).length;
    return { all, available, unavailable };
  }, [cards]);

  const filteredCategories = useMemo(() => {
    let rows = [...categories];

    if (filter === 'available') rows = rows.filter((x) => !!x.is_active);
    if (filter === 'unavailable') rows = rows.filter((x) => !x.is_active);

    switch (sortBy) {
      case 'oldest':
        rows.sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );
        break;
      case 'name_az':
        rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        break;
      default:
        rows.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        break;
    }

    return rows;
  }, [categories, filter, sortBy]);

  const filteredCards = useMemo(() => {
    let rows = [...cards];

    if (filter === 'available') rows = rows.filter((x) => !!x.is_active);
    if (filter === 'unavailable') rows = rows.filter((x) => !x.is_active);

    switch (sortBy) {
      case 'oldest':
        rows.sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );
        break;
      case 'price_low':
        rows.sort((a, b) => Number(a.price_iqd || 0) - Number(b.price_iqd || 0));
        break;
      case 'price_high':
        rows.sort((a, b) => Number(b.price_iqd || 0) - Number(a.price_iqd || 0));
        break;
      case 'name_az':
        rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        break;
      default:
        rows.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        break;
    }

    return rows;
  }, [cards, filter, sortBy]);

  const cycleSort = () => {
    setSortBy((prev) => {
      if (prev === 'newest') return 'oldest';
      if (prev === 'oldest') return 'price_low';
      if (prev === 'price_low') return 'price_high';
      if (prev === 'price_high') return 'name_az';
      return 'newest';
    });
  };

  const pickAndUploadImage = async (mode: 'category' | 'card') => {
    try {
      setUploading(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: true,
        aspect: mode === 'category' ? [4, 4] : [4, 4],
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const mimeType = asset.mimeType || 'image/jpeg';
      const ext = mimeType.includes('png')
        ? 'png'
        : mimeType.includes('webp')
        ? 'webp'
        : 'jpg';

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const fileName = `${mode}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

      if (mode === 'category') {
        setCategoryCoverImage(data.publicUrl);
      } else {
        setCardImageUrl(data.publicUrl);
      }

      Alert.alert('Success', 'Image uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload error', error?.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const validateCategoryForm = () => {
    if (!categoryTitle.trim()) {
      Alert.alert('Missing title', 'Please enter gift card category title.');
      return false;
    }
    if (!categorySlug.trim()) {
      Alert.alert('Missing slug', 'Please enter category slug.');
      return false;
    }
    return true;
  };

  const validateCardForm = () => {
    if (!selectedCategoryId.trim()) {
      Alert.alert('Missing category', 'Please choose a category first.');
      return false;
    }
    if (!cardTitle.trim()) {
      Alert.alert('Missing title', 'Please enter gift card title.');
      return false;
    }
    if (!cardAmount.trim()) {
      Alert.alert('Missing amount', 'Please enter gift card balance or amount.');
      return false;
    }
    if (!cardPriceIqd.trim()) {
      Alert.alert('Missing price', 'Please enter price IQD.');
      return false;
    }
    return true;
  };

  const handleSubmitCategory = async () => {
    try {
      if (!validateCategoryForm()) return;

      setSubmitting(true);

      const payload = {
        title: categoryTitle.trim(),
        slug: slugify(categorySlug.trim()),
        subtitle: categorySubtitle.trim() || null,
        cover_image_url: categoryCoverImage.trim() || null,
        icon_name: getGiftTypeInfo(categorySlug).icon,
        is_active: categoryIsAvailable,
      };

      if (editingCategoryId) {
        const { error } = await supabase
          .from('gift_card_categories')
          .update(payload)
          .eq('id', editingCategoryId);

        if (error) throw error;
        Alert.alert('Updated', 'Gift card category updated successfully.');
      } else {
        const { error } = await supabase.from('gift_card_categories').insert(payload);
        if (error) throw error;
        Alert.alert('Added', 'Gift card category added successfully.');
      }

      resetCategoryForm();
      await fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save gift card category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCard = async () => {
    try {
      if (!validateCardForm()) return;

      setSubmitting(true);

      const payload = {
        category_id: selectedCategoryId,
        title: cardTitle.trim(),
        amount: Number(String(cardAmount).replace(/,/g, '')),
        price_iqd: Number(String(cardPriceIqd).replace(/,/g, '')),
        image_url: cardImageUrl.trim() || null,
        stock_count: Number(String(cardStockCount || '0').replace(/,/g, '')),
        is_active: cardIsAvailable,
      };

      if (editingCardId) {
        const { error } = await supabase
          .from('gift_cards')
          .update(payload)
          .eq('id', editingCardId);

        if (error) throw error;
        Alert.alert('Updated', 'Gift card updated successfully.');
      } else {
        const { error } = await supabase.from('gift_cards').insert(payload);
        if (error) throw error;
        Alert.alert('Added', 'Gift card added successfully.');
      }

      resetCardForm();
      await fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save gift card.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = (category: GiftCategoryRow) => {
    setActiveTab('categories');
    setEditingCategoryId(category.id);
    setCategoryTitle(String(category.title || ''));
    setCategorySlug(String(category.slug || ''));
    setCategorySubtitle(String(category.subtitle || ''));
    setCategoryCoverImage(String(category.cover_image_url || ''));
    setCategoryIsAvailable(!!category.is_active);
  };

  const handleEditCard = (card: GiftCardRow) => {
    setActiveTab('cards');
    setEditingCardId(card.id);
    setSelectedCategoryId(String(card.category_id || ''));
    setCardTitle(String(card.title || ''));
    setCardAmount(String(card.amount || ''));
    setCardPriceIqd(String(card.price_iqd || ''));
    setCardStockCount(String(card.stock_count || ''));
    setCardImageUrl(String(card.image_url || ''));
    setCardIsAvailable(!!card.is_active);
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert('Delete category', 'Are you sure you want to delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('gift_card_categories').delete().eq('id', id);
            if (error) throw error;
            await fetchAll();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not delete category.');
          }
        },
      },
    ]);
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert('Delete card', 'Are you sure you want to delete this gift card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('gift_cards').delete().eq('id', id);
            if (error) throw error;
            await fetchAll();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not delete card.');
          }
        },
      },
    ]);
  };

  const quickToggleCategoryAvailability = async (category: GiftCategoryRow) => {
    try {
      const { error } = await supabase
        .from('gift_card_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;
      await fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update availability.');
    }
  };

  const quickToggleCardAvailability = async (card: GiftCardRow) => {
    try {
      const { error } = await supabase
        .from('gift_cards')
        .update({ is_active: !card.is_active })
        .eq('id', card.id);

      if (error) throw error;
      await fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update availability.');
    }
  };

  const renderFilterBar = (stats: { all: number; available: number; unavailable: number }) => (
    <View style={styles.filterBar}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.filterItem, filter === 'all' && styles.filterItemActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterItemText, filter === 'all' && styles.filterItemTextActive]}>
          All
        </Text>
        <View style={styles.filterCount}>
          <Text style={styles.filterCountText}>{stats.all}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.filterDivider} />

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.filterItem}
        onPress={() => setFilter('available')}
      >
        <Ionicons name="albums-outline" size={18} color="rgba(255,255,255,0.72)" />
        <Text
          style={[
            styles.filterItemText,
            filter === 'available' && styles.filterItemTextActive,
          ]}
        >
          Available
        </Text>
        <View style={styles.filterCount}>
          <Text style={styles.filterCountText}>{stats.available}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.filterDivider} />

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.filterItem}
        onPress={() => setFilter('unavailable')}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.72)" />
        <Text
          style={[
            styles.filterItemText,
            filter === 'unavailable' && styles.filterItemTextActive,
          ]}
        >
          Unavailable
        </Text>
        <View style={styles.filterCount}>
          <Text style={styles.filterCountText}>{stats.unavailable}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.filterDivider} />

      <TouchableOpacity activeOpacity={0.9} style={styles.sortItem} onPress={cycleSort}>
        <Ionicons name="filter-outline" size={18} color="rgba(255,255,255,0.72)" />
        <Text style={styles.filterItemText}>{getSortLabel(sortBy)}</Text>
        <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.72)" />
      </TouchableOpacity>
    </View>
  );

  const renderTabSwitch = () => (
    <View style={styles.tabSwitchWrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.tabSwitchBtn, activeTab === 'categories' && styles.tabSwitchBtnActive]}
        onPress={() => setActiveTab('categories')}
      >
        <Ionicons
          name="images-outline"
          size={18}
          color={activeTab === 'categories' ? UI.goldDark : '#FFFFFF'}
        />
        <Text
          style={[
            styles.tabSwitchText,
            activeTab === 'categories' && styles.tabSwitchTextActive,
          ]}
        >
          Categories
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.tabSwitchBtn, activeTab === 'cards' && styles.tabSwitchBtnActive]}
        onPress={() => setActiveTab('cards')}
      >
        <Ionicons
          name="gift-outline"
          size={18}
          color={activeTab === 'cards' ? UI.goldDark : '#FFFFFF'}
        />
        <Text
          style={[styles.tabSwitchText, activeTab === 'cards' && styles.tabSwitchTextActive]}
        >
          Cards
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.9}
            style={styles.backPill}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            <Text style={styles.backPillText}>Admin Panel</Text>
          </TouchableOpacity>

          <Text numberOfLines={1} style={styles.screenTitle}>
            Gift Cards
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          {renderTabSwitch()}

          {activeTab === 'categories' ? (
            <>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>
                  {editingCategoryId ? 'Edit Category' : 'Add New Category'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.providerPicker}
                  onPress={() => {
                    const currentIndex = GIFT_TYPES.findIndex(
                      (x) => x.key === String(categorySlug || '').toLowerCase()
                    );
                    const next = GIFT_TYPES[(currentIndex + 1) % GIFT_TYPES.length];
                    setCategorySlug(next.key);
                    setCategoryTitle(next.label);
                  }}
                >
                  <View style={styles.giftTypeIconWrap}>
                    <Ionicons name={selectedGiftTypeInfo.icon} size={22} color={UI.gold} />
                  </View>
                  <Text style={styles.providerPickerText}>{selectedGiftTypeInfo.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.72)" />
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Category title (e.g. PUBG UC)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={categoryTitle}
                  onChangeText={setCategoryTitle}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Category slug (e.g. pubg-uc)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={categorySlug}
                  onChangeText={setCategorySlug}
                  autoCapitalize="none"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Subtitle (e.g. UC Cards)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={categorySubtitle}
                  onChangeText={setCategorySubtitle}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Primary image URL for gift-cards.tsx"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={categoryCoverImage}
                  onChangeText={setCategoryCoverImage}
                  autoCapitalize="none"
                />

                <View style={styles.statusRow}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusPill, categoryIsAvailable && styles.statusPillActive]}
                    onPress={() => setCategoryIsAvailable(true)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        categoryIsAvailable && styles.statusPillTextActive,
                      ]}
                    >
                      Available
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusPill, !categoryIsAvailable && styles.statusPillInactive]}
                    onPress={() => setCategoryIsAvailable(false)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        !categoryIsAvailable && styles.statusPillTextInactive,
                      ]}
                    >
                      Unavailable
                    </Text>
                  </TouchableOpacity>
                </View>

                {!!categoryCoverImage && (
                  <Image source={{ uri: categoryCoverImage }} style={styles.previewImage} resizeMode="cover" />
                )}

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.uploadButton}
                  onPress={() => pickAndUploadImage('category')}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={UI.goldDark} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color={UI.goldDark} />
                      <Text style={styles.uploadButtonText}>Upload Primary Image</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.addButton}
                  onPress={handleSubmitCategory}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={UI.goldDark} />
                  ) : (
                    <Text style={styles.addButtonText}>
                      {editingCategoryId ? 'Update Category' : 'Add Category'}
                    </Text>
                  )}
                </TouchableOpacity>

                {editingCategoryId && (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    style={styles.cancelEditButton}
                    onPress={resetCategoryForm}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.listTitle}>All Categories</Text>
              {renderFilterBar(categoryStats)}

              {loading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : filteredCategories.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="images-outline" size={42} color={UI.gold} />
                  <Text style={styles.emptyTitle}>No categories found</Text>
                  <Text style={styles.emptyText}>Add your first gift card category from the form above.</Text>
                </View>
              ) : (
                filteredCategories.map((category) => {
                  const giftType = getGiftTypeInfo(category.slug);

                  return (
                    <View key={category.id} style={styles.cardListItem}>
                      <Image
                        source={{
                          uri:
                            category.cover_image_url ||
                            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png',
                        }}
                        style={styles.cardThumb}
                        resizeMode="cover"
                      />

                      <View style={styles.cardInfo}>
                        <View style={styles.inlineTitleRow}>
                          <View style={styles.miniGiftIcon}>
                            <Ionicons name={giftType.icon} size={14} color={UI.gold} />
                          </View>
                          <Text style={styles.cardItemTitle}>{category.title || '-'}</Text>
                        </View>

                        <Text style={styles.cardItemPrice}>{category.slug || '-'}</Text>

                        {!!category.subtitle && (
                          <Text numberOfLines={2} style={styles.cardItemNotes}>
                            {category.subtitle}
                          </Text>
                        )}

                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => quickToggleCategoryAvailability(category)}
                          style={[
                            styles.availabilityBadge,
                            category.is_active
                              ? styles.availabilityBadgeOn
                              : styles.availabilityBadgeOff,
                          ]}
                        >
                          <Text
                            style={[
                              styles.availabilityBadgeText,
                              category.is_active
                                ? styles.availabilityBadgeTextOn
                                : styles.availabilityBadgeTextOff,
                            ]}
                          >
                            {category.is_active ? 'Available' : 'Unavailable'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.actionsBox}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.actionBtn}
                          onPress={() => handleEditCategory(category)}
                        >
                          <Ionicons name="pencil" size={18} color="#E8C35A" />
                        </TouchableOpacity>

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.actionBtn}
                          onPress={() => handleDeleteCategory(category.id)}
                        >
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          ) : (
            <>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>
                  {editingCardId ? 'Edit Card' : 'Add New Card'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.providerPicker}
                  onPress={() => {
                    if (!categories.length) {
                      Alert.alert('No categories', 'Please create a category first.');
                      return;
                    }
                    const currentIndex = categories.findIndex((x) => x.id === selectedCategoryId);
                    const next = categories[(currentIndex + 1) % categories.length];
                    setSelectedCategoryId(next.id);
                  }}
                >
                  <View style={styles.giftTypeIconWrap}>
                    <Ionicons
                      name={getGiftTypeInfo(selectedCategory?.slug).icon}
                      size={22}
                      color={UI.gold}
                    />
                  </View>
                  <Text style={styles.providerPickerText}>
                    {selectedCategory?.title || 'Choose Category'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.72)" />
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Card title (e.g. 60 UC PUBG)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={cardTitle}
                  onChangeText={setCardTitle}
                />

                <View style={styles.doubleRow}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Balance / amount"
                    placeholderTextColor="rgba(255,255,255,0.42)"
                    keyboardType="numeric"
                    value={cardAmount}
                    onChangeText={setCardAmount}
                  />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Price IQD"
                    placeholderTextColor="rgba(255,255,255,0.42)"
                    keyboardType="numeric"
                    value={cardPriceIqd}
                    onChangeText={setCardPriceIqd}
                  />
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Stock count"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  keyboardType="numeric"
                  value={cardStockCount}
                  onChangeText={setCardStockCount}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Image URL for list item"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={cardImageUrl}
                  onChangeText={setCardImageUrl}
                  autoCapitalize="none"
                />

                <View style={styles.statusRow}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusPill, cardIsAvailable && styles.statusPillActive]}
                    onPress={() => setCardIsAvailable(true)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        cardIsAvailable && styles.statusPillTextActive,
                      ]}
                    >
                      Available
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusPill, !cardIsAvailable && styles.statusPillInactive]}
                    onPress={() => setCardIsAvailable(false)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        !cardIsAvailable && styles.statusPillTextInactive,
                      ]}
                    >
                      Unavailable
                    </Text>
                  </TouchableOpacity>
                </View>

                {!!cardImageUrl && (
                  <Image source={{ uri: cardImageUrl }} style={styles.previewImage} resizeMode="cover" />
                )}

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.uploadButton}
                  onPress={() => pickAndUploadImage('card')}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={UI.goldDark} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color={UI.goldDark} />
                      <Text style={styles.uploadButtonText}>Upload Card Image</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.addButton}
                  onPress={handleSubmitCard}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={UI.goldDark} />
                  ) : (
                    <Text style={styles.addButtonText}>
                      {editingCardId ? 'Update Card' : 'Add Card'}
                    </Text>
                  )}
                </TouchableOpacity>

                {editingCardId && (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    style={styles.cancelEditButton}
                    onPress={resetCardForm}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.listTitle}>All Cards</Text>
              {renderFilterBar(cardStats)}

              {loading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : filteredCards.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="gift-outline" size={42} color={UI.gold} />
                  <Text style={styles.emptyTitle}>No cards found</Text>
                  <Text style={styles.emptyText}>Add your first gift card from the form above.</Text>
                </View>
              ) : (
                filteredCards.map((card) => {
                  const category = categories.find((x) => x.id === card.category_id);
                  const giftType = getGiftTypeInfo(category?.slug);

                  return (
                    <View key={card.id} style={styles.cardListItem}>
                      <Image
                        source={{
                          uri:
                            card.image_url ||
                            category?.cover_image_url ||
                            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png',
                        }}
                        style={styles.cardThumb}
                        resizeMode="cover"
                      />

                      <View style={styles.cardInfo}>
                        <View style={styles.inlineTitleRow}>
                          <View style={styles.miniGiftIcon}>
                            <Ionicons name={giftType.icon} size={14} color={UI.gold} />
                          </View>
                          <Text style={styles.cardItemTitle}>{card.title || '-'}</Text>
                        </View>

                        <Text style={styles.cardItemPrice}>
                          Price {formatIQD(card.price_iqd)} IQD
                        </Text>

                        <Text numberOfLines={2} style={styles.cardItemNotes}>
                          {category?.title || 'Gift Category'} • Amount {card.amount || 0}
                        </Text>

                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => quickToggleCardAvailability(card)}
                          style={[
                            styles.availabilityBadge,
                            card.is_active
                              ? styles.availabilityBadgeOn
                              : styles.availabilityBadgeOff,
                          ]}
                        >
                          <Text
                            style={[
                              styles.availabilityBadgeText,
                              card.is_active
                                ? styles.availabilityBadgeTextOn
                                : styles.availabilityBadgeTextOff,
                            ]}
                          >
                            {card.is_active ? 'Available' : 'Unavailable'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.actionsBox}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.actionBtn}
                          onPress={() => handleEditCard(card)}
                        >
                          <Ionicons name="pencil" size={18} color="#E8C35A" />
                        </TouchableOpacity>

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.actionBtn}
                          onPress={() => handleDeleteCard(card.id)}
                        >
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          <View style={{ height: 36 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  container: {
    flex: 1,
    backgroundColor: UI.bg,
    paddingHorizontal: 18,
  },

  topHeader: {
    paddingTop: Platform.OS === 'ios' ? 8 : 10,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  backPillText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  screenTitle: {
    marginLeft: 18,
    flex: 1,
    color: '#EAF0FF',
    fontSize: 20,
    fontWeight: '800',
  },

  scrollContent: {
    paddingBottom: 20,
  },

  tabSwitchWrap: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  tabSwitchBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.softBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  tabSwitchBtnActive: {
    backgroundColor: UI.gold,
    borderColor: UI.goldBorder,
  },
  tabSwitchText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  tabSwitchTextActive: {
    color: UI.goldDark,
  },

  formCard: {
    backgroundColor: 'rgba(17,30,73,0.82)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.30,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },

  providerPicker: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.softBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftTypeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: 'rgba(246,224,143,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(246,224,143,0.24)',
  },
  providerPickerText: {
    flex: 1,
    color: '#F8FAFF',
    fontSize: 18,
    fontWeight: '700',
  },

  input: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.softBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 17,
    marginBottom: 14,
  },

  doubleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  halfInput: {
    flex: 1,
  },

  statusRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statusPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.softBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillActive: {
    backgroundColor: 'rgba(117,192,107,0.14)',
    borderColor: 'rgba(117,192,107,0.35)',
  },
  statusPillInactive: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.28)',
  },
  statusPillText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: '#A8E09F',
  },
  statusPillTextInactive: {
    color: '#FF8C8C',
  },

  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  uploadButton: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: UI.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  uploadButtonText: {
    color: UI.goldDark,
    fontSize: 20,
    fontWeight: '800',
  },

  addButton: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: UI.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addButtonText: {
    color: UI.goldDark,
    fontSize: 20,
    fontWeight: '800',
  },

  cancelEditButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelEditButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  listTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },

  filterBar: {
    minHeight: 58,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 8,
  },
  filterItemActive: {
    backgroundColor: 'rgba(246,224,143,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(246,224,143,0.55)',
  },
  filterItemText: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 14,
    fontWeight: '700',
  },
  filterItemTextActive: {
    color: '#FFF1BE',
  },
  filterCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(246,224,143,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  filterCountText: {
    color: '#F4D981',
    fontSize: 13,
    fontWeight: '800',
  },
  filterDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: 4,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    paddingHorizontal: 8,
  },

  loaderWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    minHeight: 220,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },

  cardListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(17,30,73,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardThumb: {
    width: 96,
    height: 136,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },

  cardInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 2,
  },
  inlineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  miniGiftIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(246,224,143,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardItemTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  cardItemPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardItemNotes: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },

  availabilityBadge: {
    alignSelf: 'flex-start',
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityBadgeOn: {
    backgroundColor: UI.greenBg,
  },
  availabilityBadgeOff: {
    backgroundColor: UI.redBg,
  },
  availabilityBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  availabilityBadgeTextOn: {
    color: '#AEDF88',
  },
  availabilityBadgeTextOff: {
    color: '#FF9A9A',
  },

  actionsBox: {
    width: 84,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

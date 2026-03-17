import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';

type GiftCategoryKey =
  | 'pubg_uc'
  | 'free_fire'
  | 'itunes'
  | 'google_play'
  | 'steam'
  | 'playstation'
  | 'xbox'
  | 'amazon'
  | 'netflix'
  | 'spotify';

interface GiftCardRow {
  id: string;
  title?: string | null;
  brand?: string | null;
  category?: string | null;
  amount?: number | null;
  price_iqd?: number | null;
  image_url?: string | null;

  cover_image_url?: string | null;
  category_image_url?: string | null;
  item_image_url?: string | null;
  description?: string | null;

  is_active?: boolean | null;
  sort_order?: number | null;
}

interface GiftCategory {
  key: GiftCategoryKey;
  title: string;
  subtitle: string;
  image: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  soft: string;
  border: string;
  count?: number;
}

const UI = {
  bg: '#FFFDF8',
  headerBg: '#FFF9E8',
  card: '#FFFFFF',
  text: '#221C0B',
  text2: '#806A12',
  text3: '#8A7B49',
  border: '#EFE3B3',
  border2: '#F3E3A7',
  yellow: '#FDE68A',
  yellowDark: '#9A7B00',
  yellowSoft: '#FFF6D9',
};

const FALLBACK_CATEGORIES: GiftCategory[] = [
  {
    key: 'pubg_uc',
    title: 'PUBG UC',
    subtitle: 'UC Cards',
    image: null,
    icon: 'game-controller-outline',
    color: '#B7791F',
    soft: '#FFF7E6',
    border: '#F4D9A6',
  },
  {
    key: 'free_fire',
    title: 'Free Fire',
    subtitle: 'Diamond Cards',
    image: null,
    icon: 'flame-outline',
    color: '#EA580C',
    soft: '#FFF4ED',
    border: '#FED7AA',
  },
  {
    key: 'itunes',
    title: 'iTunes',
    subtitle: 'Apple Gift Cards',
    image: null,
    icon: 'logo-apple',
    color: '#111827',
    soft: '#F3F4F6',
    border: '#E5E7EB',
  },
  {
    key: 'google_play',
    title: 'Google Play',
    subtitle: 'Play Store Cards',
    image: null,
    icon: 'logo-google-playstore',
    color: '#2563EB',
    soft: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    key: 'steam',
    title: 'Steam',
    subtitle: 'Gaming Cards',
    image: null,
    icon: 'game-controller-outline',
    color: '#1D4ED8',
    soft: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    key: 'playstation',
    title: 'PlayStation',
    subtitle: 'PS Cards',
    image: null,
    icon: 'logo-playstation',
    color: '#1D4ED8',
    soft: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    key: 'xbox',
    title: 'Xbox',
    subtitle: 'Xbox Cards',
    image: null,
    icon: 'logo-xbox',
    color: '#15803D',
    soft: '#F0FDF4',
    border: '#BBF7D0',
  },
  {
    key: 'amazon',
    title: 'Amazon',
    subtitle: 'Shopping Cards',
    image: null,
    icon: 'bag-handle-outline',
    color: '#D97706',
    soft: '#FFFBEB',
    border: '#FDE68A',
  },
  {
    key: 'netflix',
    title: 'Netflix',
    subtitle: 'Streaming Cards',
    image: null,
    icon: 'film-outline',
    color: '#DC2626',
    soft: '#FEF2F2',
    border: '#FECACA',
  },
  {
    key: 'spotify',
    title: 'Spotify',
    subtitle: 'Music Cards',
    image: null,
    icon: 'musical-notes-outline',
    color: '#16A34A',
    soft: '#F0FDF4',
    border: '#BBF7D0',
  },
];

function getCurrentLang() {
  const raw = String((i18n as any)?.language || (i18n as any)?.locale || 'en').toLowerCase();
  if (raw.startsWith('ar')) return 'ar';
  if (raw.startsWith('ckb')) return 'ckb';
  if (raw.startsWith('ku') || raw.startsWith('kmr')) return 'kmr';
  return 'en';
}

const TEXTS = {
  en: {
    pageTitle: 'Online Gift Cards',
    heroTitle: 'Choose your gift card',
    heroSub: 'Open a category, choose the amount, and continue your order easily.',
    searchCategories: 'Search gift card or category',
    noCategories: 'No gift cards available',
    noCategoriesSub: 'No active gift cards found in Supabase.',
    categories: 'Categories',
    cardsCount: 'cards',
    chooseCategory: 'Choose a category to see available cards',
    selectedCategory: 'Selected category',
    availableCards: 'Available cards',
    amount: 'Amount',
    price: 'Price',
    buyNow: 'Buy now',
    open: 'Open',
    backToCategories: 'Back to categories',
    available: 'Available',
    providers: 'Categories',
  },
  ar: {
    pageTitle: 'بطاقات الهدايا',
    heroTitle: 'اختر بطاقة الهدية',
    heroSub: 'افتح الفئة، اختر المبلغ، وأكمل طلبك بسهولة.',
    searchCategories: 'ابحث عن بطاقة أو فئة',
    noCategories: 'لا توجد بطاقات هدايا',
    noCategoriesSub: 'لا توجد بطاقات هدايا مفعلة في Supabase.',
    categories: 'الفئات',
    cardsCount: 'بطاقات',
    chooseCategory: 'اختر فئة لعرض البطاقات المتوفرة',
    selectedCategory: 'الفئة المحددة',
    availableCards: 'البطاقات المتوفرة',
    amount: 'القيمة',
    price: 'السعر',
    buyNow: 'اشتر الآن',
    open: 'فتح',
    backToCategories: 'العودة للفئات',
    available: 'متوفر',
    providers: 'الفئات',
  },
  ckb: {
    pageTitle: 'گیفت کارت',
    heroTitle: 'گیفت کارتەکەت هەڵبژێرە',
    heroSub: 'بەشێک بکەرەوە، بڕەکە هەڵبژێرە و داواکاریەکەت تەواو بکە.',
    searchCategories: 'گەڕان بە ناوی گیفت کارت یان بەش',
    noCategories: 'هیچ گیفت کارتێک بەردەست نییە',
    noCategoriesSub: 'هیچ گیفت کارتێکی چالاک لە Supabase نەدۆزرایەوە.',
    categories: 'بەشەکان',
    cardsCount: 'کارت',
    chooseCategory: 'بەشێک هەڵبژێرە بۆ بینینی کارتە بەردەستەکان',
    selectedCategory: 'بەشی هەڵبژێردراو',
    availableCards: 'کارتە بەردەستەکان',
    amount: 'بڕ',
    price: 'نرخ',
    buyNow: 'ئێستا بکڕە',
    open: 'بیکەرەوە',
    backToCategories: 'گەڕانەوە بۆ بەشەکان',
    available: 'بەردەستە',
    providers: 'بەشەکان',
  },
  kmr: {
    pageTitle: 'کارتێن دیاریێ',
    heroTitle: 'کارتا دیاریێ هەلبژێرە',
    heroSub: 'بەشەکێ ڤەکە، بڕێ هەلبژێرە و داواکارییا خۆ تەواو بکە.',
    searchCategories: 'لێگەڕێ ب ناڤێ کارتێ یان بەشێ',
    noCategories: 'هیچ کارتێن دیاریێ بەردەست نینن',
    noCategoriesSub: 'هیچ کارتێن دیاریێن چالاک ل Supabase نەهاتیە دیتن.',
    categories: 'بەش',
    cardsCount: 'کارت',
    chooseCategory: 'بەشەکێ هەلبژێرە بۆ دیتنا کارتێن بەردەست',
    selectedCategory: 'بەشا هەلبژێردی',
    availableCards: 'کارتێن بەردەست',
    amount: 'بڕ',
    price: 'نرخ',
    buyNow: 'ئێستا بکرە',
    open: 'ڤەکە',
    backToCategories: 'ڤەگەڕان بۆ بەشان',
    available: 'بەردەستە',
    providers: 'بەش',
  },
} as const;

function useT() {
  const lang = getCurrentLang() as keyof typeof TEXTS;
  return TEXTS[lang] || TEXTS.en;
}

function normalizeCategory(value?: string | null): GiftCategoryKey | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  if (
    [
      'pubg_uc',
      'free_fire',
      'itunes',
      'google_play',
      'steam',
      'playstation',
      'xbox',
      'amazon',
      'netflix',
      'spotify',
    ].includes(raw)
  ) {
    return raw as GiftCategoryKey;
  }

  if (['pubg', 'pubguc', 'uc', 'pubg_card'].includes(raw)) return 'pubg_uc';
  if (['freefire', 'ff'].includes(raw)) return 'free_fire';
  if (['googleplay', 'playstore'].includes(raw)) return 'google_play';
  if (['ps', 'psn', 'ps_card'].includes(raw)) return 'playstation';

  return null;
}

function formatIQD(value?: number | null) {
  const num = Number(value || 0);
  const rounded = Math.round(num);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getCategoryMeta(
  key: GiftCategoryKey,
  dbImage?: string | null,
  dbTitle?: string | null
): GiftCategory {
  const found = FALLBACK_CATEGORIES.find((item) => item.key === key);

  if (!found) {
    return {
      key,
      title: dbTitle || 'Gift Card',
      subtitle: 'Gift Cards',
      image: dbImage || null,
      icon: 'gift-outline',
      color: '#8B5CF6',
      soft: '#F5F3FF',
      border: '#E9D5FF',
    };
  }

  return {
    ...found,
    title: dbTitle || found.title,
    image: dbImage || found.image,
  };
}

function getCategoryPreviewImage(row: GiftCardRow) {
  return row.cover_image_url || row.category_image_url || row.image_url || null;
}

function getItemImage(row: GiftCardRow) {
  return row.item_image_url || row.image_url || null;
}

function getItemTitle(row: GiftCardRow, selectedMeta?: GiftCategory | null) {
  if (row.title && row.title.trim()) return row.title.trim();

  const amount = Number(row.amount || 0);
  const categoryName = selectedMeta?.title || row.brand || row.category || 'Gift Card';

  if (amount > 0) {
    if (selectedMeta?.key === 'pubg_uc') return `${formatIQD(amount)} UC`;
    if (selectedMeta?.key === 'free_fire') return `${formatIQD(amount)} Diamond`;
    return `${formatIQD(amount)} ${categoryName}`;
  }

  return categoryName;
}

export default function GiftCardsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const t = useT();

  const [giftCards, setGiftCards] = useState<GiftCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GiftCategoryKey | null>(null);

  const fetchGiftCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('price_iqd', { ascending: true });

      if (error) throw error;

      setGiftCards((data || []) as GiftCardRow[]);
    } catch (error: any) {
      console.log('gift-cards screen error:', error);
      Alert.alert(
        i18n.t('common.error') || 'Error',
        error?.message || 'Could not load gift cards.'
      );
      setGiftCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGiftCards();
  };

  const categories = useMemo(() => {
    const map = new Map<GiftCategoryKey, GiftCategory>();

    for (const row of giftCards) {
      const key = normalizeCategory(row.category) || normalizeCategory(row.brand) || null;
      if (!key) continue;

      const previewImage = getCategoryPreviewImage(row);

      if (!map.has(key)) {
        map.set(key, {
          ...getCategoryMeta(key, previewImage, row.brand || row.title),
          count: 1,
        });
      } else {
        const current = map.get(key)!;
        map.set(key, {
          ...current,
          count: Number(current.count || 0) + 1,
          image: current.image || previewImage || null,
        });
      }
    }

    if (map.size === 0) {
      return FALLBACK_CATEGORIES;
    }

    const ordered: GiftCategory[] = [];
    for (const item of FALLBACK_CATEGORIES) {
      if (map.has(item.key)) ordered.push(map.get(item.key)!);
    }

    for (const entry of map.values()) {
      if (!ordered.find((x) => x.key === entry.key)) ordered.push(entry);
    }

    return ordered;
  }, [giftCards]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q)
      );
    });
  }, [categories, search]);

  const selectedMeta = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find((item) => item.key === selectedCategory) || null;
  }, [categories, selectedCategory]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return giftCards
      .filter((row) => {
        const key = normalizeCategory(row.category) || normalizeCategory(row.brand) || null;

        const matchCategory = selectedCategory ? key === selectedCategory : true;

        const title = String(row.title || '').toLowerCase();
        const brand = String(row.brand || '').toLowerCase();
        const category = String(row.category || '').toLowerCase();
        const amount = String(row.amount || '');
        const price = String(row.price_iqd || '');

        const matchSearch = q
          ? title.includes(q) ||
            brand.includes(q) ||
            category.includes(q) ||
            amount.includes(q) ||
            price.includes(q)
          : true;

        return matchCategory && matchSearch;
      })
      .sort((a, b) => {
        const aOrder = Number(a.sort_order || 0);
        const bOrder = Number(b.sort_order || 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return Number(a.price_iqd || 0) - Number(b.price_iqd || 0);
      });
  }, [giftCards, selectedCategory, search]);

  const handleBuy = (item: GiftCardRow) => {
    const itemImage = getItemImage(item) || '';
    const finalPriceIqd = Number(item.price_iqd || 0);

    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        id: item.id,
        name: getItemTitle(item, selectedMeta),
        price_iqd: String(finalPriceIqd),
        price: String(finalPriceIqd),
        provider: String(item.brand || item.category || 'gift_card')
          .toLowerCase()
          .replace(/\s+/g, '_'),
        amount: String(item.amount || 0),
        type: 'gift',
        image: itemImage,
        image_url: itemImage,
        gift_card_id: item.id,
      },
    });
  };

  const openNotifications = () => {
    router.push('/(app)/notifications' as any);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (selectedCategory) {
              setSelectedCategory(null);
              setSearch('');
              return;
            }
            router.back();
          }}
          activeOpacity={0.85}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={22} color="#5A4700" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {selectedMeta?.title || t.pageTitle}
        </Text>

        <TouchableOpacity
          onPress={openNotifications}
          activeOpacity={0.85}
          style={styles.iconButton}
        >
          <Ionicons name="notifications-outline" size={21} color="#5A4700" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {selectedMeta ? selectedMeta.title : t.heroTitle}
          </Text>
          <Text style={styles.heroSubtitle}>
            {selectedMeta
              ? `${t.selectedCategory}: ${selectedMeta.title}`
              : t.chooseCategory}
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={22} color="#8C8C8C" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.searchCategories}
            placeholderTextColor="#A0A0A0"
            style={styles.searchInput}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#B0B0B0" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#C99700" />
          </View>
        ) : !selectedCategory ? (
          filteredCategories.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="gift-outline" size={36} color="#B08A00" />
              <Text style={styles.emptyTitle}>{t.noCategories}</Text>
              <Text style={styles.emptyText}>{t.noCategoriesSub}</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.categories}</Text>
              </View>

              <View style={styles.providersGrid}>
                {filteredCategories.map((category) => (
                  <TouchableOpacity
                    key={category.key}
                    activeOpacity={0.92}
                    style={styles.providerCard}
                    onPress={() => {
                      setSelectedCategory(category.key);
                      setSearch('');
                    }}
                  >
                    {category.image ? (
                      <View
                        style={[
                          styles.providerImageWrap,
                          {
                            backgroundColor: category.soft,
                            borderColor: category.border,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: category.image }}
                          style={styles.providerImage}
                          resizeMode="cover"
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.providerImageWrap,
                          styles.fallbackCenter,
                          {
                            backgroundColor: category.soft,
                            borderColor: category.border,
                          },
                        ]}
                      >
                        <Ionicons name={category.icon} size={42} color={category.color} />
                      </View>
                    )}

                    <View style={styles.providerFooter}>
                      <Text numberOfLines={1} style={styles.providerName}>
                        {category.title}
                      </Text>
                      <Text style={styles.providerCount}>
                        {Number(category.count || 0)} {t.cardsCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="gift-outline" size={36} color="#B08A00" />
            <Text style={styles.emptyTitle}>{t.noCategories}</Text>
            <Text style={styles.emptyText}>{t.noCategoriesSub}</Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.backToCategoriesButton}
              onPress={() => {
                setSelectedCategory(null);
                setSearch('');
              }}
            >
              <Text style={styles.backToCategoriesButtonText}>{t.backToCategories}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.availableCards}</Text>

              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(null);
                  setSearch('');
                }}
                activeOpacity={0.85}
                style={styles.backProvidersMini}
              >
                <Ionicons name="grid-outline" size={14} color="#5A4700" />
                <Text style={styles.backProvidersMiniText}>{t.providers}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardsList}>
              {filteredItems.map((item) => {
                const imageUri = getItemImage(item);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.cardRow}
                    activeOpacity={0.92}
                    onPress={() => handleBuy(item)}
                  >
                    {imageUri ? (
                      <View
                        style={[
                          styles.cardImageWrap,
                          {
                            backgroundColor: selectedMeta?.soft || '#FFF7E6',
                            borderColor: selectedMeta?.border || '#F4D9A6',
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.cardImageWrap,
                          styles.fallbackCenter,
                          {
                            backgroundColor: selectedMeta?.soft || '#FFF7E6',
                            borderColor: selectedMeta?.border || '#F4D9A6',
                          },
                        ]}
                      >
                        <Ionicons
                          name={selectedMeta?.icon || 'gift-outline'}
                          size={34}
                          color={selectedMeta?.color || '#B7791F'}
                        />
                      </View>
                    )}

                    <View style={styles.cardMiddle}>
                      <Text numberOfLines={2} style={styles.cardName}>
                        {getItemTitle(item, selectedMeta)}
                      </Text>

                      <Text style={styles.cardAmountText}>
                        {t.amount}:{' '}
                        {selectedMeta?.key === 'pubg_uc'
                          ? `${formatIQD(Number(item.amount || 0))} UC`
                          : selectedMeta?.key === 'free_fire'
                          ? `${formatIQD(Number(item.amount || 0))}`
                          : `${formatIQD(Number(item.amount || 0))}`}
                      </Text>

                      {!!item.description && (
                        <Text numberOfLines={2} style={styles.cardDescription}>
                          {item.description}
                        </Text>
                      )}
                    </View>

                    <View style={styles.cardRight}>
                      <Text style={styles.cardPriceValue}>
                        {formatIQD(item.price_iqd)} IQD
                      </Text>

                      <View style={styles.buyMiniButton}>
                        <Ionicons name="cart-outline" size={14} color="#5A4700" />
                        <Text style={styles.buyMiniButtonText}>{t.buyNow}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
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
    width: 40,
    height: 40,
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
    paddingBottom: 10,
  },

  heroCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF6D9',
    borderWidth: 1,
    borderColor: '#F3E3A7',
    marginBottom: 14,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '900',
    color: '#221C0B',
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '700',
    color: '#8A6E08',
    lineHeight: 20,
    textAlign: 'center',
  },

  searchBox: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#1F1B12',
    fontSize: 16,
    fontWeight: '700',
  },

  sectionHeader: {
    marginBottom: 10,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#241E0E',
  },

  loaderWrap: {
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#7B7460',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  providerCard: {
    width: '48%',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  providerImageWrap: {
    marginTop: 10,
    marginHorizontal: 10,
    height: 150,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  providerImage: {
    width: '100%',
    height: '100%',
  },
  providerFooter: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    alignItems: 'center',
  },
  providerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#232011',
  },
  providerCount: {
    marginTop: 4,
    fontSize: 12,
    color: '#8A7B4A',
    fontWeight: '800',
  },

  backToCategoriesButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F4D461',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backToCategoriesButtonText: {
    color: '#5A4700',
    fontSize: 14,
    fontWeight: '900',
  },

  backProvidersMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8D8',
    borderWidth: 1,
    borderColor: '#F1DA85',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backProvidersMiniText: {
    color: '#5A4700',
    fontSize: 12,
    fontWeight: '900',
  },

  cardsList: {
    gap: 12,
  },
  cardRow: {
    borderRadius: 22,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  fallbackCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardMiddle: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 15,
    lineHeight: 21,
    color: '#201B10',
    fontWeight: '900',
    marginBottom: 6,
  },
  cardAmountText: {
    fontSize: 13,
    color: '#8B7C49',
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7B7460',
    fontWeight: '700',
  },

  cardRight: {
    minHeight: 96,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardPriceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#7C6100',
  },
  buyMiniButton: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F4D461',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
  },
  buyMiniButtonText: {
    color: '#5A4700',
    fontSize: 12,
    fontWeight: '900',
  },
});

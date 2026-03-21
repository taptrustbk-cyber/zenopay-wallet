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

interface GiftCardCategoryRow {
  id: string;
  title?: string | null;
  slug?: string | null;
  subtitle?: string | null;
  cover_image_url?: string | null;
  icon_name?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
}

interface GiftCardRow {
  id: string;
  title?: string | null;
  brand?: string | null;
  category?: string | null;
  amount?: number | null;
  price_iqd?: number | null;
  image_url?: string | null;
  item_image_url?: string | null;
  cover_image_url?: string | null;
  category_image_url?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  category_id?: string | null;
  created_at?: string | null;
}

interface GiftCategory {
  key: string;
  id?: string | null;
  title: string;
  subtitle: string;
  image: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  soft: string;
  border: string;
  count?: number;
  sort_order?: number;
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

function getCurrentLang() {
  const raw = String((i18n as any)?.language || (i18n as any)?.locale || 'en').toLowerCase();
  if (raw.startsWith('ar')) return 'ar';
  if (raw.startsWith('ckb') || raw.startsWith('cbk')) return 'ckb';
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
    backToCategories: 'Back to categories',
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
    backToCategories: 'العودة للفئات',
    providers: 'الفئات',
  },
  ckb: {
    pageTitle: 'کارتین دیاری',
    heroTitle: 'کارتا دیارییەکەت هەڵبژێرە',
    heroSub: 'بەشێک هەڵبژێرە، بڕەکە دیاری بکە و بە ئاسانی داواکارییەکەت تەواو بکە.',
    searchCategories: 'لێگەڕان بە ناوی کارت یان بەش',
    noCategories: 'هیچ کارتێکی دیاری بەردەست نییە',
    noCategoriesSub: 'هیچ کارتێکی دیاریی چالاک لە Supabase نەدۆزرایەوە.',
    categories: 'بەشەکان',
    cardsCount: 'کارت',
    chooseCategory: 'بەشێک هەڵبژێرە بۆ بینینی کارتە بەردەستەکان',
    selectedCategory: 'بەشی هەڵبژێردراو',
    availableCards: 'کارتە بەردەستەکان',
    amount: 'بڕ',
    price: 'نرخ',
    buyNow: 'ئێستا بکڕە',
    backToCategories: 'گەڕانەوە بۆ بەشەکان',
    providers: 'بەشەکان',
  },
  kmr: {
    pageTitle: 'کارتێن دیاریێ',
    heroTitle: 'کارتا دیاریێ هەلبژێرە',
    heroSub: 'بەشەکێ هەلبژێرە، بڕێ دیاری بکە و داواکارییا خۆ ب ساناهی تەواو بکە.',
    searchCategories: 'لێگەڕێ ب ناڤێ کارتێ یان بەشێ',
    noCategories: 'هیچ کارتێن دیاریێ بەردەست نینن',
    noCategoriesSub: 'هیچ کارتێن دیاریێن چالاک لە Supabase نەهاتیە دیتن.',
    categories: 'بەش',
    cardsCount: 'کارت',
    chooseCategory: 'بەشەکێ هەلبژێرە بۆ دیتنا کارتێن بەردەست',
    selectedCategory: 'بەشا هەلبژێردی',
    availableCards: 'کارتێن بەردەست',
    amount: 'بڕ',
    price: 'نرخ',
    buyNow: 'ئێستا بکرە',
    backToCategories: 'ڤەگەڕان بۆ بەشان',
    providers: 'بەش',
  },
} as const;

function useT() {
  const lang = getCurrentLang() as keyof typeof TEXTS;
  return TEXTS[lang] || TEXTS.en;
}

function formatIQD(value?: number | null) {
  const num = Number(value || 0);
  const rounded = Math.round(num);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function normalizeKey(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function titleFromKey(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return 'Gift Card';

  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function pickIconFromSlug(slug?: string | null): keyof typeof Ionicons.glyphMap {
  const key = normalizeKey(slug);

  if (key.includes('pubg') || key.includes('game')) return 'game-controller-outline';
  if (key.includes('free_fire') || key.includes('fire')) return 'flame-outline';
  if (key.includes('itunes') || key.includes('apple')) return 'logo-apple';
  if (key.includes('google') || key.includes('play')) return 'logo-google-playstore';
  if (key.includes('playstation') || key === 'ps' || key.includes('psn')) return 'logo-playstation';
  if (key.includes('xbox')) return 'logo-xbox';
  if (key.includes('spotify') || key.includes('music')) return 'musical-notes-outline';
  if (key.includes('netflix') || key.includes('movie') || key.includes('film')) return 'film-outline';
  if (key.includes('amazon') || key.includes('shop')) return 'bag-handle-outline';
  if (key.includes('steam')) return 'desktop-outline';
  if (key.includes('tiktok')) return 'logo-tiktok';
  return 'gift-outline';
}

function pickThemeFromSlug(slug?: string | null) {
  const key = normalizeKey(slug);

  if (key.includes('pubg') || key.includes('amazon')) {
    return { color: '#B7791F', soft: '#FFF7E6', border: '#F4D9A6' };
  }
  if (key.includes('fire')) {
    return { color: '#EA580C', soft: '#FFF4ED', border: '#FED7AA' };
  }
  if (key.includes('apple') || key.includes('itunes')) {
    return { color: '#111827', soft: '#F3F4F6', border: '#E5E7EB' };
  }
  if (key.includes('google') || key.includes('play') || key.includes('steam') || key.includes('playstation')) {
    return { color: '#2563EB', soft: '#EFF6FF', border: '#BFDBFE' };
  }
  if (key.includes('xbox') || key.includes('spotify')) {
    return { color: '#16A34A', soft: '#F0FDF4', border: '#BBF7D0' };
  }
  if (key.includes('netflix') || key.includes('tiktok')) {
    return { color: '#DC2626', soft: '#FEF2F2', border: '#FECACA' };
  }

  return { color: '#8B5CF6', soft: '#F5F3FF', border: '#E9D5FF' };
}

function getCategoryPreviewImage(card: GiftCardRow, category?: GiftCardCategoryRow | null) {
  return (
    category?.cover_image_url ||
    card.cover_image_url ||
    card.category_image_url ||
    card.image_url ||
    card.item_image_url ||
    null
  );
}

function getItemImage(card: GiftCardRow, category?: GiftCardCategoryRow | null) {
  return (
    card.item_image_url ||
    card.image_url ||
    card.cover_image_url ||
    category?.cover_image_url ||
    null
  );
}

function getItemTitle(
  row: GiftCardRow,
  selectedMeta?: GiftCategory | null,
  categoryRow?: GiftCardCategoryRow | null
) {
  if (row.title && row.title.trim()) return row.title.trim();

  const amount = Number(row.amount || 0);
  const categoryName =
    selectedMeta?.title ||
    categoryRow?.title ||
    row.brand ||
    row.category ||
    'Gift Card';

  const key = normalizeKey(categoryRow?.slug || row.category || row.brand);

  if (amount > 0) {
    if (key.includes('pubg')) return `${formatIQD(amount)} UC`;
    if (key.includes('free_fire')) return `${formatIQD(amount)} Diamond`;
    return `${formatIQD(amount)} ${categoryName}`;
  }

  return categoryName;
}

export default function GiftCardsScreen() {
  useTheme();
  const router = useRouter();
  const t = useT();

  const [giftCards, setGiftCards] = useState<GiftCardRow[]>([]);
  const [giftCategories, setGiftCategories] = useState<GiftCardCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchGiftCards = useCallback(async () => {
    try {
      const [cardsRes, categoriesRes] = await Promise.all([
        supabase
          .from('gift_cards')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('price_iqd', { ascending: true })
          .order('created_at', { ascending: false }),

        supabase
          .from('gift_card_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
      ]);

      if (cardsRes.error) throw cardsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setGiftCards((cardsRes.data || []) as GiftCardRow[]);
      setGiftCategories((categoriesRes.data || []) as GiftCardCategoryRow[]);
    } catch (error: any) {
      console.log('gift-cards screen error:', error);
      Alert.alert(
        i18n.t('common.error') || 'Error',
        error?.message || 'Could not load gift cards.'
      );
      setGiftCards([]);
      setGiftCategories([]);
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

  const categoryMap = useMemo(() => {
    const map = new Map<string, GiftCardCategoryRow>();
    for (const category of giftCategories) {
      if (category?.id) {
        map.set(String(category.id), category);
      }
    }
    return map;
  }, [giftCategories]);

  const categories = useMemo(() => {
    const activeCards = giftCards.filter((card) => card.is_active !== false);
    const result: GiftCategory[] = [];

    for (const category of giftCategories) {
      const linkedCards = activeCards.filter(
        (card) => String(card.category_id || '') === String(category.id || '')
      );

      const theme = pickThemeFromSlug(category.slug || category.title);
      const firstLinked = linkedCards[0];

      result.push({
        key: String(category.id),
        id: String(category.id),
        title: String(category.title || titleFromKey(category.slug)),
        subtitle: String(category.subtitle || 'Gift Cards'),
        image:
          category.cover_image_url ||
          getCategoryPreviewImage(firstLinked as GiftCardRow, category) ||
          null,
        icon:
          (category.icon_name as keyof typeof Ionicons.glyphMap) ||
          pickIconFromSlug(category.slug || category.title),
        color: theme.color,
        soft: theme.soft,
        border: theme.border,
        count: linkedCards.length,
        sort_order: Number(category.sort_order || 0),
      });
    }

    const categoriesIds = new Set(giftCategories.map((c) => String(c.id)));

    for (const row of activeCards) {
      const fallbackKey =
        String(row.category_id || '') ||
        normalizeKey(row.category) ||
        normalizeKey(row.brand) ||
        row.id;

      if (String(row.category_id || '') && categoriesIds.has(String(row.category_id))) {
        continue;
      }

      const exists = result.find((item) => item.key === fallbackKey);
      const slug = row.category || row.brand || row.title;
      const theme = pickThemeFromSlug(slug);

      if (!exists) {
        const fallbackCards = activeCards.filter((card) => {
          const key =
            String(card.category_id || '') ||
            normalizeKey(card.category) ||
            normalizeKey(card.brand) ||
            card.id;
          return key === fallbackKey;
        });

        result.push({
          key: fallbackKey,
          id: row.category_id || null,
          title: titleFromKey(row.brand || row.category || row.title),
          subtitle: 'Gift Cards',
          image: getCategoryPreviewImage(row, null),
          icon: pickIconFromSlug(slug),
          color: theme.color,
          soft: theme.soft,
          border: theme.border,
          count: fallbackCards.length,
          sort_order: Number(row.sort_order || 0),
        });
      }
    }

    return result.sort((a, b) => {
      const aOrder = Number(a.sort_order || 0);
      const bOrder = Number(b.sort_order || 0);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.title.localeCompare(b.title);
    });
  }, [giftCategories, giftCards]);

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
      .filter((row) => row.is_active !== false)
      .filter((row) => {
        const categoryKey =
          String(row.category_id || '') ||
          normalizeKey(row.category) ||
          normalizeKey(row.brand) ||
          row.id;

        const matchCategory = selectedCategory ? categoryKey === selectedCategory : true;

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
    const categoryRow = item.category_id ? categoryMap.get(item.category_id) || null : null;
    const itemImage = getItemImage(item, categoryRow) || '';
    const finalPriceIqd = Number(item.price_iqd || 0);
    const finalAmount = Number(item.amount || 0);
    const finalProvider = normalizeKey(
      categoryRow?.slug || item.brand || item.category || 'gift_card'
    );

    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        id: item.id,
        category_id: item.category_id || '',
        name: getItemTitle(item, selectedMeta, categoryRow),
        iqd_price: String(finalPriceIqd),
        price_iqd: String(finalPriceIqd),
        price: String(finalPriceIqd),
        provider: finalProvider,
        amount: String(finalAmount),
        type: 'gift',
        image: itemImage,
        image_url: itemImage,
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
            {selectedMeta ? `${t.selectedCategory}: ${selectedMeta.title}` : t.chooseCategory}
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
                const categoryRow = item.category_id ? categoryMap.get(item.category_id) || null : null;
                const imageUri = getItemImage(item, categoryRow);

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
                        <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
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
                        {getItemTitle(item, selectedMeta, categoryRow)}
                      </Text>

                      <Text style={styles.cardAmountText}>
                        {t.amount}:{' '}
                        {normalizeKey(categoryRow?.slug || item.category || item.brand).includes('pubg')
                          ? `${formatIQD(Number(item.amount || 0))} UC`
                          : normalizeKey(categoryRow?.slug || item.category || item.brand).includes('free_fire')
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
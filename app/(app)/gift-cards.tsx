import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  title: string | null;
  brand: string | null;
  category: string | null;
  amount: number | null;
  price_iqd: number | null;
  image_url: string | null;
  is_active: boolean | null;
  sort_order: number | null;
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
  green: '#16A34A',
  greenSoft: '#ECFDF3',
  redSoft: '#FEF3F2',
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
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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

export default function GiftCardsScreen() {
  const { theme } = useTheme(); // keep
  const router = useRouter();

  const [giftCards, setGiftCards] = useState<GiftCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<GiftCategoryKey | null>(null);

  const fetchGiftCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('id,title,brand,category,amount,price_iqd,image_url,is_active,sort_order')
        .eq('is_active', true)
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
      const key =
        normalizeCategory(row.category) ||
        normalizeCategory(row.brand) ||
        null;

      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, getCategoryMeta(key, row.image_url, row.brand || row.title));
      } else {
        const current = map.get(key)!;
        if (!current.image && row.image_url) {
          map.set(key, { ...current, image: row.image_url });
        }
      }
    }

    if (map.size === 0) {
      return FALLBACK_CATEGORIES;
    }

    const ordered: GiftCategory[] = [];
    for (const item of FALLBACK_CATEGORIES) {
      if (map.has(item.key)) {
        ordered.push(map.get(item.key)!);
      }
    }

    for (const entry of map.values()) {
      if (!ordered.find((x) => x.key === entry.key)) {
        ordered.push(entry);
      }
    }

    return ordered;
  }, [giftCards]);

  const selectedMeta = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find((item) => item.key === selectedCategory) || null;
  }, [categories, selectedCategory]);

  const selectedItems = useMemo(() => {
    if (!selectedCategory) return [];

    return giftCards
      .filter((row) => {
        const key =
          normalizeCategory(row.category) ||
          normalizeCategory(row.brand) ||
          null;
        return key === selectedCategory;
      })
      .sort((a, b) => {
        const aOrder = Number(a.sort_order || 0);
        const bOrder = Number(b.sort_order || 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return Number(a.price_iqd || 0) - Number(b.price_iqd || 0);
      });
  }, [giftCards, selectedCategory]);

  const handleBuy = (item: GiftCardRow) => {
    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        id: item.id,
        name: item.title || item.brand || 'Gift Card',
        price_iqd: String(item.price_iqd || 0),
        price: String(item.price_iqd || 0),
        provider: String(item.brand || item.category || 'gift_card')
          .toLowerCase()
          .replace(/\s+/g, '_'),
        amount: String(item.amount || 0),
        type: 'gift',
        image_url: item.image_url || '',
        gift_card_id: item.id,
      },
    });
  };

  const Header = ({
    title,
    onBack,
    showNotification = true,
  }: {
    title: string;
    onBack: () => void;
    showNotification?: boolean;
  }) => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.85}
        style={styles.iconButton}
      >
        <Ionicons name="arrow-back" size={22} color="#5A4700" />
      </TouchableOpacity>

      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>

      {showNotification ? (
        <TouchableOpacity
          onPress={() => router.push('/(app)/notifications' as any)}
          activeOpacity={0.85}
          style={styles.iconButton}
        >
          <Ionicons name="notifications-outline" size={21} color="#5A4700" />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButtonPlaceholder} />
      )}
    </View>
  );

  if (selectedCategory && selectedMeta) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Header
            title={selectedMeta.title}
            onBack={() => setSelectedCategory(null)}
          />

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroMini}>
                  {i18n.t('giftCardsTitle') || 'Gift Cards'}
                </Text>
                <Text style={styles.heroTitle}>{selectedMeta.title}</Text>
                <Text style={styles.heroText}>
                  {i18n.t('selectGiftCardValue') ||
                    'Choose the card amount you want and continue your order.'}
                </Text>
              </View>

              {selectedMeta.image ? (
                <Image
                  source={{ uri: selectedMeta.image }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.heroIconWrap,
                    {
                      backgroundColor: selectedMeta.soft,
                      borderColor: selectedMeta.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={selectedMeta.icon}
                    size={40}
                    color={selectedMeta.color}
                  />
                </View>
              )}
            </View>
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#C99700" />
            </View>
          ) : selectedItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="gift-outline" size={38} color="#B08A00" />
              <Text style={styles.emptyTitle}>
                {i18n.t('noGiftCardsFound') || 'No gift cards found'}
              </Text>
              <Text style={styles.emptyText}>
                {i18n.t('giftCardsWillAppearSoon') ||
                  'Gift cards for this section will appear here after you add them from admin panel.'}
              </Text>
            </View>
          ) : (
            <View style={styles.listWrap}>
              {selectedItems.map((item) => (
                <View key={item.id} style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
                    <View
                      style={[
                        styles.providerBadge,
                        {
                          backgroundColor: selectedMeta.soft,
                          borderColor: selectedMeta.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={selectedMeta.icon}
                        size={14}
                        color={selectedMeta.color}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.providerBadgeText,
                          { color: selectedMeta.color },
                        ]}
                      >
                        {selectedMeta.title}
                      </Text>
                    </View>

                    <View style={styles.statusBadge}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color="#027A48"
                      />
                      <Text style={styles.statusBadgeText}>
                        {i18n.t('available') || 'Available'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>
                    {item.title ||
                      `${item.amount || 0} ${selectedMeta.title}`}
                  </Text>

                  {!!item.image_url && (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.itemPreviewImage}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.infoGrid}>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>
                        {i18n.t('giftAmount') || 'Card amount'}
                      </Text>
                      <Text style={styles.infoValue}>
                        {item.amount || 0}
                        {selectedCategory === 'pubg_uc' ? ' UC' : ''}
                      </Text>
                    </View>

                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>
                        {i18n.t('notifications.priceIqd') || 'Price (IQD)'}
                      </Text>
                      <Text style={styles.infoValue}>
                        {formatIQD(item.price_iqd)} IQD
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.buyButton}
                    activeOpacity={0.9}
                    onPress={() => handleBuy(item)}
                  >
                    <Ionicons name="cart-outline" size={18} color="#5A4700" />
                    <Text style={styles.buyButtonText}>
                      {i18n.t('buyNow') || 'Buy now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 28 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Header
          title={i18n.t('onlineGiftCards') || 'Online Gift Cards'}
          onBack={() => router.back()}
        />

        <View style={styles.heroCard}>
          <Text style={styles.heroMini}>
            {i18n.t('giftCardsTitle') || 'Gift Cards'}
          </Text>
          <Text style={styles.heroTitle}>
            {i18n.t('selectGiftCard') || 'Choose your gift card'}
          </Text>
          <Text style={styles.heroText}>
            {i18n.t('giftCardsDescription') ||
              'Open a card category, choose the amount, and continue your order easily.'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#C99700" />
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={styles.categoryCard}
                activeOpacity={0.9}
                onPress={() => setSelectedCategory(category.key)}
              >
                {category.image ? (
                  <Image
                    source={{ uri: category.image }}
                    style={styles.categoryImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.categoryIconWrap,
                      {
                        backgroundColor: category.soft,
                        borderColor: category.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={category.icon}
                      size={34}
                      color={category.color}
                    />
                  </View>
                )}

                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>

                <View style={styles.openBtn}>
                  <Text style={styles.openBtnText}>
                    {i18n.t('open') || 'Open'}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#5A4700"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 6 : 10,
    paddingBottom: 12,
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
  iconButtonPlaceholder: {
    width: 42,
    height: 42,
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
    paddingTop: 8,
    paddingBottom: 12,
  },

  heroCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF6D9',
    borderWidth: 1,
    borderColor: '#F3E3A7',
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
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
  heroImage: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
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

  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryImage: {
    width: 86,
    height: 86,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: '#F8F8F8',
  },
  categoryIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#211C11',
    textAlign: 'center',
  },
  categorySubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: '#806A12',
    textAlign: 'center',
    minHeight: 36,
  },
  openBtn: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F3D35C',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#5A4700',
  },

  listWrap: {
    gap: 14,
  },
  orderCard: {
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
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  providerBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ECFDF3',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#027A48',
  },

  cardTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '900',
    color: '#211C11',
    marginBottom: 12,
  },
  itemPreviewImage: {
    width: '100%',
    height: 160,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    marginBottom: 12,
  },

  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  infoBox: {
    flex: 1,
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
    fontSize: 15,
    color: '#241E0E',
    fontWeight: '900',
  },

  buyButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F3D35C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#5A4700',
  },
});

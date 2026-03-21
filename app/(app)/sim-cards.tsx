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

interface SimCardRow {
  id: string;
  title?: string | null;
  provider?: string | null;
  amount_iqd?: number | null;
  amount?: number | null;
  price_iqd?: number | null;
  image_url?: string | null;
  item_image_url?: string | null;
  provider_image_url?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
}

interface ProviderCard {
  key: string;
  title: string;
  subtitle: string;
  image: string | null;
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
  if (raw.startsWith('ckb')) return 'ckb';
  if (raw.startsWith('ku') || raw.startsWith('kmr')) return 'kmr';
  return 'en';
}

const TEXTS = {
  en: {
    pageTitle: 'Buy Mobile Cards',
    heroTitle: 'Choose mobile cards',
    heroSub: 'Open a provider and choose an available card easily.',
    search: 'Search by provider or card',
    noProviders: 'No providers available',
    noProvidersSub: 'No active mobile cards found in Supabase.',
    providers: 'Providers',
    cardsCount: 'cards',
    chooseProvider: 'Choose a provider to see available cards',
    selectedProvider: 'Selected provider',
    availableCards: 'Available cards',
    amount: 'Amount',
    price: 'Price',
    buyNow: 'Buy now',
    backToProviders: 'Back to providers',
  },
  ar: {
    pageTitle: 'شراء بطاقات الموبايل',
    heroTitle: 'اختر بطاقات الموبايل',
    heroSub: 'افتح مزود الخدمة واختر البطاقة المتوفرة بسهولة.',
    search: 'ابحث باسم الشركة أو البطاقة',
    noProviders: 'لا يوجد مزودون متوفرون',
    noProvidersSub: 'لا توجد بطاقات موبايل مفعلة في Supabase.',
    providers: 'الشركات',
    cardsCount: 'بطاقات',
    chooseProvider: 'اختر شركة لعرض البطاقات المتوفرة',
    selectedProvider: 'الشركة المحددة',
    availableCards: 'البطاقات المتوفرة',
    amount: 'القيمة',
    price: 'السعر',
    buyNow: 'اشتر الآن',
    backToProviders: 'العودة للشركات',
  },
  ckb: {
    pageTitle: 'کرینا کارتێن مۆبایل',
    heroTitle: 'کارتێن مۆبایل هەڵبژێرە',
    heroSub: 'تۆڕێک هەڵبژێرە و کارتێکا بەردەست بکڕە.',
    search: 'لەگەڕێ بە ناوی تۆڕ یان کارت',
    noProviders: 'هیچ تۆڕێک بەردەست نییە',
    noProvidersSub: 'هیچ کارتێکی مۆبایلێکی چالاک لە Supabase نەدۆزرایەوە.',
    providers: 'تۆڕەکان',
    cardsCount: 'کارت',
    chooseProvider: 'تۆڕێک هەڵبژێرە بۆ بینینی کارتە بەردەستەکان',
    selectedProvider: 'تۆڕی هەڵبژێردراو',
    availableCards: 'کارتە بەردەستەکان',
    amount: 'بڕ',
    price: 'نرخ',
    buyNow: 'ئێستا بکڕە',
    backToProviders: 'گەڕانەوە بۆ تۆڕەکان',
  },
  kmr: {
    pageTitle: 'کرینا کارتێن موبایل',
    heroTitle: 'کارتێن موبایل هەلبژێرە',
    heroSub: 'تورەکێ هەلبژێرە و کارتێکا بەردەست بکرە.',
    search: 'لێگەڕێ ب ناڤێ تورێ یان کارتێ',
    noProviders: 'هیچ تورەک بەردەست نینە',
    noProvidersSub: 'هیچ کارتێن موبایلێن چالاک ل Supabase نەهاتیە دیتن.',
    providers: 'تور',
    cardsCount: 'کارت',
    chooseProvider: 'تورەکێ هەلبژێرە بۆ دیتنا کارتێن بەردەست',
    selectedProvider: 'تورا هەلبژێردی',
    availableCards: 'کارتێن بەردەست',
    amount: 'بڕ',
    price: 'نرخ',
    buyNow: 'ئێستا بکرە',
    backToProviders: 'ڤەگەڕان بۆ توران',
  },
} as const;

function useT() {
  const lang = getCurrentLang() as keyof typeof TEXTS;
  return TEXTS[lang] || TEXTS.en;
}

function normalizeProvider(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .replace(/-/g, '');
}

function prettyProviderName(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return 'Provider';

  if (normalizeProvider(raw) === 'asiacell') return 'AsiaCell';
  if (normalizeProvider(raw) === 'ftth') return 'FTTH';

  return raw
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatIQD(value?: number | null) {
  const num = Number(value || 0);
  const rounded = Math.round(num);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatAmountPlain(value?: number | null) {
  const num = Number(value || 0);
  const rounded = Math.round(num);
  return rounded.toString();
}

function pickProviderTheme(key?: string | null) {
  const normalized = normalizeProvider(key);

  if (normalized.includes('asiacell')) {
    return { color: '#D53434', soft: '#FFF1F1', border: '#F6CACA' };
  }
  if (normalized.includes('korek')) {
    return { color: '#1570A6', soft: '#EEF7FF', border: '#CDE5F7' };
  }
  if (normalized.includes('zain')) {
    return { color: '#0F766E', soft: '#ECFEFF', border: '#BEEEF1' };
  }
  if (normalized.includes('ftth')) {
    return { color: '#2563EB', soft: '#EFF6FF', border: '#BFDBFE' };
  }
  if (normalized.includes('reber')) {
    return { color: '#7C3AED', soft: '#F5F3FF', border: '#DDD6FE' };
  }
  if (normalized.includes('kurdtel')) {
    return { color: '#CA8A04', soft: '#FEFCE8', border: '#FDE68A' };
  }
  if (normalized.includes('zenopay')) {
    return { color: '#0EA5B7', soft: '#ECFEFF', border: '#BDEFF5' };
  }

  return { color: '#1570A6', soft: '#EEF7FF', border: '#CDE5F7' };
}

function getProviderImageFromCard(row: SimCardRow) {
  return row.provider_image_url || null;
}

function getItemImage(row: SimCardRow) {
  return row.item_image_url || row.image_url || row.provider_image_url || null;
}

function getRawAmount(row: SimCardRow) {
  return Number(row.amount_iqd || 0) || Number(row.amount || 0) || 0;
}

function getItemTitle(row: SimCardRow, providerMeta?: ProviderCard | null) {
  if (row.title && row.title.trim()) return row.title.trim();

  const amount = getRawAmount(row);

  if (amount > 0) {
    return `${formatIQD(amount)}`;
  }

  return providerMeta?.title || 'Mobile Card';
}

function getAmountLabel(row: SimCardRow) {
  const amount = getRawAmount(row);
  if (amount <= 0) return '';
  return formatAmountPlain(amount);
}

export default function SimCardsScreen() {
  useTheme();
  const router = useRouter();
  const t = useT();

  const [simCards, setSimCards] = useState<SimCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const fetchSimCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('topup_cards')
        .select('*')
        .eq('is_active', true)
        .order('provider', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('price_iqd', { ascending: true });

      if (error) throw error;

      setSimCards((data || []) as SimCardRow[]);
    } catch (error: any) {
      console.log('sim-cards screen error:', error);
      Alert.alert(
        i18n.t('common.error') || 'Error',
        error?.message || 'Could not load mobile cards.'
      );
      setSimCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSimCards();
  }, [fetchSimCards]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSimCards();
  };

  const providers = useMemo(() => {
    const map = new Map<string, ProviderCard>();

    for (const row of simCards) {
      const key = normalizeProvider(row.provider);
      if (!key) continue;

      const theme = pickProviderTheme(key);
      const image = getProviderImageFromCard(row);

      if (!map.has(key)) {
        map.set(key, {
          key,
          title: prettyProviderName(row.provider),
          subtitle: 'Mobile Cards',
          image,
          color: theme.color,
          soft: theme.soft,
          border: theme.border,
          count: 1,
          sort_order: Number(row.sort_order || 0),
        });
      } else {
        const current = map.get(key)!;
        map.set(key, {
          ...current,
          count: Number(current.count || 0) + 1,
          image: current.image || image,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aOrder = Number(a.sort_order || 0);
      const bOrder = Number(b.sort_order || 0);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.title.localeCompare(b.title);
    });
  }, [simCards]);

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;

    return providers.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q)
      );
    });
  }, [providers, search]);

  const selectedMeta = useMemo(() => {
    if (!selectedProvider) return null;
    return providers.find((item) => item.key === selectedProvider) || null;
  }, [providers, selectedProvider]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return simCards
      .filter((row) => {
        const key = normalizeProvider(row.provider);
        const matchProvider = selectedProvider ? key === selectedProvider : true;

        const title = String(row.title || '').toLowerCase();
        const provider = String(row.provider || '').toLowerCase();
        const amount = String(row.amount_iqd || row.amount || '');
        const price = String(row.price_iqd || '');

        const matchSearch = q
          ? title.includes(q) ||
            provider.includes(q) ||
            amount.includes(q) ||
            price.includes(q)
          : true;

        return matchProvider && matchSearch;
      })
      .sort((a, b) => {
        const aOrder = Number(a.sort_order || 0);
        const bOrder = Number(b.sort_order || 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return Number(a.price_iqd || 0) - Number(b.price_iqd || 0);
      });
  }, [simCards, selectedProvider, search]);

  const handleBuy = (item: SimCardRow) => {
    const finalPriceIqd = Number(item.price_iqd || 0);
    const finalAmount = getRawAmount(item);
    const finalImage = String(getItemImage(item) || '');
    const amountLabel = getAmountLabel(item);

    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        id: item.id,
        name: getItemTitle(item, selectedMeta),
        price_iqd: String(finalPriceIqd),
        price: String(finalPriceIqd),
        provider: String(item.provider || 'sim').toLowerCase(),
        amount: String(finalAmount),
        amount_label: amountLabel,
        type: 'sim',
        image: finalImage,
        image_url: finalImage,
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
            if (selectedProvider) {
              setSelectedProvider(null);
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
            {selectedMeta ? `${t.selectedProvider}: ${selectedMeta.title}` : t.chooseProvider}
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={22} color="#8C8C8C" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.search}
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
        ) : !selectedProvider ? (
          filteredProviders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="card-outline" size={36} color="#B08A00" />
              <Text style={styles.emptyTitle}>{t.noProviders}</Text>
              <Text style={styles.emptyText}>{t.noProvidersSub}</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.providers}</Text>
              </View>

              <View style={styles.providersGrid}>
                {filteredProviders.map((provider) => (
                  <TouchableOpacity
                    key={provider.key}
                    activeOpacity={0.92}
                    style={styles.providerCard}
                    onPress={() => {
                      setSelectedProvider(provider.key);
                      setSearch('');
                    }}
                  >
                    {provider.image ? (
                      <View
                        style={[
                          styles.providerImageWrap,
                          {
                            backgroundColor: provider.soft,
                            borderColor: provider.border,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: provider.image }}
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
                            backgroundColor: provider.soft,
                            borderColor: provider.border,
                          },
                        ]}
                      >
                        <Ionicons name="card-outline" size={42} color={provider.color} />
                      </View>
                    )}

                    <View style={styles.providerFooter}>
                      <Text numberOfLines={1} style={styles.providerName}>
                        {provider.title}
                      </Text>
                      <Text style={styles.providerCount}>
                        {Number(provider.count || 0)} {t.cardsCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={36} color="#B08A00" />
            <Text style={styles.emptyTitle}>{t.noProviders}</Text>
            <Text style={styles.emptyText}>{t.noProvidersSub}</Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.backToProvidersButton}
              onPress={() => {
                setSelectedProvider(null);
                setSearch('');
              }}
            >
              <Text style={styles.backToProvidersButtonText}>{t.backToProviders}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.availableCards}</Text>

              <TouchableOpacity
                onPress={() => {
                  setSelectedProvider(null);
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
                const imageUri = getItemImage(item) || '';
                const amountLabel = getAmountLabel(item);

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
                          name="card-outline"
                          size={34}
                          color={selectedMeta?.color || '#B7791F'}
                        />
                      </View>
                    )}

                    <View style={styles.cardMiddle}>
                      <Text numberOfLines={2} style={styles.cardName}>
                        {getItemTitle(item, selectedMeta)}
                      </Text>

                      {!!amountLabel && (
                        <Text style={styles.cardAmountText}>
                          {t.amount}: {amountLabel}
                        </Text>
                      )}

                      {!!item.notes && (
                        <Text numberOfLines={2} style={styles.cardDescription}>
                          {item.notes}
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

  backToProvidersButton: {
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
  backToProvidersButtonText: {
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
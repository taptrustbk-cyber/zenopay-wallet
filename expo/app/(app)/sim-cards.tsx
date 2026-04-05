import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';

interface TopupProviderRow {
  id: string;
  provider_key?: string | null;
  title?: string | null;
  subtitle?: string | null;
  logo_url?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
}

interface SimCardRow {
  id: string;
  provider_id?: string | null;
  title?: string | null;
  provider?: string | null;
  provider_title?: string | null;
  provider_logo_url?: string | null;
  amount_iqd?: number | null;
  amount?: number | null;
  price_iqd?: number | null;
  image_url?: string | null;
  card_image_url?: string | null;
  item_image_url?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
}

interface ProviderCard {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  image: string | null;
  color: string;
  soft: string;
  border: string;
  count: number;
  sort_order: number;
  is_active: boolean;
}

const UI = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',
  border2: '#CFE0F5',

  blue: '#2563EB',
  blue2: '#3B82F6',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  shadow: '#7DA8E6',
};

const SHADOWS = {
  card: {
    shadowColor: UI.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: UI.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

function tSafe(key: string, fallback: string) {
  try {
    const value = i18n.t(key as any);
    if (!value) return fallback;

    const text = String(value);
    const lower = text.toLowerCase();

    if (
      text === key ||
      lower.includes('missing translation') ||
      lower.includes('missing "') ||
      text.includes(`"${key}"`)
    ) {
      return fallback;
    }

    return text;
  } catch {
    return fallback;
  }
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
  if (!raw) return tSafe('simCards.providerFallback', 'Provider');

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

function getCurrencyLabel() {
  const lang = String((i18n as any).locale || '').toLowerCase();
  return ['ar', 'ckb', 'cbk', 'kmr', 'ku'].includes(lang)
    ? tSafe('iqdShort', 'د.غ')
    : tSafe('iqdShort', 'IQD');
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

function getRawAmount(row: SimCardRow) {
  return Number(row.amount_iqd || 0) || Number(row.amount || 0) || 0;
}

function getItemTitle(row: SimCardRow, providerMeta?: ProviderCard | null) {
  if (row.title && row.title.trim()) return row.title.trim();

  const amount = getRawAmount(row);

  if (amount > 0) {
    return `${formatIQD(amount)}`;
  }

  return providerMeta?.title || tSafe('simCards.mobileCardFallback', 'Mobile Card');
}

function getAmountLabel(row: SimCardRow) {
  const amount = getRawAmount(row);
  if (amount <= 0) return '';
  return formatAmountPlain(amount);
}

function getCardImage(row: SimCardRow) {
  return row.card_image_url || row.item_image_url || row.image_url || null;
}

export default function SimCardsScreen() {
  useTheme();
  const router = useRouter();
  const isRTL = I18nManager.isRTL;

  const [providersRows, setProvidersRows] = useState<TopupProviderRow[]>([]);
  const [simCards, setSimCards] = useState<SimCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [failedProviderImages, setFailedProviderImages] = useState<Record<string, boolean>>({});
  const [failedCardImages, setFailedCardImages] = useState<Record<string, boolean>>({});

  const fetchSimCards = useCallback(async () => {
    try {
      const [providersRes, cardsRes] = await Promise.all([
        supabase
          .from('topup_providers')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('topup_cards')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('price_iqd', { ascending: true }),
      ]);

      if (providersRes.error) throw providersRes.error;
      if (cardsRes.error) throw cardsRes.error;

      const providerData = (providersRes.data || []) as TopupProviderRow[];
      const cardsData = (cardsRes.data || []) as SimCardRow[];

      setProvidersRows(providerData);
      setSimCards(cardsData);

      const preloadUrls = [
        ...providerData.map((x) => x.logo_url).filter(Boolean),
        ...cardsData.map((x) => getCardImage(x)).filter(Boolean),
      ] as string[];

      if (preloadUrls.length) {
        ExpoImage.prefetch(preloadUrls).catch(() => {});
      }
    } catch (error: any) {
      console.log('sim-cards screen error:', error);
      Alert.alert(
        tSafe('common.error', 'Error'),
        error?.message || tSafe('simCards.loadFailed', 'Could not load mobile cards.')
      );
      setProvidersRows([]);
      setSimCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSimCards();
  }, [fetchSimCards]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSimCards();
  };

  const providerMap = useMemo(() => {
    const map = new Map<string, TopupProviderRow>();

    for (const row of providersRows) {
      const byId = String(row.id || '').trim();
      const byKey = normalizeProvider(row.provider_key || row.title);

      if (byId) map.set(byId, row);
      if (byKey) map.set(byKey, row);
    }

    return map;
  }, [providersRows]);

  const providers = useMemo(() => {
    const map = new Map<string, ProviderCard>();

    for (const row of simCards) {
      const providerRow =
        (row.provider_id && providerMap.get(String(row.provider_id))) ||
        providerMap.get(normalizeProvider(row.provider || row.provider_title));

      const providerKey = normalizeProvider(
        providerRow?.provider_key || row.provider || row.provider_title
      );
      if (!providerKey) continue;

      const theme = pickProviderTheme(providerKey);
      const providerImage = providerRow?.logo_url || row.provider_logo_url || null;
      const providerTitle = prettyProviderName(
        providerRow?.title || row.provider_title || row.provider
      );
      const providerSubtitle = String(
        providerRow?.subtitle || tSafe('simCards.providerSubtitleDefault', 'Mobile Cards')
      );

      const currentSortOrder = Number(providerRow?.sort_order ?? row.sort_order ?? 0);

      if (!map.has(providerKey)) {
        map.set(providerKey, {
          id: String(providerRow?.id || providerKey),
          key: providerKey,
          title: providerTitle,
          subtitle: providerSubtitle,
          image: providerImage,
          color: theme.color,
          soft: theme.soft,
          border: theme.border,
          count: 1,
          sort_order: currentSortOrder,
          is_active: !!(providerRow?.is_active ?? row.is_active),
        });
      } else {
        const current = map.get(providerKey)!;
        map.set(providerKey, {
          ...current,
          count: current.count + 1,
          image: current.image || providerImage,
        });
      }
    }

    return Array.from(map.values())
      .filter((x) => x.is_active)
      .sort((a, b) => {
        const aOrder = Number(a.sort_order || 0);
        const bOrder = Number(b.sort_order || 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.title.localeCompare(b.title);
      });
  }, [simCards, providerMap]);

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
        const providerRow =
          (row.provider_id && providerMap.get(String(row.provider_id))) ||
          providerMap.get(normalizeProvider(row.provider || row.provider_title));

        const key = normalizeProvider(
          providerRow?.provider_key || row.provider || row.provider_title
        );

        const matchProvider = selectedProvider ? key === selectedProvider : true;

        const title = String(row.title || '').toLowerCase();
        const provider = String(
          providerRow?.title || row.provider_title || row.provider || ''
        ).toLowerCase();
        const amount = String(row.amount_iqd || row.amount || '');
        const price = String(row.price_iqd || '');

        const matchSearch = q
          ? title.includes(q) ||
            provider.includes(q) ||
            amount.includes(q) ||
            price.includes(q)
          : true;

        return !!row.is_active && matchProvider && matchSearch;
      })
      .sort((a, b) => {
        const aOrder = Number(a.sort_order || 0);
        const bOrder = Number(b.sort_order || 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return Number(a.price_iqd || 0) - Number(b.price_iqd || 0);
      });
  }, [simCards, providerMap, selectedProvider, search]);

  const handleBuy = (item: SimCardRow) => {
    const finalPriceIqd = Number(item.price_iqd || 0);
    const finalAmount = getRawAmount(item);
    const finalImage = String(getCardImage(item) || '');
    const amountLabel = getAmountLabel(item);

    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        id: item.id,
        name: getItemTitle(item, selectedMeta),
        price_iqd: String(finalPriceIqd),
        price: String(finalPriceIqd),
        provider: String(item.provider || item.provider_title || 'sim').toLowerCase(),
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
          activeOpacity={0.9}
          style={styles.iconButton}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color={UI.blueDark}
          />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {selectedMeta?.title || tSafe('simCards.pageTitle', 'Buy Mobile Cards')}
        </Text>

        <TouchableOpacity
          onPress={openNotifications}
          activeOpacity={0.9}
          style={styles.iconButton}
        >
          <Ionicons name="notifications-outline" size={21} color={UI.blueDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={UI.blue}
            colors={[UI.blue]}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <Text style={styles.heroTitle}>
            {selectedMeta?.title || tSafe('simCards.heroTitle', 'Choose mobile cards')}
          </Text>
          <Text style={styles.heroSubtitle}>
            {selectedMeta
              ? `${tSafe('simCards.selectedProvider', 'Selected provider')}: ${selectedMeta.title}`
              : tSafe('simCards.chooseProvider', 'Choose a provider to see available cards')}
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={22} color={UI.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={tSafe('simCards.search', 'Search by provider or card')}
            placeholderTextColor={UI.text3}
            style={styles.searchInput}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={UI.text3} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={UI.blue} />
          </View>
        ) : !selectedProvider ? (
          filteredProviders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="card-outline" size={36} color={UI.blue} />
              <Text style={styles.emptyTitle}>
                {tSafe('simCards.noProviders', 'No providers available')}
              </Text>
              <Text style={styles.emptyText}>
                {tSafe('simCards.noProvidersSub', 'No active mobile cards found in Supabase.')}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {tSafe('simCards.providers', 'Providers')}
                </Text>
              </View>

              <View style={styles.providersGrid}>
                {filteredProviders.map((provider) => {
                  const canShowImage = !!provider.image && !failedProviderImages[provider.key];

                  return (
                    <TouchableOpacity
                      key={provider.key}
                      activeOpacity={0.94}
                      style={styles.providerCard}
                      onPress={() => {
                        setSelectedProvider(provider.key);
                        setSearch('');
                      }}
                    >
                      {canShowImage ? (
                        <View
                          style={[
                            styles.providerImageWrap,
                            {
                              backgroundColor: '#FFFFFF',
                              borderColor: provider.border,
                            },
                          ]}
                        >
                          <ExpoImage
                            source={{ uri: provider.image! }}
                            style={styles.providerImage}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={120}
                            onError={() =>
                              setFailedProviderImages((prev) => ({
                                ...prev,
                                [provider.key]: true,
                              }))
                            }
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
                          {Number(provider.count || 0)}{' '}
                          {tSafe('simCards.cardsCount', 'cards')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={36} color={UI.blue} />
            <Text style={styles.emptyTitle}>
              {tSafe('simCards.noProviders', 'No providers available')}
            </Text>
            <Text style={styles.emptyText}>
              {tSafe('simCards.noProvidersSub', 'No active mobile cards found in Supabase.')}
            </Text>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.backToProvidersButton}
              onPress={() => {
                setSelectedProvider(null);
                setSearch('');
              }}
            >
              <Text style={styles.backToProvidersButtonText}>
                {tSafe('simCards.backToProviders', 'Back to providers')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {tSafe('simCards.availableCards', 'Available cards')}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setSelectedProvider(null);
                  setSearch('');
                }}
                activeOpacity={0.9}
                style={styles.backProvidersMini}
              >
                <Ionicons name="grid-outline" size={14} color={UI.blueDark} />
                <Text style={styles.backProvidersMiniText}>
                  {tSafe('simCards.providers', 'Providers')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardsList}>
              {filteredItems.map((item) => {
                const imageUri = getCardImage(item) || '';
                const amountLabel = getAmountLabel(item);
                const canShowImage = !!imageUri && !failedCardImages[item.id];

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.cardRow}
                    activeOpacity={0.94}
                    onPress={() => handleBuy(item)}
                  >
                    {canShowImage ? (
                      <View
                        style={[
                          styles.cardImageWrap,
                          {
                            backgroundColor: selectedMeta?.soft || UI.blueSoft,
                            borderColor: selectedMeta?.border || UI.border2,
                          },
                        ]}
                      >
                        <ExpoImage
                          source={{ uri: imageUri }}
                          style={styles.cardImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={120}
                          onError={() =>
                            setFailedCardImages((prev) => ({
                              ...prev,
                              [item.id]: true,
                            }))
                          }
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.cardImageWrap,
                          styles.fallbackCenter,
                          {
                            backgroundColor: selectedMeta?.soft || UI.blueSoft,
                            borderColor: selectedMeta?.border || UI.border2,
                          },
                        ]}
                      >
                        <Ionicons
                          name="card-outline"
                          size={34}
                          color={selectedMeta?.color || UI.blue}
                        />
                      </View>
                    )}

                    <View style={styles.cardMiddle}>
                      <Text numberOfLines={2} style={styles.cardName}>
                        {getItemTitle(item, selectedMeta)}
                      </Text>

                      {!!amountLabel && (
                        <Text style={styles.cardAmountText}>
                          {tSafe('simCards.amount', 'Amount')}: {amountLabel}
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
                        {formatIQD(item.price_iqd)} {getCurrencyLabel()}
                      </Text>

                      <View style={styles.buyMiniButton}>
                        <Ionicons name="cart-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.buyMiniButtonText}>
                          {tSafe('simCards.buyNow', 'Buy now')}
                        </Text>
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
    backgroundColor: UI.page,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
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
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: UI.border2,
    marginBottom: 14,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(59,130,246,0.10)',
    left: -45,
    bottom: -80,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(37,99,235,0.08)',
    right: -25,
    top: -30,
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '700',
    color: UI.blueDark,
    lineHeight: 20,
    textAlign: 'center',
  },

  searchBox: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: UI.text,
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
    color: UI.text,
  },

  loaderWrap: {
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    marginTop: 8,
    borderRadius: 24,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginTop: 10,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: UI.text2,
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
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
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
    color: UI.text,
  },
  providerCount: {
    marginTop: 4,
    fontSize: 12,
    color: UI.text2,
    fontWeight: '800',
  },

  backToProvidersButton: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: UI.blue,
    borderWidth: 1,
    borderColor: UI.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backToProvidersButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  backProvidersMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: UI.border2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backProvidersMiniText: {
    color: UI.blueDark,
    fontSize: 12,
    fontWeight: '900',
  },

  cardsList: {
    gap: 12,
  },
  cardRow: {
    borderRadius: 24,
    padding: 12,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
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
    color: UI.text,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardAmountText: {
    fontSize: 13,
    color: UI.text2,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: UI.text2,
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
    color: UI.blueDark,
  },
  buyMiniButton: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: UI.blue,
    borderWidth: 1,
    borderColor: UI.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
  },
  buyMiniButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
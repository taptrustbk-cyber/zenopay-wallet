import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

const IQD_RATE = 1530;

interface TopupCard {
  id: string;
  title: string;
  provider: string;
  category: string | null;
  amount_iqd: number;
  price_usd: number;
  price_iqd?: number | null;
  image_url: string | null;
  description?: string | null;
  is_active: boolean;
  sort_order: number | null;
}

const providerConfig: Record<
  string,
  {
    label: string;
    color: string;
    soft: string;
    border: string;
    logo: string;
  }
> = {
  korek: {
    label: 'Korek',
    color: '#1570A6',
    soft: '#F1F9FF',
    border: '#D8EEFF',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uu16k1t8p3uz3dpr3k6ic',
  },
  zain: {
    label: 'Zain',
    color: '#6E3CBC',
    soft: '#F6F1FF',
    border: '#E8DFFF',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uq8qjx7d0g47h9rv2jvzz',
  },
  asiacell: {
    label: 'AsiaCell',
    color: '#D53434',
    soft: '#FFF3F2',
    border: '#FFDCD8',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q8puaw0dyshx6jruwg83i',
  },
  ftth: {
    label: 'FTTH',
    color: '#2269D1',
    soft: '#F2F7FF',
    border: '#DCE8FF',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1ogdfkyuisk5c6unchj2s',
  },
  fasthope: {
    label: 'Fast Hope',
    color: '#E03E84',
    soft: '#FFF1F7',
    border: '#FFD9E8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Help_Icon.svg/1024px-Help_Icon.svg.png',
  },
  kurdtel: {
    label: 'Kurdtel',
    color: '#333333',
    soft: '#F7F7F7',
    border: '#E8E8E8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png',
  },
};

function getProviderStyle(provider?: string | null) {
  const key = String(provider || '').toLowerCase();
  return (
    providerConfig[key] || {
      label: provider || 'Card',
      color: '#9A7B00',
      soft: '#FFFBEF',
      border: '#F3E1A2',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png',
    }
  );
}

function formatIQD(value?: number | null) {
  const num = Number(value || 0);
  const rounded = Math.round(num);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getCurrentLang() {
  const raw = String((i18n as any)?.language || (i18n as any)?.locale || 'en').toLowerCase();
  if (raw.startsWith('ar')) return 'ar';
  if (raw.startsWith('ckb')) return 'ckb';
  if (raw.startsWith('ku') || raw.startsWith('kmr')) return 'kmr';
  return 'en';
}

const TEXTS = {
  en: {
    pageTitle: 'Top-Up Cards',
    mobileCards: 'Buy Mobile Cards',
    searchProviders: 'Search network or card',
    noNetworks: 'No cards available',
    noNetworksSub: 'No active cards found in Supabase.',
    buyNow: 'Buy now',
    amount: 'Amount',
    price: 'Price',
    selectedNetwork: 'Selected network',
    providers: 'Providers',
    availableCards: 'Available cards',
    cardsCount: 'cards',
    chooseProvider: 'Choose a provider to see available cards',
    backToProviders: 'Back to providers',
  },
  ar: {
    pageTitle: 'بطاقات التعبئة',
    mobileCards: 'شراء بطاقات الموبايل',
    searchProviders: 'ابحث عن الشبكة أو البطاقة',
    noNetworks: 'لا توجد بطاقات',
    noNetworksSub: 'لا توجد بطاقات مفعلة في Supabase.',
    buyNow: 'اشتر الآن',
    amount: 'الفئة',
    price: 'السعر',
    selectedNetwork: 'الشبكة المحددة',
    providers: 'الشبكات',
    availableCards: 'البطاقات المتوفرة',
    cardsCount: 'بطاقات',
    chooseProvider: 'اختر شبكة لعرض البطاقات المتوفرة',
    backToProviders: 'العودة للشبكات',
  },
  ckb: {
    pageTitle: 'کڕینی کارتی مۆبایل',
    mobileCards: 'کڕینی کارتی مۆبایل',
    searchProviders: 'گەڕان بە ناوی نێتوورک یان کارت',
    noNetworks: 'هیچ کارتێک بەردەست نییە',
    noNetworksSub: 'هیچ کارتێکی چالاک لە Supabase نەدۆزرایەوە.',
    buyNow: 'ئێستا بکڕە',
    amount: 'بڕ',
    price: 'نرخ',
    selectedNetwork: 'نێتوورکی هەڵبژێردراو',
    providers: 'نێتوورکەکان',
    availableCards: 'کارتە بەردەستەکان',
    cardsCount: 'کارت',
    chooseProvider: 'نێتوورکێک هەڵبژێرە بۆ بینینی کارتە بەردەستەکان',
    backToProviders: 'گەڕانەوە بۆ نێتوورکەکان',
  },
  kmr: {
    pageTitle: 'کرینا کارتێن موبایل',
    mobileCards: 'کرینا کارتێن موبایل',
    searchProviders: 'لێگەڕێ ب ناڤێ تۆڕێ یان کارتێ',
    noNetworks: 'هیچ کارتێن بەردەست نینن',
    noNetworksSub: 'هیچ کارتێن چالاک ل Supabase نەهاتیە دیتن.',
    buyNow: 'ئێستا بکرە',
    amount: 'بڕ',
    price: 'نرخ',
    selectedNetwork: 'تۆڕا هەلبژێردی',
    providers: 'تۆڕ',
    availableCards: 'کارتێن بەردەست',
    cardsCount: 'کارت',
    chooseProvider: 'تۆڕەکێ هەلبژێرە بۆ دیتنا کارتێن بەردەست',
    backToProviders: 'ڤەگەڕان بۆ تۆڕان',
  },
} as const;

function useT() {
  const lang = getCurrentLang() as keyof typeof TEXTS;
  return TEXTS[lang] || TEXTS.en;
}

export default function SimCardsScreen() {
  const router = useRouter();
  const t = useT();

  const [cards, setCards] = useState<TopupCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('topup_cards')
        .select('*')
        .eq('is_active', true)
        .order('provider', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('amount_iqd', { ascending: true });

      if (error) throw error;
      setCards((data || []) as TopupCard[]);
    } catch (error: any) {
      console.log('sim-card error:', error);
      Alert.alert('Error', error?.message || 'Could not load cards.');
      setCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCards();
  };

  const providerList = useMemo(() => {
    const map = new Map<
      string,
      {
        provider: string;
        count: number;
        preview?: string | null;
      }
    >();

    cards.forEach((card) => {
      const key = String(card.provider || '').toLowerCase();
      const current = map.get(key);

      if (!current) {
        map.set(key, {
          provider: key,
          count: 1,
          preview: card.image_url,
        });
      } else {
        current.count += 1;
        if (!current.preview && card.image_url) current.preview = card.image_url;
      }
    });

    return Array.from(map.values());
  }, [cards]);

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providerList;

    return providerList.filter((item) => {
      const style = getProviderStyle(item.provider);
      return item.provider.includes(q) || style.label.toLowerCase().includes(q);
    });
  }, [providerList, search]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchProvider = selectedProvider
        ? String(card.provider || '').toLowerCase() === String(selectedProvider).toLowerCase()
        : true;

      const matchSearch = q
        ? card.title?.toLowerCase().includes(q) ||
          card.provider?.toLowerCase().includes(q) ||
          String(card.amount_iqd || '').includes(q) ||
          String(card.price_iqd || '').includes(q)
        : true;

      return matchProvider && matchSearch;
    });
  }, [cards, search, selectedProvider]);

  const handleCardPress = (card: TopupCard) => {
    const finalPriceIqd =
      Number(card.price_iqd || 0) > 0
        ? Number(card.price_iqd || 0)
        : Math.round((card.price_usd || 0) * IQD_RATE);

    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        id: card.id,
        name: card.title,
        price: String(card.price_usd),
        provider: card.provider,
        amount: String(card.amount_iqd),
        type: 'sim',
        image: card.image_url || '',
        iqd_price: String(finalPriceIqd),
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
          {selectedProvider ? getProviderStyle(selectedProvider).label : t.pageTitle}
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
          <Text style={styles.heroTitle}>{t.mobileCards}</Text>
          <Text style={styles.heroSubtitle}>
            {selectedProvider
              ? `${t.selectedNetwork}: ${getProviderStyle(selectedProvider).label}`
              : t.chooseProvider}
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={22} color="#8C8C8C" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.searchProviders}
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
              <Text style={styles.emptyTitle}>{t.noNetworks}</Text>
              <Text style={styles.emptyText}>{t.noNetworksSub}</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.providers}</Text>
              </View>

              <View style={styles.providersGrid}>
                {filteredProviders.map((item) => {
                  const provider = getProviderStyle(item.provider);
                  const imageUri = item.preview || provider.logo;

                  return (
                    <TouchableOpacity
                      key={item.provider}
                      activeOpacity={0.92}
                      style={styles.providerCard}
                      onPress={() => {
                        setSelectedProvider(item.provider);
                        setSearch('');
                      }}
                    >
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
                          source={{ uri: imageUri }}
                          style={styles.providerImage}
                          resizeMode="cover"
                        />
                      </View>

                      <View style={styles.providerFooter}>
                        <Text numberOfLines={1} style={styles.providerName}>
                          {provider.label}
                        </Text>
                        <Text style={styles.providerCount}>
                          {item.count} {t.cardsCount}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )
        ) : filteredCards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={36} color="#B08A00" />
            <Text style={styles.emptyTitle}>{t.noNetworks}</Text>
            <Text style={styles.emptyText}>{t.noNetworksSub}</Text>

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
              {filteredCards.map((card) => {
                const provider = getProviderStyle(card.provider);
                const finalPriceIqd =
                  Number(card.price_iqd || 0) > 0
                    ? Number(card.price_iqd || 0)
                    : Math.round((card.price_usd || 0) * IQD_RATE);

                const imageUri = card.image_url || provider.logo;

                return (
                  <TouchableOpacity
                    key={card.id}
                    style={styles.cardRow}
                    activeOpacity={0.92}
                    onPress={() => handleCardPress(card)}
                  >
                    <View
                      style={[
                        styles.cardImageWrap,
                        {
                          backgroundColor: provider.soft,
                          borderColor: provider.border,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    </View>

                    <View style={styles.cardMiddle}>
                      <Text numberOfLines={2} style={styles.cardName}>
                        {card.title}
                      </Text>

                      <Text style={styles.cardAmountText}>
                        {t.amount}: {formatIQD(card.amount_iqd)} IQD
                      </Text>

                      {!!card.description && (
                        <Text numberOfLines={2} style={styles.cardDescription}>
                          {card.description}
                        </Text>
                      )}
                    </View>

                    <View style={styles.cardRight}>
                      <Text style={styles.cardPriceValue}>{formatIQD(finalPriceIqd)} IQD</Text>

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
    backgroundColor: '#FFFDF8',
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

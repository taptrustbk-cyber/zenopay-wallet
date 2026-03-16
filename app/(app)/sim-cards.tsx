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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';

const IQD_RATE = 1530;

interface TopupCard {
  id: string;
  title: string;
  provider: string;
  category: string | null;
  amount_iqd: number;
  price_usd: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number | null;
}

interface TopupOrder {
  id: string;
  provider?: string | null;
  card_title?: string | null;
  amount_iqd?: number | null;
  price_iqd?: number | null;
  status?: string | null;
  pin_code?: string | null;
  created_at?: string | null;
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
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(date?: string | null) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '';
  }
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
    recentOrders: 'Your recent card orders',
    seeAll: 'See all',
    noOrders: 'You have not purchased any cards yet',
    pending: 'Pending',
    success: 'Success',
    cancelled: 'Cancelled',
    pinReady: 'PIN ready',
    pinPending: 'Pending delivery',
    buyNow: 'Buy now',
    amount: 'Amount',
    price: 'Price',
    selectedNetwork: 'Selected network',
    cardsAvailable: 'Available cards',
  },
  ar: {
    pageTitle: 'بطاقات التعبئة',
    mobileCards: 'شراء بطاقات الموبايل',
    searchProviders: 'ابحث عن الشبكة أو البطاقة',
    noNetworks: 'لا توجد بطاقات',
    noNetworksSub: 'لا توجد بطاقات مفعلة في Supabase.',
    recentOrders: 'آخر طلباتك للبطاقات',
    seeAll: 'عرض الكل',
    noOrders: 'لم تقم بشراء أي بطاقة بعد',
    pending: 'قيد الانتظار',
    success: 'ناجح',
    cancelled: 'ملغي',
    pinReady: 'الرمز جاهز',
    pinPending: 'بانتظار التسليم',
    buyNow: 'اشتر الآن',
    amount: 'الفئة',
    price: 'السعر',
    selectedNetwork: 'الشبكة المحددة',
    cardsAvailable: 'البطاقات المتوفرة',
  },
  ckb: {
    pageTitle: 'کڕینی کارتی مۆبایل',
    mobileCards: 'کڕینی کارتی مۆبایل',
    searchProviders: 'گەڕان بە ناوی نێتوورک یان کارت',
    noNetworks: 'هیچ کارتێک بەردەست نییە',
    noNetworksSub: 'هیچ کارتێکی چالاک لە Supabase نەدۆزرایەوە.',
    recentOrders: 'دوایین داواکارییەکانی کارت',
    seeAll: 'هەمووی ببینە',
    noOrders: 'هێشتا هیچ کارتێکت نەکڕیوە',
    pending: 'چاوەڕێیە',
    success: 'سەرکەوتوو',
    cancelled: 'هەڵوەشاوە',
    pinReady: 'پین کۆد ئامادەیە',
    pinPending: 'چاوەڕوانی ناردن',
    buyNow: 'ئێستا بکڕە',
    amount: 'بڕ',
    price: 'نرخ',
    selectedNetwork: 'نێتوورکی هەڵبژێردراو',
    cardsAvailable: 'کارتە بەردەستەکان',
  },
  kmr: {
    pageTitle: 'کرینا کارتێن موبایل',
    mobileCards: 'کرینا کارتێن موبایل',
    searchProviders: 'لێگەڕێ ب ناڤێ تۆڕێ یان کارتێ',
    noNetworks: 'هیچ کارتێن بەردەست نینن',
    noNetworksSub: 'هیچ کارتێن چالاک ل Supabase نەهاتیە دیتن.',
    recentOrders: 'داواکارییێن تۆ یێن دوماهی',
    seeAll: 'هەمی ببینە',
    noOrders: 'هێشتا تو هیچ کارتێ نەکری',
    pending: 'لە چاوەڕوانیدایە',
    success: 'سەرکەفتی',
    cancelled: 'هەلوەشیا',
    pinReady: 'PIN ئامادەیە',
    pinPending: 'چاوەڕوانی ناردنێ',
    buyNow: 'ئێستا بکرە',
    amount: 'بڕ',
    price: 'نرخ',
    selectedNetwork: 'تۆڕا هەلبژێردی',
    cardsAvailable: 'کارتێن بەردەست',
  },
} as const;

function useT() {
  const lang = getCurrentLang() as keyof typeof TEXTS;
  return TEXTS[lang] || TEXTS.en;
}

export default function SimCardsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();

  const [cards, setCards] = useState<TopupCard[]>([]);
  const [orders, setOrders] = useState<TopupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('topup_cards')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('amount_iqd', { ascending: true });

    if (error) throw error;
    setCards((data || []) as TopupCard[]);
  };

  const fetchOrders = async () => {
    try {
      if (!user?.id) {
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from('topup_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setOrders((data || []) as TopupOrder[]);
    } catch (e) {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      await Promise.all([fetchCards(), fetchOrders()]);
    } catch (error: any) {
      console.log('topup page error:', error);
      Alert.alert('Error', error?.message || 'Could not load cards.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
  };

  const providerList = useMemo(() => {
    const map = new Map<string, { provider: string; count: number; preview?: string | null }>();

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
      return (
        item.provider.includes(q) ||
        style.label.toLowerCase().includes(q)
      );
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
          String(card.amount_iqd || '').includes(q)
        : true;

      return matchProvider && matchSearch;
    });
  }, [cards, search, selectedProvider]);

  const handleCardPress = (card: TopupCard) => {
    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        id: card.id,
        name: card.title,
        price: String(card.price_usd),
        provider: card.provider,
        amount: String(card.amount_iqd),
        type: 'topup',
        image: card.image_url || '',
        iqd_price: String(Math.round((card.price_usd || 0) * IQD_RATE)),
      },
    });
  };

  const openNotifications = () => {
    router.push('/(app)/notifications' as any);
  };

  const getStatusStyle = (status?: string | null) => {
    const s = String(status || '').toLowerCase();

    if (s === 'success' || s === 'approved' || s === 'completed') {
      return {
        bg: '#ECFDF3',
        text: '#027A48',
        label: t.success,
      };
    }

    if (s === 'cancelled' || s === 'canceled' || s === 'rejected') {
      return {
        bg: '#FEF3F2',
        text: '#D92D20',
        label: t.cancelled,
      };
    }

    return {
      bg: '#FFF8E8',
      text: '#B58103',
      label: t.pending,
    };
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (selectedProvider) {
              setSelectedProvider(null);
              setSearch('');
              return;
            }
            router.replace('/(app)/dashboard' as any);
          }}
          activeOpacity={0.85}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={22} color="#5A4700" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {selectedProvider
            ? getProviderStyle(selectedProvider).label
            : t.pageTitle}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{t.mobileCards}</Text>
          {selectedProvider ? (
            <Text style={styles.heroSubtitle}>
              {t.selectedNetwork}: {getProviderStyle(selectedProvider).label}
            </Text>
          ) : (
            <Text style={styles.heroSubtitle}>{t.cardsAvailable}</Text>
          )}
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

        {!selectedProvider && (
          <View style={styles.ordersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.recentOrders}</Text>
            </View>

            {ordersLoading ? (
              <View style={styles.ordersLoading}>
                <ActivityIndicator size="small" color="#C99700" />
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.emptyOrdersCard}>
                <Ionicons name="time-outline" size={20} color="#AC8700" />
                <Text style={styles.emptyOrdersText}>{t.noOrders}</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ordersRow}
              >
                {orders.map((order) => {
                  const statusStyle = getStatusStyle(order.status);
                  const provider = getProviderStyle(order.provider);

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderTop}>
                        <View
                          style={[
                            styles.orderProviderBadge,
                            { backgroundColor: provider.soft, borderColor: provider.border },
                          ]}
                        >
                          <Text style={[styles.orderProviderText, { color: provider.color }]}>
                            {provider.label}
                          </Text>
                        </View>

                        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      </View>

                      <Text numberOfLines={2} style={styles.orderTitle}>
                        {order.card_title || `${provider.label} ${formatIQD(order.amount_iqd)} IQD`}
                      </Text>

                      <Text style={styles.orderMeta}>
                        {formatIQD(order.amount_iqd)} IQD
                      </Text>

                      <Text style={styles.orderMeta}>
                        {formatDate(order.created_at)}
                      </Text>

                      <View style={styles.pinWrap}>
                        <Ionicons
                          name={order.pin_code ? 'checkmark-circle' : 'hourglass-outline'}
                          size={15}
                          color={order.pin_code ? '#079455' : '#B58103'}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.pinText,
                            { color: order.pin_code ? '#079455' : '#B58103' },
                          ]}
                        >
                          {order.pin_code ? `${t.pinReady}: ${order.pin_code}` : t.pinPending}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

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
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.providerFooter}>
                      <Text numberOfLines={1} style={styles.providerName}>
                        {provider.label}
                      </Text>
                      <Text style={styles.providerCount}>
                        {item.count} cards
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        ) : filteredCards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={36} color="#B08A00" />
            <Text style={styles.emptyTitle}>{t.noNetworks}</Text>
            <Text style={styles.emptyText}>{t.noNetworksSub}</Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {filteredCards.map((card) => {
              const provider = getProviderStyle(card.provider);
              const convertedIQDPrice = Math.round((card.price_usd || 0) * IQD_RATE);
              const imageUri = card.image_url || provider.logo;

              return (
                <TouchableOpacity
                  key={card.id}
                  style={styles.cardItem}
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
                      resizeMode="contain"
                    />
                  </View>

                  <Text numberOfLines={2} style={styles.cardName}>
                    {card.title}
                  </Text>

                  <View style={styles.priceBlock}>
                    <Text style={styles.cardAmountLabel}>{t.amount}</Text>
                    <Text style={styles.cardAmountValue}>{formatIQD(card.amount_iqd)} IQD</Text>
                  </View>

                  <View style={styles.cardPriceRow}>
                    <View style={styles.smallPriceBox}>
                      <Text style={styles.smallPriceLabel}>USD</Text>
                      <Text style={styles.smallPriceValue}>${Number(card.price_usd || 0).toFixed(2)}</Text>
                    </View>

                    <View style={[styles.smallPriceBox, styles.smallPriceBoxGold]}>
                      <Text style={styles.smallPriceLabel}>{t.price}</Text>
                      <Text style={[styles.smallPriceValue, styles.smallPriceValueGold]}>
                        {formatIQD(convertedIQDPrice)} IQD
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.buyButton}
                    onPress={() => handleCardPress(card)}
                  >
                    <Ionicons name="cart-outline" size={16} color="#5A4700" />
                    <Text style={styles.buyButtonText}>{t.buyNow}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
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
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '900',
    color: '#221C0B',
  },
  heroSubtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '700',
    color: '#8A6E08',
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

  ordersSection: {
    marginBottom: 14,
  },
  sectionHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#241E0E',
  },
  ordersLoading: {
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOrdersCard: {
    minHeight: 66,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2B2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  emptyOrdersText: {
    flex: 1,
    fontSize: 13,
    color: '#7A715B',
    fontWeight: '700',
  },
  ordersRow: {
    paddingRight: 6,
  },
  orderCard: {
    width: 230,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2B2',
    padding: 14,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderProviderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  orderProviderText: {
    fontSize: 11,
    fontWeight: '900',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  orderTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: '#231E11',
    marginBottom: 6,
    minHeight: 40,
  },
  orderMeta: {
    fontSize: 12,
    color: '#7B725C',
    fontWeight: '700',
    marginBottom: 3,
  },
  pinWrap: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
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
    margin: 10,
    minHeight: 116,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  providerImage: {
    width: '100%',
    height: 82,
  },
  providerFooter: {
    paddingHorizontal: 12,
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

  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  cardItem: {
    width: '48%',
    borderRadius: 22,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3B3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImageWrap: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginBottom: 10,
  },
  cardImage: {
    width: '100%',
    height: 82,
  },
  cardName: {
    minHeight: 40,
    fontSize: 14,
    lineHeight: 20,
    color: '#201B10',
    fontWeight: '900',
  },
  priceBlock: {
    marginTop: 8,
    marginBottom: 10,
  },
  cardAmountLabel: {
    fontSize: 11,
    color: '#8B7C49',
    fontWeight: '800',
    marginBottom: 2,
  },
  cardAmountValue: {
    fontSize: 19,
    color: '#A67C00',
    fontWeight: '900',
  },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  smallPriceBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  smallPriceBoxGold: {
    backgroundColor: '#FFF9E8',
    borderColor: '#F0E2A9',
  },
  smallPriceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A816C',
    marginBottom: 2,
  },
  smallPriceValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1F1A10',
  },
  smallPriceValueGold: {
    color: '#7C6100',
  },

  buyButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F4D461',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buyButtonText: {
    color: '#5A4700',
    fontSize: 14,
    fontWeight: '900',
  },
});

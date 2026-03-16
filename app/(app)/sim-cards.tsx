import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
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
  image_url: string | null;
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
    color: '#0F4C81',
    soft: '#EEF6FF',
    border: '#D7E9FF',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uu16k1t8p3uz3dpr3k6ic',
  },
  zain: {
    label: 'Zain',
    color: '#6D3BBF',
    soft: '#F5F0FF',
    border: '#E4D8FF',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uq8qjx7d0g47h9rv2jvzz',
  },
  asiacell: {
    label: 'AsiaCell',
    color: '#C93A2F',
    soft: '#FFF4F1',
    border: '#FFD9D2',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q8puaw0dyshx6jruwg83i',
  },
  ftth: {
    label: 'FTTH',
    color: '#1B6FD8',
    soft: '#EDF5FF',
    border: '#D7E7FF',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1ogdfkyuisk5c6unchj2s',
  },
  fasthope: {
    label: 'Fast Hope',
    color: '#DD2E73',
    soft: '#FFF1F7',
    border: '#FFD7E8',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Help_Icon.svg/1024px-Help_Icon.svg.png',
  },
  kurdtel: {
    label: 'Kurdtel',
    color: '#3A3A3A',
    soft: '#F7F7F7',
    border: '#E7E7E7',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png',
  },
};

function formatIQD(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatUSD(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getProviderStyle(provider: string) {
  return providerConfig[provider?.toLowerCase()] || {
    label: provider || 'Card',
    color: '#B8860B',
    soft: '#FFFBEA',
    border: '#F5E7A1',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png',
  };
}

export default function SimCardsScreen() {
  const router = useRouter();

  const [cards, setCards] = useState<TopupCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('topup_cards')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('amount_iqd', { ascending: true });

      if (error) throw error;
      setCards((data || []) as TopupCard[]);
    } catch (error: any) {
      console.log('topup_cards error:', error);
      Alert.alert(
        i18n.t('error') || 'Error',
        error?.message || 'Could not load top-up cards.'
      );
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

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;

    return cards.filter((card) => {
      return (
        card.title?.toLowerCase().includes(q) ||
        card.provider?.toLowerCase().includes(q) ||
        String(card.amount_iqd || '').includes(q) ||
        String(card.price_usd || '').includes(q) ||
        (card.category || '').toLowerCase().includes(q)
      );
    });
  }, [cards, search]);

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerWrap}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.replace('/(app)/dashboard' as any)}
            style={styles.backButton}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={24} color="#6B5500" />
          </TouchableOpacity>

          <View style={styles.headerTitlePill}>
            <Text style={styles.headerTitle}>
              {i18n.t('market.topup') || 'Top-Up Cards'}
            </Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={styles.notifyButton}>
            <Ionicons name="notifications-outline" size={22} color="#6B5500" />
          </TouchableOpacity>
        </View>
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
          <Text style={styles.heroMini}>
            {i18n.t('mobileCards') || 'Mobile Cards'}
          </Text>
          <Text style={styles.heroTitle}>
            Buy top-up cards بسهولة و بە شێوازێکی نوێ
          </Text>
          <Text style={styles.heroSub}>
            Real images • Clean design • IQD amounts • Easy search
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={24} color="#8C8C8C" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={i18n.t('search') || 'Search'}
            placeholderTextColor="#A0A0A0"
            style={styles.searchInput}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={22} color="#B0B0B0" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#D4A800" />
          </View>
        ) : filteredCards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={38} color="#B08A00" />
            <Text style={styles.emptyTitle}>No cards found</Text>
            <Text style={styles.emptyText}>
              Search result empty or no active cards in Supabase.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
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
                      styles.cardTopAccent,
                      {
                        backgroundColor: provider.soft,
                        borderColor: provider.border,
                      },
                    ]}
                  >
                    <View style={styles.providerBadge}>
                      <Text style={[styles.providerBadgeText, { color: provider.color }]}>
                        {provider.label}
                      </Text>
                    </View>

                    <Image
                      source={{ uri: imageUri }}
                      style={styles.cardImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.cardBody}>
                    <Text numberOfLines={2} style={styles.cardName}>
                      {card.title}
                    </Text>

                    <Text style={styles.amountText}>
                      {formatIQD(card.amount_iqd)} IQD
                    </Text>

                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.priceLabel}>Price</Text>
                        <Text style={styles.priceUsd}>${formatUSD(card.price_usd)}</Text>
                      </View>

                      <View style={styles.iqdBox}>
                        <Text style={styles.iqdBoxLabel}>IQD</Text>
                        <Text style={styles.iqdBoxValue}>
                          {formatIQD(convertedIQDPrice)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.buyButton}
                      activeOpacity={0.9}
                      onPress={() => handleCardPress(card)}
                    >
                      <Ionicons name="cart-outline" size={16} color="#6B5500" />
                      <Text style={styles.buyButtonText}>
                        {i18n.t('buyNow') || 'Buy Now'}
                      </Text>
                    </TouchableOpacity>
                  </View>
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
    backgroundColor: '#FFFDF7',
  },

  headerWrap: {
    backgroundColor: '#FFF3C9',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F2E3A0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F2E3A0',
  },
  headerTitlePill: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#F2E3A0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2A2415',
  },
  notifyButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F2E3A0',
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },

  heroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#FFF8DB',
    borderWidth: 1,
    borderColor: '#F6E7A8',
    marginBottom: 16,
  },
  heroMini: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B08900',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    color: '#2C2410',
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6D6652',
    fontWeight: '600',
  },

  searchBox: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE4B5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 17,
    color: '#1A1A1A',
    fontWeight: '600',
  },

  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    marginTop: 10,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE4B5',
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2410',
    marginTop: 12,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#7B7460',
    fontSize: 14,
    lineHeight: 21,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },

  cardItem: {
    width: '48%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE4B5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardTopAccent: {
    margin: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  cardImage: {
    width: '100%',
    height: 96,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },

  cardBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  cardName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    color: '#1D1A12',
    minHeight: 42,
  },
  amountText: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '900',
    color: '#A67C00',
  },

  priceRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B846F',
    marginBottom: 2,
  },
  priceUsd: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1A14',
  },
  iqdBox: {
    alignItems: 'flex-end',
    backgroundColor: '#FFF9E8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E1A6',
  },
  iqdBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9B8A42',
  },
  iqdBoxValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6E5800',
  },

  buyButton: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F3D35C',
  },
  buyButtonText: {
    color: '#6B5500',
    fontSize: 14,
    fontWeight: '900',
  },
});

import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import i18n from '@/lib/i18n';

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
}

const fetchCryptoPrices = async (): Promise<CryptoData[]> => {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
  );
  if (!response.ok) throw new Error('Failed to fetch crypto prices');
  return response.json();
};

const CryptoCard = ({ crypto }: { crypto: CryptoData }) => {
  const { theme } = useTheme();
  const isPositive = crypto.price_change_percentage_24h >= 0;

  return (
    <View style={[styles.cryptoCard, { backgroundColor: theme.colors.card }]}>
      <View style={styles.cryptoLeft}>
        <Image source={{ uri: crypto.image }} style={styles.cryptoIcon} />
        <View style={styles.cryptoInfo}>
          <Text style={[styles.cryptoName, { color: theme.colors.text }]}>{crypto.name}</Text>
          <Text style={[styles.cryptoSymbol, { color: theme.colors.textSecondary }]}>
            {crypto.symbol.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.cryptoRight}>
        <Text style={[styles.cryptoPrice, { color: theme.colors.text }]}>
          ${crypto.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={[styles.changeContainer, { backgroundColor: isPositive ? '#10B98120' : '#EF444420' }]}>
          <Ionicons 
            name={isPositive ? 'trending-up' : 'trending-down'} 
            size={14} 
            color={isPositive ? theme.colors.success : '#EF4444'} 
          />
          <Text style={[styles.changeText, { color: isPositive ? theme.colors.success : '#EF4444' }]}>
            {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function CryptoScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'popular' | 'all'>('popular');

  const cryptoQuery = useQuery({
    queryKey: ['crypto-prices'],
    queryFn: fetchCryptoPrices,
    refetchInterval: 30000,
  });

  const filteredCryptos = cryptoQuery.data?.filter(crypto =>
    crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const popularCryptos = filteredCryptos.slice(0, 10);
  const displayCryptos = selectedTab === 'popular' ? popularCryptos : filteredCryptos;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ 
        headerShown: true, 
        title: i18n.t('cryptoTrade'),
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
      }} />

      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={i18n.t('searchCrypto')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'popular' && styles.tabActive,
              { borderBottomColor: selectedTab === 'popular' ? '#60A5FA' : 'transparent' },
            ]}
            onPress={() => setSelectedTab('popular')}
          >
            <Text style={[
              styles.tabText,
              { color: selectedTab === 'popular' ? '#60A5FA' : theme.colors.textSecondary }
            ]}>
              {i18n.t('popular')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'all' && styles.tabActive,
              { borderBottomColor: selectedTab === 'all' ? '#60A5FA' : 'transparent' },
            ]}
            onPress={() => setSelectedTab('all')}
          >
            <Text style={[
              styles.tabText,
              { color: selectedTab === 'all' ? '#60A5FA' : theme.colors.textSecondary }
            ]}>
              {i18n.t('allCoins')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {cryptoQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {i18n.t('loadingPrices')}
          </Text>
        </View>
      ) : cryptoQuery.isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            {i18n.t('failedToLoad')}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => cryptoQuery.refetch()}
          >
            <Text style={styles.retryText}>{i18n.t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {displayCryptos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {i18n.t('noCryptoFound')}
              </Text>
            </View>
          ) : (
            displayCryptos.map(crypto => (
              <CryptoCard key={crypto.id} crypto={crypto} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
  tab: {
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  tabActive: {},
  tabText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cryptoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  cryptoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cryptoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  cryptoInfo: {
    gap: 4,
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cryptoSymbol: {
    fontSize: 13,
  },
  cryptoRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cryptoPrice: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center' as const,
  },
  retryButton: {
    backgroundColor: '#60A5FA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center' as const,
  },
});

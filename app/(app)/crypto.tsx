import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';
import i18n from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  image: string;
}

export default function CryptoScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'hot' | 'gainers' | 'losers'>('all');

  const cryptoQuery = useQuery({
    queryKey: ['cryptoPrices'],
    queryFn: async () => {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h'
      );
      if (!response.ok) throw new Error('Failed to fetch crypto data');
      return await response.json() as CryptoData[];
    },
    refetchInterval: 30000,
  });

  const filteredCryptos = cryptoQuery.data?.filter(crypto => {
    const matchesSearch = crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'hot') {
      return matchesSearch && crypto.total_volume > 1000000000;
    } else if (selectedCategory === 'gainers') {
      return matchesSearch && crypto.price_change_percentage_24h > 0;
    } else if (selectedCategory === 'losers') {
      return matchesSearch && crypto.price_change_percentage_24h < 0;
    }
    
    return matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {i18n.t('cryptoTrade')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {i18n.t('tradeDescription')}
          </Text>
        </View>

        <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'buy' && { backgroundColor: '#10B981' }
            ]}
            onPress={() => setActiveTab('buy')}
          >
            <Ionicons 
              name="trending-up" 
              size={20} 
              color={activeTab === 'buy' ? 'white' : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'buy' ? 'white' : theme.colors.textSecondary }
            ]}>
              {i18n.t('buyCrypto')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'sell' && { backgroundColor: '#EF4444' }
            ]}
            onPress={() => setActiveTab('sell')}
          >
            <Ionicons 
              name="trending-down" 
              size={20} 
              color={activeTab === 'sell' ? 'white' : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'sell' ? 'white' : theme.colors.textSecondary }
            ]}>
              {i18n.t('sellCrypto')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={i18n.t('searchCrypto')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              { backgroundColor: selectedCategory === 'all' ? '#3B82F6' : theme.colors.surface }
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === 'all' ? 'white' : theme.colors.text }
            ]}>
              {i18n.t('all')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryChip,
              { backgroundColor: selectedCategory === 'hot' ? '#F59E0B' : theme.colors.surface }
            ]}
            onPress={() => setSelectedCategory('hot')}
          >
            <Ionicons 
              name="flame" 
              size={16} 
              color={selectedCategory === 'hot' ? 'white' : theme.colors.text} 
            />
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === 'hot' ? 'white' : theme.colors.text }
            ]}>
              {i18n.t('hot')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryChip,
              { backgroundColor: selectedCategory === 'gainers' ? '#10B981' : theme.colors.surface }
            ]}
            onPress={() => setSelectedCategory('gainers')}
          >
            <Ionicons 
              name="trending-up" 
              size={16} 
              color={selectedCategory === 'gainers' ? 'white' : theme.colors.text} 
            />
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === 'gainers' ? 'white' : theme.colors.text }
            ]}>
              {i18n.t('gainers')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryChip,
              { backgroundColor: selectedCategory === 'losers' ? '#EF4444' : theme.colors.surface }
            ]}
            onPress={() => setSelectedCategory('losers')}
          >
            <Ionicons 
              name="trending-down" 
              size={16} 
              color={selectedCategory === 'losers' ? 'white' : theme.colors.text} 
            />
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === 'losers' ? 'white' : theme.colors.text }
            ]}>
              {i18n.t('losers')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.cryptoList}>
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
                {i18n.t('failedToLoadPrices')}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => cryptoQuery.refetch()}
              >
                <Text style={styles.retryText}>{i18n.t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : filteredCryptos && filteredCryptos.length > 0 ? (
            filteredCryptos.map((crypto) => (
              <TouchableOpacity
                key={crypto.id}
                style={[styles.cryptoCard, { backgroundColor: theme.colors.card }]}
                activeOpacity={0.7}
              >
                <View style={styles.cryptoLeft}>
                  <View style={[styles.cryptoIconContainer, { backgroundColor: theme.colors.surface }]}>
                    <Text style={styles.cryptoSymbolText}>
                      {crypto.symbol.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cryptoInfo}>
                    <Text style={[styles.cryptoName, { color: theme.colors.text }]}>
                      {crypto.name}
                    </Text>
                    <Text style={[styles.cryptoSymbol, { color: theme.colors.textSecondary }]}>
                      {crypto.symbol.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cryptoRight}>
                  <Text style={[styles.cryptoPrice, { color: theme.colors.text }]}>
                    ${crypto.current_price.toLocaleString('en-US', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: crypto.current_price < 1 ? 6 : 2
                    })}
                  </Text>
                  <View style={[
                    styles.changeContainer,
                    { backgroundColor: crypto.price_change_percentage_24h >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                  ]}>
                    <Ionicons 
                      name={crypto.price_change_percentage_24h >= 0 ? "arrow-up" : "arrow-down"} 
                      size={12} 
                      color={crypto.price_change_percentage_24h >= 0 ? '#10B981' : '#EF4444'} 
                    />
                    <Text style={[
                      styles.changeText,
                      { color: crypto.price_change_percentage_24h >= 0 ? '#10B981' : '#EF4444' }
                    ]}>
                      {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: activeTab === 'buy' ? '#10B981' : '#EF4444' }
                  ]}
                >
                  <Text style={styles.actionButtonText}>
                    {activeTab === 'buy' ? i18n.t('buy') : i18n.t('sell')}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {i18n.t('noCryptoFound')}
              </Text>
            </View>
          )}
        </View>

        {Platform.OS === 'web' && (
          <View style={[styles.chartContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.chartHeader}>
              <Ionicons name="bar-chart" size={24} color="#60A5FA" />
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                {i18n.t('liveCharts')}
              </Text>
            </View>
            <View style={styles.chartPlaceholder}>
              <Ionicons name="analytics" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.chartPlaceholderText, { color: theme.colors.textSecondary }]}>
                {i18n.t('chartComingSoon')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 6,
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cryptoList: {
    paddingHorizontal: 20,
  },
  cryptoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  cryptoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cryptoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cryptoSymbolText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#60A5FA',
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
    marginRight: 12,
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
    fontSize: 12,
    fontWeight: '600' as const,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
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
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center' as const,
  },
  chartContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  chartPlaceholder: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  chartPlaceholderText: {
    fontSize: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});

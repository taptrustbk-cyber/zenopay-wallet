import { useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';
import React, { useCallback, useState } from 'react';

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

const ActionButton = ({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <Ionicons name={icon} size={18} color="white" />
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

const NavItem = ({ icon, label, active, onPress }: { icon: any; label: string; active?: boolean; onPress: () => void }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color={active ? '#60A5FA' : '#9CA3AF'} />
    <Text style={[styles.navText, active && { color: '#60A5FA' }]}>
      {label}
    </Text>
  </TouchableOpacity>
);



export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile, hardRefresh } = useAuth();
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'hot' | 'gainers' | 'losers'>('all');

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      
      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error(
          'Wallet fetch error:',
          JSON.stringify(error, null, 2)
        );
        throw error;
      }
      
      if (!data) {
        const { data: newWallet, error: insertError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            balance: 0,
            currency: 'USD',
            is_locked: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Wallet create error:', insertError);
          throw insertError;
        }

        return newWallet as Wallet;
      }
      
      return data as Wallet;
    },
    enabled: !!user?.id && !!profile,
    staleTime: 0,
    gcTime: 0,
  });

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



  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await hardRefresh();
      await walletQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardRefresh, walletQuery.refetch]);

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark" size={28} color="#60A5FA" />
            <Text style={[styles.logo, { color: theme.colors.text }]}> ZenoPay Wallet</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{i18n.t('accountBalance')}</Text>
          {walletQuery.isLoading ? (
            <ActivityIndicator color="#60A5FA" />
          ) : walletQuery.isError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={32} color="#EF4444" />
              <Text style={[styles.errorText, { color: theme.colors.text }]}>
                {i18n.t('failedToLoadBalance')}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => walletQuery.refetch()}
              >
                <Text style={styles.retryText}>{i18n.t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.balance, { color: theme.colors.text }]}>
              ${walletQuery.data?.balance?.toFixed(2) || '0.00'}
            </Text>
          )}

          <View style={styles.verifiedAccount}>
            <Ionicons name="shield-checkmark" size={22} color="#10B981" />
            <Text style={styles.verifiedAccountText}>{i18n.t('accountStatusActive')}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <ActionButton
            icon="send"
            label={i18n.t('sendMoney')}
            onPress={() => router.push('/(app)/send' as any)}
          />
          <ActionButton
            icon="download"
            label={i18n.t('deposit')}
            onPress={() => router.push('/(app)/receive' as any)}
          />
        </View>

        <View style={styles.actionRow}>
          <ActionButton
            icon="list"
            label={i18n.t('transactions')}
            onPress={() => router.push('/(app)/transactions' as any)}
          />
          <ActionButton
            icon="cash"
            label={i18n.t('withdraw')}
            onPress={() => router.push('/(app)/withdraw' as any)}
          />
        </View>

        <View style={[styles.cryptoSection, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cryptoHeader}>
            <View style={styles.cryptoTitleRow}>
              <Ionicons name="trending-up" size={28} color="#10B981" />
              <Text style={[styles.cryptoSectionTitle, { color: theme.colors.text }]}>
                {i18n.t('cryptoTrade')}
              </Text>
            </View>
            <Text style={[styles.cryptoSectionSubtitle, { color: theme.colors.textSecondary }]}>
              {i18n.t('buySellCrypto')}
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
                size={18} 
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
                size={18} 
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
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
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
                size={14} 
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
                size={14} 
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
                size={14} 
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
                <Ionicons name="alert-circle" size={40} color="#EF4444" />
                <Text style={[styles.errorText, { color: theme.colors.text }]}>
                  {i18n.t('failedToLoadPrices')}
                </Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => cryptoQuery.refetch()}
                >
                  <Text style={styles.retryButtonText}>{i18n.t('retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : filteredCryptos && filteredCryptos.length > 0 ? (
              filteredCryptos.slice(0, 20).map((crypto) => (
                <TouchableOpacity
                  key={crypto.id}
                  style={[styles.cryptoCard, { backgroundColor: theme.colors.surface }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.cryptoLeft}>
                    <Image
                      source={{ uri: crypto.image }}
                      style={styles.cryptoIcon}
                    />
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
                        size={10} 
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
                <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  {i18n.t('noCryptoFound')}
                </Text>
              </View>
            )}
          </View>
        </View>


      </ScrollView>

      <View style={[styles.bottomNav, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <NavItem icon="home" label={i18n.t('home')} active onPress={() => {}} />
        <NavItem icon="send" label={i18n.t('send')} onPress={() => router.push('/(app)/send' as any)} />
        <NavItem icon="chatbox" label={i18n.t('consulateInfo')} onPress={() => router.push('/(app)/consulate' as any)} />
        <NavItem icon="settings" label={i18n.t('settings')} onPress={() => router.push('/(app)/settings' as any)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700' as const,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  actionRowSingle: {
    paddingHorizontal: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    padding: 14,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    color: 'white',
    fontWeight: '600' as const,
  },
  card: {
    margin: 20,
    padding: 20,
    borderRadius: 22,
  },
  label: {},
  balance: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  subBalance: {
    color: '#9CA3AF',
    marginTop: 4,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  verifiedText: {
    fontWeight: '600' as const,
  },
  verifiedAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  verifiedAccountText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginHorizontal: 20,
    marginTop: 20,
  },
  viewAll: {
    color: '#60A5FA',
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
  },
  txTitle: {
    color: 'white',
    fontWeight: '600' as const,
  },
  txSub: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  txAmount: {
    color: '#F87171',
    fontWeight: '600' as const,
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  countryCard: {
    width: '47%',
    height: 80,
    backgroundColor: '#0B1220',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryText: {
    color: 'white',
    fontWeight: '600' as const,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  noTransactions: {
    textAlign: 'center' as const,
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 20,
    marginHorizontal: 20,
  },
  cryptoSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 100,
    borderRadius: 20,
    padding: 16,
  },
  cryptoHeader: {
    marginBottom: 20,
  },
  cryptoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  cryptoSectionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  cryptoSectionSubtitle: {
    fontSize: 14,
    marginLeft: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 6,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryContent: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  cryptoList: {
    gap: 10,
  },
  cryptoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  cryptoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  cryptoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  cryptoInfo: {
    gap: 2,
  },
  cryptoName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  cryptoSymbol: {
    fontSize: 12,
  },
  cryptoRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginRight: 8,
  },
  cryptoPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#60A5FA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

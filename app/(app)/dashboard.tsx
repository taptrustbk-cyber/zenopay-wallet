import { useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, TextInput, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';
import { useState, useCallback } from 'react';

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

const CryptoCard = ({ crypto, theme }: { crypto: CryptoData; theme: any }) => {
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

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile, hardRefresh } = useAuth();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'popular' | 'all'>('popular');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      
      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .maybeSingle();
      
      if (error) {
        throw new Error('Failed to fetch wallet');
      }
      
      if (!data) {
        return { user_id: user.id, balance: 0, currency: 'USD', is_locked: false } as Wallet;
      }
      
      return data as Wallet;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
  });



  const cryptoQuery = useQuery({
    queryKey: ['crypto-prices'],
    queryFn: fetchCryptoPrices,
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await hardRefresh();
      await Promise.all([
        walletQuery.refetch(),
        cryptoQuery.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardRefresh, walletQuery.refetch, cryptoQuery.refetch]);

  const filteredCryptos = cryptoQuery.data?.filter(crypto =>
    crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const popularCryptos = filteredCryptos.slice(0, 10);
  const displayCryptos = selectedTab === 'popular' ? popularCryptos : filteredCryptos;

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
            <Text style={[styles.logo, { color: theme.colors.text }]}> ZENOPAY</Text>
          </View>
          <Image
            source={{ uri: profile?.avatar_url || 'https://i.pravatar.cc/150' }}
            style={styles.avatar}
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{i18n.t('accountBalance')}</Text>
          {walletQuery.isLoading ? (
            <ActivityIndicator color="#60A5FA" />
          ) : (
            <Text style={[styles.balance, { color: theme.colors.text }]}>
              ${walletQuery.data?.balance?.toFixed(2) || '0.00'}
            </Text>
          )}

          <View style={styles.verifiedAccount}>
            <Ionicons name="shield-checkmark" size={22} color="#10B981" />
            <Text style={styles.verifiedAccountText}>{i18n.t('verifiedAccount')}</Text>
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

        <View style={[styles.cryptoSection, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cryptoHeader}>
            <Text style={[styles.cryptoTitle, { color: theme.colors.text }]}>{i18n.t('cryptoTrade')}</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>{i18n.t('comingSoon')}</Text>
            </View>
          </View>

          <View style={styles.cryptoButtonRow}>
            <TouchableOpacity style={[styles.cryptoActionBtn, { backgroundColor: '#10B981' }]}>
              <Ionicons name="arrow-down" size={20} color="white" />
              <Text style={styles.cryptoActionText}>{i18n.t('buyCrypto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cryptoActionBtn, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="arrow-up" size={20} color="white" />
              <Text style={styles.cryptoActionText}>{i18n.t('sellCrypto')}</Text>
            </TouchableOpacity>
          </View>

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

          {cryptoQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#60A5FA" />
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
          ) : displayCryptos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {i18n.t('noCryptoFound')}
              </Text>
            </View>
          ) : (
            displayCryptos.map(crypto => (
              <CryptoCard key={crypto.id} crypto={crypto} theme={theme} />
            ))
          )}
        </View>


      </ScrollView>

      <View style={[styles.bottomNav, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <NavItem icon="home" label={i18n.t('home')} active onPress={() => {}} />
        <NavItem icon="send" label={i18n.t('send')} onPress={() => router.push('/(app)/send' as any)} />
        <NavItem icon="chatbox" label={i18n.t('consulate')} onPress={() => router.push('/(app)/consulate' as any)} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    marginTop: 20,
    padding: 20,
    borderRadius: 22,
    marginBottom: 100,
  },
  cryptoTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  cryptoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  comingSoonBadge: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  comingSoonText: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  cryptoButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cryptoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  cryptoActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 24,
  },
  tab: {
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600' as const,
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center' as const,
  },
});

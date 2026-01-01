import { useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';
import React, { useCallback } from 'react';

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
        console.error('Wallet fetch error:', error);
        throw error;
      }
      
      if (!data) {
        return { user_id: user.id, balance: 0, currency: 'USD', is_locked: false } as Wallet;
      }
      
      return data as Wallet;
    },
    enabled: !!user?.id && !!profile,
    staleTime: 0,
    gcTime: 0,
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

        <TouchableOpacity 
          style={[styles.portfolioCard, { backgroundColor: theme.colors.card }]}
          onPress={() => router.push('/(app)/portfolio' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.portfolioHeader}>
            <View style={styles.portfolioIcon}>
              <Ionicons name="wallet" size={28} color="#60A5FA" />
            </View>
            <View style={styles.portfolioContent}>
              <Text style={[styles.portfolioTitle, { color: theme.colors.text }]}>{i18n.t('portfolio')}</Text>
              <Text style={[styles.portfolioSubtitle, { color: theme.colors.textSecondary }]}>
                {i18n.t('viewPortfolio')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>


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
  portfolioCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 100,
    borderRadius: 20,
    overflow: 'hidden',
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  portfolioIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioContent: {
    flex: 1,
  },
  portfolioTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  portfolioSubtitle: {
    fontSize: 14,
  },
});

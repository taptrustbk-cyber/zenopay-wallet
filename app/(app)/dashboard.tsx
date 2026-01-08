import { useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
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
  const [isBalanceHidden, setIsBalanceHidden] = React.useState(false);

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

        <View style={[styles.card, styles.balanceCard]}>
          <View style={styles.balanceHeader}>
            <Text style={styles.labelDark}>{i18n.t('accountBalance')}</Text>
            <TouchableOpacity 
              onPress={() => setIsBalanceHidden(!isBalanceHidden)}
              style={styles.hideButton}
            >
              <Ionicons 
                name={isBalanceHidden ? "eye-off" : "eye"} 
                size={24} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
          {walletQuery.isLoading ? (
            <ActivityIndicator color="#60A5FA" />
          ) : walletQuery.isError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={32} color="#EF4444" />
              <Text style={styles.errorTextDark}>
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
            <View style={styles.balanceRow}>
              <Ionicons name="logo-usd" size={28} color="#10B981" />
              <Text style={styles.balanceDark}>
                {isBalanceHidden ? '•••••••' : `${walletQuery.data?.balance?.toFixed(2) || '0.00'}`}
              </Text>
            </View>
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

        {profile?.role === 'admin' && (
          <TouchableOpacity
            style={[styles.adminButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/(app)/product-manager' as any)}
          >
            <Ionicons name="pricetag" size={24} color="white" />
            <Text style={styles.adminButtonText}>{i18n.t('manageProductPrices') || '💰 Manage Product Prices'}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.marketShopSection, { backgroundColor: theme.colors.card }]}>
          <View style={styles.marketShopHeader}>
            <View style={styles.marketShopTitleRow}>
              <Ionicons name="storefront" size={28} color="#60A5FA" />
              <Text style={[styles.marketShopTitle, { color: theme.colors.text }]}>
                {i18n.t('marketShop')}
              </Text>
            </View>
            <Text style={[styles.marketShopSubtitle, { color: theme.colors.textSecondary }]}>
              {i18n.t('marketShopSubtitle')}
            </Text>
          </View>

          <View style={styles.shopGrid}>
            <TouchableOpacity 
              style={[styles.shopItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => router.push('/(app)/sim-cards' as any)}
            >
              <View style={[styles.shopIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <MaterialIcons name="sim-card" size={32} color="#3B82F6" />
              </View>
              <Text style={[styles.shopLabel, { color: theme.colors.text }]}>
                {i18n.t('internetSim')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shopItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => router.push('/(app)/gift-cards' as any)}
            >
              <View style={[styles.shopIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="gift" size={32} color="#10B981" />
              </View>
              <Text style={[styles.shopLabel, { color: theme.colors.text }]}>
                {i18n.t('giftCards')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shopItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => router.push('/(app)/mobile-shop' as any)}
            >
              <View style={[styles.shopIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <FontAwesome5 name="mobile-alt" size={32} color="#F59E0B" />
              </View>
              <Text style={[styles.shopLabel, { color: theme.colors.text }]}>
                {i18n.t('mobileShop')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shopItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => router.push('/(app)/travel-booking' as any)}
            >
              <View style={[styles.shopIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="airplane" size={32} color="#8B5CF6" />
              </View>
              <Text style={[styles.shopLabel, { color: theme.colors.text }]}>
                {i18n.t('travelBooking')}
              </Text>
            </TouchableOpacity>
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
  balanceCard: {
    backgroundColor: '#0B1A3A',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelDark: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  balanceDark: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  errorTextDark: {
    fontSize: 14,
    textAlign: 'center' as const,
    color: '#FFFFFF',
  },
  hideButton: {
    padding: 4,
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
  marketShopSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 100,
    borderRadius: 20,
    padding: 20,
  },
  marketShopHeader: {
    marginBottom: 24,
  },
  marketShopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  marketShopTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  marketShopSubtitle: {
    fontSize: 14,
    marginLeft: 40,
    lineHeight: 20,
  },
  shopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shopItem: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  shopIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
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
  retryButton: {
    backgroundColor: '#60A5FA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 18,
    borderRadius: 16,
  },
  adminButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});

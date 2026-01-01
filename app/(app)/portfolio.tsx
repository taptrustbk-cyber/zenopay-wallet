
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

interface PortfolioAsset {
  id: string;
  user_id: string;
  asset: string;
  amount: number;
  value_usd: number;
  status: string;
  created_at: string;
}

export default function PortfolioScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const portfolioQuery = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');

      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PortfolioAsset[];
    },
    enabled: !!user?.id,
  });

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');

      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.balance || 0;
    },
    enabled: !!user?.id,
  });

  const totalPortfolioValue = portfolioQuery.data?.reduce((sum, asset) => sum + asset.value_usd, 0) || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: i18n.t('portfolio'),
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
        }} 
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {i18n.t('portfolioSubtitle')}
          </Text>
        </View>

        <View style={[styles.balanceCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
            {i18n.t('totalBalance')}
          </Text>
          {walletQuery.isLoading ? (
            <ActivityIndicator color="#60A5FA" />
          ) : (
            <Text style={[styles.balanceValue, { color: theme.colors.text }]}>
              ${walletQuery.data?.toFixed(2) || '0.00'}
            </Text>
          )}
          <Text style={[styles.balanceCurrency, { color: theme.colors.textSecondary }]}>USD</Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => router.push('/(app)/receive' as any)}
            >
              <Ionicons name="download" size={20} color="white" />
              <Text style={styles.actionButtonText}>{i18n.t('deposit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => router.push('/(app)/withdraw' as any)}
            >
              <Ionicons name="cash" size={20} color="white" />
              <Text style={styles.actionButtonText}>{i18n.t('withdraw')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {i18n.t('portfolioAssets')}
          </Text>

          {portfolioQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#60A5FA" size="large" />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                {i18n.t('loadingAssets')}
              </Text>
            </View>
          ) : portfolioQuery.isError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={[styles.errorText, { color: theme.colors.text }]}>
                {i18n.t('failedToLoad')}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => portfolioQuery.refetch()}
              >
                <Text style={styles.retryText}>{i18n.t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : portfolioQuery.data && portfolioQuery.data.length > 0 ? (
            <>
              <View style={[styles.totalCard, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
                  {i18n.t('totalPortfolioValue')}
                </Text>
                <Text style={[styles.totalValue, { color: '#10B981' }]}>
                  ${totalPortfolioValue.toFixed(2)}
                </Text>
              </View>

              {portfolioQuery.data.map((asset) => {
                const percentage = walletQuery.data 
                  ? ((asset.value_usd / (walletQuery.data + totalPortfolioValue)) * 100)
                  : 0;

                return (
                  <View key={asset.id} style={[styles.assetCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.assetHeader}>
                      <View style={styles.assetInfo}>
                        <Text style={[styles.assetName, { color: theme.colors.text }]}>
                          {asset.asset}
                        </Text>
                        <Text style={[styles.assetAmount, { color: theme.colors.textSecondary }]}>
                          {asset.amount.toFixed(4)} {asset.asset}
                        </Text>
                      </View>
                      <View style={styles.assetValue}>
                        <Text style={[styles.assetUSD, { color: theme.colors.text }]}>
                          ${asset.value_usd.toFixed(2)}
                        </Text>
                        <View style={[styles.percentageBadge, { backgroundColor: '#10B98120' }]}>
                          <Text style={[styles.percentageText, { color: '#10B981' }]}>
                            {percentage.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {i18n.t('noAssets')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.supportSection}>
          <Text style={[styles.supportText, { color: theme.colors.textSecondary }]}>
            {i18n.t('needHelp')}
          </Text>
          <Text style={[styles.supportEmail, { color: '#60A5FA' }]}>
            info@zenopay.bond
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  balanceCard: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  balanceCurrency: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  totalCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  assetCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  assetAmount: {
    fontSize: 14,
  },
  assetValue: {
    alignItems: 'flex-end',
  },
  assetUSD: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
  supportSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  supportText: {
    fontSize: 14,
    marginBottom: 8,
  },
  supportEmail: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

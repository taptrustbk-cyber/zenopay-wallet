import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useCallback } from 'react';

interface TransactionData {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string | null;
  created_at: string;
  sender_id: string | null;
  receiver_id: string | null;
  balance_after: number | null;
}

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const transactionsQuery = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          status,
          amount,
          description,
          created_at,
          sender_id,
          receiver_id,
          balance_after
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Transaction fetch error:', JSON.stringify(error));
        throw new Error('Failed to fetch transactions');
      }
      
      return (data || []) as TransactionData[];
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const getTransactionInfo = (tx: TransactionData): { title: string; subtitle: string; isOutgoing: boolean } => {
    const isOutgoing = tx.sender_id === user?.id;
    const txType = tx.type;
    
    if (txType === 'send' || txType === 'receive') {
      return {
        title: isOutgoing ? i18n.t('sent') : i18n.t('received'),
        subtitle: tx.description || (isOutgoing ? i18n.t('moneyTransfer') : i18n.t('moneyReceived')),
        isOutgoing,
      };
    }
    if (txType === 'deposit') {
      return {
        title: i18n.t('deposit'),
        subtitle: tx.description || 'Admin Top-up',
        isOutgoing: false,
      };
    }
    if (txType === 'purchase_mobile') {
      return {
        title: i18n.t('mobilePurchase'),
        subtitle: tx.description || 'Mobile Shop',
        isOutgoing: true,
      };
    }
    if (txType === 'purchase_card' || txType === 'purchase_giftcard') {
      return {
        title: i18n.t('cardPurchase'),
        subtitle: tx.description || 'Gift Card',
        isOutgoing: true,
      };
    }
    return {
      title: String(txType).charAt(0).toUpperCase() + String(txType).slice(1),
      subtitle: tx.description || 'Transaction',
      isOutgoing: tx.amount < 0,
    };
  };

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const { refetch, isRefetching } = transactionsQuery;

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderTransaction = ({ item }: { item: TransactionData }) => {
    const { title, subtitle, isOutgoing } = getTransactionInfo(item);
    const status = item.status || 'completed';
    const displayAmount = Math.abs(item.amount);
    
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.cardLeft}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: isOutgoing ? '#FEE2E2' : '#DCFCE7' }
          ]}>
            <Ionicons 
              name={isOutgoing ? 'arrow-up' : 'arrow-down'} 
              size={20} 
              color={isOutgoing ? '#EF4444' : '#10B981'} 
            />
          </View>
          <View style={styles.cardDetails}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
            <Text style={[styles.cardDate, { color: theme.colors.textSecondary }]}>
              {formatDateTime(item.created_at)}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[
            styles.cardAmount,
            { color: isOutgoing ? '#EF4444' : '#10B981' }
          ]}>
            {isOutgoing ? '-' : '+'}${displayAmount.toFixed(2)}
          </Text>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor:
                status === 'completed' ? '#DCFCE7' :
                status === 'pending' ? '#FEF3C7' : '#FEE2E2',
            },
          ]}>
            <Text style={[
              styles.statusText,
              {
                color:
                  status === 'completed' ? '#10B981' :
                  status === 'pending' ? '#F59E0B' : '#EF4444',
              },
            ]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (transactionsQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator color="#667eea" size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {i18n.t('loadingTransactions')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <View style={styles.errorStateContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            {i18n.t('failedToLoad')}
          </Text>
          <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>
            {i18n.t('errorLoadingTransactions')}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => transactionsQuery.refetch()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>{i18n.t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <FlatList
        data={transactionsQuery.data}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {i18n.t('noTransactions')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {i18n.t('transactionsWillAppear')}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cardDate: {
    fontSize: 12,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  errorStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#667EEA',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Transaction } from '@/lib/types';
import { useState, useCallback } from 'react';

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
          amount,
          balance_after,
          type,
          description,
          created_at,
          status,
          from_user_id,
          to_user_id,
          from_profile:from_user_id (
            email,
            full_name
          ),
          to_profile:to_user_id (
            email,
            full_name
          )
        `)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Transaction fetch error:', error);
        throw new Error('Failed to fetch transactions');
      }
      
      if (!data) {
        return [];
      }
      
      return (data as any[]).map((tx: any) => ({
        ...tx,
        from_profile: Array.isArray(tx.from_profile) ? tx.from_profile[0] : tx.from_profile,
        to_profile: Array.isArray(tx.to_profile) ? tx.to_profile[0] : tx.to_profile,
      })) as Transaction[];
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const getTransactionLabel = (tx: Transaction): string => {
    const isSender = tx.from_user_id === user?.id;
    const txType = tx.type;
    
    if (txType === 'send') {
      return isSender 
        ? (tx.to_profile?.email || tx.to_profile?.full_name || 'User')
        : (tx.from_profile?.email || tx.from_profile?.full_name || 'User');
    }
    if (txType === 'receive') {
      return isSender
        ? (tx.to_profile?.email || tx.to_profile?.full_name || 'User')
        : (tx.from_profile?.email || tx.from_profile?.full_name || 'User');
    }
    if (txType === 'deposit') {
      return 'Admin Top-up';
    }
    if (txType === 'purchase_mobile' || txType === 'purchase_card' || txType === 'purchase_giftcard') {
      return tx.description || 'Shop Purchase';
    }
    return tx.description || 'Transaction';
  };

  const getTransactionTypeLabel = (tx: Transaction): string => {
    const isSender = tx.from_user_id === user?.id;
    const txType = tx.type;
    
    if (txType === 'send') {
      return isSender ? 'Sent' : 'Received';
    }
    if (txType === 'receive') {
      return isSender ? 'Sent' : 'Received';
    }
    if (txType === 'deposit') {
      return 'Deposit';
    }
    if (txType === 'purchase_mobile') {
      return 'Mobile';
    }
    if (txType === 'purchase_card') {
      return 'Card';
    }
    if (txType === 'purchase_giftcard') {
      return 'Gift Card';
    }
    return String(txType).charAt(0).toUpperCase() + String(txType).slice(1);
  };

  const formatDateTime = (dateStr: string): { date: string; time: string } => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await transactionsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionsQuery.refetch]);

  if (transactionsQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <ActivityIndicator color="#667eea" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <View style={styles.errorStateContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            {i18n.t('failedToLoad')}
          </Text>
          <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>
            {i18n.t('errorLoadingTransactions')}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => transactionsQuery.refetch()}
          >
            <Text style={styles.retryButtonText}>{i18n.t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={[styles.tableHeader, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.headerCell, styles.headerAmount, { color: theme.colors.text }]}>Amount</Text>
          <Text style={[styles.headerCell, styles.headerType, { color: theme.colors.text }]}>Type</Text>
          <Text style={[styles.headerCell, styles.headerEmail, { color: theme.colors.text }]}>Details</Text>
          <Text style={[styles.headerCell, styles.headerDate, { color: theme.colors.text }]}>Date/Time</Text>
          <Text style={[styles.headerCell, styles.headerStatus, { color: theme.colors.text }]}>Status</Text>
        </View>

        {transactionsQuery.data && transactionsQuery.data.length > 0 ? (
          transactionsQuery.data.map((transaction) => {
            const isSender = transaction.from_user_id === user?.id;
            const typeLabel = getTransactionTypeLabel(transaction);
            const displayLabel = getTransactionLabel(transaction);
            const status = transaction.status || 'completed';
            const amountColor = transaction.amount > 0 ? '#10b981' : '#ef4444';
            const { date, time } = formatDateTime(transaction.created_at);
            
            return (
              <View key={transaction.id} style={[styles.tableRow, { backgroundColor: theme.colors.card }]}>
                <View style={styles.rowAmountContainer}>
                  <Text
                    style={[
                      styles.rowAmount,
                      { color: amountColor },
                    ]}
                  >
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </Text>
                  <Text style={[styles.balanceAfter, { color: theme.colors.textSecondary }]}>
                    Bal: ${transaction.balance_after?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.rowTypeContainer}>
                  <Text style={[styles.rowType, { color: theme.colors.text }]}>
                    {typeLabel}
                  </Text>
                  {(transaction.type === 'send' || transaction.type === 'receive') && (
                    <Ionicons 
                      name={isSender ? 'arrow-up' : 'arrow-down'} 
                      size={12} 
                      color={isSender ? '#ef4444' : '#10b981'} 
                    />
                  )}
                </View>
                <Text 
                  style={[styles.rowCell, styles.rowEmail, { color: theme.colors.textSecondary }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {displayLabel}
                </Text>
                <View style={styles.rowDateContainer}>
                  <Text style={[styles.rowDate, { color: theme.colors.text }]}>
                    {date}
                  </Text>
                  <Text style={[styles.rowTime, { color: theme.colors.textSecondary }]}>
                    {time}
                  </Text>
                </View>
                <View style={[styles.rowCell, styles.rowStatus]}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          status === 'completed'
                            ? '#dcfce7'
                            : status === 'pending'
                            ? '#fef3c7'
                            : '#fee2e2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            status === 'completed'
                              ? '#10b981'
                              : status === 'pending'
                              ? '#f59e0b'
                              : '#ef4444',
                        },
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{i18n.t('noTransactions')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  headerAmount: {
    width: 80,
  },
  headerType: {
    width: 65,
  },
  headerEmail: {
    flex: 1,
    minWidth: 100,
  },
  headerDate: {
    width: 85,
  },
  headerStatus: {
    width: 90,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  rowCell: {
    fontSize: 13,
  },
  rowAmountContainer: {
    width: 80,
  },
  rowAmount: {
    fontWeight: '700' as const,
    fontSize: 13,
  },
  balanceAfter: {
    fontSize: 10,
    marginTop: 2,
  },
  rowTypeContainer: {
    width: 65,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  rowType: {
    fontWeight: '600' as const,
    fontSize: 12,
  },
  rowEmail: {
    flex: 1,
    minWidth: 80,
    fontSize: 11,
  },
  rowDateContainer: {
    width: 70,
  },
  rowDate: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  rowTime: {
    fontSize: 10,
    marginTop: 2,
  },
  rowStatus: {
    width: 90,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
  },
  errorStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
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
    backgroundColor: '#60A5FA',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

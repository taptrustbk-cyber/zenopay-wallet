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
        .select('id, from_user_id, to_user_id, amount, type, status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Failed to fetch transactions');
      }
      
      if (!data) {
        return [];
      }
      
      return data as Transaction[];
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

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
          <Text style={[styles.headerCell, styles.headerEmail, { color: theme.colors.text }]}>To/From</Text>
          <Text style={[styles.headerCell, styles.headerDate, { color: theme.colors.text }]}>Date</Text>
          <Text style={[styles.headerCell, styles.headerStatus, { color: theme.colors.text }]}>Status</Text>
        </View>

        {transactionsQuery.data && transactionsQuery.data.length > 0 ? (
          transactionsQuery.data.map((transaction) => {
            const isSent = transaction.from_user_id === user?.id;
            const isDeposit = transaction.type === 'deposit' && transaction.from_user_id === transaction.to_user_id;
            const type = isDeposit ? 'Deposit' : isSent ? 'Send' : 'Receive';
            const email = isDeposit 
              ? 'Admin'
              : isSent 
                ? transaction.to_user_id?.substring(0, 8) + '...'
                : transaction.from_user_id?.substring(0, 8) + '...';
            const status = transaction.status || 'completed';
            
            return (
              <View key={transaction.id} style={[styles.tableRow, { backgroundColor: theme.colors.card }]}>
                <Text
                  style={[
                    styles.rowCell,
                    styles.rowAmount,
                    { color: isSent && !isDeposit ? '#ef4444' : '#10b981' },
                  ]}
                >
                  {isSent && !isDeposit ? '-' : '+'}${transaction.amount.toFixed(2)}
                </Text>
                <Text style={[styles.rowCell, styles.rowType, { color: theme.colors.text }]}>
                  {type}
                </Text>
                <Text 
                  style={[styles.rowCell, styles.rowEmail, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {email}
                </Text>
                <Text style={[styles.rowCell, styles.rowDate, { color: theme.colors.textSecondary }]}>
                  {new Date(transaction.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
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
  rowAmount: {
    width: 80,
    fontWeight: '700' as const,
  },
  rowType: {
    width: 65,
    fontWeight: '600' as const,
  },
  rowEmail: {
    flex: 1,
    minWidth: 100,
  },
  rowDate: {
    width: 85,
    fontSize: 12,
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

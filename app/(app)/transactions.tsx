import { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext'; // keep (not breaking)
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Stack, useRouter } from 'expo-router';

const UI = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#47B08A',
  greenSoft: '#EAF7F1',
  red: '#EF4444',
};

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
  // ✅ hide default header (removes dark-blue top bar)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const header = <Stack.Screen options={{ headerShown: false }} />;

  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme(); // keep theme (not used for colors)

  const transactionsQuery = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not found');

      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          id,
          type,
          status,
          amount,
          description,
          created_at,
          sender_id,
          receiver_id,
          balance_after
        `
        )
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
    gcTime: 0,
  });

  const getTransactionInfo = (
    tx: TransactionData
  ): { title: string; subtitle: string; isOutgoing: boolean } => {
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

    const statusBg =
      status === 'completed' ? 'rgba(71,176,138,0.12)' : status === 'pending' ? '#FEF3C7' : '#FEE2E2';
    const statusColor =
      status === 'completed' ? UI.green : status === 'pending' ? '#F59E0B' : UI.red;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isOutgoing ? '#FEE2E2' : 'rgba(71,176,138,0.14)' },
            ]}
          >
            <Ionicons
              name={isOutgoing ? 'arrow-up' : 'arrow-down'}
              size={20}
              color={isOutgoing ? UI.red : UI.green}
            />
          </View>

          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
            <Text style={styles.cardDate}>{formatDateTime(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: isOutgoing ? UI.red : UI.green }]}>
            {isOutgoing ? '-' : '+'}${displayAmount.toFixed(2)}
          </Text>

          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (transactionsQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={UI.green} size="large" />
          <Text style={styles.loadingText}>{i18n.t('loadingTransactions')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Custom header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={22} color={UI.text} />
            <Text style={styles.headerBack}>{i18n.t('back')}</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{i18n.t('transactions')}</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.errorStateContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={46} color={UI.red} />
          </View>

          <Text style={styles.errorTitle}>{i18n.t('failedToLoad')}</Text>
          <Text style={styles.errorMessage}>{i18n.t('errorLoadingTransactions')}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => transactionsQuery.refetch()} activeOpacity={0.9}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{i18n.t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={transactionsQuery.data}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={UI.green} colors={[UI.green]} />
        }
        ListHeaderComponent={
          // ✅ Custom header (only one)
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color={UI.text} />
              <Text style={styles.headerBack}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{i18n.t('transactions')}</Text>

            <View style={{ width: 70 }} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={44} color={UI.text2} />
            </View>
            <Text style={styles.emptyTitle}>{i18n.t('noTransactions')}</Text>
            <Text style={styles.emptySubtitle}>{i18n.t('transactionsWillAppear')}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 90,
  },
  headerBack: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },

  listContent: {
    paddingBottom: 28,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardDetails: { flex: 1 },

  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.text2,
    marginTop: 3,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
    marginTop: 5,
  },

  cardRight: { alignItems: 'flex-end' },
  cardAmount: {
    fontSize: 16,
    fontWeight: '900',
  },

  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },

  // Loading
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.text2,
    textAlign: 'center',
  },

  // Empty
  emptyState: {
    paddingTop: 70,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#EEF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error
  errorStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Green button
  primaryBtn: {
    marginTop: 8,
    backgroundColor: UI.green,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});

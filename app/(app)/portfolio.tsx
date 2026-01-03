import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { useState } from 'react';

interface PortfolioItem {
  id: string;
  user_id: string;
  name: string;
  value: number;
  created_at?: string;
}

export default function PortfolioScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});

  const portfolioQuery = useQuery({
    queryKey: ['portfolios', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Portfolio] Fetch error:', error);
        throw error;
      }
      return (data || []) as PortfolioItem[];
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

      if (error) {
        console.error('[Wallet] Fetch error:', error);
        throw error;
      }
      return data?.balance || 0;
    },
    enabled: !!user?.id,
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      console.log('[Portfolio] Updating portfolio item:', id, 'value:', value);
      const { error } = await supabase
        .from('portfolios')
        .update({ value })
        .eq('id', id);

      if (error) {
        console.error('[Portfolio] Update error:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['portfolios', user?.id] });
      await updateWalletBalance();
    },
    onError: (error) => {
      console.error('[Portfolio] Mutation error:', error);
      Alert.alert(i18n.t('error'), i18n.t('updateFailed'));
    },
  });

  const updateWalletBalance = async () => {
    if (!user?.id || !portfolioQuery.data) return;

    const totalValue = portfolioQuery.data.reduce((sum, item) => sum + item.value, 0);
    console.log('[Wallet] Updating balance to:', totalValue);

    const { error } = await supabase
      .from('wallets')
      .update({ balance: totalValue })
      .eq('user_id', user.id);

    if (error) {
      console.error('[Wallet] Update error:', error);
    } else {
      await queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
    }
  };

  const handleUpdateValue = (id: string, currentValue: number) => {
    const newValue = editValues[id] ? parseFloat(editValues[id]) : currentValue;
    
    if (isNaN(newValue) || newValue < 0) {
      Alert.alert(i18n.t('error'), i18n.t('invalidValue'));
      return;
    }

    updatePortfolioMutation.mutate({ id, value: newValue });
  };

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
            {i18n.t('walletBalance')}
          </Text>
          {walletQuery.isLoading ? (
            <ActivityIndicator color="#60A5FA" />
          ) : (
            <Text style={[styles.balanceValue, { color: theme.colors.text }]}>
              ${typeof walletQuery.data === 'number' ? walletQuery.data.toFixed(2) : '0.00'}
            </Text>
          )}
          <Text style={[styles.balanceCurrency, { color: theme.colors.textSecondary }]}>USD</Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {i18n.t('portfolioItems')}
          </Text>

          {portfolioQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#60A5FA" size="large" />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                {i18n.t('loadingPortfolio')}
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
              <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {i18n.t('portfolioSyncInfo')}
                </Text>
              </View>

              {portfolioQuery.data.map((item) => {
                const currentEditValue = editValues[item.id] ?? item.value.toString();

                return (
                  <View key={item.id} style={[styles.portfolioCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.portfolioHeader}>
                      <View style={styles.portfolioInfo}>
                        <Text style={[styles.portfolioName, { color: theme.colors.text }]}>
                          {item.name}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.portfolioRow}>
                      <Text style={[styles.portfolioLabel, { color: theme.colors.textSecondary }]}>
                        {i18n.t('value')}:
                      </Text>
                      <View style={styles.inputContainer}>
                        <Text style={[styles.dollarSign, { color: theme.colors.textSecondary }]}>$</Text>
                        <TextInput
                          style={[
                            styles.valueInput,
                            { 
                              color: theme.colors.text,
                              backgroundColor: theme.colors.background,
                              borderColor: theme.colors.border,
                            }
                          ]}
                          value={currentEditValue}
                          onChangeText={(text) => setEditValues({ ...editValues, [item.id]: text })}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={theme.colors.textSecondary}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.updateButton,
                        { backgroundColor: theme.colors.primary },
                        updatePortfolioMutation.isPending && styles.updateButtonDisabled,
                      ]}
                      onPress={() => handleUpdateValue(item.id, item.value)}
                      disabled={updatePortfolioMutation.isPending}
                    >
                      {updatePortfolioMutation.isPending ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={18} color="white" />
                          <Text style={styles.updateButtonText}>{i18n.t('update')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {i18n.t('noPortfolioItems')}
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
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  portfolioCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  portfolioHeader: {
    marginBottom: 16,
  },
  portfolioInfo: {
    flex: 1,
  },
  portfolioName: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  portfolioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  portfolioLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    width: 50,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginRight: 8,
  },
  valueInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
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

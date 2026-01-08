import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import i18n from '@/lib/i18n';
import React from 'react';

interface CardPin {
  id: string;
  provider: string;
  amount: number;
  pin_code: string;
  is_used: boolean;
}

export default function BuyCardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  
  const cardName = params.name as string;
  const price = parseFloat(params.price as string);
  const provider = params.provider as string;
  const amount = parseFloat(params.amount as string);
  const cardType = params.type as string;

  const [purchasedPin, setPurchasedPin] = React.useState<string | null>(null);

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');
      
      const { data, error } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');
      if (!walletQuery.data) throw new Error('Wallet not found');
      
      const balance = walletQuery.data.balance;
      
      if (balance < price) {
        throw new Error('Insufficient balance');
      }

      const { data: pin, error: pinError } = await supabase
        .from('card_pins')
        .select('*')
        .eq('provider', provider)
        .eq('amount', amount)
        .eq('is_used', false)
        .limit(1)
        .maybeSingle();

      if (pinError) throw pinError;
      if (!pin) throw new Error('No cards available');

      const newBalance = balance - price;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const { error: markUsedError } = await supabase
        .from('card_pins')
        .update({ is_used: true })
        .eq('id', pin.id);

      if (markUsedError) throw markUsedError;

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'purchase',
          amount: price,
          description: `Purchased ${cardName}`,
          status: 'completed',
        });

      if (txError) throw txError;

      return pin as CardPin;
    },
    onSuccess: (pin) => {
      setPurchasedPin(pin.pin_code);
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error.message || i18n.t('purchaseFailed'));
    },
  });

  const handlePurchase = () => {
    Alert.alert(
      i18n.t('confirmPurchase'),
      `${i18n.t('purchaseConfirmMessage')} ${cardName} ${i18n.t('for')} $${price.toFixed(2)}?`,
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        { 
          text: i18n.t('confirm'), 
          onPress: () => purchaseMutation.mutate() 
        },
      ]
    );
  };

  if (purchasedPin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.successContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={100} color="#10B981" />
            </View>
            
            <Text style={[styles.successTitle, { color: theme.colors.text }]}>
              {i18n.t('purchaseSuccess')}
            </Text>
            
            <View style={[styles.pinCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.pinLabel, { color: theme.colors.textSecondary }]}>
                {i18n.t('yourPinCode')}
              </Text>
              <Text style={[styles.pinCode, { color: theme.colors.text }]}>
                {purchasedPin}
              </Text>
              <Text style={[styles.pinWarning, { color: theme.colors.textSecondary }]}>
                {i18n.t('saveThisPin')}
              </Text>
            </View>

            <View style={[styles.detailsCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>
                {i18n.t('purchaseDetails')}
              </Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  {i18n.t('product')}
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {cardName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  {i18n.t('amount')}
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  ${price.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={styles.doneButtonText}>{i18n.t('backToDashboard')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.cardPreview, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.cardIconContainer, { 
              backgroundColor: cardType === 'sim' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)' 
            }]}>
              {cardType === 'sim' ? (
                <MaterialIcons name="sim-card" size={60} color="#3B82F6" />
              ) : (
                <Ionicons name="gift" size={60} color="#10B981" />
              )}
            </View>
            <Text style={[styles.cardName, { color: theme.colors.text }]}>
              {cardName}
            </Text>
            <Text style={[styles.cardPrice, { color: theme.colors.primary }]}>
              ${price.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.balanceCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
              {i18n.t('yourBalance')}
            </Text>
            {walletQuery.isLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
                ${walletQuery.data?.balance.toFixed(2) || '0.00'}
              </Text>
            )}
          </View>

          {walletQuery.data && walletQuery.data.balance < price && (
            <View style={styles.insufficientWarning}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={styles.insufficientText}>
                {i18n.t('insufficientBalanceForPurchase')}
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.purchaseButton, 
              { backgroundColor: theme.colors.primary },
              (purchaseMutation.isPending || (walletQuery.data && walletQuery.data.balance < price)) && styles.disabledButton
            ]}
            onPress={handlePurchase}
            disabled={purchaseMutation.isPending || (walletQuery.data ? walletQuery.data.balance < price : true)}
          >
            {purchaseMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="cart" size={20} color="white" />
                <Text style={styles.purchaseButtonText}>{i18n.t('buyNow')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.cancelButton, { borderColor: theme.colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
              {i18n.t('cancel')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  successContent: {
    padding: 20,
    alignItems: 'center',
  },
  cardPreview: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  cardPrice: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  balanceCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  insufficientWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
  },
  insufficientText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  successIconContainer: {
    marginVertical: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 32,
    textAlign: 'center' as const,
  },
  pinCard: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  pinLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  pinCode: {
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: 4,
    marginBottom: 16,
  },
  pinWarning: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  detailsCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  doneButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import i18n from '@/lib/i18n';

interface CardPin {
  id: string;
  provider: string;
  amount: number;
  pin_code: string;
  is_used: boolean;
}

const providerConfig: Record<string, { color: string; bgColor: string; logo: string }> = {
  korek: {
    color: '#FF6B00',
    bgColor: 'rgba(255, 107, 0, 0.15)',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uu16k1t8p3uz3dpr3k6ic',
  },
  zain: {
    color: '#00A651',
    bgColor: 'rgba(0, 166, 81, 0.15)',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uq8qjx7d0g47h9rv2jvzz',
  },
  asiacell: {
    color: '#C8102E',
    bgColor: 'rgba(200, 16, 46, 0.15)',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q8puaw0dyshx6jruwg83i',
  },
  ftth: {
    color: '#0066CC',
    bgColor: 'rgba(0, 102, 204, 0.15)',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1ogdfkyuisk5c6unchj2s',
  },
};

const UI = {
  bg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  green: '#16A34A',
  greenDark: '#15803D',
  black: '#0B1220',
  white: '#FFFFFF',
};

export default function BuyCardScreen() {
  // keep theme hook (not used for colors now)
  useTheme();

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

      const { error: txError } = await supabase.from('transactions').insert({
        to_user_id: user.id,
        type: 'purchase',
        amount: -price,
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
        // ✅ Cancel: black bg with white text (cannot style default Alert buttons perfectly on Android/iOS)
        { text: i18n.t('cancel'), style: 'cancel' },
        // ✅ Confirm: will proceed
        { text: i18n.t('confirm'), onPress: () => purchaseMutation.mutate() },
      ]
    );
  };

  // ✅ helper: go back to top-up cards screen
  const goBackToTopupCards = () => {
    // if you have a specific route, replace this with your exact path:
    // router.push('/(app)/top-up-cards' as any);
    router.back();
  };

  // SUCCESS SCREEN (after buy)
  if (purchasedPin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        {/* White custom header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBackToTopupCards} activeOpacity={0.85} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={18} color={UI.white} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{i18n.t('buyCard')}</Text>

          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={96} color={UI.green} />
          </View>

          <Text style={styles.successTitle}>{i18n.t('purchaseSuccess')}</Text>

          <View style={styles.pinCard}>
            <Text style={styles.pinLabel}>{i18n.t('yourPinCode')}</Text>
            <Text style={styles.pinCode}>{purchasedPin}</Text>
            <Text style={styles.pinWarning}>{i18n.t('saveThisPin')}</Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{i18n.t('purchaseDetails')}</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{i18n.t('product')}</Text>
              <Text style={styles.detailValue}>{cardName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{i18n.t('amount')}</Text>
              <Text style={styles.detailValue}>${price.toFixed(2)}</Text>
            </View>
          </View>

          {/* ✅ Confirm button style (green) */}
          <TouchableOpacity style={styles.primaryButton} onPress={goBackToTopupCards} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>{i18n.t('done')}</Text>
          </TouchableOpacity>

          {/* ✅ Cancel style (black bg white text) */}
          <TouchableOpacity style={styles.secondaryBlackButton} onPress={goBackToTopupCards} activeOpacity={0.9}>
            <Text style={styles.secondaryBlackButtonText}>{i18n.t('back')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // BUY SCREEN
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ✅ Remove the default expo-router header (the dark header you see) */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* ✅ New Header: white bg, black title, green back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToTopupCards} activeOpacity={0.85} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={18} color={UI.white} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('buyCard')}</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardPreview}>
          {cardType === 'sim' ? (
            <View
              style={[
                styles.cardIconContainer,
                { backgroundColor: providerConfig[provider]?.bgColor || 'rgba(22, 163, 74, 0.10)' },
              ]}
            >
              {providerConfig[provider]?.logo ? (
                <Image source={{ uri: providerConfig[provider].logo }} style={styles.providerLogo} resizeMode="contain" />
              ) : (
                <Ionicons name="cellular" size={58} color={providerConfig[provider]?.color || UI.green} />
              )}
            </View>
          ) : (
            <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(22, 163, 74, 0.10)' }]}>
              <Ionicons name="gift" size={58} color={UI.green} />
            </View>
          )}

          <Text style={styles.cardName}>{cardName}</Text>
          <Text style={styles.cardPrice}>${price.toFixed(2)}</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{i18n.t('yourBalance')}</Text>
          {walletQuery.isLoading ? (
            <ActivityIndicator color={UI.green} />
          ) : (
            <Text style={styles.balanceAmount}>${walletQuery.data?.balance.toFixed(2) || '0.00'}</Text>
          )}
        </View>

        {walletQuery.data && walletQuery.data.balance < price && (
          <View style={styles.insufficientWarning}>
            <Ionicons name="warning" size={22} color="#EF4444" />
            <Text style={styles.insufficientText}>{i18n.t('insufficientBalanceForPurchase')}</Text>
          </View>
        )}

        {/* ✅ Buy button: green bg */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (purchaseMutation.isPending || (walletQuery.data && walletQuery.data.balance < price)) && styles.disabledButton,
          ]}
          onPress={handlePurchase}
          disabled={purchaseMutation.isPending || (walletQuery.data ? walletQuery.data.balance < price : true)}
          activeOpacity={0.9}
        >
          {purchaseMutation.isPending ? (
            <ActivityIndicator color={UI.white} />
          ) : (
            <>
              <Ionicons name="cart" size={20} color={UI.white} />
              <Text style={styles.primaryButtonText}>{i18n.t('buyNow')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ✅ Cancel button: black bg + white text */}
        <TouchableOpacity style={styles.secondaryBlackButton} onPress={goBackToTopupCards} activeOpacity={0.9}>
          <Text style={styles.secondaryBlackButtonText}>{i18n.t('cancel')}</Text>
        </TouchableOpacity>

        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  // Header
  header: {
    backgroundColor: UI.bg,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: UI.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
  },
  headerRightSpacer: {
    width: 38,
    height: 38,
  },

  content: {
    padding: 20,
    paddingBottom: 18,
  },

  // Cards (white design)
  cardPreview: {
    backgroundColor: UI.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden' as const,
  },
  providerLogo: {
    width: 82,
    height: 82,
  },
  cardName: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 6,
    textAlign: 'center' as const,
    color: UI.text,
  },
  cardPrice: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: UI.greenDark,
  },

  balanceCard: {
    backgroundColor: UI.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: 8,
    color: UI.textSecondary,
    fontWeight: '700' as const,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: UI.text,
  },

  insufficientWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
  },
  insufficientText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800' as const,
  },

  // Buttons
  primaryButton: {
    backgroundColor: UI.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  primaryButtonText: {
    color: UI.white,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  secondaryBlackButton: {
    backgroundColor: UI.black,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBlackButtonText: {
    color: UI.white,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Success screen
  successContent: {
    padding: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginTop: 16,
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    marginBottom: 18,
    textAlign: 'center' as const,
    color: UI.text,
  },
  pinCard: {
    width: '100%',
    backgroundColor: UI.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  pinLabel: {
    fontSize: 13,
    marginBottom: 10,
    color: UI.textSecondary,
    fontWeight: '800' as const,
  },
  pinCode: {
    fontSize: 34,
    fontWeight: '900' as const,
    letterSpacing: 3,
    marginBottom: 10,
    color: UI.text,
  },
  pinWarning: {
    fontSize: 12,
    textAlign: 'center' as const,
    color: UI.textSecondary,
    fontWeight: '700' as const,
  },

  detailsCard: {
    width: '100%',
    backgroundColor: UI.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    marginBottom: 18,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    marginBottom: 12,
    color: UI.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: UI.textSecondary,
    fontWeight: '800' as const,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: UI.text,
  },
});

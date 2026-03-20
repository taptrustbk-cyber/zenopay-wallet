import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

type CardType = 'sim' | 'gift' | 'topup';

type WalletRow = {
  id: string;
  user_id: string;
  balance: number;
};

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
  avatar_url?: string | null;
};

const providerConfig: Record<string, { color: string; bgColor: string; logo: string }> = {
  korek: {
    color: '#1570A6',
    bgColor: '#F1F9FF',
    logo: 'https://wzjnwgygmiznavrdgppo.supabase.co/storage/v1/object/public/product-images/sim-card-1773717052421.jpg',
  },
  zain: {
    color: '#6E3CBC',
    bgColor: '#F6F1FF',
    logo: 'https://wzjnwgygmiznavrdgppo.supabase.co/storage/v1/object/public/product-images/sim-card-1773716686562.jpg',
  },
  asiacell: {
    color: '#D53434',
    bgColor: '#FFF3F2',
    logo: 'https://wzjnwgygmiznavrdgppo.supabase.co/storage/v1/object/public/product-images/sim-card-1773716476782.png',
  },
  ftth: {
    color: '#2269D1',
    bgColor: '#F2F7FF',
    logo: '',
  },
};

const UI = {
  bg: '#FFFDF8',
  card: '#FFFFFF',
  text: '#1F1B12',
  textSoft: '#7A715B',
  border: '#EFE3B3',
  gold: '#FDE68A',
  goldBorder: '#F4D461',
  goldDark: '#5A4700',
  softGold: '#FFF8D8',
  dangerBg: '#FEF3F2',
  dangerBorder: '#FECACA',
  dangerText: '#B42318',
  success: '#16A34A',
  black: '#111827',
  white: '#FFFFFF',
};

function getProviderStyle(provider?: string | null) {
  const key = String(provider || '').toLowerCase();
  return (
    providerConfig[key] || {
      color: '#9A7B00',
      bgColor: '#FFFBEF',
      logo: '',
    }
  );
}

function isArabicMoneyLang() {
  const lang = String(i18n.language || '').toLowerCase();
  return ['ar', 'cbk', 'kmr'].includes(lang);
}

function formatIQDLocal(value?: number | null) {
  const num = Number(value || 0);
  const formatted = Math.abs(num)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return isArabicMoneyLang() ? `${formatted} د.غ` : `${formatted} IQD`;
}

function getIqdLabel() {
  return isArabicMoneyLang() ? 'د.غ' : 'IQD';
}

function upperFirst(v?: string | null) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function BuyCardScreen() {
  useTheme();

  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();

  const cardId = String(params.id || '');
  const categoryId = String(params.category_id || '');
  const cardName = String(params.name || '');
  const provider = String(params.provider || '');
  const imageUrl = String(params.image || '');
  const type = String(params.type || 'sim') as CardType;

  const amountRaw = Number(params.amount || 0);
  const passedIqdPrice = Number(params.iqd_price || 0);

  const priceIqd = passedIqdPrice > 0 ? passedIqdPrice : 0;

  const [orderCreated, setOrderCreated] = useState(false);

  const providerStyle = useMemo(() => getProviderStyle(provider), [provider]);

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error(i18n.t('auth.loginRequired') || 'Please login first.');

      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as WalletRow;
    },
    enabled: !!user?.id,
  });

  const profileQuery = useQuery({
    queryKey: ['profile_buy_card', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error(i18n.t('auth.loginRequired') || 'Please login first.');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, city, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as ProfileRow;
    },
    enabled: !!user?.id,
  });

  const hasEnoughBalance = useMemo(() => {
    const balance = Number(walletQuery.data?.balance || 0);
    return balance >= priceIqd;
  }, [walletQuery.data?.balance, priceIqd]);

  const cardTypeLabel = useMemo(() => {
    if (type === 'gift') return i18n.t('buyCard.giftCard') || 'Gift Card';
    if (type === 'topup') return i18n.t('buyCard.topupCard') || 'Top-Up Card';
    return i18n.t('buyCard.mobileCard') || 'Mobile Card';
  }, [type]);

  const finalProviderLabel = useMemo(() => {
    if (!provider) return '-';
    return upperFirst(provider);
  }, [provider]);

  const finalImage = useMemo(() => {
    if (imageUrl) return imageUrl;
    return providerStyle.logo || '';
  }, [imageUrl, providerStyle.logo]);

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(i18n.t('auth.loginRequired') || 'Please login first.');
      if (!walletQuery.data) throw new Error(i18n.t('buyCard.walletNotFound') || 'Wallet not found.');

      const currentBalance = Number(walletQuery.data.balance || 0);

      if (currentBalance < priceIqd) {
        throw new Error(
          i18n.t('buyCard.insufficientBalanceForPurchase') || 'Insufficient balance for purchase.'
        );
      }

      const profile = profileQuery.data;

      if (type === 'gift') {
        const giftOrderPayload = {
          user_id: user.id,
          gift_card_id: cardId || null,
          category_id: categoryId || null,
          card_title: cardName || null,
          provider: provider || null,
          amount: amountRaw || 0,
          amount_iqd: amountRaw || 0,
          price_iqd: priceIqd,
          image_url: finalImage || null,
          status: 'pending',
          pin_code: null,
          notes: null,
          user_name: profile?.full_name || '',
          user_email: profile?.email || user.email || '',
          user_phone: profile?.phone || '',
          user_city: profile?.city || '',
          user_avatar_url: profile?.avatar_url || null,
        };

        const { error: orderError } = await supabase
          .from('gift_card_orders')
          .insert(giftOrderPayload);

        if (orderError) throw orderError;
      } else {
        const topupOrderPayload = {
          user_id: user.id,
          topup_card_id: cardId || null,
          card_title: cardName || null,
          provider: provider || type,
          amount_iqd: amountRaw || 0,
          price_iqd: priceIqd,
          image_url: finalImage || null,
          status: 'pending',
          pin_code: null,
          notes: null,
          user_name: profile?.full_name || '',
          user_email: profile?.email || user.email || '',
          user_phone: profile?.phone || '',
          user_city: profile?.city || '',
          user_avatar_url: profile?.avatar_url || null,
        };

        const { error: orderError } = await supabase
          .from('topup_orders')
          .insert(topupOrderPayload);

        if (orderError) throw orderError;
      }

      return true;
    },
    onSuccess: async () => {
      setOrderCreated(true);
      await queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['notifications_orders', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['topup_orders'] });
      await queryClient.invalidateQueries({ queryKey: ['gift_card_orders'] });
    },
    onError: (error: any) => {
      Alert.alert(
        i18n.t('common.error') || 'Error',
        error?.message || i18n.t('buyCard.purchaseFailed') || 'Purchase failed.'
      );
    },
  });

  const handlePurchase = () => {
    Alert.alert(
      i18n.t('buyCard.confirmPurchaseTitle') || 'Confirm Purchase',
      `${i18n.t('buyCard.purchaseConfirmMessage') || 'Do you want to buy'} ${cardName} ${
        i18n.t('buyCard.for') || 'for'
      } ${formatIQDLocal(priceIqd)}?`,
      [
        {
          text: i18n.t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: i18n.t('buyCard.confirm') || 'Confirm',
          onPress: () => purchaseMutation.mutate(),
        },
      ]
    );
  };

  const goBack = () => {
    router.back();
  };

  const openNotifications = () => {
    router.replace('/(app)/notifications' as any);
  };

  const renderCardImage = () => {
    if (finalImage) {
      return <Image source={{ uri: finalImage }} style={styles.cardImage} resizeMode="cover" />;
    }

    return (
      <Ionicons
        name={type === 'gift' ? 'gift-outline' : 'card-outline'}
        size={58}
        color={providerStyle.color}
      />
    );
  };

  if (orderCreated) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.85} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={18} color={UI.goldDark} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{i18n.t('buyCard.title') || 'Buy Card'}</Text>

          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={92} color={UI.success} />
          </View>

          <Text style={styles.successTitle}>
            {i18n.t('buyCard.orderCreatedTitle') || 'Order Sent Successfully'}
          </Text>

          <Text style={styles.successSubtitle}>
            {i18n.t('buyCard.orderCreatedMessage') ||
              'Your order has been sent to admin. After review, the PIN code will appear in notifications.'}
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {i18n.t('buyCard.purchaseDetails') || 'Purchase Details'}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{i18n.t('buyCard.cardType') || 'Card Type'}</Text>
              <Text style={styles.detailValue}>{cardTypeLabel}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{i18n.t('buyCard.product') || 'Product'}</Text>
              <Text style={styles.detailValue}>{cardName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{i18n.t('buyCard.provider') || 'Provider'}</Text>
              <Text style={styles.detailValue}>{finalProviderLabel}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{i18n.t('buyCard.amount') || 'Amount'}</Text>
              <Text style={styles.detailValue}>{formatIQDLocal(amountRaw)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{i18n.t('buyCard.priceIqd') || 'Price IQD'}</Text>
              <Text style={styles.detailValue}>{formatIQDLocal(priceIqd)}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={openNotifications} activeOpacity={0.9}>
            <Ionicons name="notifications-outline" size={18} color={UI.goldDark} />
            <Text style={styles.primaryButtonText}>
              {i18n.t('buyCard.openNotifications') || 'Open Notifications'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={goBack} activeOpacity={0.9}>
            <Text style={styles.secondaryButtonText}>{i18n.t('common.back') || 'Back'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.85} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={18} color={UI.goldDark} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('buyCard.title') || 'Buy Card'}</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <Text style={styles.topCardMini}>{cardTypeLabel}</Text>
          <Text style={styles.topCardTitle}>
            {i18n.t('buyCard.reviewYourOrder') || 'Review your order'}
          </Text>
        </View>

        <View style={styles.cardPreview}>
          <View style={[styles.cardIconContainer, { backgroundColor: providerStyle.bgColor }]}>
            {renderCardImage()}
          </View>

          <Text style={styles.cardName}>{cardName}</Text>
          <Text style={styles.cardPriceIqd}>{formatIQDLocal(priceIqd)}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{i18n.t('buyCard.cardType') || 'Card Type'}</Text>
            <Text style={styles.infoValue}>{cardTypeLabel}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{i18n.t('buyCard.provider') || 'Provider'}</Text>
            <Text style={styles.infoValue}>{finalProviderLabel}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{i18n.t('buyCard.amount') || 'Amount'}</Text>
            <Text style={styles.infoValue}>{formatIQDLocal(amountRaw)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{i18n.t('buyCard.priceIqd') || 'Price IQD'}</Text>
            <Text style={styles.infoValue}>{formatIQDLocal(priceIqd)}</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{i18n.t('buyCard.yourBalance') || 'Your Balance'}</Text>
          {walletQuery.isLoading ? (
            <ActivityIndicator color={UI.goldDark} />
          ) : (
            <Text style={styles.balanceAmount}>
              {formatIQDLocal(walletQuery.data?.balance || 0)}
            </Text>
          )}
        </View>

        {walletQuery.data && !hasEnoughBalance && (
          <View style={styles.insufficientWarning}>
            <Ionicons name="warning-outline" size={20} color={UI.dangerText} />
            <Text style={styles.insufficientText}>
              {i18n.t('buyCard.insufficientBalanceForPurchase') || 'Insufficient balance for purchase.'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (purchaseMutation.isPending || !hasEnoughBalance || walletQuery.isLoading || profileQuery.isLoading) &&
              styles.disabledButton,
          ]}
          onPress={handlePurchase}
          disabled={purchaseMutation.isPending || !hasEnoughBalance || walletQuery.isLoading || profileQuery.isLoading}
          activeOpacity={0.9}
        >
          {purchaseMutation.isPending ? (
            <ActivityIndicator color={UI.goldDark} />
          ) : (
            <>
              <Ionicons name="cart-outline" size={18} color={UI.goldDark} />
              <Text style={styles.primaryButtonText}>
                {i18n.t('buyCard.buyNow') || 'Buy Now'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={goBack} activeOpacity={0.9}>
          <Text style={styles.secondaryButtonText}>{i18n.t('common.cancel') || 'Cancel'}</Text>
        </TouchableOpacity>

        <View style={{ height: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    backgroundColor: '#FFF9E8',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
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
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.goldBorder,
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
    padding: 16,
    paddingBottom: 18,
  },

  topCard: {
    backgroundColor: '#FFF6D9',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    marginBottom: 14,
  },
  topCardMini: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B08900',
    marginBottom: 6,
  },
  topCardTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: UI.text,
  },

  cardPreview: {
    backgroundColor: UI.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconContainer: {
    width: 150,
    height: 150,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F2E8C7',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardName: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
    color: UI.text,
  },
  cardPriceIqd: {
    fontSize: 28,
    fontWeight: '900',
    color: '#9B7600',
  },

  infoCard: {
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: '#8A7B49',
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
    textTransform: 'capitalize',
  },

  balanceCard: {
    backgroundColor: UI.softGold,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.goldBorder,
    padding: 16,
    marginBottom: 14,
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: 8,
    color: '#8E6F07',
    fontWeight: '800',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#3A2E00',
  },

  insufficientWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: UI.dangerBg,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: UI.dangerBorder,
  },
  insufficientText: {
    flex: 1,
    color: UI.dangerText,
    fontSize: 13,
    fontWeight: '800',
  },

  primaryButton: {
    backgroundColor: UI.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.goldBorder,
  },
  primaryButtonText: {
    color: UI.goldDark,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: UI.black,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: UI.white,
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },

  successContent: {
    padding: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginTop: 14,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
    color: UI.text,
  },
  successSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: UI.textSoft,
    fontWeight: '700',
    marginBottom: 16,
  },

  summaryCard: {
    width: '100%',
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
    color: UI.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: UI.textSoft,
    fontWeight: '800',
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
    textTransform: 'capitalize',
  },
});
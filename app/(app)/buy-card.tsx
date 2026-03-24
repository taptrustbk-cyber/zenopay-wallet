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
  TextInput,
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
type ExtraInputType = 'none' | 'player_id' | 'game_id' | 'profile_url' | 'text';

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

type GiftCardRow = {
  id: string;
  title?: string | null;
  brand?: string | null;
  category?: string | null;
  amount?: number | null;
  price_iqd?: number | null;
  image_url?: string | null;
  item_image_url?: string | null;
  category_id?: string | null;
};

type TopupCardRow = {
  id: string;
  title?: string | null;
  provider?: string | null;
  amount_iqd?: number | null;
  amount?: number | null;
  price_iqd?: number | null;
  image_url?: string | null;
  item_image_url?: string | null;
  provider_image_url?: string | null;
};

type GiftInputRule = {
  keywords: string[];
  type: ExtraInputType;
  labelKey: string;
  placeholderKey: string;
  subtitleKey?: string;
  optionalNameKey?: string;
  optionalNamePlaceholderKey?: string;
  keyboardType?: 'default' | 'url';
  multiline?: boolean;
};

const GIFT_INPUT_RULES: GiftInputRule[] = [
  {
    keywords: ['pubg', 'uc'],
    type: 'game_id',
    labelKey: 'buyCard.playerIdLabel',
    placeholderKey: 'buyCard.enterYourPlayerId',
    subtitleKey: 'buyCard.pubgPlayerIdHelp',
    optionalNameKey: 'buyCard.pubgAccountNameOptional',
    optionalNamePlaceholderKey: 'buyCard.enterPubgAccountNameOptional',
    keyboardType: 'default',
  },
  {
    keywords: ['free fire', 'diamond'],
    type: 'game_id',
    labelKey: 'buyCard.playerIdLabel',
    placeholderKey: 'buyCard.enterYourPlayerId',
    subtitleKey: 'buyCard.gameIdHelp',
    keyboardType: 'default',
  },
  {
    keywords: ['instagram', 'insta'],
    type: 'profile_url',
    labelKey: 'buyCard.profileUrlLabel',
    placeholderKey: 'buyCard.enterProfileUrl',
    subtitleKey: 'buyCard.profileUrlHelp',
    keyboardType: 'url',
  },
  {
    keywords: ['tiktok'],
    type: 'profile_url',
    labelKey: 'buyCard.profileUrlLabel',
    placeholderKey: 'buyCard.enterProfileUrl',
    subtitleKey: 'buyCard.profileUrlHelp',
    keyboardType: 'url',
  },
  {
    keywords: ['facebook'],
    type: 'profile_url',
    labelKey: 'buyCard.profileUrlLabel',
    placeholderKey: 'buyCard.enterProfileUrl',
    subtitleKey: 'buyCard.profileUrlHelp',
    keyboardType: 'url',
  },
  {
    keywords: ['telegram'],
    type: 'profile_url',
    labelKey: 'buyCard.profileUrlLabel',
    placeholderKey: 'buyCard.enterProfileUrl',
    subtitleKey: 'buyCard.profileUrlHelp',
    keyboardType: 'url',
  },
];

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
  bg: '#EEF4FF',
  page: '#F7FAFF',
  headerBg: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  textSoft: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',
  border2: '#DCEBFF',

  blue: '#2563EB',
  blue2: '#3B82F6',
  blue3: '#60A5FA',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  gold: '#EAF2FF',
  goldBorder: '#DCEBFF',
  goldDark: '#1D4ED8',
  softGold: '#F4F8FF',

  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#B42318',

  success: '#16A34A',
  successSoft: '#EAF8EF',

  black: '#0F172A',
  white: '#FFFFFF',
};

const SHADOWS = {
  card: {
    shadowColor: '#7DA8E6',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#7DA8E6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

function getProviderStyle(provider?: string | null) {
  const key = String(provider || '').toLowerCase();
  return (
    providerConfig[key] || {
      color: '#2563EB',
      bgColor: '#EAF2FF',
      logo: '',
    }
  );
}

function isArabicMoneyLang() {
  const lang = String(i18n.language || '').toLowerCase();
  return ['ar', 'cbk', 'ckb', 'kmr'].includes(lang);
}

function formatIQDLocal(value?: number | null) {
  const num = Number(value || 0);
  const formatted = Math.abs(num)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return isArabicMoneyLang() ? `${formatted} د.غ` : `${formatted} IQD`;
}

function formatNumberOnly(value?: number | null) {
  const num = Number(value || 0);
  return Math.abs(num)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function upperFirst(v?: string | null) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function toNumberSafe(value: any) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
}

function buildGiftAmountLabel(params: {
  amount: number;
  cardName?: string | null;
  provider?: string | null;
  brand?: string | null;
  category?: string | null;
}) {
  const amount = Number(params.amount || 0);
  const joined = [
    params.cardName,
    params.provider,
    params.brand,
    params.category,
  ]
    .map((x) => normalizeText(x))
    .join(' ');

  if (joined.includes('pubg') || joined.includes('uc')) {
    return `${formatNumberOnly(amount)} UC`;
  }

  if (joined.includes('tiktok') || joined.includes('coin')) {
    return `${formatNumberOnly(amount)} Coins`;
  }

  if (joined.includes('free fire') || joined.includes('diamond')) {
    return `${formatNumberOnly(amount)} Diamonds`;
  }

  if (joined.includes('itunes') || joined.includes('apple')) {
    return `${formatNumberOnly(amount)}`;
  }

  if (joined.includes('google play') || joined.includes('play store')) {
    return `${formatNumberOnly(amount)}`;
  }

  if (joined.includes('steam')) {
    return `${formatNumberOnly(amount)}`;
  }

  if (joined.includes('xbox')) {
    return `${formatNumberOnly(amount)}`;
  }

  if (joined.includes('playstation') || joined.includes('psn')) {
    return `${formatNumberOnly(amount)}`;
  }

  return formatNumberOnly(amount);
}

function detectGiftInputRule(params: {
  type: CardType;
  cardName?: string | null;
  provider?: string | null;
  brand?: string | null;
  category?: string | null;
}) {
  if (params.type !== 'gift') {
    return {
      type: 'none' as ExtraInputType,
      labelKey: '',
      placeholderKey: '',
      subtitleKey: '',
      optionalNameKey: '',
      optionalNamePlaceholderKey: '',
      keyboardType: 'default' as const,
      multiline: false,
    };
  }

  const joined = [
    params.cardName,
    params.provider,
    params.brand,
    params.category,
  ]
    .map((x) => normalizeText(x))
    .join(' ');

  const matched = GIFT_INPUT_RULES.find((rule) =>
    rule.keywords.some((keyword) => joined.includes(normalizeText(keyword)))
  );

  if (!matched) {
    return {
      type: 'none' as ExtraInputType,
      labelKey: '',
      placeholderKey: '',
      subtitleKey: '',
      optionalNameKey: '',
      optionalNamePlaceholderKey: '',
      keyboardType: 'default' as const,
      multiline: false,
    };
  }

  return {
    type: matched.type,
    labelKey: matched.labelKey,
    placeholderKey: matched.placeholderKey,
    subtitleKey: matched.subtitleKey || '',
    optionalNameKey: matched.optionalNameKey || '',
    optionalNamePlaceholderKey: matched.optionalNamePlaceholderKey || '',
    keyboardType: matched.keyboardType || 'default',
    multiline: !!matched.multiline,
  };
}

function isValidProfileUrl(value: string) {
  return /^https?:\/\/.+/i.test(String(value || '').trim());
}

export default function BuyCardScreen() {
  useTheme();

  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();

  const cardId = String(params.id || '');
  const categoryIdFromParams = String(params.category_id || '');
  const cardNameFromParams = String(params.name || '');
  const providerFromParams = String(params.provider || '');
  const imageUrlFromParams = String(params.image || params.image_url || '');
  const amountLabelFromParams = String(params.amount_label || '').trim();
  const type = String(params.type || 'sim') as CardType;

  const amountRawFromParams =
    toNumberSafe(params.amount) ||
    toNumberSafe(params.amount_iqd);

  const passedIqdPrice =
    toNumberSafe(params.iqd_price) ||
    toNumberSafe(params.price_iqd) ||
    toNumberSafe(params.price);

  const [orderCreated, setOrderCreated] = useState(false);
  const [extraInputValue, setExtraInputValue] = useState('');
  const [optionalAccountName, setOptionalAccountName] = useState('');

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error(i18n.t('auth.loginRequired') || 'Please login first.');
      }

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
      if (!user?.id) {
        throw new Error(i18n.t('auth.loginRequired') || 'Please login first.');
      }

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

  const cardQuery = useQuery({
    queryKey: ['buy_card_source_data', type, cardId],
    enabled: !!cardId,
    queryFn: async () => {
      if (!cardId) return null;

      if (type === 'gift') {
        const { data, error } = await supabase
          .from('gift_cards')
          .select('id, title, brand, category, amount, price_iqd, image_url, item_image_url, category_id')
          .eq('id', cardId)
          .maybeSingle();

        if (error) throw error;
        return data as GiftCardRow | null;
      }

      const { data, error } = await supabase
        .from('topup_cards')
        .select('id, title, provider, amount_iqd, amount, price_iqd, image_url, item_image_url, provider_image_url')
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      return data as TopupCardRow | null;
    },
  });

  const dbCard = cardQuery.data as GiftCardRow | TopupCardRow | null;

  const cardName = useMemo(() => {
    return cardNameFromParams || String((dbCard as any)?.title || '').trim() || 'Card';
  }, [cardNameFromParams, dbCard]);

  const provider = useMemo(() => {
    return (
      providerFromParams ||
      String(
        (dbCard as any)?.provider ||
          (dbCard as any)?.brand ||
          (dbCard as any)?.category ||
          ''
      ).trim() ||
      ''
    );
  }, [providerFromParams, dbCard]);

  const amountRaw = useMemo(() => {
    if (amountRawFromParams > 0) return amountRawFromParams;

    if (type === 'gift') {
      return toNumberSafe((dbCard as GiftCardRow | null)?.amount);
    }

    return (
      toNumberSafe((dbCard as TopupCardRow | null)?.amount_iqd) ||
      toNumberSafe((dbCard as TopupCardRow | null)?.amount)
    );
  }, [amountRawFromParams, dbCard, type]);

  const priceIqd = useMemo(() => {
    if (passedIqdPrice > 0) return passedIqdPrice;
    return toNumberSafe((dbCard as any)?.price_iqd);
  }, [passedIqdPrice, dbCard]);

  const resolvedCategoryId = useMemo(() => {
    if (categoryIdFromParams) return categoryIdFromParams;
    return String((dbCard as GiftCardRow | null)?.category_id || '');
  }, [categoryIdFromParams, dbCard]);

  const providerStyle = useMemo(() => getProviderStyle(provider), [provider]);

  const finalProviderLabel = useMemo(() => {
    if (!provider) return '-';
    return upperFirst(provider);
  }, [provider]);

  const finalImage = useMemo(() => {
    if (imageUrlFromParams) return imageUrlFromParams;

    return (
      String(
        (dbCard as any)?.item_image_url ||
          (dbCard as any)?.image_url ||
          (dbCard as any)?.provider_image_url ||
          ''
      ).trim() ||
      providerStyle.logo ||
      ''
    );
  }, [imageUrlFromParams, dbCard, providerStyle.logo]);

  const displayAmount = useMemo(() => {
    if (amountLabelFromParams) return amountLabelFromParams;

    if (type === 'gift') {
      const giftCard = dbCard as GiftCardRow | null;

      return buildGiftAmountLabel({
        amount: amountRaw,
        cardName,
        provider,
        brand: giftCard?.brand,
        category: giftCard?.category,
      });
    }

    if (type === 'sim' || type === 'topup') {
      return formatNumberOnly(amountRaw);
    }

    return formatNumberOnly(amountRaw);
  }, [amountLabelFromParams, type, dbCard, amountRaw, cardName, provider]);

  const hasEnoughBalance = useMemo(() => {
    const balance = Number(walletQuery.data?.balance || 0);
    return balance >= priceIqd;
  }, [walletQuery.data?.balance, priceIqd]);

  const cardTypeLabel = useMemo(() => {
    if (type === 'gift') return i18n.t('buyCard.giftCard') || 'Gift Card';
    if (type === 'topup') return i18n.t('buyCard.topupCard') || 'Top-Up Card';
    return i18n.t('buyCard.mobileCard') || 'Mobile Card';
  }, [type]);

  const extraInputRule = useMemo(() => {
    const giftCard = dbCard as GiftCardRow | null;

    return detectGiftInputRule({
      type,
      cardName,
      provider,
      brand: giftCard?.brand,
      category: giftCard?.category,
    });
  }, [type, cardName, provider, dbCard]);

  const requiresExtraInput = extraInputRule.type !== 'none';
  const showOptionalPubgName =
    requiresExtraInput &&
    extraInputRule.type === 'game_id' &&
    !!extraInputRule.optionalNameKey;

  const extraInputSummaryLabel = useMemo(() => {
    if (extraInputRule.type === 'game_id') return i18n.t('buyCard.playerIdSummaryLabel') || 'Player ID';
    if (extraInputRule.type === 'player_id') return i18n.t('buyCard.playerIdSummaryLabel') || 'Player ID';
    if (extraInputRule.type === 'profile_url') return i18n.t('buyCard.profileUrlSummaryLabel') || 'Profile URL';
    if (extraInputRule.type === 'text') return i18n.t('buyCard.requiredInfoSummaryLabel') || 'Required Info';
    return '';
  }, [extraInputRule]);

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error(i18n.t('auth.loginRequired') || 'Please login first.');
      }
      if (!walletQuery.data) {
        throw new Error(i18n.t('buyCard.walletNotFound') || 'Wallet not found.');
      }
      if (priceIqd <= 0) {
        throw new Error('Price IQD is missing. Please set price_iqd in admin.');
      }

      if (requiresExtraInput && !extraInputValue.trim()) {
        throw new Error(
          i18n.t('buyCard.enterRequiredInformation') || 'Please enter required information.'
        );
      }

      if (extraInputRule.type === 'profile_url' && !isValidProfileUrl(extraInputValue)) {
        throw new Error(i18n.t('buyCard.invalidProfileUrl') || 'Please enter a valid profile URL.');
      }

      const currentBalance = Number(walletQuery.data.balance || 0);

      if (currentBalance < priceIqd) {
        throw new Error(
          i18n.t('buyCard.insufficientBalanceForPurchase') || 'Insufficient balance for purchase.'
        );
      }

      const newBalance = currentBalance - priceIqd;

      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      const profile = profileQuery.data;

      try {
        if (type === 'gift') {
          const noteLines: string[] = [];

          if (requiresExtraInput && extraInputValue.trim()) {
            noteLines.push(`${extraInputSummaryLabel}: ${extraInputValue.trim()}`);
          }

          if (showOptionalPubgName && optionalAccountName.trim()) {
            noteLines.push(
              `${i18n.t('buyCard.pubgAccountNameSummaryLabel') || 'PUBG Account Name'}: ${optionalAccountName.trim()}`
            );
          }

          const extraNotes = noteLines.length ? noteLines.join('\n') : null;

          const giftOrderPayload = {
            user_id: user.id,
            gift_card_id: cardId || null,
            category_id: resolvedCategoryId || null,
            card_title: cardName || null,
            provider: provider || null,
            amount: amountRaw || 0,
            price_iqd: priceIqd,
            image_url: finalImage || null,
            status: 'pending',
            pin_code: null,
            notes: extraNotes,
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
      } catch (error) {
        await supabase
          .from('wallets')
          .update({ balance: currentBalance })
          .eq('user_id', user.id);

        throw error;
      }
    },
    onSuccess: async () => {
      setOrderCreated(true);
      await queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['notifications_orders', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['topup_orders'] });
      await queryClient.invalidateQueries({ queryKey: ['gift_card_orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin_gift_card_orders'] });
    },
    onError: (error: any) => {
      Alert.alert(
        i18n.t('common.error') || 'Error',
        error?.message || i18n.t('buyCard.purchaseFailed') || 'Purchase failed.'
      );
    },
  });

  const handlePurchase = () => {
    if (priceIqd <= 0) {
      Alert.alert(
        i18n.t('common.error') || 'Error',
        'Price IQD is missing. Please make sure price_iqd is set in admin.'
      );
      return;
    }

    if (requiresExtraInput && !extraInputValue.trim()) {
      Alert.alert(
        i18n.t('common.error') || 'Error',
        i18n.t('buyCard.enterRequiredInformation') || 'Please enter required information.'
      );
      return;
    }

    if (extraInputRule.type === 'profile_url' && !isValidProfileUrl(extraInputValue)) {
      Alert.alert(
        i18n.t('common.error') || 'Error',
        i18n.t('buyCard.invalidProfileUrl') || 'Please enter a valid profile URL.'
      );
      return;
    }

    const confirmLines: string[] = [];

    if (requiresExtraInput && extraInputValue.trim()) {
      confirmLines.push(`${extraInputSummaryLabel}: ${extraInputValue.trim()}`);
    }

    if (showOptionalPubgName && optionalAccountName.trim()) {
      confirmLines.push(
        `${i18n.t('buyCard.pubgAccountNameSummaryLabel') || 'PUBG Account Name'}: ${optionalAccountName.trim()}`
      );
    }

    const extraMessage = confirmLines.length ? `\n${confirmLines.join('\n')}` : '';

    Alert.alert(
      i18n.t('buyCard.confirmPurchaseTitle') || 'Confirm Purchase',
      `${i18n.t('buyCard.purchaseConfirmMessage') || 'Do you want to buy'} ${cardName} ${
        i18n.t('buyCard.for') || 'for'
      } ${formatIQDLocal(priceIqd)}?${extraMessage}`,
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

  const showPageLoader =
    walletQuery.isLoading ||
    profileQuery.isLoading ||
    (cardId ? cardQuery.isLoading : false);

  if (orderCreated) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.9} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={18} color={UI.blueDark} />
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
              <Text style={styles.detailValue}>{displayAmount}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{i18n.t('buyCard.priceIqd') || 'Price IQD'}</Text>
              <Text style={styles.detailValue}>{formatIQDLocal(priceIqd)}</Text>
            </View>

            {requiresExtraInput && !!extraInputValue.trim() && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{extraInputSummaryLabel}</Text>
                <Text style={styles.detailValue}>{extraInputValue.trim()}</Text>
              </View>
            )}

            {showOptionalPubgName && !!optionalAccountName.trim() && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {i18n.t('buyCard.pubgAccountNameSummaryLabel') || 'PUBG Account Name'}
                </Text>
                <Text style={styles.detailValue}>{optionalAccountName.trim()}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={openNotifications} activeOpacity={0.9}>
            <Ionicons name="notifications-outline" size={18} color={UI.white} />
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
        <TouchableOpacity onPress={goBack} activeOpacity={0.9} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={18} color={UI.blueDark} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('buyCard.title') || 'Buy Card'}</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      {showPageLoader ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator color={UI.blue} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topCard}>
            <View style={styles.topGlowOne} />
            <View style={styles.topGlowTwo} />
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

            {!!displayAmount && <Text style={styles.cardSubAmount}>{displayAmount}</Text>}

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
              <Text style={styles.infoValue}>{displayAmount}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{i18n.t('buyCard.priceIqd') || 'Price IQD'}</Text>
              <Text style={styles.infoValue}>{formatIQDLocal(priceIqd)}</Text>
            </View>
          </View>

          {requiresExtraInput && (
            <View style={styles.inputCard}>
              <Text style={styles.inputTitle}>
                {i18n.t(extraInputRule.labelKey) || i18n.t('buyCard.requiredInformation') || 'Required information'}
              </Text>

              <Text style={styles.inputSubtitle}>
                {extraInputRule.subtitleKey
                  ? i18n.t(extraInputRule.subtitleKey)
                  : i18n.t('buyCard.defaultInputHelp') || 'This information will be sent to admin with your order.'}
              </Text>

              <TextInput
                value={extraInputValue}
                onChangeText={setExtraInputValue}
                placeholder={
                  i18n.t(extraInputRule.placeholderKey) ||
                  i18n.t('buyCard.enterRequiredInformation') ||
                  'Please enter required information.'
                }
                placeholderTextColor={UI.text3}
                style={[
                  styles.inputField,
                  extraInputRule.multiline && styles.inputFieldMultiline,
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={extraInputRule.keyboardType === 'url' ? 'url' : 'default'}
                multiline={extraInputRule.multiline}
              />

              {showOptionalPubgName && (
                <View style={styles.optionalBlock}>
                  <Text style={styles.optionalLabel}>
                    {i18n.t(extraInputRule.optionalNameKey) || 'Enter name your PUBG account (optional)'}
                  </Text>

                  <TextInput
                    value={optionalAccountName}
                    onChangeText={setOptionalAccountName}
                    placeholder={
                      i18n.t(extraInputRule.optionalNamePlaceholderKey) ||
                      'Enter your PUBG account name (optional)'
                    }
                    placeholderTextColor={UI.text3}
                    style={styles.inputField}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              )}
            </View>
          )}

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{i18n.t('buyCard.yourBalance') || 'Your Balance'}</Text>
            <Text style={styles.balanceAmount}>{formatIQDLocal(walletQuery.data?.balance || 0)}</Text>
          </View>

          {!!walletQuery.data && !hasEnoughBalance && (
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
              (purchaseMutation.isPending || !hasEnoughBalance || priceIqd <= 0) && styles.disabledButton,
            ]}
            onPress={handlePurchase}
            disabled={purchaseMutation.isPending || !hasEnoughBalance || priceIqd <= 0}
            activeOpacity={0.9}
          >
            {purchaseMutation.isPending ? (
              <ActivityIndicator color={UI.white} />
            ) : (
              <>
                <Ionicons name="cart-outline" size={18} color={UI.white} />
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    backgroundColor: UI.headerBg,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },

  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: 16,
    paddingBottom: 18,
  },

  topCard: {
    backgroundColor: UI.blueSoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.border2,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  topGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59,130,246,0.10)',
    left: -40,
    bottom: -80,
  },
  topGlowTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(37,99,235,0.08)',
    right: -20,
    top: -25,
  },
  topCardMini: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.blueDark,
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
    ...SHADOWS.soft,
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
    borderColor: UI.border,
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
  cardSubAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardPriceIqd: {
    fontSize: 28,
    fontWeight: '900',
    color: UI.blueDark,
  },

  infoCard: {
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.soft,
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
    color: UI.textSoft,
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
  },

  inputCard: {
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  inputTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 6,
  },
  inputSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: UI.textSoft,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputField: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 14,
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
  },
  inputFieldMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  optionalBlock: {
    marginTop: 12,
  },
  optionalLabel: {
    fontSize: 13,
    lineHeight: 20,
    color: UI.textSoft,
    fontWeight: '700',
    marginBottom: 8,
  },

  balanceCard: {
    backgroundColor: UI.softGold,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border2,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: 8,
    color: UI.blueDark,
    fontWeight: '800',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: UI.text,
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
    backgroundColor: UI.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.blueDark,
    ...SHADOWS.card,
  },
  primaryButtonText: {
    color: UI.white,
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
    ...SHADOWS.soft,
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
  },
});
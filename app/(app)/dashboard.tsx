import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  I18nManager,
} from 'react-native';
import { Asset } from 'expo-asset';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

const PHONE_IPHONE = require('@/assets/images/iphone17-promax-orange.png');
const PHONE_SAMSUNG = require('@/assets/images/samsung-s25-ultra.png');

const UI = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#47B08A',
  greenSoft: '#EAF7F1',
  blueBanner: '#1E66D0',
  iconGray: '#6B7280',

  adBg: '#FFF8DB',
  adBorder: '#F3D768',
  adGold: '#F4C400',
  adDark: '#1F2937',
  adGreen: '#2E8B57',
  adGreenDark: '#1F6A43',
  adOlive: '#95A320',
  adRed: '#EF4444',
};

const __avatarVersionByUser: Record<string, number> = {};

const getCurrentLocale = () => {
  const raw =
    String((i18n as any)?.locale || (i18n as any)?.languageTag || (i18n as any)?.language || '')
      .trim()
      .toLowerCase();

  if (raw.includes('ckb') || raw.includes('sorani')) return 'ckb';
  if (raw.includes('kmr') || raw.includes('kurmanji') || raw === 'ku') return 'kmr';
  if (raw.startsWith('ar')) return 'ar';
  if (raw.startsWith('en')) return 'en';

  // fallback when app returns custom short codes or mixed names
  if (raw.includes('badini')) return 'kmr';
  if (raw.includes('kurdish')) return 'ckb';

  return 'ckb';
};

const getAdCopy = (locale: 'ckb' | 'kmr' | 'ar' | 'en') => {
  switch (locale) {
    case 'kmr':
      return {
        badge: 'Planê firotanê bi qestan heye!',
        title: 'Mobilek nû bi bihayekî gelek baş bikire',
        cash: 'Nexd',
        installment: 'Qist',
        line1: 'Mobileya xwe bi nexd an bi awayê qestan bistîne.',
        line2: 'Qistên mehane yên guncaw ji bo piraniya mobileyan hene.',
        price: 'Qist ji 50,000 dînar dest pê dike',
        button: 'Niha bikire',
        discount: 'Daxistin',
      };

    case 'ar':
      return {
        badge: 'خطة شراء بالتقسيط متوفرة!',
        title: 'اشترِ هاتفاً جديداً بسعر ممتاز جداً',
        cash: 'نقداً',
        installment: 'تقسيط',
        line1: 'احصل على هاتفك نقداً أو بنظام التقسيط بسهولة.',
        line2: 'أقساط شهرية مناسبة متوفرة لمعظم الهواتف.',
        price: 'القسط يبدأ من 50,000 دينار',
        button: 'اشترِ الآن',
        discount: 'خصم',
      };

    case 'en':
      return {
        badge: 'Installment plan available!',
        title: 'Buy a new phone at a very good price',
        cash: 'Cash',
        installment: 'Installment',
        line1: 'Get your phone with cash or through an easy installment plan.',
        line2: 'Flexible monthly installments are available for most phones.',
        price: 'Installment starts from 50,000 IQD',
        button: 'Buy Now',
        discount: 'Discount',
      };

    case 'ckb':
    default:
      return {
        badge: 'پلانی شیوەی قست هەیە!',
        title: 'مۆبایلێکی نوێ بکڕە بە نرخێکی زۆر باش',
        cash: 'نەقد',
        installment: 'قست',
        line1: 'مۆبایلەکەت بە نەقد یان بە شێوازی قست وەربگرە.',
        line2: 'قستی مانگانەی گونجاو بۆ زۆربەی مۆبایلەکان بەردەستن.',
        price: 'قست لە 50,000 دینارەوە دەست پێ دەکات',
        button: 'ئێستا بکڕە',
        discount: 'داشکاندن',
      };
  }
};

const ActionCircle = ({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.quickIconCircle}>
      <Ionicons name={icon} size={22} color={UI.green} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

const NavItem = ({
  icon,
  label,
  active,
  onPress,
}: {
  icon: any;
  label: string;
  active?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.85}>
    <Ionicons name={icon} size={22} color={active ? UI.green : '#9CA3AF'} />
    <Text style={[styles.navText, active && { color: UI.green }]}>{label}</Text>
  </TouchableOpacity>
);

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile, hardRefresh } = useAuth();
  const { theme } = useTheme();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const [iphoneSource, setIphoneSource] = useState<any>(PHONE_IPHONE);
  const [samsungSource, setSamsungSource] = useState<any>(PHONE_SAMSUNG);
  const [adAssetsReady, setAdAssetsReady] = useState(false);

  const locale = getCurrentLocale();
  const isRTL = locale === 'ckb' || locale === 'kmr' || locale === 'ar' || I18nManager.isRTL;

  const adCopy = useMemo(() => getAdCopy(locale), [locale]);

  useEffect(() => {
    let mounted = true;

    const preloadAssets = async () => {
      try {
        const [iphoneAsset, samsungAsset] = await Promise.all([
          Asset.fromModule(PHONE_IPHONE).downloadAsync(),
          Asset.fromModule(PHONE_SAMSUNG).downloadAsync(),
        ]);

        if (!mounted) return;

        setIphoneSource(
          iphoneAsset.localUri
            ? { uri: iphoneAsset.localUri, cache: 'force-cache' as any }
            : PHONE_IPHONE
        );

        setSamsungSource(
          samsungAsset.localUri
            ? { uri: samsungAsset.localUri, cache: 'force-cache' as any }
            : PHONE_SAMSUNG
        );
      } catch (e) {
        console.log('Asset preload warning:', e);
      } finally {
        if (mounted) setAdAssetsReady(true);
      }
    };

    preloadAssets();

    return () => {
      mounted = false;
    };
  }, []);

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not found');

      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Wallet fetch error:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (!data) {
        const { data: newWallet, error: insertError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            balance: 0,
            currency: 'USD',
            is_locked: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Wallet create error:', insertError);
          throw insertError;
        }

        return newWallet as Wallet;
      }

      return data as Wallet;
    },
    enabled: !!user?.id && !!profile,
    staleTime: 0,
    gcTime: 0,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await hardRefresh();
      await walletQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [hardRefresh, walletQuery]);

  const avatarUrl = (profile as any)?.avatar_url as string | undefined;
  const fullName = (profile as any)?.full_name as string | undefined;

  useEffect(() => {
    if (!user?.id || !avatarUrl) return;

    const currentV = __avatarVersionByUser[user.id];
    if (!currentV) {
      __avatarVersionByUser[user.id] = 1;
    }
  }, [avatarUrl, user?.id]);

  const avatarPreview = useMemo(() => {
    if (!avatarUrl || !user?.id) return null;

    const key = user.id;
    const holder = __avatarVersionByUser as any;

    if (!holder.__lastUrl) holder.__lastUrl = {};
    if (!holder.__ver) holder.__ver = {};

    const lastUrl: Record<string, string> = holder.__lastUrl;
    const ver: Record<string, number> = holder.__ver;

    if (!ver[key]) ver[key] = 1;

    if (lastUrl[key] && lastUrl[key] !== avatarUrl) {
      ver[key] = Date.now();
    }

    lastUrl[key] = avatarUrl;

    const v = ver[key];
    return `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${v}`;
  }, [avatarUrl, user?.id]);

  const balanceText = walletQuery.data?.balance?.toFixed(2) || '0.00';
  const currencyText = walletQuery.data?.currency || 'USD';

  if (!profile) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: UI.bg, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={UI.green} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: UI.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={UI.green}
            colors={[UI.green]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profileChip}
            activeOpacity={0.85}
            onPress={() => router.push('/(app)/profile' as any)}
          >
            {avatarPreview ? (
              <Image
                source={{ uri: avatarPreview, cache: 'force-cache' as any }}
                style={styles.profileAvatar}
              />
            ) : (
              <View style={styles.profileAvatarFallback}>
                <Ionicons name="person" size={20} color={UI.green} />
              </View>
            )}

            <Text style={styles.profileName} numberOfLines={1}>
              {fullName || ''}
            </Text>
          </TouchableOpacity>

          <View style={styles.headerRight} />
        </View>

        {/* Balance green card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceTitle}>{i18n.t('accountBalance')}</Text>

            <View style={styles.balanceRightRow}>
              <View style={styles.dollarCircle}>
                <Ionicons name="logo-usd" size={18} color="#FFFFFF" />
              </View>

              <TouchableOpacity
                onPress={() => setIsBalanceHidden(!isBalanceHidden)}
                style={styles.eyeBtn}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isBalanceHidden ? 'eye-off' : 'eye'}
                  size={22}
                  color="rgba(255,255,255,0.95)"
                />
              </TouchableOpacity>
            </View>
          </View>

          {walletQuery.isLoading ? (
            <View style={{ paddingTop: 10 }}>
              <ActivityIndicator color="#ffffff" />
            </View>
          ) : walletQuery.isError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={32} color="#FFFFFF" />
              <Text style={styles.errorTextLight}>{i18n.t('failedToLoadBalance')}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => walletQuery.refetch()}
                activeOpacity={0.85}
              >
                <Text style={styles.retryText}>{i18n.t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.balanceValueRow}>
              <Text style={styles.balanceValue}>{isBalanceHidden ? '•••••••' : balanceText}</Text>
              <Text style={styles.balanceCurrency}> {currencyText}</Text>
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <ActionCircle
            icon="send"
            label={i18n.t('send')}
            onPress={() => router.push('/(app)/send' as any)}
          />
          <ActionCircle
            icon="cash"
            label={i18n.t('withdraw')}
            onPress={() => router.push('/(app)/withdraw' as any)}
          />
          <ActionCircle
            icon="download"
            label={i18n.t('deposit')}
            onPress={() => router.push('/(app)/receive' as any)}
          />
          <ActionCircle
            icon="receipt"
            label={i18n.t('transactions')}
            onPress={() => router.push('/(app)/transactions' as any)}
          />
        </View>

        {/* Mobile Shop Ad */}
        <TouchableOpacity
          style={styles.mobileAd}
          activeOpacity={0.92}
          onPress={() => router.push('/(app)/mobile-shop' as any)}
        >
          <View style={styles.mobileAdTopBadge}>
            <Text style={styles.mobileAdTopBadgeText} numberOfLines={1}>
              {adCopy.badge}
            </Text>
          </View>

          <View style={[styles.mobileAdMain, isRTL && styles.mobileAdMainRTL]}>
            {/* Left side */}
            <View style={[styles.mobileAdLeft, isRTL && styles.mobileAdLeftRTL]}>
              <Text
                style={[styles.mobileAdTitle, isRTL && styles.textRTL]}
                numberOfLines={3}
              >
                {adCopy.title}
              </Text>

              <View style={[styles.mobileAdPillsWrap, isRTL && styles.mobileAdPillsWrapRTL]}>
                <View style={styles.mobileAdPillGreen}>
                  <Ionicons name="cash-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.mobileAdPillGreenText} numberOfLines={1}>
                    {adCopy.cash}
                  </Text>
                </View>

                <View style={styles.mobileAdPillOlive}>
                  <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.mobileAdPillOliveText} numberOfLines={1}>
                    {adCopy.installment}
                  </Text>
                </View>
              </View>

              <Text style={[styles.mobileAdLine, isRTL && styles.textRTL]} numberOfLines={2}>
                {adCopy.line1}
              </Text>

              <Text style={[styles.mobileAdLine, isRTL && styles.textRTL]} numberOfLines={2}>
                {adCopy.line2}
              </Text>

              <View
                style={[
                  styles.mobileAdPriceBox,
                  isRTL ? styles.mobileAdPriceBoxRTL : styles.mobileAdPriceBoxLTR,
                ]}
              >
                <Text
                  style={[
                    styles.mobileAdPriceText,
                    isRTL ? styles.mobileAdPriceTextRTL : styles.mobileAdPriceTextLTR,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {adCopy.price}
                </Text>
              </View>
            </View>

            {/* Right side */}
            <View style={styles.mobileAdRight}>
              <View style={styles.phonesStage}>
                <View style={styles.phoneSamsungWrap}>
                  <Image
                    source={samsungSource}
                    defaultSource={PHONE_SAMSUNG}
                    style={styles.phoneSamsungImage}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                </View>

                <View style={styles.phoneIphoneWrap}>
                  <Image
                    source={iphoneSource}
                    defaultSource={PHONE_IPHONE}
                    style={styles.phoneIphoneImage}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                </View>

                <View style={styles.discountTag}>
                  <Text style={styles.discountTagTop}>-10%</Text>
                  <Text style={styles.discountTagBottom}>{adCopy.discount}</Text>
                </View>
              </View>

              <View style={styles.mobileAdButton}>
                <Text style={styles.mobileAdButtonText} numberOfLines={1}>
                  {adCopy.button}
                </Text>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Market Shop section */}
        <View style={styles.marketLightCard}>
          <View style={styles.marketHeader}>
            <Text style={styles.marketTitle}>{i18n.t('marketShop')}</Text>
            <Text style={styles.marketSub}>{i18n.t('marketShopSubtitle')}</Text>
          </View>

          <View style={styles.marketMiniGrid}>
            <TouchableOpacity
              style={styles.marketMiniItem}
              onPress={() => router.push('/(app)/sim-cards' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.marketMiniIcon}>
                <Ionicons name="card" size={22} color={UI.green} />
              </View>
              <Text style={styles.marketMiniLabel}>{i18n.t('market.topup')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.marketMiniItem}
              onPress={() => router.push('/(app)/gift-cards' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.marketMiniIcon}>
                <Ionicons name="gift" size={22} color={UI.green} />
              </View>
              <Text style={styles.marketMiniLabel}>{i18n.t('market.gift')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.marketMiniItem}
              onPress={() => router.push('/(app)/mobile-shop' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.marketMiniIcon}>
                <Ionicons name="phone-portrait" size={22} color={UI.green} />
              </View>
              <Text style={styles.marketMiniLabel}>{i18n.t('market.mobile')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.marketMiniItem}
              onPress={() => router.push('/(app)/travel-booking' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.marketMiniIcon}>
                <Ionicons name="airplane" size={22} color={UI.green} />
              </View>
              <Text style={styles.marketMiniLabel}>{i18n.t('market.travel')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, { borderColor: UI.border, backgroundColor: UI.card }]}>
        <NavItem icon="home" label={i18n.t('home')} active onPress={() => {}} />
        <NavItem
          icon="card"
          label={i18n.t('Cards')}
          onPress={() => router.push('/(app)/Cards' as any)}
        />
        <NavItem
          icon="chatbox"
          label={i18n.t('consulateInfo')}
          onPress={() => router.push('/(app)/consulate' as any)}
        />
        <NavItem
          icon="settings"
          label={i18n.t('settings')}
          onPress={() => router.push('/(app)/settings' as any)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '65%',
  },
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
  },
  profileAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: UI.greenSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
  },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  balanceCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 18,
    padding: 16,
    backgroundColor: UI.green,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '800' },
  balanceRightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  dollarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  balanceValue: { fontSize: 44, fontWeight: '900', color: '#fff' },
  balanceCurrency: {
    fontSize: 17,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    paddingBottom: 8,
  },

  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
  },
  quickItem: { alignItems: 'center', width: '23%' },
  quickIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: UI.text,
    textAlign: 'center',
  },

  mobileAd: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: UI.adBg,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: UI.adBorder,
    overflow: 'hidden',
  },
  mobileAdTopBadge: {
    alignSelf: 'flex-start',
    backgroundColor: UI.adGold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
    maxWidth: '82%',
  },
  mobileAdTopBadgeText: {
    color: UI.adDark,
    fontSize: 13,
    fontWeight: '900',
  },

  mobileAdMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  mobileAdMainRTL: {
    flexDirection: 'row-reverse',
  },

  mobileAdLeft: {
    flex: 1,
    paddingRight: 2,
  },
  mobileAdLeftRTL: {
    paddingRight: 0,
    paddingLeft: 2,
  },

  mobileAdRight: {
    width: 146,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  mobileAdTitle: {
    color: UI.adDark,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  textRTL: {
    textAlign: 'right',
  },

  mobileAdPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
    marginBottom: 8,
  },
  mobileAdPillsWrapRTL: {
    justifyContent: 'flex-start',
  },

  mobileAdPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: UI.adGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 82,
  },
  mobileAdPillGreenText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },

  mobileAdPillOlive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: UI.adOlive,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 104,
  },
  mobileAdPillOliveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },

  mobileAdLine: {
    color: '#374151',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 2,
  },

  mobileAdPriceBox: {
    marginTop: 11,
    minHeight: 48,
    backgroundColor: UI.adGreenDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    justifyContent: 'center',
  },
  mobileAdPriceBoxLTR: {
    width: 230,
    alignSelf: 'flex-start',
  },
  mobileAdPriceBoxRTL: {
    width: 248,
    alignSelf: 'flex-end',
    marginRight: 2,
  },
  mobileAdPriceText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  mobileAdPriceTextLTR: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  mobileAdPriceTextRTL: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },

  phonesStage: {
    width: 154,
    height: 178,
    position: 'relative',
    marginTop: -8,
    marginBottom: 8,
  },

  phoneSamsungWrap: {
    position: 'absolute',
    right: 10,
    top: 2,
    width: 98,
    height: 152,
    zIndex: 1,
  },
  phoneSamsungImage: {
    width: '100%',
    height: '100%',
  },

  phoneIphoneWrap: {
    position: 'absolute',
    left: -4,
    top: 14,
    width: 100,
    height: 156,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 2,
  },
  phoneIphoneImage: {
    width: '100%',
    height: '100%',
  },

  discountTag: {
    position: 'absolute',
    right: 0,
    bottom: 12,
    backgroundColor: UI.adRed,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    transform: [{ rotate: '-8deg' }],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 3,
    minWidth: 56,
  },
  discountTagTop: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  discountTagBottom: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 1,
  },

  mobileAdButton: {
    width: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: UI.adGreen,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  mobileAdButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  marketLightCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: UI.card,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  marketHeader: { marginBottom: 12 },
  marketTitle: { fontSize: 19, fontWeight: '900', color: UI.text },
  marketSub: {
    marginTop: 6,
    color: UI.text2,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },

  marketMiniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  marketMiniItem: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  marketMiniIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketMiniLabel: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },

  errorContainer: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  errorTextLight: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  retryText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navItem: { alignItems: 'center' },
  navText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
});

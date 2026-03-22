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
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { formatIQD } from '@/lib/format';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

const PHONE_IPHONE = require('@/assets/images/iphone17-promax-orange.png');
const PHONE_SAMSUNG = require('@/assets/images/samsung-s25-ultra.png');

const UI = {
  bg: '#EEF4FF',
  bgSoft: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',

  blue: '#2563EB',
  blue2: '#3B82F6',
  blue3: '#60A5FA',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  iconGray: '#64748B',
  white: '#FFFFFF',
  black: '#0F172A',
  orange: '#F97316',
  orangeSoft: '#FFF1E8',
  success: '#23864A',
  successSoft: '#EAF8EF',
  yellowSoft: '#FFF8DA',
  yellowBorder: '#F4D98B',
  purpleSoft: '#F4F3FF',
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
    shadowColor: '#8BA9D6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

const __avatarVersionByUser: Record<string, number> = {};

const getCurrentLocale = () => {
  const raw = String(
    (i18n as any)?.locale || (i18n as any)?.languageTag || (i18n as any)?.language || ''
  )
    .trim()
    .toLowerCase();

  if (raw.includes('ckb') || raw.includes('sorani')) return 'ckb';
  if (raw.includes('kmr') || raw.includes('badini') || raw === 'ku') return 'kmr';
  if (raw.startsWith('ar')) return 'ar';
  if (raw.startsWith('en')) return 'en';

  return 'ckb';
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
  <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.88}>
    <View style={styles.quickIconCircle}>
      <Ionicons name={icon} size={22} color={UI.blueDark} />
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
    <Ionicons name={icon} size={22} color={active ? UI.blue : '#9CA3AF'} />
    <Text style={[styles.navText, active && { color: UI.blue }]}>{label}</Text>
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
  const isRTL =
    locale === 'ckb' || locale === 'kmr' || locale === 'ar' || I18nManager.isRTL;

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
            currency: 'IQD',
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

  const balanceText = formatIQD(walletQuery.data?.balance);
  const currencyText = walletQuery.data?.currency || 'IQD';

  if (!profile) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: UI.bg, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={UI.blue} />
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
            tintColor={UI.blue}
            colors={[UI.blue]}
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
                <Ionicons name="person" size={20} color={UI.blue} />
              </View>
            )}

            <Text style={styles.profileName} numberOfLines={1}>
              {fullName || ''}
            </Text>
          </TouchableOpacity>

          <View style={styles.headerRight} />
        </View>

        {/* Balance Card */}
        <LinearGradient
          colors={['#5DA8FF', '#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceGlowOne} />
          <View style={styles.balanceGlowTwo} />

          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceTitle}>{i18n.t('accountBalance')}</Text>

            <View style={styles.balanceRightRow}>
              <TouchableOpacity
                onPress={() => setIsBalanceHidden(!isBalanceHidden)}
                style={styles.eyeBtn}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isBalanceHidden ? 'eye-off' : 'eye'}
                  size={22}
                  color="rgba(255,255,255,0.96)"
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
        </LinearGradient>

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
          <View style={styles.mobileAdGlass} />
          <View style={[styles.mobileAdTopBadge, isRTL && styles.mobileAdTopBadgeRTL]}>
            <Text
              style={[styles.mobileAdTopBadgeText, isRTL && styles.textRTL]}
              numberOfLines={1}
            >
              {i18n.t('mobileShopAdBadge')}
            </Text>
          </View>

          <View style={[styles.mobileAdMain, isRTL && styles.mobileAdMainRTL]}>
            {/* Image side */}
            <View style={styles.mobileAdImageSide}>
              <View style={styles.phonesStage}>
                {adAssetsReady && (
                  <>
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
                  </>
                )}

                <View style={[styles.discountTag, isRTL && styles.discountTagRTL]}>
                  <Text style={styles.discountTagTop}>-10%</Text>
                  <Text style={styles.discountTagBottom} numberOfLines={1}>
                    {i18n.t('mobileShopAdDiscount')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Text side */}
            <View style={[styles.mobileAdTextSide, isRTL && styles.mobileAdTextSideRTL]}>
              <Text
                style={[styles.mobileAdTitle, isRTL && styles.textRTL]}
                numberOfLines={3}
              >
                {i18n.t('mobileShopAdTitle')}
              </Text>

              <View style={[styles.mobileAdPillsWrap, isRTL && styles.mobileAdPillsWrapRTL]}>
                <View style={styles.mobileAdPillBlue}>
                  <Ionicons name="cash-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.mobileAdPillBlueText} numberOfLines={1}>
                    {i18n.t('mobileShopAdCash')}
                  </Text>
                </View>

                <View style={styles.mobileAdPillSoft}>
                  <Ionicons name="calendar-outline" size={12} color={UI.blueDark} />
                  <Text style={styles.mobileAdPillSoftText} numberOfLines={1}>
                    {i18n.t('mobileShopAdInstallment')}
                  </Text>
                </View>
              </View>

              <Text style={[styles.mobileAdLine, isRTL && styles.textRTL]} numberOfLines={2}>
                {i18n.t('mobileShopAdLine1')}
              </Text>

              <Text style={[styles.mobileAdLine, isRTL && styles.textRTL]} numberOfLines={2}>
                {i18n.t('mobileShopAdLine2')}
              </Text>
            </View>
          </View>

          {/* Bottom CTA row */}
          <View style={[styles.mobileAdBottomRow, isRTL && styles.mobileAdBottomRowRTL]}>
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
                minimumFontScale={0.76}
              >
                {i18n.t('mobileShopAdInstallmentPrice')}
              </Text>
            </View>

            <LinearGradient
              colors={['#79B7FF', '#4C92F7', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mobileAdButton}
            >
              <Text style={styles.mobileAdButtonText} numberOfLines={1}>
                {i18n.t('mobileShopAdButton')}
              </Text>
              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={16}
                color="#FFFFFF"
              />
            </LinearGradient>
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
                <Ionicons name="card" size={22} color={UI.blueDark} />
              </View>
              <Text style={styles.marketMiniLabel}>{i18n.t('market.topup')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.marketMiniItem}
              onPress={() => router.push('/(app)/gift-cards' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.marketMiniIcon}>
                <Ionicons name="gift" size={22} color={UI.blueDark} />
              </View>
              <Text style={styles.marketMiniLabel}>{i18n.t('market.gift')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.marketMiniItem}
              onPress={() => router.push('/(app)/mobile-shop' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.marketMiniIcon}>
                <Ionicons name="phone-portrait" size={22} color={UI.blueDark} />
              </View>
              <Text style={styles.marketMiniLabel}>{i18n.t('market.mobile')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.marketMiniItem}
              onPress={() => router.push('/(app)/travel-booking' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.marketMiniIcon}>
                <Ionicons name="airplane" size={22} color={UI.blueDark} />
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
          onPress={() => router.push('/Cards' as any)}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    ...SHADOWS.soft,
  },
  profileAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
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
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  balanceGlowOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.16)',
    left: -70,
    bottom: -90,
  },
  balanceGlowTwo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
    right: -30,
    top: -40,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '800' },
  balanceRightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  balanceValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
  balanceValue: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  balanceCurrency: {
    fontSize: 17,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    paddingBottom: 8,
  },

  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 18,
  },
  quickItem: { alignItems: 'center', width: '23%' },
  quickIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
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
    marginTop: 18,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  mobileAdGlass: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(220,235,255,0.35)',
  },
  mobileAdTopBadge: {
    alignSelf: 'flex-start',
    backgroundColor: UI.yellowSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
    maxWidth: '82%',
    borderWidth: 1,
    borderColor: UI.yellowBorder,
  },
  mobileAdTopBadgeRTL: {
    alignSelf: 'flex-end',
  },
  mobileAdTopBadgeText: {
    color: '#8A6A18',
    fontSize: 13,
    fontWeight: '900',
  },

  mobileAdMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mobileAdMainRTL: {
    flexDirection: 'row-reverse',
  },

  mobileAdImageSide: {
    width: 126,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  mobileAdTextSide: {
    flex: 1,
    paddingLeft: 10,
  },
  mobileAdTextSideRTL: {
    paddingLeft: 0,
    paddingRight: 10,
  },

  mobileAdTitle: {
    color: UI.text,
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
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },

  mobileAdPillBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: UI.blue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 82,
  },
  mobileAdPillBlueText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },

  mobileAdPillSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: UI.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 104,
    borderWidth: 1,
    borderColor: UI.border,
  },
  mobileAdPillSoftText: {
    color: UI.blueDark,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },

  mobileAdLine: {
    color: UI.text2,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 2,
  },

  phonesStage: {
    width: 120,
    height: 170,
    position: 'relative',
    marginTop: 2,
    marginBottom: 4,
  },

  phoneSamsungWrap: {
    position: 'absolute',
    right: 4,
    top: 0,
    width: 78,
    height: 140,
    zIndex: 1,
  },
  phoneSamsungImage: {
    width: '100%',
    height: '100%',
  },

  phoneIphoneWrap: {
    position: 'absolute',
    left: 0,
    top: 18,
    width: 76,
    height: 138,
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
    bottom: 8,
    backgroundColor: UI.orange,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    transform: [{ rotate: '-8deg' }],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 3,
    minWidth: 56,
  },
  discountTagRTL: {
    right: 4,
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

  mobileAdBottomRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileAdBottomRowRTL: {
    flexDirection: 'row-reverse',
  },

  mobileAdPriceBox: {
    minHeight: 52,
    backgroundColor: '#0F1F3D',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    justifyContent: 'center',
    flex: 1,
  },
  mobileAdPriceBoxLTR: {
    alignSelf: 'stretch',
  },
  mobileAdPriceBoxRTL: {
    alignSelf: 'stretch',
  },
  mobileAdPriceText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  mobileAdPriceTextLTR: {
    fontSize: 12.5,
    lineHeight: 15,
    textAlign: 'center',
  },
  mobileAdPriceTextRTL: {
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },

  mobileAdButton: {
    minWidth: 126,
    maxWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 999,
    ...SHADOWS.soft,
  },
  mobileAdButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  marketLightCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: UI.card,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
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
    borderRadius: 18,
    padding: 14,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOWS.soft,
  },
  marketMiniIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: UI.blueSoft,
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
import React, { useCallback, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Wallet } from '@/lib/types';

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

/**
 * ✅ Avatar stable cache-busting (ONLY when avatar_url changes)
 * - Prevents reload on refresh / navigation
 * - Updates only when user changes the profile photo and profile.avatar_url changes
 */
const __avatarVersionByUser: Record<string, number> = {};

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
  const { theme } = useTheme(); // keep your theme (not breaking)
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = React.useState(false);

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
      // ✅ you still refresh profile/balance when user pulls to refresh
      await hardRefresh();
      await walletQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardRefresh, walletQuery.refetch]);

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

  const balanceText = walletQuery.data?.balance?.toFixed(2) || '0.00';
  const currencyText = walletQuery.data?.currency || 'USD';

  const avatarUrl = (profile as any)?.avatar_url as string | undefined;
  const fullName = (profile as any)?.full_name as string | undefined;

  /**
   * ✅ Avatar preview that does NOT change when you come back to dashboard.
   * It changes only if avatarUrl changes (meaning user updated their photo).
   */
  useEffect(() => {
    if (!user?.id) return;
    if (!avatarUrl) return;

    // create version only once, then only change when avatarUrl changes
    const currentV = __avatarVersionByUser[user.id];
    if (!currentV) {
      __avatarVersionByUser[user.id] = 1; // stable first version
      return;
    }

    // If avatarUrl string changes => user changed photo => update version
    // We store lastUrl on the version object using another map:
  }, [avatarUrl, user?.id]);

  const avatarPreview = useMemo(() => {
    if (!avatarUrl || !user?.id) return null;

    // store last url and version in module scope (stable across screen unmount/mount)
    const key = user.id;
    const holder = (__avatarVersionByUser as any);

    if (!holder.__lastUrl) holder.__lastUrl = {};
    if (!holder.__ver) holder.__ver = {};

    const lastUrl: Record<string, string> = holder.__lastUrl;
    const ver: Record<string, number> = holder.__ver;

    if (!ver[key]) ver[key] = 1;

    if (lastUrl[key] && lastUrl[key] !== avatarUrl) {
      // ✅ only when url changed (profile photo updated)
      ver[key] = Date.now();
    }

    lastUrl[key] = avatarUrl;

    const v = ver[key];
    return `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${v}`;
  }, [avatarUrl, user?.id]);

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
          {/* LEFT: Profile photo + full name */}
          <TouchableOpacity
            style={styles.profileChip}
            activeOpacity={0.85}
            onPress={() => router.push('/(app)/profile' as any)}
          >
            {avatarPreview ? (
              <Image
                source={{ uri: avatarPreview }}
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

          {/* RIGHT */}
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

        {/* 4 round action buttons row */}
        <View style={styles.quickRow}>
          <ActionCircle icon="send" label={i18n.t('send')} onPress={() => router.push('/(app)/send' as any)} />
          <ActionCircle icon="cash" label={i18n.t('withdraw')} onPress={() => router.push('/(app)/withdraw' as any)} />
          <ActionCircle icon="download" label={i18n.t('deposit')} onPress={() => router.push('/(app)/receive' as any)} />
          <ActionCircle icon="receipt" label={i18n.t('transactions')} onPress={() => router.push('/(app)/transactions' as any)} />
        </View>

        {/* Mobile Shop Ad Banner */}
        <TouchableOpacity
          style={styles.mobileAd}
          activeOpacity={0.92}
          onPress={() => router.push('/(app)/mobile-shop' as any)}
        >
          <View style={styles.mobileAdTopBadge}>
            <Text style={styles.mobileAdTopBadgeText}>{i18n.t('mobileShopAdBadge')}</Text>
          </View>

          <View style={styles.mobileAdRow}>
            <View style={styles.mobileAdLeft}>
              <Text style={styles.mobileAdTitle}>{i18n.t('mobileShopAdTitle')}</Text>

              <View style={styles.mobileAdPillsWrap}>
                <View style={styles.mobileAdPillGreen}>
                  <Ionicons name="cash-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.mobileAdPillGreenText}>{i18n.t('mobileShopAdCash')}</Text>
                </View>

                <View style={styles.mobileAdPillOlive}>
                  <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.mobileAdPillOliveText}>{i18n.t('mobileShopAdInstallment')}</Text>
                </View>
              </View>

              <Text style={styles.mobileAdLine}>{i18n.t('mobileShopAdLine1')}</Text>
              <Text style={styles.mobileAdLine}>{i18n.t('mobileShopAdLine2')}</Text>

              <View style={styles.mobileAdPriceBox}>
                <Text style={styles.mobileAdPriceText}>{i18n.t('mobileShopAdInstallmentPrice')}</Text>
              </View>

              <View style={styles.mobileAdButton}>
                <Text style={styles.mobileAdButtonText}>{i18n.t('mobileShopAdButton')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.mobileAdRight}>
              <Image
                source={require('@/assets/images/samsung-s25-ultra.png')}
                style={styles.phoneSamsungImage}
                resizeMode="contain"
              />

              <Image
                source={require('@/assets/images/iphone17-promax-orange.png')}
                style={styles.phoneIphoneImage}
                resizeMode="contain"
              />

              <View style={styles.discountTag}>
                <Text style={styles.discountTagTop}>-10%</Text>
                <Text style={styles.discountTagBottom}>{i18n.t('mobileShopAdDiscount')}</Text>
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
        <NavItem icon="card" label={i18n.t('Cards')} onPress={() => router.push('/(app)/Cards' as any)} />
        <NavItem icon="chatbox" label={i18n.t('consulateInfo')} onPress={() => router.push('/(app)/consulate' as any)} />
        <NavItem icon="settings" label={i18n.t('settings')} onPress={() => router.push('/(app)/settings' as any)} />
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
  quickLabel: { marginTop: 8, fontSize: 13, fontWeight: '800', color: UI.text, textAlign: 'center' },

  mobileAd: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: UI.adBg,
    borderRadius: 20,
    padding: 14,
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
    marginBottom: 12,
  },
  mobileAdTopBadgeText: {
    color: UI.adDark,
    fontSize: 14,
    fontWeight: '900',
  },
  mobileAdRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  mobileAdLeft: {
    flex: 1.15,
    justifyContent: 'space-between',
    paddingRight: 2,
  },
  mobileAdRight: {
    width: 132,
    minHeight: 240,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileAdTitle: {
    color: UI.adDark,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  mobileAdPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  mobileAdPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.adGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mobileAdPillGreenText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  mobileAdPillOlive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.adOlive,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mobileAdPillOliveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  mobileAdLine: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  mobileAdPriceBox: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: UI.adGreenDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  mobileAdPriceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  mobileAdButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.adGreen,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
  },
  mobileAdButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  phoneSamsungImage: {
    position: 'absolute',
    right: -4,
    top: 4,
    width: 102,
    height: 198,
  },
  phoneIphoneImage: {
    position: 'absolute',
    left: -2,
    top: 18,
    width: 86,
    height: 182,
  },

  discountTag: {
    position: 'absolute',
    right: 2,
    top: 132,
    backgroundColor: UI.adRed,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    transform: [{ rotate: '-8deg' }],
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  discountTagTop: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  discountTagBottom: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 1,
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
  marketSub: { marginTop: 6, color: UI.text2, fontSize: 14, fontWeight: '700', lineHeight: 19 },

  marketMiniGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
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
  marketMiniLabel: { color: UI.text, fontSize: 14, fontWeight: '800', flex: 1 },

  errorContainer: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  errorTextLight: { color: '#fff', textAlign: 'center', fontWeight: '800', fontSize: 14 },
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
  navText: { color: '#9CA3AF', fontSize: 13, fontWeight: '800', marginTop: 4 },
});

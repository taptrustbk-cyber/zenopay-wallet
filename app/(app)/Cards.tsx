import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/lib/i18n';

const UI = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#47B08A',
  greenSoft: '#EAF7F1',
  danger: '#DC2626',
};

type WalletRow = {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_locked: boolean;
};

type CardRow = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  address: string;

  brand: string;
  last4: string;
  pan_masked: string;
  exp_month: number;
  exp_year: number;
  cvv_masked: string;

  price: number;
  status: string;
  created_at: string;
};

type PurchaseCardResponse = {
  ok: boolean;
  message?: string;
  card?: {
    id: string;
    last4: string;
    pan_masked: string;
    exp_month: number;
    exp_year: number;
    cvv_masked: string;
    brand: string;
  };
  new_balance?: number;
};

const CARD_PRICE = 25;

// ✅ Fix: safe translator with fallback (avoids [missing "..."] showing)
const t = (key: string, fallback: string) => {
  try {
    const v = (i18n as any)?.t?.(key);
    if (!v) return fallback;
    const s = String(v);
    if (s === key) return fallback;
    if (s.includes('[missing') && s.includes('translation')) return fallback;
    return s;
  } catch {
    return fallback;
  }
};

function onlyDigits(v: string) {
  return (v || '').replace(/[^\d]/g, '');
}

function formatCardNumber16(digits: string) {
  const d = onlyDigits(digits).slice(0, 16);
  const parts = [];
  for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
  return parts.join(' ');
}

function randomCardDigits16() {
  const arr = new Array(16).fill(0).map(() => Math.floor(Math.random() * 10));
  return arr.join('');
}

function randomCvv3() {
  return String(Math.floor(100 + Math.random() * 900));
}

function randomExp() {
  const now = new Date();
  const month = Math.floor(1 + Math.random() * 12);
  const year = now.getFullYear() + 3 + Math.floor(Math.random() * 3);
  return { month, year };
}

function formatExp(month: number, year: number) {
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

export default function CardsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [fullName, setFullName] = useState<string>((profile as any)?.full_name || '');
  const [phone, setPhone] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  const [isCreating, setIsCreating] = useState(false);

  // Preview (UI-only)
  const preview = useMemo(() => {
    const digits = randomCardDigits16();
    const exp = randomExp();
    const cvv = randomCvv3();
    return {
      cardNumber: formatCardNumber16(digits),
      exp: `${String(exp.month).padStart(2, '0')}/${String(exp.year).slice(-2)}`,
      cvv,
      name: (fullName || '').toUpperCase() || 'YOUR NAME',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName]);

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');

      const { data, error } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, is_locked')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Wallet not found');
      return data as WalletRow;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const cardsQuery = useQuery({
    queryKey: ['cards', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('cards').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CardRow[];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const balance = walletQuery.data?.balance ?? 0;
  const currency = walletQuery.data?.currency ?? 'USD';
  const canBuy = balance >= CARD_PRICE && !walletQuery.isLoading && !walletQuery.isError;

  const isFormValid = useMemo(() => {
    if (!fullName.trim()) return false;
    if (onlyDigits(phone).length < 8) return false;
    if (!country.trim()) return false;
    if (!city.trim()) return false;
    if (!address.trim()) return false;
    return true;
  }, [fullName, phone, country, city, address]);

  const createCard = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error', 'Error'), t('auth.user_not_found', 'User not found'));
      return;
    }
    if (!isFormValid) {
      Alert.alert(t('cards.missing_info_title', 'Missing info'), t('cards.missing_info_desc', 'Please fill all fields correctly.'));
      return;
    }
    if (!canBuy) {
      Alert.alert(
        t('cards.insufficient_title', 'Insufficient balance'),
        t('cards.insufficient_desc', `You need at least ${CARD_PRICE} ${currency}.`).replace(String(CARD_PRICE), String(CARD_PRICE)).replace('USD', currency)
      );
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('purchase_card', {
        p_user_id: user.id,
        p_full_name: fullName.trim(),
        p_phone: onlyDigits(phone),
        p_country: country.trim(),
        p_city: city.trim(),
        p_address: address.trim(),
        p_price: CARD_PRICE,
      });

      if (error) throw error;

      const res = data as PurchaseCardResponse;
      if (!res?.ok) {
        Alert.alert(t('common.failed', 'Failed'), res?.message || t('cards.create_failed', 'Unable to create card.'));
        return;
      }

      Alert.alert(t('common.success', 'Success'), t('cards.created_success', `Card created. ${CARD_PRICE}$ deducted from your balance.`).replace('25', String(CARD_PRICE)));
      await walletQuery.refetch();
      await cardsQuery.refetch();
    } catch (e: any) {
      console.error(e);
      Alert.alert(t('common.error', 'Error'), e?.message || t('common.something_wrong', 'Something went wrong.'));
    } finally {
      setIsCreating(false);
    }
  };

  const CardItem = ({ card }: { card: CardRow }) => {
    const exp = formatExp(card.exp_month, card.exp_year);

    return (
      <View style={styles.cardItemOuter}>
        <View style={styles.cardItemGreen}>
          <View style={styles.itemTopRow}>
            <View style={styles.logoPill}>
              <View style={styles.logoDot} />
              <Text style={styles.logoText}>{(card.brand || 'ZENOPAY').toUpperCase()}</Text>
            </View>

            <View style={[styles.statusPill, card.status !== 'active' && { opacity: 0.7 }]}>
              {/* If you want translate status: use t(`status.${card.status}`, card.status.toUpperCase()) */}
              <Text style={styles.statusText}>{(card.status || 'active').toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.itemNumber} numberOfLines={1}>
            {card.pan_masked}
          </Text>

          <View style={styles.itemBottomRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.smallLabel}>{t('cards.card_holder', 'CARD HOLDER')}</Text>
              <Text style={styles.smallValue} numberOfLines={1}>
                {(card.full_name || '').toUpperCase()}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 18 }}>
              <View>
                <Text style={styles.smallLabel}>{t('cards.exp', 'EXP')}</Text>
                <Text style={styles.smallValue}>{exp}</Text>
              </View>
              <View>
                <Text style={styles.smallLabel}>{t('cards.last4', 'LAST 4')}</Text>
                <Text style={styles.smallValue}>{card.last4}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.itemMetaRow}>
          <Ionicons name="time-outline" size={14} color={UI.text2} />
          <Text style={styles.itemMetaText}>
            {t('cards.created', 'Created')}: {new Date(card.created_at).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: UI.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={22} color={UI.text} />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('cards.title', 'Cards')}
            </Text>

            <View style={{ width: 40 }} />
          </View>

          {/* Balance + price */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.balanceLabel}>{t('cards.available_balance', 'Available Balance')}</Text>

                {walletQuery.isLoading ? (
                  <View style={{ marginTop: 8 }}>
                    <ActivityIndicator />
                  </View>
                ) : walletQuery.isError ? (
                  <Text style={[styles.balanceValue, { color: UI.danger }]} numberOfLines={1}>
                    {t('common.failed_to_load', 'Failed to load')}
                  </Text>
                ) : (
                  // ✅ Fix wrap: keep one line
                  <Text style={styles.balanceValue} numberOfLines={1} ellipsizeMode="tail">
                    {balance.toFixed(2)} <Text style={styles.balanceCurrency}>{currency}</Text>
                  </Text>
                )}
              </View>

              <View style={styles.pricePill}>
                <Ionicons name="pricetag" size={16} color={UI.green} />
                <Text style={styles.priceText} numberOfLines={1}>
                  {t('cards.create_price', 'Create')}: {CARD_PRICE}$
                </Text>
              </View>
            </View>

            {!canBuy && !walletQuery.isLoading && !walletQuery.isError ? (
              <View style={styles.warnRow}>
                <Ionicons name="alert-circle" size={18} color={UI.danger} />
                <Text style={styles.warnText}>{t('cards.insufficient_inline', 'Insufficient balance to create a card.')}</Text>
              </View>
            ) : null}
          </View>

          {/* Existing cards list */}
          <View style={styles.listWrap}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>{t('cards.your_cards', 'Your Cards')}</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => cardsQuery.refetch()} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={18} color={UI.text} />
              </TouchableOpacity>
            </View>

            {cardsQuery.isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>{t('cards.loading_cards', 'Loading cards...')}</Text>
              </View>
            ) : cardsQuery.isError ? (
              <View style={styles.loadingBox}>
                <Ionicons name="alert-circle" size={20} color={UI.danger} />
                <Text style={[styles.loadingText, { color: UI.danger }]}>{t('cards.failed_cards', 'Failed to load cards')}</Text>
              </View>
            ) : (cardsQuery.data?.length || 0) === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="card-outline" size={26} color={UI.text2} />
                <Text style={styles.emptyText}>{t('cards.empty', 'No cards yet. Create your first card below.')}</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {cardsQuery.data!.map((c) => (
                  <CardItem key={c.id} card={c} />
                ))}
              </View>
            )}
          </View>

          {/* Preview */}
          <View style={styles.previewWrap}>
            <View style={styles.previewCard}>
              <View style={styles.previewTopRow}>
                <View style={styles.logoPill}>
                  <View style={styles.logoDot} />
                  <Text style={styles.logoText}>ZENOPAY</Text>
                </View>

                <View style={styles.chip}>
                  <View style={styles.chipLine} />
                  <View style={styles.chipLine} />
                  <View style={styles.chipLine} />
                </View>
              </View>

              <Text style={styles.cardNumber} numberOfLines={1}>
                {preview.cardNumber || '0000 0000 0000 0000'}
              </Text>

              <View style={styles.previewBottomRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.smallLabel}>{t('cards.card_holder', 'CARD HOLDER')}</Text>
                  <Text style={styles.smallValue} numberOfLines={1}>
                    {preview.name}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 18 }}>
                  <View>
                    <Text style={styles.smallLabel}>{t('cards.exp', 'EXP')}</Text>
                    <Text style={styles.smallValue}>{preview.exp}</Text>
                  </View>
                  <View>
                    <Text style={styles.smallLabel}>CVV</Text>
                    <Text style={styles.smallValue}>{preview.cvv}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.previewHint}>
              {t('cards.preview_hint', 'Preview design only. Real card details are issued securely after purchase.')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('cards.create_new', 'Create New Card')}</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('cards.full_name', 'Full Name')}</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('cards.full_name_ph', 'Your full name')}
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('cards.phone', 'Phone')}</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={t('cards.phone_ph', '07xxxxxxxx')}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>{t('cards.country', 'Country')}</Text>
                <TextInput
                  value={country}
                  onChangeText={setCountry}
                  placeholder={t('cards.country_ph', 'Iraq')}
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>{t('cards.city', 'City')}</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder={t('cards.city_ph', 'Erbil')}
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('cards.address', 'Address')}</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder={t('cards.address_ph', 'Street / Area')}
                placeholderTextColor="#9CA3AF"
                style={[styles.input, { height: 54 }]}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={createCard}
              disabled={!canBuy || !isFormValid || isCreating}
              style={[styles.createBtn, (!canBuy || !isFormValid || isCreating) && { opacity: 0.55 }]}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.createBtnText}>{t('cards.create_btn', 'Create Debit Card')}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              {t('cards.note', `By creating a card, ${CARD_PRICE}$ will be deducted automatically from your wallet balance.`).replace('25', String(CARD_PRICE))}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    maxWidth: 240,
  },

  balanceCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: { color: UI.text2, fontWeight: '800', fontSize: 13 },
  balanceValue: { marginTop: 6, fontSize: 24, fontWeight: '900', color: UI.text, flexShrink: 1 },
  balanceCurrency: { fontSize: 13, fontWeight: '900', color: UI.text2 },

  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: UI.border,
    flexShrink: 0,
  },
  priceText: { fontWeight: '900', color: UI.text, fontSize: 13 },

  warnRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnText: { color: UI.danger, fontWeight: '800', flexShrink: 1 },

  listWrap: { marginTop: 14, paddingHorizontal: 16 },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  listTitle: { fontSize: 16, fontWeight: '900', color: UI.text },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingBox: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { color: UI.text2, fontWeight: '800', textAlign: 'center' },

  emptyBox: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { color: UI.text2, fontWeight: '800', textAlign: 'center' },

  cardItemOuter: { gap: 8 },
  cardItemGreen: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: UI.green,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  logoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  logoText: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },

  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  statusText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },

  itemNumber: {
    marginTop: 14,
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 1.1,
  },

  itemBottomRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  smallLabel: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  smallValue: { marginTop: 4, color: '#fff', fontWeight: '900', fontSize: 13 },

  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  itemMetaText: { color: UI.text2, fontWeight: '700', fontSize: 12, flexShrink: 1 },

  previewWrap: { marginTop: 14, paddingHorizontal: 16 },
  previewCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: UI.green,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  previewTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  chip: {
    width: 52,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    padding: 8,
    justifyContent: 'space-between',
  },
  chipLine: { height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.65)' },

  cardNumber: {
    marginTop: 18,
    color: '#fff',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 1.2,
  },

  previewBottomRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  previewHint: {
    marginTop: 10,
    color: UI.text2,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 18,
  },

  formCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: UI.card,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  formTitle: { fontSize: 16, fontWeight: '900', color: UI.text, marginBottom: 10 },

  field: { marginTop: 10 },
  fieldLabel: { color: UI.text2, fontWeight: '800', fontSize: 12, marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    fontWeight: '800',
    color: UI.text,
  },

  twoCol: { flexDirection: 'row', gap: 12, marginTop: 2 },

  createBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 16,
    backgroundColor: UI.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  createBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  note: {
    marginTop: 12,
    color: UI.text2,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 18,
  },
});

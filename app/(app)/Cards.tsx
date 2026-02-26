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
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });

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
      Alert.alert('Error', 'User not found');
      return;
    }
    if (!isFormValid) {
      Alert.alert('Missing info', 'Please fill all fields correctly.');
      return;
    }
    if (!canBuy) {
      Alert.alert('Insufficient balance', `You need at least ${CARD_PRICE} ${currency}.`);
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
        Alert.alert('Failed', res?.message || 'Unable to create card.');
        return;
      }

      Alert.alert('Success', `Card created. ${CARD_PRICE}$ deducted from your balance.`);
      await walletQuery.refetch();
      await cardsQuery.refetch();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Something went wrong.');
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
              <Text style={styles.statusText}>{(card.status || 'active').toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.itemNumber}>{card.pan_masked}</Text>

          <View style={styles.itemBottomRow}>
            <View>
              <Text style={styles.smallLabel}>CARD HOLDER</Text>
              <Text style={styles.smallValue}>{(card.full_name || '').toUpperCase()}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 18 }}>
              <View>
                <Text style={styles.smallLabel}>EXP</Text>
                <Text style={styles.smallValue}>{exp}</Text>
              </View>
              <View>
                <Text style={styles.smallLabel}>LAST 4</Text>
                <Text style={styles.smallValue}>{card.last4}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.itemMetaRow}>
          <Ionicons name="time-outline" size={14} color={UI.text2} />
          <Text style={styles.itemMetaText}>
            Created: {new Date(card.created_at).toLocaleString()}
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
            <Text style={styles.headerTitle}>Cards</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Balance + price */}
          <View style={styles.balanceCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                {walletQuery.isLoading ? (
                  <View style={{ marginTop: 8 }}>
                    <ActivityIndicator />
                  </View>
                ) : walletQuery.isError ? (
                  <Text style={[styles.balanceValue, { color: UI.danger }]}>Failed to load</Text>
                ) : (
                  <Text style={styles.balanceValue}>
                    {balance.toFixed(2)} <Text style={styles.balanceCurrency}>{currency}</Text>
                  </Text>
                )}
              </View>

              <View style={styles.pricePill}>
                <Ionicons name="pricetag" size={16} color={UI.green} />
                <Text style={styles.priceText}>Create: {CARD_PRICE}$</Text>
              </View>
            </View>

            {!canBuy && !walletQuery.isLoading && !walletQuery.isError ? (
              <View style={styles.warnRow}>
                <Ionicons name="alert-circle" size={18} color={UI.danger} />
                <Text style={styles.warnText}>Insufficient balance to create a card.</Text>
              </View>
            ) : null}
          </View>

          {/* Existing cards list */}
          <View style={styles.listWrap}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>Your Cards</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => cardsQuery.refetch()}
                style={styles.refreshBtn}
              >
                <Ionicons name="refresh" size={18} color={UI.text} />
              </TouchableOpacity>
            </View>

            {cardsQuery.isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading cards...</Text>
              </View>
            ) : cardsQuery.isError ? (
              <View style={styles.loadingBox}>
                <Ionicons name="alert-circle" size={20} color={UI.danger} />
                <Text style={[styles.loadingText, { color: UI.danger }]}>Failed to load cards</Text>
              </View>
            ) : (cardsQuery.data?.length || 0) === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="card-outline" size={26} color={UI.text2} />
                <Text style={styles.emptyText}>No cards yet. Create your first card below.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {cardsQuery.data!.map((c) => (
                  <CardItem key={c.id} card={c} />
                ))}
              </View>
            )}
          </View>

          {/* Card preview */}
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

              <Text style={styles.cardNumber}>{preview.cardNumber || '0000 0000 0000 0000'}</Text>

              <View style={styles.previewBottomRow}>
                <View>
                  <Text style={styles.smallLabel}>CARD HOLDER</Text>
                  <Text style={styles.smallValue}>{preview.name}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 18 }}>
                  <View>
                    <Text style={styles.smallLabel}>EXP</Text>
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
              Preview design only. Real card details are issued securely after purchase.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create New Card</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="07xxxxxxxx"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Country</Text>
                <TextInput
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Iraq"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Erbil"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Street / Area"
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
                  <Text style={styles.createBtnText}>Create Debit Card</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              By creating a card, {CARD_PRICE}$ will be deducted automatically from your wallet balance.
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
  balanceLabel: { color: UI.text2, fontWeight: '800', fontSize: 13 },
  balanceValue: { marginTop: 6, fontSize: 24, fontWeight: '900', color: UI.text },
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
  },
  priceText: { fontWeight: '900', color: UI.text, fontSize: 13 },

  warnRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnText: { color: UI.danger, fontWeight: '800' },

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
  loadingText: { color: UI.text2, fontWeight: '800' },

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
  itemMetaText: { color: UI.text2, fontWeight: '700', fontSize: 12 },

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

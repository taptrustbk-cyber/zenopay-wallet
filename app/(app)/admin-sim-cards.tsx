import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

type SimCardRow = {
  id: string;
  title: string | null;
  provider: string | null;
  amount_iqd: number | null;
  price_iqd: number | null;
  price_usd?: number | null;
  image_url: string | null;
  notes: string | null;
  is_active: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
};

type FilterType = 'all' | 'available' | 'unavailable';
type SortType = 'newest' | 'oldest' | 'price_low' | 'price_high' | 'name_az';

const BUCKET_NAME = 'product-images';

const UI = {
  bg: '#07122B',
  bg2: '#0A1736',
  card: '#0E1B40',
  card2: '#122252',
  border: 'rgba(255,255,255,0.08)',
  softBorder: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.68)',
  gold: '#F6E08F',
  goldDark: '#8B5E10',
  goldBorder: '#D8BE63',
  pillBg: 'rgba(246,224,143,0.10)',
  red: '#EF4444',
  green: '#75C06B',
  greenBg: 'rgba(117,192,107,0.18)',
  redBg: 'rgba(239,68,68,0.16)',
};

const PROVIDERS = [
  { key: 'korek', label: 'Korek', logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uu16k1t8p3uz3dpr3k6ic' },
  { key: 'zain', label: 'Zain', logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uq8qjx7d0g47h9rv2jvzz' },
  { key: 'asiacell', label: 'AsiaCell', logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q8puaw0dyshx6jruwg83i' },
  { key: 'ftth', label: 'FTTH', logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1ogdfkyuisk5c6unchj2s' },
  { key: 'reber', label: 'Reber', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png' },
  { key: 'kurdtel', label: 'Kurdtel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png' },
];

function formatIQD(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizeProvider(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function getProviderInfo(provider?: string | null) {
  const key = normalizeProvider(String(provider || ''));
  return (
    PROVIDERS.find((p) => p.key === key) || {
      key,
      label: provider || 'Provider',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png',
    }
  );
}

function getSortLabel(sort: SortType) {
  switch (sort) {
    case 'oldest':
      return 'Oldest';
    case 'price_low':
      return 'Price Low';
    case 'price_high':
      return 'Price High';
    case 'name_az':
      return 'A-Z';
    default:
      return 'Newest';
  }
}

export default function AdminSimCardScreen() {
  const router = useRouter();

  const [cards, setCards] = useState<SimCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [provider, setProvider] = useState('korek');
  const [title, setTitle] = useState('');
  const [amountIqd, setAmountIqd] = useState('');
  const [priceIqd, setPriceIqd] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const selectedProviderInfo = getProviderInfo(provider);

  const resetForm = () => {
    setEditingId(null);
    setProvider('korek');
    setTitle('');
    setAmountIqd('');
    setPriceIqd('');
    setNotes('');
    setImageUrl('');
    setIsAvailable(true);
  };

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('topup_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards((data || []) as SimCardRow[]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load SIM cards.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCards();
  };

  const stats = useMemo(() => {
    const all = cards.length;
    const available = cards.filter((c) => !!c.is_active).length;
    const unavailable = cards.filter((c) => !c.is_active).length;
    return { all, available, unavailable };
  }, [cards]);

  const filteredCards = useMemo(() => {
    let rows = [...cards];

    if (filter === 'available') rows = rows.filter((x) => !!x.is_active);
    if (filter === 'unavailable') rows = rows.filter((x) => !x.is_active);

    switch (sortBy) {
      case 'oldest':
        rows.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case 'price_low':
        rows.sort((a, b) => Number(a.price_iqd || 0) - Number(b.price_iqd || 0));
        break;
      case 'price_high':
        rows.sort((a, b) => Number(b.price_iqd || 0) - Number(a.price_iqd || 0));
        break;
      case 'name_az':
        rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        break;
      default:
        rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
    }

    return rows;
  }, [cards, filter, sortBy]);

  const cycleSort = () => {
    setSortBy((prev) => {
      if (prev === 'newest') return 'oldest';
      if (prev === 'oldest') return 'price_low';
      if (prev === 'price_low') return 'price_high';
      if (prev === 'price_high') return 'name_az';
      return 'newest';
    });
  };

  const pickAndUploadImage = async () => {
    try {
      setUploading(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: true,
        aspect: [4, 4],
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const mimeType = asset.mimeType || 'image/jpeg';
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const fileName = `sim-card-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
      Alert.alert('Success', 'Image uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload error', error?.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    if (!provider.trim()) {
      Alert.alert('Missing provider', 'Please enter or choose a provider.');
      return false;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter the SIM card title.');
      return false;
    }
    if (!amountIqd.trim()) {
      Alert.alert('Missing amount', 'Please enter amount IQD.');
      return false;
    }
    if (!priceIqd.trim()) {
      Alert.alert('Missing price', 'Please enter price IQD.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) return;

      setSubmitting(true);

      const payload = {
        title: title.trim(),
        provider: normalizeProvider(provider),
        amount_iqd: Number(String(amountIqd).replace(/,/g, '')),
        price_iqd: Number(String(priceIqd).replace(/,/g, '')),
        price_usd: Number(String(priceIqd).replace(/,/g, '')) / 1530,
        image_url: imageUrl.trim() || null,
        notes: notes.trim() || null,
        is_active: isAvailable,
      };

      if (editingId) {
        const { error } = await supabase
          .from('topup_cards')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Updated', 'SIM card updated successfully.');
      } else {
        const { error } = await supabase
          .from('topup_cards')
          .insert(payload);

        if (error) throw error;
        Alert.alert('Added', 'SIM card added successfully.');
      }

      resetForm();
      await fetchCards();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save SIM card.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (card: SimCardRow) => {
    setEditingId(card.id);
    setProvider(String(card.provider || 'korek'));
    setTitle(String(card.title || ''));
    setAmountIqd(String(card.amount_iqd || ''));
    setPriceIqd(String(card.price_iqd || ''));
    setNotes(String(card.notes || ''));
    setImageUrl(String(card.image_url || ''));
    setIsAvailable(!!card.is_active);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete card', 'Are you sure you want to delete this card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('topup_cards').delete().eq('id', id);
            if (error) throw error;
            await fetchCards();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not delete card.');
          }
        },
      },
    ]);
  };

  const quickToggleAvailability = async (card: SimCardRow) => {
    try {
      const { error } = await supabase
        .from('topup_cards')
        .update({ is_active: !card.is_active })
        .eq('id', card.id);

      if (error) throw error;
      await fetchCards();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update availability.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.9}
            style={styles.backPill}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            <Text style={styles.backPillText}>Admin Panel</Text>
          </TouchableOpacity>

          <Text numberOfLines={1} style={styles.screenTitle}>
            SIM Cards
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingId ? 'Edit Card' : 'Add New Card'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.providerPicker}
              onPress={() => {
                const currentIndex = PROVIDERS.findIndex((x) => x.key === normalizeProvider(provider));
                const next = PROVIDERS[(currentIndex + 1) % PROVIDERS.length];
                setProvider(next.key);
              }}
            >
              <Image source={{ uri: selectedProviderInfo.logo }} style={styles.providerLogoSmall} resizeMode="contain" />
              <Text style={styles.providerPickerText}>{selectedProviderInfo.label}</Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.72)" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Card title (e.g. Korek Telekom 1000 IQD)"
              placeholderTextColor="rgba(255,255,255,0.42)"
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.doubleRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="1,000 IQD"
                placeholderTextColor="rgba(255,255,255,0.42)"
                keyboardType="numeric"
                value={amountIqd}
                onChangeText={setAmountIqd}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="1,400 IQD"
                placeholderTextColor="rgba(255,255,255,0.42)"
                keyboardType="numeric"
                value={priceIqd}
                onChangeText={setPriceIqd}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter any notes here..."
              placeholderTextColor="rgba(255,255,255,0.42)"
              value={notes}
              onChangeText={setNotes}
            />

            <TextInput
              style={styles.input}
              placeholder="Or paste image URL here..."
              placeholderTextColor="rgba(255,255,255,0.42)"
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
            />

            <View style={styles.statusRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.statusPill, isAvailable && styles.statusPillActive]}
                onPress={() => setIsAvailable(true)}
              >
                <Text style={[styles.statusPillText, isAvailable && styles.statusPillTextActive]}>
                  Available
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.statusPill, !isAvailable && styles.statusPillInactive]}
                onPress={() => setIsAvailable(false)}
              >
                <Text style={[styles.statusPillText, !isAvailable && styles.statusPillTextInactive]}>
                  Unavailable
                </Text>
              </TouchableOpacity>
            </View>

            {!!imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.uploadButton}
              onPress={pickAndUploadImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={UI.goldDark} />
              ) : (
                <>
                  <Ionicons name="camera" size={24} color={UI.goldDark} />
                  <Text style={styles.uploadButtonText}>Upload Image</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.addButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={UI.goldDark} />
              ) : (
                <Text style={styles.addButtonText}>
                  {editingId ? 'Update Card' : 'Add Card'}
                </Text>
              )}
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.cancelEditButton}
                onPress={resetForm}
              >
                <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.listTitle}>All Cards</Text>

          <View style={styles.filterBar}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.filterItem, filter === 'all' && styles.filterItemActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterItemText, filter === 'all' && styles.filterItemTextActive]}>
                All
              </Text>
              <View style={styles.filterCount}><Text style={styles.filterCountText}>{stats.all}</Text></View>
            </TouchableOpacity>

            <View style={styles.filterDivider} />

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.filterItem}
              onPress={() => setFilter('available')}
            >
              <Ionicons name="albums-outline" size={18} color="rgba(255,255,255,0.72)" />
              <Text style={[styles.filterItemText, filter === 'available' && styles.filterItemTextActive]}>
                Available
              </Text>
              <View style={styles.filterCount}><Text style={styles.filterCountText}>{stats.available}</Text></View>
            </TouchableOpacity>

            <View style={styles.filterDivider} />

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.filterItem}
              onPress={() => setFilter('unavailable')}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.72)" />
              <Text style={[styles.filterItemText, filter === 'unavailable' && styles.filterItemTextActive]}>
                Unavailable
              </Text>
              <View style={styles.filterCount}><Text style={styles.filterCountText}>{stats.unavailable}</Text></View>
            </TouchableOpacity>

            <View style={styles.filterDivider} />

            <TouchableOpacity activeOpacity={0.9} style={styles.sortItem} onPress={cycleSort}>
              <Ionicons name="filter-outline" size={18} color="rgba(255,255,255,0.72)" />
              <Text style={styles.filterItemText}>{getSortLabel(sortBy)}</Text>
              <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.72)" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : filteredCards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="card-outline" size={42} color={UI.gold} />
              <Text style={styles.emptyTitle}>No cards found</Text>
              <Text style={styles.emptyText}>Add your first SIM card from the form above.</Text>
            </View>
          ) : (
            filteredCards.map((card) => {
              const providerInfo = getProviderInfo(card.provider);

              return (
                <View key={card.id} style={styles.cardListItem}>
                  <Image
                    source={{ uri: card.image_url || providerInfo.logo }}
                    style={styles.cardThumb}
                    resizeMode="cover"
                  />

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardItemTitle}>{card.title || '-'}</Text>
                    <Text style={styles.cardItemPrice}>Price {formatIQD(card.price_iqd)} IQD</Text>
                    {!!card.notes && (
                      <Text numberOfLines={2} style={styles.cardItemNotes}>
                        {card.notes}
                      </Text>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => quickToggleAvailability(card)}
                      style={[
                        styles.availabilityBadge,
                        card.is_active ? styles.availabilityBadgeOn : styles.availabilityBadgeOff,
                      ]}
                    >
                      <Text
                        style={[
                          styles.availabilityBadgeText,
                          card.is_active ? styles.availabilityBadgeTextOn : styles.availabilityBadgeTextOff,
                        ]}
                      >
                        {card.is_active ? 'Available' : 'Unavailable'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionsBox}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.actionBtn}
                      onPress={() => handleEdit(card)}
                    >
                      <Ionicons name="pencil" size={18} color="#E8C35A" />
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.actionBtn}
                      onPress={() => handleDelete(card.id)}
                    >
                      <Ionicons name="trash" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 36 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  container: {
    flex: 1,
    backgroundColor: UI.bg,
    paddingHorizontal: 18,
  },

  topHeader: {
    paddingTop: Platform.OS === 'ios' ? 8 : 10,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  backPillText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  screenTitle: {
    marginLeft: 18,
    flex: 1,
    color: '#EAF0FF',
    fontSize: 20,
    fontWeight: '800',
  },

  scrollContent: {
    paddingBottom: 20,
  },

  formCard: {
    backgroundColor: 'rgba(17,30,73,0.82)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.30,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },

  providerPicker: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.softBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerLogoSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  providerPickerText: {
    flex: 1,
    color: '#F8FAFF',
    fontSize: 18,
    fontWeight: '700',
  },

  input: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.softBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 17,
    marginBottom: 14,
  },

  doubleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  halfInput: {
    flex: 1,
  },

  statusRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statusPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.softBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillActive: {
    backgroundColor: 'rgba(117,192,107,0.14)',
    borderColor: 'rgba(117,192,107,0.35)',
  },
  statusPillInactive: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.28)',
  },
  statusPillText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: '#A8E09F',
  },
  statusPillTextInactive: {
    color: '#FF8C8C',
  },

  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  uploadButton: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: UI.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  uploadButtonText: {
    color: UI.goldDark,
    fontSize: 20,
    fontWeight: '800',
  },

  addButton: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: UI.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addButtonText: {
    color: UI.goldDark,
    fontSize: 20,
    fontWeight: '800',
  },

  cancelEditButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelEditButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  listTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },

  filterBar: {
    minHeight: 58,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 8,
  },
  filterItemActive: {
    backgroundColor: 'rgba(246,224,143,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(246,224,143,0.55)',
  },
  filterItemText: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 14,
    fontWeight: '700',
  },
  filterItemTextActive: {
    color: '#FFF1BE',
  },
  filterCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(246,224,143,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  filterCountText: {
    color: '#F4D981',
    fontSize: 13,
    fontWeight: '800',
  },
  filterDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: 4,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    paddingHorizontal: 8,
  },

  loaderWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    minHeight: 220,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },

  cardListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(17,30,73,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardThumb: {
    width: 96,
    height: 136,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },

  cardInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 2,
  },
  cardItemTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardItemPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardItemNotes: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },

  availabilityBadge: {
    alignSelf: 'flex-start',
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityBadgeOn: {
    backgroundColor: UI.greenBg,
  },
  availabilityBadgeOff: {
    backgroundColor: UI.redBg,
  },
  availabilityBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  availabilityBadgeTextOn: {
    color: '#AEDF88',
  },
  availabilityBadgeTextOff: {
    color: '#FF9A9A',
  },

  actionsBox: {
    width: 84,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
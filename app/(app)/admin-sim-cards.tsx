import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '@/lib/supabase';

type TopupProviderRow = {
  id: string;
  provider_key: string | null;
  title: string | null;
  subtitle: string | null;
  logo_url: string | null;
  is_active: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
};

type SimCardRow = {
  id: string;
  provider_id?: string | null;
  title: string | null;
  provider: string | null;
  provider_title?: string | null;
  provider_logo_url?: string | null;
  amount_iqd: number | null;
  price_iqd: number | null;
  price_usd?: number | null;
  image_url: string | null;
  card_image_url?: string | null;
  item_image_url?: string | null;
  notes: string | null;
  is_active: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
};

type FilterType = 'all' | 'available' | 'unavailable';
type SortType = 'newest' | 'oldest' | 'price_low' | 'price_high' | 'name_az';
type AdminTab = 'providers' | 'cards';

const BUCKET_NAME = 'product-images';
const FALLBACK_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png';

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

const PROVIDER_PRESETS = [
  {
    key: 'korek',
    label: 'Korek',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uu16k1t8p3uz3dpr3k6ic',
  },
  {
    key: 'zain',
    label: 'Zain',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uq8qjx7d0g47h9rv2jvzz',
  },
  {
    key: 'asiacell',
    label: 'AsiaCell',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q8puaw0dyshx6jruwg83i',
  },
  {
    key: 'ftth',
    label: 'FTTH',
    logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1ogdfkyuisk5c6unchj2s',
  },
  {
    key: 'reber',
    label: 'Reber',
    logo: FALLBACK_IMAGE,
  },
  {
    key: 'kurdtel',
    label: 'Kurdtel',
    logo: FALLBACK_IMAGE,
  },
  {
    key: 'zenopay',
    label: 'Zenopay',
    logo: FALLBACK_IMAGE,
  },
];

function formatIQD(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizeProviderKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

function toNumber(value: string | number | null | undefined) {
  return Number(String(value ?? '').replace(/,/g, '').trim() || 0);
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

function getProviderPreset(key?: string | null) {
  const normalized = normalizeProviderKey(String(key || ''));
  return (
    PROVIDER_PRESETS.find((p) => p.key === normalized) || {
      key: normalized || 'provider',
      label: key || 'Provider',
      logo: FALLBACK_IMAGE,
    }
  );
}

export default function AdminSimCardScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('providers');

  const [providers, setProviders] = useState<TopupProviderRow[]>([]);
  const [cards, setCards] = useState<SimCardRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<'provider' | 'card' | null>(null);

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');

  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [providerKey, setProviderKey] = useState('korek');
  const [providerTitle, setProviderTitle] = useState('Korek');
  const [providerSubtitle, setProviderSubtitle] = useState('');
  const [providerLogoUrl, setProviderLogoUrl] = useState('');
  const [providerSortOrder, setProviderSortOrder] = useState('0');
  const [providerIsAvailable, setProviderIsAvailable] = useState(true);

  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [amountIqd, setAmountIqd] = useState('');
  const [priceIqd, setPriceIqd] = useState('');
  const [notes, setNotes] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [cardSortOrder, setCardSortOrder] = useState('0');
  const [cardIsAvailable, setCardIsAvailable] = useState(true);

  const [failedProviderThumbs, setFailedProviderThumbs] = useState<Record<string, boolean>>({});
  const [failedCardThumbs, setFailedCardThumbs] = useState<Record<string, boolean>>({});

  const selectedProvider = useMemo(
    () => providers.find((x) => x.id === selectedProviderId) || null,
    [providers, selectedProviderId]
  );

  const selectedPreset = getProviderPreset(providerKey);

  const resetProviderForm = () => {
    setEditingProviderId(null);
    setProviderKey('korek');
    setProviderTitle('Korek');
    setProviderSubtitle('');
    setProviderLogoUrl('');
    setProviderSortOrder('0');
    setProviderIsAvailable(true);
  };

  const resetCardForm = (keepSelectedProvider = true) => {
    setEditingCardId(null);
    setCardTitle('');
    setAmountIqd('');
    setPriceIqd('');
    setNotes('');
    setCardImageUrl('');
    setCardSortOrder('0');
    setCardIsAvailable(true);

    if (!keepSelectedProvider) {
      setSelectedProviderId(providers[0]?.id || '');
      return;
    }

    if (!selectedProviderId && providers.length) {
      setSelectedProviderId(providers[0].id);
    }
  };

  const fetchAll = async () => {
    try {
      const [providersRes, cardsRes] = await Promise.all([
        supabase
          .from('topup_providers')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('topup_cards')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
      ]);

      if (providersRes.error) throw providersRes.error;
      if (cardsRes.error) throw cardsRes.error;

      const providersData = (providersRes.data || []) as TopupProviderRow[];
      const cardsData = (cardsRes.data || []) as SimCardRow[];

      setProviders(providersData);
      setCards(cardsData);

      const preloadUrls = [
        ...providersData.map((x) => x.logo_url).filter(Boolean),
        ...cardsData
          .map((x) => x.card_image_url || x.item_image_url || x.image_url)
          .filter(Boolean),
      ] as string[];

      if (preloadUrls.length) {
        ExpoImage.prefetch(preloadUrls).catch(() => {});
      }

      if (!providersData.length) {
        setSelectedProviderId('');
      } else {
        const stillExists = providersData.some((x) => x.id === selectedProviderId);
        if (!selectedProviderId || !stillExists) {
          setSelectedProviderId(providersData[0].id);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load SIM cards data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
  };

  const providerStats = useMemo(() => {
    const all = providers.length;
    const available = providers.filter((p) => !!p.is_active).length;
    const unavailable = providers.filter((p) => !p.is_active).length;
    return { all, available, unavailable };
  }, [providers]);

  const cardStats = useMemo(() => {
    const all = cards.length;
    const available = cards.filter((c) => !!c.is_active).length;
    const unavailable = cards.filter((c) => !c.is_active).length;
    return { all, available, unavailable };
  }, [cards]);

  const filteredProviders = useMemo(() => {
    let rows = [...providers];

    if (filter === 'available') rows = rows.filter((x) => !!x.is_active);
    if (filter === 'unavailable') rows = rows.filter((x) => !x.is_active);

    switch (sortBy) {
      case 'oldest':
        rows.sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );
        break;
      case 'name_az':
        rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        break;
      default:
        rows.sort((a, b) => {
          const aOrder = Number(a.sort_order || 0);
          const bOrder = Number(b.sort_order || 0);
          if (aOrder !== bOrder) return aOrder - bOrder;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        break;
    }

    return rows;
  }, [providers, filter, sortBy]);

  const filteredCards = useMemo(() => {
    let rows = [...cards];

    if (filter === 'available') rows = rows.filter((x) => !!x.is_active);
    if (filter === 'unavailable') rows = rows.filter((x) => !x.is_active);

    switch (sortBy) {
      case 'oldest':
        rows.sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );
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
        rows.sort((a, b) => {
          const aOrder = Number(a.sort_order || 0);
          const bOrder = Number(b.sort_order || 0);
          if (aOrder !== bOrder) return aOrder - bOrder;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
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

  const pickAndUploadImage = async (mode: 'provider' | 'card') => {
    try {
      setUploading(mode);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.72,
        allowsEditing: true,
        aspect: mode === 'provider' ? [1, 1] : [4, 4],
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const mimeType = asset.mimeType || 'image/jpeg';
      const ext = mimeType.includes('png')
        ? 'png'
        : mimeType.includes('webp')
        ? 'webp'
        : 'jpg';

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const fileName = `sim-${mode}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
          cacheControl: '31536000',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

      if (mode === 'provider') {
        setProviderLogoUrl(data.publicUrl);
      } else {
        setCardImageUrl(data.publicUrl);
      }

      Alert.alert('Success', 'Image uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload error', error?.message || 'Could not upload image.');
    } finally {
      setUploading(null);
    }
  };

  const validateProviderForm = () => {
    if (!providerTitle.trim()) {
      Alert.alert('Missing title', 'Please enter provider title.');
      return false;
    }
    if (!providerKey.trim()) {
      Alert.alert('Missing key', 'Please enter provider key.');
      return false;
    }
    return true;
  };

  const validateCardForm = () => {
    if (!selectedProviderId.trim()) {
      Alert.alert('Missing provider', 'Please choose a provider first.');
      return false;
    }
    if (!cardTitle.trim()) {
      Alert.alert('Missing title', 'Please enter SIM card title.');
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

  const syncCardsWithProvider = async (
    providerId: string,
    payload: {
      provider_key: string;
      title: string;
      logo_url: string | null;
      is_active: boolean;
    }
  ) => {
    const { error } = await supabase
      .from('topup_cards')
      .update({
        provider_id: providerId,
        provider: payload.provider_key,
        provider_title: payload.title,
        provider_logo_url: payload.logo_url,
        is_active: payload.is_active,
      })
      .eq('provider_id', providerId);

    if (error) throw error;
  };

  const handleSubmitProvider = async () => {
    try {
      if (!validateProviderForm()) return;

      setSubmitting(true);

      const normalizedKey = normalizeProviderKey(providerKey.trim());
      const preset = getProviderPreset(normalizedKey);

      const payload = {
        provider_key: normalizedKey,
        title: providerTitle.trim() || preset.label,
        subtitle: providerSubtitle.trim() || null,
        logo_url: providerLogoUrl.trim() || preset.logo || null,
        sort_order: toNumber(providerSortOrder),
        is_active: providerIsAvailable,
      };

      if (editingProviderId) {
        const { error } = await supabase
          .from('topup_providers')
          .update(payload)
          .eq('id', editingProviderId);

        if (error) throw error;

        await syncCardsWithProvider(editingProviderId, {
          provider_key: payload.provider_key,
          title: payload.title,
          logo_url: payload.logo_url,
          is_active: payload.is_active,
        });

        Alert.alert('Updated', 'Provider updated successfully.');
      } else {
        const { data, error } = await supabase
          .from('topup_providers')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        if (data?.id) {
          setSelectedProviderId(data.id);
        }

        Alert.alert('Added', 'Provider added successfully.');
      }

      resetProviderForm();
      await fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save provider.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCard = async () => {
    try {
      if (!validateCardForm()) return;

      if (!selectedProvider) {
        Alert.alert('Missing provider', 'Please choose a valid provider first.');
        return;
      }

      setSubmitting(true);

      const providerPreset = getProviderPreset(selectedProvider.provider_key || selectedProvider.title);
      const normalizedProviderKey = normalizeProviderKey(
        selectedProvider.provider_key || providerPreset.key
      );

      const itemImage = cardImageUrl.trim() || null;

      const payload = {
        provider_id: selectedProvider.id,
        title: cardTitle.trim(),
        provider: normalizedProviderKey,
        provider_title: selectedProvider.title?.trim() || providerPreset.label,
        provider_logo_url: selectedProvider.logo_url?.trim() || providerPreset.logo || null,
        amount_iqd: toNumber(amountIqd),
        price_iqd: toNumber(priceIqd),
        price_usd: toNumber(priceIqd) / 1530,
        image_url: itemImage,
        card_image_url: itemImage,
        item_image_url: itemImage,
        notes: notes.trim() || null,
        sort_order: toNumber(cardSortOrder),
        is_active: cardIsAvailable && !!selectedProvider.is_active,
      };

      if (editingCardId) {
        const { error } = await supabase
          .from('topup_cards')
          .update(payload)
          .eq('id', editingCardId);

        if (error) throw error;
        Alert.alert('Updated', 'SIM card updated successfully.');
      } else {
        const { error } = await supabase.from('topup_cards').insert(payload);
        if (error) throw error;
        Alert.alert('Added', 'SIM card added successfully.');
      }

      resetCardForm();
      await fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save SIM card.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProvider = (providerRow: TopupProviderRow) => {
    setActiveTab('providers');
    setEditingProviderId(providerRow.id);
    setProviderKey(String(providerRow.provider_key || ''));
    setProviderTitle(String(providerRow.title || ''));
    setProviderSubtitle(String(providerRow.subtitle || ''));
    setProviderLogoUrl(String(providerRow.logo_url || ''));
    setProviderSortOrder(String(providerRow.sort_order ?? 0));
    setProviderIsAvailable(!!providerRow.is_active);
  };

  const handleEditCard = (card: SimCardRow) => {
    setActiveTab('cards');
    setEditingCardId(card.id);
    setSelectedProviderId(String(card.provider_id || ''));
    setCardTitle(String(card.title || ''));
    setAmountIqd(String(card.amount_iqd || ''));
    setPriceIqd(String(card.price_iqd || ''));
    setNotes(String(card.notes || ''));
    setCardImageUrl(String(card.card_image_url || card.item_image_url || card.image_url || ''));
    setCardSortOrder(String(card.sort_order ?? 0));
    setCardIsAvailable(!!card.is_active);
  };

  const handleDeleteProvider = (id: string) => {
    const linkedCardsCount = cards.filter((x) => x.provider_id === id).length;

    Alert.alert(
      'Delete provider',
      linkedCardsCount > 0
        ? `This provider has ${linkedCardsCount} cards. Delete provider and all linked cards?`
        : 'Are you sure you want to delete this provider?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (linkedCardsCount > 0) {
                const { error: deleteCardsError } = await supabase
                  .from('topup_cards')
                  .delete()
                  .eq('provider_id', id);

                if (deleteCardsError) throw deleteCardsError;
              }

              const { error } = await supabase.from('topup_providers').delete().eq('id', id);
              if (error) throw error;

              if (editingProviderId === id) resetProviderForm();
              if (selectedProviderId === id) setSelectedProviderId('');

              await fetchAll();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Could not delete provider.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert('Delete card', 'Are you sure you want to delete this SIM card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('topup_cards').delete().eq('id', id);
            if (error) throw error;

            if (editingCardId === id) resetCardForm();

            await fetchAll();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not delete card.');
          }
        },
      },
    ]);
  };

  const quickToggleProviderAvailability = async (providerRow: TopupProviderRow) => {
    try {
      const nextActive = !providerRow.is_active;

      const { error } = await supabase
        .from('topup_providers')
        .update({ is_active: nextActive })
        .eq('id', providerRow.id);

      if (error) throw error;

      await syncCardsWithProvider(providerRow.id, {
        provider_key: normalizeProviderKey(String(providerRow.provider_key || '')),
        title: String(providerRow.title || ''),
        logo_url: providerRow.logo_url || null,
        is_active: nextActive,
      });

      await fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update availability.');
    }
  };

  const quickToggleCardAvailability = async (card: SimCardRow) => {
    try {
      const { error } = await supabase
        .from('topup_cards')
        .update({ is_active: !card.is_active })
        .eq('id', card.id);

      if (error) throw error;
      await fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update availability.');
    }
  };

  const renderFilterBar = (stats: { all: number; available: number; unavailable: number }) => (
    <View style={styles.filterBar}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.filterItem, filter === 'all' && styles.filterItemActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterItemText, filter === 'all' && styles.filterItemTextActive]}>
          All
        </Text>
        <View style={styles.filterCount}>
          <Text style={styles.filterCountText}>{stats.all}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.filterDivider} />

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.filterItem, filter === 'available' && styles.filterItemActive]}
        onPress={() => setFilter('available')}
      >
        <Ionicons name="albums-outline" size={18} color="rgba(255,255,255,0.72)" />
        <Text
          style={[
            styles.filterItemText,
            filter === 'available' && styles.filterItemTextActive,
          ]}
        >
          Available
        </Text>
        <View style={styles.filterCount}>
          <Text style={styles.filterCountText}>{stats.available}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.filterDivider} />

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.filterItem, filter === 'unavailable' && styles.filterItemActive]}
        onPress={() => setFilter('unavailable')}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.72)" />
        <Text
          style={[
            styles.filterItemText,
            filter === 'unavailable' && styles.filterItemTextActive,
          ]}
        >
          Unavailable
        </Text>
        <View style={styles.filterCount}>
          <Text style={styles.filterCountText}>{stats.unavailable}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.filterDivider} />

      <TouchableOpacity activeOpacity={0.9} style={styles.sortItem} onPress={cycleSort}>
        <Ionicons name="filter-outline" size={18} color="rgba(255,255,255,0.72)" />
        <Text style={styles.filterItemText}>{getSortLabel(sortBy)}</Text>
        <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.72)" />
      </TouchableOpacity>
    </View>
  );

  const renderTabSwitch = () => (
    <View style={styles.tabSwitchWrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.tabSwitchBtn, activeTab === 'providers' && styles.tabSwitchBtnActive]}
        onPress={() => setActiveTab('providers')}
      >
        <Ionicons
          name="images-outline"
          size={18}
          color={activeTab === 'providers' ? UI.goldDark : '#FFFFFF'}
        />
        <Text
          style={[
            styles.tabSwitchText,
            activeTab === 'providers' && styles.tabSwitchTextActive,
          ]}
        >
          Providers
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.tabSwitchBtn, activeTab === 'cards' && styles.tabSwitchBtnActive]}
        onPress={() => setActiveTab('cards')}
      >
        <Ionicons
          name="card-outline"
          size={18}
          color={activeTab === 'cards' ? UI.goldDark : '#FFFFFF'}
        />
        <Text
          style={[styles.tabSwitchText, activeTab === 'cards' && styles.tabSwitchTextActive]}
        >
          Cards
        </Text>
      </TouchableOpacity>
    </View>
  );

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          {renderTabSwitch()}

          {activeTab === 'providers' ? (
            <>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>
                  {editingProviderId ? 'Edit Provider' : 'Add New Provider'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.providerPicker}
                  onPress={() => {
                    const currentIndex = PROVIDER_PRESETS.findIndex(
                      (x) => x.key === normalizeProviderKey(String(providerKey || ''))
                    );
                    const next =
                      PROVIDER_PRESETS[
                        (currentIndex + 1 + PROVIDER_PRESETS.length) % PROVIDER_PRESETS.length
                      ];
                    setProviderKey(next.key);
                    setProviderTitle(next.label);
                    if (!providerLogoUrl.trim()) {
                      setProviderLogoUrl(next.logo);
                    }
                  }}
                >
                  <ExpoImage
                    source={{ uri: providerLogoUrl || selectedPreset.logo || FALLBACK_IMAGE }}
                    style={styles.providerLogoSmall}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={100}
                  />
                  <Text style={styles.providerPickerText}>{providerTitle || selectedPreset.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.72)" />
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Provider title (e.g. Korek)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={providerTitle}
                  onChangeText={setProviderTitle}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Provider key (e.g. korek)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={providerKey}
                  onChangeText={setProviderKey}
                  autoCapitalize="none"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Subtitle (e.g. Mobile Cards)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={providerSubtitle}
                  onChangeText={setProviderSubtitle}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Provider logo URL"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={providerLogoUrl}
                  onChangeText={setProviderLogoUrl}
                  autoCapitalize="none"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Sort order (0,1,2...)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  keyboardType="numeric"
                  value={providerSortOrder}
                  onChangeText={setProviderSortOrder}
                />

                <View style={styles.statusRow}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusPill, providerIsAvailable && styles.statusPillActive]}
                    onPress={() => setProviderIsAvailable(true)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        providerIsAvailable && styles.statusPillTextActive,
                      ]}
                    >
                      Available
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusPill, !providerIsAvailable && styles.statusPillInactive]}
                    onPress={() => setProviderIsAvailable(false)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        !providerIsAvailable && styles.statusPillTextInactive,
                      ]}
                    >
                      Unavailable
                    </Text>
                  </TouchableOpacity>
                </View>

                {!!providerLogoUrl && (
                  <ExpoImage
                    source={{ uri: providerLogoUrl }}
                    style={styles.previewImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={100}
                  />
                )}

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.uploadButton}
                  onPress={() => pickAndUploadImage('provider')}
                  disabled={uploading !== null}
                >
                  {uploading === 'provider' ? (
                    <ActivityIndicator color={UI.goldDark} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color={UI.goldDark} />
                      <Text style={styles.uploadButtonText}>Upload Provider Logo</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.addButton}
                  onPress={handleSubmitProvider}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={UI.goldDark} />
                  ) : (
                    <Text style={styles.addButtonText}>
                      {editingProviderId ? 'Update Provider' : 'Add Provider'}
                    </Text>
                  )}
                </TouchableOpacity>

                {editingProviderId && (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    style={styles.cancelEditButton}
                    onPress={resetProviderForm}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.listTitle}>All Providers</Text>
              {renderFilterBar(providerStats)}

              {loading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : filteredProviders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="images-outline" size={42} color={UI.gold} />
                  <Text style={styles.emptyTitle}>No providers found</Text>
                  <Text style={styles.emptyText}>
                    Add your first provider from the form above.
                  </Text>
                </View>
              ) : (
                filteredProviders.map((providerRow) => {
                  const linkedCount = cards.filter((x) => x.provider_id === providerRow.id).length;
                  const preset = getProviderPreset(providerRow.provider_key);
                  const providerThumb = providerRow.logo_url || preset.logo || FALLBACK_IMAGE;
                  const canShowThumb = !!providerThumb && !failedProviderThumbs[providerRow.id];

                  return (
                    <View key={providerRow.id} style={styles.cardListItem}>
                      {canShowThumb ? (
                        <ExpoImage
                          source={{ uri: providerThumb }}
                          style={styles.cardThumb}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                          transition={100}
                          onError={() =>
                            setFailedProviderThumbs((prev) => ({
                              ...prev,
                              [providerRow.id]: true,
                            }))
                          }
                        />
                      ) : (
                        <View style={[styles.cardThumb, styles.thumbFallback]}>
                          <Ionicons name="images-outline" size={34} color="#E8C35A" />
                        </View>
                      )}

                      <View style={styles.cardInfo}>
                        <Text style={styles.cardItemTitle}>{providerRow.title || '-'}</Text>
                        <Text style={styles.cardItemPrice}>{providerRow.provider_key || '-'}</Text>

                        {!!providerRow.subtitle && (
                          <Text numberOfLines={2} style={styles.cardItemNotes}>
                            {providerRow.subtitle}
                          </Text>
                        )}

                        <Text numberOfLines={1} style={styles.linkedCountText}>
                          Linked cards: {linkedCount}
                        </Text>

                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => quickToggleProviderAvailability(providerRow)}
                          style={[
                            styles.availabilityBadge,
                            providerRow.is_active
                              ? styles.availabilityBadgeOn
                              : styles.availabilityBadgeOff,
                          ]}
                        >
                          <Text
                            style={[
                              styles.availabilityBadgeText,
                              providerRow.is_active
                                ? styles.availabilityBadgeTextOn
                                : styles.availabilityBadgeTextOff,
                            ]}
                          >
                            {providerRow.is_active ? 'Available' : 'Unavailable'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.actionsBox}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.actionBtn}
                          onPress={() => handleEditProvider(providerRow)}
                        >
                          <Ionicons name="pencil" size={18} color="#E8C35A" />
                        </TouchableOpacity>

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.actionBtn}
                          onPress={() => handleDeleteProvider(providerRow.id)}
                        >
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          ) : (
            <>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>
                  {editingCardId ? 'Edit Card' : 'Add New Card'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.providerPicker}
                  onPress={() => {
                    if (!providers.length) {
                      Alert.alert('No providers', 'Please create a provider first.');
                      return;
                    }
                    const currentIndex = providers.findIndex((x) => x.id === selectedProviderId);
                    const next = providers[(currentIndex + 1 + providers.length) % providers.length];
                    setSelectedProviderId(next.id);
                  }}
                >
                  <ExpoImage
                    source={{
                      uri:
                        selectedProvider?.logo_url ||
                        getProviderPreset(selectedProvider?.provider_key || selectedProvider?.title).logo ||
                        FALLBACK_IMAGE,
                    }}
                    style={styles.providerLogoSmall}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={100}
                  />
                  <Text style={styles.providerPickerText}>
                    {selectedProvider?.title || 'Choose Provider'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.72)" />
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Card title (e.g. Korek Telecom 1000 IQD)"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={cardTitle}
                  onChangeText={setCardTitle}
                />

                <View style={styles.doubleRow}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Amount IQD"
                    placeholderTextColor="rgba(255,255,255,0.42)"
                    keyboardType="numeric"
                    value={amountIqd}
                    onChangeText={setAmountIqd}
                  />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Price IQD"
                    placeholderTextColor="rgba(255,255,255,0.42)"
                    keyboardType="numeric"
                    value={priceIqd}
                    onChangeText={setPriceIqd}
                  />
                </View>

                <View style={styles.doubleRow}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Sort order"
                    placeholderTextColor="rgba(255,255,255,0.42)"
                    keyboardType="numeric"
                    value={cardSortOrder}
                    onChangeText={setCardSortOrder}
                  />
                  <View style={styles.halfInput} />
                </View>

                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Notes"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />

                <TextInput
                  style={styles.input}
                  placeholder="Card image URL"
                  placeholderTextColor="rgba(255,255,255,0.42)"
                  value={cardImageUrl}
                  onChangeText={setCardImageUrl}
                  autoCapitalize="none"
                />

                <View style={styles.statusRow}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusPill, cardIsAvailable && styles.statusPillActive]}
                    onPress={() => setCardIsAvailable(true)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        cardIsAvailable && styles.statusPillTextActive,
                      ]}
                    >
                      Available
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusPill, !cardIsAvailable && styles.statusPillInactive]}
                    onPress={() => setCardIsAvailable(false)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        !cardIsAvailable && styles.statusPillTextInactive,
                      ]}
                    >
                      Unavailable
                    </Text>
                  </TouchableOpacity>
                </View>

                {!!cardImageUrl && (
                  <ExpoImage
                    source={{ uri: cardImageUrl }}
                    style={styles.previewImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={100}
                  />
                )}

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.uploadButton}
                  onPress={() => pickAndUploadImage('card')}
                  disabled={uploading !== null}
                >
                  {uploading === 'card' ? (
                    <ActivityIndicator color={UI.goldDark} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color={UI.goldDark} />
                      <Text style={styles.uploadButtonText}>Upload Card Image</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.addButton}
                  onPress={handleSubmitCard}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={UI.goldDark} />
                  ) : (
                    <Text style={styles.addButtonText}>
                      {editingCardId ? 'Update Card' : 'Add Card'}
                    </Text>
                  )}
                </TouchableOpacity>

                {editingCardId && (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    style={styles.cancelEditButton}
                    onPress={() => resetCardForm()}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.listTitle}>All Cards</Text>
              {renderFilterBar(cardStats)}

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
                  const providerRow = providers.find((x) => x.id === card.provider_id);
                  const providerPreset = getProviderPreset(
                    providerRow?.provider_key || card.provider || card.provider_title
                  );

                  const cardThumb =
                    card.card_image_url || card.item_image_url || card.image_url || FALLBACK_IMAGE;
                  const canShowThumb = !!cardThumb && !failedCardThumbs[card.id];

                  return (
                    <View key={card.id} style={styles.cardListItem}>
                      {canShowThumb ? (
                        <ExpoImage
                          source={{ uri: cardThumb }}
                          style={styles.cardThumb}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={100}
                          onError={() =>
                            setFailedCardThumbs((prev) => ({
                              ...prev,
                              [card.id]: true,
                            }))
                          }
                        />
                      ) : (
                        <View style={[styles.cardThumb, styles.thumbFallback]}>
                          <Ionicons name="card-outline" size={34} color="#E8C35A" />
                        </View>
                      )}

                      <View style={styles.cardInfo}>
                        <Text style={styles.cardItemTitle}>{card.title || '-'}</Text>

                        <Text style={styles.cardItemPrice}>
                          Price {formatIQD(card.price_iqd)} IQD
                        </Text>

                        <Text numberOfLines={2} style={styles.cardItemNotes}>
                          {(providerRow?.title || card.provider_title || providerPreset.label || 'Provider') +
                            ' • Amount ' +
                            formatIQD(card.amount_iqd) +
                            ' IQD'}
                        </Text>

                        {!!card.notes && (
                          <Text numberOfLines={2} style={styles.cardDescriptionText}>
                            {card.notes}
                          </Text>
                        )}

                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => quickToggleCardAvailability(card)}
                          style={[
                            styles.availabilityBadge,
                            card.is_active
                              ? styles.availabilityBadgeOn
                              : styles.availabilityBadgeOff,
                          ]}
                        >
                          <Text
                            style={[
                              styles.availabilityBadgeText,
                              card.is_active
                                ? styles.availabilityBadgeTextOn
                                : styles.availabilityBadgeTextOff,
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
                          onPress={() => handleEditCard(card)}
                        >
                          <Ionicons name="pencil" size={18} color="#E8C35A" />
                        </TouchableOpacity>

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.actionBtn}
                          onPress={() => handleDeleteCard(card.id)}
                        >
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
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

  tabSwitchWrap: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  tabSwitchBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.softBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  tabSwitchBtnActive: {
    backgroundColor: UI.gold,
    borderColor: UI.goldBorder,
  },
  tabSwitchText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  tabSwitchTextActive: {
    color: UI.goldDark,
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
  textarea: {
    minHeight: 100,
    paddingTop: 16,
    textAlignVertical: 'top',
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
    fontSize: 18,
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
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 8,
  },
  linkedCountText: {
    color: '#F4D981',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardDescriptionText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 13,
    lineHeight: 20,
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
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import i18n from '@/lib/i18n';

interface SimCard {
  id: string;
  name: string;
  price: number;
  provider: string;
  amount: number;
  image: string;
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

const simCards: SimCard[] = [
  { id: '1', name: 'Korek 5,000 IQD', price: 3.6, provider: 'korek', amount: 5000, image: '' },
  { id: '2', name: 'Korek 10,000 IQD', price: 7.6, provider: 'korek', amount: 10000, image: '' },
  { id: '3', name: 'Korek 15,000 IQD', price: 11.1, provider: 'korek', amount: 15000, image: '' },
  { id: '4', name: 'FTTH 29,000 IQD', price: 21, provider: 'ftth', amount: 29000, image: '' },
  { id: '5', name: 'Zain 5,000 IQD', price: 3.6, provider: 'zain', amount: 5000, image: '' },
  { id: '6', name: 'Zain 10,000 IQD', price: 7.6, provider: 'zain', amount: 10000, image: '' },
  { id: '7', name: 'Asiacell 5,000 IQD', price: 3.6, provider: 'asiacell', amount: 5000, image: '' },
  { id: '8', name: 'Asiacell 10,000 IQD', price: 7.6, provider: 'asiacell', amount: 10000, image: '' },
];

const ProviderLogo = ({ provider }: { provider: string }) => {
  const config = providerConfig[provider] || providerConfig.korek;

  if (config.logo) {
    return (
      <View style={[styles.providerLogoContainer, { backgroundColor: config.bgColor }]}>
        <Image source={{ uri: config.logo }} style={styles.providerLogoImage} resizeMode="contain" />
      </View>
    );
  }

  const providerLabels: Record<string, string> = {
    korek: 'KOREK',
    zain: 'ZAIN',
    asiacell: 'ASIACELL',
    ftth: 'FTTH',
  };

  return (
    <View style={[styles.providerLogoContainer, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.providerLogoText, { color: config.color, fontSize: provider === 'asiacell' ? 10 : 12 }]}>
        {providerLabels[provider] || provider.toUpperCase()}
      </Text>
      <Text style={[styles.providerSubtext, { color: config.color }]}>TELECOM</Text>
    </View>
  );
};

export default function SimCardsScreen() {
  const router = useRouter();

  const handleCardPress = (card: SimCard) => {
    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        name: card.name,
        price: card.price.toString(),
        provider: card.provider,
        amount: card.amount.toString(),
        type: 'sim',
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* ✅ Remove expo-router default header (dark blue one) */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ✅ Single header only (one back icon + centered title) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/dashboard' as any)}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#16a34a" />
        </TouchableOpacity>

        {/* ✅ Title must be: Top-Up Cards */}
        <Text style={styles.headerTitle}>{i18n.t('market.topup') || 'Top-Up Cards'}</Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* ✅ Change big title inside card to: Top-Up Cards */}
        <View style={styles.topCard}>
          <Text style={styles.pageTitle}>{i18n.t('market.topup') || 'Top-Up Cards'}</Text>

          {/* ✅ Change subtitle text to: Top-Up Cards */}
          <Text style={styles.pageSubtitle}>{i18n.t('market.topup') || 'Top-Up Cards'}</Text>
        </View>

        <View style={styles.grid}>
          {simCards.map((card) => {
            const config = providerConfig[card.provider] || providerConfig.korek;

            return (
              <TouchableOpacity
                key={card.id}
                style={styles.cardItem}
                activeOpacity={0.9}
                onPress={() => handleCardPress(card)}
              >
                <ProviderLogo provider={card.provider} />

                <Text style={styles.cardName}>{card.name}</Text>

                <Text style={[styles.cardPrice, { color: config.color }]}>${card.price.toFixed(2)}</Text>

                <TouchableOpacity style={styles.buyButton} activeOpacity={0.9} onPress={() => handleCardPress(card)}>
                  <Text style={styles.buyButtonText}>{i18n.t('buyNow')}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 6,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#111111',
  },

  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 10,
  },

  topCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    textAlign: 'center',
    lineHeight: 30,
    color: '#111111',
  },
  pageSubtitle: {
    marginTop: 10,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600' as const,
  },

  grid: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },

  cardItem: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  providerLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden' as const,
  },
  providerLogoImage: {
    width: 60,
    height: 60,
  },
  providerLogoText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  providerSubtext: {
    fontSize: 8,
    fontWeight: '600' as const,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  cardName: {
    fontSize: 15,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    color: '#111111',
    marginBottom: 8,
    lineHeight: 20,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '900' as const,
    marginBottom: 12,
  },

  buyButton: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800' as const,
  },
});

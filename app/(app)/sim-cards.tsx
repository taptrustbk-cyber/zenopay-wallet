import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Wifi } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
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
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Korek_Telecom_logo.svg/200px-Korek_Telecom_logo.svg.png',
  },
  zain: {
    color: '#00A651',
    bgColor: 'rgba(0, 166, 81, 0.15)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Zain_logo.svg/200px-Zain_logo.svg.png',
  },
  asiacell: {
    color: '#6B2D7B',
    bgColor: 'rgba(107, 45, 123, 0.15)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Asiacell_logo.svg/200px-Asiacell_logo.svg.png',
  },
  ftth: {
    color: '#0066CC',
    bgColor: 'rgba(0, 102, 204, 0.15)',
    logo: '',
  },
};

const simCards: SimCard[] = [
  { 
    id: '1', 
    name: 'Korek 5,000 IQD', 
    price: 3.6, 
    provider: 'korek', 
    amount: 5000,
    image: ''
  },
  { 
    id: '2', 
    name: 'Korek 10,000 IQD', 
    price: 7.6, 
    provider: 'korek', 
    amount: 10000,
    image: ''
  },
  { 
    id: '3', 
    name: 'Korek 15,000 IQD', 
    price: 11.1, 
    provider: 'korek', 
    amount: 15000,
    image: ''
  },
  { 
    id: '4', 
    name: 'FTTH 29,000 IQD', 
    price: 21, 
    provider: 'ftth', 
    amount: 29000,
    image: ''
  },
  { 
    id: '5', 
    name: 'Zain 5,000 IQD', 
    price: 3.6, 
    provider: 'zain', 
    amount: 5000,
    image: ''
  },
  { 
    id: '6', 
    name: 'Zain 10,000 IQD', 
    price: 7.6, 
    provider: 'zain', 
    amount: 10000,
    image: ''
  },
  { 
    id: '7', 
    name: 'Asiacell 5,000 IQD', 
    price: 3.6, 
    provider: 'asiacell', 
    amount: 5000,
    image: ''
  },
  { 
    id: '8', 
    name: 'Asiacell 10,000 IQD', 
    price: 7.6, 
    provider: 'asiacell', 
    amount: 10000,
    image: ''
  },
];

const ProviderLogo = ({ provider }: { provider: string }) => {
  const config = providerConfig[provider] || providerConfig.korek;
  
  if (provider === 'ftth') {
    return (
      <View style={[styles.providerLogoContainer, { backgroundColor: config.bgColor }]}>
        <Wifi size={32} color={config.color} />
        <Text style={[styles.providerLogoText, { color: config.color }]}>FTTH</Text>
      </View>
    );
  }
  
  const providerLabels: Record<string, string> = {
    korek: 'KOREK',
    zain: 'ZAIN',
    asiacell: 'ASIACELL',
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
  const { theme } = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {i18n.t('internetSim')}
              </Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {i18n.t('selectSimCard')}
            </Text>
          </View>

          <View style={styles.grid}>
            {simCards.map((card) => {
              const config = providerConfig[card.provider] || providerConfig.korek;
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.cardItem, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleCardPress(card)}
                >
                  <ProviderLogo provider={card.provider} />
                  <Text style={[styles.cardName, { color: theme.colors.text }]}>
                    {card.name}
                  </Text>
                  <Text style={[styles.cardPrice, { color: config.color }]}>
                    ${card.price.toFixed(2)}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.buyButton, { backgroundColor: config.color }]}
                    onPress={() => handleCardPress(card)}
                  >
                    <Text style={styles.buyButtonText}>{i18n.t('buyNow')}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardItem: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cardImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  providerLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  buyButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  buyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

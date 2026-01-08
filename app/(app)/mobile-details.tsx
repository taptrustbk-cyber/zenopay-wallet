import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import i18n from '@/lib/i18n';
import React from 'react';
export default function MobileDetailsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const product = {
    id: params.id as string,
    name: params.name as string,
    price: parseFloat(params.price as string),
    storage: params.storage as string,
    battery: params.battery as string,
    colors: JSON.parse(params.colors as string) as string[],
    specs: JSON.parse(params.specs as string) as string[],
    imageUrl: params.imageUrl as string,
  };

  const [selectedColor, setSelectedColor] = React.useState<string>(product.colors[0]);
  const [fullName, setFullName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [city, setCity] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [note, setNote] = React.useState('');
  const [isPurchasing, setIsPurchasing] = React.useState(false);

  const description = `The ${product.name} delivers excellent performance, a high-quality display, and a reliable battery life suitable for daily use. Ideal for work, media, and communication with premium build quality.`;

  const handlePurchase = async () => {
    if (!fullName || !phoneNumber || !city || !address) {
      Alert.alert(i18n.t('error'), i18n.t('fillAllFields'));
      return;
    }

    setIsPurchasing(true);

    try {
      Alert.alert(
        i18n.t('success'),
        'Buy successfully! Please wait for delivery.',
        [
          {
            text: i18n.t('done'),
            onPress: () => {
              router.push('/(app)/dashboard');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(i18n.t('error'), 'Sorry, you don\'t have enough balance. Please deposit your balance.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {i18n.t('productDetails')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.productSection, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.imageContainer, { backgroundColor: 'rgba(245, 158, 11, 0.05)' }]}>
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.productImage}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.productName, { color: theme.colors.text }]}>
              {product.name}
            </Text>

            <View style={styles.detailsRow}>
              <View style={styles.detailBadge}>
                <Ionicons name="hardware-chip" size={16} color={theme.colors.primary} />
                <Text style={[styles.detailText, { color: theme.colors.text }]}>
                  {product.storage}
                </Text>
              </View>
              <View style={styles.detailBadge}>
                <Ionicons name="battery-charging" size={16} color="#10B981" />
                <Text style={[styles.detailText, { color: theme.colors.text }]}>
                  {product.battery}
                </Text>
              </View>
            </View>

            <View style={styles.specsContainer}>
              {product.specs.map((spec, index) => (
                <View key={index} style={styles.specItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={[styles.specText, { color: theme.colors.textSecondary }]}>
                    {spec}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.productPrice, { color: theme.colors.primary }]}>
              ${product.price}
            </Text>
          </View>

          <View style={[styles.descriptionSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {i18n.t('description')}
            </Text>
            <Text style={[styles.descriptionText, { color: theme.colors.textSecondary }]}>
              {description}
            </Text>
          </View>

          <View style={[styles.colorSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {i18n.t('selectColor')}
            </Text>
            <View style={styles.colorOptions}>
              {product.colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { 
                      borderColor: selectedColor === color ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selectedColor === color ? `${theme.colors.primary}15` : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  <Text style={[styles.colorText, { color: theme.colors.text }]}>
                    {color}
                  </Text>
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {i18n.t('deliveryInformation')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                {i18n.t('fullName')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder={i18n.t('enterFullName')}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                {i18n.t('phoneNumber')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder={i18n.t('enterPhoneNumber')}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                {i18n.t('city')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={city}
                onChangeText={setCity}
                placeholder={i18n.t('enterCity')}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                {i18n.t('streetAddress')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={address}
                onChangeText={setAddress}
                placeholder={i18n.t('enterStreetAddress')}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                {i18n.t('deliveryNote')} ({i18n.t('optional')})
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={note}
                onChangeText={setNote}
                placeholder={i18n.t('enterDeliveryNote')}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={[styles.deliveryInfo, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <Text style={[styles.deliveryInfoText, { color: theme.colors.text }]}>
              Delivery within 1–2 days after order confirmation.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePurchase}
            disabled={isPurchasing}
          >
            <Text style={styles.purchaseButtonText}>
              {isPurchasing ? i18n.t('processing') : i18n.t('buyNow')}
            </Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  productSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  productImage: {
    width: '70%',
    height: '70%',
  },
  productName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  specsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specText: {
    fontSize: 14,
  },
  productPrice: {
    fontSize: 36,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  descriptionSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  colorSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  colorText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  formSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  deliveryInfoText: {
    flex: 1,
    fontSize: 14,
  },
  purchaseButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

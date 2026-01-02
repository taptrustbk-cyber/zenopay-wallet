import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function KYCScreen() {
  const { signOut } = useAuth();

  const handleBackToSignIn = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:admin@zenopay.bond');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.header}>ZenoPay</Text>

        <View style={styles.iconContainer}>
          <Clock size={80} color="#4A90E2" strokeWidth={2} />
        </View>

        <Text style={styles.title}>KYC Verification in Progress</Text>

        <Text style={styles.description}>
          ZenoPay support is working on your KYC documents. Please wait for your account to be approved.
        </Text>

        <Text style={styles.timeText}>This may take from 1 hour to 6 hours.</Text>

        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Contact Support For More Help</Text>
          
          <TouchableOpacity onPress={handleEmailSupport}>
            <Text style={styles.email}>admin@zenopay.bond</Text>
          </TouchableOpacity>

          <Text style={styles.supportDescription}>
            You can send a message to this email and write what problem you have
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={handleBackToSignIn}>
        <Text style={styles.backButtonText}>Back to Sign In</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#4A90E2',
    marginBottom: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    color: '#B0BEC5',
    textAlign: 'center' as const,
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  timeText: {
    fontSize: 13,
    color: '#78909C',
    textAlign: 'center' as const,
    marginBottom: 48,
  },
  supportSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  email: {
    fontSize: 15,
    color: '#4A90E2',
    textDecorationLine: 'underline',
    marginBottom: 12,
  },
  supportDescription: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  backButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

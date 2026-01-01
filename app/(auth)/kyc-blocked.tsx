import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function KycBlocked() {
  const router = useRouter();

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>KYC Status Zeno Pay</Text>

      <View style={styles.iconContainer}>
        <Clock size={80} color="#3B82F6" strokeWidth={1.5} />
      </View>

      <Text style={styles.title}>Please Wait</Text>

      <Text style={styles.description}>
        Support Zeno Pay will contact you within 1 hour to 24 hours to approve or reject your account.
      </Text>

      <Text style={styles.subdescription}>
        Please wait for the verification process to complete.
      </Text>

      <TouchableOpacity 
        style={styles.button}
        onPress={handleBackToLogin}
      >
        <Text style={styles.buttonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  header: {
    position: 'absolute' as const,
    top: 60,
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  subdescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 220,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

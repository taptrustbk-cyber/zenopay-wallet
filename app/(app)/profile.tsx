import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';


export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const [fullName, setFullName] = useState(profile?.full_name || '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .select()
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      Alert.alert(i18n.t('success'), i18n.t('profileUpdated'));
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error.message);
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('email')}</Text>
          <View style={[styles.infoBox, { backgroundColor: theme.colors.cardSecondary }]}>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>{user?.email}</Text>
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('fullName')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.cardSecondary, color: theme.colors.text }]}
            placeholder={i18n.t('fullName')}
            placeholderTextColor={theme.colors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('accountActive')}</Text>
          <View style={[styles.infoBox, { backgroundColor: theme.colors.cardSecondary }]}>
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {profile?.kyc_status === 'approved' ? i18n.t('active') : i18n.t(profile?.kyc_status || 'notStarted')}
            </Text>
          </View>

          {profile?.date_of_birth && (
            <>
              <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('dateOfBirthLabel')}</Text>
              <View style={[styles.infoBox, { backgroundColor: theme.colors.cardSecondary }]}>
                <Text style={[styles.infoText, { color: theme.colors.text }]}>{profile.date_of_birth}</Text>
              </View>
            </>
          )}

          {profile?.phone_number && (
            <>
              <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('phoneLabel')}</Text>
              <View style={[styles.infoBox, { backgroundColor: theme.colors.cardSecondary }]}>
                <Text style={[styles.infoText, { color: theme.colors.text }]}>{profile.phone_number}</Text>
              </View>
            </>
          )}

          {profile?.city && (
            <>
              <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('cityLabel')}</Text>
              <View style={[styles.infoBox, { backgroundColor: theme.colors.cardSecondary }]}>
                <Text style={[styles.infoText, { color: theme.colors.text }]}>{profile.city}</Text>
              </View>
            </>
          )}

          {profile?.country && (
            <>
              <Text style={[styles.label, { color: theme.colors.text }]}>{i18n.t('countryLabel')}</Text>
              <View style={[styles.infoBox, { backgroundColor: theme.colors.cardSecondary }]}>
                <Text style={[styles.infoText, { color: theme.colors.text }]}>{profile.country}</Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.updateButtonText}>{i18n.t('updateProfile')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
});

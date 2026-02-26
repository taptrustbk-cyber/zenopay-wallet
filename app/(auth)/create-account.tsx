import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { useMemo, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';

// ✅ remove default header
export const options = {
  headerShown: false,
};

// 🎨 white + green + black
const COLORS = {
  bg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F3FBF6',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  white: '#FFFFFF',
};

function isAtLeast18(dob: Date): boolean {
  const today = new Date();
  const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return dob <= eighteenYearsAgo;
}

function toISODateOnly(d: Date) {
  // YYYY-MM-DD (safe for DB date column)
  return d.toISOString().split('T')[0];
}

function isValidEmail(v: string) {
  // simple safe check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizeIraqPhoneToE164(input: string) {
  // Accept: "0750...." OR "750...." OR "+964750...."
  // Returns "+9647xxxxxxxxx"
  const raw = (input || '').trim().replace(/[^\d+]/g, '');

  if (!raw) return '';

  // if already +964...
  if (raw.startsWith('+964')) {
    const after = raw.replace('+', '');
    // ensure only digits after +
    return `+${after.replace(/[^\d]/g, '')}`;
  }

  // remove any leading zeros
  let digits = raw.replace(/[^\d]/g, '');
  while (digits.startsWith('0')) digits = digits.slice(1);

  // if user typed country code without plus (964...)
  if (digits.startsWith('964')) {
    return `+${digits}`;
  }

  // default Iraq
  return `+964${digits}`;
}

export default function CreateAccount() {
  const router = useRouter();
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('Iraq');
  const [phone, setPhone] = useState<string>('');
  const [dob, setDob] = useState<Date | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);

  const minDate = useMemo(() => new Date(1940, 0, 1), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const [openDob, setOpenDob] = useState<boolean>(false);
  const [tempDob, setTempDob] = useState<Date>(new Date(1995, 0, 1));
  const [isCreating, setIsCreating] = useState<boolean>(false);

  function handleDobChange(date: Date) {
    if (!isAtLeast18(date)) {
      setDob(null);
      setDobError(i18n.t('mustBe18'));
      return;
    }
    setDob(date);
    setDobError(null);
  }

  async function createAccount() {
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCity = city.trim();
    const cleanCountry = country.trim() || 'Iraq';
    const cleanPassword = password; // keep as is (spaces could be intended)

    if (!cleanFullName || !cleanEmail || !cleanPassword || !cleanCity || !phone.trim() || !cleanCountry) {
      Alert.alert(i18n.t('error'), i18n.t('completeAllFields'));
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert(i18n.t('error'), i18n.t('invalidEmail') || 'Invalid email');
      return;
    }

    if (cleanPassword.length < 6) {
      Alert.alert(i18n.t('error'), i18n.t('passwordTooShort') || 'Password must be at least 6 characters');
      return;
    }

    if (!dob) {
      Alert.alert(i18n.t('error'), i18n.t('pleaseSelectDOB'));
      return;
    }

    const age = Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      Alert.alert(i18n.t('error'), i18n.t('mustBe18'));
      return;
    }

    const phoneE164 = normalizeIraqPhoneToE164(phone);
    if (!phoneE164 || phoneE164.length < 8) {
      Alert.alert(i18n.t('error'), i18n.t('invalidPhone') || 'Invalid phone number');
      return;
    }

    setIsCreating(true);
    try {
      const dobISO = toISODateOnly(dob);

      /**
       * ✅ IMPORTANT FIX:
       * Many Supabase projects have a DB trigger on auth.users that reads raw_user_meta_data
       * and inserts into profiles. If you send extra fields (city/country/phone/dob) and any
       * column/constraint/type mismatch exists, signup fails with:
       * "Database error saving new user"
       *
       * So we only send safe metadata (full_name).
       */
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo: 'zenopay://confirm',
          data: {
            full_name: cleanFullName,
          },
        },
      });

      if (error) {
        Alert.alert(i18n.t('error'), error.message);
        return;
      }

      const userId = data?.user?.id;
      if (!userId) {
        Alert.alert(i18n.t('error'), 'Failed to create user. Please try again.');
        return;
      }

      /**
       * ✅ If email confirmation is ON:
       * data.session will be null -> user is NOT authenticated yet
       * => profile upsert will fail under RLS (anon).
       *
       * So we only upsert when a session exists.
       * If session is null, we pass profile fields to email-verification screen and finish later.
       */
      const hasSession = !!data?.session;

      if (hasSession) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: userId,
            email: cleanEmail,
            full_name: cleanFullName,
            date_of_birth: dobISO,
            city: cleanCity,
            country: cleanCountry,
            phone: phoneE164,
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          Alert.alert(i18n.t('error'), profileError.message);
          return;
        }

        router.replace('/(auth)/email-verification' as any);
        return;
      }

      // Email confirmation flow (no session yet)
      router.replace({
        pathname: '/(auth)/email-verification' as any,
        params: {
          email: cleanEmail,
          // pass pending profile info to complete after verification/login
          pending_full_name: cleanFullName,
          pending_city: cleanCity,
          pending_country: cleanCountry,
          pending_phone: phoneE164,
          pending_dob: dobISO,
        },
      } as any);
    } catch (e: any) {
      Alert.alert(i18n.t('error'), e?.message ?? 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.green} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('createAccount')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('fullName')}</Text>
            <TextInput
              placeholder={i18n.t('fullName')}
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('email')}</Text>
            <TextInput
              placeholder={i18n.t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('password')}</Text>
            <TextInput
              placeholder={i18n.t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('dateOfBirth')}</Text>
            <TouchableOpacity
              testID="dob-open"
              onPress={() => {
                setTempDob(dob ?? new Date(1995, 0, 1));
                setOpenDob(true);
              }}
              activeOpacity={0.85}
              style={styles.dobButton}
            >
              <Text style={styles.dobText}>
                {dob
                  ? dob.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : i18n.t('dateOfBirth')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={COLORS.green} />
            </TouchableOpacity>
          </View>

          {Platform.OS === 'android' ? (
            openDob ? (
              <DateTimePicker
                value={dob ?? new Date(1995, 0, 1)}
                mode="date"
                display="default"
                maximumDate={maxDate}
                minimumDate={minDate}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  setOpenDob(false);
                  if (event.type === 'set' && date) handleDobChange(date);
                }}
              />
            ) : null
          ) : Platform.OS === 'web' ? (
            <Modal visible={openDob} transparent animationType="fade" onRequestClose={() => setOpenDob(false)}>
              <Pressable testID="dob-backdrop" style={styles.dobModalBackdrop} onPress={() => setOpenDob(false)}>
                <Pressable style={styles.dobModalCard} onPress={() => null}>
                  <Text style={styles.dobModalTitle}>{i18n.t('dateOfBirth')}</Text>

                  <View style={styles.webDatePickerContainer}>
                    <input
                      type="date"
                      value={tempDob.toISOString().split('T')[0]}
                      min={minDate.toISOString().split('T')[0]}
                      max={maxDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value + 'T00:00:00');
                        if (!isNaN(newDate.getTime())) setTempDob(newDate);
                      }}
                      style={{
                        width: '100%',
                        padding: 16,
                        fontSize: 18,
                        borderRadius: 12,
                        border: `1px solid ${COLORS.border}`,
                        backgroundColor: COLORS.white,
                        color: COLORS.text,
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial',
                        outline: 'none',
                        appearance: 'none',
                        cursor: 'pointer',
                        minHeight: 48,
                        boxSizing: 'border-box',
                      }}
                    />
                  </View>

                  <View style={styles.dobModalActions}>
                    <TouchableOpacity
                      testID="dob-cancel"
                      onPress={() => setOpenDob(false)}
                      activeOpacity={0.85}
                      style={styles.dobActionSecondary}
                    >
                      <Text style={styles.dobActionSecondaryText}>{i18n.t('cancel')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      testID="dob-confirm"
                      onPress={() => {
                        handleDobChange(tempDob);
                        setOpenDob(false);
                      }}
                      activeOpacity={0.85}
                      style={styles.dobActionPrimary}
                    >
                      <Text style={styles.dobActionPrimaryText}>{i18n.t('confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          ) : (
            <Modal visible={openDob} transparent animationType="fade" onRequestClose={() => setOpenDob(false)}>
              <Pressable testID="dob-backdrop" style={styles.dobModalBackdrop} onPress={() => setOpenDob(false)}>
                <Pressable style={styles.dobModalCard} onPress={() => null}>
                  <Text style={styles.dobModalTitle}>{i18n.t('dateOfBirth')}</Text>

                  <View style={styles.iosPickerContainer}>
                    <DateTimePicker
                      value={tempDob}
                      mode="date"
                      display="spinner"
                      maximumDate={maxDate}
                      minimumDate={minDate}
                      textColor={COLORS.text}
                      onChange={(event: DateTimePickerEvent, date?: Date) => {
                        if (date) setTempDob(date);
                      }}
                    />
                  </View>

                  <View style={styles.dobModalActions}>
                    <TouchableOpacity
                      testID="dob-cancel"
                      onPress={() => setOpenDob(false)}
                      activeOpacity={0.85}
                      style={styles.dobActionSecondary}
                    >
                      <Text style={styles.dobActionSecondaryText}>{i18n.t('cancel')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      testID="dob-confirm"
                      onPress={() => {
                        handleDobChange(tempDob);
                        setOpenDob(false);
                      }}
                      activeOpacity={0.85}
                      style={styles.dobActionPrimary}
                    >
                      <Text style={styles.dobActionPrimaryText}>{i18n.t('confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          )}

          {dobError ? <Text style={styles.errorText}>{dobError}</Text> : null}

          <Text style={styles.complianceText}>{i18n.t('mustBe18OrOlder')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('city')}</Text>
            <TextInput
              placeholder={i18n.t('city')}
              value={city}
              onChangeText={setCity}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('country')}</Text>
            <TextInput
              placeholder={i18n.t('country')}
              value={country}
              onChangeText={setCountry}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('phoneLabel') || 'Phone'}</Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.phonePrefix}>+964</Text>
              <TextInput
                placeholder={i18n.t('phonePlaceholder')}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                style={styles.phoneInput}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={createAccount}
            style={[styles.createBtn, (isCreating || !!dobError || !dob) && styles.createBtnDisabled]}
            disabled={isCreating || !!dobError || !dob}
            activeOpacity={0.9}
          >
            {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>{i18n.t('createAccount')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.9}>
            <Text style={styles.backText}>{i18n.t('alreadyHaveAccountShort')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 26 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  backIconBtn: { padding: 6, borderRadius: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900' as const, color: COLORS.text },

  container: { flex: 1 },
  content: { padding: 20, paddingTop: 18 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center' as const,
  },

  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
  },

  dobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dobText: { fontSize: 16, color: COLORS.text, fontWeight: '700' as const },

  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  phonePrefix: { fontSize: 16, fontWeight: '800' as const, color: COLORS.text, marginRight: 8 },
  phoneInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: COLORS.text },

  createBtn: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' as const },
  createBtnDisabled: { opacity: 0.5 },

  backBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 6 },
  backText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800' as const,
    textDecorationLine: 'underline' as const,
  },

  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 10,
    fontWeight: '700' as const,
  },
  complianceText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: -6,
    marginBottom: 12,
    fontWeight: '600' as const,
  },

  dobModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  dobModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.08)',
  },
  dobModalTitle: { fontSize: 16, fontWeight: '900' as const, color: COLORS.text, marginBottom: 12 },

  iosPickerContainer: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden' },
  webDatePickerContainer: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'visible', marginBottom: 8 },

  dobModalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  dobActionSecondary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dobActionSecondaryText: { fontSize: 15, fontWeight: '900' as const, color: COLORS.text },
  dobActionPrimary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.green,
  },
  dobActionPrimaryText: { fontSize: 15, fontWeight: '900' as const, color: '#FFFFFF' },
});

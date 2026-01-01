import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet, Modal, Platform, Pressable } from 'react-native';
import { useMemo, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '@/lib/i18n';

function isAtLeast18(dob: Date): boolean {
  const today = new Date();
  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );
  return dob <= eighteenYearsAgo;
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

  const [idFront, setIdFront] = useState<any>(null);
  const [idBack, setIdBack] = useState<any>(null);
  const [selfie, setSelfie] = useState<any>(null);

  function handleDobChange(date: Date) {
    if (!isAtLeast18(date)) {
      setDob(null);
      setDobError(i18n.t('mustBe18'));
      return;
    }
    setDob(date);
    setDobError(null);
  }

  async function pickImage(setter: Function) {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled) setter(res.assets[0]);
  }

  async function createAccount() {
    if (!fullName || !email || !password || !city || !phone) {
      Alert.alert(i18n.t('error'), i18n.t('completeAllFields'));
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

    if (!idFront || !idBack || !selfie) {
      Alert.alert(i18n.t('error'), i18n.t('uploadAllKycDocs'));
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'zenopay://confirm',
          data: {
            full_name: fullName,
            city,
            country,
            phone: `+964${phone}`,
            date_of_birth: dob.toISOString().split('T')[0],
            kyc_front_uri: idFront.uri,
            kyc_back_uri: idBack.uri,
            kyc_selfie_uri: selfie.uri,
          },
        },
      });

      if (error) {
        Alert.alert(i18n.t('error'), error.message);
        return;
      }

      router.replace('/(auth)/email-verification' as any);
    } catch (error: any) {
      Alert.alert(i18n.t('error'), error.message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#F9FAFB', '#F3F4F6', '#E5E7EB']} style={styles.gradient}>
        <View style={styles.content}>
          <Text style={styles.title}>{i18n.t('createAccount')}</Text>

          <TextInput 
            placeholder={i18n.t('fullName')} 
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            placeholderTextColor="#999"
          />
          
          <TextInput 
            placeholder={i18n.t('email')} 
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#999"
          />
          
          <TextInput 
            placeholder={i18n.t('password')} 
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#999"
          />

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
          </TouchableOpacity>

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
                  if (event.type === 'set' && date) {
                    handleDobChange(date);
                  }
                }}
              />
            ) : null
          ) : Platform.OS === 'web' ? (
            <Modal
              visible={openDob}
              transparent
              animationType="fade"
              onRequestClose={() => setOpenDob(false)}
            >
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
                        if (!isNaN(newDate.getTime())) {
                          setTempDob(newDate);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: 16,
                        fontSize: 16,
                        borderRadius: 12,
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#FFFFFF',
                        color: '#111827',
                        fontFamily: 'system-ui',
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
            <Modal
              visible={openDob}
              transparent
              animationType="fade"
              onRequestClose={() => setOpenDob(false)}
            >
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
                      textColor="#111827"
                      onChange={(event: DateTimePickerEvent, date?: Date) => {
                        console.log('DOB picker onChange:', { type: event.type, date: date?.toISOString() });
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

          {dobError && (
            <Text style={styles.errorText}>{dobError}</Text>
          )}

          <Text style={styles.complianceText}>
            {i18n.t('mustBe18OrOlder')}
          </Text>

          <TextInput 
            placeholder={i18n.t('city')} 
            value={city}
            onChangeText={setCity}
            style={styles.input}
            placeholderTextColor="#999"
          />
          
          <TextInput 
            placeholder={i18n.t('country')} 
            value={country}
            onChangeText={setCountry}
            style={styles.input}
            placeholderTextColor="#999"
          />

          <View style={styles.phoneContainer}>
            <Text style={styles.phonePrefix}>+964</Text>
            <TextInput
              placeholder={i18n.t('phonePlaceholder')}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={styles.phoneInput}
              placeholderTextColor="#999"
            />
          </View>

          <Text style={styles.sectionTitle}>{i18n.t('kycDocuments')}</Text>

          <TouchableOpacity onPress={() => pickImage(setIdFront)} style={styles.uploadBtn}>
            <Text style={styles.uploadText}>{idFront ? `${i18n.t('idFrontSelected')} ✅` : i18n.t('uploadIDFront')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pickImage(setIdBack)} style={styles.uploadBtn}>
            <Text style={styles.uploadText}>{idBack ? `${i18n.t('idBackSelected')} ✅` : i18n.t('uploadIDBack')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pickImage(setSelfie)} style={styles.uploadBtn}>
            <Text style={styles.uploadText}>{selfie ? `${i18n.t('selfieSelected')} ✅` : i18n.t('uploadSelfie')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={createAccount}
            style={[styles.createBtn, (isCreating || dobError || !dob) && styles.createBtnDisabled]}
            disabled={isCreating || !!dobError || !dob}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createBtnText}>{i18n.t('createAccount')}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{i18n.t('alreadyHaveAccountShort')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
    color: '#000',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  uploadBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  createBtn: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    color: '#6B7280',
    fontSize: 14,
  },
  dobButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
  },
  dobText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
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
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.08)',
  },
  dobModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  dobPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webDatePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dobModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  dobActionSecondary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dobActionSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  dobActionPrimary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  dobActionPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: -12,
    marginBottom: 12,
    fontWeight: '500',
  },
  complianceText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 16,
    fontWeight: '400',
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
});

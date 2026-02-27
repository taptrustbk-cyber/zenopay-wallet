import React, { useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';

export default function TermsConditionsScreen() {
  const router = useRouter();
  const goingBackRef = useRef(false);

  const goBackSafe = () => {
    if (goingBackRef.current) return; // ✅ prevent double click
    goingBackRef.current = true;
    router.back();
    setTimeout(() => {
      goingBackRef.current = false;
    }, 700);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackSafe} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#111111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('termsConditions')}</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top card */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>{i18n.t('tcNewTitle')}</Text>
          <Text style={styles.lastUpdated}>{i18n.t('tcNewLastUpdated')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.introText}>{i18n.t('tcNewIntro')}</Text>
        </View>

        {/* 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. {i18n.t('tcNewSection1Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection1Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection1Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection1Item3')}</Text>
        </View>

        {/* 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. {i18n.t('tcNewSection2Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection2Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection2Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection2Item3')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection2Item4')}</Text>
        </View>

        {/* 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. {i18n.t('tcNewSection3Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection3Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection3Item2')}</Text>
        </View>

        {/* 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. {i18n.t('tcNewSection4Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection4Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection4Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection4Item3')}</Text>
        </View>

        {/* 5 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. {i18n.t('tcNewSection5Title')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcNewSection5Desc')}</Text>

          <Text style={[styles.bulletItem, { marginTop: 10 }]}>• {i18n.t('tcNewSection5Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection5Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection5Item3')}</Text>

          <Text style={[styles.sectionText, { marginTop: 10 }]}>{i18n.t('tcNewSection5Desc2')}</Text>
        </View>

        {/* 6 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. {i18n.t('tcNewSection6Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection6Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection6Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection6Item3')}</Text>
        </View>

        {/* 7 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. {i18n.t('tcNewSection7Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection7Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection7Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection7Item3')}</Text>
        </View>

        {/* 8 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. {i18n.t('tcNewSection8Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection8Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection8Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection8Item3')}</Text>
        </View>

        {/* 9 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. {i18n.t('tcNewSection9Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection9Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection9Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection9Item3')}</Text>
        </View>

        {/* 10 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. {i18n.t('tcNewSection10Title')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcNewSection10Desc')}</Text>

          <Text style={[styles.bulletItem, { marginTop: 10 }]}>• {i18n.t('tcNewSection10Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection10Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection10Item3')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection10Item4')}</Text>

          <Text style={[styles.sectionText, { marginTop: 10 }]}>{i18n.t('tcNewSection10Desc2')}</Text>
        </View>

        {/* 11 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. {i18n.t('tcNewSection11Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection11Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection11Item2')}</Text>
        </View>

        {/* 12 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. {i18n.t('tcNewSection12Title')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcNewSection12Desc')}</Text>
          <Text style={[styles.sectionText, { marginTop: 10 }]}>{i18n.t('tcNewSection12Desc2')}</Text>

          <Text style={[styles.bulletItem, { marginTop: 10 }]}>• {i18n.t('tcNewSection12Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection12Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection12Item3')}</Text>

          <Text style={[styles.sectionText, { marginTop: 10 }]}>{i18n.t('tcNewSection12Desc3')}</Text>
        </View>

        {/* 13 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. {i18n.t('tcNewSection13Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection13Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection13Item2')}</Text>
        </View>

        {/* Platform Notice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcPlatformNoticeTitle')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcPlatformNoticeIntro')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            2. {i18n.t('tcPlatformNotice2Title')}
          </Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice2Item1')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            3. {i18n.t('tcPlatformNotice3Title')}
          </Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice3Item1')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            4. {i18n.t('tcPlatformNotice4Title')}
          </Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice4Item1')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            5. {i18n.t('tcPlatformNotice5Title')}
          </Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice5Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice5Item2')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            6. {i18n.t('tcPlatformNotice6Title')}
          </Text>
          <Text style={styles.sectionText}>{i18n.t('tcPlatformNotice6Desc')}</Text>

          {/* ✅ NEW: Contact + Severability */}
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            7. {i18n.t('tcPlatformNotice7Title')}
          </Text>

          <View style={styles.contactBox}>
            <Ionicons name="mail" size={20} color="#16a34a" />
            <Text style={styles.contactEmail}>info@zenopay.bond</Text>
          </View>

          <Text style={[styles.bulletItem, { marginTop: 10 }]}>• {i18n.t('tcPlatformNotice7Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice7Item2')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            8. {i18n.t('tcPlatformNotice8Title')}
          </Text>
          <Text style={styles.sectionText}>{i18n.t('tcPlatformNotice8Desc')}</Text>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

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
  backButton: { padding: 6, borderRadius: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111111' },

  content: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingBottom: 10 },

  headerSection: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
    color: '#111111',
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    color: '#6B7280',
    fontWeight: '600',
  },

  section: { marginHorizontal: 20, marginTop: 22 },
  introText: { fontSize: 16, lineHeight: 26, color: '#111111', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10, color: '#111111' },
  sectionText: { fontSize: 16, lineHeight: 26, color: '#111111', fontWeight: '600' },
  bulletItem: {
    fontSize: 16,
    lineHeight: 28,
    color: '#111111',
    fontWeight: '600',
    marginTop: 6,
  },

  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  contactEmail: { fontSize: 16, fontWeight: '800', color: '#16a34a' },
});

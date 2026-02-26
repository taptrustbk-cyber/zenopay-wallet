import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';

export default function TermsConditionsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#111111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('termsConditions')}</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Top card */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>{i18n.t('termsConditions')}</Text>
          <Text style={styles.lastUpdated}>{i18n.t('tcNewLastUpdated')}</Text>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>{i18n.t('back') ?? 'Back'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.introText}>{i18n.t('tcNewIntro')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection1Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection1Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection1Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection1Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection2Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection2Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection2Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection2Item3')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection2Item4')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection3Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection3Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection3Item2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection4Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection4Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection4Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection4Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection5Title')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcNewSection5Desc')}</Text>
          <Text style={[styles.bulletItem, { marginTop: 10 }]}>• {i18n.t('tcNewSection5Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection5Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection5Item3')}</Text>
          <Text style={[styles.sectionText, { marginTop: 10 }]}>{i18n.t('tcNewSection5Desc2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection6Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection6Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection6Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection6Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection7Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection7Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection7Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection7Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection8Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection8Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection8Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection8Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection9Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection9Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection9Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection9Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection10Title')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcNewSection10Desc')}</Text>
          <Text style={[styles.bulletItem, { marginTop: 10 }]}>• {i18n.t('tcNewSection10Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection10Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection10Item3')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection10Item4')}</Text>
          <Text style={[styles.sectionText, { marginTop: 10 }]}>{i18n.t('tcNewSection10Desc2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection11Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection11Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection11Item2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection12Title')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcNewSection12Desc')}</Text>
          <Text style={[styles.sectionText, { marginTop: 10 }]}>{i18n.t('tcNewSection12Desc2')}</Text>
          <Text style={[styles.bulletItem, { marginTop: 10 }]}>• {i18n.t('tcNewSection12Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection12Item2')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection12Item3')}</Text>
          <Text style={[styles.sectionText, { marginTop: 10 }]}>{i18n.t('tcNewSection12Desc3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection13Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection13Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection13Item2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection14Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection14Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcNewSection14Item2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcNewSection15Title')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcNewSection15Desc')}</Text>

          <View style={styles.contactBox}>
            <Ionicons name="mail" size={20} color="#16a34a" />
            <Text style={styles.contactEmail}>info@zenopay.bond</Text>
          </View>
        </View>

        {/* ✅ NEW: Platform Notice (your requested text, safer wording) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('tcPlatformNoticeTitle')}</Text>

          <Text style={styles.sectionText}>{i18n.t('tcPlatformNoticeIntro')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{i18n.t('tcPlatformNotice2Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice2Item1')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{i18n.t('tcPlatformNotice3Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice3Item1')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{i18n.t('tcPlatformNotice4Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice4Item1')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{i18n.t('tcPlatformNotice5Title')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice5Item1')}</Text>
          <Text style={styles.bulletItem}>• {i18n.t('tcPlatformNotice5Item2')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{i18n.t('tcPlatformNotice6Title')}</Text>
          <Text style={styles.sectionText}>{i18n.t('tcPlatformNotice6Desc')}</Text>
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
    fontWeight: '800',
    color: '#111111',
  },

  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 10,
  },

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

  primaryButton: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  section: {
    marginHorizontal: 20,
    marginTop: 22,
  },
  introText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#111111',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    color: '#111111',
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#111111',
    fontWeight: '600',
  },
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
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
  },
});

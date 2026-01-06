import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import i18n from '@/lib/i18n';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{i18n.t('privacyPolicy')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerSection, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.mainTitle, { color: theme.colors.text }]}>{i18n.t('privacyPolicy')}</Text>
          <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>{i18n.t('ppLastUpdated')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppIntro')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection1Title')}</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.primary, fontSize: 15, marginTop: 8 }]}>{i18n.t('ppPersonalInfo')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('ppPersonalInfoDesc')}</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppPersonalInfoItem1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppPersonalInfoItem2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppPersonalInfoItem3')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppPersonalInfoItem4')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppPersonalInfoItem5')}</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.primary, fontSize: 15, marginTop: 12 }]}>{i18n.t('ppUsageInfo')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('ppUsageInfoDesc')}</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppUsageInfoItem1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppUsageInfoItem2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppUsageInfoItem3')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppUsageInfoItem4')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection2Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection2Desc')}</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection2Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection2Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection2Item3')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection2Item4')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection2Item5')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection2Item6')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection3Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection3Desc')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection4Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection4Desc')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection5Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection5Desc1')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('ppNewSection5Desc2')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('ppNewSection5Desc3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection6Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection6Desc')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('ppNewSection6Desc2')}</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection6Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection6Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection6Item3')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection7Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection7Desc')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('ppNewSection7Desc2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection8Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection8Desc')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection9Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection9Desc')}</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection9Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection9Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('ppNewSection9Item3')}</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('ppNewSection9Desc2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection10Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection10Desc')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection11Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection11Desc')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('ppNewSection11Desc2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('ppNewSection12Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('ppNewSection12Desc')}</Text>
          <View style={[styles.contactBox, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="mail" size={20} color={theme.colors.primary} />
            <Text style={[styles.contactEmail, { color: theme.colors.primary }]}>info@zenopay.bond</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 26,
  },
  lastUpdated: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  introText: {
    fontSize: 15,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sectionNumber: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  bulletList: {
    marginTop: 12,
    paddingLeft: 8,
  },
  bulletItem: {
    fontSize: 15,
    lineHeight: 26,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});

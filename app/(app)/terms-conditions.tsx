import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import i18n from '@/lib/i18n';

export default function TermsConditionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{i18n.t('termsConditions')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerSection, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.mainTitle, { color: theme.colors.text }]}>{i18n.t('termsConditions')}</Text>
          <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>{i18n.t('tcNewLastUpdated')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>{i18n.t('tcNewIntro')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection1Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection1Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection1Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection1Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection2Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection2Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection2Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection2Item3')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection2Item4')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection3Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection3Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection3Item2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection4Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection4Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection4Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection4Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection5Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('tcNewSection5Desc')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection5Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection5Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection5Item3')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('tcNewSection5Desc2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection6Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection6Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection6Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection6Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection7Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection7Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection7Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection7Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection8Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection8Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection8Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection8Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection9Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection9Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection9Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection9Item3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection10Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('tcNewSection10Desc')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection10Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection10Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection10Item3')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection10Item4')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('tcNewSection10Desc2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection11Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection11Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection11Item2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection12Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('tcNewSection12Desc')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('tcNewSection12Desc2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection12Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection12Item2')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection12Item3')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>{i18n.t('tcNewSection12Desc3')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection13Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection13Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection13Item2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection14Title')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection14Item1')}</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• {i18n.t('tcNewSection14Item2')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcNewSection15Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{i18n.t('tcNewSection15Desc')}</Text>
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

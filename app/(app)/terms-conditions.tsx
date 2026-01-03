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
          <Text style={[styles.mainTitle, { color: theme.colors.text }]}>
            {i18n.t('tcMainTitle')}
          </Text>
          <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcLastUpdated')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcIntro')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection1Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection1Text')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection2Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection2Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection2Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection2Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection2Item3')}</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            {i18n.t('tcSection2Text2')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection3Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection3Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection3Item1')}</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            {i18n.t('tcSection3Text2')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection3Item3')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection3Item4')}</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            {i18n.t('tcSection3Text3')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection4Title')}</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection4Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection4Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection4Item3')}</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            {i18n.t('tcSection4Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection4Item4')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection4Item5')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection4Item6')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection6Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection6Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection6Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection6Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection6Item3')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection6Item4')}</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            {i18n.t('tcSection6Text2')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection7Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection7Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection7Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection7Item2')}</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            {i18n.t('tcSection7Text2')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection8Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection8Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection8Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection8Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('tcSection8Item3')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection9Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection9Text')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection10Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection10Text')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{i18n.t('tcSection11Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('tcSection11Text')}
          </Text>
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

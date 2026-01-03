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
          <Text style={[styles.mainTitle, { color: theme.colors.text }]}>
            {i18n.t('ppMainTitle')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: theme.colors.primary }]}>{i18n.t('ppSection1Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppSection1Text')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: theme.colors.primary }]}>{i18n.t('ppSection2Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppSection2Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection2Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection2Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection2Item3')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection2Item4')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection2Item5')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection2Item6')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: theme.colors.primary }]}>{i18n.t('ppSection3Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppSection3Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection3Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection3Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection3Item3')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection3Item4')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection3Item5')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: theme.colors.primary }]}>{i18n.t('ppSection4Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppSection4Text')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: theme.colors.primary }]}>{i18n.t('ppSection5Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppSection5Text')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: theme.colors.primary }]}>{i18n.t('ppSection6Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppSection6Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection6Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection6Item2')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: theme.colors.primary }]}>{i18n.t('ppSection7Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppSection7Text')}
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection7Item1')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection7Item2')}</Text>
            <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>{i18n.t('ppSection7Item3')}</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            {i18n.t('ppSection7Text2')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: theme.colors.primary }]}>{i18n.t('ppSection8Title')}</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
            {i18n.t('ppSection8Text')}
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
  section: {
    marginHorizontal: 20,
    marginTop: 24,
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

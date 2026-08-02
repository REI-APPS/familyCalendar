import { View, Text, ScrollView, StyleSheet, Image, Linking, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../src/lib/theme';
import { LangSwitcher } from '../src/lib/LangSwitcher';

const CONTACT_EMAIL = 'suporte@familycalendar.grouprei.com';
const SITE_URL = 'https://familycalendar.grouprei.com';

export default function About() {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LangSwitcher />
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>{t('legal.about_title')}</Text>
        <Text style={styles.tagline}>{t('legal.about_tagline')}</Text>
      </View>

      <Section title={t('legal.about_what_title')}>
        <Text style={styles.p}>{t('legal.about_what_body')}</Text>
      </Section>

      <Section title={t('legal.about_features_title')}>
        {[1,2,3,4,5,6,7,8].map((i) => (
          <Bullet key={i}>{t(`legal.about_feat_${i}` as any)}</Bullet>
        ))}
      </Section>

      <Section title={t('legal.about_privacy_title')}>
        <Text style={styles.p}>{t('legal.about_privacy_body')}</Text>
        <TextLink onPress={() => Linking.openURL('/terms')}>{t('legal.terms_page_title')}</TextLink>
      </Section>

      <Section title={t('legal.about_contact_title')}>
        <Text style={styles.p}>{t('legal.about_contact_body')}</Text>
        <TextLink onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>{CONTACT_EMAIL}</TextLink>
      </Section>

      <Section title={t('legal.about_delete_title')}>
        <Text style={styles.p}>{t('legal.about_delete_body')}</Text>
        <TextLink onPress={() => Linking.openURL('/delete-account')}>{t('legal.delete_title')}</TextLink>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.small}>© 2026 · Grouprei</Text>
        <TextLink onPress={() => Linking.openURL(SITE_URL)}>{SITE_URL}</TextLink>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.p, { flex: 1 }]}>{children}</Text>
    </View>
  );
}
function TextLink({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 40, backgroundColor: colors.background, minHeight: '100%' as any },
  header: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.md },
  logo: { width: 96, height: 96, borderRadius: 24, marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  tagline: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  p: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  link: { fontSize: 14, color: colors.brand, fontWeight: '700', textDecorationLine: 'underline', marginTop: 6 },
  bulletRow: { flexDirection: 'row', marginTop: 4 },
  bulletDot: { fontSize: 14, color: colors.brand, marginRight: 8, fontWeight: '800' },
  footer: { alignItems: 'center', marginTop: spacing.lg, gap: 6 },
  small: { fontSize: 12, color: colors.textSecondary },
});

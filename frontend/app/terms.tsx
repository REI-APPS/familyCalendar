import { View, Text, ScrollView, StyleSheet, Linking, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../src/lib/theme';
import { LangSwitcher } from '../src/lib/LangSwitcher';

const CONTACT_EMAIL = 'suporte@familycalendar.grouprei.com';

export default function Terms() {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LangSwitcher />
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>{t('legal.terms_page_title')}</Text>
        <Text style={styles.tagline}>{t('legal.terms_last_updated')}</Text>
      </View>

      <Section title={t('legal.terms_1_title')}><P>{t('legal.terms_1_body')}</P></Section>
      <Section title={t('legal.terms_2_title')}><P>{t('legal.terms_2_body')}</P></Section>
      <Section title={t('legal.terms_3_title')}>
        <P>{t('legal.terms_3_body_1')}</P>
        <P>{t('legal.terms_3_body_2')}</P>
      </Section>
      <Section title={t('legal.terms_4_title')}>
        <P>{t('legal.terms_4_intro')}</P>
        {[1,2,3,4,5].map(i => <Bullet key={i}>{t(`legal.terms_4_${i}` as any)}</Bullet>)}
        <P>{t('legal.terms_4_no')}</P>
      </Section>
      <Section title={t('legal.terms_5_title')}>
        {[1,2,3,4].map(i => <Bullet key={i}>{t(`legal.terms_5_${i}` as any)}</Bullet>)}
        <P>{t('legal.terms_5_no_sell')}</P>
      </Section>
      <Section title={t('legal.terms_6_title')}>
        <P>{t('legal.terms_6_body_1')}</P>
        <P>{t('legal.terms_6_body_2')}</P>
      </Section>
      <Section title={t('legal.terms_7_title')}>
        <P>{t('legal.terms_7_body')}</P>
        <TextLink onPress={() => Linking.openURL('/delete-account')}>{t('legal.delete_title')}</TextLink>
      </Section>
      <Section title={t('legal.terms_8_title')}>
        <P>{t('legal.terms_8_intro')}</P>
        {[1,2,3,4,5].map(i => <Bullet key={i}>{t(`legal.terms_8_${i}` as any)}</Bullet>)}
      </Section>
      <Section title={t('legal.terms_9_title')}><P>{t('legal.terms_9_body')}</P></Section>
      <Section title={t('legal.terms_10_title')}><P>{t('legal.terms_10_body')}</P></Section>
      <Section title={t('legal.terms_11_title')}><P>{t('legal.terms_11_body')}</P></Section>
      <Section title={t('legal.terms_12_title')}>
        <P>{t('legal.terms_12_body')}</P>
        <TextLink onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>{CONTACT_EMAIL}</TextLink>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.small}>© 2026 · Grouprei</Text>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>);
}
function P({ children }: { children: React.ReactNode }) { return <Text style={styles.p}>{children}</Text>; }
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.p, { flex: 1 }]}>{children}</Text>
    </View>
  );
}
function TextLink({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (<Pressable onPress={onPress}><Text style={styles.link}>{children}</Text></Pressable>);
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 40, backgroundColor: colors.background, minHeight: '100%' as any },
  header: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.md },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 12 },
  appName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  tagline: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  p: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: 4 },
  link: { fontSize: 14, color: colors.brand, fontWeight: '700', textDecorationLine: 'underline', marginTop: 6 },
  bulletRow: { flexDirection: 'row', marginTop: 4 },
  bulletDot: { fontSize: 14, color: colors.brand, marginRight: 8, fontWeight: '800' },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  small: { fontSize: 12, color: colors.textSecondary },
});

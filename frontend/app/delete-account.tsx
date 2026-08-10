import { View, Text, ScrollView, StyleSheet, Linking, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../src/lib/theme';
import { LangSwitcher } from '../src/lib/LangSwitcher';

const CONTACT_EMAIL = 'suporte@familycalendar.grouprei.com';

export default function DeleteAccount() {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LangSwitcher />
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>{t('legal.delete_title')}</Text>
        <Text style={styles.tagline}>{t('legal.delete_tagline')}</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('legal.delete_hero_title')}</Text>
        <Text style={styles.heroSubtitle}>{t('legal.delete_hero_subtitle')}</Text>
      </View>

      <Section title={t('legal.delete_opt1_title')} pink>
        {[1,2,3,4,5,6].map(i => (
          <Ordered key={i} n={i}>{t(`legal.delete_opt1_s${i}` as any)}</Ordered>
        ))}
      </Section>

      <Section title={t('legal.delete_opt2_title')}>
        <P>{t('legal.delete_opt2_body_1')}</P>
        <TextLink onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Delete%20account`)}>{CONTACT_EMAIL}</TextLink>
        <P>{t('legal.delete_opt2_body_2')}</P>
      </Section>

      <Section title={t('legal.delete_what_title')}>
        {[1,2,3,4,5].map(i => <Bullet key={i}>{t(`legal.delete_what_${i}` as any)}</Bullet>)}
      </Section>

      <Section title={t('legal.delete_retain_title')}>
        <P>{t('legal.delete_retain_body')}</P>
        <Bullet>{t('legal.delete_retain_1')}</Bullet>
        <Bullet>{t('legal.delete_retain_2')}</Bullet>
        <P>{t('legal.delete_retain_note')}</P>
      </Section>

      <Section title={t('legal.delete_owner_title')}>
        <P>{t('legal.delete_owner_body_1')}</P>
        <P>{t('legal.delete_owner_body_2')}</P>
      </Section>

      <Section title={t('legal.delete_deadline_title')}>
        <P>{t('legal.delete_deadline_body')}</P>
      </Section>

      <Section title={t('legal.delete_help_title')}>
        <P>{t('legal.delete_help_body')}</P>
        <TextLink onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>{CONTACT_EMAIL}</TextLink>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.small}>© 2026 · Grouprei</Text>
      </View>
    </ScrollView>
  );
}

function Section({ title, children, pink }: { title: string; children: React.ReactNode; pink?: boolean }) {
  return (<View style={[styles.section, pink && styles.pinkSection]}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>);
}
function P({ children }: { children: React.ReactNode }) { return <Text style={styles.p}>{children}</Text>; }
function Bullet({ children }: { children: React.ReactNode }) {
  return (<View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={[styles.p, { flex: 1, marginTop: 0 }]}>{children}</Text></View>);
}
function Ordered({ n, children }: { n: number; children: React.ReactNode }) {
  return (<View style={styles.orderedRow}><View style={styles.orderedBubble}><Text style={styles.orderedNum}>{n}</Text></View><Text style={[styles.p, { flex: 1, marginTop: 0 }]}>{children}</Text></View>);
}
function TextLink({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (<Pressable onPress={onPress}><Text style={styles.link}>{children}</Text></Pressable>);
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 40, backgroundColor: colors.background, minHeight: '100%' as any },
  header: { alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.md },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 12 },
  appName: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 2, textAlign: 'center' },
  tagline: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  hero: { backgroundColor: colors.brand, borderRadius: radius.lg, padding: spacing.lg, marginVertical: spacing.md, alignItems: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: '#fff', textAlign: 'center', opacity: 0.9 },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  pinkSection: { backgroundColor: '#FFF0F3', borderColor: colors.brand, borderWidth: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  p: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: 4 },
  link: { fontSize: 14, color: colors.brand, fontWeight: '700', textDecorationLine: 'underline', marginTop: 6 },
  bulletRow: { flexDirection: 'row', marginTop: 6 },
  bulletDot: { fontSize: 14, color: colors.brand, marginRight: 8, fontWeight: '800' },
  orderedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  orderedBubble: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  orderedNum: { color: '#fff', fontWeight: '800', fontSize: 13 },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  small: { fontSize: 12, color: colors.textSecondary },
});

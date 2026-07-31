import { View, Text, ScrollView, StyleSheet, Image, Linking, Pressable } from 'react-native';
import { colors, radius, spacing } from '../src/lib/theme';

const CONTACT_EMAIL = 'suporte@familycalendar.grouprei.com';
const GITHUB_URL = 'https://familycalendar.grouprei.com';

export default function About() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>Agenda da Família</Text>
        <Text style={styles.tagline}>Uma agenda partilhada, feita para famílias.</Text>
      </View>

      <Section title="O que é a Agenda da Família?">
        <Text style={styles.p}>
          A Agenda da Família é uma app móvel que ajuda as famílias a organizarem os
          seus horários no dia-a-dia. Cada membro da família pode ter turnos, tarefas
          e compromissos próprios, todos visíveis num único calendário partilhado.
        </Text>
      </Section>

      <Section title="Funcionalidades principais">
        <Bullet>Calendário mensal, semanal e diário partilhado entre todos os membros da família</Bullet>
        <Bullet>Turnos personalizáveis por membro (manhã, tarde, noite, folga, etc.)</Bullet>
        <Bullet>{'Tarefas rápidas do dia com estado \u201cpor fazer\u201d / \u201cfeito\u201d'}</Bullet>
        <Bullet>Convites por email para novos membros aderirem à família</Bullet>
        <Bullet>3 widgets nativos para Android (dia, semana, dia + tarefas)</Bullet>
        <Bullet>Notificação de alterações recentes na próxima quinzena</Bullet>
        <Bullet>Exportação da vista mensal para PDF</Bullet>
        <Bullet>Suporte multi-idioma: Português, English, Español</Bullet>
      </Section>

      <Section title="Privacidade">
        <Text style={styles.p}>
          Os teus dados de família ficam guardados numa base de dados isolada, com
          políticas de segurança ao nível da linha (RLS) que garantem que só os
          membros da tua família têm acesso. Não vendemos nem partilhamos dados
          pessoais com terceiros. Consulta os{' '}
          <TextLink onPress={() => Linking.openURL('/terms')}>Termos & Privacidade</TextLink>{' '}
          para saber mais.
        </Text>
      </Section>

      <Section title="Contacto & Suporte">
        <Text style={styles.p}>
          Dúvidas, problemas ou sugestões? Envia-nos um email:
        </Text>
        <TextLink onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>{CONTACT_EMAIL}</TextLink>
      </Section>

      <Section title="Apagar a tua conta">
        <Text style={styles.p}>
          Podes apagar a tua conta em qualquer momento nos ajustes da app, ou
          consultar as instruções detalhadas em{' '}
          <TextLink onPress={() => Linking.openURL('/delete-account')}>Apagar Conta</TextLink>.
        </Text>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.small}>© 2026 Agenda da Família · Grouprei</Text>
        <TextLink onPress={() => Linking.openURL(GITHUB_URL)}>{GITHUB_URL}</TextLink>
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
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  p: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  link: { fontSize: 14, color: colors.brand, fontWeight: '700', textDecorationLine: 'underline' },
  bulletRow: { flexDirection: 'row', marginTop: 4 },
  bulletDot: { fontSize: 14, color: colors.brand, marginRight: 8, fontWeight: '800' },
  footer: { alignItems: 'center', marginTop: spacing.lg, gap: 6 },
  small: { fontSize: 12, color: colors.textSecondary },
});

import { View, Text, ScrollView, StyleSheet, Linking, Pressable, Image } from 'react-native';
import { colors, radius, spacing } from '../src/lib/theme';

const CONTACT_EMAIL = 'suporte@familycalendar.grouprei.com';
const RESPONSE_TIME = '30 dias';

export default function DeleteAccount() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>Apagar a tua conta</Text>
        <Text style={styles.tagline}>Agenda da Família</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Podes apagar a tua conta a qualquer momento</Text>
        <Text style={styles.heroSubtitle}>Existem duas formas: dentro da App ou por email.</Text>
      </View>

      <Section title="Opção 1 — Apagar dentro da App (recomendado)" pink>
        <Ordered n={1}>Abre a app <B>Agenda da Família</B></Ordered>
        <Ordered n={2}>Faz login com a tua conta</Ordered>
        <Ordered n={3}>Toca no separador <B>Ajustes</B> (canto inferior direito)</Ordered>
        <Ordered n={4}>Desce até à secção <B>Zona de Perigo</B></Ordered>
        <Ordered n={5}>Toca em <B>Apagar Conta</B></Ordered>
        <Ordered n={6}>Confirma a operação — a tua conta é apagada imediatamente</Ordered>
      </Section>

      <Section title="Opção 2 — Pedir por email">
        <P>
          Se não consegues aceder à App, envia-nos um email a partir do endereço da
          tua conta com o assunto {'\u201cApagar conta\u201d'} para:
        </P>
        <TextLink onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Apagar%20conta`)}>
          {CONTACT_EMAIL}
        </TextLink>
        <P>
          Vamos processar o teu pedido no prazo máximo de <B>{RESPONSE_TIME}</B> e
          enviaremos uma confirmação por email.
        </P>
      </Section>

      <Section title="Que dados são apagados?">
        <Bullet>A tua conta de utilizador (email + password)</Bullet>
        <Bullet>Membros que criaste (se fores o dono da família)</Bullet>
        <Bullet>Turnos, tipos de horário e tarefas que criaste</Bullet>
        <Bullet>Convites enviados por ti que ainda estejam pendentes</Bullet>
        <Bullet>Sessão activa em todos os dispositivos</Bullet>
      </Section>

      <Section title="Que dados podem ficar retidos">
        <P>
          Por razões legais, fiscais ou de segurança, podemos reter alguns dados
          durante um período limitado:
        </P>
        <Bullet>Logs de acesso anónimos (até 90 dias, para deteção de fraude)</Bullet>
        <Bullet>Registos de faturação/recibos (não aplicável nesta app — não temos pagamentos)</Bullet>
        <P>Estes dados <B>não</B> permitem identificar-te pessoalmente após a eliminação.</P>
      </Section>

      <Section title="Se és o dono da família">
        <P>
          Se és o proprietário (owner) da família, ao apagares a tua conta a
          família inteira e todos os dados associados são apagados — incluindo os
          horários e tarefas dos outros membros.
        </P>
        <P>
          <B>Alternativa:</B> podes transferir a propriedade da família para outro
          membro antes de apagares a conta, ou remover o teu vínculo à família e
          apagar apenas a tua conta pessoal.
        </P>
      </Section>

      <Section title="Prazo de eliminação">
        <P>
          Os dados são eliminados dos nossos sistemas <B>imediatamente</B> após a
          confirmação. Cópias de backup são apagadas automaticamente no prazo
          máximo de 30 dias.
        </P>
      </Section>

      <Section title="Precisas de ajuda?">
        <P>Envia-nos um email:</P>
        <TextLink onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
          {CONTACT_EMAIL}
        </TextLink>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.small}>© 2026 Agenda da Família · Grouprei</Text>
      </View>
    </ScrollView>
  );
}

function Section({ title, children, pink }: { title: string; children: React.ReactNode; pink?: boolean }) {
  return (
    <View style={[styles.section, pink && styles.pinkSection]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}
function B({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.p, { flex: 1, marginTop: 0 }]}>{children}</Text>
    </View>
  );
}
function Ordered({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={styles.orderedRow}>
      <View style={styles.orderedBubble}>
        <Text style={styles.orderedNum}>{n}</Text>
      </View>
      <Text style={[styles.p, { flex: 1, marginTop: 0 }]}>{children}</Text>
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
  header: { alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.md },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 12 },
  appName: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 2, textAlign: 'center' },
  tagline: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginVertical: spacing.md,
    alignItems: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: '#fff', textAlign: 'center', opacity: 0.9 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinkSection: {
    backgroundColor: '#FFF0F3',
    borderColor: colors.brand,
    borderWidth: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  p: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: 4 },
  bold: { fontWeight: '800', color: colors.textPrimary },
  link: { fontSize: 14, color: colors.brand, fontWeight: '700', textDecorationLine: 'underline', marginTop: 6 },
  bulletRow: { flexDirection: 'row', marginTop: 6 },
  bulletDot: { fontSize: 14, color: colors.brand, marginRight: 8, fontWeight: '800' },
  orderedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  orderedBubble: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  orderedNum: { color: '#fff', fontWeight: '800', fontSize: 13 },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  small: { fontSize: 12, color: colors.textSecondary },
});

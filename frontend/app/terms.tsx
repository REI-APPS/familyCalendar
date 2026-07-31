import { View, Text, ScrollView, StyleSheet, Linking, Pressable, Image } from 'react-native';
import { colors, radius, spacing } from '../src/lib/theme';

const CONTACT_EMAIL = 'suporte@familycalendar.grouprei.com';
const LAST_UPDATED = '15 de Junho de 2026';

export default function Terms() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>Termos & Política de Privacidade</Text>
        <Text style={styles.tagline}>Última atualização: {LAST_UPDATED}</Text>
      </View>

      <Section title="1. Aceitação dos termos">
        <P>
          Ao instalar, aceder ou utilizar a aplicação Agenda da Família {'(\u201ca App\u201d)'}, o
          utilizador concorda com estes Termos de Utilização e com a Política de
          Privacidade descrita neste documento. Se não concordar, deve deixar de
          utilizar a App.
        </P>
      </Section>

      <Section title="2. Descrição do serviço">
        <P>
          A Agenda da Família é uma app móvel para organização de horários e tarefas
          entre membros de uma mesma família. Permite criar contas, criar ou aderir a
          uma família, gerir turnos, tarefas e convidar outros membros por email.
        </P>
      </Section>

      <Section title="3. Contas de utilizador">
        <P>
          Para usar a App é necessário criar uma conta com um email válido e uma
          password. O utilizador é responsável por manter a confidencialidade das
          credenciais e por todas as ações realizadas com a sua conta.
        </P>
        <P>
          Só o proprietário da família pode remover outros membros. O utilizador pode
          apagar a sua própria conta em qualquer momento a partir do ecrã {'\u201cAjustes\u201d'}.
        </P>
      </Section>

      <Section title="4. Dados que recolhemos">
        <P>Recolhemos apenas os dados necessários para prestar o serviço:</P>
        <Bullet>Email e password (para autenticação)</Bullet>
        <Bullet>Nome da família e dos membros (definidos por ti)</Bullet>
        <Bullet>Turnos, tipos de horário e tarefas que crias</Bullet>
        <Bullet>Idioma escolhido (Português, English ou Español)</Bullet>
        <Bullet>Data e hora de criação/alteração dos registos</Bullet>
        <P>
          <B>Não recolhemos</B> dados de localização, contactos, câmara, microfone,
          ou identificadores publicitários.
        </P>
      </Section>

      <Section title="5. Como usamos os teus dados">
        <Bullet>Para autenticação e para te manteres com sessão iniciada</Bullet>
        <Bullet>Para mostrar a agenda partilhada aos membros da mesma família</Bullet>
        <Bullet>Para enviar emails de convite (só quando és tu a convidar alguém)</Bullet>
        <Bullet>Para melhorar a estabilidade e segurança do serviço</Bullet>
        <P>Não vendemos, alugamos, nem partilhamos dados pessoais com terceiros para fins publicitários.</P>
      </Section>

      <Section title="6. Onde ficam guardados os teus dados">
        <P>
          Os dados são armazenados numa base de dados PostgreSQL gerida pela Supabase
          Inc. (EU-West). Aplicamos políticas de segurança ao nível da linha (Row
          Level Security) que garantem que cada utilizador só consegue ver os dados
          da sua própria família.
        </P>
        <P>
          Os emails de convite são enviados através do serviço Resend. Os emails são
          apagados dos nossos sistemas após 30 dias.
        </P>
      </Section>

      <Section title="7. Retenção de dados">
        <P>
          Os dados são mantidos enquanto a tua conta estiver activa. Ao apagares a
          conta, todos os dados associados (membros criados por ti como owner,
          horários e tarefas) são apagados no prazo máximo de 30 dias. Ver{' '}
          <TextLink onPress={() => Linking.openURL('/delete-account')}>
            Apagar Conta
          </TextLink>.
        </P>
      </Section>

      <Section title="8. Os teus direitos (RGPD)">
        <P>Podes, a qualquer momento:</P>
        <Bullet>Aceder aos teus dados diretamente na App</Bullet>
        <Bullet>Corrigir dados incorretos (Ajustes → Editar Perfil)</Bullet>
        <Bullet>Apagar a tua conta e dados (Ajustes → Apagar Conta)</Bullet>
        <Bullet>Pedir uma cópia dos teus dados enviando um email para {CONTACT_EMAIL}</Bullet>
        <Bullet>Retirar o consentimento (basta apagar a conta)</Bullet>
      </Section>

      <Section title="9. Menores">
        <P>
          A App destina-se a utilizadores com pelo menos 16 anos de idade. Se és pai
          ou mãe e o teu filho utiliza a App, és responsável pela sua utilização.
        </P>
      </Section>

      <Section title="10. Limitação de responsabilidade">
        <P>
          A App é fornecida {'\u201ctal como está\u201d'}. Não garantimos disponibilidade
          ininterrupta ou ausência total de erros. Não somos responsáveis por perdas
          indiretas resultantes da utilização ou da impossibilidade de utilização da
          App.
        </P>
      </Section>

      <Section title="11. Alterações a estes termos">
        <P>
          Podemos atualizar estes Termos periodicamente. A data da última atualização
          está indicada no topo. Alterações significativas serão comunicadas via
          notificação dentro da App.
        </P>
      </Section>

      <Section title="12. Contacto">
        <P>Para qualquer questão relacionada com estes Termos ou com a tua privacidade:</P>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
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
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 12 },
  appName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  tagline: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  p: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: 4 },
  bold: { fontWeight: '800', color: colors.textPrimary },
  link: { fontSize: 14, color: colors.brand, fontWeight: '700', textDecorationLine: 'underline' },
  bulletRow: { flexDirection: 'row', marginTop: 4 },
  bulletDot: { fontSize: 14, color: colors.brand, marginRight: 8, fontWeight: '800' },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  small: { fontSize: 12, color: colors.textSecondary },
});

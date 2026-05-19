import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useFamily } from '../../src/contexts/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/lib/theme';
import { updateAgendaWidget } from '../../src/lib/widgetUpdate';
import { default as storage } from '../../src/utils/storage';

const WIDGET_DAY_KEY = 'widget_day_offset';
const DAY_OPTIONS = [
  { offset: 0, label: 'Hoje' },
  { offset: 1, label: 'Amanhã' },
  { offset: 2, label: 'Depois de amanhã' },
  { offset: 7, label: 'Daqui a 1 semana' },
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const { family, families, members, scheduleTypes, entries, selectFamily, refresh } = useFamily();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [widgetDay, setWidgetDay] = useState<number>(0);

  useEffect(() => {
    storage.getItem(WIDGET_DAY_KEY).then((v) => {
      if (v) setWidgetDay(Number(v));
    });
  }, []);

  useEffect(() => {
    if (!family) return;
    updateAgendaWidget({
      familyName: family.name,
      members,
      scheduleTypes,
      entries,
      dayOffset: widgetDay,
    });
  }, [family, members, scheduleTypes, entries, widgetDay]);

  const onSelectWidgetDay = async (offset: number) => {
    setWidgetDay(offset);
    await storage.setItem(WIDGET_DAY_KEY, String(offset));
  };

  const onSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const sendInvite = async () => {
    if (!family || !email.trim()) return;
    setSending(true);
    const { error } = await supabase.from('invites').insert({ family_id: family.id, email: email.trim().toLowerCase(), invited_by: user?.id });
    setSending(false);
    if (error) return Alert.alert('Erro', error.message);
    setEmail('');
    try {
      await Share.share({
        message: `Foste convidado para a "${family.name}" na Agenda da Família! Instala a app e regista-te com o email ${email.trim()} para acederes.`,
      });
    } catch {}
    Alert.alert('Convite criado', 'O convite ficou registado. O destinatário deve criar conta com este email para acederes à família.');
    refresh();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={styles.title}>Ajustes</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Conta</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        {families.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.label}>Família ativa</Text>
            {families.map((f) => (
              <TouchableOpacity key={f.id} testID={`select-family-${f.id}`} style={[styles.familyRow, f.id === family?.id && styles.familyRowActive]} onPress={() => selectFamily(f.id)}>
                <Text style={[styles.familyName, f.id === family?.id && { color: colors.brand }]}>{f.name}</Text>
                {f.id === family?.id && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {family && (
          <View style={styles.card}>
            <Text style={styles.label}>Convidar para "{family.name}"</Text>
            <TextInput
              testID="invite-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="email@familiar.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TouchableOpacity testID="send-invite" style={styles.primaryBtn} onPress={sendInvite} disabled={sending}>
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{sending ? 'A enviar…' : 'Enviar Convite'}</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>O destinatário receberá um link para partilha e deve criar conta com este email.</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Widget · dia a mostrar</Text>
          <Text style={styles.hint}>Escolhe qual o dia que aparece no widget do ecrã principal.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {DAY_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d.offset}
                testID={`widget-day-${d.offset}`}
                onPress={() => onSelectWidgetDay(d.offset)}
                style={[styles.pill, { backgroundColor: widgetDay === d.offset ? colors.brand : colors.surfaceSecondary }]}
              >
                <Text style={[styles.pillText, { color: widgetDay === d.offset ? '#fff' : colors.textPrimary }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Sobre</Text>
          <Text style={styles.about}>📅 Agenda da Família v1.0</Text>
          <Text style={styles.aboutSub}>Sincronização em tempo real via Supabase. Exporta a vista mensal em PDF na tab Mês.</Text>
        </View>

        <TouchableOpacity testID="sign-out" style={styles.dangerBtn} onPress={onSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.dangerText}>Terminar sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.lg, letterSpacing: -0.5 },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 11, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  value: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  input: { backgroundColor: colors.surfaceSecondary, padding: 14, borderRadius: radius.md, fontSize: 15, color: colors.textPrimary, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  primaryBtn: { backgroundColor: colors.brand, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 18 },
  about: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  aboutSub: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  dangerBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.danger, marginTop: 8 },
  dangerText: { color: colors.danger, fontWeight: '700' },
  familyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: radius.md, marginVertical: 2 },
  familyRowActive: { backgroundColor: colors.surfaceSecondary },
  familyName: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  pillText: { fontWeight: '700', fontSize: 13 },
});

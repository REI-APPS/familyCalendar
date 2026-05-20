import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { useFamily } from '../../src/contexts/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/lib/theme';
import { updateAllWidgets } from '../../src/lib/widgetUpdate';
import { storage } from '../../src/utils/storage';
import { sendInviteEmail } from '../../src/lib/resend';
import { setAppLanguage, Lang } from '../../src/i18n';

const WIDGET_DAY_KEY = 'widget_day_offset';
const WIDGET_TRANSPARENT_KEY = 'widget_transparent';
const INVITE_FROM = process.env.EXPO_PUBLIC_INVITE_FROM || 'convites@familycalendar.grouprei.com';

const DAY_OPTIONS: { offset: number; key: 'today' | 'tomorrow' | 'day_after' | 'week_ahead' }[] = [
  { offset: 0, key: 'today' },
  { offset: 1, key: 'tomorrow' },
  { offset: 2, key: 'day_after' },
  { offset: 7, key: 'week_ahead' },
];

const LANGUAGES: { code: Lang; flag: string }[] = [
  { code: 'en', flag: '🇬🇧' },
  { code: 'pt', flag: '🇵🇹' },
  { code: 'es', flag: '🇪🇸' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { family, families, members, scheduleTypes, entries, selectFamily, refresh } = useFamily();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [widgetDay, setWidgetDay] = useState<number>(0);
  const [transparent, setTransparent] = useState<boolean>(false);
  const [lang, setLang] = useState<Lang>((i18n.language || 'en').slice(0, 2) as Lang);

  useEffect(() => {
    storage.getItem(WIDGET_DAY_KEY, '0').then((v) => { if (v) setWidgetDay(Number(v)); });
    storage.getItem(WIDGET_TRANSPARENT_KEY, 'false').then((v) => setTransparent(v === 'true'));
  }, []);

  useEffect(() => {
    if (!family) return;
    updateAllWidgets({
      familyName: family.name,
      members, scheduleTypes, entries,
      dayOffset: widgetDay,
      transparent,
    });
  }, [family, members, scheduleTypes, entries, widgetDay, transparent]);

  const onSelectWidgetDay = async (offset: number) => {
    setWidgetDay(offset);
    await storage.setItem(WIDGET_DAY_KEY, String(offset));
  };

  const onToggleTransparent = async (v: boolean) => {
    setTransparent(v);
    await storage.setItem(WIDGET_TRANSPARENT_KEY, String(v));
  };

  const onChangeLanguage = async (code: Lang) => {
    setLang(code);
    await setAppLanguage(code);
  };

  const onSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const sendInvite = async () => {
    if (!family || !email.trim()) return;
    setSending(true);
    const { error } = await supabase.from('invites').insert({ family_id: family.id, email: email.trim().toLowerCase(), invited_by: user?.id });
    if (error) { setSending(false); return Alert.alert(t('common.error'), error.message); }

    const { ok, error: resendErr } = await sendInviteEmail({ to: email.trim(), familyName: family.name, inviterEmail: user?.email });
    setSending(false);
    setEmail('');
    if (!ok) Alert.alert(t('settings.invite_created_but'), t('settings.invite_created_but_msg', { err: resendErr }));
    else Alert.alert(t('settings.invite_sent_title'), t('settings.invite_sent_msg', { email: email.trim() }));
    refresh();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.account')}</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        {/* Language selector */}
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.language')}</Text>
          <View style={styles.rowWrap}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                testID={`lang-${l.code}`}
                onPress={() => onChangeLanguage(l.code)}
                style={[styles.langPill, { backgroundColor: lang === l.code ? colors.brand : colors.surfaceSecondary }]}
              >
                <Text style={[styles.langFlag]}>{l.flag}</Text>
                <Text style={[styles.pillText, { color: lang === l.code ? '#fff' : colors.textPrimary }]}>{t(`settings.language_${l.code}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {families.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.label}>{t('settings.active_family')}</Text>
            {families.map((f) => (
              <TouchableOpacity key={f.id} style={[styles.familyRow, f.id === family?.id && styles.familyRowActive]} onPress={() => selectFamily(f.id)}>
                <Text style={[styles.familyName, f.id === family?.id && { color: colors.brand }]}>{f.name}</Text>
                {f.id === family?.id && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {family && (
          <View style={styles.card}>
            <Text style={styles.label}>{t('settings.invite_to', { name: family.name })}</Text>
            <TextInput
              testID="invite-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder={t('settings.invite_placeholder')}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TouchableOpacity testID="send-invite" style={styles.primaryBtn} onPress={sendInvite} disabled={sending}>
              <Ionicons name="mail-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{sending ? t('settings.sending') : t('settings.send_invite')}</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>{t('settings.invite_hint', { from: INVITE_FROM })}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.widget_day')}</Text>
          <View style={styles.rowWrap}>
            {DAY_OPTIONS.map((d) => (
              <TouchableOpacity key={d.offset} onPress={() => onSelectWidgetDay(d.offset)} style={[styles.pill, { backgroundColor: widgetDay === d.offset ? colors.brand : colors.surfaceSecondary }]}>
                <Text style={[styles.pillText, { color: widgetDay === d.offset ? '#fff' : colors.textPrimary }]}>{t(`settings.day_options.${d.key}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Switch value={transparent} onValueChange={onToggleTransparent} trackColor={{ true: colors.brand }} />
            <Text style={{ marginLeft: 8, color: colors.textPrimary, fontWeight: '600' }}>{t('settings.widget_transparent')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.about}>{t('settings.version')}</Text>
          <Text style={styles.aboutSub}>{t('settings.version_sub')}</Text>
        </View>

        <TouchableOpacity testID="sign-out" style={styles.dangerBtn} onPress={onSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.dangerText}>{t('settings.sign_out')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.lg },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 11, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  value: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  input: { backgroundColor: colors.surfaceSecondary, padding: 14, borderRadius: radius.md, fontSize: 15, color: colors.textPrimary, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  primaryBtn: { backgroundColor: colors.brand, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint: { color: colors.textSecondary, fontSize: 11, marginTop: 6 },
  about: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  aboutSub: { fontSize: 13, color: colors.textSecondary },
  dangerBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.danger, marginTop: 8 },
  dangerText: { color: colors.danger, fontWeight: '700' },
  familyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: radius.md, marginVertical: 2 },
  familyRowActive: { backgroundColor: colors.surfaceSecondary },
  familyName: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  pillText: { fontWeight: '700', fontSize: 13 },
  langPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  langFlag: { fontSize: 18 },
});

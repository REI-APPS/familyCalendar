import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { addDays, eachDayOfInterval, format, addMonths } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { currentDateLocale } from '../../src/i18n';
import { useFamily } from '../../src/contexts/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/lib/theme';

type RangeOption = { key: '7d' | '14d' | '30d' | '60d' | '90d'; days: number };
const RANGES: RangeOption[] = [
  { key: '7d', days: 7 },
  { key: '14d', days: 14 },
  { key: '30d', days: 30 },
  { key: '60d', days: 60 },
  { key: '90d', days: 90 },
];

const WEEKDAY_KEYS: { idx: number; key: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' }[] = [
  { idx: 1, key: 'mon' }, { idx: 2, key: 'tue' }, { idx: 3, key: 'wed' },
  { idx: 4, key: 'thu' }, { idx: 5, key: 'fri' }, { idx: 6, key: 'sat' }, { idx: 0, key: 'sun' },
];

export default function BulkFill() {
  const { t } = useTranslation();
  const { family, members, scheduleTypes, memberScheduleTypes, entries, refresh } = useFamily();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [rangeDays, setRangeDays] = useState(7);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [overwrite, setOverwrite] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const memberTypes = useMemo(() => {
    if (!memberId) return [];
    const ids = memberScheduleTypes.filter((m) => m.member_id === memberId).map((m) => m.schedule_type_id);
    return scheduleTypes.filter((t) => ids.includes(t.id));
  }, [memberId, memberScheduleTypes, scheduleTypes]);

  const datesToFill = useMemo(() => {
    const end = addDays(startDate, rangeDays - 1);
    return eachDayOfInterval({ start: startDate, end }).filter((d) => weekdays.includes(d.getDay()));
  }, [startDate, rangeDays, weekdays]);

  const toggleWeekday = (idx: number) => {
    setWeekdays((p) => p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx]);
  };

  const apply = async () => {
    if (!family || !memberId || !typeId) return;
    setBusy(true);
    try {
      const rows = datesToFill.map((d) => ({
        family_id: family.id,
        member_id: memberId,
        schedule_type_id: typeId,
        entry_date: format(d, 'yyyy-MM-dd'),
        period: 'all',
      }));
      if (overwrite) {
        // delete existing in range
        const dates = rows.map((r) => r.entry_date);
        await supabase.from('schedule_entries').delete().eq('family_id', family.id).eq('member_id', memberId).in('entry_date', dates);
      } else {
        // remove already-existing dates from the insert list to avoid unique conflict
        const existingDates = new Set(
          entries
            .filter((e) => e.member_id === memberId)
            .map((e) => e.entry_date)
        );
        for (let i = rows.length - 1; i >= 0; i--) if (existingDates.has(rows[i].entry_date)) rows.splice(i, 1);
      }
      if (rows.length > 0) {
        const { error } = await supabase.from('schedule_entries').insert(rows);
        if (error) { Alert.alert(t('common.error'), error.message); setBusy(false); return; }
      }
      setBusy(false);
      setConfirmOpen(false);
      Alert.alert(t('common.success'), t('bulk.success', { count: rows.length }));
      refresh();
    } catch (e: any) {
      setBusy(false);
      Alert.alert(t('common.error'), e?.message ?? 'Falha');
    }
  };

  if (!family) return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Cria primeiro uma família.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={styles.title}>{t('bulk.title')}</Text>
        <Text style={styles.sub}>{t('bulk.subtitle')}</Text>

        <Text style={styles.section}>{t('bulk.step_member')}</Text>
        <View style={styles.rowWrap}>
          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              testID={`bulk-member-${m.id}`}
              style={[styles.pill, { backgroundColor: m.color, opacity: memberId === m.id ? 1 : 0.55 }, memberId === m.id && styles.pillSelected]}
              onPress={() => { setMemberId(m.id); setTypeId(null); }}
            >
              <Text style={styles.pillText}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>{t('bulk.step_type')}</Text>
        {!memberId ? <Text style={styles.faded}>{t('bulk.pick_member_first')}</Text> : memberTypes.length === 0 ? (
          <Text style={styles.faded}>{t('bulk.no_types_for_member')}</Text>
        ) : (
          <View style={styles.rowWrap}>
            {memberTypes.map((st) => (
              <TouchableOpacity
                key={st.id}
                testID={`bulk-type-${st.code}`}
                style={[styles.pill, { backgroundColor: st.color, opacity: typeId === st.id ? 1 : 0.55 }, typeId === st.id && styles.pillSelected]}
                onPress={() => setTypeId(st.id)}
              >
                <Text style={styles.pillText}>{st.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.section}>{t('bulk.step_start')}</Text>
        <View style={styles.dateBar}>
          <TouchableOpacity testID="start-prev-month" style={styles.iconSmall} onPress={() => setStartDate((d) => addMonths(d, -1))}>
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity testID="start-prev-day" style={styles.iconSmall} onPress={() => setStartDate((d) => addDays(d, -1))}>
            <Ionicons name="remove" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{format(startDate, "d MMMM yyyy", { locale: currentDateLocale() })}</Text>
          <TouchableOpacity testID="start-next-day" style={styles.iconSmall} onPress={() => setStartDate((d) => addDays(d, 1))}>
            <Ionicons name="add" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity testID="start-next-month" style={styles.iconSmall} onPress={() => setStartDate((d) => addMonths(d, 1))}>
            <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setStartDate(new Date())} style={{ alignItems: 'center', marginTop: 4 }}>
          <Text style={{ color: colors.brand, fontWeight: '600', fontSize: 12 }}>{t('bulk.back_to_today')}</Text>
        </TouchableOpacity>

        <Text style={styles.section}>{t('bulk.step_duration')}</Text>
        <View style={styles.rowWrap}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.days}
              testID={`bulk-range-${r.days}`}
              style={[styles.pill, { backgroundColor: rangeDays === r.days ? colors.brand : colors.surfaceSecondary }]}
              onPress={() => setRangeDays(r.days)}
            >
              <Text style={[styles.pillText, { color: rangeDays === r.days ? '#fff' : colors.textPrimary }]}>{t(`bulk.ranges.${r.key}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>{t('bulk.step_weekdays')}</Text>
        <View style={styles.rowWrap}>
          {WEEKDAY_KEYS.map((w) => {
            const sel = weekdays.includes(w.idx);
            return (
              <TouchableOpacity
                key={w.idx}
                testID={`bulk-weekday-${w.idx}`}
                style={[styles.dayPill, { backgroundColor: sel ? colors.textPrimary : colors.surfaceSecondary }]}
                onPress={() => toggleWeekday(w.idx)}
              >
                <Text style={{ color: sel ? '#fff' : colors.textPrimary, fontWeight: '800' }}>{t(`bulk.weekdays_short.${w.key}`)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          <TouchableOpacity testID="bulk-weekdays-mf" style={styles.miniBtn} onPress={() => setWeekdays([1, 2, 3, 4, 5])}>
            <Text style={styles.miniBtnText}>{t('bulk.presets.weekdays')}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="bulk-weekdays-all" style={styles.miniBtn} onPress={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}>
            <Text style={styles.miniBtnText}>{t('bulk.presets.all')}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="bulk-weekdays-wknd" style={styles.miniBtn} onPress={() => setWeekdays([0, 6])}>
            <Text style={styles.miniBtnText}>{t('bulk.presets.weekend')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>{t('bulk.step_overwrite')}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity testID="bulk-overwrite-yes" style={[styles.pill, { backgroundColor: overwrite ? colors.brand : colors.surfaceSecondary }]} onPress={() => setOverwrite(true)}>
            <Text style={[styles.pillText, { color: overwrite ? '#fff' : colors.textPrimary }]}>{t('bulk.yes_overwrite')}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="bulk-overwrite-no" style={[styles.pill, { backgroundColor: !overwrite ? colors.brand : colors.surfaceSecondary }]} onPress={() => setOverwrite(false)}>
            <Text style={[styles.pillText, { color: !overwrite ? '#fff' : colors.textPrimary }]}>{t('bulk.no_keep')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>{t('bulk.will_fill')}</Text>
          <Text style={styles.summaryValue}>{t('bulk.days_count', { count: datesToFill.length })}</Text>
        </View>

        <TouchableOpacity
          testID="bulk-apply"
          style={[styles.applyBtn, (!memberId || !typeId || datesToFill.length === 0) && { opacity: 0.4 }]}
          disabled={!memberId || !typeId || datesToFill.length === 0}
          onPress={() => setConfirmOpen(true)}
        >
          <Ionicons name="checkmark-done" size={20} color="#fff" />
          <Text style={styles.applyText}>{t('bulk.apply')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t('common.confirm')}</Text>
            <Text style={styles.confirmBody}>
              {t('bulk.confirm_msg', {
                count: datesToFill.length,
                member: members.find((m) => m.id === memberId)?.name ?? '',
                type: scheduleTypes.find((st) => st.id === typeId)?.name ?? '',
                action: overwrite ? t('bulk.overwrite_action') : t('bulk.keep_action'),
              })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
              <TouchableOpacity style={[styles.btnGhost, { flex: 1 }]} onPress={() => setConfirmOpen(false)}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="bulk-confirm" style={[styles.applyBtn, { flex: 1, marginTop: 0 }]} disabled={busy} onPress={apply}>
                <Text style={styles.applyText}>{busy ? t('bulk.filling') : t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 50 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },
  section: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.2, marginTop: spacing.lg, marginBottom: spacing.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: 'transparent' },
  pillSelected: { borderColor: colors.textPrimary, borderWidth: 2 },
  pillText: { fontWeight: '700', color: colors.textPrimary, fontSize: 13 },
  dayPill: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, minWidth: 50, alignItems: 'center' },
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: 4 },
  iconSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  miniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  miniBtnText: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  faded: { color: colors.textSecondary, fontStyle: 'italic' },
  summary: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.2 },
  summaryValue: { fontSize: 32, fontWeight: '800', color: colors.brand, marginTop: 4 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand, padding: 16, borderRadius: radius.pill, marginTop: spacing.md },
  applyText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  confirmCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
  confirmBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  btnGhost: { padding: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
});

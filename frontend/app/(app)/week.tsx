import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { addDays, addWeeks, subWeeks, startOfWeek, format, isSameDay, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useFamily } from '../../src/contexts/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function WeekView() {
  const { family, members, scheduleTypes, memberScheduleTypes, entries, refresh } = useFamily();
  const [cursor, setCursor] = useState(new Date());
  const [editing, setEditing] = useState<{ memberId: string; date: Date } | null>(null);

  const weekStart = useMemo(() => startOfWeek(cursor, { weekStartsOn: 1 }), [cursor]); // Monday
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const memberTypes = (mid: string) => {
    const ids = memberScheduleTypes.filter((mt) => mt.member_id === mid).map((mt) => mt.schedule_type_id);
    return scheduleTypes.filter((t) => ids.includes(t.id));
  };

  const entryFor = (memberId: string, d: Date) => {
    const ds = format(d, 'yyyy-MM-dd');
    return entries.find((e) => e.member_id === memberId && e.entry_date === ds);
  };

  const assignType = async (memberId: string, d: Date, typeId: string) => {
    if (!family) return;
    const ds = format(d, 'yyyy-MM-dd');
    const existing = entryFor(memberId, d);
    if (existing) {
      const { error } = await supabase.from('schedule_entries').update({ schedule_type_id: typeId }).eq('id', existing.id);
      if (error) Alert.alert('Erro', error.message);
    } else {
      const { error } = await supabase.from('schedule_entries').insert({
        family_id: family.id, member_id: memberId, schedule_type_id: typeId, entry_date: ds, period: 'all',
      });
      if (error) Alert.alert('Erro', error.message);
    }
    setEditing(null);
    refresh();
  };

  const clearCell = async (memberId: string, d: Date) => {
    const ex = entryFor(memberId, d);
    if (ex) await supabase.from('schedule_entries').delete().eq('id', ex.id);
    setEditing(null);
    refresh();
  };

  if (!family) return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Cria primeiro uma família.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.tag}>{family.name.toUpperCase()}</Text>
          <Text style={styles.title}>Semana</Text>
          <Text style={styles.sub}>{format(weekStart, "d MMM", { locale: pt })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: pt })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity testID="prev-week" style={styles.iconBtn} onPress={() => setCursor(subWeeks(cursor, 1))}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity testID="today-week" style={styles.iconBtn} onPress={() => setCursor(new Date())}>
            <Ionicons name="today-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity testID="next-week" style={styles.iconBtn} onPress={() => setCursor(addWeeks(cursor, 1))}>
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} horizontal={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Days header */}
            <View style={styles.row}>
              <View style={[styles.memberHeadCell]} />
              {days.map((d) => (
                <View key={d.toISOString()} style={[styles.dayHeadCell, isToday(d) && styles.dayHeadToday]}>
                  <Text style={styles.dayName}>{format(d, 'EEE', { locale: pt }).slice(0, 3).toUpperCase()}</Text>
                  <Text style={[styles.dayNum, isToday(d) && { color: colors.brand }]}>{format(d, 'd')}</Text>
                </View>
              ))}
            </View>

            {members.map((m) => (
              <View key={m.id} style={styles.row}>
                <View style={[styles.memberHeadCell, { backgroundColor: m.color }]}>
                  <Text style={styles.memberName}>{m.name}</Text>
                </View>
                {days.map((d) => {
                  const e = entryFor(m.id, d);
                  const t = e ? scheduleTypes.find((tt) => tt.id === e.schedule_type_id) : null;
                  return (
                    <TouchableOpacity
                      key={d.toISOString()}
                      testID={`week-cell-${m.id}-${format(d, 'yyyyMMdd')}`}
                      style={[styles.cell, { backgroundColor: t?.color || colors.surfaceSecondary }, isSameDay(d, new Date()) && styles.cellToday]}
                      onPress={() => setEditing({ memberId: m.id, date: d })}
                    >
                      <Text style={[styles.cellCode, !t && { color: colors.textSecondary, fontWeight: '400' }]}>
                        {t ? t.code : '+'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {members.length === 0 && (
              <Text style={{ color: colors.textSecondary, padding: 24 }}>Sem membros. Adiciona em "Membros".</Text>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditing(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editing && format(editing.date, "EEEE, d 'de' MMM", { locale: pt })}
            </Text>
            <Text style={styles.sheetSub}>
              {editing && members.find((m) => m.id === editing.memberId)?.name}
            </Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {editing && memberTypes(editing.memberId).length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>
                  Este membro não tem tipos atribuídos. Vai a "Membros" para atribuir.
                </Text>
              ) : (
                editing && memberTypes(editing.memberId).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    testID={`week-select-type-${t.code}`}
                    style={[styles.typeOption, { backgroundColor: t.color }]}
                    onPress={() => assignType(editing.memberId, editing.date, t.id)}
                  >
                    <Text style={styles.typeOptionCode}>{t.code}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.typeOptionName}>{t.name}</Text>
                      {t.description ? <Text style={styles.typeOptionDesc}>{t.description}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            {editing && entryFor(editing.memberId, editing.date) && (
              <TouchableOpacity testID="week-clear" style={styles.clearBtn} onPress={() => clearCell(editing.memberId, editing.date)}>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Limpar</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const CELL_WIDTH = 64;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 50 },
  header: { padding: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  tag: { fontSize: 11, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', marginBottom: 6, paddingHorizontal: spacing.md },
  memberHeadCell: { width: 96, padding: 8, justifyContent: 'center', borderRadius: radius.sm, marginRight: 6 },
  memberName: { fontWeight: '800', color: colors.textPrimary, fontSize: 13 },
  dayHeadCell: { width: CELL_WIDTH, paddingVertical: 6, alignItems: 'center', borderRadius: radius.sm, marginRight: 4 },
  dayHeadToday: { backgroundColor: '#FFE5EC' },
  dayName: { fontSize: 10, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1 },
  dayNum: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  cell: { width: CELL_WIDTH, height: 56, borderRadius: radius.sm, marginRight: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  cellToday: { borderColor: colors.brand, borderWidth: 2 },
  cellCode: { fontWeight: '800', color: colors.textPrimary, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, paddingBottom: spacing.xl + 16, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', textTransform: 'capitalize' },
  sheetSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  typeOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, marginBottom: 10, gap: spacing.md },
  typeOptionCode: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, width: 72 },
  typeOptionName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  typeOptionDesc: { fontSize: 13, color: colors.textPrimary, opacity: 0.7 },
  clearBtn: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', marginTop: spacing.sm },
});

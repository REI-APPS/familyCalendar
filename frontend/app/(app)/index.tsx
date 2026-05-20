import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, isToday } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../src/contexts/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/lib/theme';
import { SwipeNav } from '../../src/lib/SwipeNav';
import { currentDateLocale } from '../../src/i18n';

export default function Today() {
  const { t } = useTranslation();
  const { family, members, scheduleTypes, memberScheduleTypes, entries, createFamilyWithDefaults, refresh } = useFamily();
  const [date, setDate] = useState(new Date());
  const [editing, setEditing] = useState<{ memberId: string } | null>(null);
  const [newFamily, setNewFamily] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEntries = useMemo(() => entries.filter((e) => e.entry_date === dateStr), [entries, dateStr]);

  const memberTypes = (mid: string) => {
    const ids = memberScheduleTypes.filter((mt) => mt.member_id === mid).map((mt) => mt.schedule_type_id);
    return scheduleTypes.filter((t) => ids.includes(t.id));
  };
  const memberEntry = (mid: string) => dayEntries.find((e) => e.member_id === mid);

  const assignType = async (memberId: string, scheduleTypeId: string) => {
    if (!family) return;
    const existing = memberEntry(memberId);
    if (existing) await supabase.from('schedule_entries').update({ schedule_type_id: scheduleTypeId }).eq('id', existing.id);
    else await supabase.from('schedule_entries').insert({ family_id: family.id, member_id: memberId, schedule_type_id: scheduleTypeId, entry_date: dateStr, period: 'all' });
    setEditing(null); refresh();
  };

  const clearEntry = async (memberId: string) => {
    const ex = memberEntry(memberId);
    if (ex) await supabase.from('schedule_entries').delete().eq('id', ex.id);
    setEditing(null); refresh();
  };

  const onCreateFamily = async () => {
    if (!newFamily.trim()) return;
    const id = await createFamilyWithDefaults(newFamily.trim());
    if (id) { setNewFamily(''); setShowCreate(false); }
    else Alert.alert(t('common.error'), t('family.create_error'));
  };

  if (!family) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>{t('family.welcome')}</Text>
          <Text style={styles.emptyBody}>{t('family.create_to_start')}</Text>
          <TouchableOpacity testID="create-family-button" style={styles.primaryBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.primaryBtnText}>{t('family.create')}</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{t('family.family_name')}</Text>
              <TextInput testID="family-name-input" value={newFamily} onChangeText={setNewFamily} placeholder={t('family.placeholder')} placeholderTextColor={colors.textSecondary} style={styles.input} autoFocus />
              <TouchableOpacity testID="create-family-confirm" style={styles.primaryBtn} onPress={onCreateFamily}><Text style={styles.primaryBtnText}>{t('family.create')}</Text></TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', marginTop: spacing.md }} onPress={() => setShowCreate(false)}><Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.familyTag}>{family.name.toUpperCase()}</Text>
          <Text style={styles.headerTitle}>{isToday(date) ? t('today.title_today') : format(date, "EEEE", { locale: currentDateLocale() })}</Text>
          <Text style={styles.headerSub}>{format(date, "d MMMM", { locale: currentDateLocale() })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity testID="prev-day" style={styles.iconBtn} onPress={() => setDate(subDays(date, 1))}><Ionicons name="chevron-back" size={20} color={colors.textPrimary} /></TouchableOpacity>
          <TouchableOpacity testID="next-day" style={styles.iconBtn} onPress={() => setDate(addDays(date, 1))}><Ionicons name="chevron-forward" size={20} color={colors.textPrimary} /></TouchableOpacity>
        </View>
      </View>

      <SwipeNav onPrev={() => setDate(subDays(date, 1))} onNext={() => setDate(addDays(date, 1))}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
          {members.length === 0 ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Sem membros.</Text>
          ) : (
            members.map((m) => {
              const entry = memberEntry(m.id);
              const type = entry ? scheduleTypes.find((t) => t.id === entry.schedule_type_id) : null;
              const types = memberTypes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  testID={`member-card-${m.id}`}
                  style={[styles.row, { backgroundColor: type?.color || m.color }]}
                  onPress={() => setEditing({ memberId: m.id })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                    <Text style={styles.avatarText}>{m.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    {type ? (
                      <Text style={styles.typeDesc}>{type.description || type.name}</Text>
                    ) : (
                      <Text style={styles.tapToSet}>{types.length > 0 ? t('today.tap_to_set') : t('today.no_types')}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SwipeNav>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditing(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('today.pick_type')}</Text>
            <ScrollView style={{ maxHeight: 440 }}>
              {editing && memberTypes(editing.memberId).length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>{t('today.no_types_for_member')}</Text>
              ) : (
                editing && memberTypes(editing.memberId).map((t) => (
                  <TouchableOpacity key={t.id} testID={`select-type-${t.code}`} style={[styles.typeOption, { backgroundColor: t.color }]} onPress={() => assignType(editing.memberId, t.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.typeOptionName}>{t.name}</Text>
                      {t.description ? <Text style={styles.typeOptionDesc}>{t.description}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            {editing && memberEntry(editing.memberId) && (
              <TouchableOpacity testID="clear-entry" style={styles.clearBtn} onPress={() => clearEntry(editing.memberId)}>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('today.clear')}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  familyTag: { fontSize: 10, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textTransform: 'capitalize' },
  headerSub: { fontSize: 13, color: colors.textSecondary },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  memberName: { fontSize: 15, color: colors.textPrimary, fontWeight: '700' },
  typeDesc: { fontSize: 13, color: colors.textPrimary, opacity: 0.85, marginTop: 1 },
  tapToSet: { fontSize: 13, color: colors.textPrimary, opacity: 0.55, fontStyle: 'italic' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 80, marginBottom: spacing.md },
  emptyTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyBody: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 22 },
  primaryBtn: { backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center' },
  primaryBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: spacing.xl + 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  input: { backgroundColor: colors.surfaceSecondary, padding: 14, borderRadius: radius.md, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  typeOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, marginBottom: 8 },
  typeOptionName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  typeOptionDesc: { fontSize: 13, color: colors.textPrimary, opacity: 0.7, marginTop: 2 },
  clearBtn: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', marginTop: spacing.sm },
});

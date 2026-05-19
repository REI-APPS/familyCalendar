import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useFamily } from '../../src/contexts/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function Today() {
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
    if (existing) {
      const { error } = await supabase.from('schedule_entries').update({ schedule_type_id: scheduleTypeId }).eq('id', existing.id);
      if (error) Alert.alert('Erro', error.message);
    } else {
      const { error } = await supabase.from('schedule_entries').insert({
        family_id: family.id, member_id: memberId, schedule_type_id: scheduleTypeId, entry_date: dateStr, period: 'all',
      });
      if (error) Alert.alert('Erro', error.message);
    }
    setEditing(null);
    refresh();
  };

  const clearEntry = async (memberId: string) => {
    const ex = memberEntry(memberId);
    if (!ex) { setEditing(null); return; }
    await supabase.from('schedule_entries').delete().eq('id', ex.id);
    setEditing(null);
    refresh();
  };

  const onCreateFamily = async () => {
    if (!newFamily.trim()) return;
    const id = await createFamilyWithDefaults(newFamily.trim());
    if (id) { setNewFamily(''); setShowCreate(false); }
    else Alert.alert('Erro', 'Não foi possível criar a família. Verifica se o SQL foi aplicado.');
  };

  if (!family) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>Bem-vindo!</Text>
          <Text style={styles.emptyBody}>Cria a tua família para começar. Vamos preparar tudo com 3 membros e tipos de horário pré-configurados.</Text>
          <TouchableOpacity testID="create-family-button" style={styles.primaryBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.primaryBtnText}>Criar Família</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Nome da Família</Text>
              <TextInput
                testID="family-name-input"
                value={newFamily}
                onChangeText={setNewFamily}
                placeholder="Família Silva"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                autoFocus
              />
              <TouchableOpacity testID="create-family-confirm" style={styles.primaryBtn} onPress={onCreateFamily}>
                <Text style={styles.primaryBtnText}>Criar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', marginTop: spacing.md }} onPress={() => setShowCreate(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.familyTag}>{family.name.toUpperCase()}</Text>
          <Text style={styles.headerTitle}>{isToday(date) ? 'Hoje' : format(date, "EEEE", { locale: pt })}</Text>
          <Text style={styles.headerSub}>{format(date, "d 'de' MMMM", { locale: pt })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity testID="prev-day" style={styles.iconBtn} onPress={() => setDate(subDays(date, 1))}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity testID="next-day" style={styles.iconBtn} onPress={() => setDate(addDays(date, 1))}>
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {members.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Sem membros. Adiciona membros no separador "Membros".</Text>
        ) : (
          members.map((m) => {
            const entry = memberEntry(m.id);
            const type = entry ? scheduleTypes.find((t) => t.id === entry.schedule_type_id) : null;
            const types = memberTypes(m.id);
            return (
              <TouchableOpacity
                key={m.id}
                testID={`member-card-${m.id}`}
                style={[styles.memberCard, { backgroundColor: type?.color || m.color }]}
                onPress={() => setEditing({ memberId: m.id })}
                activeOpacity={0.8}
              >
                <View style={styles.avatarLarge}><Text style={styles.avatarText}>{m.name[0].toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  {type ? (
                    <>
                      <Text style={styles.typeCode}>{type.code}</Text>
                      <Text style={styles.typeName}>{type.name}</Text>
                    </>
                  ) : (
                    <Text style={styles.tapToSet}>{types.length > 0 ? 'Toca para definir' : 'Sem tipos atribuídos'}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditing(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <Text style={styles.sheetTitle}>Escolhe o tipo</Text>
            {editing && memberTypes(editing.memberId).length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>
                Este membro não tem tipos atribuídos. Vai a "Membros" para atribuir.
              </Text>
            ) : (
              editing && memberTypes(editing.memberId).map((t) => (
                <TouchableOpacity
                  key={t.id}
                  testID={`select-type-${t.code}`}
                  style={[styles.typeOption, { backgroundColor: t.color }]}
                  onPress={() => assignType(editing.memberId, t.id)}
                >
                  <Text style={styles.typeOptionCode}>{t.code}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.typeOptionName}>{t.name}</Text>
                    {t.description ? <Text style={styles.typeOptionDesc}>{t.description}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
            {editing && memberEntry(editing.memberId) && (
              <TouchableOpacity testID="clear-entry" style={styles.clearBtn} onPress={() => clearEntry(editing.memberId)}>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Limpar</Text>
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  familyTag: { fontSize: 11, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, textTransform: 'capitalize' },
  headerSub: { fontSize: 14, color: colors.textSecondary },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md, gap: spacing.md },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  memberName: { fontSize: 13, color: colors.textPrimary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  typeCode: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  typeName: { fontSize: 13, color: colors.textPrimary, opacity: 0.7 },
  tapToSet: { fontSize: 14, color: colors.textPrimary, opacity: 0.6, fontStyle: 'italic' },
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
  typeOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, marginBottom: 10, gap: spacing.md },
  typeOptionCode: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, width: 72 },
  typeOptionName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  typeOptionDesc: { fontSize: 13, color: colors.textPrimary, opacity: 0.7 },
  clearBtn: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', marginTop: spacing.sm },
});

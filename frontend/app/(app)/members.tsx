import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../src/contexts/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing, memberPalette, typePalette } from '../../src/lib/theme';
import { confirmAction } from '../../src/lib/confirm';

type ModalState =
  | { kind: 'member'; id?: string; name: string; color: string }
  | { kind: 'type'; id?: string; code: string; name: string; description: string; color: string }
  | { kind: 'assign'; memberId: string }
  | null;

export default function Members() {
  const { family, members, scheduleTypes, memberScheduleTypes, refresh } = useFamily();
  const [modal, setModal] = useState<ModalState>(null);

  if (!family) return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Cria primeiro uma família.</Text></SafeAreaView>;

  const saveMember = async () => {
    if (modal?.kind !== 'member') return;
    const { id, name, color } = modal;
    if (!name.trim()) return Alert.alert('Nome obrigatório');
    if (id) await supabase.from('members').update({ name, color }).eq('id', id);
    else await supabase.from('members').insert({ family_id: family.id, name, color });
    setModal(null); refresh();
  };

  const deleteMember = (id: string) => {
    confirmAction('Apagar membro?', 'Esta ação remove o membro e os seus horários.', async () => {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) Alert.alert('Erro ao apagar', error.message);
      else refresh();
    });
  };

  const saveType = async () => {
    if (modal?.kind !== 'type') return;
    const { id, code, name, description, color } = modal;
    if (!code.trim() || !name.trim()) return Alert.alert('Código e nome obrigatórios');
    if (id) await supabase.from('schedule_types').update({ code: code.toUpperCase(), name, description, color }).eq('id', id);
    else await supabase.from('schedule_types').insert({ family_id: family.id, code: code.toUpperCase(), name, description, color });
    setModal(null); refresh();
  };

  const deleteType = (id: string) => {
    confirmAction('Apagar tipo?', 'Esta ação remove o tipo e todos os horários que o usam.', async () => {
      const { error } = await supabase.from('schedule_types').delete().eq('id', id);
      if (error) Alert.alert('Erro ao apagar', error.message);
      else refresh();
    });
  };

  const toggleAssign = async (memberId: string, typeId: string) => {
    const ex = memberScheduleTypes.find((x) => x.member_id === memberId && x.schedule_type_id === typeId);
    if (ex) await supabase.from('member_schedule_types').delete().eq('id', ex.id);
    else await supabase.from('member_schedule_types').insert({ member_id: memberId, schedule_type_id: typeId });
    refresh();
  };

  const memberAssignedTypes = (mid: string) => {
    const ids = memberScheduleTypes.filter((x) => x.member_id === mid).map((x) => x.schedule_type_id);
    return scheduleTypes.filter((t) => ids.includes(t.id));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={styles.section}>MEMBROS</Text>
        {members.map((m) => {
          const types = memberAssignedTypes(m.id);
          return (
            <View key={m.id} style={styles.card}>
              <TouchableOpacity
                testID={`member-row-${m.id}`}
                style={styles.cardHead}
                onPress={() => setModal({ kind: 'member', id: m.id, name: m.name, color: m.color })}
              >
                <View style={[styles.avatar, { backgroundColor: m.color }]}><Text style={styles.avatarText}>{m.name[0].toUpperCase()}</Text></View>
                <Text style={styles.cardTitle}>{m.name}</Text>
                <TouchableOpacity testID={`assign-${m.id}`} onPress={() => setModal({ kind: 'assign', memberId: m.id })} style={styles.smallBtn}>
                  <Ionicons name="link-outline" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity testID={`delete-member-${m.id}`} onPress={() => deleteMember(m.id)} style={styles.smallBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </TouchableOpacity>
              <View style={styles.tagRow}>
                {types.length === 0 ? <Text style={styles.faded}>Sem tipos atribuídos</Text> :
                  types.map((t) => <View key={t.id} style={[styles.tag, { backgroundColor: t.color }]}><Text style={styles.tagText}>{t.code}</Text></View>)}
              </View>
            </View>
          );
        })}
        <TouchableOpacity
          testID="add-member"
          style={styles.addBtn}
          onPress={() => setModal({ kind: 'member', name: '', color: memberPalette[(members.length) % memberPalette.length] })}
        >
          <Ionicons name="add" size={20} color={colors.brand} />
          <Text style={styles.addText}>Novo membro</Text>
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: spacing.xl }]}>TIPOS DE HORÁRIO</Text>
        {scheduleTypes.map((t) => (
          <TouchableOpacity
            key={t.id}
            testID={`type-row-${t.code}`}
            style={[styles.card, { backgroundColor: t.color }]}
            onPress={() => setModal({ kind: 'type', id: t.id, code: t.code, name: t.name, description: t.description || '', color: t.color })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={styles.typeCodeBig}>{t.code}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t.name}</Text>
                {t.description ? <Text style={styles.cardSub}>{t.description}</Text> : null}
              </View>
              <TouchableOpacity testID={`delete-type-${t.code}`} onPress={() => deleteType(t.id)} style={styles.smallBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          testID="add-type"
          style={styles.addBtn}
          onPress={() => setModal({ kind: 'type', code: '', name: '', description: '', color: typePalette[scheduleTypes.length % typePalette.length] })}
        >
          <Ionicons name="add" size={20} color={colors.brand} />
          <Text style={styles.addText}>Novo tipo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Member modal */}
      <Modal visible={modal?.kind === 'member'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{modal && 'id' in modal && (modal as any).id ? 'Editar membro' : 'Novo membro'}</Text>
            <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
              <TextInput
                testID="member-name-input"
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor={colors.textSecondary}
                value={modal?.kind === 'member' ? modal.name : ''}
                onChangeText={(t) => setModal((p) => p?.kind === 'member' ? { ...p, name: t } : p)}
              />
              <Text style={styles.label}>Cor</Text>
              <View style={styles.colorRow}>
                {memberPalette.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setModal((p) => p?.kind === 'member' ? { ...p, color: c } : p)}
                    style={[styles.colorDot, { backgroundColor: c }, modal?.kind === 'member' && modal.color === c && styles.colorDotSelected]} />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity testID="save-member" style={styles.primaryBtn} onPress={saveMember}><Text style={styles.primaryBtnText}>Guardar</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)} style={{ alignItems: 'center', marginTop: 10 }}><Text style={{ color: colors.textSecondary }}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Type modal */}
      <Modal visible={modal?.kind === 'type'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{modal && 'id' in modal && (modal as any).id ? 'Editar tipo' : 'Novo tipo'}</Text>
            <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
              <TextInput testID="type-code-input" style={styles.input} placeholder="Código (ex: INF)" placeholderTextColor={colors.textSecondary} autoCapitalize="characters"
                value={modal?.kind === 'type' ? modal.code : ''}
                onChangeText={(t) => setModal((p) => p?.kind === 'type' ? { ...p, code: t.toUpperCase() } : p)} />
              <TextInput testID="type-name-input" style={styles.input} placeholder="Nome" placeholderTextColor={colors.textSecondary}
                value={modal?.kind === 'type' ? modal.name : ''}
                onChangeText={(t) => setModal((p) => p?.kind === 'type' ? { ...p, name: t } : p)} />
              <TextInput testID="type-desc-input" style={styles.input} placeholder="Descrição (opcional)" placeholderTextColor={colors.textSecondary}
                value={modal?.kind === 'type' ? modal.description : ''}
                onChangeText={(t) => setModal((p) => p?.kind === 'type' ? { ...p, description: t } : p)} />
              <Text style={styles.label}>Cor</Text>
              <View style={styles.colorRow}>
                {typePalette.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setModal((p) => p?.kind === 'type' ? { ...p, color: c } : p)}
                    style={[styles.colorDot, { backgroundColor: c }, modal?.kind === 'type' && modal.color === c && styles.colorDotSelected]} />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity testID="save-type" style={styles.primaryBtn} onPress={saveType}><Text style={styles.primaryBtnText}>Guardar</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)} style={{ alignItems: 'center', marginTop: 10 }}><Text style={{ color: colors.textSecondary }}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign modal */}
      <Modal visible={modal?.kind === 'assign'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Atribuir tipos</Text>
            <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
              {scheduleTypes.length === 0 ? <Text style={styles.faded}>Sem tipos. Cria tipos primeiro.</Text> : scheduleTypes.map((t) => {
                const assigned = modal?.kind === 'assign' && memberScheduleTypes.some((x) => x.member_id === modal.memberId && x.schedule_type_id === t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    testID={`toggle-assign-${t.code}`}
                    style={[styles.assignRow, { backgroundColor: t.color, opacity: assigned ? 1 : 0.55 }]}
                    onPress={() => modal?.kind === 'assign' && toggleAssign(modal.memberId, t.id)}
                  >
                    <Text style={styles.typeCodeBig}>{t.code}</Text>
                    <Text style={{ flex: 1, fontWeight: '700', color: colors.textPrimary }}>{t.name}</Text>
                    <Ionicons name={assigned ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity onPress={() => setModal(null)} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Concluído</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 50 },
  section: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.2, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', color: colors.textPrimary, fontSize: 16 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardSub: { fontSize: 13, color: colors.textPrimary, opacity: 0.7 },
  typeCodeBig: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, width: 64 },
  smallBtn: { padding: 8, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, marginLeft: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingLeft: 52 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { fontWeight: '800', color: colors.textPrimary, fontSize: 11 },
  faded: { color: colors.textSecondary, fontStyle: 'italic', fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 6, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.brand, borderStyle: 'dashed', marginTop: 4 },
  addText: { color: colors.brand, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, paddingBottom: spacing.xl + 16, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  input: { backgroundColor: colors.surfaceSecondary, padding: 14, borderRadius: radius.md, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1, marginVertical: 8 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  colorDot: { width: 34, height: 34, borderRadius: 17, borderColor: colors.textPrimary },
  colorDotSelected: { borderWidth: 3 },
  primaryBtn: { backgroundColor: colors.brand, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 16 },
  assignRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md, marginBottom: 8, gap: 8 },
});

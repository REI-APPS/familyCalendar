import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../src/contexts/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing, memberPalette, typePalette } from '../../src/lib/theme';
import { useConfirm } from '../../src/lib/ConfirmProvider';

type ModalState =
  | { kind: 'member'; id?: string; name: string; color: string }
  | { kind: 'type'; id?: string; code: string; name: string; description: string; color: string }
  | { kind: 'assign'; memberId: string }
  | null;

export default function Members() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { family, members, scheduleTypes, memberScheduleTypes, refresh } = useFamily();
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<string>('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  if (!family) return <SafeAreaView style={styles.safe}><Text style={styles.empty}>{t('month.create_family_first')}</Text></SafeAreaView>;

  const saveMember = async () => {
    if (modal?.kind !== 'member') return;
    const { id, name, color } = modal;
    if (!name.trim()) { showToast(t('members.name_required')); return; }
    if (id) await supabase.from('members').update({ name, color }).eq('id', id);
    else await supabase.from('members').insert({ family_id: family.id, name, color });
    setModal(null); refresh();
  };

  const deleteMember = (id: string, name: string) => {
    confirm({
      title: t('members.delete_member_title'),
      message: t('members.delete_member_msg', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        console.log('[delete_member] calling RPC with id=', id);
        const { data, error } = await supabase.rpc('delete_member', { member_id_to_delete: id });
        console.log('[delete_member] response:', { data, error });
        if (error) {
          const msg = error.message || JSON.stringify(error);
          Alert.alert(t('members.delete_error_generic'), `${msg}\n\nCódigo: ${error.code ?? '-'}`);
          return;
        }
        if (data === false) {
          Alert.alert(t('members.delete_not_done'), t('members.delete_not_done_msg'));
          return;
        }
        showToast(t('members.deleted_success', { name }));
        refresh();
      },
    });
  };

  const saveType = async () => {
    if (modal?.kind !== 'type') return;
    const { id, code, name, description, color } = modal;
    if (!code.trim() || !name.trim()) { showToast(t('members.code_name_required')); return; }
    if (id) await supabase.from('schedule_types').update({ code: code.toUpperCase(), name, description, color }).eq('id', id);
    else await supabase.from('schedule_types').insert({ family_id: family.id, code: code.toUpperCase(), name, description, color });
    setModal(null); refresh();
  };

  const deleteType = (id: string, name: string) => {
    confirm({
      title: t('members.delete_type_title'),
      message: t('members.delete_type_msg', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        console.log('[delete_schedule_type] calling RPC with id=', id);
        const { data, error } = await supabase.rpc('delete_schedule_type', { type_id_to_delete: id });
        console.log('[delete_schedule_type] response:', { data, error });
        if (error) {
          const msg = error.message || JSON.stringify(error);
          Alert.alert(t('members.delete_error_generic'), `${msg}\n\nCódigo: ${error.code ?? '-'}`);
          return;
        }
        if (data === false) {
          Alert.alert(t('members.delete_not_done'), t('members.delete_not_done_msg'));
          return;
        }
        showToast(t('members.deleted_success', { name }));
        refresh();
      },
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
        <Text style={styles.section}>{t('members.title_members')}</Text>

        {members.map((m) => {
          const types = memberAssignedTypes(m.id);
          return (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardHead}>
                {/* Pressable só na zona avatar+nome (NÃO inclui botões) */}
                <Pressable
                  testID={`member-row-${m.id}`}
                  style={styles.cardHeadLeft}
                  onPress={() => setModal({ kind: 'member', id: m.id, name: m.name, color: m.color })}
                >
                  <View style={[styles.avatar, { backgroundColor: m.color }]}>
                    <Text style={styles.avatarText}>{m.name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{m.name}</Text>
                </Pressable>
                {/* Botões como siblings, fora do Pressable */}
                <TouchableOpacity
                  testID={`assign-${m.id}`}
                  onPress={() => setModal({ kind: 'assign', memberId: m.id })}
                  style={styles.smallBtn}
                >
                  <Ionicons name="link-outline" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`delete-member-${m.id}`}
                  onPress={() => deleteMember(m.id, m.name)}
                  style={styles.smallBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.tagRow}>
                {types.length === 0 ? (
                  <Text style={styles.faded}>{t('members.no_types_assigned')}</Text>
                ) : (
                  types.map((tt) => (
                    <View key={tt.id} style={[styles.tag, { backgroundColor: tt.color }]}>
                      <Text style={styles.tagText}>{tt.code}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          testID="add-member"
          style={styles.addBtn}
          onPress={() => setModal({ kind: 'member', name: '', color: memberPalette[members.length % memberPalette.length] })}
        >
          <Ionicons name="add" size={20} color={colors.brand} />
          <Text style={styles.addText}>{t('members.new_member')}</Text>
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: spacing.xl }]}>{t('members.title_types')}</Text>

        {scheduleTypes.map((tt) => (
          <View key={tt.id} style={[styles.card, { backgroundColor: tt.color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Pressable só na zona código+nome+descrição (não inclui o botão) */}
              <Pressable
                testID={`type-row-${tt.code}`}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                onPress={() => setModal({ kind: 'type', id: tt.id, code: tt.code, name: tt.name, description: tt.description || '', color: tt.color })}
              >
                <Text style={styles.typeCodeBig}>{tt.code}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{tt.name}</Text>
                  {tt.description ? <Text style={styles.cardSub}>{tt.description}</Text> : null}
                </View>
              </Pressable>
              {/* Delete button como sibling, FORA do Pressable */}
              <TouchableOpacity
                testID={`delete-type-${tt.code}`}
                onPress={() => deleteType(tt.id, tt.name)}
                style={styles.smallBtn}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          testID="add-type"
          style={styles.addBtn}
          onPress={() => setModal({ kind: 'type', code: '', name: '', description: '', color: typePalette[scheduleTypes.length % typePalette.length] })}
        >
          <Ionicons name="add" size={20} color={colors.brand} />
          <Text style={styles.addText}>{t('members.new_type')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Member modal */}
      <Modal visible={modal?.kind === 'member'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{modal && 'id' in modal && (modal as any).id ? t('members.edit_member') : t('members.add_member_title')}</Text>
            <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
              <TextInput
                testID="member-name-input"
                style={styles.input}
                placeholder={t('members.name')}
                placeholderTextColor={colors.textSecondary}
                value={modal?.kind === 'member' ? modal.name : ''}
                onChangeText={(v) => setModal((p) => p?.kind === 'member' ? { ...p, name: v } : p)}
              />
              <Text style={styles.label}>{t('members.color')}</Text>
              <View style={styles.colorRow}>
                {memberPalette.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setModal((p) => p?.kind === 'member' ? { ...p, color: c } : p)}
                    style={[styles.colorDot, { backgroundColor: c }, modal?.kind === 'member' && modal.color === c && styles.colorDotSelected]} />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity testID="save-member" style={styles.primaryBtn} onPress={saveMember}><Text style={styles.primaryBtnText}>{t('common.save')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)} style={{ alignItems: 'center', marginTop: 10 }}><Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Type modal */}
      <Modal visible={modal?.kind === 'type'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{modal && 'id' in modal && (modal as any).id ? t('members.edit_type') : t('members.add_type_title')}</Text>
            <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
              <TextInput testID="type-code-input" style={styles.input} placeholder={t('members.code')} placeholderTextColor={colors.textSecondary} autoCapitalize="characters"
                value={modal?.kind === 'type' ? modal.code : ''}
                onChangeText={(v) => setModal((p) => p?.kind === 'type' ? { ...p, code: v.toUpperCase() } : p)} />
              <TextInput testID="type-name-input" style={styles.input} placeholder={t('members.name')} placeholderTextColor={colors.textSecondary}
                value={modal?.kind === 'type' ? modal.name : ''}
                onChangeText={(v) => setModal((p) => p?.kind === 'type' ? { ...p, name: v } : p)} />
              <TextInput testID="type-desc-input" style={styles.input} placeholder={t('members.description')} placeholderTextColor={colors.textSecondary}
                value={modal?.kind === 'type' ? modal.description : ''}
                onChangeText={(v) => setModal((p) => p?.kind === 'type' ? { ...p, description: v } : p)} />
              <Text style={styles.label}>{t('members.color')}</Text>
              <View style={styles.colorRow}>
                {typePalette.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setModal((p) => p?.kind === 'type' ? { ...p, color: c } : p)}
                    style={[styles.colorDot, { backgroundColor: c }, modal?.kind === 'type' && modal.color === c && styles.colorDotSelected]} />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity testID="save-type" style={styles.primaryBtn} onPress={saveType}><Text style={styles.primaryBtnText}>{t('common.save')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)} style={{ alignItems: 'center', marginTop: 10 }}><Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign modal */}
      <Modal visible={modal?.kind === 'assign'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('members.assign_types')}</Text>
            <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
              {scheduleTypes.length === 0 ? <Text style={styles.faded}>{t('members.no_types_create_first')}</Text> : scheduleTypes.map((st) => {
                const assigned = modal?.kind === 'assign' && memberScheduleTypes.some((x) => x.member_id === modal.memberId && x.schedule_type_id === st.id);
                return (
                  <TouchableOpacity
                    key={st.id}
                    testID={`toggle-assign-${st.code}`}
                    style={[styles.assignRow, { backgroundColor: st.color, opacity: assigned ? 1 : 0.55 }]}
                    onPress={() => modal?.kind === 'assign' && toggleAssign(modal.memberId, st.id)}
                  >
                    <Text style={styles.typeCodeBig}>{st.code}</Text>
                    <Text style={{ flex: 1, fontWeight: '700', color: colors.textPrimary }}>{st.name}</Text>
                    <Ionicons name={assigned ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity onPress={() => setModal(null)} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>{t('common.done')}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 50 },
  section: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.2, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHeadLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  toast: { position: 'absolute', bottom: 100, left: spacing.lg, right: spacing.lg, backgroundColor: colors.textPrimary, padding: 14, borderRadius: radius.md, alignItems: 'center' },
  toastText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

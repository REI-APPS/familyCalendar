import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabase';
import { useFamily } from '../contexts/FamilyContext';
import { useConfirm } from './ConfirmProvider';
import { colors, radius, spacing } from './theme';

type Props = {
  /** ISO date string yyyy-MM-dd */
  date: string;
  compact?: boolean;
};

/**
 * Lista + adicionar tarefas esporádicas para um dia específico.
 * Reutilizada nas vistas Today, Week e Month (popup).
 */
export function DayTasks({ date, compact = false }: Props) {
  const { t } = useTranslation();
  const { family, tasks, refresh } = useFamily();
  const confirm = useConfirm();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const dayTasks = tasks.filter((tk) => tk.entry_date === date);

  const addTask = async () => {
    if (!family || !input.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('tasks').insert({
      family_id: family.id,
      entry_date: date,
      title: input.trim(),
    });
    setBusy(false);
    if (error) return;
    setInput('');
    refresh();
  };

  const toggleDone = async (id: string, current: boolean) => {
    await supabase.from('tasks').update({ done: !current }).eq('id', id);
    refresh();
  };

  const removeTask = (id: string, title: string) => {
    confirm({
      title: t('tasks.delete_title'),
      message: t('tasks.delete_msg', { title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        await supabase.rpc('delete_task', { task_id_to_delete: id });
        refresh();
      },
    });
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact && <Text style={styles.header}>{t('tasks.header')}</Text>}
      {dayTasks.length === 0 ? (
        <Text style={styles.empty}>{t('tasks.empty')}</Text>
      ) : (
        dayTasks.map((tk) => (
          <View key={tk.id} style={styles.row}>
            <TouchableOpacity onPress={() => toggleDone(tk.id, tk.done)} style={styles.checkBox}>
              <Ionicons
                name={tk.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={tk.done ? colors.brand : colors.textSecondary}
              />
            </TouchableOpacity>
            <Text style={[styles.title, tk.done && styles.titleDone]} numberOfLines={2}>
              {tk.title}
            </Text>
            <TouchableOpacity onPress={() => removeTask(tk.id, tk.title)} style={styles.deleteBtn}>
              <Ionicons name="close" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('tasks.placeholder')}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          onSubmitEditing={addTask}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={addTask} disabled={busy || !input.trim()} style={[styles.addBtn, (!input.trim() || busy) && { opacity: 0.4 }]}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wrapCompact: { padding: spacing.sm, marginTop: 4 },
  header: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.2, marginBottom: 8 },
  empty: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  checkBox: { padding: 2 },
  title: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  titleDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  deleteBtn: { padding: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: {
    backgroundColor: colors.brand,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

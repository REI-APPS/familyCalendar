import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { supabase } from './supabase';
import { useConfirm } from './ConfirmProvider';
import { colors, radius, spacing } from './theme';

type Row = {
  user_id: string;
  email: string;
  role: string;
  member_id: string;
  member_name: string;
};

export function RegisteredUsers() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { family, refresh } = useFamily();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!family) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('list_family_users', { fid: family.id });
    if (error) {
      console.warn('list_family_users', error.message);
      setRows([]);
    } else {
      setRows((data || []) as Row[]);
    }
    setLoading(false);
  }, [family]);

  useEffect(() => { load(); }, [load]);

  // Determine if current user is the owner of this family
  const meRow = rows.find((r) => r.user_id === user?.id);
  const isOwner = meRow?.role === 'owner';

  const onRemove = (row: Row) => {
    if (!family) return;
    if (!isOwner) { Alert.alert(t('common.error'), t('users.only_owner')); return; }
    confirm({
      title: t('users.remove_title'),
      message: t('users.remove_msg', { name: row.member_name, email: row.email }),
      confirmLabel: t('users.remove'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        setBusy(row.user_id);
        const { error } = await supabase.rpc('admin_remove_family_user', {
          fid: family.id,
          target_user_id: row.user_id,
        });
        setBusy(null);
        if (error) {
          Alert.alert(t('common.error'), error.message);
          return;
        }
        Alert.alert(t('common.success'), t('users.removed'));
        await load();
        await refresh();
      },
    });
  };

  if (!family) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('users.section_title')}</Text>
      <Text style={styles.hint}>{t('users.section_hint')}</Text>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 12 }} />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>{t('users.no_users')}</Text>
      ) : (
        rows.map((r) => {
          const isMe = r.user_id === user?.id;
          return (
            <View key={r.user_id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{(r.member_name || r.email || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.member_name}
                  {isMe ? `  ·  ${t('users.you')}` : ''}
                </Text>
                <Text style={styles.email} numberOfLines={1}>{r.email || '—'}</Text>
              </View>
              <View style={[styles.roleBadge, r.role === 'owner' && styles.roleOwner]}>
                <Text style={[styles.roleTxt, r.role === 'owner' && styles.roleTxtOwner]}>
                  {r.role === 'owner' ? t('users.owner') : t('users.member')}
                </Text>
              </View>
              {isOwner && !isMe ? (
                <TouchableOpacity
                  testID={`remove-user-${r.user_id}`}
                  onPress={() => onRemove(r)}
                  disabled={busy === r.user_id}
                  style={styles.removeBtn}
                >
                  {busy === r.user_id ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 11, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  empty: { color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    padding: 10,
    borderRadius: radius.md,
    marginBottom: 6,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E8E5DC', marginLeft: 6 },
  roleOwner: { backgroundColor: colors.brand },
  roleTxt: { fontSize: 11, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.4 },
  roleTxtOwner: { color: '#fff' },
  removeBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.danger,
    marginLeft: 6,
  },
});

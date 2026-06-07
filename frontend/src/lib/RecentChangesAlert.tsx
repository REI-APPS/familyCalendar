import { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from './supabase';
import { colors, radius, spacing } from './theme';
import { currentDateLocale } from '../i18n';

type Change = {
  id: string;
  family_id: string;
  entry_date: string;
  kind: 'schedule_entry' | 'task';
  action: 'insert' | 'update' | 'delete';
  changed_by: string | null;
  description: string | null;
  created_at: string;
};

/**
 * On app foreground / mount, asks Supabase for changes happening in the next 14
 * days that the user hasn't seen yet (via get_unseen_changes RPC).
 * Shows a modal listing them once; the RPC updates `last_seen_at` so the alert
 * is shown only once per change set.
 */
export function RecentChangesAlert() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [changes, setChanges] = useState<Change[]>([]);
  const [visible, setVisible] = useState(false);
  const lastCheckRef = useRef<number>(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const fetchUnseen = async () => {
    if (!user) return;
    // Debounce — only check once per 30s
    const now = Date.now();
    if (now - lastCheckRef.current < 30 * 1000) return;
    lastCheckRef.current = now;

    try {
      const { data, error } = await supabase.rpc('get_unseen_changes');
      if (error) {
        if (error.code === 'PGRST202') {
          // SQL not deployed yet — silently ignore
          return;
        }
        console.warn('get_unseen_changes', error.message);
        return;
      }
      const arr = (data || []) as Change[];
      if (arr.length > 0) {
        setChanges(arr);
        setVisible(true);
      }
    } catch (e) {
      console.warn('get_unseen_changes threw', e);
    }
  };

  // Run once when user becomes available
  useEffect(() => {
    if (user) {
      const tmo = setTimeout(fetchUnseen, 800);
      return () => clearTimeout(tmo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-run when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        fetchUnseen();
      }
      appState.current = next;
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!visible || changes.length === 0) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.iconBubble}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>{t('alerts.title')}</Text>
              <Text style={styles.subtitle}>{t('alerts.subtitle')}</Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingVertical: 4 }}>
            {changes.map((c) => {
              const date = new Date(c.entry_date);
              const dLabel = format(date, "EEE, d MMM", { locale: currentDateLocale() });
              const kindLabel = c.kind === 'task' ? t('alerts.kind_task') : t('alerts.kind_schedule');
              const actionLabel = t(`alerts.action_${c.action}` as any);
              return (
                <View key={c.id} style={styles.row}>
                  <View style={[styles.bullet, c.action === 'delete' && { backgroundColor: colors.danger }, c.action === 'insert' && { backgroundColor: '#7AC74F' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowDate}>{dLabel}</Text>
                    <Text style={styles.rowText}>
                      <Text style={styles.rowKind}>{kindLabel}</Text>
                      {' · '}{actionLabel}
                      {c.description ? `  ·  ${c.description}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            testID="alerts-got-it"
            style={styles.gotIt}
            onPress={() => { setVisible(false); setChanges([]); }}
          >
            <Text style={styles.gotItTxt}>{t('alerts.got_it')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  iconBubble: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bullet: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand, marginRight: 12 },
  rowDate: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, textTransform: 'capitalize' },
  rowText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowKind: { fontWeight: '700', color: colors.textPrimary },
  gotIt: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  gotItTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

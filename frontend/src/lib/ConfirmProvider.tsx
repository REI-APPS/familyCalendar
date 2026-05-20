import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing } from './theme';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

type ConfirmContextValue = (opts: ConfirmOptions) => void;

const ConfirmCtx = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = useCallback((opts: ConfirmOptions) => {
    setState(opts);
  }, []);

  const onCancel = () => {
    if (busy) return;
    setState(null);
  };

  const onConfirm = async () => {
    if (!state || busy) return;
    try {
      setBusy(true);
      await state.onConfirm();
    } finally {
      setBusy(false);
      setState(null);
    }
  };

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal visible={!!state} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{state?.title}</Text>
            <Text style={styles.message}>{state?.message}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.btnGhost]} disabled={busy}>
                <Text style={styles.btnGhostText}>{state?.cancelLabel || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                style={[styles.btn, state?.destructive ? styles.btnDanger : styles.btnPrimary]}
                disabled={busy}
              >
                <Text style={styles.btnPrimaryText}>{busy ? '…' : (state?.confirmLabel || 'OK')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  message: { fontSize: 14, color: colors.textPrimary, marginBottom: spacing.md, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center' },
  btnGhost: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.textPrimary, fontWeight: '700' },
  btnPrimary: { backgroundColor: colors.brand },
  btnDanger: { backgroundColor: colors.danger },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});

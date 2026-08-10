import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, Lang } from '../i18n';
import { colors } from './theme';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

// Compact 3-button language switcher for public/legal pages (about, terms, delete-account).
// Uses the same setAppLanguage() as the app settings, so the choice persists across pages.
export function LangSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'pt').slice(0, 2).toLowerCase();
  return (
    <View style={styles.row}>
      {LANGS.map((l) => {
        const active = current === l.code;
        return (
          <Pressable key={l.code} onPress={() => setAppLanguage(l.code)} style={[styles.btn, active && styles.btnActive]}>
            <Text style={[styles.txt, active && styles.txtActive]}>{l.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginBottom: 4 },
  btn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  btnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  txt: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.4 },
  txtActive: { color: '#fff' },
});

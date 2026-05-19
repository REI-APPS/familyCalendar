import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFamily } from '../../src/contexts/FamilyContext';
import { colors, radius, spacing } from '../../src/lib/theme';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function MonthView() {
  const { family, members, scheduleTypes, entries } = useFamily();
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const monthEntries = useMemo(() => {
    const ym = format(cursor, 'yyyy-MM');
    return entries.filter((e) => e.entry_date.startsWith(ym));
  }, [entries, cursor]);

  const firstDayOffset = days.length > 0 ? getDay(days[0]) : 0;

  const entriesForDay = (d: Date) => {
    const ds = format(d, 'yyyy-MM-dd');
    return monthEntries.filter((e) => e.entry_date === ds);
  };

  const exportPdf = async () => {
    if (!family) return;
    const monthLabel = format(cursor, "MMMM 'de' yyyy", { locale: pt });
    const rowsHtml = days.map((d) => {
      const ds = format(d, 'yyyy-MM-dd');
      const cells = members.map((m) => {
        const e = monthEntries.find((x) => x.member_id === m.id && x.entry_date === ds);
        const t = e ? scheduleTypes.find((tt) => tt.id === e.schedule_type_id) : null;
        const bg = t?.color || '#ffffff';
        return `<td style="background:${bg};padding:6px;text-align:center;font-size:11px;border:1px solid #eee;">${t ? t.code : ''}</td>`;
      }).join('');
      return `<tr><td style="padding:6px;border:1px solid #eee;font-weight:700;">${format(d, 'dd EEE', { locale: pt })}</td>${cells}</tr>`;
    }).join('');
    const headers = members.map((m) => `<th style="padding:8px;background:${m.color};border:1px solid #eee;">${m.name}</th>`).join('');
    const legendHtml = scheduleTypes.map((t) => `<span style="display:inline-block;padding:4px 10px;margin:2px;border-radius:14px;background:${t.color};font-size:11px;"><b>${t.code}</b> · ${t.name}</span>`).join('');
    const html = `
      <html><head><meta charset="utf-8"><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;color:#2D3142;}h1{font-size:22px;margin:0 0 4px;}h2{font-size:14px;margin:0 0 16px;color:#7D8299;font-weight:500;}table{width:100%;border-collapse:collapse;}.legend{margin-top:18px;}</style></head>
      <body>
        <h1>${family.name}</h1>
        <h2>Agenda · ${monthLabel}</h2>
        <table><thead><tr><th style="padding:8px;background:#F5F3EC;border:1px solid #eee;">Dia</th>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table>
        <div class="legend"><b style="font-size:11px;color:#7D8299;text-transform:uppercase;letter-spacing:1px;">Legenda</b><br/>${legendHtml}</div>
      </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Agenda ${monthLabel}` });
      else Alert.alert('PDF criado', uri);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao gerar PDF');
    }
  };

  if (!family) return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Cria primeiro uma família.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.tag}>{family.name.toUpperCase()}</Text>
          <Text style={styles.title}>{format(cursor, 'MMMM yyyy', { locale: pt })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity testID="export-pdf" style={[styles.iconBtn, { backgroundColor: colors.brand }]} onPress={exportPdf}>
            <Ionicons name="document-text-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity testID="prev-month" style={styles.iconBtn} onPress={() => setCursor(subMonths(cursor, 1))}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity testID="next-month" style={styles.iconBtn} onPress={() => setCursor(addMonths(cursor, 1))}>
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekday}>{w}</Text>)}
        </View>
        <View style={styles.grid}>
          {Array.from({ length: firstDayOffset }).map((_, i) => <View key={`pad-${i}`} style={styles.cell} />)}
          {days.map((d) => {
            const dayEs = entriesForDay(d);
            const today = isSameDay(d, new Date());
            return (
              <View key={d.toISOString()} style={[styles.cell, today && styles.cellToday]}>
                <Text style={[styles.dayNum, today && styles.dayNumToday]}>{format(d, 'd')}</Text>
                <View style={styles.dots}>
                  {dayEs.slice(0, 3).map((e) => {
                    const m = members.find((mm) => mm.id === e.member_id);
                    const t = scheduleTypes.find((tt) => tt.id === e.schedule_type_id);
                    return <View key={e.id} style={[styles.dot, { backgroundColor: t?.color || m?.color || '#ccc' }]} />;
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ padding: spacing.lg }}>
          <Text style={styles.legendTitle}>LEGENDA</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {scheduleTypes.map((t) => (
              <View key={t.id} style={[styles.chip, { backgroundColor: t.color }]}>
                <Text style={styles.chipCode}>{t.code}</Text>
                <Text style={styles.chipName}>{t.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 50 },
  header: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  tag: { fontSize: 11, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textTransform: 'capitalize' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  weekRow: { flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md },
  cell: { width: `${100 / 7}%`, aspectRatio: 0.9, padding: 4, alignItems: 'center', justifyContent: 'flex-start' },
  cellToday: { },
  dayNum: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  dayNumToday: { color: colors.surface, backgroundColor: colors.brand, width: 26, height: 26, borderRadius: 13, textAlign: 'center', lineHeight: 26, overflow: 'hidden' },
  dots: { flexDirection: 'row', marginTop: 4, gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendTitle: { fontSize: 11, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, gap: 6 },
  chipCode: { fontWeight: '800', color: colors.textPrimary, fontSize: 12 },
  chipName: { color: colors.textPrimary, fontSize: 12 },
});

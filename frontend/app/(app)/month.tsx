import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFamily } from '../../src/contexts/FamilyContext';
import { colors, radius, spacing } from '../../src/lib/theme';
import { SwipeNav } from '../../src/lib/SwipeNav';
import { currentDateLocale } from '../../src/i18n';
import { DayTasks } from '../../src/lib/DayTasks';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function MonthView() {
  const { t } = useTranslation();
  const { family, members, scheduleTypes, entries } = useFamily();
  const [cursor, setCursor] = useState(new Date());
  const [popupDate, setPopupDate] = useState<Date | null>(null);

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
    const monthLabel = format(cursor, "MMMM yyyy", { locale: currentDateLocale() });
    const rowsHtml = days.map((d) => {
      const ds = format(d, 'yyyy-MM-dd');
      const cells = members.map((m) => {
        const e = monthEntries.find((x) => x.member_id === m.id && x.entry_date === ds);
        const t = e ? scheduleTypes.find((tt) => tt.id === e.schedule_type_id) : null;
        const bg = t?.color || '#ffffff';
        return `<td style="background:${bg};padding:6px;text-align:center;font-size:11px;border:1px solid #eee;">${t ? (t.description || t.name) : ''}</td>`;
      }).join('');
      return `<tr><td style="padding:6px;border:1px solid #eee;font-weight:700;">${format(d, 'dd EEE', { locale: currentDateLocale() })}</td>${cells}</tr>`;
    }).join('');
    const headers = members.map((m) => `<th style="padding:8px;background:${m.color};border:1px solid #eee;">${m.name}</th>`).join('');
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;color:#2D3142;}h1{font-size:22px;margin:0 0 4px;}h2{font-size:14px;margin:0 0 16px;color:#7D8299;font-weight:500;}table{width:100%;border-collapse:collapse;}</style></head><body><h1>${family.name}</h1><h2>Agenda · ${monthLabel}</h2><table><thead><tr><th style="padding:8px;background:#F5F3EC;border:1px solid #eee;">Dia</th>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
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
          <Text style={styles.title}>{format(cursor, 'MMMM yyyy', { locale: currentDateLocale() })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity testID="export-pdf" style={[styles.iconBtn, { backgroundColor: colors.brand }]} onPress={exportPdf}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity testID="prev-month" style={styles.iconBtn} onPress={() => setCursor(subMonths(cursor, 1))}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity testID="next-month" style={styles.iconBtn} onPress={() => setCursor(addMonths(cursor, 1))}>
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <SwipeNav onPrev={() => setCursor(subMonths(cursor, 1))} onNext={() => setCursor(addMonths(cursor, 1))}>
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
                <TouchableOpacity key={d.toISOString()} style={[styles.cell, today && styles.cellToday]} onPress={() => setPopupDate(d)} testID={`day-${format(d, 'yyyyMMdd')}`}>
                  <Text style={[styles.dayNum, today && styles.dayNumToday]}>{format(d, 'd')}</Text>
                  <View style={styles.dots}>
                    {dayEs.slice(0, 4).map((e) => {
                      const t = scheduleTypes.find((tt) => tt.id === e.schedule_type_id);
                      const m = members.find((mm) => mm.id === e.member_id);
                      return <View key={e.id} style={[styles.dot, { backgroundColor: t?.color || m?.color || '#ccc' }]} />;
                    })}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SwipeNav>

      <Modal visible={!!popupDate} transparent animationType="fade" onRequestClose={() => setPopupDate(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPopupDate(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.popup}>
            <Text style={styles.popupTitle}>{popupDate && format(popupDate, "EEEE, d MMMM", { locale: currentDateLocale() })}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {popupDate && members.map((m) => {
                const e = entriesForDay(popupDate).find((x) => x.member_id === m.id);
                const type = e ? scheduleTypes.find((tt) => tt.id === e.schedule_type_id) : null;
                return (
                  <View key={m.id} style={[styles.popupRow, { backgroundColor: type?.color || colors.surfaceSecondary }]}>
                    <View style={[styles.popupAvatar, { backgroundColor: m.color }]}>
                      <Text style={styles.popupAvatarTxt}>{m.name[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.popupMember}>{m.name}</Text>
                      <Text style={styles.popupType}>{type ? (type.description || type.name) : t('month.no_schedule')}</Text>
                    </View>
                  </View>
                );
              })}
              {popupDate && <DayTasks date={format(popupDate, 'yyyy-MM-dd')} compact />}
            </ScrollView>
            <TouchableOpacity onPress={() => setPopupDate(null)} style={styles.closeBtn}><Text style={styles.closeBtnTxt}>{t('month.close')}</Text></TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  cell: { width: `${100 / 7}%`, aspectRatio: 0.9, padding: 4, alignItems: 'center' },
  cellToday: {},
  dayNum: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  dayNumToday: { color: colors.surface, backgroundColor: colors.brand, width: 26, height: 26, borderRadius: 13, textAlign: 'center', lineHeight: 26, overflow: 'hidden' },
  dots: { flexDirection: 'row', marginTop: 4, gap: 3, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  popup: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '80%' },
  popupTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', textTransform: 'capitalize', marginBottom: spacing.md },
  popupRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: radius.md, marginBottom: 6 },
  popupAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  popupAvatarTxt: { fontWeight: '800', color: colors.textPrimary, fontSize: 14 },
  popupMember: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  popupType: { fontSize: 13, color: colors.textPrimary, opacity: 0.85 },
  closeBtn: { padding: 12, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', marginTop: spacing.sm },
  closeBtnTxt: { color: '#fff', fontWeight: '700' },
});

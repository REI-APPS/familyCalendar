import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { colors } from '../src/lib/theme';

export default function Index() {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center} testID="setup-screen">
        <Text style={styles.title}>Configuração Necessária</Text>
        <Text style={styles.body}>
          Adicione as credenciais Supabase em frontend/.env:
          {'\n\n'}EXPO_PUBLIC_SUPABASE_URL
          {'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY
          {'\n\n'}Em seguida, execute o SQL em /app/SUPABASE_SCHEMA.sql no SQL Editor do Supabase.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

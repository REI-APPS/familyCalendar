import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { signIn } = useAuth();
  const router = useRouter();

  const onSubmit = async () => {
    setErrorMsg('');
    if (!email || !pwd) { setErrorMsg(t('auth.fill_all')); return; }
    setLoading(true);
    const { error } = await signIn(email.trim(), pwd);
    setLoading(false);
    if (error) setErrorMsg(error);
    else router.replace('/(app)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.emoji}>🏡</Text>
            <Text style={styles.title}>{t('auth.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="familia@exemplo.com"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <Text style={styles.label}>{t('auth.password')}</Text>
            <TextInput
              testID="login-password-input"
              value={pwd}
              onChangeText={setPwd}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            {errorMsg ? <Text testID="login-error" style={styles.errorText}>{errorMsg}</Text> : null}
            <TouchableOpacity testID="login-submit-button" style={styles.primaryBtn} onPress={onSubmit} disabled={loading}>
              <Text style={styles.primaryBtnText}>{loading ? t('common.loading') : t('auth.sign_in')}</Text>
            </TouchableOpacity>

            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity testID="goto-signup" style={styles.linkBtn}>
                <Text style={styles.linkText}>{t('auth.no_account')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  emoji: { fontSize: 64, marginBottom: spacing.sm },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: 14, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  primaryBtn: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
  primaryBtnText: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
  linkBtn: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.brand, fontWeight: '600' },
  errorText: { color: colors.danger, fontSize: 14, marginBottom: 8, fontWeight: '600', textAlign: 'center' },
});

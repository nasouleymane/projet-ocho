import { useEffect, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/TextField';
import { CtaButton } from '@/components/CtaButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { useTheme, ColorPalette, spacing, typography } from '@/theme';

type Status = 'exchanging' | 'ready' | 'invalid';

/**
 * Écran atteint via le lien « mot de passe oublié » reçu par email
 * (`redirectTo` dans `sendPasswordReset`, store/auth.tsx). Route de premier
 * niveau (hors `(tabs)`) : accessible même sans session, comme `/auth`.
 * Le `code` de récupération arrive en paramètre d'URL — on l'échange contre
 * une session temporaire, puis on demande le nouveau mot de passe.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { updatePassword } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [status, setStatus] = useState<Status>('exchanging');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!code) {
      setStatus('invalid');
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      setStatus(exchangeError ? 'invalid' : 'ready');
    });
  }, [code]);

  const submit = async () => {
    if (password.length === 0 || isSubmitting) return;
    setError(null);
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setIsSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setIsSubmitting(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    setDone(true);
  };

  if (status === 'exchanging') {
    return (
      <View style={[styles.screen, styles.centerScreen]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (status === 'invalid') {
    return (
      <View style={[styles.screen, styles.centerScreen]}>
        <Text style={styles.subtitle}>
          Ce lien de réinitialisation n'est plus valide. Redemande-en un depuis l'écran de connexion.
        </Text>
        <CtaButton label="Retour à la connexion" onPress={() => router.replace('/auth')} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.screen, styles.centerScreen]}>
        <Text style={styles.title}>Mot de passe mis à jour</Text>
        <CtaButton label="Entrer dans Ocho" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>Choisis un nouveau mot de passe pour ton compte.</Text>
          </View>

          <View style={styles.textFields}>
            <TextField
              placeholder="Nouveau mot de passe (6 caractères min.)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
            />
            <TextField
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <CtaButton label="Valider" onPress={submit} disabled={password.length === 0 || isSubmitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    centerScreen: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    content: {
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
    head: {
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.screenTitle,
      color: colors.primary,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    textFields: {
      gap: spacing.sm,
    },
    error: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });

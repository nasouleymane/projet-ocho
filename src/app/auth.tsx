import { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/TextField';
import { CtaButton } from '@/components/CtaButton';
import { useAuth } from '@/store/auth';
import { useTheme, ColorPalette, spacing, typography, fontFamily } from '@/theme';

type Mode = 'signin' | 'signup';

/**
 * Écran de connexion / inscription (comptes utilisateurs). Seul point
 * d'entrée quand `useAuth().session` est `null` — la gate de `(tabs)/_layout.tsx`
 * y redirige. Connexion Google/Apple en flux web (voir `store/auth.tsx`).
 */
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail, signInWithOAuth, sendPasswordReset } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);

  // Pas de contrainte de longueur côté client : le placeholder qui l'indique
  // disparaît dès la saisie, un bouton désactivé sans explication visible
  // serait indiscernable d'un bug. Supabase valide côté serveur et renvoie
  // un message clair (affiché ci-dessous) si le mot de passe est trop court.
  // La correspondance des mots de passe, elle, est vérifiée à la soumission
  // (message explicite) plutôt que de désactiver silencieusement le bouton.
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const submitEmail = async () => {
    if (!canSubmit) return;
    setError(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    if (mode === 'signin') {
      const { error: authError } = await signInWithEmail(email.trim(), password);
      setIsSubmitting(false);
      if (authError) setError(authError);
      // Pas de navigation manuelle : onAuthStateChange fait réagir la gate.
      return;
    }
    const { error: authError, needsEmailConfirmation } = await signUpWithEmail(email.trim(), password);
    setIsSubmitting(false);
    if (authError) {
      setError(authError);
    } else if (needsEmailConfirmation) {
      setPendingConfirmationEmail(email.trim());
    }
    // Sinon (confirmation désactivée côté projet) : session ouverte directement,
    // onAuthStateChange fait réagir la gate, rien à faire ici.
  };

  const submitForgotPassword = async () => {
    if (isSubmitting) return;
    setError(null);
    if (email.trim().length === 0) {
      setError("Entre d'abord ton adresse email ci-dessus.");
      return;
    }
    setIsSubmitting(true);
    const { error: authError } = await sendPasswordReset(email.trim());
    setIsSubmitting(false);
    if (authError) setError(authError);
    else setResetSentEmail(email.trim());
  };

  const backToSignIn = () => {
    setPendingConfirmationEmail(null);
    setResetSentEmail(null);
    setMode('signin');
    setPassword('');
    setConfirmPassword('');
  };

  const submitOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    setIsSubmitting(true);
    const { error: authError } = await signInWithOAuth(provider);
    setIsSubmitting(false);
    if (authError) setError(authError);
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Text style={styles.title}>Ocho</Text>
            {!pendingConfirmationEmail && !resetSentEmail && (
              <Text style={styles.subtitle}>
                {mode === 'signin' ? 'Connecte-toi pour retrouver tes données.' : 'Crée un compte pour commencer.'}
              </Text>
            )}
          </View>

          {pendingConfirmationEmail ? (
            <>
              <Text style={styles.confirmText}>
                Compte créé. Va vérifier ta boîte mail (et les spams) à{' '}
                <Text style={styles.confirmEmail}>{pendingConfirmationEmail}</Text> pour confirmer ton adresse, puis
                reviens te connecter ici.
              </Text>
              <CtaButton label="Retour à la connexion" onPress={backToSignIn} />
            </>
          ) : resetSentEmail ? (
            <>
              <Text style={styles.confirmText}>
                Email envoyé à <Text style={styles.confirmEmail}>{resetSentEmail}</Text>. Va vérifier ta boîte (et les
                spams) et suis le lien pour choisir un nouveau mot de passe.
              </Text>
              <CtaButton label="Retour à la connexion" onPress={backToSignIn} />
            </>
          ) : (
            <>
              <View style={styles.textFields}>
                <TextField
                  placeholder="Adresse email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <TextField
                  placeholder="Mot de passe (6 caractères min.)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                />
                {mode === 'signup' && (
                  <TextField
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                  />
                )}
              </View>

              {mode === 'signin' && (
                <Pressable onPress={submitForgotPassword} accessibilityRole="button">
                  <Text style={styles.forgotLabel}>Mot de passe oublié ?</Text>
                </Pressable>
              )}

              {error && <Text style={styles.error}>{error}</Text>}

              <CtaButton
                label={mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
                onPress={submitEmail}
                disabled={!canSubmit}
              />

              <Pressable
                onPress={() => {
                  setError(null);
                  setConfirmPassword('');
                  setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                }}
                accessibilityRole="button"
              >
                <Text style={styles.switchLabel}>
                  {mode === 'signin' ? "Pas de compte ? Créer un compte" : 'Déjà un compte ? Se connecter'}
                </Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerLabel}>ou</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.oauthGroup}>
                <CtaButton label="Continuer avec Google" variant="surface" onPress={() => submitOAuth('google')} disabled={isSubmitting} />
                <CtaButton label="Continuer avec Apple" variant="surface" onPress={() => submitOAuth('apple')} disabled={isSubmitting} />
              </View>
            </>
          )}
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
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    textFields: {
      gap: spacing.sm,
    },
    error: {
      ...typography.body,
      color: colors.textSecondary,
    },
    forgotLabel: {
      ...typography.label,
      fontFamily: fontFamily.medium,
      color: colors.accent,
      textAlign: 'right',
    },
    confirmText: {
      ...typography.body,
      color: colors.primary,
    },
    confirmEmail: {
      fontFamily: fontFamily.semibold,
    },
    switchLabel: {
      ...typography.body,
      fontFamily: fontFamily.medium,
      color: colors.accent,
      textAlign: 'center',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    oauthGroup: {
      gap: spacing.sm,
    },
  });

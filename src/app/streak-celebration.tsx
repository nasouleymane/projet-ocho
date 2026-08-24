import { View, Text, Pressable, Share, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CtaButton } from '@/components/CtaButton';
import { useJournal } from '@/store/journal';
import { addDaysISO, todayISO } from '@/lib/date';
import { nextMilestoneAfter } from '@/lib/streak';
import { useTheme, ColorPalette, radius, spacing, typography, fontFamily } from '@/theme';

const WEEKDAY_LABELS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

/** Lundi (YYYY-MM-DD) de la semaine contenant `dateISO`. */
function mondayOfWeek(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  const dow = d.getDay(); // 0 = dimanche
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDaysISO(dateISO, diff);
}

/**
 * Écran modal : palier de streak franchi (cahier V2, esprit YAZIO). Déclenché
 * depuis `add-food.tsx` / `scan-barcode.tsx` quand `addEntry` fait franchir un
 * des paliers de `STREAK_MILESTONES` — jamais en ouvrant l'app, seulement au
 * moment où l'action qui vient de faire franchir le palier a lieu.
 */
export default function StreakCelebrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { days: daysParam } = useLocalSearchParams<{ days?: string }>();
  const { entriesForDate } = useJournal();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const days = Number(daysParam) || 0;
  const next = nextMilestoneAfter(days);

  const today = todayISO();
  const monday = mondayOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));

  const dismiss = () => router.back();

  const share = () => {
    Share.share({
      message: `${days} jours de suite à suivre mon alimentation sur Ocho.`,
    }).catch(() => {
      // partage annulé ou indisponible sur cette plateforme — rien à faire
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.hero}>
        <MaterialCommunityIcons name="fire" size={96} color={colors.accent} />
        <Text style={styles.days}>{days}</Text>
        <Text style={styles.daysLabel}>jours de suite</Text>
      </View>

      <View style={styles.weekCard}>
        {weekDays.map((day) => {
          const logged = entriesForDate(day).length > 0;
          const isToday = day === today;
          return (
            <View key={day} style={styles.weekDay}>
              <Text style={styles.weekDayLabel}>{WEEKDAY_LABELS[weekDays.indexOf(day)]}</Text>
              <View style={[styles.dot, logged && styles.dotLogged, isToday && styles.dotToday]}>
                {logged && <MaterialCommunityIcons name="fire" size={14} color={colors.onHighlight} />}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.message}>
        {next
          ? `Incroyable ! Maintenant on vise le jalon des ${next} jours.`
          : 'Incroyable régularité — continue comme ça.'}
      </Text>

      <View style={styles.spacer} />

      <Pressable onPress={share} accessibilityRole="button" style={styles.shareBtn}>
        <Text style={styles.shareLabel}>Partager mon avancée</Text>
      </Pressable>

      <CtaButton label="Je m'engage" onPress={dismiss} />
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
    },
    hero: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xxl,
    },
    days: {
      ...typography.ringValue,
      fontSize: 64,
      color: colors.primary,
      marginTop: spacing.sm,
    },
    daysLabel: {
      ...typography.body,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
    },
    weekCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.card,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    weekDay: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    weekDayLabel: {
      ...typography.labelSm,
      color: colors.textSecondary,
    },
    dot: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotLogged: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dotToday: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    message: {
      ...typography.body,
      color: colors.primary,
      textAlign: 'center',
      marginTop: spacing.xxl,
    },
    spacer: {
      flex: 1,
    },
    shareBtn: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    shareLabel: {
      ...typography.body,
      fontFamily: fontFamily.semibold,
      color: colors.accent,
    },
  });

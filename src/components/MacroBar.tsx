import { View, Text, StyleSheet } from 'react-native';
import { useTheme, ColorPalette, radius, spacing, typography, MacroKey } from '@/theme';

type Props = {
  macro: MacroKey;
  label: string;
  consumed: number;
  goal: number;
};

/**
 * Barre de progression d'une macro (protéines / glucides / lipides).
 * Remplace les anciens petits anneaux (MacroCircle) : trois barres côte à
 * côte se lisent plus vite qu'un rang d'anneaux et se rapprochent des
 * standards du secteur (MyFitnessPal, YAZIO).
 */
export function MacroBar({ macro, label, consumed, goal }: Props) {
  const { colors, macroColors } = useTheme();
  const styles = getStyles(colors);
  const c = macroColors[macro];
  const progress = goal > 0 ? Math.max(0, Math.min(1, consumed / goal)) : 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.track, { backgroundColor: c.bg }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: c.text }]} />
      </View>
      <Text style={[styles.value, { color: c.text }]}>
        {Math.round(consumed)} / {Math.round(goal)} g
      </Text>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
    },
    track: {
      width: '100%',
      height: 8,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    value: {
      ...typography.labelSm,
      fontWeight: '500',
    },
  });

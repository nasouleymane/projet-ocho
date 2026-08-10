import { View, Text, StyleSheet } from 'react-native';
import { ProgressRing } from './ProgressRing';
import { useTheme, ColorPalette, typography, spacing, MacroKey } from '@/theme';

type Props = {
  macro: MacroKey;
  label: string;
  consumed: number;
  goal: number;
};

/**
 * Petit anneau de macro (protéines / glucides / lipides).
 * Track = fond clair de la macro, tracé = texte foncé assorti ; grammes au centre,
 * label en dessous.
 */
export function MacroCircle({ macro, label, consumed, goal }: Props) {
  const { colors, macroColors } = useTheme();
  const styles = getStyles(colors);
  const c = macroColors[macro];
  const progress = goal > 0 ? consumed / goal : 0;

  return (
    <View style={styles.wrap}>
      <ProgressRing
        size={66}
        strokeWidth={7}
        progress={progress}
        trackColor={c.bg}
        progressColor={c.text}
      >
        <Text style={[typography.macroValue, { color: c.text }]}>{consumed}g</Text>
      </ProgressRing>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
    },
  });

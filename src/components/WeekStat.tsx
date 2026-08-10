import { View, Text, StyleSheet } from 'react-native';
import { useTheme, ColorPalette, spacing, typography } from '@/theme';

type Props = {
  value: string;
  label: string;
  /** Delta optionnel (ex. « -1.8 kg »), affiché en `accent`. */
  delta?: string;
};

/** Mini-statistique de la carte « Cette semaine » (poids, séances, eau). */
export function WeekStat({ value, label, delta }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.wrap}>
      <Text style={styles.value}>{value}</Text>
      {delta ? <Text style={styles.delta}>{delta}</Text> : null}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    value: {
      ...typography.statValue,
      color: colors.primary,
    },
    delta: {
      ...typography.labelSm,
      color: colors.accent,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

type Option<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Contrôle segmenté (ex. sexe Homme/Femme). Segment actif en `primary`. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, { color: active ? colors.background : colors.textSecondary }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: radius.pill,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    label: {
      ...typography.button,
    },
  });

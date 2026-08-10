import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  /** Nombre de décimales affichées/acceptées (défaut 0 = entier, ex. poids en kg). */
  decimals?: number;
};

/** Champ numérique avec steppers −/+ et valeur éditable au clavier. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  min = 0,
  max = 999,
  step = 1,
  decimals = 0,
}: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const round = (n: number) => {
    const factor = 10 ** decimals;
    return Math.round(n * factor) / factor;
  };
  const clamp = (n: number) => round(Math.max(min, Math.min(max, n)));
  const format = (n: number) => n.toFixed(decimals);

  // Texte affiché découplé de la valeur numérique : on ne clampe qu'à la fin
  // de la saisie (onBlur), sinon chaque frappe intermédiaire (ex. le "1" de
  // "180" alors que min=120) se ferait immédiatement recadrer à la borne.
  const [text, setText] = useState(format(value));

  useEffect(() => {
    setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (n: number) => {
    const c = clamp(n);
    onChange(c);
    setText(format(c));
  };

  /** N'autorise que les chiffres (et un seul point décimal si `decimals` > 0). */
  const sanitize = (t: string) => {
    if (decimals === 0) return t.replace(/[^0-9]/g, '');
    const cleaned = t.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned;
    return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.controls}>
        <Pressable
          onPress={() => commit(value - step)}
          accessibilityRole="button"
          accessibilityLabel={`Diminuer ${label}`}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
        >
          <Ionicons name="remove" size={20} color={colors.primary} />
        </Pressable>

        <View style={styles.valueWrap}>
          <TextInput
            value={text}
            onChangeText={(t) => setText(sanitize(t))}
            onBlur={() => {
              const n = parseFloat(text);
              commit(Number.isNaN(n) ? min : n);
            }}
            keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
            selectTextOnFocus
            style={styles.value}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>

        <Pressable
          onPress={() => commit(value + step)}
          accessibilityRole="button"
          accessibilityLabel={`Augmenter ${label}`}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    label: {
      ...typography.body,
      color: colors.primary,
      flex: 1,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 0,
    },
    stepBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      flexShrink: 0,
    },
    pressed: {
      opacity: 0.6,
    },
    valueWrap: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-end',
      gap: 3,
      flexShrink: 0,
    },
    value: {
      ...typography.cardValue,
      color: colors.primary,
      textAlign: 'right',
      width: 58, // assez large pour un décimal (ex. « 74.5 ») sans déborder
      padding: 0,
    },
    unit: {
      ...typography.label,
      color: colors.textSecondary,
      width: 34, // largeur fixe : "kcal"/"sec" ne doivent pas décaler les steppers
      // par rapport aux lignes voisines dont l'unité est plus courte ("g", "").
    },
  });

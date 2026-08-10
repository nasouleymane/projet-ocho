import Svg, { Polyline, Circle } from 'react-native-svg';
import { WeightEntry } from '@/store/weight';
import { useTheme } from '@/theme';

type Props = {
  /** Pesées triées par date croissante. */
  entries: WeightEntry[];
  width: number;
  height: number;
};

/** Courbe de poids (SVG polyline), cf. screens-mockups.md §4. */
export function WeightChart({ entries, width, height }: Props) {
  const { colors } = useTheme();
  const weights = entries.map((e) => e.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1; // évite une division par 0 si le poids n'a pas varié

  const padding = 10;
  const points = entries.map((e, i) => {
    const x =
      entries.length > 1 ? padding + (i / (entries.length - 1)) * (width - padding * 2) : width / 2;
    const y = padding + (1 - (e.weightKg - min) / range) * (height - padding * 2);
    return { x, y };
  });

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={colors.accent}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.accent} />
      ))}
    </Svg>
  );
}

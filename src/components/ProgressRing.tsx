import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  size: number;
  strokeWidth: number;
  /** Progression 0 → 1. */
  progress: number;
  trackColor: string;
  progressColor: string;
  children?: ReactNode;
};

/**
 * Anneau de progression SVG (design-tokens.md) :
 * fond `track`, tracé `progress`, coins arrondis (`stroke-linecap: round`).
 * Le contenu (`children`) est centré au milieu de l'anneau.
 */
export function ProgressRing({
  size,
  strokeWidth,
  progress,
  trackColor,
  progressColor,
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          // Démarre l'anneau en haut (12h) plutôt qu'à droite (3h).
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children}
    </View>
  );
}

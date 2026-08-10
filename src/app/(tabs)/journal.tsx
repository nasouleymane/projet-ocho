import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MealCard } from '@/components/MealCard';
import { useJournal } from '@/store/journal';
import { MealType, todayISO } from '@/lib/date';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

const MEALS: { type: MealType; label: string }[] = [
  { type: 'petit-dejeuner', label: 'Petit-déjeuner' },
  { type: 'dejeuner', label: 'Déjeuner' },
  { type: 'diner', label: 'Dîner' },
  { type: 'collation', label: 'Collation' },
];

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entriesForMeal, removeEntry } = useJournal();
  const date = todayISO();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl },
      ]}
    >
      <Text style={styles.title}>Aujourd'hui</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          placeholder="Rechercher un aliment"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
      </View>

      {MEALS.map((m) => (
        <MealCard
          key={m.type}
          title={m.label}
          entries={entriesForMeal(date, m.type)}
          onAddPress={() => router.push({ pathname: '/add-food', params: { meal: m.type } })}
          onRemoveEntry={removeEntry}
        />
      ))}
    </ScrollView>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    color: colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  searchInput: {
    ...typography.body,
    color: colors.primary,
    flex: 1,
    padding: 0,
  },
});

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Card } from '@/components/Card';
import { NumberField } from '@/components/NumberField';
import { TextField } from '@/components/TextField';
import { CtaButton } from '@/components/CtaButton';
import { FoodEstimateCard } from '@/components/FoodEstimateCard';
import { useJournal } from '@/store/journal';
import { estimateMeal, FoodEstimate } from '@/lib/mealEstimate';
import { defaultMealTypeNow, MealType } from '@/lib/date';
import { crossedMilestone } from '@/lib/streak';
import { useTheme, ColorPalette, radius, spacing, typography, fontFamily } from '@/theme';

type ScanState = 'idle' | 'loading' | 'results' | 'error';
/** Forme commune à un favori ou un aliment fréquent — les deux s'ajoutent au journal de la même façon. */
type QuickFood = { name: string; quantityLabel: string; kcal: number; proteinG: number; carbsG: number; fatG: number };

const MEALS: { type: MealType; label: string }[] = [
  { type: 'petit-dejeuner', label: 'Petit-déj.' },
  { type: 'dejeuner', label: 'Déjeuner' },
  { type: 'diner', label: 'Dîner' },
  { type: 'collation', label: 'Collation' },
];

/** Écran modal : ajout manuel d'un aliment (ou reprise d'un favori). */
export default function AddFoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ meal?: string }>();
  const { addEntry, favorites, addFavorite, frequentFoods, streakDays } = useJournal();
  const { colors, cardShadow } = useTheme();
  const styles = getStyles(colors, cardShadow);

  const initialMeal =
    MEALS.find((m) => m.type === params.meal)?.type ?? defaultMealTypeNow();
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const frequent = frequentFoods();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [kcal, setKcal] = useState(0);
  const [proteinG, setProteinG] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [fatG, setFatG] = useState(0);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResults, setScanResults] = useState<FoodEstimate[]>([]);
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [lastImageBase64, setLastImageBase64] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && kcal > 0;

  const close = () => router.back();

  /** Ferme le modal, ou route vers la célébration si l'ajout vient de faire franchir un palier de streak. */
  const finishLogging = (previousStreak: number, latestStreak: number) => {
    const milestone = crossedMilestone(previousStreak, latestStreak);
    if (milestone) {
      router.replace({ pathname: '/streak-celebration', params: { days: String(milestone) } });
    } else {
      close();
    }
  };

  const runEstimate = async (base64: string) => {
    setLastImageBase64(base64);
    setScanState('loading');
    try {
      const foods = await estimateMeal({ image: base64 });
      setScanResults(foods);
      setScanState('results');
    } catch (err) {
      setScanErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
      setScanState('error');
    }
  };

  const retryEstimate = () => {
    if (lastImageBase64) runEstimate(lastImageBase64);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setScanErrorMsg(
        source === 'camera'
          ? "Autorise l'accès à l'appareil photo dans les réglages pour scanner un repas."
          : "Autorise l'accès aux photos dans les réglages pour scanner un repas."
      );
      setScanState('error');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      base64: true,
      quality: 0.5,
      allowsEditing: true,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    const base64 = result.assets?.[0]?.base64;
    if (!result.canceled && base64) {
      runEstimate(base64);
    }
  };

  const updateScanResult = (index: number, patch: Partial<FoodEstimate>) => {
    setScanResults((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeScanResult = (index: number) => {
    setScanResults((list) => list.filter((_, i) => i !== index));
  };

  const addAllScanResults = () => {
    const previousStreak = streakDays;
    let latestStreak = previousStreak;
    scanResults.forEach((r) => {
      latestStreak = addEntry({
        mealType: meal,
        name: r.name,
        quantityLabel: r.quantity_label,
        kcal: r.kcal,
        proteinG: r.protein_g,
        carbsG: r.carbs_g,
        fatG: r.fat_g,
      });
    });
    finishLogging(previousStreak, latestStreak);
  };

  const addQuickFood = (food: QuickFood) => {
    // Champs listés explicitement (pas de spread) : `food` peut être un
    // FrequentFood à l'exécution, avec un champ `count` en trop que le
    // typage de QuickFood masque mais qu'un spread copierait quand même.
    const latestStreak = addEntry({
      mealType: meal,
      name: food.name,
      quantityLabel: food.quantityLabel,
      kcal: food.kcal,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
    });
    finishLogging(streakDays, latestStreak);
  };

  const save = () => {
    if (!canSave) return;
    const food = {
      name: name.trim(),
      quantityLabel: quantity.trim() || '1 portion',
      kcal,
      proteinG,
      carbsG,
      fatG,
    };
    const latestStreak = addEntry({ mealType: meal, ...food });
    if (saveAsFavorite) addFavorite(food);
    finishLogging(streakDays, latestStreak);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Ajouter un aliment</Text>
        <View style={styles.closeBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mealRow}>
            {MEALS.map((m) => {
              const active = m.type === meal;
              return (
                <Pressable
                  key={m.type}
                  onPress={() => setMeal(m.type)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.mealPill, active && styles.mealPillActive]}
                >
                  <Text style={[styles.mealPillLabel, active && styles.mealPillLabelActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {scanState === 'idle' && (
            <View style={styles.scanRow}>
              <Pressable
                onPress={() => pickImage('camera')}
                accessibilityRole="button"
                style={styles.scanBtn}
              >
                <Ionicons name="camera-outline" size={20} color={colors.accent} />
                <Text style={styles.scanBtnLabel}>Photo</Text>
              </Pressable>
              <Pressable
                onPress={() => pickImage('library')}
                accessibilityRole="button"
                style={styles.scanBtn}
              >
                <Ionicons name="images-outline" size={20} color={colors.accent} />
                <Text style={styles.scanBtnLabel}>Galerie</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/scan-barcode')}
                accessibilityRole="button"
                style={styles.scanBtn}
              >
                <Ionicons name="barcode-outline" size={20} color={colors.accent} />
                <Text style={styles.scanBtnLabel}>Scanner</Text>
              </Pressable>
            </View>
          )}

          {scanState === 'loading' && (
            <View style={styles.scanStatus}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.scanStatusLabel}>Analyse de la photo…</Text>
            </View>
          )}

          {scanState === 'error' && (
            <View style={styles.scanStatus}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.scanStatusLabel}>{scanErrorMsg}</Text>
              {lastImageBase64 && (
                <Pressable onPress={retryEstimate} accessibilityRole="button">
                  <Text style={styles.scanRetryLabel}>Réessayer</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setScanState('idle')} accessibilityRole="button">
                <Text style={styles.scanRetryLabel}>Retour à la saisie manuelle</Text>
              </Pressable>
            </View>
          )}

          {scanState === 'results' && (
            <View style={styles.resultsSection}>
              {scanResults.map((r, i) => (
                <FoodEstimateCard
                  key={i}
                  estimate={r}
                  onChange={(patch) => updateScanResult(i, patch)}
                  onRemove={() => removeScanResult(i)}
                />
              ))}
              {scanResults.length === 0 && (
                <Text style={styles.scanStatusLabel}>Aucun aliment détecté sur cette photo.</Text>
              )}
              <Pressable onPress={() => setScanState('idle')} accessibilityRole="button">
                <Text style={styles.scanRetryLabel}>Retour à la saisie manuelle</Text>
              </Pressable>
            </View>
          )}

          {scanState === 'idle' && (
            <>
              {frequent.length > 0 && (
                <View style={styles.favSection}>
                  <Text style={styles.sectionLabel}>Fréquents</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.favRow}
                  >
                    {frequent.map((f) => (
                      <Pressable
                        key={f.name}
                        onPress={() => addQuickFood(f)}
                        accessibilityRole="button"
                        style={styles.favChip}
                      >
                        <Text style={styles.favName} numberOfLines={1}>
                          {f.name}
                        </Text>
                        <Text style={styles.favKcal}>{f.kcal} kcal · ×{f.count}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {favorites.length > 0 && (
                <View style={styles.favSection}>
                  <Text style={styles.sectionLabel}>Favoris</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.favRow}
                  >
                    {favorites.map((f) => (
                      <Pressable
                        key={f.id}
                        onPress={() => addQuickFood(f)}
                        accessibilityRole="button"
                        style={styles.favChip}
                      >
                        <Text style={styles.favName} numberOfLines={1}>
                          {f.name}
                        </Text>
                        <Text style={styles.favKcal}>{f.kcal} kcal</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.textFields}>
                <TextField placeholder="Nom de l'aliment" value={name} onChangeText={setName} />
                <TextField placeholder="Quantité (ex. 150 g)" value={quantity} onChangeText={setQuantity} />
              </View>

              <Card style={styles.formCard}>
                <NumberField label="Calories" unit="kcal" value={kcal} min={0} max={5000} step={10} onChange={setKcal} />
                <View style={styles.divider} />
                <NumberField label="Protéines" unit="g" value={proteinG} min={0} max={300} step={1} onChange={setProteinG} />
                <View style={styles.divider} />
                <NumberField label="Glucides" unit="g" value={carbsG} min={0} max={500} step={1} onChange={setCarbsG} />
                <View style={styles.divider} />
                <NumberField label="Lipides" unit="g" value={fatG} min={0} max={300} step={1} onChange={setFatG} />
              </Card>

              <Pressable
                onPress={() => setSaveAsFavorite((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: saveAsFavorite }}
                style={styles.favToggle}
              >
                <View style={[styles.checkbox, saveAsFavorite && styles.checkboxChecked]}>
                  {saveAsFavorite && <Ionicons name="checkmark" size={14} color={colors.background} />}
                </View>
                <Text style={styles.favToggleLabel}>Ajouter aux favoris</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <CtaButton
          label={scanState === 'results' ? `Ajouter au journal (${scanResults.length})` : 'Ajouter'}
          onPress={scanState === 'results' ? addAllScanResults : save}
          disabled={
            scanState === 'loading' || scanState === 'error'
              ? true
              : scanState === 'results'
                ? scanResults.length === 0
                : !canSave
          }
        />
      </View>
    </View>
  );
}

const getStyles = (colors: ColorPalette, cardShadow: object) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  mealRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mealPill: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  mealPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealPillLabel: {
    ...typography.label,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  mealPillLabelActive: {
    color: colors.background,
  },
  scanRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.xs,
  },
  scanBtnLabel: {
    ...typography.body,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },
  scanStatus: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
  },
  scanStatusLabel: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scanRetryLabel: {
    ...typography.body,
    fontFamily: fontFamily.medium,
    color: colors.accent,
    textAlign: 'center',
  },
  resultsSection: {
    gap: spacing.md,
  },
  favSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  favRow: {
    gap: spacing.sm,
  },
  favChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 110,
    gap: 2,
    ...cardShadow,
  },
  favName: {
    ...typography.body,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  favKcal: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  textFields: {
    gap: spacing.sm,
  },
  formCard: {
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  favToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  favToggleLabel: {
    ...typography.body,
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});

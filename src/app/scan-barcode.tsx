import { useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NumberField } from '@/components/NumberField';
import { CtaButton } from '@/components/CtaButton';
import { useJournal } from '@/store/journal';
import { defaultMealTypeNow, MealType } from '@/lib/date';
import { lookupProductByBarcode, BarcodeProduct } from '@/lib/barcodeProduct';
import { useTheme, ColorPalette, radius, spacing, typography, fontFamily } from '@/theme';

type ScreenState = 'scanning' | 'loading' | 'result' | 'not_found' | 'error';

const MEALS: { type: MealType; label: string }[] = [
  { type: 'petit-dejeuner', label: 'Petit-déj.' },
  { type: 'dejeuner', label: 'Déjeuner' },
  { type: 'diner', label: 'Dîner' },
  { type: 'collation', label: 'Collation' },
];

/**
 * Écran modal : scanner un code-barres (cahier §4, V2). Lecture directe sur
 * Open Food Facts — pas d'IA, une correspondance exacte ou rien. Contraste
 * avec le scan photo : ici la quantité pilote les macros en direct (valeurs
 * /100g de la base × portion), plutôt que des champs indépendants.
 */
export default function ScanBarcodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addEntry } = useJournal();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScreenState>('scanning');
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [quantityG, setQuantityG] = useState(100);
  const [meal, setMeal] = useState<MealType>(defaultMealTypeNow());
  const scanLock = useRef(false);

  const close = () => router.back();

  const handleScan = async (result: BarcodeScanningResult) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setState('loading');
    try {
      const found = await lookupProductByBarcode(result.data);
      if (!found) {
        setState('not_found');
        return;
      }
      setProduct(found);
      setQuantityG(found.servingSizeG ?? 100);
      setState('result');
    } catch {
      setState('error');
    }
  };

  const rescan = () => {
    scanLock.current = false;
    setProduct(null);
    setState('scanning');
  };

  const addToJournal = () => {
    if (!product) return;
    const factor = quantityG / 100;
    addEntry({
      mealType: meal,
      name: product.name,
      quantityLabel: `${quantityG} g`,
      kcal: Math.round(product.kcal100g * factor),
      proteinG: Math.round(product.protein100g * factor * 10) / 10,
      carbsG: Math.round(product.carbs100g * factor * 10) / 10,
      fatG: Math.round(product.fat100g * factor * 10) / 10,
    });
    close();
  };

  if (state === 'scanning') {
    if (!permission) {
      return <View style={styles.screen} />;
    }
    if (!permission.granted) {
      return (
        <View style={[styles.screen, styles.centerScreen, styles.permissionScreen]}>
          <Ionicons name="camera-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.permissionText}>
            Ocho a besoin d'accéder à l'appareil photo pour scanner un code-barres.
          </Text>
          <CtaButton label="Autoriser l'appareil photo" onPress={requestPermission} />
          <Pressable onPress={close} accessibilityRole="button">
            <Text style={styles.cancelLabel}>Annuler</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.screen}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={handleScan}
        />
        <View style={[styles.cameraHeader, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.scanFrameWrap} pointerEvents="none">
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Vise le code-barres du produit</Text>
        </View>
      </View>
    );
  }

  if (state === 'loading') {
    return (
      <View style={[styles.screen, styles.centerScreen]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.statusLabel}>Recherche du produit…</Text>
      </View>
    );
  }

  if (state === 'not_found') {
    return (
      <View style={[styles.screen, styles.centerScreen]}>
        <Ionicons name="barcode-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.statusLabel}>Ce produit n'est pas dans la base Open Food Facts.</Text>
        <Pressable onPress={rescan} accessibilityRole="button">
          <Text style={styles.retryLabel}>Rescanner</Text>
        </Pressable>
        <Pressable onPress={close} accessibilityRole="button">
          <Text style={styles.cancelLabel}>Saisie manuelle</Text>
        </Pressable>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.screen, styles.centerScreen]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.statusLabel}>Recherche impossible pour le moment.</Text>
        <Pressable onPress={rescan} accessibilityRole="button">
          <Text style={styles.retryLabel}>Réessayer</Text>
        </Pressable>
        <Pressable onPress={close} accessibilityRole="button">
          <Text style={styles.cancelLabel}>Saisie manuelle</Text>
        </Pressable>
      </View>
    );
  }

  // state === 'result'
  if (!product) return null;
  const factor = quantityG / 100;
  const kcal = Math.round(product.kcal100g * factor);
  const proteinG = Math.round(product.protein100g * factor * 10) / 10;
  const carbsG = Math.round(product.carbs100g * factor * 10) / 10;
  const fatG = Math.round(product.fat100g * factor * 10) / 10;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Produit scanné</Text>
        <Pressable onPress={rescan} accessibilityRole="button" accessibilityLabel="Rescanner" style={styles.closeBtn}>
          <Ionicons name="camera-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.productHead}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
        </View>

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
                <Text style={[styles.mealPillLabel, active && styles.mealPillLabelActive]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formCard}>
          <NumberField
            label="Quantité"
            unit="g"
            value={quantityG}
            min={1}
            max={2000}
            step={5}
            onChange={setQuantityG}
          />
        </View>

        <View style={styles.macroRow}>
          <MacroReadout label="Calories" value={`${kcal} kcal`} />
          <MacroReadout label="Protéines" value={`${proteinG} g`} />
          <MacroReadout label="Glucides" value={`${carbsG} g`} />
          <MacroReadout label="Lipides" value={`${fatG} g`} />
        </View>
        <Text style={styles.per100} numberOfLines={1}>
          Pour 100 g : {product.kcal100g} kcal · {product.protein100g} g P · {product.carbs100g} g G · {product.fat100g} g L
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <CtaButton label="Ajouter au journal" onPress={addToJournal} />
      </View>
    </View>
  );
}

function MacroReadout({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.macroReadout}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerScreen: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    statusLabel: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    retryLabel: {
      ...typography.body,
      fontFamily: fontFamily.medium,
      color: colors.accent,
    },
    cancelLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    permissionScreen: {
      paddingHorizontal: spacing.xl,
    },
    permissionText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    camera: {
      flex: 1,
    },
    cameraHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
    },
    scanFrameWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    scanFrame: {
      width: '76%',
      aspectRatio: 1.6,
      borderRadius: radius.card2,
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    scanHint: {
      ...typography.body,
      fontFamily: fontFamily.medium,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      ...typography.sectionTitle,
      color: colors.primary,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      gap: spacing.lg,
    },
    productHead: {
      gap: 2,
    },
    productName: {
      ...typography.screenTitle,
      color: colors.primary,
    },
    productBrand: {
      ...typography.body,
      color: colors.textSecondary,
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
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.xl,
    },
    macroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    macroReadout: {
      alignItems: 'center',
      gap: 2,
    },
    macroValue: {
      ...typography.body,
      fontFamily: fontFamily.semibold,
      color: colors.primary,
    },
    macroLabel: {
      ...typography.labelSm,
      color: colors.textSecondary,
    },
    per100: {
      ...typography.labelSm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
  });

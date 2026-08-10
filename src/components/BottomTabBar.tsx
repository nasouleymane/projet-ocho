import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

type Tab = {
  href: Href;
  label: string;
  icon: IoniconName;
  iconActive: IoniconName;
  isActive: (pathname: string) => boolean;
};

/** Les 4 onglets de navigation (le bouton central « + » est traité à part). */
const TABS: Tab[] = [
  {
    href: '/',
    label: 'Accueil',
    icon: 'home-outline',
    iconActive: 'home',
    isActive: (p) => p === '/',
  },
  {
    href: '/journal',
    label: 'Journal',
    icon: 'book-outline',
    iconActive: 'book',
    isActive: (p) => p.startsWith('/journal'),
  },
  {
    href: '/progression',
    label: 'Progression',
    icon: 'stats-chart-outline',
    iconActive: 'stats-chart',
    isActive: (p) => p.startsWith('/progression'),
  },
  {
    href: '/profil',
    label: 'Profil',
    icon: 'person-outline',
    iconActive: 'person',
    isActive: (p) => p.startsWith('/profil'),
  },
];

/**
 * Navigation basse fixe : 5 emplacements (Accueil, Journal, bouton central « + »,
 * Progression, Profil). Icône active en `accent`, inactive en `tabInactive`.
 * Bouton central surélevé, fond `primary`, icône `background`.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, cardShadow } = useTheme();
  const styles = getStyles(colors, cardShadow);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || spacing.sm }]}>
      <TabButton tab={TABS[0]} pathname={pathname} onPress={() => router.replace(TABS[0].href)} />
      <TabButton tab={TABS[1]} pathname={pathname} onPress={() => router.replace(TABS[1].href)} />

      {/* Bouton central « + » — accès rapide (repas / séance). */}
      <View style={styles.plusSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter"
          onPress={() => router.push('/add-food')}
          style={({ pressed }) => [styles.plus, pressed && styles.plusPressed]}
        >
          <Ionicons name="add" size={30} color={colors.background} />
        </Pressable>
      </View>

      <TabButton tab={TABS[2]} pathname={pathname} onPress={() => router.replace(TABS[2].href)} />
      <TabButton tab={TABS[3]} pathname={pathname} onPress={() => router.replace(TABS[3].href)} />
    </View>
  );
}

function TabButton({
  tab,
  pathname,
  onPress,
}: {
  tab: Tab;
  pathname: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors, {});
  const active = tab.isActive(pathname);
  const tint = active ? colors.accent : colors.tabInactive;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.tab}
    >
      <Ionicons name={active ? tab.iconActive : tab.icon} size={24} color={tint} />
      <Text style={[styles.tabLabel, { color: tint }]}>{tab.label}</Text>
    </Pressable>
  );
}

const getStyles = (colors: ColorPalette, cardShadow: object) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.borderStrong,
      paddingTop: spacing.sm,
      overflow: 'visible',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingTop: 2,
    },
    tabLabel: {
      ...typography.labelSm,
    },
    plusSlot: {
      flex: 1,
      alignItems: 'center',
    },
    plus: {
      width: 58,
      height: 58,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -22, // surélève le bouton au-dessus de la barre
      borderWidth: 4,
      borderColor: colors.surface,
      ...cardShadow,
    },
    plusPressed: {
      opacity: 0.9,
    },
  });

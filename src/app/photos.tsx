import { useState } from 'react';
import { ScrollView, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Card } from '@/components/Card';
import { usePhotos, ProgressPhoto } from '@/store/photos';
import { useTheme, ColorPalette, radius, spacing, typography, fontFamily } from '@/theme';

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const s = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Écran : photos de progression (cahier §4, V2) — accessible via la carte « Photos » de Progression. */
export default function PhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photos, addPhoto, removePhoto } = usePhotos();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [selected, setSelected] = useState<ProgressPhoto | null>(null);

  const pickImage = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [3, 4],
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) {
      addPhoto(uri);
    }
  };

  const confirmDelete = (photo: ProgressPhoto) => {
    removePhoto(photo.id);
    setSelected(null);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Photos</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scanRow}>
          <Pressable onPress={() => pickImage('camera')} accessibilityRole="button" style={styles.scanBtn}>
            <Ionicons name="camera-outline" size={20} color={colors.accent} />
            <Text style={styles.scanBtnLabel}>Photo</Text>
          </Pressable>
          <Pressable onPress={() => pickImage('library')} accessibilityRole="button" style={styles.scanBtn}>
            <Ionicons name="images-outline" size={20} color={colors.accent} />
            <Text style={styles.scanBtnLabel}>Galerie</Text>
          </Pressable>
        </View>

        {photos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={26} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucune photo</Text>
            <Text style={styles.emptySubtitle}>
              Ajoute une photo pour suivre visuellement ta progression au fil du temps.
            </Text>
          </Card>
        ) : (
          <View style={styles.grid}>
            {photos.map((photo) => (
              <Pressable
                key={photo.id}
                onPress={() => setSelected(photo)}
                accessibilityRole="button"
                accessibilityLabel={`Photo du ${formatDate(photo.date)}`}
                style={styles.thumbWrap}
              >
                <Image source={{ uri: photo.uri }} style={styles.thumb} />
                <Text style={styles.thumbDate} numberOfLines={1}>
                  {formatDate(photo.date)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {selected && (
        <View style={styles.lightbox}>
          <View style={[styles.lightboxHeader, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable
              onPress={() => setSelected(null)}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              style={styles.backBtn}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(selected)}
              accessibilityRole="button"
              accessibilityLabel="Supprimer la photo"
              style={styles.backBtn}
            >
              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          <Image source={{ uri: selected.uri }} style={styles.lightboxImage} resizeMode="contain" />
          <Text style={[styles.lightboxDate, { paddingBottom: insets.bottom + spacing.lg }]}>
            {formatDate(selected.date)}
          </Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    backBtn: {
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
      gap: spacing.lg,
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
    },
    scanBtnLabel: {
      ...typography.body,
      fontFamily: fontFamily.medium,
      color: colors.accent,
    },
    emptyCard: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxxl,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    emptyTitle: {
      ...typography.sectionTitle,
      color: colors.primary,
    },
    emptySubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    thumbWrap: {
      width: '47%',
      gap: spacing.xs,
    },
    thumb: {
      width: '100%',
      aspectRatio: 3 / 4,
      borderRadius: radius.card2,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    thumbDate: {
      ...typography.labelSm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    lightbox: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lightboxHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      zIndex: 1,
    },
    lightboxImage: {
      width: '100%',
      height: '80%',
    },
    lightboxDate: {
      ...typography.body,
      color: '#FFFFFF',
      position: 'absolute',
      bottom: 0,
      alignSelf: 'center',
    },
  });

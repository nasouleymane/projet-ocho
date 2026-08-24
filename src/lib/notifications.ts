import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Ocho — notifications locales (cahier §4, V2 : hydratation, repas, séance,
 * pesée hebdo, objectif atteint). Tout est programmé sur l'appareil, pas de
 * push distant : cohérent avec une app 100 % locale, sans backend qui
 * suivrait l'état de l'utilisateur pour déclencher un envoi.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationCategory = 'hydration' | 'meals' | 'workout' | 'weeklyWeighIn';

/** Vérifie la permission, la demande si nécessaire. `false` si refusée. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

const ANDROID_CHANNEL_ID = 'ocho-reminders';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Rappels Ocho',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Horaires par défaut — pas encore personnalisables (V1 de la feature).
const HYDRATION_HOURS = [10, 13, 16, 19];
const MEALS = [
  { id: 'petit-dejeuner', label: 'Petit-déjeuner', hour: 8, minute: 0 },
  { id: 'dejeuner', label: 'Déjeuner', hour: 12, minute: 30 },
  { id: 'diner', label: 'Dîner', hour: 19, minute: 30 },
];
/** Convention expo-notifications : 1 = dimanche ... 7 = samedi. Ici lun/mer/ven. */
const WORKOUT_WEEKDAYS = [2, 4, 6];
const WORKOUT_HOUR = 18;
const WEIGHIN_WEEKDAY = 2; // lundi
const WEIGHIN_HOUR = 8;

function idsForCategory(category: NotificationCategory): string[] {
  switch (category) {
    case 'hydration':
      return HYDRATION_HOURS.map((h) => `ocho-hydration-${h}`);
    case 'meals':
      return MEALS.map((m) => `ocho-meal-${m.id}`);
    case 'workout':
      return WORKOUT_WEEKDAYS.map((d) => `ocho-workout-${d}`);
    case 'weeklyWeighIn':
      return ['ocho-weighin'];
  }
}

/**
 * Active ou désactive une catégorie de rappels récurrents. Annule toujours
 * d'abord les notifications déjà programmées pour cette catégorie (par
 * identifiant stable — un réveil idempotent, pas de doublons possibles),
 * puis reprogramme si `enabled`. Retourne `false` sans rien programmer si
 * la permission est refusée — l'appelant doit alors garder le réglage à off.
 */
export async function setCategoryEnabled(category: NotificationCategory, enabled: boolean): Promise<boolean> {
  for (const id of idsForCategory(category)) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  if (!enabled) return true;

  const granted = await ensureNotificationPermission();
  if (!granted) return false;
  await ensureAndroidChannel();

  if (category === 'hydration') {
    for (const hour of HYDRATION_HOURS) {
      await Notifications.scheduleNotificationAsync({
        identifier: `ocho-hydration-${hour}`,
        content: { title: 'Pense à boire', body: "Un petit verre d'eau ?" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: ANDROID_CHANNEL_ID },
      });
    }
  } else if (category === 'meals') {
    for (const m of MEALS) {
      await Notifications.scheduleNotificationAsync({
        identifier: `ocho-meal-${m.id}`,
        content: { title: m.label, body: "N'oublie pas de logger ton repas dans Ocho." },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: m.hour,
          minute: m.minute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  } else if (category === 'workout') {
    for (const weekday of WORKOUT_WEEKDAYS) {
      await Notifications.scheduleNotificationAsync({
        identifier: `ocho-workout-${weekday}`,
        content: { title: 'Séance prévue', body: "C'est le moment de bouger !" },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: WORKOUT_HOUR,
          minute: 0,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  } else if (category === 'weeklyWeighIn') {
    await Notifications.scheduleNotificationAsync({
      identifier: 'ocho-weighin',
      content: { title: 'Pesée hebdomadaire', body: "C'est l'heure de monter sur la balance." },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: WEIGHIN_WEEKDAY,
        hour: WEIGHIN_HOUR,
        minute: 0,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
  return true;
}

/** Notification immédiate — déclenchée en réaction à un événement (pas programmée à l'avance). */
export async function notifyGoalReached(targetWeightKg: number): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Objectif atteint !',
      body: `Tu as atteint ton poids cible de ${targetWeightKg} kg.`,
    },
    trigger: null,
  });
}

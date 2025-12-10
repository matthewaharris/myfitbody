import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 * @returns {Promise<string|null>} The Expo push token or null if registration failed
 */
export async function registerForPushNotifications() {
  let token = null;

  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    token = tokenData.data;
    console.log('Expo push token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });

    // Create a channel for workout reminders
    await Notifications.setNotificationChannelAsync('workouts', {
      name: 'Workout Reminders',
      description: 'Reminders to log your workouts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });

    // Create a channel for meal reminders
    await Notifications.setNotificationChannelAsync('meals', {
      name: 'Meal Reminders',
      description: 'Reminders to log your meals',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });
  }

  return token;
}

/**
 * Add a listener for when a notification is received while app is foregrounded
 * @param {Function} callback - Function to call when notification is received
 * @returns {Subscription} Subscription object to remove listener
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when user taps on a notification
 * @param {Function} callback - Function to call when notification is tapped
 * @returns {Subscription} Subscription object to remove listener
 */
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule a local notification
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Custom data to attach
 * @param {number} options.seconds - Seconds from now to trigger (for testing)
 * @param {Object} options.trigger - Custom trigger (daily, weekly, etc)
 */
export async function scheduleLocalNotification({ title, body, data = {}, seconds, trigger }) {
  const notificationTrigger = seconds
    ? { seconds }
    : trigger || { seconds: 1 };

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: notificationTrigger,
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Set the badge count (iOS)
 * @param {number} count - Badge count to display
 */
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}

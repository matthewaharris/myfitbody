/**
 * Expo Push Notification Utility
 *
 * Sends push notifications via Expo's push notification service.
 * No API key needed - Expo handles authentication via the push token.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to a single user
 * @param {string} pushToken - Expo push token (ExponentPushToken[xxx])
 * @param {Object} notification - Notification content
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} notification.data - Custom data payload
 * @param {string} notification.sound - Sound to play (default, or null for silent)
 * @param {string} notification.channelId - Android channel ID
 * @returns {Promise<Object>} Response from Expo push service
 */
export async function sendPushNotification(pushToken, notification) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
    console.log('Invalid push token:', pushToken);
    return null;
  }

  const message = {
    to: pushToken,
    sound: notification.sound ?? 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    channelId: notification.channelId || 'default',
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send push notifications to multiple users
 * @param {Array<string>} pushTokens - Array of Expo push tokens
 * @param {Object} notification - Notification content (same as sendPushNotification)
 * @returns {Promise<Object>} Response from Expo push service
 */
export async function sendBulkPushNotifications(pushTokens, notification) {
  // Filter valid tokens
  const validTokens = pushTokens.filter(
    token => token && token.startsWith('ExponentPushToken')
  );

  if (validTokens.length === 0) {
    console.log('No valid push tokens to send to');
    return null;
  }

  // Expo recommends batching in groups of 100
  const batches = [];
  for (let i = 0; i < validTokens.length; i += 100) {
    batches.push(validTokens.slice(i, i + 100));
  }

  const results = [];

  for (const batch of batches) {
    const messages = batch.map(token => ({
      to: token,
      sound: notification.sound ?? 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: notification.channelId || 'default',
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      results.push(result);
    } catch (error) {
      console.error('Error sending batch push notification:', error);
      results.push({ error: error.message });
    }
  }

  return results;
}

/**
 * Pre-built notification templates
 */
export const NotificationTemplates = {
  workoutReminder: (userName) => ({
    title: "Time to work out! 💪",
    body: `Hey ${userName || 'there'}, don't forget to log your workout today!`,
    data: { screen: 'workout' },
    channelId: 'workouts',
  }),

  mealReminder: (mealType) => ({
    title: `Log your ${mealType || 'meal'} 🍽️`,
    body: "Track your nutrition to stay on target!",
    data: { screen: 'meal' },
    channelId: 'meals',
  }),

  goalProgress: (progress, goal) => ({
    title: "Great progress! 🎯",
    body: `You're ${progress}% towards your ${goal} goal!`,
    data: { screen: 'home' },
  }),

  streakCongrats: (days) => ({
    title: "Streak milestone! 🔥",
    body: `Amazing! You've logged ${days} days in a row!`,
    data: { screen: 'home' },
  }),

  custom: (title, body, data = {}) => ({
    title,
    body,
    data,
  }),
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import {
  getReminderSettings,
  updateReminderSettings,
  setAuthToken,
} from '../services/api';

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00',
];

const DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

export default function ReminderSettingsScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState({
    breakfast_reminder: { enabled: false, time: '08:00' },
    lunch_reminder: { enabled: false, time: '12:00' },
    dinner_reminder: { enabled: false, time: '18:00' },
    workout_reminder: { enabled: false, time: '17:00', days: ['mon', 'wed', 'fri'] },
    water_reminder: { enabled: false, interval_hours: 2 },
    mood_checkin_reminder: { enabled: false, time: '21:00' },
    inactivity_reminder: { enabled: true, days_threshold: 3 },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      const token = await getToken();
      setAuthToken(token);

      const data = await getReminderSettings();
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateReminderSettings(settings);
      Alert.alert('Saved', 'Reminder settings updated!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], ...value },
    }));
  };

  const toggleDay = (day) => {
    const currentDays = settings.workout_reminder.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    updateSetting('workout_reminder', { days: newDays });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const renderTimeSelector = (key, label) => (
    <View style={styles.timeSelectorRow}>
      <Text style={styles.timeLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => setShowTimePicker(showTimePicker === key ? null : key)}
      >
        <Text style={styles.timeButtonText}>
          {formatTime(settings[key]?.time || '12:00')}
        </Text>
        <Text style={styles.timeArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTimePicker = (key) => (
    showTimePicker === key && (
      <View style={styles.timePickerContainer}>
        <ScrollView style={styles.timePicker} nestedScrollEnabled>
          {TIME_OPTIONS.map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeOption,
                settings[key]?.time === time && styles.timeOptionSelected,
              ]}
              onPress={() => {
                updateSetting(key, { time });
                setShowTimePicker(null);
              }}
            >
              <Text style={[
                styles.timeOptionText,
                settings[key]?.time === time && styles.timeOptionTextSelected,
              ]}>
                {formatTime(time)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  );

  const renderReminderCard = (key, icon, title, description, children) => (
    <View style={styles.reminderCard}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderTitleRow}>
          <Text style={styles.reminderIcon}>{icon}</Text>
          <View style={styles.reminderTitleContainer}>
            <Text style={styles.reminderTitle}>{title}</Text>
            <Text style={styles.reminderDescription}>{description}</Text>
          </View>
        </View>
        <Switch
          value={settings[key]?.enabled}
          onValueChange={(value) => updateSetting(key, { enabled: value })}
          trackColor={{ false: '#ddd', true: '#81C784' }}
          thumbColor={settings[key]?.enabled ? '#4CAF50' : '#f4f3f4'}
        />
      </View>
      {settings[key]?.enabled && children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('profile')} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reminders</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Meal Reminders */}
        <Text style={styles.sectionTitle}>Meal Reminders</Text>

        {renderReminderCard(
          'breakfast_reminder',
          '🌅',
          'Breakfast',
          'Remind to log breakfast',
          <>
            {renderTimeSelector('breakfast_reminder', 'Reminder time')}
            {renderTimePicker('breakfast_reminder')}
          </>
        )}

        {renderReminderCard(
          'lunch_reminder',
          '☀️',
          'Lunch',
          'Remind to log lunch',
          <>
            {renderTimeSelector('lunch_reminder', 'Reminder time')}
            {renderTimePicker('lunch_reminder')}
          </>
        )}

        {renderReminderCard(
          'dinner_reminder',
          '🌙',
          'Dinner',
          'Remind to log dinner',
          <>
            {renderTimeSelector('dinner_reminder', 'Reminder time')}
            {renderTimePicker('dinner_reminder')}
          </>
        )}

        {/* Activity Reminders */}
        <Text style={styles.sectionTitle}>Activity Reminders</Text>

        {renderReminderCard(
          'workout_reminder',
          '🏋️',
          'Workout',
          'Remind to work out on selected days',
          <>
            {renderTimeSelector('workout_reminder', 'Reminder time')}
            {renderTimePicker('workout_reminder')}
            <View style={styles.daysSection}>
              <Text style={styles.daysLabel}>Days</Text>
              <View style={styles.daysRow}>
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.dayButton,
                      settings.workout_reminder.days?.includes(day.id) && styles.dayButtonSelected,
                    ]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text style={[
                      styles.dayText,
                      settings.workout_reminder.days?.includes(day.id) && styles.dayTextSelected,
                    ]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {renderReminderCard(
          'water_reminder',
          '💧',
          'Water',
          'Periodic hydration reminders',
          <View style={styles.intervalSection}>
            <Text style={styles.intervalLabel}>Remind every</Text>
            <View style={styles.intervalRow}>
              {[1, 2, 3, 4].map((hours) => (
                <TouchableOpacity
                  key={hours}
                  style={[
                    styles.intervalButton,
                    settings.water_reminder.interval_hours === hours && styles.intervalButtonSelected,
                  ]}
                  onPress={() => updateSetting('water_reminder', { interval_hours: hours })}
                >
                  <Text style={[
                    styles.intervalText,
                    settings.water_reminder.interval_hours === hours && styles.intervalTextSelected,
                  ]}>
                    {hours}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Wellness Reminders */}
        <Text style={styles.sectionTitle}>Wellness</Text>

        {renderReminderCard(
          'mood_checkin_reminder',
          '😊',
          'Mood Check-in',
          'Daily mood and energy tracking',
          <>
            {renderTimeSelector('mood_checkin_reminder', 'Reminder time')}
            {renderTimePicker('mood_checkin_reminder')}
          </>
        )}

        {renderReminderCard(
          'inactivity_reminder',
          '⚠️',
          'Inactivity Alert',
          'Alert when no workouts for several days',
          <View style={styles.inactivitySection}>
            <Text style={styles.inactivityLabel}>Alert after</Text>
            <View style={styles.inactivityRow}>
              {[2, 3, 5, 7].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.inactivityButton,
                    settings.inactivity_reminder.days_threshold === days && styles.inactivityButtonSelected,
                  ]}
                  onPress={() => updateSetting('inactivity_reminder', { days_threshold: days })}
                >
                  <Text style={[
                    styles.inactivityText,
                    settings.inactivity_reminder.days_threshold === days && styles.inactivityTextSelected,
                  ]}>
                    {days} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: '#ccc',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 12,
    marginLeft: 4,
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reminderTitleContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reminderDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  timeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  timeArrow: {
    fontSize: 10,
    color: '#999',
  },
  timePickerContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    maxHeight: 150,
  },
  timePicker: {
    maxHeight: 150,
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timeOptionSelected: {
    backgroundColor: '#E8F5E9',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  daysSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  daysLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  dayButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
  },
  intervalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  intervalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  intervalRow: {
    flexDirection: 'row',
  },
  intervalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  intervalButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  intervalText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  intervalTextSelected: {
    color: '#fff',
  },
  inactivitySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  inactivityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  inactivityRow: {
    flexDirection: 'row',
  },
  inactivityButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  inactivityButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  inactivityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  inactivityTextSelected: {
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
});

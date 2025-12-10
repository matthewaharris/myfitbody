import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import {
  createMoodCheckin,
  getMoodCheckins,
  getMoodTrends,
  setAuthToken,
} from '../services/api';

const { width } = Dimensions.get('window');

const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];
const ENERGY_EMOJIS = ['😴', '🥱', '😑', '💪', '⚡'];

const CHECKIN_TYPES = [
  { id: 'general', label: 'General', icon: '📝' },
  { id: 'morning', label: 'Morning', icon: '🌅' },
  { id: 'post_workout', label: 'Post-Workout', icon: '🏋️' },
  { id: 'post_meal', label: 'Post-Meal', icon: '🍽️' },
  { id: 'evening', label: 'Evening', icon: '🌙' },
];

export default function MoodCheckinScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const [mood, setMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [notes, setNotes] = useState('');
  const [checkinType, setCheckinType] = useState('general');
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [trends, setTrends] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      setAuthToken(token);

      const [checkinsData, trendsData] = await Promise.all([
        getMoodCheckins({ limit: 10 }),
        getMoodTrends(30),
      ]);

      setRecentCheckins(checkinsData || []);
      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading mood data:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSubmit = async () => {
    if (mood === null || energy === null) {
      Alert.alert('Please select', 'Please select both mood and energy levels');
      return;
    }

    setSubmitting(true);
    try {
      await createMoodCheckin({
        mood_rating: mood,
        energy_rating: energy,
        notes: notes.trim() || null,
        checkin_type: checkinType,
      });

      Alert.alert('Success', 'Mood check-in recorded!');
      setMood(null);
      setEnergy(null);
      setNotes('');
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error creating checkin:', error);
      Alert.alert('Error', 'Failed to save check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dayStr = '';
    if (date.toDateString() === today.toDateString()) {
      dayStr = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dayStr = 'Yesterday';
    } else {
      dayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dayStr} at ${timeStr}`;
  };

  const renderRatingSelector = (value, setValue, emojis, label) => (
    <View style={styles.ratingSection}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.emojiRow}>
        {emojis.map((emoji, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.emojiButton,
              value === index + 1 && styles.emojiButtonSelected,
            ]}
            onPress={() => setValue(index + 1)}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.emojiNumber}>{index + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mood & Energy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Trends Summary */}
        {trends && (
          <View style={styles.trendsCard}>
            <Text style={styles.trendsTitle}>30-Day Overview</Text>
            <View style={styles.trendsRow}>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>
                  {MOOD_EMOJIS[Math.round(trends.avgMood) - 1] || '😐'}
                </Text>
                <Text style={styles.trendLabel}>Avg Mood: {trends.avgMood || 0}</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>
                  {ENERGY_EMOJIS[Math.round(trends.avgEnergy) - 1] || '😑'}
                </Text>
                <Text style={styles.trendLabel}>Avg Energy: {trends.avgEnergy || 0}</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={styles.trendValue}>{trends.totalCheckins}</Text>
                <Text style={styles.trendLabel}>Check-ins</Text>
              </View>
            </View>
          </View>
        )}

        {/* New Check-in Form */}
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>How are you feeling?</Text>

            {/* Check-in Type */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {CHECKIN_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeButton,
                    checkinType === type.id && styles.typeButtonSelected,
                  ]}
                  onPress={() => setCheckinType(type.id)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.typeLabel,
                    checkinType === type.id && styles.typeLabelSelected,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {renderRatingSelector(mood, setMood, MOOD_EMOJIS, 'Mood')}
            {renderRatingSelector(energy, setEnergy, ENERGY_EMOJIS, 'Energy')}

            <Text style={styles.notesLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling? What's on your mind?"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Saving...' : 'Save Check-in'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.newCheckinButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.newCheckinIcon}>+</Text>
            <Text style={styles.newCheckinText}>New Check-in</Text>
          </TouchableOpacity>
        )}

        {/* Recent Check-ins */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Check-ins</Text>
          {recentCheckins.length === 0 ? (
            <Text style={styles.emptyText}>No check-ins yet. Start tracking!</Text>
          ) : (
            recentCheckins.map((checkin) => (
              <View key={checkin.id} style={styles.checkinCard}>
                <View style={styles.checkinHeader}>
                  <View style={styles.checkinEmojis}>
                    <Text style={styles.checkinEmoji}>
                      {MOOD_EMOJIS[checkin.mood_rating - 1]}
                    </Text>
                    <Text style={styles.checkinEmoji}>
                      {ENERGY_EMOJIS[checkin.energy_rating - 1]}
                    </Text>
                  </View>
                  <Text style={styles.checkinType}>
                    {CHECKIN_TYPES.find(t => t.id === checkin.checkin_type)?.icon || '📝'}
                  </Text>
                </View>
                <Text style={styles.checkinTime}>{formatTime(checkin.created_at)}</Text>
                {checkin.notes && (
                  <Text style={styles.checkinNotes}>{checkin.notes}</Text>
                )}
              </View>
            ))
          )}
        </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  trendsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  trendsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
  },
  trendValue: {
    fontSize: 28,
    marginBottom: 4,
  },
  trendLabel: {
    fontSize: 12,
    color: '#666',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  typeScroll: {
    marginBottom: 16,
  },
  typeButton: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
  },
  typeButtonSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    color: '#666',
  },
  typeLabelSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  ratingSection: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    width: (width - 80) / 5,
  },
  emojiButtonSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  emoji: {
    fontSize: 28,
  },
  emojiNumber: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  newCheckinButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4CAF50',
  },
  newCheckinIcon: {
    fontSize: 24,
    color: '#4CAF50',
    marginRight: 8,
  },
  newCheckinText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  historySection: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 20,
  },
  checkinCard: {
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
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkinEmojis: {
    flexDirection: 'row',
  },
  checkinEmoji: {
    fontSize: 28,
    marginRight: 8,
  },
  checkinType: {
    fontSize: 20,
  },
  checkinTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  checkinNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import {
  getWaterIntake,
  logWater,
  deleteWaterEntry,
  updateWaterGoal,
  setAuthToken,
  setUserInfo,
} from '../services/api';

export default function WaterScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [waterData, setWaterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState('64');

  const quickAddAmounts = [
    { label: '8 oz', value: 8, icon: '🥛' },
    { label: '12 oz', value: 12, icon: '🥤' },
    { label: '16 oz', value: 16, icon: '🍶' },
    { label: '32 oz', value: 32, icon: '🫗' },
  ];

  useEffect(() => {
    setupAuth();
  }, []);

  const setupAuth = async () => {
    const token = await getToken();
    setAuthToken(token);
    const email = user?.emailAddresses?.[0]?.emailAddress;
    setUserInfo(user?.id, email);
    loadWaterData();
  };

  const loadWaterData = async () => {
    try {
      const data = await getWaterIntake();
      setWaterData(data);
      setNewGoal(data.goal_oz?.toString() || '64');
    } catch (error) {
      console.error('Error loading water data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWaterData();
    setRefreshing(false);
  }, []);

  const handleLogWater = async (amount) => {
    try {
      await logWater(amount);
      await loadWaterData();
    } catch (error) {
      console.error('Error logging water:', error);
      Alert.alert('Error', 'Failed to log water intake');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWaterEntry(entryId);
              await loadWaterData();
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const handleUpdateGoal = async () => {
    const goalValue = parseInt(newGoal);
    if (isNaN(goalValue) || goalValue <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid number greater than 0');
      return;
    }

    try {
      await updateWaterGoal(goalValue);
      setShowGoalModal(false);
      await loadWaterData();
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getProgressColor = () => {
    if (!waterData) return '#007AFF';
    const percent = waterData.progress_percent;
    if (percent >= 100) return '#4CAF50';
    if (percent >= 75) return '#8BC34A';
    if (percent >= 50) return '#FFC107';
    return '#007AFF';
  };

  const getProgressWidth = () => {
    if (!waterData) return '0%';
    return `${Math.min(waterData.progress_percent, 100)}%`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Water Intake</Text>
        <TouchableOpacity onPress={() => setShowGoalModal(true)}>
          <Text style={styles.settingsButton}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.goalText}>
              Goal: {waterData?.goal_oz || 64} oz
            </Text>
          </View>

          <View style={styles.progressCircle}>
            <Text style={styles.progressEmoji}>💧</Text>
            <Text style={styles.progressAmount}>
              {Math.round(waterData?.total_oz || 0)}
            </Text>
            <Text style={styles.progressUnit}>oz</Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: getProgressWidth(),
                    backgroundColor: getProgressColor(),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressPercent, { color: getProgressColor() }]}>
              {waterData?.progress_percent || 0}%
            </Text>
          </View>

          {waterData?.progress_percent >= 100 && (
            <View style={styles.goalReachedBanner}>
              <Text style={styles.goalReachedText}>🎉 Goal Reached!</Text>
            </View>
          )}
        </View>

        {/* Quick Add Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickAddGrid}>
            {quickAddAmounts.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={styles.quickAddButton}
                onPress={() => handleLogWater(item.value)}
              >
                <Text style={styles.quickAddIcon}>{item.icon}</Text>
                <Text style={styles.quickAddLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Log</Text>
          {waterData?.entries?.length > 0 ? (
            waterData.entries.map((entry) => (
              <View key={entry.id} style={styles.logEntry}>
                <View style={styles.logEntryLeft}>
                  <Text style={styles.logEntryIcon}>💧</Text>
                  <View>
                    <Text style={styles.logEntryAmount}>{entry.amount_oz} oz</Text>
                    <Text style={styles.logEntryTime}>
                      {formatTime(entry.logged_at)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEntry(entry.id)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyLogIcon}>🌊</Text>
              <Text style={styles.emptyLogText}>No water logged today</Text>
              <Text style={styles.emptyLogSubtext}>
                Tap a button above to start tracking!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Goal Settings Modal */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daily Water Goal</Text>
            <Text style={styles.modalSubtitle}>
              Set your daily water intake goal in ounces
            </Text>

            <View style={styles.goalInputRow}>
              <TextInput
                style={styles.goalInput}
                value={newGoal}
                onChangeText={setNewGoal}
                keyboardType="number-pad"
                placeholder="64"
              />
              <Text style={styles.goalInputUnit}>oz</Text>
            </View>

            <View style={styles.presetGoals}>
              {[48, 64, 80, 96, 128].map((goal) => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.presetGoalButton,
                    parseInt(newGoal) === goal && styles.presetGoalButtonActive,
                  ]}
                  onPress={() => setNewGoal(goal.toString())}
                >
                  <Text
                    style={[
                      styles.presetGoalText,
                      parseInt(newGoal) === goal && styles.presetGoalTextActive,
                    ]}
                  >
                    {goal} oz
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleUpdateGoal}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  progressCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  goalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  progressCircle: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  progressAmount: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressUnit: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    minWidth: 50,
    textAlign: 'right',
  },
  goalReachedBanner: {
    backgroundColor: '#4CAF50',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  goalReachedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  quickAddGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAddButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  quickAddIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickAddLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  logEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logEntryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  logEntryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  logEntryTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FF3B30',
  },
  emptyLog: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyLogIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyLogText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptyLogSubtext: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  goalInput: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingHorizontal: 16,
    paddingBottom: 8,
    minWidth: 100,
  },
  goalInputUnit: {
    fontSize: 24,
    color: '#666',
    marginLeft: 8,
  },
  presetGoals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  presetGoalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  presetGoalButtonActive: {
    backgroundColor: '#007AFF',
  },
  presetGoalText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  presetGoalTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

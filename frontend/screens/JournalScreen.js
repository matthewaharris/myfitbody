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
  Modal,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import {
  saveJournalEntry,
  getJournalEntries,
  getJournalEntry,
  toggleJournalFavorite,
  setAuthToken,
} from '../services/api';

const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];

export default function JournalScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editDate, setEditDate] = useState(new Date().toISOString().split('T')[0]);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState(null);
  const [editTags, setEditTags] = useState('');
  const [autoSummary, setAutoSummary] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      setAuthToken(token);

      const entriesData = await getJournalEntries({ limit: 30 });
      setEntries(entriesData || []);
    } catch (error) {
      console.error('Error loading journal:', error);
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

  const openEditor = async (date = null) => {
    const dateToUse = date || new Date().toISOString().split('T')[0];
    setEditDate(dateToUse);

    try {
      const token = await getToken();
      setAuthToken(token);
      const entry = await getJournalEntry(dateToUse);

      setEditTitle(entry.title || '');
      setEditContent(entry.content || '');
      setEditMood(entry.mood_rating);
      setEditTags(entry.tags?.join(', ') || '');
      setAutoSummary(entry.auto_summary);
    } catch (error) {
      console.error('Error loading entry:', error);
      setEditTitle('');
      setEditContent('');
      setEditMood(null);
      setEditTags('');
      setAutoSummary(null);
    }

    setShowEditor(true);
  };

  const saveEntry = async () => {
    setSaving(true);
    try {
      await saveJournalEntry({
        entry_date: editDate,
        title: editTitle.trim() || null,
        content: editContent.trim() || null,
        mood_rating: editMood,
        tags: editTags.split(',').map(t => t.trim()).filter(t => t),
      });

      Alert.alert('Saved', 'Journal entry saved!');
      setShowEditor(false);
      await loadData();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async (entry) => {
    try {
      await toggleJournalFavorite(entry.entry_date);
      await loadData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderAutoSummary = (summary) => {
    if (!summary || Object.keys(summary).length === 0) {
      return <Text style={styles.noActivityText}>No activity logged</Text>;
    }

    return (
      <View style={styles.summaryContent}>
        {summary.meals?.count > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>🍽️</Text>
            <Text style={styles.summaryText}>
              {summary.meals.count} meal{summary.meals.count !== 1 ? 's' : ''} • {summary.meals.totalCalories} cal
              {summary.meals.totalProtein > 0 && ` • ${summary.meals.totalProtein}g protein`}
            </Text>
          </View>
        )}

        {summary.workouts?.count > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>💪</Text>
            <Text style={styles.summaryText}>
              {summary.workouts.count} workout{summary.workouts.count !== 1 ? 's' : ''}
              {summary.workouts.totalMinutes > 0 && ` • ${summary.workouts.totalMinutes} min`}
              {summary.workouts.totalCaloriesBurned > 0 && ` • ${summary.workouts.totalCaloriesBurned} burned`}
            </Text>
          </View>
        )}

        {summary.water?.totalOz > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>💧</Text>
            <Text style={styles.summaryText}>
              {summary.water.totalOz} oz water
            </Text>
          </View>
        )}

        {summary.mood?.checkinsCount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>
              {MOOD_EMOJIS[Math.round(summary.mood.avgMood) - 1] || '😐'}
            </Text>
            <Text style={styles.summaryText}>
              {summary.mood.checkinsCount} mood check-in{summary.mood.checkinsCount !== 1 ? 's' : ''}
              {summary.mood.avgMood && ` • Avg: ${summary.mood.avgMood}`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Journal</Text>
        <TouchableOpacity onPress={() => openEditor()} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Entry for Today */}
        <TouchableOpacity
          style={styles.todayCard}
          onPress={() => openEditor(new Date().toISOString().split('T')[0])}
        >
          <View style={styles.todayHeader}>
            <Text style={styles.todayIcon}>📝</Text>
            <Text style={styles.todayTitle}>Today's Entry</Text>
          </View>
          <Text style={styles.todaySubtitle}>
            Tap to write about your day
          </Text>
        </TouchableOpacity>

        {/* Journal Entries */}
        <View style={styles.entriesSection}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>

          {entries.length === 0 ? (
            <Text style={styles.emptyText}>
              No journal entries yet. Start writing!
            </Text>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity
                key={entry.id || entry.entry_date}
                style={styles.entryCard}
                onPress={() => openEditor(entry.entry_date)}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryDateRow}>
                    <Text style={styles.entryDate}>{formatDate(entry.entry_date)}</Text>
                    {entry.mood_rating && (
                      <Text style={styles.entryMood}>
                        {MOOD_EMOJIS[entry.mood_rating - 1]}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleFavorite(entry)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.favoriteIcon}>
                      {entry.is_favorite ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {entry.title && (
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                )}

                {entry.content && (
                  <Text style={styles.entryPreview} numberOfLines={2}>
                    {entry.content}
                  </Text>
                )}

                {entry.auto_summary && Object.keys(entry.auto_summary).length > 0 && (
                  <View style={styles.entrySummary}>
                    {entry.auto_summary.meals?.count > 0 && (
                      <Text style={styles.summaryChip}>
                        🍽️ {entry.auto_summary.meals.count}
                      </Text>
                    )}
                    {entry.auto_summary.workouts?.count > 0 && (
                      <Text style={styles.summaryChip}>
                        💪 {entry.auto_summary.workouts.count}
                      </Text>
                    )}
                    {entry.auto_summary.water?.totalOz > 0 && (
                      <Text style={styles.summaryChip}>
                        💧 {entry.auto_summary.water.totalOz}oz
                      </Text>
                    )}
                  </View>
                )}

                {entry.tags?.length > 0 && (
                  <View style={styles.tagsRow}>
                    {entry.tags.map((tag, i) => (
                      <Text key={i} style={styles.tag}>#{tag}</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Editor Modal */}
      <Modal
        visible={showEditor}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.editorContainer}>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editorTitle}>{formatDate(editDate)}</Text>
            <TouchableOpacity onPress={saveEntry} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editorContent}>
            {/* Auto Summary */}
            {autoSummary && (
              <View style={styles.autoSummaryCard}>
                <Text style={styles.autoSummaryTitle}>Daily Summary</Text>
                {renderAutoSummary(autoSummary)}
              </View>
            )}

            {/* Mood Rating */}
            <View style={styles.moodSection}>
              <Text style={styles.fieldLabel}>How was your day?</Text>
              <View style={styles.moodRow}>
                {MOOD_EMOJIS.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.moodButton,
                      editMood === index + 1 && styles.moodButtonSelected,
                    ]}
                    onPress={() => setEditMood(index + 1)}
                  >
                    <Text style={styles.moodEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title */}
            <Text style={styles.fieldLabel}>Title (optional)</Text>
            <TextInput
              style={styles.titleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Give today a title..."
              placeholderTextColor="#999"
            />

            {/* Content */}
            <Text style={styles.fieldLabel}>Your thoughts</Text>
            <TextInput
              style={styles.contentInput}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="How are you feeling? What happened today? What are you grateful for?"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />

            {/* Tags */}
            <Text style={styles.fieldLabel}>Tags (comma separated)</Text>
            <TextInput
              style={styles.tagsInput}
              value={editTags}
              onChangeText={setEditTags}
              placeholder="workout, productive, rest day..."
              placeholderTextColor="#999"
            />
          </ScrollView>
        </SafeAreaView>
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
  addButton: {
    padding: 8,
  },
  addButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  todayCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
  },
  todaySubtitle: {
    fontSize: 14,
    color: '#4CAF50',
  },
  entriesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
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
  entryCard: {
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
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginRight: 8,
  },
  entryMood: {
    fontSize: 18,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  entryPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  entrySummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  summaryChip: {
    fontSize: 12,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    fontSize: 12,
    color: '#4CAF50',
    marginRight: 8,
  },
  // Editor styles
  editorContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    color: '#999',
    fontSize: 16,
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: '#ccc',
  },
  editorContent: {
    flex: 1,
    padding: 16,
  },
  autoSummaryCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  autoSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  summaryContent: {},
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
  },
  noActivityText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  moodSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  moodButtonSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  moodEmoji: {
    fontSize: 28,
  },
  titleInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  contentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 200,
    marginBottom: 16,
  },
  tagsInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
});

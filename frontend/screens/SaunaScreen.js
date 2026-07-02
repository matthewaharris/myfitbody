import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  getSaunaSessions,
  logSaunaSession,
  deleteSaunaSession,
} from '../services/api';

const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function SaunaScreen({ onNavigate }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sessionDate, setSessionDate] = useState(todayString());
  const [temperature, setTemperature] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getSaunaSessions();
      setSessions(data);
    } catch (error) {
      console.error('Error loading sauna sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const onLogSession = async () => {
    const durationMin = parseInt(duration, 10);
    if (!durationMin || durationMin < 1) {
      Alert.alert('Missing Info', 'Enter how many minutes you were in the sauna.');
      return;
    }

    const tempF = temperature ? parseInt(temperature, 10) : null;
    if (temperature && (isNaN(tempF) || tempF < 60 || tempF > 250)) {
      Alert.alert('Check Temperature', 'Temperature should be between 60 and 250 °F.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      Alert.alert('Check Date', 'Date should look like 2026-07-02.');
      return;
    }

    setSaving(true);
    try {
      await logSaunaSession({
        session_date: sessionDate,
        temperature_f: tempF,
        duration_minutes: durationMin,
        notes: notes.trim() || null,
      });
      setTemperature('');
      setDuration('');
      setNotes('');
      setSessionDate(todayString());
      loadSessions();
    } catch (error) {
      console.error('Error logging sauna session:', error);
      Alert.alert('Error', 'Could not save the session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteSession = (session) => {
    Alert.alert(
      'Delete Session',
      `Delete the ${session.duration_minutes} min session on ${session.session_date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSaunaSession(session.id);
              setSessions(sessions.filter((s) => s.id !== session.id));
            } catch (error) {
              console.error('Error deleting sauna session:', error);
              Alert.alert('Error', 'Could not delete the session.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Simple totals for the header
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onNavigate('home')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🧖 Sauna</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalSessions}</Text>
              <Text style={styles.summaryLabel}>Sessions</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalMinutes}</Text>
              <Text style={styles.summaryLabel}>Total Minutes</Text>
            </View>
          </View>

          {/* Log form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Log a Session</Text>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={sessionDate}
                  onChangeText={setSessionDate}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Temp (°F)</Text>
                <TextInput
                  style={styles.input}
                  value={temperature}
                  onChangeText={setTemperature}
                  placeholder="180"
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Minutes</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="20"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Felt great, post-workout..."
                  multiline
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.logButton, saving && styles.logButtonDisabled]}
              onPress={onLogSession}
              disabled={saving}
            >
              <Text style={styles.logButtonText}>{saving ? 'Saving...' : 'Log Session'}</Text>
            </TouchableOpacity>
          </View>

          {/* History */}
          <Text style={styles.sectionTitle}>History</Text>
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : sessions.length === 0 ? (
            <Text style={styles.emptyText}>No sauna sessions yet. Log your first one above!</Text>
          ) : (
            sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onLongPress={() => onDeleteSession(session)}
              >
                <View style={styles.sessionLeft}>
                  <Text style={styles.sessionDate}>{formatDate(session.session_date)}</Text>
                  {session.notes ? <Text style={styles.sessionNotes}>{session.notes}</Text> : null}
                </View>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionDuration}>{session.duration_minutes} min</Text>
                  {session.temperature_f ? (
                    <Text style={styles.sessionTemp}>{session.temperature_f}°F</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
          {sessions.length > 0 && (
            <Text style={styles.hintText}>Long-press a session to delete it</Text>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  logButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  logButtonDisabled: {
    opacity: 0.6,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  sessionLeft: {
    flex: 1,
    marginRight: 12,
  },
  sessionDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  sessionNotes: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  sessionTemp: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});

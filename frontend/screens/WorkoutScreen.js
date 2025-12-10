import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  SafeAreaView,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import {
  getExercises,
  createExercise,
  createWorkout,
  updateWorkout,
  getWorkoutById,
  estimateCalories,
  setAuthToken,
  setUserInfo,
  getExerciseHistoryBatch,
  saveWorkoutAsTemplate,
  toggleWorkoutFavorite,
} from '../services/api';

// Exercise Picker Modal Component
function ExercisePickerModal({ visible, onClose, onSelect, onCreateNew, exercises, exerciseHistory }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format the last performance text
  const formatLastPerformance = (history) => {
    if (!history) return null;
    const weight = history.weight ? `${history.weight} lbs` : 'BW';
    const date = new Date(history.workout_date).toLocaleDateString();
    return `Last: ${history.sets}×${history.reps} @ ${weight} (${date})`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalStyles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={modalStyles.title}>Select Exercise</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={modalStyles.searchContainer}>
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const history = exerciseHistory?.[item.id];
              const lastPerformance = formatLastPerformance(history);

              return (
                <TouchableOpacity
                  style={modalStyles.exerciseItem}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSelect(item, history);
                    onClose();
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.exerciseName}>{item.name}</Text>
                    <Text style={modalStyles.exerciseMeta}>
                      {item.muscle_groups?.join(', ') || 'General'}
                      {item.equipment_type && ` • ${item.equipment_type}`}
                    </Text>
                    {lastPerformance && (
                      <Text style={modalStyles.lastPerformance}>{lastPerformance}</Text>
                    )}
                  </View>
                  {item.is_system_exercise && (
                    <Text style={modalStyles.systemBadge}>System</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={modalStyles.emptyText}>No exercises found</Text>
            }
            ListFooterComponent={
              <TouchableOpacity
                style={modalStyles.createButton}
                onPress={() => {
                  Keyboard.dismiss();
                  onCreateNew();
                }}
              >
                <Text style={modalStyles.createButtonText}>+ Create New Exercise</Text>
              </TouchableOpacity>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// Create Exercise Modal Component
function CreateExerciseModal({ visible, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [equipmentType, setEquipmentType] = useState('bodyweight');
  const [difficulty, setDifficulty] = useState('beginner');
  const [saving, setSaving] = useState(false);

  const muscleGroups = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps',
    'quads', 'hamstrings', 'glutes', 'core', 'cardio',
  ];

  const equipmentTypes = ['bodyweight', 'dumbbells', 'barbell', 'machine', 'other'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const toggleMuscle = (muscle) => {
    if (selectedMuscles.includes(muscle)) {
      setSelectedMuscles(selectedMuscles.filter(m => m !== muscle));
    } else {
      setSelectedMuscles([...selectedMuscles, muscle]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    setSaving(true);
    try {
      const newExercise = await onCreate({
        name: name.trim(),
        muscle_groups: selectedMuscles,
        equipment_type: equipmentType,
        difficulty,
      });

      // Reset form
      setName('');
      setSelectedMuscles([]);
      setEquipmentType('bodyweight');
      setDifficulty('beginner');

      onClose(newExercise);
    } catch (error) {
      Alert.alert('Error', 'Failed to create exercise');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={() => onClose(null)}>
            <Text style={modalStyles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modalStyles.title}>New Exercise</Text>
          <TouchableOpacity onPress={handleCreate} disabled={saving}>
            <Text style={[modalStyles.saveButton, saving && { opacity: 0.5 }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={modalStyles.formContainer}>
          <Text style={modalStyles.label}>Exercise Name *</Text>
          <TextInput
            style={modalStyles.textInput}
            placeholder="e.g., Bench Press"
            value={name}
            onChangeText={setName}
          />

          <Text style={modalStyles.label}>Muscle Groups</Text>
          <View style={modalStyles.chipContainer}>
            {muscleGroups.map((muscle) => (
              <TouchableOpacity
                key={muscle}
                style={[
                  modalStyles.chip,
                  selectedMuscles.includes(muscle) && modalStyles.chipSelected,
                ]}
                onPress={() => toggleMuscle(muscle)}
              >
                <Text style={[
                  modalStyles.chipText,
                  selectedMuscles.includes(muscle) && modalStyles.chipTextSelected,
                ]}>
                  {muscle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modalStyles.label}>Equipment</Text>
          <View style={modalStyles.chipContainer}>
            {equipmentTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  modalStyles.chip,
                  equipmentType === type && modalStyles.chipSelected,
                ]}
                onPress={() => setEquipmentType(type)}
              >
                <Text style={[
                  modalStyles.chipText,
                  equipmentType === type && modalStyles.chipTextSelected,
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modalStyles.label}>Difficulty</Text>
          <View style={modalStyles.chipContainer}>
            {difficulties.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  modalStyles.chip,
                  difficulty === level && modalStyles.chipSelected,
                ]}
                onPress={() => setDifficulty(level)}
              >
                <Text style={[
                  modalStyles.chipText,
                  difficulty === level && modalStyles.chipTextSelected,
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Rest Timer Modal Component
function RestTimerModal({ visible, onClose }) {
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  const presetTimes = [
    { label: '30s', seconds: 30 },
    { label: '60s', seconds: 60 },
    { label: '90s', seconds: 90 },
    { label: '2m', seconds: 120 },
    { label: '3m', seconds: 180 },
    { label: '5m', seconds: 300 },
  ];

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            Vibration.vibrate([0, 500, 200, 500]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const startTimer = (seconds) => {
    setSelectedTime(seconds);
    setTimeRemaining(seconds);
    setIsRunning(true);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRunning(false);
  };

  const resetTimer = () => {
    stopTimer();
    setTimeRemaining(0);
    setSelectedTime(null);
  };

  const handleClose = () => {
    resetTimer();
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = () => {
    if (!selectedTime) return 0;
    return ((selectedTime - timeRemaining) / selectedTime) * 100;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={timerStyles.overlay}>
        <View style={timerStyles.container}>
          <View style={timerStyles.header}>
            <Text style={timerStyles.title}>Rest Timer</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={timerStyles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {!isRunning && timeRemaining === 0 ? (
            <>
              <Text style={timerStyles.subtitle}>Select rest duration</Text>
              <View style={timerStyles.presetGrid}>
                {presetTimes.map((time) => (
                  <TouchableOpacity
                    key={time.seconds}
                    style={timerStyles.presetButton}
                    onPress={() => startTimer(time.seconds)}
                  >
                    <Text style={timerStyles.presetButtonText}>{time.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={timerStyles.timerDisplay}>
              <View style={timerStyles.progressRing}>
                <View
                  style={[
                    timerStyles.progressFill,
                    {
                      backgroundColor: timeRemaining === 0 ? '#4CAF50' : '#007AFF',
                      opacity: timeRemaining === 0 ? 1 : 0.2 + (getProgressPercent() / 100) * 0.8
                    }
                  ]}
                />
                <Text style={[
                  timerStyles.timerText,
                  timeRemaining === 0 && timerStyles.timerComplete
                ]}>
                  {timeRemaining === 0 ? 'Done!' : formatTime(timeRemaining)}
                </Text>
              </View>

              <View style={timerStyles.timerControls}>
                {isRunning ? (
                  <TouchableOpacity style={timerStyles.controlButton} onPress={stopTimer}>
                    <Text style={timerStyles.controlButtonText}>Pause</Text>
                  </TouchableOpacity>
                ) : timeRemaining > 0 ? (
                  <TouchableOpacity
                    style={[timerStyles.controlButton, timerStyles.resumeButton]}
                    onPress={() => setIsRunning(true)}
                  >
                    <Text style={[timerStyles.controlButtonText, { color: '#fff' }]}>Resume</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={timerStyles.resetButton} onPress={resetTimer}>
                  <Text style={timerStyles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Main Workout Screen
export default function WorkoutScreen({ onNavigate, workoutId = null, cloneFromId = null }) {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [exercises, setExercises] = useState([]);
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [workoutExercises, setWorkoutExercises] = useState([]);
  const [workoutName, setWorkoutName] = useState('');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimatingCalories, setEstimatingCalories] = useState(false);
  const [estimatedCalories, setEstimatedCalories] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [currentWorkoutId, setCurrentWorkoutId] = useState(workoutId);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);

  useEffect(() => {
    loadExercises();
    if (workoutId) {
      loadExistingWorkout(workoutId, false);
    } else if (cloneFromId) {
      loadExistingWorkout(cloneFromId, true);
    }
  }, [workoutId, cloneFromId]);

  const loadExercises = async () => {
    try {
      const token = await getToken();
      setAuthToken(token);
      const email = user?.emailAddresses?.[0]?.emailAddress;
      setUserInfo(user?.id, email);

      const data = await getExercises();
      setExercises(data || []);

      // Load exercise history for all exercises
      if (data && data.length > 0) {
        const exerciseIds = data.map(ex => ex.id);
        try {
          const history = await getExerciseHistoryBatch(exerciseIds);
          setExerciseHistory(history || {});
        } catch (historyError) {
          console.error('Error loading exercise history:', historyError);
        }
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const loadExistingWorkout = async (id, cloning = false) => {
    try {
      const token = await getToken();
      setAuthToken(token);
      const email = user?.emailAddresses?.[0]?.emailAddress;
      setUserInfo(user?.id, email);

      const workout = await getWorkoutById(id);
      if (workout) {
        if (cloning) {
          // Cloning: create a new workout based on this one
          setIsCloning(true);
          setIsEditing(false);
          setCurrentWorkoutId(null);
          setWorkoutName(workout.name ? `${workout.name} (Copy)` : '');
          setEstimatedCalories(null); // Reset calories for new workout
          setIsFavorite(false);
        } else {
          // Editing existing workout
          setIsEditing(true);
          setWorkoutName(workout.name || '');
          setEstimatedCalories(workout.estimated_calories_burned);
          setIsFavorite(workout.is_favorite || false);
        }

        // Convert workout_exercises to our format
        if (workout.workout_exercises) {
          const converted = workout.workout_exercises.map((we, idx) => ({
            id: we.id || Date.now().toString() + idx,
            exercise: we.exercises || we.exercise,
            sets: Array.from({ length: we.sets || 1 }, (_, i) => ({
              id: (i + 1).toString(),
              weight: we.weight?.toString() || '',
              reps: we.reps?.toString() || '',
              isBodyweight: we.exercises?.equipment_type === 'bodyweight',
            })),
          }));
          setWorkoutExercises(converted);
        }
      }
    } catch (error) {
      console.error('Error loading workout:', error);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleAddExercise = (exercise, history = null) => {
    // Add exercise with initial set, pre-filled with last performance if available
    const initialWeight = history?.weight?.toString() || '';
    const initialReps = history?.reps?.toString() || '';

    setWorkoutExercises([
      ...workoutExercises,
      {
        id: Date.now().toString(),
        exercise,
        lastPerformance: history,
        sets: [{
          id: '1',
          weight: initialWeight,
          reps: initialReps,
          isBodyweight: exercise.equipment_type === 'bodyweight'
        }],
      },
    ]);
  };

  const handleCreateExercise = async (exerciseData) => {
    const newExercise = await createExercise(exerciseData);
    setExercises([...exercises, newExercise]);
    return newExercise;
  };

  const handleAddSet = (workoutExerciseId) => {
    setWorkoutExercises(workoutExercises.map(we => {
      if (we.id === workoutExerciseId) {
        const newSetId = (we.sets.length + 1).toString();
        // Copy weight and reps from the last set
        const lastSet = we.sets[we.sets.length - 1];
        return {
          ...we,
          sets: [...we.sets, {
            id: newSetId,
            weight: lastSet?.weight || '',
            reps: lastSet?.reps || '',
            isBodyweight: we.exercise.equipment_type === 'bodyweight'
          }],
        };
      }
      return we;
    }));
  };

  const handleUpdateSet = (workoutExerciseId, setId, field, value) => {
    setWorkoutExercises(workoutExercises.map(we => {
      if (we.id === workoutExerciseId) {
        return {
          ...we,
          sets: we.sets.map(set => {
            if (set.id === setId) {
              return { ...set, [field]: value };
            }
            return set;
          }),
        };
      }
      return we;
    }));
  };

  const handleRemoveSet = (workoutExerciseId, setId) => {
    setWorkoutExercises(workoutExercises.map(we => {
      if (we.id === workoutExerciseId) {
        const newSets = we.sets.filter(set => set.id !== setId);
        // Remove exercise if no sets left
        if (newSets.length === 0) {
          return null;
        }
        return { ...we, sets: newSets };
      }
      return we;
    }).filter(Boolean));
  };

  const handleRemoveExercise = (workoutExerciseId) => {
    setWorkoutExercises(workoutExercises.filter(we => we.id !== workoutExerciseId));
  };

  const handleFinishWorkout = async () => {
    if (workoutExercises.length === 0) {
      Alert.alert('Empty Workout', 'Add at least one exercise to save the workout');
      return;
    }

    setSaving(true);
    try {
      // Format workout data for API
      const workoutData = {
        name: workoutName || `Workout ${new Date().toLocaleDateString()}`,
        estimated_calories_burned: estimatedCalories,
        exercises: workoutExercises.map((we, index) => ({
          exercise_id: we.exercise.id,
          order_index: index,
          sets: we.sets.length,
          reps: parseInt(we.sets[0]?.reps) || 0,
          weight: we.sets[0]?.isBodyweight ? null : parseFloat(we.sets[0]?.weight) || null,
        })),
      };

      let savedWorkout;
      if (isEditing && currentWorkoutId) {
        savedWorkout = await updateWorkout(currentWorkoutId, workoutData);
        Alert.alert('Success', 'Workout updated!', [
          { text: 'Edit More', style: 'cancel' },
          { text: 'Done', onPress: () => onNavigate('home') }
        ]);
      } else {
        savedWorkout = await createWorkout(workoutData);
        setCurrentWorkoutId(savedWorkout.id);
        setIsEditing(true);
        Alert.alert('Success', 'Workout saved!', [
          { text: 'Edit More', style: 'cancel' },
          { text: 'Done', onPress: () => onNavigate('home') }
        ]);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const handleEstimateCalories = async () => {
    if (workoutExercises.length === 0) {
      Alert.alert('No Exercises', 'Add some exercises first to estimate calories');
      return;
    }

    setEstimatingCalories(true);
    try {
      // Build workout summary for AI
      const workoutSummary = workoutExercises.map(we => {
        const totalReps = we.sets.reduce((sum, set) => sum + (parseInt(set.reps) || 0), 0);
        const avgWeight = we.sets.reduce((sum, set) => sum + (parseFloat(set.weight) || 0), 0) / we.sets.length;
        return {
          exercise: we.exercise.name,
          muscle_groups: we.exercise.muscle_groups,
          equipment_type: we.exercise.equipment_type,
          sets: we.sets.length,
          total_reps: totalReps,
          avg_weight: avgWeight || 'bodyweight',
        };
      });

      const result = await estimateCalories({ exercises: workoutSummary });
      setEstimatedCalories(result.estimated_calories);
      Alert.alert(
        'Calories Estimated',
        `Estimated calories burned: ${result.estimated_calories} kcal\n\n${result.explanation || ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error estimating calories:', error);
      Alert.alert('Error', 'Failed to estimate calories. Please try again.');
    } finally {
      setEstimatingCalories(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!currentWorkoutId) {
      Alert.alert('Save First', 'Please save the workout first before saving as template');
      return;
    }

    Alert.prompt(
      'Save as Template',
      'Enter a name for this template:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (templateName) => {
            try {
              await saveWorkoutAsTemplate(currentWorkoutId, templateName || workoutName);
              Alert.alert('Success', 'Workout saved as template!');
            } catch (error) {
              console.error('Error saving template:', error);
              Alert.alert('Error', 'Failed to save template');
            }
          }
        }
      ],
      'plain-text',
      workoutName || 'My Template'
    );
  };

  const handleToggleFavorite = async () => {
    if (!currentWorkoutId) {
      Alert.alert('Save First', 'Please save the workout first before marking as favorite');
      return;
    }

    try {
      const result = await toggleWorkoutFavorite(currentWorkoutId);
      setIsFavorite(result.is_favorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Workout' : isCloning ? 'Clone Workout' : 'New Workout'}
        </Text>
        <TouchableOpacity onPress={handleFinishWorkout} disabled={saving}>
          <Text style={[styles.finishButton, saving && { opacity: 0.5 }]}>
            {saving ? 'Saving...' : (isEditing ? 'Update' : 'Finish')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dismiss Keyboard Button - shown when keyboard is visible */}
      <TouchableOpacity style={styles.dismissKeyboardBar} onPress={dismissKeyboard}>
        <Text style={styles.dismissKeyboardText}>Tap here to hide keyboard</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          {/* Workout Name */}
          <View style={styles.nameContainer}>
            <TextInput
              style={styles.nameInput}
              placeholder="Workout name (optional)"
              value={workoutName}
              onChangeText={setWorkoutName}
              returnKeyType="done"
              onSubmitEditing={dismissKeyboard}
            />
          </View>

        {/* Exercises */}
        {workoutExercises.map((workoutExercise) => (
          <View key={workoutExercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{workoutExercise.exercise.name}</Text>
              <TouchableOpacity onPress={() => handleRemoveExercise(workoutExercise.id)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Sets Header */}
            <View style={styles.setsHeader}>
              <Text style={styles.setLabel}>Set</Text>
              {!workoutExercise.exercise.equipment_type?.includes('bodyweight') && (
                <Text style={styles.weightLabel}>Weight</Text>
              )}
              <Text style={styles.repsLabel}>Reps</Text>
              <View style={{ width: 30 }} />
            </View>

            {/* Sets */}
            {workoutExercise.sets.map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setNumber}>{index + 1}</Text>

                {!workoutExercise.exercise.equipment_type?.includes('bodyweight') ? (
                  <TextInput
                    style={styles.weightInput}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={set.weight}
                    onChangeText={(value) =>
                      handleUpdateSet(workoutExercise.id, set.id, 'weight', value)
                    }
                  />
                ) : (
                  <Text style={styles.bodyweightText}>BW</Text>
                )}

                <TextInput
                  style={styles.repsInput}
                  placeholder="0"
                  keyboardType="number-pad"
                  value={set.reps}
                  onChangeText={(value) =>
                    handleUpdateSet(workoutExercise.id, set.id, 'reps', value)
                  }
                />

                <TouchableOpacity
                  style={styles.deleteSetButton}
                  onPress={() => handleRemoveSet(workoutExercise.id, set.id)}
                >
                  <Text style={styles.deleteSetText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => handleAddSet(workoutExercise.id)}
            >
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

          {/* Add Exercise Button */}
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={() => {
              dismissKeyboard();
              setShowExercisePicker(true);
            }}
          >
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </TouchableOpacity>

          {/* Estimate Calories Button */}
          {workoutExercises.length > 0 && (
            <TouchableOpacity
              style={styles.estimateCaloriesButton}
              onPress={handleEstimateCalories}
              disabled={estimatingCalories}
            >
              {estimatingCalories ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <>
                  <Text style={styles.estimateCaloriesIcon}>🔥</Text>
                  <Text style={styles.estimateCaloriesText}>
                    {estimatedCalories
                      ? `Est. ${estimatedCalories} kcal (tap to recalculate)`
                      : 'Estimate Calories with AI'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Favorite and Template Buttons */}
          {workoutExercises.length > 0 && (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, isFavorite && styles.actionButtonActive]}
                onPress={handleToggleFavorite}
              >
                <Text style={styles.actionButtonIcon}>{isFavorite ? '⭐' : '☆'}</Text>
                <Text style={[styles.actionButtonText, isFavorite && styles.actionButtonTextActive]}>
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSaveAsTemplate}
              >
                <Text style={styles.actionButtonIcon}>📋</Text>
                <Text style={styles.actionButtonText}>Save as Template</Text>
              </TouchableOpacity>
            </View>
          )}

          {workoutExercises.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyText}>No exercises yet</Text>
              <Text style={styles.emptySubtext}>
                Tap "Add Exercise" to start building your workout
              </Text>
            </View>
          )}

          {/* Bottom padding for keyboard */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <ExercisePickerModal
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={handleAddExercise}
        onCreateNew={() => {
          setShowExercisePicker(false);
          setShowCreateExercise(true);
        }}
        exercises={exercises}
        exerciseHistory={exerciseHistory}
      />

      <CreateExerciseModal
        visible={showCreateExercise}
        onClose={(newExercise) => {
          setShowCreateExercise(false);
          if (newExercise) {
            handleAddExercise(newExercise);
          } else {
            setShowExercisePicker(true);
          }
        }}
        onCreate={handleCreateExercise}
      />

      <RestTimerModal
        visible={showRestTimer}
        onClose={() => setShowRestTimer(false)}
      />

      {/* Floating Rest Timer Button */}
      {workoutExercises.length > 0 && (
        <TouchableOpacity
          style={styles.floatingTimerButton}
          onPress={() => setShowRestTimer(true)}
        >
          <Text style={styles.floatingTimerIcon}>⏱️</Text>
          <Text style={styles.floatingTimerText}>Rest</Text>
        </TouchableOpacity>
      )}
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
  dismissKeyboardBar: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  dismissKeyboardText: {
    fontSize: 14,
    color: '#007AFF',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  finishButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  nameContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  nameInput: {
    fontSize: 16,
    padding: 12,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    fontSize: 18,
    color: '#999',
    padding: 4,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  setLabel: {
    width: 40,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  weightLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  repsLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    width: 40,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  bodyweightText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginHorizontal: 8,
  },
  repsInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  deleteSetButton: {
    width: 30,
    alignItems: 'center',
  },
  deleteSetText: {
    fontSize: 16,
  },
  addSetButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  addSetText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  addExerciseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addExerciseText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  estimateCaloriesButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  estimateCaloriesIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  estimateCaloriesText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonActive: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionButtonTextActive: {
    color: '#B8860B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  floatingTimerButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingTimerIcon: {
    fontSize: 24,
  },
  floatingTimerText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
});

const timerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  presetButton: {
    width: '30%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  timerDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 100,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  timerComplete: {
    color: '#4CAF50',
    fontSize: 36,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  resumeButton: {
    backgroundColor: '#007AFF',
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  resetButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  exerciseMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  lastPerformance: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  systemBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  createButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
